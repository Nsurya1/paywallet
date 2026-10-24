package com.paywallet.idempotency.scheduler;

import com.paywallet.idempotency.repository.IdempotencyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Component
public class IdempotencyCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(IdempotencyCleanupScheduler.class);

    private final IdempotencyRepository idempotencyRepository;

    public IdempotencyCleanupScheduler(IdempotencyRepository idempotencyRepository) {
        this.idempotencyRepository = idempotencyRepository;
    }

    /**
     * Periodically purges expired idempotency keys from PostgreSQL.
     * Defaults to running once every hour (3,600,000 ms).
     */
    @Scheduled(fixedDelayString = "${paywallet.idempotency.cleanup-delay-ms:3600000}")
    @Transactional
    public int purgeExpiredKeys() {
        Instant now = Instant.now();
        int deletedCount = idempotencyRepository.deleteExpiredKeys(now);
        if (deletedCount > 0) {
            log.info("Purged {} expired idempotency keys older than {}", deletedCount, now);
        } else {
            log.debug("Idempotency cleanup completed. No expired keys found at {}", now);
        }
        return deletedCount;
    }
}
