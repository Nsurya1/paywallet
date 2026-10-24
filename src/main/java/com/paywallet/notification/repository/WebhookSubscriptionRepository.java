package com.paywallet.notification.repository;

import com.paywallet.notification.domain.WebhookSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WebhookSubscriptionRepository extends JpaRepository<WebhookSubscription, UUID> {

    List<WebhookSubscription> findByUserId(UUID userId);

    @Query("SELECT s FROM WebhookSubscription s WHERE s.active = true AND (s.eventType = :eventType OR s.eventType = '*')")
    List<WebhookSubscription> findActiveSubscriptionsForEvent(@Param("eventType") String eventType);
}
