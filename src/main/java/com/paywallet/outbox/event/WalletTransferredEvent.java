package com.paywallet.outbox.event;

import java.time.Instant;
import java.util.UUID;

public record WalletTransferredEvent(
        UUID eventId,
        UUID transactionId,
        String referenceId,
        UUID fromWalletId,
        UUID toWalletId,
        long amount,
        String currency,
        Instant occurredAt
) {}
