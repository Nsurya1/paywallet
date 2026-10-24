package com.paywallet.recon;

import com.paywallet.BaseIntegrationTest;
import com.paywallet.auth.dto.AuthResponse;
import com.paywallet.auth.dto.RegisterRequest;
import com.paywallet.recon.domain.DiscrepancyStatus;
import com.paywallet.recon.domain.ReconStatus;
import com.paywallet.recon.dto.ReconDiscrepancyResponse;
import com.paywallet.recon.dto.ReconReportResponse;
import com.paywallet.recon.dto.ReconTriggerResponse;
import com.paywallet.transfer.dto.TransferRequest;
import com.paywallet.transfer.dto.TransferResponse;
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
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ReconciliationIntegrationTest extends BaseIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        restTemplate.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory());
        jdbcTemplate.execute("TRUNCATE TABLE recon_discrepancies, recon_reports, ledger_entries, transactions, wallets, users CASCADE");
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

    private UUID createWallet(String token) {
        ResponseEntity<WalletResponse> response = restTemplate.exchange(
                getBaseUrl() + "/wallets",
                HttpMethod.POST,
                new HttpEntity<>(new CreateWalletRequest("INR"), createHeaders(token)),
                WalletResponse.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return response.getBody().id();
    }

    @Test
    @DisplayName("Clean Reconciliation: Audits all wallets against double-entry ledger and confirms 100% match with zero discrepancies")
    void reconciliation_cleanState_allWalletsMatch() {
        String aliceToken = registerAndGetToken("alice_recon_" + UUID.randomUUID().toString().substring(0, 8));
        String bobToken = registerAndGetToken("bob_recon_" + UUID.randomUUID().toString().substring(0, 8));

        UUID aliceWallet = createWallet(aliceToken);
        UUID bobWallet = createWallet(bobToken);

        // 1. Alice tops up 50,000 paise (500 INR)
        restTemplate.exchange(
                getBaseUrl() + "/wallets/" + aliceWallet + "/topup",
                HttpMethod.POST,
                new HttpEntity<>(new TopUpRequest(50_000L, "CARD"), createHeaders(aliceToken)),
                TopUpResponse.class
        );

        // 2. Bob tops up 20,000 paise (200 INR)
        restTemplate.exchange(
                getBaseUrl() + "/wallets/" + bobWallet + "/topup",
                HttpMethod.POST,
                new HttpEntity<>(new TopUpRequest(20_000L, "NET_BANKING"), createHeaders(bobToken)),
                TopUpResponse.class
        );

        // 3. Alice transfers 15,000 paise to Bob
        restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(new TransferRequest(aliceWallet, bobWallet, 15_000L, "Dinner split"), createHeaders(aliceToken)),
                TransferResponse.class
        );

        // 4. Trigger Reconciliation Run
        ResponseEntity<ReconTriggerResponse> triggerResp = restTemplate.exchange(
                getBaseUrl() + "/recon/run",
                HttpMethod.POST,
                new HttpEntity<>(createHeaders(aliceToken)),
                ReconTriggerResponse.class
        );

        assertThat(triggerResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        ReconTriggerResponse body = triggerResp.getBody();
        assertThat(body).isNotNull();
        ReconReportResponse report = body.report();
        assertThat(report.status()).isEqualTo(ReconStatus.COMPLETED);
        assertThat(report.totalWalletsAudited()).isGreaterThanOrEqualTo(2);
        assertThat(report.matchedWallets()).isEqualTo(report.totalWalletsAudited());
        assertThat(report.discrepancyCount()).isZero();
        assertThat(report.totalSystemBalance()).isGreaterThanOrEqualTo(70_000L);

        // 5. Verify Latest Report endpoint returns the same report
        ResponseEntity<ReconReportResponse> latestResp = restTemplate.exchange(
                getBaseUrl() + "/recon/reports/latest",
                HttpMethod.GET,
                new HttpEntity<>(createHeaders(aliceToken)),
                ReconReportResponse.class
        );
        assertThat(latestResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(latestResp.getBody().id()).isEqualTo(report.id());
    }

    @Test
    @DisplayName("Discrepancy Detection: Catches rogue balance tampering and records exact delta in audit journal")
    void reconciliation_tamperedBalance_detectsDiscrepancy() {
        String charlieToken = registerAndGetToken("charlie_recon_" + UUID.randomUUID().toString().substring(0, 8));
        UUID charlieWallet = createWallet(charlieToken);

        // 1. Charlie tops up 10,000 paise
        restTemplate.exchange(
                getBaseUrl() + "/wallets/" + charlieWallet + "/topup",
                HttpMethod.POST,
                new HttpEntity<>(new TopUpRequest(10_000L, "UPI"), createHeaders(charlieToken)),
                TopUpResponse.class
        );

        // 2. Simulate balance drift / unauthorized direct update (rogue DB mutation without ledger entry)
        long tamperDelta = 7_500L;
        jdbcTemplate.update("UPDATE wallets SET balance = balance + ? WHERE id = ?", tamperDelta, charlieWallet);

        // 3. Trigger Reconciliation Run
        ResponseEntity<ReconTriggerResponse> triggerResp = restTemplate.exchange(
                getBaseUrl() + "/recon/run",
                HttpMethod.POST,
                new HttpEntity<>(createHeaders(charlieToken)),
                ReconTriggerResponse.class
        );

        assertThat(triggerResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        ReconReportResponse report = triggerResp.getBody().report();
        assertThat(report.status()).isEqualTo(ReconStatus.COMPLETED_WITH_DISCREPANCIES);
        assertThat(report.discrepancyCount()).isGreaterThanOrEqualTo(1);

        // 4. Retrieve and verify the discrepancy details
        ResponseEntity<List<ReconDiscrepancyResponse>> discrepanciesResp = restTemplate.exchange(
                getBaseUrl() + "/recon/reports/" + report.id() + "/discrepancies",
                HttpMethod.GET,
                new HttpEntity<>(createHeaders(charlieToken)),
                new ParameterizedTypeReference<>() {}
        );

        assertThat(discrepanciesResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<ReconDiscrepancyResponse> discrepancies = discrepanciesResp.getBody();
        assertThat(discrepancies).isNotNull().isNotEmpty();

        ReconDiscrepancyResponse charlieDiscrepancy = discrepancies.stream()
                .filter(d -> d.walletId().equals(charlieWallet))
                .findFirst()
                .orElse(null);

        assertThat(charlieDiscrepancy).isNotNull();
        assertThat(charlieDiscrepancy.walletBalance()).isEqualTo(17_500L); // 10,000 + 7,500
        assertThat(charlieDiscrepancy.ledgerBalance()).isEqualTo(10_000L); // from ledger entry
        assertThat(charlieDiscrepancy.difference()).isEqualTo(7_500L);     // exact tampered amount
        assertThat(charlieDiscrepancy.status()).isEqualTo(DiscrepancyStatus.UNRESOLVED);
    }
}
