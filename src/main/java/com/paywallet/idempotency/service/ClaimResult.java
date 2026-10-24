package com.paywallet.idempotency.service;

public record ClaimResult(
        boolean canProceed,
        boolean isReplay,
        Integer statusCode,
        String responseBody
) {

    public static ClaimResult proceed() {
        return new ClaimResult(true, false, null, null);
    }

    public static ClaimResult replay(int statusCode, String responseBody) {
        return new ClaimResult(false, true, statusCode, responseBody);
    }
}
