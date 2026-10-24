package com.paywallet.transfer.strategy;

import com.paywallet.transfer.config.LockingProperties;
import com.paywallet.transfer.dto.TransferRequest;
import com.paywallet.transfer.dto.TransferResponse;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Primary strategy dispatcher that selects and executes the configured locking strategy
 * (pessimistic vs. optimistic) based on the 'paywallet.locking.strategy' application property.
 */
@Primary
@Component
public class ConfiguredTransferLockingStrategy implements TransferLockingStrategy {

    private final Map<String, TransferLockingStrategy> strategyMap;
    private final LockingProperties properties;

    public ConfiguredTransferLockingStrategy(
            List<TransferLockingStrategy> strategies,
            LockingProperties properties
    ) {
        this.strategyMap = strategies.stream()
                .filter(s -> !(s instanceof ConfiguredTransferLockingStrategy))
                .collect(Collectors.toMap(
                        s -> s.getStrategyName().toLowerCase(),
                        s -> s
                ));
        this.properties = properties;
    }

    @Override
    public String getStrategyName() {
        return properties.strategy().toLowerCase();
    }

    @Override
    public TransferResponse transfer(TransferRequest request, UUID currentUserId) {
        String activeStrategy = getStrategyName();
        TransferLockingStrategy strategy = strategyMap.get(activeStrategy);
        if (strategy == null) {
            throw new IllegalStateException(
                    String.format("Unknown locking strategy '%s'. Supported strategies: %s",
                            activeStrategy, strategyMap.keySet())
            );
        }
        return strategy.transfer(request, currentUserId);
    }

    public TransferLockingStrategy getStrategy(String name) {
        TransferLockingStrategy strategy = strategyMap.get(name.toLowerCase());
        if (strategy == null) {
            throw new IllegalArgumentException("Unsupported locking strategy: " + name);
        }
        return strategy;
    }
}
