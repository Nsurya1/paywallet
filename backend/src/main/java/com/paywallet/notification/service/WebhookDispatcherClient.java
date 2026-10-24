package com.paywallet.notification.service;

import com.paywallet.notification.domain.WebhookDeliveryStatus;
import com.paywallet.notification.util.WebhookSignatureUtil;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.UUID;

@Component
public class WebhookDispatcherClient {

    private static final Logger log = LoggerFactory.getLogger(WebhookDispatcherClient.class);

    private final RestTemplate restTemplate;

    public WebhookDispatcherClient() {
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory();
        requestFactory.setReadTimeout(Duration.ofMillis(3000));
        this.restTemplate = new RestTemplate(requestFactory);
    }

    /**
     * Dispatches an HTTP webhook with Resilience4j CircuitBreaker, Retry, and RateLimiter.
     */
    @CircuitBreaker(name = "webhookService", fallbackMethod = "dispatchFallback")
    @Retry(name = "webhookService", fallbackMethod = "dispatchFallback")
    @RateLimiter(name = "webhookService")
    public WebhookDeliveryResult dispatch(
            UUID subscriptionId,
            UUID eventId,
            String eventType,
            String targetUrl,
            String payload,
            String secretKey
    ) {
        long startTime = System.currentTimeMillis();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-PayWallet-Event", eventType);
        headers.set("X-PayWallet-Delivery", UUID.randomUUID().toString());

        if (secretKey != null && !secretKey.isBlank()) {
            headers.set("X-PayWallet-Signature", WebhookSignatureUtil.computeSignature(payload, secretKey));
        }

        HttpEntity<String> requestEntity = new HttpEntity<>(payload, headers);

        try {
            log.debug("Sending webhook to {} for eventId={}", targetUrl, eventId);
            ResponseEntity<String> response = restTemplate.exchange(targetUrl, HttpMethod.POST, requestEntity, String.class);
            long durationMs = System.currentTimeMillis() - startTime;
            int statusCode = response.getStatusCode().value();

            log.info("Webhook delivered successfully to {} with status={} ({} ms)", targetUrl, statusCode, durationMs);
            return new WebhookDeliveryResult(statusCode, WebhookDeliveryStatus.SUCCESS, null, durationMs);

        } catch (HttpClientErrorException ex) {
            // 4xx errors are client errors (do not retry)
            long durationMs = System.currentTimeMillis() - startTime;
            log.warn("Webhook rejected by {} with client error status={} ({} ms)", targetUrl, ex.getStatusCode().value(), durationMs);
            return new WebhookDeliveryResult(ex.getStatusCode().value(), WebhookDeliveryStatus.FAILED, ex.getMessage(), durationMs);

        } catch (HttpServerErrorException | ResourceAccessException ex) {
            // 5xx errors or network connectivity issues trigger Resilience4j Retry & CircuitBreaker
            log.warn("Transient webhook failure from {}: {}", targetUrl, ex.getMessage());
            throw ex;

        } catch (Exception ex) {
            log.error("Unexpected webhook delivery failure to {}: {}", targetUrl, ex.getMessage());
            throw new RestClientException("Unexpected error during webhook dispatch: " + ex.getMessage(), ex);
        }
    }

    /**
     * Fallback method invoked when the CircuitBreaker is OPEN or Retries are exhausted.
     */
    public WebhookDeliveryResult dispatchFallback(
            UUID subscriptionId,
            UUID eventId,
            String eventType,
            String targetUrl,
            String payload,
            String secretKey,
            Throwable throwable
    ) {
        if (throwable instanceof CallNotPermittedException) {
            log.warn("Circuit Breaker is OPEN for webhook target {}. Fast-failing delivery.", targetUrl);
            return new WebhookDeliveryResult(
                    null,
                    WebhookDeliveryStatus.CIRCUIT_OPEN,
                    "Circuit Breaker is OPEN. Downstream service unavailable.",
                    0
            );
        }

        log.error("Webhook retries exhausted for target {}. Cause: {}", targetUrl, throwable.getMessage());
        return new WebhookDeliveryResult(
                null,
                WebhookDeliveryStatus.RETRY_EXHAUSTED,
                "Delivery retries exhausted: " + throwable.getMessage(),
                0
        );
    }
}
