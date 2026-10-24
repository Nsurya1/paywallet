package com.paywallet.notification.dto;

import com.paywallet.notification.domain.WebhookDeliveryLog;
import com.paywallet.notification.domain.WebhookDeliveryStatus;

import java.time.Instant;
import java.util.UUID;

public record WebhookDeliveryLogResponse(
        UUID id,
        UUID subscriptionId,
        UUID eventId,
        String eventType,
        String targetUrl,
        String payload,
        Integer responseStatusCode,
        WebhookDeliveryStatus status,
        int attemptCount,
        long durationMs,
        String errorMessage,
        Instant deliveredAt
) {
    public static WebhookDeliveryLogResponse from(WebhookDeliveryLog log) {
        return new WebhookDeliveryLogResponse(
                log.getId(),
                log.getSubscriptionId(),
                log.getEventId(),
                log.getEventType(),
                log.getTargetUrl(),
                log.getPayload(),
                log.getResponseStatusCode(),
                log.getStatus(),
                log.getAttemptCount(),
                log.getDurationMs(),
                log.getErrorMessage(),
                log.getDeliveredAt()
        );
    }
}
