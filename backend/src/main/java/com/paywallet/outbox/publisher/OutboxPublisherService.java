package com.paywallet.outbox.publisher;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.paywallet.outbox.domain.OutboxEvent;
import com.paywallet.outbox.domain.OutboxStatus;
import com.paywallet.outbox.event.OutboxMessage;
import com.paywallet.outbox.repository.OutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Service
public class OutboxPublisherService {

    private static final Logger log = LoggerFactory.getLogger(OutboxPublisherService.class);

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final String topic;
    private final int batchSize;
    private final int maxRetries;
    private final long sendTimeoutMs;

    public OutboxPublisherService(
            OutboxEventRepository outboxEventRepository,
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper objectMapper,
            @Value("${paywallet.kafka.topic.wallet-events:wallet.events}") String topic,
            @Value("${paywallet.outbox.publisher.batch-size:50}") int batchSize,
            @Value("${paywallet.outbox.publisher.max-retries:3}") int maxRetries,
            @Value("${paywallet.outbox.publisher.send-timeout-ms:3000}") long sendTimeoutMs
    ) {
        this.outboxEventRepository = outboxEventRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.topic = topic;
        this.batchSize = batchSize;
        this.maxRetries = maxRetries;
        this.sendTimeoutMs = sendTimeoutMs;
    }

    /**
     * Reads a batch of NEW outbox events with FOR UPDATE SKIP LOCKED, sends them to Kafka
     * partitioned by wallet id, and marks them SENT upon broker acknowledgment.
     */
    @Transactional
    public int publishPendingEvents() {
        List<OutboxEvent> events = outboxEventRepository.lockNextBatchForPublishing(batchSize);
        if (events.isEmpty()) {
            return 0;
        }

        log.debug("Found {} pending outbox event(s) for publishing", events.size());
        int publishedCount = 0;

        for (OutboxEvent event : events) {
            try {
                OutboxMessage message = new OutboxMessage(
                        event.getId(),
                        event.getEventType(),
                        event.getAggregateType(),
                        event.getAggregateId(),
                        event.getPayload(),
                        event.getCreatedAt()
                );

                String payloadJson = objectMapper.writeValueAsString(message);
                String key = event.getAggregateId(); // partitioned by wallet ID

                CompletableFuture<SendResult<String, String>> future = kafkaTemplate.send(topic, key, payloadJson);
                future.get(sendTimeoutMs, TimeUnit.MILLISECONDS);

                event.setStatus(OutboxStatus.SENT);
                event.setProcessedAt(Instant.now());
                event.setErrorMessage(null);
                outboxEventRepository.save(event);

                publishedCount++;
                log.info("Successfully published outbox event id={} type={} aggregateId={} to topic={}",
                        event.getId(), event.getEventType(), event.getAggregateId(), topic);

            } catch (Exception ex) {
                int nextRetry = event.getRetryCount() + 1;
                event.setRetryCount(nextRetry);
                event.setErrorMessage(ex.getMessage());
                event.setProcessedAt(Instant.now());

                if (nextRetry >= maxRetries) {
                    event.setStatus(OutboxStatus.FAILED);
                    log.error("Outbox event id={} exceeded max retries ({}/{}). Marking as FAILED. Cause: {}",
                            event.getId(), nextRetry, maxRetries, ex.getMessage());
                } else {
                    event.setStatus(OutboxStatus.NEW);
                    log.warn("Failed to publish outbox event id={} (attempt {}/{}). Will retry. Cause: {}",
                            event.getId(), nextRetry, maxRetries, ex.getMessage());
                }

                outboxEventRepository.save(event);
            }
        }

        return publishedCount;
    }
}
