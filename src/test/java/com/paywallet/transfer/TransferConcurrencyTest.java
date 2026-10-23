package com.paywallet.transfer;

import com.paywallet.BaseIntegrationTest;
import com.paywallet.auth.domain.User;
import com.paywallet.auth.repository.UserRepository;
import com.paywallet.auth.security.UserPrincipal;
import com.paywallet.ledger.domain.LedgerEntry;
import com.paywallet.ledger.repository.LedgerEntryRepository;
import com.paywallet.transfer.dto.TransferRequest;
import com.paywallet.transfer.service.TransferService;
import com.paywallet.wallet.domain.Wallet;
import com.paywallet.wallet.domain.WalletStatus;
import com.paywallet.wallet.repository.WalletRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class TransferConcurrencyTest extends BaseIntegrationTest {

    private static final Logger log = LoggerFactory.getLogger(TransferConcurrencyTest.class);

    @Autowired
    private TransferService transferService;

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @Test
    @DisplayName("CONCURRENCY RACE CONDITION: 1,000 parallel transfers across 50 threads with plain @Transactional causes lost updates and balance divergence")
    void testParallelTransfersWithoutLocking_provesRaceConditionAndLostUpdates() throws InterruptedException {
        // 1. SETUP: Create 2 users and 2 wallets with substantial initial balances
        User userA = userRepository.save(new User("concur_alice", "alice@concur.com", "hash", "ROLE_USER"));
        User userB = userRepository.save(new User("concur_bob", "bob@concur.com", "hash", "ROLE_USER"));

        long initialBalanceA = 500_000L; // 5,000.00 INR (in minor units)
        long initialBalanceB = 500_000L; // 5,000.00 INR (in minor units)
        long totalMoneyBefore = initialBalanceA + initialBalanceB; // 1,000,000L (10,000.00 INR)

        Wallet walletA = new Wallet(userA.getId(), "INR", initialBalanceA);
        Wallet walletB = new Wallet(userB.getId(), "INR", initialBalanceB);
        walletA = walletRepository.save(walletA);
        walletB = walletRepository.save(walletB);

        UUID walletAId = walletA.getId();
        UUID walletBId = walletB.getId();

        UserPrincipal principalA = new UserPrincipal(userA.getId(), userA.getUsername(), userA.getEmail(), userA.getRole());
        UserPrincipal principalB = new UserPrincipal(userB.getId(), userB.getUsername(), userB.getEmail(), userB.getRole());

        int totalTransfers = 1000;
        int threadCount = 50;
        long transferAmount = 10L; // 10 paise per transfer

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(totalTransfers);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        ConcurrentLinkedQueue<String> errorSamples = new ConcurrentLinkedQueue<>();

        // 2. DISPATCH: Submit 1,000 parallel transfers from Wallet A to Wallet B
        // Each transfer debits 10 paise from A and credits 10 paise to B.
        // Expected outcome if concurrent execution were safe:
        //   - Wallet A final balance: 500,000 - (1,000 * 10) = 490,000 paise
        //   - Wallet B final balance: 500,000 + (1,000 * 10) = 510,000 paise
        //   - Total Money: 1,000,000 paise (Conservation of Money)
        // Reality without locking:
        //   - LOST UPDATES: Concurrent threads read stale balances, compute in Java, and overwrite each other's writes!
        for (int i = 0; i < totalTransfers; i++) {
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    // Block until the start gate opens so all 50 threads strike the DB at the exact same instant
                    startGate.await();

                    // Set security context for this worker thread (Alice is sender)
                    SecurityContext context = SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(new UsernamePasswordAuthenticationToken(
                            principalA, null, principalA.getAuthorities()
                    ));
                    SecurityContextHolder.setContext(context);

                    transferService.transfer(new TransferRequest(walletAId, walletBId, transferAmount, "Stress test transfer"));
                    successCount.incrementAndGet();
                } catch (Exception ex) {
                    failureCount.incrementAndGet();
                    if (errorSamples.size() < 10) {
                        errorSamples.add(ex.getClass().getSimpleName() + ": " + ex.getMessage());
                    }
                } finally {
                    SecurityContextHolder.clearContext();
                    doneLatch.countDown();
                }
            });
        }

        // Wait until all 50 threads are initialized and standing at the gate
        readyLatch.await(10, TimeUnit.SECONDS);

        long startTime = System.currentTimeMillis();
        // FIRE! Release all 50 threads simultaneously
        startGate.countDown();

        // Wait for all 1,000 tasks to finish
        boolean finished = doneLatch.await(60, TimeUnit.SECONDS);
        long durationMs = System.currentTimeMillis() - startTime;
        executor.shutdown();

        // 3. AUDIT & RECONCILIATION: Inspect wallet balances and ledger entries
        Wallet finalWalletA = walletRepository.findById(walletAId).orElseThrow();
        Wallet finalWalletB = walletRepository.findById(walletBId).orElseThrow();

        long totalMoneyAfter = finalWalletA.getBalance() + finalWalletB.getBalance();
        long balanceDiscrepancy = totalMoneyAfter - totalMoneyBefore;

        List<LedgerEntry> allLedgerEntries = ledgerEntryRepository.findAll();
        long totalLedgerDebits = allLedgerEntries.stream()
                .filter(e -> "D".equals(e.getDirection()))
                .mapToLong(LedgerEntry::getAmount)
                .sum();
        long totalLedgerCredits = allLedgerEntries.stream()
                .filter(e -> "C".equals(e.getDirection()))
                .mapToLong(LedgerEntry::getAmount)
                .sum();

        // 4. PRINT DIAGNOSTIC SCREENSHOT REPORT
        System.out.println("================================================================================");
        System.out.println("               CONCURRENCY STRESS TEST AUDIT REPORT (NO LOCKING)               ");
        System.out.println("================================================================================");
        System.out.printf("Execution Time         : %d ms across %d concurrent worker threads%n", durationMs, threadCount);
        System.out.printf("Total Requests Fired   : %d transfers%n", totalTransfers);
        System.out.printf("Successful Transfers   : %d%n", successCount.get());
        System.out.printf("Failed Transfers       : %d%n", failureCount.get());
        System.out.println("--------------------------------------------------------------------------------");
        System.out.printf("Initial Total Money    : %d minor units (Wallet A: %d, Wallet B: %d)%n",
                totalMoneyBefore, initialBalanceA, initialBalanceB);
        System.out.printf("Final Total Money      : %d minor units (Wallet A: %d, Wallet B: %d)%n",
                totalMoneyAfter, finalWalletA.getBalance(), finalWalletB.getBalance());
        System.out.printf("BALANCE DISCREPANCY    : %d minor units (INCONSISTENCY / LEAK)%n", balanceDiscrepancy);
        System.out.println("--------------------------------------------------------------------------------");
        System.out.printf("Total Ledger Debits    : %d minor units%n", totalLedgerDebits);
        System.out.printf("Total Ledger Credits   : %d minor units%n", totalLedgerCredits);
        System.out.printf("Ledger Balance Delta   : %d minor units (Credits - Debits)%n", totalLedgerCredits - totalLedgerDebits);
        System.out.println("--------------------------------------------------------------------------------");
        if (!errorSamples.isEmpty()) {
            System.out.println("Captured Concurrency Exceptions (Deadlocks / Conflicts):");
            errorSamples.forEach(err -> System.out.println("  -> " + err));
            System.out.println("--------------------------------------------------------------------------------");
        }
        System.out.println("ROOT CAUSE ANALYSIS:");
        System.out.println("  1. LOST UPDATE: Concurrent transactions read identical wallet balances via plain");
        System.out.println("     SELECT, calculate 'balance - amount' in Java memory, and issue uncoordinated");
        System.out.println("     UPDATEs that blindly overwrite each other's debits/credits.");
        System.out.println("  2. DEADLOCKS: Opposite transfer pairs (A->B and B->A) acquire row locks in opposite");
        System.out.println("     order at the DB engine level, triggering PostgreSQL deadlock detection.");
        System.out.println("================================================================================");

        // 5. INVARIANT ASSERTIONS (EXPECTED TO FAIL PROVING THE LOST UPDATE RACE CONDITION!)
        // Invariant 1: Double-entry check (Ledger debits == credits)
        assertThat(totalLedgerDebits)
                .as("Double-entry bookkeeping check: Total ledger debits must equal total credits")
                .isEqualTo(totalLedgerCredits);

        // Invariant 2: Conservation of Money (Total balance before == after)
        assertThat(totalMoneyAfter)
                .as("Conservation of Money Invariant: Total wallet balance before (%d) must equal total after (%d)",
                        totalMoneyBefore, totalMoneyAfter)
                .isEqualTo(totalMoneyBefore);

        // Invariant 3: Lost Update Detection (Wallet A must equal initialBalanceA - 1000 * 10)
        long expectedBalanceA = initialBalanceA - (totalTransfers * transferAmount);
        assertThat(finalWalletA.getBalance())
                .as("Lost Update Detection: Wallet A balance should be %d, but lost updates caused it to be %d",
                        expectedBalanceA, finalWalletA.getBalance())
                .isEqualTo(expectedBalanceA);

        // Invariant 4: Lost Update Detection (Wallet B must equal initialBalanceB + 1000 * 10)
        long expectedBalanceB = initialBalanceB + (totalTransfers * transferAmount);
        assertThat(finalWalletB.getBalance())
                .as("Lost Update Detection: Wallet B balance should be %d, but lost updates caused it to be %d",
                        expectedBalanceB, finalWalletB.getBalance())
                .isEqualTo(expectedBalanceB);
    }
}
