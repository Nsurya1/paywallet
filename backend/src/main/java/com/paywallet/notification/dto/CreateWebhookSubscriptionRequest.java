package com.paywallet.notification.dto;

import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.URL;

public record CreateWebhookSubscriptionRequest(
        @NotBlank(message = "Target URL is required")
        @URL(message = "Target URL must be a valid HTTP or HTTPS URL")
        String targetUrl,

        String eventType, // e.g. "WALLET_TRANSFERRED", "WALLET_TOPPED_UP", or "*"

        String secretKey // Optional secret key for HMAC-SHA256 signature; auto-generated if blank
) {}
