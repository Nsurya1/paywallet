package com.paywallet.notification.dto;

import com.paywallet.notification.domain.WebhookSubscription;

import java.time.Instant;
import java.util.UUID;

public record WebhookSubscriptionResponse(
        UUID id,
        UUID userId,
        String targetUrl,
        String eventType,
        String secretKey,
        boolean active,
        Instant createdAt
) {
    public static WebhookSubscriptionResponse from(WebhookSubscription sub) {
        return new WebhookSubscriptionResponse(
                sub.getId(),
                sub.getUserId(),
                sub.getTargetUrl(),
                sub.getEventType(),
                sub.getSecretKey(),
                sub.isActive(),
                sub.getCreatedAt()
        );
    }
}
