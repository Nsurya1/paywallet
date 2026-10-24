package com.paywallet.wallet;

import com.paywallet.BaseIntegrationTest;
import com.paywallet.auth.dto.AuthResponse;
import com.paywallet.auth.dto.RegisterRequest;
import com.paywallet.common.ApiErrorResponse;
import com.paywallet.wallet.dto.CreateWalletRequest;
import com.paywallet.wallet.dto.TopUpRequest;
import com.paywallet.wallet.dto.TopUpResponse;
import com.paywallet.wallet.dto.WalletResponse;
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
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class WalletIntegrationTest extends BaseIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

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

    private HttpHeaders createAuthHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Idempotency-Key", UUID.randomUUID().toString());
        return headers;
    }

    @Test
    @DisplayName("POST /wallets - Creates wallet for current authenticated user")
    void createWalletSuccess() {
        String token = registerAndGetToken("wallet_user_" + UUID.randomUUID().toString().substring(0, 8));
        CreateWalletRequest request = new CreateWalletRequest("INR");

        ResponseEntity<WalletResponse> response = restTemplate.exchange(
                getBaseUrl() + "/wallets",
                HttpMethod.POST,
                new HttpEntity<>(request, createAuthHeaders(token)),
                WalletResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        WalletResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.id()).isNotNull();
        assertThat(body.currency()).isEqualTo("INR");
        assertThat(body.balance()).isZero();
        assertThat(body.status()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("POST /wallets - Rejects duplicate wallet creation in same currency for the same user")
    void createDuplicateWalletFails() {
        String token = registerAndGetToken("wallet_dup_" + UUID.randomUUID().toString().substring(0, 8));
        CreateWalletRequest request = new CreateWalletRequest("USD");

        ResponseEntity<WalletResponse> first = restTemplate.exchange(
                getBaseUrl() + "/wallets",
                HttpMethod.POST,
                new HttpEntity<>(request, createAuthHeaders(token)),
                WalletResponse.class
        );
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        ResponseEntity<ApiErrorResponse> duplicate = restTemplate.exchange(
                getBaseUrl() + "/wallets",
                HttpMethod.POST,
                new HttpEntity<>(request, createAuthHeaders(token)),
                ApiErrorResponse.class
        );

        assertThat(duplicate.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(duplicate.getBody()).isNotNull();
        assertThat(duplicate.getBody().error()).isEqualTo("WALLET_ALREADY_EXISTS");
    }

    @Test
    @DisplayName("GET /wallets/{id} - Owner can view wallet details")
    void getWalletByOwnerSuccess() {
        String token = registerAndGetToken("wallet_owner_" + UUID.randomUUID().toString().substring(0, 8));

        ResponseEntity<WalletResponse> createResp = restTemplate.exchange(
                getBaseUrl() + "/wallets",
                HttpMethod.POST,
                new HttpEntity<>(new CreateWalletRequest("INR"), createAuthHeaders(token)),
                WalletResponse.class
        );
        UUID walletId = createResp.getBody().id();

        ResponseEntity<WalletResponse> getResp = restTemplate.exchange(
                getBaseUrl() + "/wallets/" + walletId,
                HttpMethod.GET,
                new HttpEntity<>(createAuthHeaders(token)),
                WalletResponse.class
        );

        assertThat(getResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(getResp.getBody()).isNotNull();
        assertThat(getResp.getBody().id()).isEqualTo(walletId);
    }

    @Test
    @DisplayName("GET /wallets/{id} - Non-owner access is rejected with 403 Forbidden")
    void getWalletByNonOwnerFails() {
        String ownerToken = registerAndGetToken("wallet_actual_owner_" + UUID.randomUUID().toString().substring(0, 8));
        String attackerToken = registerAndGetToken("wallet_intruder_" + UUID.randomUUID().toString().substring(0, 8));

        ResponseEntity<WalletResponse> createResp = restTemplate.exchange(
                getBaseUrl() + "/wallets",
                HttpMethod.POST,
                new HttpEntity<>(new CreateWalletRequest("INR"), createAuthHeaders(ownerToken)),
                WalletResponse.class
        );
        UUID walletId = createResp.getBody().id();

        ResponseEntity<ApiErrorResponse> getResp = restTemplate.exchange(
                getBaseUrl() + "/wallets/" + walletId,
                HttpMethod.GET,
                new HttpEntity<>(createAuthHeaders(attackerToken)),
                ApiErrorResponse.class
        );

        assertThat(getResp.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(getResp.getBody()).isNotNull();
        assertThat(getResp.getBody().error()).isEqualTo("Forbidden");
    }

    @Test
    @DisplayName("GET /wallets/{id} - Non-existent wallet returns 404 Not Found")
    void getNonExistentWalletFails() {
        String token = registerAndGetToken("wallet_not_found_" + UUID.randomUUID().toString().substring(0, 8));
        UUID randomWalletId = UUID.randomUUID();

        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                getBaseUrl() + "/wallets/" + randomWalletId,
                HttpMethod.GET,
                new HttpEntity<>(createAuthHeaders(token)),
                ApiErrorResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("Not Found");
    }

    @Test
    @DisplayName("POST /wallets/{id}/topup - Successfully tops up wallet, records TOPUP transaction, and writes ledger credit")
    void topUpWalletSuccess() {
        String token = registerAndGetToken("wallet_topup_" + UUID.randomUUID().toString().substring(0, 8));

        ResponseEntity<WalletResponse> createResp = restTemplate.exchange(
                getBaseUrl() + "/wallets",
                HttpMethod.POST,
                new HttpEntity<>(new CreateWalletRequest("INR"), createAuthHeaders(token)),
                WalletResponse.class
        );
        UUID walletId = createResp.getBody().id();

        TopUpRequest topUpRequest = new TopUpRequest(75000L, "UPI"); // 750.00 INR (75000 paise)

        ResponseEntity<TopUpResponse> response = restTemplate.exchange(
                getBaseUrl() + "/wallets/" + walletId + "/topup",
                HttpMethod.POST,
                new HttpEntity<>(topUpRequest, createAuthHeaders(token)),
                TopUpResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        TopUpResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.walletId()).isEqualTo(walletId);
        assertThat(body.creditedAmount()).isEqualTo(75000L);
        assertThat(body.newBalance()).isEqualTo(75000L);
        assertThat(body.currency()).isEqualTo("INR");
        assertThat(body.referenceId()).startsWith("TOPUP-");

        // Verify wallet balance in DB
        Long dbBalance = jdbcTemplate.queryForObject(
                "SELECT balance FROM wallets WHERE id = ?",
                Long.class,
                walletId
        );
        assertThat(dbBalance).isEqualTo(75000L);

        // Verify transaction record in DB
        Integer txnCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM transactions WHERE id = ? AND type = 'TOPUP' AND status = 'COMPLETED'",
                Integer.class,
                body.transactionId()
        );
        assertThat(txnCount).isEqualTo(1);

        // Verify ledger entry in DB (direction 'C' = Credit)
        Integer ledgerCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ledger_entries WHERE transaction_id = ? AND wallet_id = ? AND direction = 'C' AND amount = 75000 AND balance_after = 75000",
                Integer.class,
                body.transactionId(), walletId
        );
        assertThat(ledgerCount).isEqualTo(1);
    }

    @Test
    @DisplayName("POST /wallets/{id}/topup - Rejects zero or negative amount with 400 Bad Request")
    void topUpNonPositiveAmountFails() {
        String token = registerAndGetToken("wallet_bad_topup_" + UUID.randomUUID().toString().substring(0, 8));

        ResponseEntity<WalletResponse> createResp = restTemplate.exchange(
                getBaseUrl() + "/wallets",
                HttpMethod.POST,
                new HttpEntity<>(new CreateWalletRequest("INR"), createAuthHeaders(token)),
                WalletResponse.class
        );
        UUID walletId = createResp.getBody().id();

        TopUpRequest badRequest = new TopUpRequest(-500L, "CARD");

        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                getBaseUrl() + "/wallets/" + walletId + "/topup",
                HttpMethod.POST,
                new HttpEntity<>(badRequest, createAuthHeaders(token)),
                ApiErrorResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().fieldErrors()).anyMatch(fe -> fe.field().equals("amount"));
    }

    @Test
    @DisplayName("POST /wallets/{id}/topup - Non-owner top-up attempt is rejected with 403 Forbidden")
    void topUpByNonOwnerFails() {
        String ownerToken = registerAndGetToken("wallet_real_owner_" + UUID.randomUUID().toString().substring(0, 8));
        String otherToken = registerAndGetToken("wallet_stranger_" + UUID.randomUUID().toString().substring(0, 8));

        ResponseEntity<WalletResponse> createResp = restTemplate.exchange(
                getBaseUrl() + "/wallets",
                HttpMethod.POST,
                new HttpEntity<>(new CreateWalletRequest("INR"), createAuthHeaders(ownerToken)),
                WalletResponse.class
        );
        UUID walletId = createResp.getBody().id();

        TopUpRequest topUpRequest = new TopUpRequest(10000L, "NET_BANKING");

        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                getBaseUrl() + "/wallets/" + walletId + "/topup",
                HttpMethod.POST,
                new HttpEntity<>(topUpRequest, createAuthHeaders(otherToken)),
                ApiErrorResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("Forbidden");
    }

    @Test
    @DisplayName("GET /wallets - Unauthenticated access returns 401 Unauthorized")
    void unauthenticatedAccessFails() {
        ResponseEntity<ApiErrorResponse> response = restTemplate.getForEntity(
                getBaseUrl() + "/wallets",
                ApiErrorResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
