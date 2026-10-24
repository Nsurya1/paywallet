package com.paywallet.notification.service;

import com.paywallet.notification.domain.WebhookDeliveryStatus;

public record WebhookDeliveryResult(
        Integer statusCode,
        WebhookDeliveryStatus status,
        String errorMessage,
        long durationMs
) {}
