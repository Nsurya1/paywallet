package com.paywallet.outbox.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
@ConditionalOnProperty(name = "paywallet.kafka.topic.auto-create", matchIfMissing = true, havingValue = "true")
public class KafkaTopicConfig {

    @Value("${paywallet.kafka.topic.wallet-events:wallet.events}")
    private String walletEventsTopic;

    @Bean
    public NewTopic walletEventsTopic() {
        return TopicBuilder.name(walletEventsTopic)
                .partitions(3)
                .replicas(1)
                .build();
    }
}
