package com.paywallet.notification;

import com.paywallet.BaseIntegrationTest;
import com.paywallet.auth.dto.AuthResponse;
import com.paywallet.auth.dto.RegisterRequest;
import com.paywallet.notification.domain.WebhookDeliveryStatus;
import com.paywallet.notification.dto.CreateWebhookSubscriptionRequest;
import com.paywallet.notification.dto.TestDispatchWebhookRequest;
import com.paywallet.notification.dto.WebhookDeliveryLogResponse;
import com.paywallet.notification.dto.WebhookSubscriptionResponse;
import com.paywallet.notification.repository.WebhookDeliveryLogRepository;
import com.paywallet.notification.repository.WebhookSubscriptionRepository;
import com.paywallet.notification.util.WebhookSignatureUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@Import(NotificationWebhookIntegrationTest.MockWebhookReceiverController.class)
class NotificationWebhookIntegrationTest extends BaseIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private WebhookSubscriptionRepository subscriptionRepository;

    @Autowired
    private WebhookDeliveryLogRepository deliveryLogRepository;

    @Autowired
    private MockWebhookReceiverController mockReceiver;

    @BeforeEach
    void setUp() {
        restTemplate.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory());
        mockReceiver.reset();
    }

    private String getBaseUrl() {
        return "http://localhost:" + port;
    }

    private String registerAndGetToken(String username) {
        RegisterRequest request = new RegisterRequest(
                username,
                username + "@paywallet.com",
                "StrongP@ssw0rd123"
        );
        ResponseEntity<AuthResponse> response = restTemplate.postForEntity(
                getBaseUrl() + "/auth/register",
                request,
                AuthResponse.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return response.getBody().accessToken();
    }

    private HttpHeaders createHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Idempotency-Key", UUID.randomUUID().toString());
        return headers;
    }

    @Test
    @DisplayName("Webhook Delivery & HMAC Signing: Successfully dispatches webhook and verifies cryptographic signature")
    void subscribeAndDispatch_successfulDelivery_withHmacSignature() {
        String token = registerAndGetToken("merchant_alice_" + UUID.randomUUID().toString().substring(0, 8));
        String targetUrl = getBaseUrl() + "/test/mock-webhook/success";
        String secretKey = "test-merchant-secret-key-xyz";

        // 1. Create Webhook Subscription
        CreateWebhookSubscriptionRequest subRequest = new CreateWebhookSubscriptionRequest(
                targetUrl,
                "WALLET_TOPPED_UP",
                secretKey
        );
        ResponseEntity<WebhookSubscriptionResponse> subResp = restTemplate.exchange(
                getBaseUrl() + "/webhooks/subscriptions",
                HttpMethod.POST,
                new HttpEntity<>(subRequest, createHeaders(token)),
                WebhookSubscriptionResponse.class
        );
        assertThat(subResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        WebhookSubscriptionResponse sub = subResp.getBody();
        assertThat(sub).isNotNull();
        assertThat(sub.targetUrl()).isEqualTo(targetUrl);
        assertThat(sub.secretKey()).isEqualTo(secretKey);

        // 2. Dispatch a test webhook event
        String payload = "{\"walletId\":\"" + UUID.randomUUID() + "\",\"amount\":10000}";
        TestDispatchWebhookRequest testRequest = new TestDispatchWebhookRequest(
                targetUrl,
                "WALLET_TOPPED_UP",
                payload
        );
        ResponseEntity<WebhookDeliveryLogResponse> dispatchResp = restTemplate.exchange(
                getBaseUrl() + "/webhooks/test-dispatch",
                HttpMethod.POST,
                new HttpEntity<>(testRequest, createHeaders(token)),
                WebhookDeliveryLogResponse.class
        );

        assertThat(dispatchResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        WebhookDeliveryLogResponse delivery = dispatchResp.getBody();
        assertThat(delivery).isNotNull();
        assertThat(delivery.status()).isEqualTo(WebhookDeliveryStatus.SUCCESS);
        assertThat(delivery.responseStatusCode()).isEqualTo(200);

        // 3. Verify mock endpoint received correct headers and valid HMAC-SHA256 signature
        assertThat(mockReceiver.getSuccessCallCount()).isEqualTo(1);
        String receivedSignature = mockReceiver.getLastReceivedSignature();
        String expectedSignature = WebhookSignatureUtil.computeSignature(payload, "test-secret-key-12345");
        assertThat(receivedSignature).isEqualTo(expectedSignature);
    }

    @Test
    @DisplayName("Resilience4j Circuit Breaker: Repeated 5xx failures trip circuit breaker to OPEN, failing fast")
    void circuitBreaker_tripsOpenWhenTargetEndpointFails() {
        String token = registerAndGetToken("merchant_bob_" + UUID.randomUUID().toString().substring(0, 8));
        String failingTargetUrl = getBaseUrl() + "/test/mock-webhook/failing";

        TestDispatchWebhookRequest testRequest = new TestDispatchWebhookRequest(
                failingTargetUrl,
                "WALLET_TRANSFERRED",
                "{\"transferId\":\"" + UUID.randomUUID() + "\"}"
        );

        // Send calls to failing endpoint to trigger CircuitBreaker failure threshold
        boolean sawCircuitOpen = false;
        for (int i = 0; i < 8; i++) {
            ResponseEntity<WebhookDeliveryLogResponse> resp = restTemplate.exchange(
                    getBaseUrl() + "/webhooks/test-dispatch",
                    HttpMethod.POST,
                    new HttpEntity<>(testRequest, createHeaders(token)),
                    WebhookDeliveryLogResponse.class
            );

            assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
            WebhookDeliveryLogResponse log = resp.getBody();
            assertThat(log).isNotNull();

            if (log.status() == WebhookDeliveryStatus.CIRCUIT_OPEN) {
                sawCircuitOpen = true;
                break;
            }
        }

        // Verify the CircuitBreaker transitioned to OPEN state
        assertThat(sawCircuitOpen).isTrue();
    }

    @Test
    @DisplayName("Subscription Lifecycle: User can create, list, and deactivate webhook subscriptions")
    void subscriptionLifecycle_userManagement() {
        String token = registerAndGetToken("merchant_charlie_" + UUID.randomUUID().toString().substring(0, 8));

        // Create subscription
        CreateWebhookSubscriptionRequest req = new CreateWebhookSubscriptionRequest(
                "https://example.com/webhook",
                "*",
                null // auto-generate secret
        );
        ResponseEntity<WebhookSubscriptionResponse> createResp = restTemplate.exchange(
                getBaseUrl() + "/webhooks/subscriptions",
                HttpMethod.POST,
                new HttpEntity<>(req, createHeaders(token)),
                WebhookSubscriptionResponse.class
        );
        assertThat(createResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        UUID subId = createResp.getBody().id();
        assertThat(createResp.getBody().secretKey()).isNotBlank();

        // List subscriptions
        ResponseEntity<List<WebhookSubscriptionResponse>> listResp = restTemplate.exchange(
                getBaseUrl() + "/webhooks/subscriptions",
                HttpMethod.GET,
                new HttpEntity<>(createHeaders(token)),
                new ParameterizedTypeReference<>() {}
        );
        assertThat(listResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResp.getBody()).anyMatch(s -> s.id().equals(subId) && s.active());

        // Deactivate subscription
        ResponseEntity<Void> deleteResp = restTemplate.exchange(
                getBaseUrl() + "/webhooks/subscriptions/" + subId,
                HttpMethod.DELETE,
                new HttpEntity<>(createHeaders(token)),
                Void.class
        );
        assertThat(deleteResp.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        // Verify deactivated
        ResponseEntity<List<WebhookSubscriptionResponse>> afterListResp = restTemplate.exchange(
                getBaseUrl() + "/webhooks/subscriptions",
                HttpMethod.GET,
                new HttpEntity<>(createHeaders(token)),
                new ParameterizedTypeReference<>() {}
        );
        assertThat(afterListResp.getBody()).anyMatch(s -> s.id().equals(subId) && !s.active());
    }

    /**
     * Test mock controller simulating external merchant webhook endpoints.
     */
    @TestConfiguration
    @RestController
    @RequestMapping("/test/mock-webhook")
    static class MockWebhookReceiverController {

        private final AtomicInteger successCalls = new AtomicInteger(0);
        private final AtomicInteger failingCalls = new AtomicInteger(0);
        private String lastReceivedSignature;
        private String lastReceivedEvent;

        @PostMapping("/success")
        public ResponseEntity<Map<String, String>> receiveSuccess(
                @RequestBody String body,
                @RequestHeader(value = "X-PayWallet-Signature", required = false) String signature,
                @RequestHeader(value = "X-PayWallet-Event", required = false) String event
        ) {
            successCalls.incrementAndGet();
            this.lastReceivedSignature = signature;
            this.lastReceivedEvent = event;
            return ResponseEntity.ok(Map.of("status", "received"));
        }

        @PostMapping("/failing")
        public ResponseEntity<Map<String, String>> receiveFailing(@RequestBody String body) {
            failingCalls.incrementAndGet();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Service Unavailable"));
        }

        public int getSuccessCallCount() {
            return successCalls.get();
        }

        public int getFailingCallCount() {
            return failingCalls.get();
        }

        public String getLastReceivedSignature() {
            return lastReceivedSignature;
        }

        public String getLastReceivedEvent() {
            return lastReceivedEvent;
        }

        public void reset() {
            successCalls.set(0);
            failingCalls.set(0);
            lastReceivedSignature = null;
            lastReceivedEvent = null;
        }
    }
}
