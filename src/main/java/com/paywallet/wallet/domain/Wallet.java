package com.paywallet.wallet.domain;

import com.paywallet.wallet.exception.InsufficientFundsException;
import com.paywallet.wallet.exception.InvalidAmountException;
import com.paywallet.wallet.exception.WalletInactiveException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "wallets")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Wallet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "balance", nullable = false)
    private long balance;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private WalletStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Wallet(UUID userId, String currency) {
        this.userId = userId;
        this.currency = (currency != null && !currency.isBlank()) ? currency.toUpperCase() : "INR";
        this.balance = 0L;
        this.status = WalletStatus.ACTIVE;
    }

    public Wallet(UUID userId, String currency, long initialBalance) {
        this(userId, currency);
        if (initialBalance < 0) {
            throw new InvalidAmountException("Initial balance cannot be negative");
        }
        this.balance = initialBalance;
    }

    /**
     * Credits funds into the wallet account.
     * Enforces invariants: amount > 0, wallet must be active, overflow protection.
     *
     * @param amount the credit amount in minor currency units (paise/cents)
     */
    public void credit(long amount) {
        if (amount <= 0) {
            throw new InvalidAmountException("Credit amount must be strictly positive (> 0), received: " + amount);
        }
        if (this.status != WalletStatus.ACTIVE) {
            throw new WalletInactiveException("Cannot credit wallet: current status is " + this.status);
        }
        try {
            this.balance = Math.addExact(this.balance, amount);
        } catch (ArithmeticException ex) {
            throw new InvalidAmountException("Credit amount causes numeric balance overflow");
        }
    }

    /**
     * Debits funds from the wallet account.
     * Enforces invariants: amount > 0, wallet must be active, balance cannot become negative.
     *
     * @param amount the debit amount in minor currency units (paise/cents)
     */
    public void debit(long amount) {
        if (amount <= 0) {
            throw new InvalidAmountException("Debit amount must be strictly positive (> 0), received: " + amount);
        }
        if (this.status != WalletStatus.ACTIVE) {
            throw new WalletInactiveException("Cannot debit wallet: current status is " + this.status);
        }
        if (this.balance < amount) {
            throw new InsufficientFundsException(
                    String.format("Insufficient funds: current balance is %d, required debit is %d", this.balance, amount)
            );
        }
        this.balance = Math.subtractExact(this.balance, amount);
    }

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) {
            this.status = WalletStatus.ACTIVE;
        }
        if (this.version == null) {
            this.version = 0L;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
