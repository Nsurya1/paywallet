package com.paywallet.transfer;

import com.paywallet.BaseIntegrationTest;
import com.paywallet.auth.dto.AuthResponse;
import com.paywallet.auth.dto.RegisterRequest;
import com.paywallet.common.ApiErrorResponse;
import com.paywallet.ledger.domain.LedgerEntry;
import com.paywallet.ledger.repository.LedgerEntryRepository;
import com.paywallet.transfer.domain.Transaction;
import com.paywallet.transfer.domain.TransactionStatus;
import com.paywallet.transfer.domain.TransactionType;
import com.paywallet.transfer.dto.TransactionResponse;
import com.paywallet.transfer.dto.TransferRequest;
import com.paywallet.transfer.dto.TransferResponse;
import com.paywallet.transfer.repository.TransactionRepository;
import com.paywallet.wallet.domain.Wallet;
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
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class TransferIntegrationTest extends BaseIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

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

    private HttpHeaders createAuthHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    private UUID createWallet(String token, String currency) {
        ResponseEntity<WalletResponse> response = restTemplate.exchange(
                getBaseUrl() + "/wallets",
                HttpMethod.POST,
                new HttpEntity<>(new CreateWalletRequest(currency), createAuthHeaders(token)),
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
                new HttpEntity<>(new TopUpRequest(amount, "CARD"), createAuthHeaders(token)),
                TopUpResponse.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    @DisplayName("POST /transfers - Successful transfer updates both balances and records 1 transaction with 2 ledger entries")
    void transferSuccess_updatesBothBalancesAndCreatesLedgerEntries() {
        String aliceToken = registerAndGetToken("alice_tx_" + UUID.randomUUID().toString().substring(0, 8));
        String bobToken = registerAndGetToken("bob_tx_" + UUID.randomUUID().toString().substring(0, 8));

        UUID aliceWalletId = createWallet(aliceToken, "INR");
        UUID bobWalletId = createWallet(bobToken, "INR");

        // Alice starts with 10,000 paise (INR 100.00), Bob starts with 2,000 paise (INR 20.00)
        topUpWallet(aliceToken, aliceWalletId, 10000L);
        topUpWallet(bobToken, bobWalletId, 2000L);

        // Alice transfers 4,000 paise to Bob
        TransferRequest request = new TransferRequest(aliceWalletId, bobWalletId, 4000L, "Rent split payment");
        ResponseEntity<TransferResponse> response = restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(request, createAuthHeaders(aliceToken)),
                TransferResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        TransferResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.amount()).isEqualTo(4000L);
        assertThat(body.currency()).isEqualTo("INR");
        assertThat(body.fromWalletId()).isEqualTo(aliceWalletId);
        assertThat(body.toWalletId()).isEqualTo(bobWalletId);
        assertThat(body.status()).isEqualTo(TransactionStatus.COMPLETED);
        assertThat(body.type()).isEqualTo(TransactionType.TRANSFER);
        assertThat(body.referenceId()).startsWith("TRF-");

        // Verify balances in database
        Wallet aliceWallet = walletRepository.findById(aliceWalletId).orElseThrow();
        Wallet bobWallet = walletRepository.findById(bobWalletId).orElseThrow();
        assertThat(aliceWallet.getBalance()).isEqualTo(6000L); // 10,000 - 4,000
        assertThat(bobWallet.getBalance()).isEqualTo(6000L);   // 2,000 + 4,000

        // Verify transaction row in database
        Transaction tx = transactionRepository.findById(body.transactionId()).orElseThrow();
        assertThat(tx.getAmount()).isEqualTo(4000L);
        assertThat(tx.getStatus()).isEqualTo(TransactionStatus.COMPLETED);
        assertThat(tx.getType()).isEqualTo(TransactionType.TRANSFER);

        // Verify exactly 2 ledger entries created for this transfer transaction
        List<LedgerEntry> entries = ledgerEntryRepository.findByTransactionId(body.transactionId());
        assertThat(entries).hasSize(2);

        LedgerEntry debitEntry = entries.stream()
                .filter(e -> "D".equals(e.getDirection()))
                .findFirst()
                .orElseThrow();
        assertThat(debitEntry.getWalletId()).isEqualTo(aliceWalletId);
        assertThat(debitEntry.getAmount()).isEqualTo(4000L);
        assertThat(debitEntry.getBalanceAfter()).isEqualTo(6000L);

        LedgerEntry creditEntry = entries.stream()
                .filter(e -> "C".equals(e.getDirection()))
                .findFirst()
                .orElseThrow();
        assertThat(creditEntry.getWalletId()).isEqualTo(bobWalletId);
        assertThat(creditEntry.getAmount()).isEqualTo(4000L);
        assertThat(creditEntry.getBalanceAfter()).isEqualTo(6000L);
    }

    @Test
    @DisplayName("Double-Entry Invariant - Sum of ledger entries per transaction equals zero")
    void transferZeroSumLedgerEntries_checkSumOfLedgerEntriesPerTransactionIsZero() {
        String aliceToken = registerAndGetToken("alice_zero_" + UUID.randomUUID().toString().substring(0, 8));
        String bobToken = registerAndGetToken("bob_zero_" + UUID.randomUUID().toString().substring(0, 8));

        UUID aliceWalletId = createWallet(aliceToken, "INR");
        UUID bobWalletId = createWallet(bobToken, "INR");

        topUpWallet(aliceToken, aliceWalletId, 50000L);

        long transferAmount = 17550L;
        TransferRequest request = new TransferRequest(aliceWalletId, bobWalletId, transferAmount, "Audited payment");
        ResponseEntity<TransferResponse> response = restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(request, createAuthHeaders(aliceToken)),
                TransferResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        UUID txId = response.getBody().transactionId();

        List<LedgerEntry> entries = ledgerEntryRepository.findByTransactionId(txId);
        assertThat(entries).hasSize(2);

        long debitSum = entries.stream()
                .filter(e -> "D".equals(e.getDirection()))
                .mapToLong(LedgerEntry::getAmount)
                .sum();

        long creditSum = entries.stream()
                .filter(e -> "C".equals(e.getDirection()))
                .mapToLong(LedgerEntry::getAmount)
                .sum();

        // 1. Equal debits and credits
        assertThat(debitSum).isEqualTo(transferAmount);
        assertThat(creditSum).isEqualTo(transferAmount);
        assertThat(creditSum - debitSum).isZero();

        // 2. Net signed balance sheet impact across participants is exactly zero
        long signedLedgerSum = entries.stream()
                .mapToLong(e -> "C".equals(e.getDirection()) ? e.getAmount() : -e.getAmount())
                .sum();
        assertThat(signedLedgerSum).isZero();
    }

    @Test
    @DisplayName("POST /transfers - Insufficient funds returns error and preserves original balances")
    void transferInsufficientFunds_rejectsAndPreservesBalances() {
        String aliceToken = registerAndGetToken("alice_poor_" + UUID.randomUUID().toString().substring(0, 8));
        String bobToken = registerAndGetToken("bob_rich_" + UUID.randomUUID().toString().substring(0, 8));

        UUID aliceWalletId = createWallet(aliceToken, "INR");
        UUID bobWalletId = createWallet(bobToken, "INR");

        topUpWallet(aliceToken, aliceWalletId, 1000L); // Alice only has 1,000 paise

        // Alice attempts to transfer 5,000 paise
        TransferRequest request = new TransferRequest(aliceWalletId, bobWalletId, 5000L, "Overdraft attempt");
        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(request, createAuthHeaders(aliceToken)),
                ApiErrorResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("INSUFFICIENT_FUNDS");

        // Verify balances were not modified (transaction rolled back)
        Wallet aliceWallet = walletRepository.findById(aliceWalletId).orElseThrow();
        Wallet bobWallet = walletRepository.findById(bobWalletId).orElseThrow();
        assertThat(aliceWallet.getBalance()).isEqualTo(1000L);
        assertThat(bobWallet.getBalance()).isZero();
    }

    @Test
    @DisplayName("POST /transfers - Wrong owner rejected with 403 Forbidden")
    void transferWrongOwner_rejectsWithForbidden() {
        String aliceToken = registerAndGetToken("alice_owner_" + UUID.randomUUID().toString().substring(0, 8));
        String attackerToken = registerAndGetToken("attacker_" + UUID.randomUUID().toString().substring(0, 8));
        String bobToken = registerAndGetToken("bob_dest_" + UUID.randomUUID().toString().substring(0, 8));

        UUID aliceWalletId = createWallet(aliceToken, "INR");
        UUID bobWalletId = createWallet(bobToken, "INR");
        topUpWallet(aliceToken, aliceWalletId, 10000L);

        // Attacker attempts to debit Alice's wallet
        TransferRequest request = new TransferRequest(aliceWalletId, bobWalletId, 2000L, "Unauthorized transfer");
        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(request, createAuthHeaders(attackerToken)),
                ApiErrorResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).isNotNull();

        // Alice balance untouched
        Wallet aliceWallet = walletRepository.findById(aliceWalletId).orElseThrow();
        assertThat(aliceWallet.getBalance()).isEqualTo(10000L);
    }

    @Test
    @DisplayName("POST /transfers - Self-transfer to same wallet is rejected")
    void transferSameWallet_rejectsWithBadRequest() {
        String aliceToken = registerAndGetToken("alice_self_" + UUID.randomUUID().toString().substring(0, 8));
        UUID aliceWalletId = createWallet(aliceToken, "INR");
        topUpWallet(aliceToken, aliceWalletId, 5000L);

        TransferRequest request = new TransferRequest(aliceWalletId, aliceWalletId, 1000L, "Self transfer");
        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(request, createAuthHeaders(aliceToken)),
                ApiErrorResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("INVALID_TRANSFER");
    }

    @Test
    @DisplayName("POST /transfers - Cross-currency transfer is rejected")
    void transferCurrencyMismatch_rejectsWithBadRequest() {
        String aliceToken = registerAndGetToken("alice_curr_" + UUID.randomUUID().toString().substring(0, 8));
        String bobToken = registerAndGetToken("bob_curr_" + UUID.randomUUID().toString().substring(0, 8));

        UUID aliceUsdWallet = createWallet(aliceToken, "USD");
        UUID bobInrWallet = createWallet(bobToken, "INR");
        topUpWallet(aliceToken, aliceUsdWallet, 5000L);

        TransferRequest request = new TransferRequest(aliceUsdWallet, bobInrWallet, 1000L, "Cross currency");
        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(request, createAuthHeaders(aliceToken)),
                ApiErrorResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("CURRENCY_MISMATCH");
    }

    @Test
    @DisplayName("GET /wallets/{id}/transactions - Returns paginated transaction history with type filter")
    void getWalletTransactions_paginatedAndFiltered() {
        String aliceToken = registerAndGetToken("alice_hist_" + UUID.randomUUID().toString().substring(0, 8));
        String bobToken = registerAndGetToken("bob_hist_" + UUID.randomUUID().toString().substring(0, 8));

        UUID aliceWalletId = createWallet(aliceToken, "INR");
        UUID bobWalletId = createWallet(bobToken, "INR");

        // 1. Alice tops up
        topUpWallet(aliceToken, aliceWalletId, 20000L);

        // 2. Alice transfers to Bob
        restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(new TransferRequest(aliceWalletId, bobWalletId, 5000L, "Transfer 1"), createAuthHeaders(aliceToken)),
                TransferResponse.class
        );

        // 3. Query all transactions for Alice's wallet
        ResponseEntity<Map<String, Object>> allTxResp = restTemplate.exchange(
                getBaseUrl() + "/wallets/" + aliceWalletId + "/transactions",
                HttpMethod.GET,
                new HttpEntity<>(createAuthHeaders(aliceToken)),
                new ParameterizedTypeReference<>() {}
        );
        assertThat(allTxResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> allBody = allTxResp.getBody();
        assertThat(allBody).isNotNull();
        List<?> allContent = (List<?>) allBody.get("content");
        assertThat(allContent).hasSize(2);

        // 4. Query only TRANSFER transactions
        ResponseEntity<Map<String, Object>> transferOnlyResp = restTemplate.exchange(
                getBaseUrl() + "/wallets/" + aliceWalletId + "/transactions?type=TRANSFER",
                HttpMethod.GET,
                new HttpEntity<>(createAuthHeaders(aliceToken)),
                new ParameterizedTypeReference<>() {}
        );
        assertThat(transferOnlyResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<?> transferContent = (List<?>) transferOnlyResp.getBody().get("content");
        assertThat(transferContent).hasSize(1);

        // 5. Query only TOPUP transactions
        ResponseEntity<Map<String, Object>> topupOnlyResp = restTemplate.exchange(
                getBaseUrl() + "/wallets/" + aliceWalletId + "/transactions?type=TOPUP",
                HttpMethod.GET,
                new HttpEntity<>(createAuthHeaders(aliceToken)),
                new ParameterizedTypeReference<>() {}
        );
        assertThat(topupOnlyResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<?> topupContent = (List<?>) topupOnlyResp.getBody().get("content");
        assertThat(topupContent).hasSize(1);

        // 6. Bob tries to access Alice's transaction history -> 403 Forbidden
        ResponseEntity<ApiErrorResponse> forbiddenResp = restTemplate.exchange(
                getBaseUrl() + "/wallets/" + aliceWalletId + "/transactions",
                HttpMethod.GET,
                new HttpEntity<>(createAuthHeaders(bobToken)),
                ApiErrorResponse.class
        );
        assertThat(forbiddenResp.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
