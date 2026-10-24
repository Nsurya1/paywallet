package com.paywallet.outbox.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.paywallet.outbox.domain.OutboxEvent;
import com.paywallet.outbox.repository.OutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OutboxServiceImpl implements OutboxService {

    private static final Logger log = LoggerFactory.getLogger(OutboxServiceImpl.class);

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    public OutboxServiceImpl(OutboxEventRepository outboxEventRepository, ObjectMapper objectMapper) {
        this.outboxEventRepository = outboxEventRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public OutboxEvent recordEvent(String aggregateType, String aggregateId, String eventType, Object payload) {
        try {
            String json = (payload instanceof String s) ? s : objectMapper.writeValueAsString(payload);
            OutboxEvent event = new OutboxEvent(aggregateType, aggregateId, eventType, json);
            OutboxEvent saved = outboxEventRepository.save(event);
            log.debug("Recorded transactional outbox event id={} aggregateId={} eventType={}",
                    saved.getId(), aggregateId, eventType);
            return saved;
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize outbox event payload for aggregateId={} eventType={}", aggregateId, eventType, e);
            throw new IllegalArgumentException("Failed to serialize outbox event payload", e);
        }
    }
}
