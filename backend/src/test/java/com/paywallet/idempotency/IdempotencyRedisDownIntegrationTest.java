package com.paywallet.idempotency;

import com.paywallet.BaseIntegrationTest;
import com.paywallet.auth.dto.AuthResponse;
import com.paywallet.auth.dto.RegisterRequest;
import com.paywallet.common.ApiErrorResponse;
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
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class IdempotencyRedisDownIntegrationTest extends BaseIntegrationTest {

    @DynamicPropertySource
    static void redisDownProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", () -> "127.0.0.1");
        registry.add("spring.data.redis.port", () -> 6399); // Unreachable port simulates Redis being completely down
        registry.add("spring.data.redis.timeout", () -> "200ms");
    }

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private WalletRepository walletRepository;

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

    private UUID createWallet(String token) {
        ResponseEntity<WalletResponse> response = restTemplate.exchange(
                getBaseUrl() + "/wallets",
                HttpMethod.POST,
                new HttpEntity<>(new CreateWalletRequest("INR"), createAuthHeaders(token, UUID.randomUUID().toString())),
                WalletResponse.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
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
    @DisplayName("When Redis is down, idempotency transparently falls back to PostgreSQL as source of truth")
    void redisDown_fallsBackToPostgreSql() {
        String aliceToken = registerAndGetToken("alice_redis_down_" + UUID.randomUUID().toString().substring(0, 8));
        String bobToken = registerAndGetToken("bob_redis_down_" + UUID.randomUUID().toString().substring(0, 8));

        UUID aliceWallet = createWallet(aliceToken);
        UUID bobWallet = createWallet(bobToken);

        topUpWallet(aliceToken, aliceWallet, 80_000L);

        String idemKey = "redis-down-" + UUID.randomUUID();
        TransferRequest request = new TransferRequest(aliceWallet, bobWallet, 1500L, "Redis Down Transfer");

        // First attempt - PostgreSQL claims and executes
        ResponseEntity<TransferResponse> firstResp = restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(request, createAuthHeaders(aliceToken, idemKey)),
                TransferResponse.class
        );

        assertThat(firstResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(firstResp.getBody()).isNotNull();
        UUID transactionId = firstResp.getBody().transactionId();

        // Second attempt with exact same key & body - PostgreSQL serves replay despite Redis failure
        ResponseEntity<TransferResponse> secondResp = restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(request, createAuthHeaders(aliceToken, idemKey)),
                TransferResponse.class
        );

        assertThat(secondResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(secondResp.getHeaders().getFirst("Idempotent-Replay")).isEqualTo("true");
        assertThat(secondResp.getBody()).isNotNull();
        assertThat(secondResp.getBody().transactionId()).isEqualTo(transactionId);

        // Verify sender was debited only ONCE
        long aliceFinal = walletRepository.findById(aliceWallet).orElseThrow().getBalance();
        assertThat(aliceFinal).isEqualTo(80_000L - 1500L);

        // Third attempt with same key but different payload - rejects with 422 via PostgreSQL
        TransferRequest alteredRequest = new TransferRequest(aliceWallet, bobWallet, 3000L, "Different amount");
        ResponseEntity<ApiErrorResponse> mismatchResp = restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(alteredRequest, createAuthHeaders(aliceToken, idemKey)),
                ApiErrorResponse.class
        );

        assertThat(mismatchResp.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(mismatchResp.getBody().error()).isEqualTo("IDEMPOTENCY_PAYLOAD_MISMATCH");
    }
}
