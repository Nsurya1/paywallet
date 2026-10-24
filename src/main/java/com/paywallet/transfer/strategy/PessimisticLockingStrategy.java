package com.paywallet.transfer.strategy;

import com.paywallet.common.exception.BusinessException;
import com.paywallet.common.exception.ResourceNotFoundException;
import com.paywallet.ledger.domain.LedgerEntry;
import com.paywallet.ledger.repository.LedgerEntryRepository;
import com.paywallet.outbox.event.WalletTransferredEvent;
import com.paywallet.outbox.service.OutboxService;
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
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component("pessimisticLockingStrategy")
public class PessimisticLockingStrategy implements TransferLockingStrategy {

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final TransferMetrics metrics;
    private final OutboxService outboxService;

    public PessimisticLockingStrategy(
            WalletRepository walletRepository,
            TransactionRepository transactionRepository,
            LedgerEntryRepository ledgerEntryRepository,
            TransferMetrics metrics,
            OutboxService outboxService
    ) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.metrics = metrics;
        this.outboxService = outboxService;
    }

    @Override
    public String getStrategyName() {
        return "pessimistic";
    }

    @Override
    @Transactional
    public TransferResponse transfer(TransferRequest request, UUID currentUserId) {
        long startTime = System.nanoTime();

        try {
            // 1. Validation: cannot transfer to the same wallet
            if (request.fromWalletId().equals(request.toWalletId())) {
                throw new BusinessException(
                        "INVALID_TRANSFER",
                        "Cannot transfer funds to the same wallet"
                );
            }

            // 2. Deadlock-free pessimistic locking: Deterministically sort wallet UUIDs
            UUID firstId = request.fromWalletId().compareTo(request.toWalletId()) < 0
                    ? request.fromWalletId()
                    : request.toWalletId();
            UUID secondId = request.fromWalletId().compareTo(request.toWalletId()) < 0
                    ? request.toWalletId()
                    : request.fromWalletId();

            Wallet firstWallet = walletRepository.findByIdForUpdate(firstId)
                    .orElseThrow(() -> new ResourceNotFoundException("Wallet", firstId));

            Wallet secondWallet = walletRepository.findByIdForUpdate(secondId)
                    .orElseThrow(() -> new ResourceNotFoundException("Wallet", secondId));

            Wallet fromWallet = request.fromWalletId().equals(firstWallet.getId()) ? firstWallet : secondWallet;
            Wallet toWallet = request.toWalletId().equals(firstWallet.getId()) ? firstWallet : secondWallet;

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

            // 5. Update balances via rich domain methods
            fromWallet.debit(request.amount());
            toWallet.credit(request.amount());

            walletRepository.save(fromWallet);
            walletRepository.save(toWallet);

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

            // 7. Insert 2 immutable ledger entries (debit from source, credit to destination with balance_after)
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

            // 8. Record transactional outbox event
            outboxService.recordEvent(
                    "WALLET",
                    fromWallet.getId().toString(),
                    "WALLET_TRANSFERRED",
                    new WalletTransferredEvent(
                            UUID.randomUUID(),
                            savedTx.getId(),
                            savedTx.getReferenceId(),
                            fromWallet.getId(),
                            toWallet.getId(),
                            request.amount(),
                            fromWallet.getCurrency(),
                            savedTx.getCreatedAt()
                    )
            );

            metrics.recordSuccess("pessimistic", System.nanoTime() - startTime);
            return TransferResponse.from(savedTx);

        } catch (Exception ex) {
            metrics.recordFailure("pessimistic", ex.getClass().getSimpleName(), System.nanoTime() - startTime);
            throw ex;
        }
    }
}
