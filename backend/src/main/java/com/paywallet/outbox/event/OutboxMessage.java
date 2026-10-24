package com.paywallet.outbox.event;

import java.time.Instant;
import java.util.UUID;

public record OutboxMessage(
        UUID eventId,
        String eventType,
        String aggregateType,
        String aggregateId,
        String payload,
        Instant timestamp
) {}
