package com.paywallet.notification.service;

import com.paywallet.notification.dto.CreateWebhookSubscriptionRequest;
import com.paywallet.notification.dto.WebhookDeliveryLogResponse;
import com.paywallet.notification.dto.WebhookSubscriptionResponse;

import java.util.List;
import java.util.UUID;

public interface NotificationService {

    WebhookSubscriptionResponse createSubscription(UUID userId, CreateWebhookSubscriptionRequest request);

    List<WebhookSubscriptionResponse> getUserSubscriptions(UUID userId);

    void deactivateSubscription(UUID userId, UUID subscriptionId);

    WebhookDeliveryLogResponse dispatchEvent(
            UUID subscriptionId,
            UUID eventId,
            String eventType,
            String targetUrl,
            String payload,
            String secretKey
    );

    int dispatchToAllMatchingSubscriptions(UUID eventId, String eventType, String aggregateId, String payload);

    List<WebhookDeliveryLogResponse> getDeliveryLogs(int limit);
}
