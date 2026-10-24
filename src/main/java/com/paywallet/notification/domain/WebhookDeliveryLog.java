package com.paywallet.notification.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "webhook_delivery_logs")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WebhookDeliveryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "subscription_id")
    private UUID subscriptionId;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(name = "target_url", nullable = false, length = 512)
    private String targetUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", columnDefinition = "jsonb", nullable = false)
    private String payload;

    @Column(name = "response_status_code")
    private Integer responseStatusCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private WebhookDeliveryStatus status;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount = 1;

    @Column(name = "duration_ms", nullable = false)
    private long durationMs = 0;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @Column(name = "delivered_at", nullable = false, updatable = false)
    private Instant deliveredAt = Instant.now();

    public WebhookDeliveryLog(
            UUID subscriptionId,
            UUID eventId,
            String eventType,
            String targetUrl,
            String payload,
            Integer responseStatusCode,
            WebhookDeliveryStatus status,
            int attemptCount,
            long durationMs,
            String errorMessage
    ) {
        this.subscriptionId = subscriptionId;
        this.eventId = eventId;
        this.eventType = eventType;
        this.targetUrl = targetUrl;
        this.payload = payload;
        this.responseStatusCode = responseStatusCode;
        this.status = status;
        this.attemptCount = attemptCount;
        this.durationMs = durationMs;
        this.errorMessage = errorMessage;
        this.deliveredAt = Instant.now();
    }
}
