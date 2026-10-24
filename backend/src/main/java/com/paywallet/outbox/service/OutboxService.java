package com.paywallet.outbox.service;

import com.paywallet.outbox.domain.OutboxEvent;

public interface OutboxService {

    OutboxEvent recordEvent(String aggregateType, String aggregateId, String eventType, Object payload);
}
