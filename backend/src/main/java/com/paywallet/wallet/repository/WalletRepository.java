package com.paywallet.wallet.repository;

import com.paywallet.wallet.domain.Wallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WalletRepository extends JpaRepository<Wallet, UUID> {

    List<Wallet> findByUserId(UUID userId);

    Optional<Wallet> findByUserIdAndCurrency(UUID userId, String currency);

    boolean existsByUserIdAndCurrency(UUID userId, String currency);

    /**
     * Acquires an exclusive row-level write lock (SELECT ... FOR UPDATE) on a single wallet.
     * Blocks other concurrent transactions until this transaction commits or rolls back,
     * preventing lost updates on balance mutations.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM Wallet w WHERE w.id = :id")
    Optional<Wallet> findByIdForUpdate(@Param("id") UUID id);

    /**
     * Acquires exclusive row-level write locks on both wallets in a single query ordered by id.
     * Guarantees deterministic ascending lock acquisition order in SQL.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM Wallet w WHERE w.id IN (:id1, :id2) ORDER BY w.id ASC")
    List<Wallet> findBothByIdForUpdate(@Param("id1") UUID id1, @Param("id2") UUID id2);
}
