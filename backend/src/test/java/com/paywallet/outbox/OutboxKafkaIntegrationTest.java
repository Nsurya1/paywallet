package com.paywallet.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.paywallet.BaseIntegrationTest;
import com.paywallet.auth.dto.AuthResponse;
import com.paywallet.auth.dto.RegisterRequest;
import com.paywallet.outbox.consumer.WalletEventsConsumer;
import com.paywallet.outbox.domain.ConsumedEvent;
import com.paywallet.outbox.domain.OutboxEvent;
import com.paywallet.outbox.domain.OutboxStatus;
import com.paywallet.outbox.event.OutboxMessage;
import com.paywallet.outbox.publisher.OutboxPublisherService;
import com.paywallet.outbox.repository.ConsumedEventRepository;
import com.paywallet.outbox.repository.OutboxEventRepository;
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
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.kafka.KafkaContainer;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

class OutboxKafkaIntegrationTest extends BaseIntegrationTest {

    protected static final KafkaContainer kafka = new KafkaContainer("apache/kafka:3.7.0");

    static {
        kafka.start();
    }

    @DynamicPropertySource
    static void kafkaProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
        registry.add("paywallet.kafka.consumer.auto-startup", () -> "true");
        registry.add("paywallet.kafka.topic.auto-create", () -> "true");
        registry.add("paywallet.outbox.publisher.enabled", () -> "true");
        registry.add("paywallet.outbox.publisher.delay-ms", () -> "100");
    }

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private OutboxEventRepository outboxEventRepository;

    @Autowired
    private ConsumedEventRepository consumedEventRepository;

    @Autowired
    private OutboxPublisherService publisherService;

    @Autowired
    private WalletEventsConsumer walletEventsConsumer;

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        restTemplate.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory());
        walletEventsConsumer.clear();
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
    @DisplayName("Transactional Outbox: Top-Up and Transfer insert NEW events, publisher sends to Kafka, and consumer consumes idempotently")
    void outboxPublisherAndConsumer_endToEndFlow() {
        String aliceToken = registerAndGetToken("alice_outbox_" + UUID.randomUUID().toString().substring(0, 8));
        String bobToken = registerAndGetToken("bob_outbox_" + UUID.randomUUID().toString().substring(0, 8));

        UUID aliceWallet = createWallet(aliceToken);
        UUID bobWallet = createWallet(bobToken);

        // 1. Perform Top-Up
        long topUpAmount = 100_000L;
        ResponseEntity<TopUpResponse> topUpResp = restTemplate.exchange(
                getBaseUrl() + "/wallets/" + aliceWallet + "/topup",
                HttpMethod.POST,
                new HttpEntity<>(new TopUpRequest(topUpAmount, "CARD"), createHeaders(aliceToken)),
                TopUpResponse.class
        );
        assertThat(topUpResp.getStatusCode()).isEqualTo(HttpStatus.OK);

        // 2. Perform Transfer
        long transferAmount = 25_000L;
        ResponseEntity<TransferResponse> transferResp = restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(new TransferRequest(aliceWallet, bobWallet, transferAmount, "Outbox E2E"), createHeaders(aliceToken)),
                TransferResponse.class
        );
        assertThat(transferResp.getStatusCode()).isEqualTo(HttpStatus.OK);

        // 3. Verify Outbox events were created and transitioned to SENT by the scheduled publisher
        await().atMost(15, TimeUnit.SECONDS).untilAsserted(() -> {
            List<OutboxEvent> aliceEvents = outboxEventRepository.findByAggregateId(aliceWallet.toString());
            assertThat(aliceEvents).hasSize(2);
            assertThat(aliceEvents).allMatch(e -> e.getStatus() == OutboxStatus.SENT);
        });

        // 4. Verify Kafka consumer received both events and wrote to consumed_events table
        await().atMost(15, TimeUnit.SECONDS).untilAsserted(() -> {
            List<ConsumedEvent> consumed = consumedEventRepository.findAll();
            assertThat(consumed).hasSizeGreaterThanOrEqualTo(2);

            boolean hasTopUp = consumed.stream().anyMatch(e -> "WALLET_TOPPED_UP".equals(e.getEventType()));
            boolean hasTransfer = consumed.stream().anyMatch(e -> "WALLET_TRANSFERRED".equals(e.getEventType()));
            assertThat(hasTopUp).isTrue();
            assertThat(hasTransfer).isTrue();
        });
    }

    @Test
    @DisplayName("Idempotent Consumer: Duplicate delivery of same event_id is safely deduplicated")
    void consumerDeduplicatesByEventId() throws Exception {
        UUID duplicateEventId = UUID.randomUUID();
        String walletId = UUID.randomUUID().toString();

        OutboxMessage msg = new OutboxMessage(
                duplicateEventId,
                "WALLET_TOPPED_UP",
                "WALLET",
                walletId,
                "{\"amount\":5000}",
                Instant.now()
        );
        String json = objectMapper.writeValueAsString(msg);

        // Send first message
        kafkaTemplate.send("wallet.events", walletId, json).get(5, TimeUnit.SECONDS);

        // Wait for first delivery to be recorded in consumed_events
        await().atMost(10, TimeUnit.SECONDS).untilAsserted(() -> {
            assertThat(consumedEventRepository.existsById(duplicateEventId)).isTrue();
        });

        // Send duplicate message with the identical event_id
        kafkaTemplate.send("wallet.events", walletId, json).get(5, TimeUnit.SECONDS);

        // Wait to verify duplicate detection occurred and no second row was created
        await().pollDelay(Duration.ofMillis(500)).atMost(5, TimeUnit.SECONDS).untilAsserted(() -> {
            assertThat(walletEventsConsumer.getDuplicateDetectionsCount()).isGreaterThanOrEqualTo(1);
            assertThat(consumedEventRepository.findAll().stream().filter(e -> e.getEventId().equals(duplicateEventId)).count())
                    .isEqualTo(1);
        });
    }

    @Test
    @DisplayName("Kafka Down Resilience: If Kafka is down, no event is lost and it is published when Kafka returns")
    void kafkaDown_zeroEventLoss_publishesWhenKafkaReturns() throws Exception {
        String aliceToken = registerAndGetToken("alice_kdown_" + UUID.randomUUID().toString().substring(0, 8));
        String bobToken = registerAndGetToken("bob_kdown_" + UUID.randomUUID().toString().substring(0, 8));

        UUID aliceWallet = createWallet(aliceToken);
        UUID bobWallet = createWallet(bobToken);

        // Top up while Kafka is running
        restTemplate.exchange(
                getBaseUrl() + "/wallets/" + aliceWallet + "/topup",
                HttpMethod.POST,
                new HttpEntity<>(new TopUpRequest(50_000L, "CARD"), createHeaders(aliceToken)),
                TopUpResponse.class
        );

        // Wait for top-up to finish publishing
        await().atMost(10, TimeUnit.SECONDS).untilAsserted(() -> {
            assertThat(outboxEventRepository.findByAggregateId(aliceWallet.toString()))
                    .allMatch(e -> e.getStatus() == OutboxStatus.SENT);
        });

        // --- SIMULATE KAFKA BROKER FAILURE (PAUSE CONTAINER) ---
        kafka.getDockerClient().pauseContainerCmd(kafka.getContainerId()).exec();

        try {
            // Initiate transfer while Kafka is completely down
            TransferRequest transferRequest = new TransferRequest(aliceWallet, bobWallet, 10_000L, "Kafka Down Transfer");
            ResponseEntity<TransferResponse> transferResp = restTemplate.exchange(
                getBaseUrl() + "/transfers",
                HttpMethod.POST,
                new HttpEntity<>(transferRequest, createHeaders(aliceToken)),
                TransferResponse.class
            );

            // 1. Assert database transaction SUCCEEDED despite Kafka being down!
            assertThat(transferResp.getStatusCode()).isEqualTo(HttpStatus.OK);

            // 2. Assert wallet balances were correctly debited and credited in PostgreSQL
            long aliceBalance = walletRepository.findById(aliceWallet).orElseThrow().getBalance();
            long bobBalance = walletRepository.findById(bobWallet).orElseThrow().getBalance();
            assertThat(aliceBalance).isEqualTo(40_000L);
            assertThat(bobBalance).isEqualTo(10_000L);

            // 3. Assert outbox event was safely stored in PostgreSQL with status NEW (ZERO EVENT LOSS)
            List<OutboxEvent> pendingEvents = outboxEventRepository.findByStatus(OutboxStatus.NEW);
            assertThat(pendingEvents).isNotEmpty();
            OutboxEvent pendingTransferEvent = pendingEvents.stream()
                    .filter(e -> "WALLET_TRANSFERRED".equals(e.getEventType()) && aliceWallet.toString().equals(e.getAggregateId()))
                    .findFirst()
                    .orElse(null);
            assertThat(pendingTransferEvent).isNotNull();
            assertThat(pendingTransferEvent.getStatus()).isEqualTo(OutboxStatus.NEW);

        } finally {
            // --- RESUME KAFKA BROKER ---
            kafka.getDockerClient().unpauseContainerCmd(kafka.getContainerId()).exec();
        }

        // 4. Trigger / wait for scheduled publisher to deliver queued event now that Kafka is back
        await().atMost(20, TimeUnit.SECONDS).untilAsserted(() -> {
            publisherService.publishPendingEvents();
            List<OutboxEvent> aliceEvents = outboxEventRepository.findByAggregateId(aliceWallet.toString());
            assertThat(aliceEvents).allMatch(e -> e.getStatus() == OutboxStatus.SENT);
        });

        // 5. Verify the consumer received and processed the recovered event
        await().atMost(15, TimeUnit.SECONDS).untilAsserted(() -> {
            List<ConsumedEvent> consumed = consumedEventRepository.findAll();
            boolean hasTransferred = consumed.stream().anyMatch(e -> "WALLET_TRANSFERRED".equals(e.getEventType()) && aliceWallet.toString().equals(e.getAggregateId()));
            assertThat(hasTransferred).isTrue();
        });
    }
}
