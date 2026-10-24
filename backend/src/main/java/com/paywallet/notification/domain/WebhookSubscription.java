package com.paywallet.notification.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "webhook_subscriptions")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WebhookSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "target_url", nullable = false, length = 512)
    private String targetUrl;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(name = "secret_key", nullable = false, length = 128)
    private String secretKey;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public WebhookSubscription(UUID userId, String targetUrl, String eventType, String secretKey) {
        this.userId = userId;
        this.targetUrl = targetUrl;
        this.eventType = (eventType != null && !eventType.isBlank()) ? eventType : "*";
        this.secretKey = secretKey;
        this.active = true;
        this.createdAt = Instant.now();
    }
}
