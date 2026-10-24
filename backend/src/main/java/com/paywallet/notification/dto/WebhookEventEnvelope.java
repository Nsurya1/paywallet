package com.paywallet.notification.dto;

import java.time.Instant;
import java.util.UUID;

public record WebhookEventEnvelope(
        UUID eventId,
        String eventType,
        String aggregateId,
        Object data,
        Instant timestamp
) {}
