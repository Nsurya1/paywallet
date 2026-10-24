package com.paywallet;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FlywaySchemaMigrationIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("Flyway applies V1 migration successfully and registers in flyway_schema_history")
    void flywayMigrationAppliedSuccessfully() {
        Integer migrationCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE script = 'V1__init.sql' AND success = TRUE",
                Integer.class
        );
        assertThat(migrationCount).isEqualTo(1);
    }

    @Test
    @DisplayName("All required core tables exist in PostgreSQL schema")
    void allTablesExist() {
        List<String> tables = jdbcTemplate.query(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
                (rs, rowNum) -> rs.getString("table_name")
        );

        assertThat(tables).contains(
                "users",
                "wallets",
                "transactions",
                "ledger_entries",
                "idempotency_keys",
                "outbox_events"
        );
    }

    @Test
    @DisplayName("Constraint Check: wallets balance cannot be negative (balance >= 0)")
    void walletBalanceNegativeConstraint() {
        UUID userId = insertTestUser("alice_neg", "alice_neg@paywallet.com");

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO wallets (user_id, currency, balance, status) VALUES (?, 'INR', -500, 'ACTIVE')",
                userId
        )).isInstanceOf(DataIntegrityViolationException.class)
          .hasMessageContaining("chk_wallets_balance_non_negative");
    }

    @Test
    @DisplayName("Constraint Check: transactions amount must be strictly positive (amount > 0)")
    void transactionAmountPositiveConstraint() {
        UUID userId = insertTestUser("bob_txn", "bob_txn@paywallet.com");
        UUID walletId = insertTestWallet(userId, "INR", 10000L);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO transactions (reference_id, from_wallet_id, amount, currency, type, status) " +
                "VALUES ('REF-ZERO', ?, 0, 'INR', 'TRANSFER', 'PENDING')",
                walletId
        )).isInstanceOf(DataIntegrityViolationException.class)
          .hasMessageContaining("chk_transactions_amount_positive");
    }

    @Test
    @DisplayName("Constraint Check: transactions cannot transfer money to the same wallet (from <> to)")
    void transactionSameWalletConstraint() {
        UUID userId = insertTestUser("carol_self", "carol_self@paywallet.com");
        UUID walletId = insertTestWallet(userId, "INR", 5000L);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO transactions (reference_id, from_wallet_id, to_wallet_id, amount, currency, type, status) " +
                "VALUES ('REF-SELF', ?, ?, 1000, 'INR', 'TRANSFER', 'PENDING')",
                walletId, walletId
        )).isInstanceOf(DataIntegrityViolationException.class)
          .hasMessageContaining("chk_transactions_wallets_distinct");
    }

    @Test
    @DisplayName("Constraint Check: ledger_entries direction must strictly be 'D' or 'C'")
    void ledgerEntryDirectionConstraint() {
        UUID userId = insertTestUser("dave_ledger", "dave_ledger@paywallet.com");
        UUID walletId = insertTestWallet(userId, "INR", 20000L);
        UUID txnId = insertTestTransaction(walletId, null, 5000L, "DEPOSIT");

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO ledger_entries (transaction_id, wallet_id, direction, amount, balance_after) " +
                "VALUES (?, ?, 'X', 5000, 25000)",
                txnId, walletId
        )).isInstanceOf(DataIntegrityViolationException.class)
          .hasMessageContaining("chk_ledger_direction");
    }

    @Test
    @DisplayName("Constraint Check: idempotency_keys composite PK prevents duplicate user_id + idem_key")
    void idempotencyKeysCompositePkConstraint() {
        UUID userId = insertTestUser("eve_idem", "eve_idem@paywallet.com");
        String idemKey = "IDEM-" + UUID.randomUUID();
        Timestamp expiresAt = Timestamp.from(Instant.now().plus(24, ChronoUnit.HOURS));

        jdbcTemplate.update(
                "INSERT INTO idempotency_keys (user_id, idem_key, request_hash, status, expires_at) " +
                "VALUES (?, ?, 'hash123', 'PROCESSING', ?)",
                userId, idemKey, expiresAt
        );

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO idempotency_keys (user_id, idem_key, request_hash, status, expires_at) " +
                "VALUES (?, ?, 'hash456', 'PROCESSING', ?)",
                userId, idemKey, expiresAt
        )).isInstanceOf(DataIntegrityViolationException.class);
    }

    // Helper methods
    private UUID insertTestUser(String username, String email) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, 'hashed_pass') RETURNING id",
                UUID.class,
                username, email
        );
    }

    private UUID insertTestWallet(UUID userId, String currency, Long balance) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO wallets (user_id, currency, balance, status) VALUES (?, ?, ?, 'ACTIVE') RETURNING id",
                UUID.class,
                userId, currency, balance
        );
    }

    private UUID insertTestTransaction(UUID fromWalletId, UUID toWalletId, Long amount, String type) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO transactions (reference_id, from_wallet_id, to_wallet_id, amount, currency, type, status) " +
                "VALUES (?, ?, ?, ?, 'INR', ?, 'PENDING') RETURNING id",
                UUID.class,
                "REF-" + UUID.randomUUID(), fromWalletId, toWalletId, amount, type
        );
    }
}
