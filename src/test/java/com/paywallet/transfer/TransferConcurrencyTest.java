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
import com.paywallet.wallet.repository.WalletRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

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
    @DisplayName("PESSIMISTIC LOCKING VERIFICATION: 1,000 parallel transfers across 50 threads pass with ZERO lost updates and exact balance conservation")
    void testParallelTransfersWithPessimisticLocking_passesWithZeroLostUpdates() throws InterruptedException {
        // 1. SETUP: Create 2 users and 2 wallets with 5,000.00 INR (500,000 minor units) each
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User userA = userRepository.save(new User("pess_alice_" + suffix, "alice_" + suffix + "@wallet.com", "hash", "ROLE_USER"));
        User userB = userRepository.save(new User("pess_bob_" + suffix, "bob_" + suffix + "@wallet.com", "hash", "ROLE_USER"));

        long initialBalanceA = 500_000L;
        long initialBalanceB = 500_000L;
        long totalMoneyBefore = initialBalanceA + initialBalanceB; // 1,000,000 paise

        Wallet walletA = walletRepository.save(new Wallet(userA.getId(), "INR", initialBalanceA));
        Wallet walletB = walletRepository.save(new Wallet(userB.getId(), "INR", initialBalanceB));

        UUID walletAId = walletA.getId();
        UUID walletBId = walletB.getId();

        UserPrincipal principalA = new UserPrincipal(userA.getId(), userA.getUsername(), userA.getEmail(), userA.getRole());

        int totalTransfers = 1000;
        int threadCount = 50;
        long transferAmount = 10L; // 10 paise per transfer

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(totalTransfers);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        ConcurrentLinkedQueue<String> errors = new ConcurrentLinkedQueue<>();

        // 2. DISPATCH: Submit 1,000 parallel transfers from Wallet A to Wallet B
        for (int i = 0; i < totalTransfers; i++) {
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startGate.await(); // Synchronized release across all 50 worker threads

                    SecurityContext context = SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(new UsernamePasswordAuthenticationToken(
                            principalA, null, principalA.getAuthorities()
                    ));
                    SecurityContextHolder.setContext(context);

                    transferService.transfer(new TransferRequest(walletAId, walletBId, transferAmount, "Pessimistic stress test"));
                    successCount.incrementAndGet();
                } catch (Exception ex) {
                    failureCount.incrementAndGet();
                    if (errors.size() < 10) {
                        errors.add(ex.getClass().getSimpleName() + ": " + ex.getMessage());
                    }
                } finally {
                    SecurityContextHolder.clearContext();
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(10, TimeUnit.SECONDS);

        long startTime = System.currentTimeMillis();
        startGate.countDown(); // FIRE!
        boolean finished = doneLatch.await(60, TimeUnit.SECONDS);
        long durationMs = System.currentTimeMillis() - startTime;
        executor.shutdown();

        assertThat(finished).as("All 1,000 tasks must finish within the 60s timeout").isTrue();

        // 3. AUDIT & RECONCILIATION
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

        System.out.println("================================================================================");
        System.out.println("            CONCURRENCY TEST 1: PESSIMISTIC LOCKING VERIFICATION               ");
        System.out.println("================================================================================");
        System.out.printf("Execution Time         : %d ms across %d concurrent worker threads%n", durationMs, threadCount);
        System.out.printf("Total Transfers Fired  : %d%n", totalTransfers);
        System.out.printf("Successful Transfers   : %d / %d%n", successCount.get(), totalTransfers);
        System.out.printf("Failed Transfers       : %d%n", failureCount.get());
        System.out.println("--------------------------------------------------------------------------------");
        System.out.printf("Wallet A Balance       : %d (Expected: %d)%n",
                finalWalletA.getBalance(), initialBalanceA - (totalTransfers * transferAmount));
        System.out.printf("Wallet B Balance       : %d (Expected: %d)%n",
                finalWalletB.getBalance(), initialBalanceB + (totalTransfers * transferAmount));
        System.out.printf("Total Money Before     : %d minor units%n", totalMoneyBefore);
        System.out.printf("Total Money After      : %d minor units%n", totalMoneyAfter);
        System.out.printf("Balance Discrepancy    : %d minor units (PERFECT CONSERVATION)%n", balanceDiscrepancy);
        System.out.println("================================================================================");

        // Invariant 1: 100% throughput - zero failures
        assertThat(failureCount.get()).as("Zero failures expected under pessimistic locking").isZero();
        assertThat(successCount.get()).as("All 1,000 transfers must succeed").isEqualTo(totalTransfers);

        // Invariant 2: Conservation of money (Total money before == after)
        assertThat(totalMoneyAfter)
                .as("Total money in system must remain strictly invariant")
                .isEqualTo(totalMoneyBefore);

        // Invariant 3: Zero lost updates on Wallet A
        long expectedBalanceA = initialBalanceA - (totalTransfers * transferAmount);
        assertThat(finalWalletA.getBalance())
                .as("Wallet A balance must equal exactly 500,000 - (1000 * 10)")
                .isEqualTo(expectedBalanceA);

        // Invariant 4: Zero lost updates on Wallet B
        long expectedBalanceB = initialBalanceB + (totalTransfers * transferAmount);
        assertThat(finalWalletB.getBalance())
                .as("Wallet B balance must equal exactly 500,000 + (1000 * 10)")
                .isEqualTo(expectedBalanceB);

        // Invariant 5: Ledger debits == ledger credits
        assertThat(totalLedgerDebits).isEqualTo(totalLedgerCredits);
    }

    @Test
    @DisplayName("DEADLOCK PREVENTION: Simultaneous bidirectional transfers (500 A->B and 500 B->A) across 50 threads MUST NOT DEADLOCK")
    void testBidirectionalTransfers_withOrderedLocks_doesNotDeadlock() throws InterruptedException {
        // 1. SETUP: Create 2 users and 2 wallets
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User userA = userRepository.save(new User("deadlock_alice_" + suffix, "alice_" + suffix + "@wallet.com", "hash", "ROLE_USER"));
        User userB = userRepository.save(new User("deadlock_bob_" + suffix, "bob_" + suffix + "@wallet.com", "hash", "ROLE_USER"));

        long initialBalanceA = 500_000L;
        long initialBalanceB = 500_000L;
        long totalMoneyBefore = initialBalanceA + initialBalanceB;

        Wallet walletA = walletRepository.save(new Wallet(userA.getId(), "INR", initialBalanceA));
        Wallet walletB = walletRepository.save(new Wallet(userB.getId(), "INR", initialBalanceB));

        UUID walletAId = walletA.getId();
        UUID walletBId = walletB.getId();

        UserPrincipal principalA = new UserPrincipal(userA.getId(), userA.getUsername(), userA.getEmail(), userA.getRole());
        UserPrincipal principalB = new UserPrincipal(userB.getId(), userB.getUsername(), userB.getEmail(), userB.getRole());

        int totalTransfers = 1000;
        int threadCount = 50;
        long transferAmount = 15L; // 15 paise per transfer

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(totalTransfers);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        ConcurrentLinkedQueue<String> deadlockErrors = new ConcurrentLinkedQueue<>();

        // 2. DISPATCH: 500 transfers A -> B, and 500 transfers B -> A interweaved simultaneously
        for (int i = 0; i < totalTransfers; i++) {
            final boolean aToB = (i % 2 == 0);
            final UUID fromId = aToB ? walletAId : walletBId;
            final UUID toId = aToB ? walletBId : walletAId;
            final UserPrincipal activePrincipal = aToB ? principalA : principalB;

            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startGate.await();

                    SecurityContext context = SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(new UsernamePasswordAuthenticationToken(
                            activePrincipal, null, activePrincipal.getAuthorities()
                    ));
                    SecurityContextHolder.setContext(context);

                    transferService.transfer(new TransferRequest(fromId, toId, transferAmount, "Bidirectional deadlock test"));
                    successCount.incrementAndGet();
                } catch (Exception ex) {
                    failureCount.incrementAndGet();
                    deadlockErrors.add(ex.getClass().getSimpleName() + ": " + ex.getMessage());
                } finally {
                    SecurityContextHolder.clearContext();
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(10, TimeUnit.SECONDS);

        long startTime = System.currentTimeMillis();
        startGate.countDown(); // FIRE!
        boolean finished = doneLatch.await(60, TimeUnit.SECONDS);
        long durationMs = System.currentTimeMillis() - startTime;
        executor.shutdown();

        assertThat(finished).as("All 1,000 bidirectional tasks must finish within timeout").isTrue();

        // 3. AUDIT & RECONCILIATION
        Wallet finalWalletA = walletRepository.findById(walletAId).orElseThrow();
        Wallet finalWalletB = walletRepository.findById(walletBId).orElseThrow();
        long totalMoneyAfter = finalWalletA.getBalance() + finalWalletB.getBalance();

        System.out.println("================================================================================");
        System.out.println("             CONCURRENCY TEST 2: DEADLOCK PREVENTION AUDIT REPORT              ");
        System.out.println("================================================================================");
        System.out.printf("Execution Time         : %d ms across %d concurrent worker threads%n", durationMs, threadCount);
        System.out.printf("Bidirectional Traffic  : 500 (A->B) + 500 (B->A) simultaneously%n");
        System.out.printf("Successful Transfers   : %d / %d%n", successCount.get(), totalTransfers);
        System.out.printf("Failed / Deadlocked    : %d%n", failureCount.get());
        System.out.printf("Deadlock Errors Caught : %d%n", deadlockErrors.size());
        System.out.println("--------------------------------------------------------------------------------");
        System.out.printf("Wallet A Balance       : %d (Expected: %d)%n", finalWalletA.getBalance(), initialBalanceA);
        System.out.printf("Wallet B Balance       : %d (Expected: %d)%n", finalWalletB.getBalance(), initialBalanceB);
        System.out.printf("Total Money Parity     : %d == %d (Zero Divergence)%n", totalMoneyBefore, totalMoneyAfter);
        System.out.println("================================================================================");

        // Invariant 1: Zero deadlocks!
        assertThat(deadlockErrors).as("Zero deadlock errors must occur with ordered locking").isEmpty();
        assertThat(failureCount.get()).as("Zero failed transfers expected").isZero();
        assertThat(successCount.get()).as("All 1,000 bidirectional transfers must succeed").isEqualTo(totalTransfers);

        // Invariant 2: Perfect conservation of money
        assertThat(totalMoneyAfter).isEqualTo(totalMoneyBefore);

        // Invariant 3: Symmetrical transfers (500 in, 500 out) mean balances remain exactly equal to initial
        assertThat(finalWalletA.getBalance()).isEqualTo(initialBalanceA);
        assertThat(finalWalletB.getBalance()).isEqualTo(initialBalanceB);
    }
}
