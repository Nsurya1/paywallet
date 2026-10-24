package com.paywallet.transfer.dto;

import com.paywallet.transfer.domain.Transaction;
import com.paywallet.transfer.domain.TransactionStatus;
import com.paywallet.transfer.domain.TransactionType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

@Schema(description = "Transaction details record")
public record TransactionResponse(

        @Schema(description = "Unique transaction identifier")
        UUID id,

        @Schema(description = "External or generated transaction reference identifier")
        String referenceId,

        @Schema(description = "Source wallet ID (null for direct top-up deposits)")
        UUID fromWalletId,

        @Schema(description = "Destination wallet ID (null for withdrawals)")
        UUID toWalletId,

        @Schema(description = "Transaction amount in minor units (cents/paise)")
        long amount,

        @Schema(description = "Three-letter ISO 4217 currency code")
        String currency,

        @Schema(description = "Transaction type")
        TransactionType type,

        @Schema(description = "Transaction execution status")
        TransactionStatus status,

        @Schema(description = "Failure reason if status is FAILED", nullable = true)
        String failureReason,

        @Schema(description = "Timestamp when the transaction was created")
        Instant createdAt
) {
    public static TransactionResponse from(Transaction tx) {
        return new TransactionResponse(
                tx.getId(),
                tx.getReferenceId(),
                tx.getFromWalletId(),
                tx.getToWalletId(),
                tx.getAmount(),
                tx.getCurrency(),
                tx.getType(),
                tx.getStatus(),
                tx.getFailureReason(),
                tx.getCreatedAt()
        );
    }
}
