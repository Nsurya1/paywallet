package com.paywallet.notification.repository;

import com.paywallet.notification.domain.WebhookDeliveryLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WebhookDeliveryLogRepository extends JpaRepository<WebhookDeliveryLog, UUID> {

    List<WebhookDeliveryLog> findBySubscriptionIdOrderByDeliveredAtDesc(UUID subscriptionId, Pageable pageable);

    List<WebhookDeliveryLog> findByEventId(UUID eventId);

    List<WebhookDeliveryLog> findAllByOrderByDeliveredAtDesc(Pageable pageable);
}
