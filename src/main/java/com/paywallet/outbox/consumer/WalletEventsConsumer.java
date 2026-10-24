package com.paywallet.outbox.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.paywallet.outbox.domain.ConsumedEvent;
import com.paywallet.outbox.event.OutboxMessage;
import com.paywallet.outbox.repository.ConsumedEventRepository;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@ConditionalOnProperty(name = "paywallet.kafka.consumer.enabled", havingValue = "true", matchIfMissing = true)
public class WalletEventsConsumer {

    private static final Logger log = LoggerFactory.getLogger(WalletEventsConsumer.class);

    private final ConsumedEventRepository consumedEventRepository;
    private final ObjectMapper objectMapper;

    // In-memory monitoring hooks for testing and observability
    private final List<OutboxMessage> consumedEventsList = new CopyOnWriteArrayList<>();
    private final AtomicInteger duplicateDetections = new AtomicInteger(0);

    public WalletEventsConsumer(ConsumedEventRepository consumedEventRepository, ObjectMapper objectMapper) {
        this.consumedEventRepository = consumedEventRepository;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(
            topics = "${paywallet.kafka.topic.wallet-events:wallet.events}",
            groupId = "${spring.kafka.consumer.group-id:paywallet-group}",
            autoStartup = "${paywallet.kafka.consumer.auto-startup:true}"
    )
    @Transactional
    public void consume(ConsumerRecord<String, String> record) {
        try {
            OutboxMessage message = objectMapper.readValue(record.value(), OutboxMessage.class);
            UUID eventId = message.eventId();

            // 1. Idempotency Check: deduplicate by event_id
            if (consumedEventRepository.existsById(eventId)) {
                duplicateDetections.incrementAndGet();
                log.info("Duplicate event detected: eventId={} aggregateId={}. Skipping processing (Idempotent ACK).",
                        eventId, message.aggregateId());
                return;
            }

            // 2. Process event (business logic / notifications dispatch)
            log.info("Processing wallet event: eventId={} type={} aggregateId={} partition={} offset={}",
                    eventId, message.eventType(), message.aggregateId(), record.partition(), record.offset());

            // 3. Record consumption atomically in PostgreSQL
            ConsumedEvent consumed = new ConsumedEvent(
                    eventId,
                    message.aggregateId(),
                    message.eventType(),
                    message.payload(),
                    Instant.now()
            );
            consumedEventRepository.save(consumed);
            consumedEventsList.add(message);

        } catch (Exception ex) {
            log.error("Failed to process Kafka record from partition={} offset={}: {}",
                    record.partition(), record.offset(), ex.getMessage(), ex);
            throw new RuntimeException("Consumer error processing record", ex);
        }
    }

    public List<OutboxMessage> getConsumedEventsList() {
        return consumedEventsList;
    }

    public int getDuplicateDetectionsCount() {
        return duplicateDetections.get();
    }

    public void clear() {
        consumedEventsList.clear();
        duplicateDetections.set(0);
    }
}
