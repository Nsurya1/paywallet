package com.paywallet.notification.service;

import com.paywallet.common.exception.ResourceNotFoundException;
import com.paywallet.notification.domain.WebhookDeliveryLog;
import com.paywallet.notification.domain.WebhookSubscription;
import com.paywallet.notification.dto.CreateWebhookSubscriptionRequest;
import com.paywallet.notification.dto.WebhookDeliveryLogResponse;
import com.paywallet.notification.dto.WebhookSubscriptionResponse;
import com.paywallet.notification.repository.WebhookDeliveryLogRepository;
import com.paywallet.notification.repository.WebhookSubscriptionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
public class NotificationServiceImpl implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationServiceImpl.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final WebhookSubscriptionRepository subscriptionRepository;
    private final WebhookDeliveryLogRepository deliveryLogRepository;
    private final WebhookDispatcherClient webhookDispatcherClient;

    public NotificationServiceImpl(
            WebhookSubscriptionRepository subscriptionRepository,
            WebhookDeliveryLogRepository deliveryLogRepository,
            WebhookDispatcherClient webhookDispatcherClient
    ) {
        this.subscriptionRepository = subscriptionRepository;
        this.deliveryLogRepository = deliveryLogRepository;
        this.webhookDispatcherClient = webhookDispatcherClient;
    }

    private static String generateSecretKey() {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    @Override
    @Transactional
    public WebhookSubscriptionResponse createSubscription(UUID userId, CreateWebhookSubscriptionRequest request) {
        String secret = (request.secretKey() != null && !request.secretKey().isBlank())
                ? request.secretKey()
                : generateSecretKey();

        WebhookSubscription sub = new WebhookSubscription(
                userId,
                request.targetUrl(),
                request.eventType(),
                secret
        );

        WebhookSubscription saved = subscriptionRepository.save(sub);
        log.info("Created webhook subscription id={} for user={}", saved.getId(), userId);
        return WebhookSubscriptionResponse.from(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WebhookSubscriptionResponse> getUserSubscriptions(UUID userId) {
        return subscriptionRepository.findByUserId(userId).stream()
                .map(WebhookSubscriptionResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public void deactivateSubscription(UUID userId, UUID subscriptionId) {
        WebhookSubscription sub = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("WebhookSubscription", subscriptionId));

        if (!sub.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("WebhookSubscription", subscriptionId);
        }

        sub.setActive(false);
        subscriptionRepository.save(sub);
        log.info("Deactivated webhook subscription id={}", subscriptionId);
    }

    @Override
    @Transactional
    public WebhookDeliveryLogResponse dispatchEvent(
            UUID subscriptionId,
            UUID eventId,
            String eventType,
            String targetUrl,
            String payload,
            String secretKey
    ) {
        WebhookDeliveryResult result = webhookDispatcherClient.dispatch(
                subscriptionId,
                eventId,
                eventType,
                targetUrl,
                payload,
                secretKey
        );

        WebhookDeliveryLog deliveryLog = new WebhookDeliveryLog(
                subscriptionId,
                eventId,
                eventType,
                targetUrl,
                payload,
                result.statusCode(),
                result.status(),
                1,
                result.durationMs(),
                result.errorMessage()
        );

        WebhookDeliveryLog saved = deliveryLogRepository.save(deliveryLog);
        return WebhookDeliveryLogResponse.from(saved);
    }

    @Override
    @Transactional
    public int dispatchToAllMatchingSubscriptions(UUID eventId, String eventType, String aggregateId, String payload) {
        List<WebhookSubscription> subscriptions = subscriptionRepository.findActiveSubscriptionsForEvent(eventType);
        if (subscriptions.isEmpty()) {
            log.debug("No active subscriptions matching eventType={}", eventType);
            return 0;
        }

        int count = 0;
        for (WebhookSubscription sub : subscriptions) {
            try {
                dispatchEvent(sub.getId(), eventId, eventType, sub.getTargetUrl(), payload, sub.getSecretKey());
                count++;
            } catch (Exception ex) {
                log.error("Failed to dispatch event to subscription id={}: {}", sub.getId(), ex.getMessage());
            }
        }
        return count;
    }

    @Override
    @Transactional(readOnly = true)
    public List<WebhookDeliveryLogResponse> getDeliveryLogs(int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 100);
        return deliveryLogRepository.findAllByOrderByDeliveredAtDesc(PageRequest.of(0, safeLimit)).stream()
                .map(WebhookDeliveryLogResponse::from)
                .toList();
    }
}
