package com.paywallet.recon.repository;

import com.paywallet.recon.domain.WalletLedgerAuditView;
import com.paywallet.wallet.domain.Wallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReconAuditRepository extends JpaRepository<Wallet, UUID> {

    @Query(value = """
        SELECT 
            w.id AS walletId,
            w.currency AS currency,
            w.balance AS walletBalance,
            COALESCE(SUM(CASE WHEN le.direction = 'C' THEN le.amount WHEN le.direction = 'D' THEN -le.amount ELSE 0 END), 0) AS ledgerBalance
        FROM wallets w
        LEFT JOIN ledger_entries le ON w.id = le.wallet_id
        GROUP BY w.id, w.currency, w.balance
        ORDER BY w.id ASC
        """, nativeQuery = true)
    List<WalletLedgerAuditView> auditAllWallets();

    @Query(value = "SELECT COALESCE(SUM(balance), 0) FROM wallets", nativeQuery = true)
    long sumAllWalletBalances();

    @Query(value = "SELECT COALESCE(SUM(amount), 0) FROM ledger_entries WHERE direction = 'C'", nativeQuery = true)
    long sumAllLedgerCredits();

    @Query(value = "SELECT COALESCE(SUM(amount), 0) FROM ledger_entries WHERE direction = 'D'", nativeQuery = true)
    long sumAllLedgerDebits();
}
