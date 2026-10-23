package com.paywallet.wallet.dto;

import java.time.Instant;
import java.util.UUID;

public record TopUpResponse(
        UUID transactionId,
        String referenceId,
        UUID walletId,
        long creditedAmount,
        long newBalance,
        String currency,
        Instant timestamp
) {}
