package com.paywallet.idempotency.cache;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

@Component
public class IdempotencyRedisCache {

    private static final Logger log = LoggerFactory.getLogger(IdempotencyRedisCache.class);
    private static final String KEY_PREFIX = "idempotency:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public IdempotencyRedisCache(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    private String buildKey(UUID userId, String idemKey) {
        return KEY_PREFIX + userId + ":" + idemKey;
    }

    public Optional<CachedIdempotencyRecord> get(UUID userId, String idemKey) {
        try {
            String json = redisTemplate.opsForValue().get(buildKey(userId, idemKey));
            if (json == null || json.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readValue(json, CachedIdempotencyRecord.class));
        } catch (Exception ex) {
            log.warn("Redis unavailable during idempotency GET for user={} key={}: {}. Falling back to PostgreSQL.",
                    userId, idemKey, ex.getMessage());
            return Optional.empty();
        }
    }

    public void put(UUID userId, String idemKey, CachedIdempotencyRecord record, Duration ttl) {
        try {
            String json = objectMapper.writeValueAsString(record);
            redisTemplate.opsForValue().set(buildKey(userId, idemKey), json, ttl);
        } catch (Exception ex) {
            log.warn("Redis unavailable during idempotency PUT for user={} key={}: {}. Data remains safely in PostgreSQL.",
                    userId, idemKey, ex.getMessage());
        }
    }

    public void evict(UUID userId, String idemKey) {
        try {
            redisTemplate.delete(buildKey(userId, idemKey));
        } catch (Exception ex) {
            log.warn("Redis unavailable during idempotency DELETE for user={} key={}: {}",
                    userId, idemKey, ex.getMessage());
        }
    }
}
