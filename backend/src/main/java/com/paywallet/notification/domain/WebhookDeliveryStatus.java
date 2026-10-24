package com.paywallet.notification.domain;

public enum WebhookDeliveryStatus {
    SUCCESS,
    FAILED,
    CIRCUIT_OPEN,
    RETRY_EXHAUSTED
}
