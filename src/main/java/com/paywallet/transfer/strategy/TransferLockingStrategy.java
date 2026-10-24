package com.paywallet.transfer.strategy;

import com.paywallet.transfer.dto.TransferRequest;
import com.paywallet.transfer.dto.TransferResponse;

import java.util.UUID;

/**
 * Strategy interface for executing balance transfers with concurrency control.
 * Decouples locking algorithms (Pessimistic vs. Optimistic) from business transfer logic.
 */
public interface TransferLockingStrategy {

    /**
     * Returns the unique identifier of this locking strategy (e.g. "pessimistic" or "optimistic").
     */
    String getStrategyName();

    /**
     * Executes the transfer between source and destination wallets under the strategy's concurrency control.
     *
     * @param request the validated transfer request
     * @param currentUserId the ID of the authenticated user requesting the transfer
     * @return the transfer response
     */
    TransferResponse transfer(TransferRequest request, UUID currentUserId);
}
