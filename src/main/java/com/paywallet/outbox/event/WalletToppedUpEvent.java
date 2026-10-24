package com.paywallet.outbox.event;

import java.time.Instant;
import java.util.UUID;

public record WalletToppedUpEvent(
        UUID eventId,
        UUID walletId,
        UUID userId,
        long amount,
        String currency,
        long balanceAfter,
        String referenceId,
        Instant occurredAt
) {}
