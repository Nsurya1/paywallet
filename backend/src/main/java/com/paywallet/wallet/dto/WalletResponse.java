package com.paywallet.wallet.dto;

import com.paywallet.wallet.domain.Wallet;

import java.time.Instant;
import java.util.UUID;

public record WalletResponse(
        UUID id,
        UUID userId,
        String currency,
        long balance,
        String status,
        Instant createdAt
) {
    public static WalletResponse from(Wallet wallet) {
        return new WalletResponse(
                wallet.getId(),
                wallet.getUserId(),
                wallet.getCurrency(),
                wallet.getBalance(),
                wallet.getStatus().name(),
                wallet.getCreatedAt()
        );
    }
}
