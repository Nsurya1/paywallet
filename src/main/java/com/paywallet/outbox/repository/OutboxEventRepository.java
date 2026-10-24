package com.paywallet.outbox.repository;

import com.paywallet.outbox.domain.OutboxEvent;
import com.paywallet.outbox.domain.OutboxStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    /**
     * Acquires and locks a batch of unprocessed events using PostgreSQL FOR UPDATE SKIP LOCKED.
     * Prevents lock contention and ensures multiple concurrent publisher instances
     * never process the same records.
     */
    @Query(value = """
        SELECT * FROM outbox_events
        WHERE status = 'NEW'
        ORDER BY created_at ASC
        LIMIT :batchSize
        FOR UPDATE SKIP LOCKED
        """, nativeQuery = true)
    List<OutboxEvent> lockNextBatchForPublishing(@Param("batchSize") int batchSize);

    List<OutboxEvent> findByStatus(OutboxStatus status);

    List<OutboxEvent> findByAggregateId(String aggregateId);

    @Modifying
    @Query("UPDATE OutboxEvent o SET o.status = :status, o.processedAt = :processedAt WHERE o.id = :id")
    int markStatus(
            @Param("id") UUID id,
            @Param("status") OutboxStatus status,
            @Param("processedAt") Instant processedAt
    );
}
