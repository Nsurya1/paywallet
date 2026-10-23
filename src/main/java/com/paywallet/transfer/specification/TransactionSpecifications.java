package com.paywallet.transfer.specification;

import com.paywallet.transfer.domain.Transaction;
import com.paywallet.transfer.domain.TransactionType;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.UUID;

public final class TransactionSpecifications {

    private TransactionSpecifications() {
        // Utility class
    }

    public static Specification<Transaction> forWallet(UUID walletId) {
        return (root, query, cb) -> cb.or(
                cb.equal(root.get("fromWalletId"), walletId),
                cb.equal(root.get("toWalletId"), walletId)
        );
    }

    public static Specification<Transaction> withType(TransactionType type) {
        return (root, query, cb) -> type == null ? null : cb.equal(root.get("type"), type);
    }

    public static Specification<Transaction> createdBetween(Instant startDate, Instant endDate) {
        return (root, query, cb) -> {
            if (startDate != null && endDate != null) {
                return cb.between(root.get("createdAt"), startDate, endDate);
            } else if (startDate != null) {
                return cb.greaterThanOrEqualTo(root.get("createdAt"), startDate);
            } else if (endDate != null) {
                return cb.lessThanOrEqualTo(root.get("createdAt"), endDate);
            }
            return null;
        };
    }
}
