package com.paywallet.notification.dto;

import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.URL;

public record TestDispatchWebhookRequest(
        @NotBlank(message = "Target URL is required")
        @URL(message = "Target URL must be a valid HTTP or HTTPS URL")
        String targetUrl,

        String eventType,

        String payloadJson
) {}
