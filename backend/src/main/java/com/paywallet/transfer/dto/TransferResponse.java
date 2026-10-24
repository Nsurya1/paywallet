package com.paywallet.transfer.dto;

import com.paywallet.transfer.domain.Transaction;
import com.paywallet.transfer.domain.TransactionStatus;
import com.paywallet.transfer.domain.TransactionType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

@Schema(description = "Response payload after initiating a wallet transfer")
public record TransferResponse(

        @Schema(description = "Primary key ID of the created transaction")
        UUID transactionId,

        @Schema(description = "Unique alphanumeric reference code for tracking and reconciliation")
        String referenceId,

        @Schema(description = "Source wallet ID (debited)")
        UUID fromWalletId,

        @Schema(description = "Destination wallet ID (credited)")
        UUID toWalletId,

        @Schema(description = "Transfer amount in minor currency units")
        long amount,

        @Schema(description = "Three-letter ISO 4217 currency code")
        String currency,

        @Schema(description = "Transaction category", example = "TRANSFER")
        TransactionType type,

        @Schema(description = "Execution status of the transaction", example = "COMPLETED")
        TransactionStatus status,

        @Schema(description = "Timestamp when the transaction was recorded in the database")
        Instant createdAt
) {
    public static TransferResponse from(Transaction tx) {
        return new TransferResponse(
                tx.getId(),
                tx.getReferenceId(),
                tx.getFromWalletId(),
                tx.getToWalletId(),
                tx.getAmount(),
                tx.getCurrency(),
                tx.getType(),
                tx.getStatus(),
                tx.getCreatedAt()
        );
    }
}
