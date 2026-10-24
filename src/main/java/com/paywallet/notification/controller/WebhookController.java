package com.paywallet.notification.controller;

import com.paywallet.auth.security.SecurityUtils;
import com.paywallet.notification.dto.CreateWebhookSubscriptionRequest;
import com.paywallet.notification.dto.TestDispatchWebhookRequest;
import com.paywallet.notification.dto.WebhookDeliveryLogResponse;
import com.paywallet.notification.dto.WebhookSubscriptionResponse;
import com.paywallet.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/webhooks")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Webhooks & Notifications", description = "Manage merchant webhook endpoints and inspect outbound delivery audit trails")
public class WebhookController {

    private final NotificationService notificationService;

    public WebhookController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping("/subscriptions")
    @Operation(summary = "Subscribe to webhook events", description = "Registers an external HTTP endpoint to receive event payloads with HMAC-SHA256 signatures")
    public ResponseEntity<WebhookSubscriptionResponse> createSubscription(
            @Valid @RequestBody CreateWebhookSubscriptionRequest request
    ) {
        UUID userId = SecurityUtils.getCurrentUserId();
        WebhookSubscriptionResponse response = notificationService.createSubscription(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/subscriptions")
    @Operation(summary = "List webhook subscriptions", description = "Retrieves all active and inactive webhook subscriptions for the current user")
    public ResponseEntity<List<WebhookSubscriptionResponse>> getSubscriptions() {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(notificationService.getUserSubscriptions(userId));
    }

    @DeleteMapping("/subscriptions/{id}")
    @Operation(summary = "Deactivate webhook subscription", description = "Unsubscribes the specified endpoint from future event dispatches")
    public ResponseEntity<Void> deactivateSubscription(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId();
        notificationService.deactivateSubscription(userId, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/deliveries")
    @Operation(summary = "List recent webhook delivery logs", description = "Retrieves recent outbound webhook dispatches including status codes and latencies")
    public ResponseEntity<List<WebhookDeliveryLogResponse>> getDeliveryLogs(
            @RequestParam(defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(notificationService.getDeliveryLogs(limit));
    }

    @PostMapping("/test-dispatch")
    @Operation(summary = "Test webhook dispatch with Resilience4j", description = "Sends a test payload to the target URL to test Circuit Breaker, Retries, and Rate Limiting")
    public ResponseEntity<WebhookDeliveryLogResponse> testDispatch(
            @Valid @RequestBody TestDispatchWebhookRequest request
    ) {
        String eventType = (request.eventType() != null && !request.eventType().isBlank())
                ? request.eventType()
                : "TEST_EVENT";
        String payload = (request.payloadJson() != null && !request.payloadJson().isBlank())
                ? request.payloadJson()
                : "{\"message\":\"Test webhook notification\"}";

        WebhookDeliveryLogResponse response = notificationService.dispatchEvent(
                null,
                UUID.randomUUID(),
                eventType,
                request.targetUrl(),
                payload,
                "test-secret-key-12345"
        );
        return ResponseEntity.ok(response);
    }
}
