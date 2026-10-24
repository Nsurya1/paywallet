package com.paywallet.transfer.strategy;

import com.paywallet.common.exception.BusinessException;
import com.paywallet.common.exception.ResourceNotFoundException;
import com.paywallet.ledger.domain.LedgerEntry;
import com.paywallet.ledger.repository.LedgerEntryRepository;
import com.paywallet.transfer.config.LockingProperties;
import com.paywallet.transfer.domain.Transaction;
import com.paywallet.transfer.domain.TransactionStatus;
import com.paywallet.transfer.domain.TransactionType;
import com.paywallet.transfer.dto.TransferRequest;
import com.paywallet.transfer.dto.TransferResponse;
import com.paywallet.transfer.metrics.TransferMetrics;
import com.paywallet.transfer.repository.TransactionRepository;
import com.paywallet.wallet.domain.Wallet;
import com.paywallet.wallet.exception.WalletAccessDeniedException;
import com.paywallet.wallet.repository.WalletRepository;
import jakarta.persistence.OptimisticLockException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Component("optimisticLockingStrategy")
public class OptimisticLockingStrategy implements TransferLockingStrategy {

    private static final Logger log = LoggerFactory.getLogger(OptimisticLockingStrategy.class);

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final TransferMetrics metrics;
    private final LockingProperties properties;
    private final TransactionTemplate transactionTemplate;

    public OptimisticLockingStrategy(
            WalletRepository walletRepository,
            TransactionRepository transactionRepository,
            LedgerEntryRepository ledgerEntryRepository,
            TransferMetrics metrics,
            LockingProperties properties,
            PlatformTransactionManager transactionManager
    ) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.metrics = metrics;
        this.properties = properties;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    public String getStrategyName() {
        return "optimistic";
    }

    @Override
    public TransferResponse transfer(TransferRequest request, UUID currentUserId) {
        long startTime = System.nanoTime();
        int maxRetries = properties.optimistic().maxRetries();
        int attempt = 0;

        while (true) {
            attempt++;
            try {
                // Execute each transfer attempt inside an isolated database transaction
                TransferResponse response = transactionTemplate.execute(status ->
                        executeTransferOnce(request, currentUserId)
                );

                metrics.recordSuccess("optimistic", System.nanoTime() - startTime);
                return response;

            } catch (OptimisticLockingFailureException | OptimisticLockException | CannotAcquireLockException | CannotCreateTransactionException ex) {
                metrics.recordRetry("optimistic");
                log.debug("Optimistic lock collision or pool busy on transfer (attempt {}/{}): {}", attempt, maxRetries, ex.getMessage());

                if (attempt > maxRetries) {
                    metrics.recordFailure("optimistic", "MAX_RETRIES_EXCEEDED", System.nanoTime() - startTime);
                    throw new BusinessException(
                            "CONCURRENCY_CONFLICT",
                            String.format("Transfer failed after %d optimistic locking retry attempts due to high contention", maxRetries)
                    );
                }

                applyBackoffWithJitter(attempt);

            } catch (Exception ex) {
                metrics.recordFailure("optimistic", ex.getClass().getSimpleName(), System.nanoTime() - startTime);
                throw ex;
            }
        }
    }

    private TransferResponse executeTransferOnce(TransferRequest request, UUID currentUserId) {
        // 1. Validation: cannot transfer to the same wallet
        if (request.fromWalletId().equals(request.toWalletId())) {
            throw new BusinessException(
                    "INVALID_TRANSFER",
                    "Cannot transfer funds to the same wallet"
            );
        }

        // 2. Load wallets WITHOUT locking (standard findById relying on @Version)
        Wallet fromWallet = walletRepository.findById(request.fromWalletId())
                .orElseThrow(() -> new ResourceNotFoundException("Source wallet", request.fromWalletId()));

        Wallet toWallet = walletRepository.findById(request.toWalletId())
                .orElseThrow(() -> new ResourceNotFoundException("Destination wallet", request.toWalletId()));

        // 3. Validation: caller must be the owner of the source wallet
        if (!fromWallet.getUserId().equals(currentUserId)) {
            throw new WalletAccessDeniedException(
                    String.format("You do not have permission to transfer from wallet '%s'", request.fromWalletId())
            );
        }

        // 4. Validation: source and destination wallets must have identical currencies
        if (!fromWallet.getCurrency().equalsIgnoreCase(toWallet.getCurrency())) {
            throw new BusinessException(
                    "CURRENCY_MISMATCH",
                    String.format("Cross-currency transfer from %s to %s is not supported",
                            fromWallet.getCurrency(), toWallet.getCurrency())
            );
        }

        // 5. Update balances via rich domain methods (enforces active state, positive amount, and sufficient balance)
        fromWallet.debit(request.amount());
        toWallet.credit(request.amount());

        // Order wallet updates in deterministic ascending UUID sequence to prevent PostgreSQL deadlock during flush
        Wallet firstToSave = fromWallet.getId().compareTo(toWallet.getId()) < 0 ? fromWallet : toWallet;
        Wallet secondToSave = fromWallet.getId().compareTo(toWallet.getId()) < 0 ? toWallet : fromWallet;

        walletRepository.saveAndFlush(firstToSave);
        walletRepository.saveAndFlush(secondToSave);

        // 6. Insert 1 transaction row
        String referenceId = "TRF-" + UUID.randomUUID();
        Transaction transaction = new Transaction(
                referenceId,
                fromWallet.getId(),
                toWallet.getId(),
                request.amount(),
                fromWallet.getCurrency(),
                TransactionType.TRANSFER,
                TransactionStatus.COMPLETED
        );
        Transaction savedTx = transactionRepository.save(transaction);

        // 7. Insert 2 immutable ledger entries
        String description = (request.description() != null && !request.description().isBlank())
                ? request.description()
                : "Peer-to-peer wallet transfer";

        LedgerEntry debitEntry = LedgerEntry.debit(
                savedTx.getId(),
                fromWallet.getId(),
                request.amount(),
                fromWallet.getBalance(),
                description + " (Debit: to wallet " + toWallet.getId() + ")"
        );

        LedgerEntry creditEntry = LedgerEntry.credit(
                savedTx.getId(),
                toWallet.getId(),
                request.amount(),
                toWallet.getBalance(),
                description + " (Credit: from wallet " + fromWallet.getId() + ")"
        );

        ledgerEntryRepository.save(debitEntry);
        ledgerEntryRepository.save(creditEntry);

        return TransferResponse.from(savedTx);
    }

    private void applyBackoffWithJitter(int attempt) {
        long initialBackoff = properties.optimistic().initialBackoffMs();
        double multiplier = properties.optimistic().multiplier();
        long maxBackoff = properties.optimistic().maxBackoffMs();
        double jitterRatio = properties.optimistic().jitterRatio();

        long calculatedBackoff = (long) (initialBackoff * Math.pow(multiplier, attempt - 1));
        long backoff = Math.min(calculatedBackoff, maxBackoff);

        // Full/decorrelated jitter: randomize within [backoff * (1 - jitterRatio), backoff * (1 + jitterRatio)]
        long jitterRange = (long) (backoff * jitterRatio);
        long jitter = (jitterRange > 0) ? ThreadLocalRandom.current().nextLong(-jitterRange, jitterRange + 1) : 0;
        long sleepTime = Math.max(1, backoff + jitter);

        try {
            Thread.sleep(sleepTime);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException("TRANSFER_INTERRUPTED", "Transfer retry was interrupted");
        }
    }
}
