package com.paywallet.transfer.service;

import com.paywallet.auth.security.SecurityUtils;
import com.paywallet.common.exception.BusinessException;
import com.paywallet.common.exception.ResourceNotFoundException;
import com.paywallet.ledger.domain.LedgerEntry;
import com.paywallet.ledger.repository.LedgerEntryRepository;
import com.paywallet.transfer.domain.Transaction;
import com.paywallet.transfer.domain.TransactionStatus;
import com.paywallet.transfer.domain.TransactionType;
import com.paywallet.transfer.dto.TransactionResponse;
import com.paywallet.transfer.dto.TransferRequest;
import com.paywallet.transfer.dto.TransferResponse;
import com.paywallet.transfer.repository.TransactionRepository;
import com.paywallet.transfer.specification.TransactionSpecifications;
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

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;

    public TransferService(
            WalletRepository walletRepository,
            TransactionRepository transactionRepository,
            LedgerEntryRepository ledgerEntryRepository
    ) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
    }

    /**
     * Executes a peer-to-peer wallet transfer in a single @Transactional boundary.
     * Note: Executed with plain @Transactional first (no pessimistic / distributed locking)
     * as requested in Step 5 to benchmark baseline transaction mechanics and behavior.
     *
     * @param request the validated transfer request
     * @return the persisted transfer response
     */
    @Transactional
    public TransferResponse transfer(TransferRequest request) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();

        // 1. Validation: cannot transfer to the same wallet
        if (request.fromWalletId().equals(request.toWalletId())) {
            throw new BusinessException(
                    "INVALID_TRANSFER",
                    "Cannot transfer funds to the same wallet"
            );
        }

        // 2. Load wallets without locking (standard findById)
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

        return TransferResponse.from(savedTx);
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
}
