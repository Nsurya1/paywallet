package com.paywallet.transfer.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "paywallet.locking")
public record LockingProperties(
        String strategy,
        OptimisticProperties optimistic
) {
    public LockingProperties {
        if (strategy == null || strategy.isBlank()) {
            strategy = "pessimistic";
        }
        if (optimistic == null) {
            optimistic = new OptimisticProperties(30, 8L, 1.5, 100L, 0.5);
        }
    }

    public record OptimisticProperties(
            int maxRetries,
            long initialBackoffMs,
            double multiplier,
            long maxBackoffMs,
            double jitterRatio
    ) {
        public OptimisticProperties {
            if (maxRetries <= 0) maxRetries = 25;
            if (initialBackoffMs <= 0) initialBackoffMs = 15L;
            if (multiplier <= 1.0) multiplier = 2.0;
            if (maxBackoffMs <= 0) maxBackoffMs = 300L;
            if (jitterRatio < 0.0 || jitterRatio > 1.0) jitterRatio = 0.5;
        }
    }
}
