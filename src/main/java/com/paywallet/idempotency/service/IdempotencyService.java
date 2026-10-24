package com.paywallet.idempotency.service;

import java.time.Duration;
import java.util.UUID;

public interface IdempotencyService {

    ClaimResult claimOrGetSaved(UUID userId, String idemKey, String requestHash, Duration ttl, Long waitTimeoutMsOverride);

    void complete(UUID userId, String idemKey, String requestHash, int statusCode, String responseBody, Duration ttl);

    void fail(UUID userId, String idemKey, Duration ttl);
}
