package com.paywallet.idempotency.cache;

import com.paywallet.idempotency.domain.IdempotencyStatus;

import java.io.Serializable;
import java.time.Instant;

public record CachedIdempotencyRecord(
        IdempotencyStatus status,
        String requestHash,
        Integer statusCode,
        String responseBody,
        Instant expiresAt
) implements Serializable {}
