package com.paywallet.wallet.service;

import com.paywallet.auth.security.SecurityUtils;
import com.paywallet.common.exception.BusinessException;
import com.paywallet.common.exception.ResourceNotFoundException;
import com.paywallet.ledger.domain.LedgerEntry;
import com.paywallet.ledger.repository.LedgerEntryRepository;
import com.paywallet.outbox.event.WalletToppedUpEvent;
import com.paywallet.outbox.service.OutboxService;
import com.paywallet.transfer.domain.Transaction;
import com.paywallet.transfer.domain.TransactionStatus;
import com.paywallet.transfer.domain.TransactionType;
import com.paywallet.transfer.repository.TransactionRepository;
import com.paywallet.wallet.domain.Wallet;
import com.paywallet.wallet.dto.CreateWalletRequest;
import com.paywallet.wallet.dto.TopUpRequest;
import com.paywallet.wallet.dto.TopUpResponse;
import com.paywallet.wallet.dto.WalletResponse;
import com.paywallet.wallet.exception.WalletAccessDeniedException;
import com.paywallet.wallet.repository.WalletRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class WalletService {

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final OutboxService outboxService;

    public WalletService(
            WalletRepository walletRepository,
            TransactionRepository transactionRepository,
            LedgerEntryRepository ledgerEntryRepository,
            OutboxService outboxService
    ) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.outboxService = outboxService;
    }

    @Transactional
    public WalletResponse createWallet(CreateWalletRequest request) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();

        if (walletRepository.existsByUserIdAndCurrency(currentUserId, request.currency())) {
            throw new BusinessException(
                    "WALLET_ALREADY_EXISTS",
                    String.format("Wallet with currency '%s' already exists for this user", request.currency())
            );
        }

        Wallet wallet = new Wallet(currentUserId, request.currency());
        Wallet saved = walletRepository.save(wallet);
        return WalletResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public WalletResponse getWalletById(UUID walletId) {
        Wallet wallet = getWalletAndVerifyOwnership(walletId, "view");
        return WalletResponse.from(wallet);
    }

    @Transactional(readOnly = true)
    public List<WalletResponse> getCurrentUserWallets() {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        return walletRepository.findByUserId(currentUserId)
                .stream()
                .map(WalletResponse::from)
                .toList();
    }

    @Transactional
    public TopUpResponse topUp(UUID walletId, TopUpRequest request) {
        Wallet wallet = getWalletAndVerifyOwnership(walletId, "top up");

        // 1. Credit wallet using rich domain method (enforcing positive amount, active status, overflow check)
        wallet.credit(request.amount());

        // 2. Create TOPUP transaction record
        String referenceId = "TOPUP-" + UUID.randomUUID().toString();
        Transaction transaction = new Transaction(
                referenceId,
                null, // No source wallet for external top-up
                wallet.getId(),
                request.amount(),
                wallet.getCurrency(),
                TransactionType.TOPUP,
                TransactionStatus.COMPLETED
        );
        Transaction savedTxn = transactionRepository.save(transaction);

        // 3. Create immutable LedgerEntry credit posting
        LedgerEntry ledgerEntry = LedgerEntry.credit(
                savedTxn.getId(),
                wallet.getId(),
                request.amount(),
                wallet.getBalance(),
                "Wallet top-up via " + request.paymentMethod()
        );
        ledgerEntryRepository.save(ledgerEntry);

        // 4. Persist updated wallet balance
        Wallet updatedWallet = walletRepository.save(wallet);

        // 5. Record transactional outbox event
        outboxService.recordEvent(
                "WALLET",
                updatedWallet.getId().toString(),
                "WALLET_TOPPED_UP",
                new WalletToppedUpEvent(
                        UUID.randomUUID(),
                        updatedWallet.getId(),
                        updatedWallet.getUserId(),
                        request.amount(),
                        updatedWallet.getCurrency(),
                        updatedWallet.getBalance(),
                        savedTxn.getReferenceId(),
                        savedTxn.getCreatedAt()
                )
        );

        return new TopUpResponse(
                savedTxn.getId(),
                savedTxn.getReferenceId(),
                updatedWallet.getId(),
                request.amount(),
                updatedWallet.getBalance(),
                updatedWallet.getCurrency(),
                savedTxn.getCreatedAt()
        );
    }

    private Wallet getWalletAndVerifyOwnership(UUID walletId, String actionDescription) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet", walletId));

        if (!wallet.getUserId().equals(currentUserId)) {
            throw new WalletAccessDeniedException(
                    String.format("You do not have permission to %s wallet '%s'", actionDescription, walletId)
            );
        }
        return wallet;
    }
}
