package com.paywallet.outbox.publisher;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "paywallet.outbox.publisher.enabled", havingValue = "true", matchIfMissing = true)
public class OutboxPublisherScheduler {

    private static final Logger log = LoggerFactory.getLogger(OutboxPublisherScheduler.class);

    private final OutboxPublisherService publisherService;

    public OutboxPublisherScheduler(OutboxPublisherService publisherService) {
        this.publisherService = publisherService;
    }

    @Scheduled(fixedDelayString = "${paywallet.outbox.publisher.delay-ms:500}")
    public void schedulePublishing() {
        try {
            int count = publisherService.publishPendingEvents();
            if (count > 0) {
                log.debug("Outbox publisher dispatched {} event(s)", count);
            }
        } catch (Exception e) {
            log.warn("Error during scheduled outbox publishing cycle: {}", e.getMessage());
        }
    }
}
