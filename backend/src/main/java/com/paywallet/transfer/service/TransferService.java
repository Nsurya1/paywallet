package com.paywallet.transfer.service;

import com.paywallet.auth.security.SecurityUtils;
import com.paywallet.common.exception.ResourceNotFoundException;
import com.paywallet.transfer.domain.Transaction;
import com.paywallet.transfer.domain.TransactionType;
import com.paywallet.transfer.dto.TransactionResponse;
import com.paywallet.transfer.dto.TransferRequest;
import com.paywallet.transfer.dto.TransferResponse;
import com.paywallet.transfer.repository.TransactionRepository;
import com.paywallet.transfer.specification.TransactionSpecifications;
import com.paywallet.transfer.strategy.TransferLockingStrategy;
import com.paywallet.wallet.domain.Wallet;
import com.paywallet.wallet.exception.WalletAccessDeniedException;
import com.paywallet.wallet.repository.WalletRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class TransferService {

    private final TransferLockingStrategy lockingStrategy;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;

    public TransferService(
            TransferLockingStrategy lockingStrategy,
            WalletRepository walletRepository,
            TransactionRepository transactionRepository
    ) {
        this.lockingStrategy = lockingStrategy;
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
    }

    /**
     * Executes a peer-to-peer wallet transfer using the configured locking strategy
     * (Pessimistic Locking or Optimistic Locking with retry and backoff).
     *
     * @param request the validated transfer request
     * @return the transfer response
     */
    public TransferResponse transfer(TransferRequest request) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        return lockingStrategy.transfer(request, currentUserId);
    }

    /**
     * Retrieves paginated transactions for a wallet with optional type and date filters.
     * Enforces ownership authorization on the requested wallet.
     */
    @Transactional(readOnly = true)
    public Page<TransactionResponse> getWalletTransactions(
            UUID walletId,
            TransactionType type,
            Instant startDate,
            Instant endDate,
            Pageable pageable
    ) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();

        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet", walletId));

        if (!wallet.getUserId().equals(currentUserId)) {
            throw new WalletAccessDeniedException(
                    String.format("You do not have permission to view transactions for wallet '%s'", walletId)
            );
        }

        Specification<Transaction> spec = Specification.where(TransactionSpecifications.forWallet(walletId))
                .and(TransactionSpecifications.withType(type))
                .and(TransactionSpecifications.createdBetween(startDate, endDate));

        return transactionRepository.findAll(spec, pageable)
                .map(TransactionResponse::from);
    }

    public String getActiveStrategyName() {
        return lockingStrategy.getStrategyName();
    }
}
