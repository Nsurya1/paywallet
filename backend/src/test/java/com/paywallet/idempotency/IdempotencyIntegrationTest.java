package com.paywallet.idempotency;

import com.paywallet.BaseIntegrationTest;
import com.paywallet.auth.dto.AuthResponse;
import com.paywallet.auth.dto.RegisterRequest;
import com.paywallet.common.ApiErrorResponse;
import com.paywallet.idempotency.domain.IdempotencyId;
import com.paywallet.idempotency.domain.IdempotencyRecord;
import com.paywallet.idempotency.domain.IdempotencyStatus;
import com.paywallet.idempotency.repository.IdempotencyRepository;
import com.paywallet.idempotency.scheduler.IdempotencyCleanupScheduler;
import com.paywallet.transfer.domain.TransactionStatus;
import com.paywallet.transfer.dto.TransferRequest;
import com.paywallet.transfer.dto.TransferResponse;
import com.paywallet.wallet.dto.CreateWalletRequest;
import com.paywallet.wallet.dto.TopUpRequest;
import com.paywallet.wallet.dto.TopUpResponse;
import com.paywallet.wallet.dto.WalletResponse;
import com.paywallet.wallet.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class IdempotencyIntegrationTest extends BaseIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private IdempotencyRepository idempotencyRepository;

    @Autowired
    private IdempotencyCleanupScheduler cleanupScheduler;

    @BeforeEach
    void setUpClient() {
        restTemplate.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory());
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
        assertThat(response.getBody()).isNotNull();
        return response.getBody().accessToken();
    }

    private HttpHeaders createAuthHeaders(String token, String idempotencyKey) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (idempotencyKey != null) {
            headers.set("Idempotency-Key", idempotencyKey);
        }
        return headers;
    }

    private UUID createWallet(String token, String currency) {
        ResponseEntity<WalletResponse> response = restTemplate.exchange(
                getBaseUrl() + "/wallets",
                HttpMethod.POST,
                new HttpEntity<>(new CreateWalletRequest(currency), createAuthHeaders(token, UUID.randomUUID().toString())),
                WalletResponse.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        return response.getBody().id();
    }

    private void topUpWallet(String token, UUID walletId, long amount) {
        ResponseEntity<TopUpResponse> response = restTemplate.exchange(
                getBaseUrl() + "/wallets/" + walletId + "/topup",
                HttpMethod.POST,
                new HttpEntity<>(new TopUpRequest(amount, "CARD"), createAuthHeaders(token, UUID.randomUUID().toString())),
                TopUpResponse.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("50 parallel requests with same Idempotency-Key execute only 1 debit and return identical responses")
    void fiftyParallelRequests_singleDebit_identicalResponses() throws Exception {
        String aliceToken = registerAndGetToken("alice_idem_50_" + UUID.randomUUID().toString().substring(0, 8));
        String bobToken = registerAndGetToken("bob_idem_50_" + UUID.randomUUID().toString().substring(0, 8));

        UUID aliceWallet = createWallet(aliceToken, "INR");
        UUID bobWallet = createWallet(bobToken, "INR");

        long initialAliceBalance = 100_000L; // 1000 INR
        topUpWallet(aliceToken, aliceWallet, initialAliceBalance);

        int threadCount = 50;
        long transferAmount = 2_500L; // 25 INR
        String sharedIdempotencyKey = "idem-key-" + UUID.randomUUID();

        TransferRequest transferRequest = new TransferRequest(
                aliceWallet,
                bobWallet,
                transferAmount,
                "Concurrent Idempotent Transfer"
        );

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        List<ResponseEntity<TransferResponse>> responses = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startGate.await();
                    ResponseEntity<TransferResponse> resp = restTemplate.exchange(
                            getBaseUrl() + "/transfers",
                            HttpMethod.POST,
                            new HttpEntity<>(transferRequest, createAuthHeaders(aliceToken, sharedIdempotencyKey)),
                            TransferResponse.class
                    );
                    responses.add(resp);
                } catch (Exception e) {
                    System.err.println("Thread error in 50 parallel test: " + e.getMessage());
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(10, TimeUnit.SECONDS);
        startGate.countDown();
        boolean completed = doneLatch.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();
        assertThat(responses).hasSize(threadCount);

        // All 50 responses must be 200 OK
        for (ResponseEntity<TransferResponse> response : responses) {
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).isNotNull();
        }

        // All 50 responses must have identical transaction ID, reference ID, amounts, and statuses
        TransferResponse firstResponse = responses.get(0).getBody();
        UUID expectedTransactionId = firstResponse.transactionId();
        String expectedReferenceId = firstResponse.referenceId();

        for (ResponseEntity<TransferResponse> response : responses) {
            TransferResponse body = response.getBody();
            assertThat(body.transactionId()).isEqualTo(expectedTransactionId);
            assertThat(body.referenceId()).isEqualTo(expectedReferenceId);
            assertThat(body.fromWalletId()).isEqualTo(aliceWallet);
            assertThat(body.toWalletId()).isEqualTo(bobWallet);
            assertThat(body.amount()).isEqualTo(transferAmount);
            assertThat(body.status()).isEqualTo(firstResponse.status());
        }

        // Verify sender was debited EXACTLY ONCE
        long expectedAliceFinal = initialAliceBalance - transferAmount;
        long actualAliceFinal = walletRepository.findById(aliceWallet).orElseThrow().getBalance();
        long actualBobFinal = walletRepository.findById(bobWallet).orElseThrow().getBalance();

        assertThat(actualAliceFinal)
                .as("Alice wallet must be debited exactly once despite 50 parallel requests")
                .isEqualTo(expectedAliceFinal);
        assertThat(actualBobFinal)
                .as("Bob wallet must be credited exactly once")
                .isEqualTo(transferAmount);
    }

    @Test
    @DisplayName("Same Idempotency-Key with different payload returns 422 Unprocessable Entity")
    void sameKey_differentPayload_returns422() {
        String token = registerAndGetToken("alice_payload_mismatch_" + UUID.randomUUID().toString().substring(0, 8));
        UUID walletId = createWallet(token, "INR");
        topUpWallet(token, walletId, 50_000L);

        String bobToken = registerAndGetToken("bob_payload_mismatch_" + UUID.randomUUID().toString().substring(0, 8));
        UUID bobWallet = createWallet(bobToken, "INR");

        String sharedKey = "idem-mismatch-" + UUID.randomUUID();

        TransferRequest req1 = new TransferRequest(walletId, bobWallet, 1000L, "First transfer");
        ResponseEntity<TransferResponse> firstResp = restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(req1, createAuthHeaders(token, sharedKey)),
                TransferResponse.class
        );
        assertThat(firstResp.getStatusCode()).isEqualTo(HttpStatus.OK);

        // Second request with altered amount
        TransferRequest req2 = new TransferRequest(walletId, bobWallet, 2000L, "Altered transfer");
        ResponseEntity<ApiErrorResponse> secondResp = restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(req2, createAuthHeaders(token, sharedKey)),
                ApiErrorResponse.class
        );

        assertThat(secondResp.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(secondResp.getBody()).isNotNull();
        assertThat(secondResp.getBody().error()).isEqualTo("IDEMPOTENCY_PAYLOAD_MISMATCH");
    }

    @Test
    @DisplayName("Concurrent request while in PROCESSING status returns 409 Conflict")
    void processingStatus_returns409() {
        String token = registerAndGetToken("alice_conflict_" + UUID.randomUUID().toString().substring(0, 8));
        UUID walletId = createWallet(token, "INR");
        topUpWallet(token, walletId, 50_000L);

        String bobToken = registerAndGetToken("bob_conflict_" + UUID.randomUUID().toString().substring(0, 8));
        UUID bobWallet = createWallet(bobToken, "INR");

        String key = "idem-conflict-" + UUID.randomUUID();

        // Simulate an in-flight key in PostgreSQL that remains in PROCESSING state past timeout
        UUID userId = walletRepository.findById(walletId).orElseThrow().getUserId();
        idempotencyRepository.saveAndFlush(new IdempotencyRecord(
                new IdempotencyId(userId, key),
                "dummy-hash",
                IdempotencyStatus.PROCESSING,
                Instant.now(),
                Instant.now().plus(24, ChronoUnit.HOURS)
        ));

        TransferRequest request = new TransferRequest(walletId, bobWallet, 1000L, "Conflict test");
        HttpHeaders headers = createAuthHeaders(token, key);
        headers.set("Idempotency-Wait-Timeout-Ms", "100");

        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(request, headers),
                ApiErrorResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("IDEMPOTENCY_CONFLICT");
    }

    @Test
    @DisplayName("FAILED idempotency key allows retry and executes successfully")
    void failedKey_allowsRetry() {
        String token = registerAndGetToken("alice_retry_" + UUID.randomUUID().toString().substring(0, 8));
        UUID walletId = createWallet(token, "INR");
        topUpWallet(token, walletId, 50_000L);

        String bobToken = registerAndGetToken("bob_retry_" + UUID.randomUUID().toString().substring(0, 8));
        UUID bobWallet = createWallet(bobToken, "INR");

        String key = "idem-retry-" + UUID.randomUUID();
        UUID userId = walletRepository.findById(walletId).orElseThrow().getUserId();

        // Simulate prior failed claim
        IdempotencyRecord failedRecord = new IdempotencyRecord(
                new IdempotencyId(userId, key),
                "old-hash",
                IdempotencyStatus.FAILED,
                Instant.now(),
                Instant.now().plus(1, ChronoUnit.HOURS)
        );
        idempotencyRepository.saveAndFlush(failedRecord);

        // Now retry with a valid transfer request
        TransferRequest request = new TransferRequest(walletId, bobWallet, 1500L, "Retry after failure");
        ResponseEntity<TransferResponse> response = restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(request, createAuthHeaders(token, key)),
                TransferResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().amount()).isEqualTo(1500L);
        assertThat(response.getBody().status()).isEqualTo(TransactionStatus.COMPLETED);

        // Subsequent call with same key returns replay
        ResponseEntity<TransferResponse> replayResp = restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(request, createAuthHeaders(token, key)),
                TransferResponse.class
        );
        assertThat(replayResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(replayResp.getHeaders().getFirst("Idempotent-Replay")).isEqualTo("true");
        assertThat(replayResp.getBody().transactionId()).isEqualTo(response.getBody().transactionId());
    }

    @Test
    @DisplayName("Missing Idempotency-Key header returns 400 Bad Request")
    void missingIdempotencyKey_returns400() {
        String token = registerAndGetToken("alice_missing_key_" + UUID.randomUUID().toString().substring(0, 8));
        UUID walletId = createWallet(token, "INR");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(new TransferRequest(walletId, UUID.randomUUID(), 100L, "Missing key"), headers),
                ApiErrorResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("INVALID_IDEMPOTENCY_KEY");
    }

    @Test
    @DisplayName("Oversized Idempotency-Key (> 64 chars) returns 400 Bad Request")
    void oversizedIdempotencyKey_returns400() {
        String token = registerAndGetToken("alice_long_key_" + UUID.randomUUID().toString().substring(0, 8));
        UUID walletId = createWallet(token, "INR");

        String longKey = "a".repeat(65);

        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(new TransferRequest(walletId, UUID.randomUUID(), 100L, "Long key"), createAuthHeaders(token, longKey)),
                ApiErrorResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("INVALID_IDEMPOTENCY_KEY");
    }

    @Test
    @DisplayName("Scheduled cleanup purges expired keys and preserves unexpired keys")
    void scheduledCleanup_purgesExpiredKeys() {
        String token = registerAndGetToken("alice_cleanup_" + UUID.randomUUID().toString().substring(0, 8));
        UUID walletId = createWallet(token, "INR");
        UUID userId = walletRepository.findById(walletId).orElseThrow().getUserId();

        String expiredKey = "expired-key-" + UUID.randomUUID();
        String activeKey = "active-key-" + UUID.randomUUID();

        // Expired record (expired 2 hours ago)
        IdempotencyRecord expiredRecord = new IdempotencyRecord(
                new IdempotencyId(userId, expiredKey),
                "hash-expired",
                IdempotencyStatus.COMPLETED,
                Instant.now().minus(5, ChronoUnit.HOURS),
                Instant.now().minus(2, ChronoUnit.HOURS)
        );
        expiredRecord.setResponseStatusCode(200);
        expiredRecord.setResponseBody("{\"status\":\"ok\"}");
        idempotencyRepository.saveAndFlush(expiredRecord);

        // Active record (expires in 24 hours)
        IdempotencyRecord activeRecord = new IdempotencyRecord(
                new IdempotencyId(userId, activeKey),
                "hash-active",
                IdempotencyStatus.COMPLETED,
                Instant.now(),
                Instant.now().plus(24, ChronoUnit.HOURS)
        );
        activeRecord.setResponseStatusCode(200);
        activeRecord.setResponseBody("{\"status\":\"ok\"}");
        idempotencyRepository.saveAndFlush(activeRecord);

        // Trigger cleanup job
        int purged = cleanupScheduler.purgeExpiredKeys();
        assertThat(purged).isGreaterThanOrEqualTo(1);

        // Verify database state
        assertThat(idempotencyRepository.findById(new IdempotencyId(userId, expiredKey))).isEmpty();
        assertThat(idempotencyRepository.findById(new IdempotencyId(userId, activeKey))).isPresent();
    }
}
