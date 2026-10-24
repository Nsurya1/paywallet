package com.paywallet.idempotency.service;

import com.paywallet.idempotency.cache.CachedIdempotencyRecord;
import com.paywallet.idempotency.cache.IdempotencyRedisCache;
import com.paywallet.idempotency.domain.IdempotencyRecord;
import com.paywallet.idempotency.domain.IdempotencyStatus;
import com.paywallet.idempotency.exception.IdempotencyConflictException;
import com.paywallet.idempotency.exception.IdempotencyPayloadMismatchException;
import com.paywallet.idempotency.repository.IdempotencyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class IdempotencyServiceImpl implements IdempotencyService {

    private static final Logger log = LoggerFactory.getLogger(IdempotencyServiceImpl.class);

    private final IdempotencyRepository idempotencyRepository;
    private final IdempotencyRedisCache redisCache;
    private final long inFlightWaitTimeoutMs;

    public IdempotencyServiceImpl(
            IdempotencyRepository idempotencyRepository,
            IdempotencyRedisCache redisCache,
            @Value("${paywallet.idempotency.in-flight-wait-timeout-ms:10000}") long inFlightWaitTimeoutMs
    ) {
        this.idempotencyRepository = idempotencyRepository;
        this.redisCache = redisCache;
        this.inFlightWaitTimeoutMs = inFlightWaitTimeoutMs;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ClaimResult claimOrGetSaved(UUID userId, String idemKey, String requestHash, Duration ttl, Long waitTimeoutMsOverride) {
        // 1. Fast path: check Redis cache
        Optional<CachedIdempotencyRecord> cached = redisCache.get(userId, idemKey);
        if (cached.isPresent()) {
            CachedIdempotencyRecord record = cached.get();
            if (record.status() == IdempotencyStatus.COMPLETED) {
                if (record.requestHash().equals(requestHash)) {
                    log.debug("Idempotency hit in Redis cache for user={} key={}", userId, idemKey);
                    return ClaimResult.replay(record.statusCode(), record.responseBody());
                } else {
                    log.warn("Payload mismatch in Redis cache for user={} key={}", userId, idemKey);
                    throw new IdempotencyPayloadMismatchException(idemKey);
                }
            }
        }

        Instant now = Instant.now();
        Instant expiresAt = now.plus(ttl);

        // 2. Atomic claim via INSERT ... ON CONFLICT DO NOTHING
        int inserted = idempotencyRepository.insertIfAbsent(userId, idemKey, requestHash, now, expiresAt);
        if (inserted == 1) {
            log.debug("Successfully claimed idempotency key in DB for user={} key={}", userId, idemKey);
            return ClaimResult.proceed();
        }

        // 3. Row already exists: try to reclaim if previous attempt was FAILED or is expired
        int reclaimed = idempotencyRepository.reclaimFailedOrExpired(userId, idemKey, requestHash, now, expiresAt, now);
        if (reclaimed == 1) {
            log.info("Reclaimed failed/expired idempotency key for user={} key={}", userId, idemKey);
            return ClaimResult.proceed();
        }

        // 4. Inspect existing record
        IdempotencyRecord existing = idempotencyRepository.findById_UserIdAndId_IdemKey(userId, idemKey)
                .orElseThrow(() -> new IllegalStateException("Idempotency record unexpectedly not found for user=" + userId + " key=" + idemKey));

        if (existing.getStatus() == IdempotencyStatus.COMPLETED) {
            if (existing.getRequestHash().equals(requestHash)) {
                // Populate Redis cache for future fast lookups
                redisCache.put(userId, idemKey, new CachedIdempotencyRecord(
                        IdempotencyStatus.COMPLETED,
                        existing.getRequestHash(),
                        existing.getResponseStatusCode(),
                        existing.getResponseBody(),
                        existing.getExpiresAt()
                ), ttl);
                log.debug("Idempotency hit in DB for user={} key={}", userId, idemKey);
                return ClaimResult.replay(existing.getResponseStatusCode(), existing.getResponseBody());
            } else {
                log.warn("Payload mismatch in DB for user={} key={}", userId, idemKey);
                throw new IdempotencyPayloadMismatchException(idemKey);
            }
        }

        if (existing.getStatus() == IdempotencyStatus.PROCESSING) {
            long effectiveTimeout = (waitTimeoutMsOverride != null) ? waitTimeoutMsOverride : inFlightWaitTimeoutMs;
            return waitForInFlight(userId, idemKey, requestHash, ttl, effectiveTimeout);
        }

        throw new IdempotencyConflictException(idemKey);
    }

    private ClaimResult waitForInFlight(UUID userId, String idemKey, String requestHash, Duration ttl, long waitTimeoutMs) {
        if (waitTimeoutMs <= 0) {
            throw new IdempotencyConflictException(idemKey);
        }

        long deadline = System.currentTimeMillis() + waitTimeoutMs;
        while (System.currentTimeMillis() < deadline) {
            try {
                Thread.sleep(30);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IdempotencyConflictException(idemKey);
            }

            // Check Redis
            Optional<CachedIdempotencyRecord> fastCheck = redisCache.get(userId, idemKey);
            if (fastCheck.isPresent() && fastCheck.get().status() == IdempotencyStatus.COMPLETED) {
                if (fastCheck.get().requestHash().equals(requestHash)) {
                    return ClaimResult.replay(fastCheck.get().statusCode(), fastCheck.get().responseBody());
                } else {
                    throw new IdempotencyPayloadMismatchException(idemKey);
                }
            }

            // Check PostgreSQL
            Optional<IdempotencyRecord> recordOpt = idempotencyRepository.findById_UserIdAndId_IdemKey(userId, idemKey);
            if (recordOpt.isPresent()) {
                IdempotencyRecord r = recordOpt.get();
                if (r.getStatus() == IdempotencyStatus.COMPLETED) {
                    if (r.getRequestHash().equals(requestHash)) {
                        redisCache.put(userId, idemKey, new CachedIdempotencyRecord(
                                IdempotencyStatus.COMPLETED,
                                r.getRequestHash(),
                                r.getResponseStatusCode(),
                                r.getResponseBody(),
                                r.getExpiresAt()
                        ), ttl);
                        return ClaimResult.replay(r.getResponseStatusCode(), r.getResponseBody());
                    } else {
                        throw new IdempotencyPayloadMismatchException(idemKey);
                    }
                } else if (r.getStatus() == IdempotencyStatus.FAILED) {
                    Instant now = Instant.now();
                    int rec = idempotencyRepository.reclaimFailedOrExpired(userId, idemKey, requestHash, now, now.plus(ttl), now);
                    if (rec == 1) {
                        return ClaimResult.proceed();
                    }
                }
            }
        }

        log.warn("Timed out waiting for in-flight request user={} key={}", userId, idemKey);
        throw new IdempotencyConflictException(idemKey);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void complete(UUID userId, String idemKey, String requestHash, int statusCode, String responseBody, Duration ttl) {
        Instant expiresAt = Instant.now().plus(ttl);
        idempotencyRepository.markCompleted(userId, idemKey, statusCode, responseBody, expiresAt);
        redisCache.put(userId, idemKey, new CachedIdempotencyRecord(
                IdempotencyStatus.COMPLETED,
                requestHash,
                statusCode,
                responseBody,
                expiresAt
        ), ttl);
        log.debug("Idempotency record completed for user={} key={}", userId, idemKey);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void fail(UUID userId, String idemKey, Duration ttl) {
        Instant expiresAt = Instant.now().plus(ttl);
        idempotencyRepository.markFailed(userId, idemKey, expiresAt);
        redisCache.evict(userId, idemKey);
        log.debug("Idempotency record marked FAILED for user={} key={}", userId, idemKey);
    }
}
