package com.paywallet.idempotency.exception;

public class IdempotencyConflictException extends RuntimeException {

    private final String idemKey;

    public IdempotencyConflictException(String idemKey) {
        super("A request with idempotency key '" + idemKey + "' is currently being processed");
        this.idemKey = idemKey;
    }

    public String getIdemKey() {
        return idemKey;
    }
}
