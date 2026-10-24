package com.paywallet.idempotency.exception;

public class IdempotencyPayloadMismatchException extends RuntimeException {

    private final String idemKey;

    public IdempotencyPayloadMismatchException(String idemKey) {
        super("Idempotency key '" + idemKey + "' was previously used with a different request payload");
        this.idemKey = idemKey;
    }

    public String getIdemKey() {
        return idemKey;
    }
}
