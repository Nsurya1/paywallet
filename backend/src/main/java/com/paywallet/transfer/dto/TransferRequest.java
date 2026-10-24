package com.paywallet.transfer.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.UUID;

@Schema(description = "Request payload to initiate a peer-to-peer wallet transfer")
public record TransferRequest(

        @NotNull(message = "Source wallet ID is required")
        @Schema(description = "UUID of the source wallet to debit funds from", example = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d")
        UUID fromWalletId,

        @NotNull(message = "Destination wallet ID is required")
        @Schema(description = "UUID of the destination wallet to credit funds to", example = "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e")
        UUID toWalletId,

        @Positive(message = "Transfer amount must be strictly positive (> 0)")
        @Schema(description = "Transfer amount in minor currency units (paise/cents, e.g. 5000 = 50.00)", example = "5000")
        long amount,

        @Size(max = 255, message = "Description must not exceed 255 characters")
        @Schema(description = "Optional transfer memo or description", example = "Dinner split payment")
        String description
) {
    public TransferRequest(UUID fromWalletId, UUID toWalletId, long amount) {
        this(fromWalletId, toWalletId, amount, null);
    }
}
