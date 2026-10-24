package com.paywallet.idempotency.repository;

import com.paywallet.idempotency.domain.IdempotencyId;
import com.paywallet.idempotency.domain.IdempotencyRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IdempotencyRepository extends JpaRepository<IdempotencyRecord, IdempotencyId> {

    @Modifying
    @Query(value = """
        INSERT INTO idempotency_keys (user_id, idem_key, request_hash, status, created_at, expires_at)
        VALUES (:userId, :idemKey, :requestHash, 'PROCESSING', :createdAt, :expiresAt)
        ON CONFLICT (user_id, idem_key) DO NOTHING
        """, nativeQuery = true)
    int insertIfAbsent(
            @Param("userId") UUID userId,
            @Param("idemKey") String idemKey,
            @Param("requestHash") String requestHash,
            @Param("createdAt") Instant createdAt,
            @Param("expiresAt") Instant expiresAt
    );

    @Modifying
    @Query(value = """
        UPDATE idempotency_keys
        SET status = 'PROCESSING',
            request_hash = :requestHash,
            response_status_code = NULL,
            response_body = NULL,
            created_at = :createdAt,
            expires_at = :expiresAt
        WHERE user_id = :userId
          AND idem_key = :idemKey
          AND (status = 'FAILED' OR expires_at < :now)
        """, nativeQuery = true)
    int reclaimFailedOrExpired(
            @Param("userId") UUID userId,
            @Param("idemKey") String idemKey,
            @Param("requestHash") String requestHash,
            @Param("createdAt") Instant createdAt,
            @Param("expiresAt") Instant expiresAt,
            @Param("now") Instant now
    );

    @Modifying
    @Query(value = """
        UPDATE idempotency_keys
        SET status = 'COMPLETED',
            response_status_code = :statusCode,
            response_body = CAST(:responseBody AS jsonb),
            expires_at = :expiresAt
        WHERE user_id = :userId AND idem_key = :idemKey
        """, nativeQuery = true)
    int markCompleted(
            @Param("userId") UUID userId,
            @Param("idemKey") String idemKey,
            @Param("statusCode") int statusCode,
            @Param("responseBody") String responseBody,
            @Param("expiresAt") Instant expiresAt
    );

    @Modifying
    @Query(value = """
        UPDATE idempotency_keys
        SET status = 'FAILED',
            expires_at = :expiresAt
        WHERE user_id = :userId AND idem_key = :idemKey
        """, nativeQuery = true)
    int markFailed(
            @Param("userId") UUID userId,
            @Param("idemKey") String idemKey,
            @Param("expiresAt") Instant expiresAt
    );

    @Modifying
    @Query("DELETE FROM IdempotencyRecord r WHERE r.expiresAt < :now")
    int deleteExpiredKeys(@Param("now") Instant now);

    Optional<IdempotencyRecord> findById_UserIdAndId_IdemKey(UUID userId, String idemKey);
}
