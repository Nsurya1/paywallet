package com.paywallet.wallet.domain;

import com.paywallet.wallet.exception.InsufficientFundsException;
import com.paywallet.wallet.exception.InvalidAmountException;
import com.paywallet.wallet.exception.WalletInactiveException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WalletTest {

    private final UUID userId = UUID.randomUUID();

    @Test
    @DisplayName("New wallet initializes with balance 0 and status ACTIVE")
    void newWalletInitialization() {
        Wallet wallet = new Wallet(userId, "INR");

        assertThat(wallet.getUserId()).isEqualTo(userId);
        assertThat(wallet.getCurrency()).isEqualTo("INR");
        assertThat(wallet.getBalance()).isZero();
        assertThat(wallet.getStatus()).isEqualTo(WalletStatus.ACTIVE);
    }

    @Test
    @DisplayName("Credit increases balance by specified amount")
    void creditIncreasesBalance() {
        Wallet wallet = new Wallet(userId, "INR");
        wallet.credit(5000L); // 50.00 INR (5000 paise)

        assertThat(wallet.getBalance()).isEqualTo(5000L);

        wallet.credit(2500L);
        assertThat(wallet.getBalance()).isEqualTo(7500L);
    }

    @Test
    @DisplayName("Credit with zero or negative amount throws InvalidAmountException")
    void creditNonPositiveThrowsException() {
        Wallet wallet = new Wallet(userId, "INR");

        assertThatThrownBy(() -> wallet.credit(0L))
                .isInstanceOf(InvalidAmountException.class)
                .hasMessageContaining("strictly positive");

        assertThatThrownBy(() -> wallet.credit(-1000L))
                .isInstanceOf(InvalidAmountException.class)
                .hasMessageContaining("strictly positive");

        assertThat(wallet.getBalance()).isZero();
    }

    @Test
    @DisplayName("Credit on non-active wallet throws WalletInactiveException")
    void creditInactiveWalletThrowsException() {
        Wallet wallet = new Wallet(userId, "INR");
        wallet.setStatus(WalletStatus.FROZEN);

        assertThatThrownBy(() -> wallet.credit(1000L))
                .isInstanceOf(WalletInactiveException.class)
                .hasMessageContaining("FROZEN");

        wallet.setStatus(WalletStatus.CLOSED);
        assertThatThrownBy(() -> wallet.credit(1000L))
                .isInstanceOf(WalletInactiveException.class)
                .hasMessageContaining("CLOSED");
    }

    @Test
    @DisplayName("Debit decreases balance by specified amount")
    void debitDecreasesBalance() {
        Wallet wallet = new Wallet(userId, "INR", 10000L);
        wallet.debit(3000L);

        assertThat(wallet.getBalance()).isEqualTo(7000L);
    }

    @Test
    @DisplayName("Debit exact balance leaves balance at zero")
    void debitExactBalance() {
        Wallet wallet = new Wallet(userId, "INR", 5000L);
        wallet.debit(5000L);

        assertThat(wallet.getBalance()).isZero();
    }

    @Test
    @DisplayName("Debit exceeding balance throws InsufficientFundsException and preserves balance")
    void debitExceedingBalanceThrowsException() {
        Wallet wallet = new Wallet(userId, "INR", 5000L);

        assertThatThrownBy(() -> wallet.debit(5001L))
                .isInstanceOf(InsufficientFundsException.class)
                .hasMessageContaining("Insufficient funds");

        // Verify balance was untouched
        assertThat(wallet.getBalance()).isEqualTo(5000L);
    }

    @Test
    @DisplayName("Debit with zero or negative amount throws InvalidAmountException")
    void debitNonPositiveThrowsException() {
        Wallet wallet = new Wallet(userId, "INR", 5000L);

        assertThatThrownBy(() -> wallet.debit(0L))
                .isInstanceOf(InvalidAmountException.class)
                .hasMessageContaining("strictly positive");

        assertThatThrownBy(() -> wallet.debit(-500L))
                .isInstanceOf(InvalidAmountException.class)
                .hasMessageContaining("strictly positive");

        assertThat(wallet.getBalance()).isEqualTo(5000L);
    }

    @Test
    @DisplayName("Debit on inactive wallet throws WalletInactiveException")
    void debitInactiveWalletThrowsException() {
        Wallet wallet = new Wallet(userId, "INR", 5000L);
        wallet.setStatus(WalletStatus.FROZEN);

        assertThatThrownBy(() -> wallet.debit(1000L))
                .isInstanceOf(WalletInactiveException.class)
                .hasMessageContaining("FROZEN");
    }

    @Test
    @DisplayName("Credit arithmetic overflow throws InvalidAmountException")
    void creditOverflowThrowsException() {
        Wallet wallet = new Wallet(userId, "INR", Long.MAX_VALUE);

        assertThatThrownBy(() -> wallet.credit(1L))
                .isInstanceOf(InvalidAmountException.class)
                .hasMessageContaining("overflow");
    }
}
