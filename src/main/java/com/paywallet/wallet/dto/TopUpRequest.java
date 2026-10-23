package com.paywallet.wallet.dto;

import jakarta.validation.constraints.Positive;

public record TopUpRequest(
        @Positive(message = "Top-up amount must be strictly positive (> 0)")
        long amount,

        String paymentMethod
) {
    public TopUpRequest {
        if (paymentMethod == null || paymentMethod.isBlank()) {
            paymentMethod = "CARD";
        }
    }
}
