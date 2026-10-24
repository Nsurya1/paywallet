package com.paywallet.transfer.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
public class TransferMetrics {

    private final MeterRegistry registry;

    public TransferMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    public void recordSuccess(String strategy, long durationNanos) {
        Counter.builder("transfer_success_total")
                .description("Total number of successfully completed transfers")
                .tag("strategy", strategy)
                .register(registry)
                .increment();

        Timer.builder("transfer_duration")
                .description("Duration of transfer execution")
                .tag("strategy", strategy)
                .tag("status", "success")
                .register(registry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }

    public void recordFailure(String strategy, String reason, long durationNanos) {
        Counter.builder("transfer_failure_total")
                .description("Total number of failed transfers")
                .tag("strategy", strategy)
                .tag("reason", reason)
                .register(registry)
                .increment();

        Timer.builder("transfer_duration")
                .description("Duration of transfer execution")
                .tag("strategy", strategy)
                .tag("status", "failure")
                .register(registry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }

    public void recordRetry(String strategy) {
        Counter.builder("transfer_lock_retries_total")
                .description("Total number of optimistic locking conflict retries")
                .tag("strategy", strategy)
                .register(registry)
                .increment();
    }

    public double getSuccessCount(String strategy) {
        Counter counter = registry.find("transfer_success_total").tag("strategy", strategy).counter();
        return counter != null ? counter.count() : 0.0;
    }

    public double getFailureCount(String strategy) {
        Counter counter = registry.find("transfer_failure_total").tag("strategy", strategy).counter();
        return counter != null ? counter.count() : 0.0;
    }

    public double getRetryCount(String strategy) {
        Counter counter = registry.find("transfer_lock_retries_total").tag("strategy", strategy).counter();
        return counter != null ? counter.count() : 0.0;
    }
}
