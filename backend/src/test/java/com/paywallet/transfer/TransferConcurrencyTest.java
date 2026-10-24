package com.paywallet.transfer;

import com.paywallet.BaseIntegrationTest;
import com.paywallet.auth.domain.User;
import com.paywallet.auth.repository.UserRepository;
import com.paywallet.auth.security.UserPrincipal;
import com.paywallet.ledger.domain.LedgerEntry;
import com.paywallet.ledger.repository.LedgerEntryRepository;
import com.paywallet.transfer.dto.TransferRequest;
import com.paywallet.transfer.metrics.TransferMetrics;
import com.paywallet.transfer.strategy.OptimisticLockingStrategy;
import com.paywallet.transfer.strategy.PessimisticLockingStrategy;
import com.paywallet.wallet.domain.Wallet;
import com.paywallet.wallet.repository.WalletRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class TransferConcurrencyTest extends BaseIntegrationTest {

    private static final Logger log = LoggerFactory.getLogger(TransferConcurrencyTest.class);

    @Autowired
    private PessimisticLockingStrategy pessimisticLockingStrategy;

    @Autowired
    private OptimisticLockingStrategy optimisticLockingStrategy;

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @Autowired
    private TransferMetrics transferMetrics;

    @Test
    @DisplayName("PESSIMISTIC STRATEGY: 1,000 parallel transfers across 50 threads pass with ZERO lost updates and exact balance conservation")
    void testPessimisticStrategy_1000Transfers_zeroLostUpdates() throws InterruptedException {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User userA = userRepository.save(new User("pess_uA_" + suffix, "alice_" + suffix + "@pess.com", "hash", "ROLE_USER"));
        User userB = userRepository.save(new User("pess_uB_" + suffix, "bob_" + suffix + "@pess.com", "hash", "ROLE_USER"));

        long initialBalanceA = 500_000L;
        long initialBalanceB = 500_000L;
        long totalMoneyBefore = initialBalanceA + initialBalanceB;

        Wallet walletA = walletRepository.save(new Wallet(userA.getId(), "INR", initialBalanceA));
        Wallet walletB = walletRepository.save(new Wallet(userB.getId(), "INR", initialBalanceB));

        int totalTransfers = 1000;
        int threadCount = 50;
        long transferAmount = 10L;

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(totalTransfers);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < totalTransfers; i++) {
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startGate.await();
                    pessimisticLockingStrategy.transfer(
                            new TransferRequest(walletA.getId(), walletB.getId(), transferAmount, "Pessimistic batch"),
                            userA.getId()
                    );
                    successCount.incrementAndGet();
                } catch (Exception ex) {
                    failureCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(10, TimeUnit.SECONDS);
        long startTime = System.currentTimeMillis();
        startGate.countDown();
        boolean finished = doneLatch.await(60, TimeUnit.SECONDS);
        long durationMs = System.currentTimeMillis() - startTime;
        executor.shutdown();
        executor.awaitTermination(10, TimeUnit.SECONDS);

        assertThat(finished).isTrue();

        Wallet finalWalletA = walletRepository.findById(walletA.getId()).orElseThrow();
        Wallet finalWalletB = walletRepository.findById(walletB.getId()).orElseThrow();
        long totalMoneyAfter = finalWalletA.getBalance() + finalWalletB.getBalance();

        System.out.println("================================================================================");
        System.out.println("            STRATEGY 1: PESSIMISTIC LOCKING BENCHMARK REPORT                    ");
        System.out.println("================================================================================");
        System.out.printf("Execution Time         : %d ms across %d concurrent worker threads%n", durationMs, threadCount);
        System.out.printf("Transfers Succeeded    : %d / %d%n", successCount.get(), totalTransfers);
        System.out.printf("Transfers Failed       : %d%n", failureCount.get());
        System.out.printf("Wallet A Balance       : %d (Expected: %d)%n", finalWalletA.getBalance(), initialBalanceA - 10000L);
        System.out.printf("Wallet B Balance       : %d (Expected: %d)%n", finalWalletB.getBalance(), initialBalanceB + 10000L);
        System.out.printf("Total Money Parity     : %d == %d%n", totalMoneyBefore, totalMoneyAfter);
        System.out.printf("Micrometer Retries     : %.0f retries recorded (expected 0 for pessimistic)%n",
                transferMetrics.getRetryCount("pessimistic"));
        System.out.println("================================================================================");

        assertThat(successCount.get()).isEqualTo(totalTransfers);
        assertThat(failureCount.get()).isZero();
        assertThat(totalMoneyAfter).isEqualTo(totalMoneyBefore);
        assertThat(finalWalletA.getBalance()).isEqualTo(initialBalanceA - 10000L);
        assertThat(finalWalletB.getBalance()).isEqualTo(initialBalanceB + 10000L);
        assertThat(transferMetrics.getRetryCount("pessimistic")).isZero();
    }

    @Test
    @DisplayName("PESSIMISTIC STRATEGY: Simultaneous bidirectional transfers (500 A->B and 500 B->A) MUST NOT DEADLOCK")
    void testPessimisticStrategy_bidirectionalTransfers_zeroDeadlocks() throws InterruptedException {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User userA = userRepository.save(new User("bidi_uA_" + suffix, "alice_" + suffix + "@bidi.com", "hash", "ROLE_USER"));
        User userB = userRepository.save(new User("bidi_uB_" + suffix, "bob_" + suffix + "@bidi.com", "hash", "ROLE_USER"));

        long initialBalance = 500_000L;
        Wallet walletA = walletRepository.save(new Wallet(userA.getId(), "INR", initialBalance));
        Wallet walletB = walletRepository.save(new Wallet(userB.getId(), "INR", initialBalance));

        int totalTransfers = 1000;
        int threadCount = 50;
        long transferAmount = 15L;

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(totalTransfers);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < totalTransfers; i++) {
            final boolean aToB = (i % 2 == 0);
            final UUID fromId = aToB ? walletA.getId() : walletB.getId();
            final UUID toId = aToB ? walletB.getId() : walletA.getId();
            final UUID callerId = aToB ? userA.getId() : userB.getId();

            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startGate.await();
                    pessimisticLockingStrategy.transfer(
                            new TransferRequest(fromId, toId, transferAmount, "Bidirectional transfer"),
                            callerId
                    );
                    successCount.incrementAndGet();
                } catch (Exception ex) {
                    failureCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(10, TimeUnit.SECONDS);
        long startTime = System.currentTimeMillis();
        startGate.countDown();
        boolean finished = doneLatch.await(60, TimeUnit.SECONDS);
        long durationMs = System.currentTimeMillis() - startTime;
        executor.shutdown();
        executor.awaitTermination(10, TimeUnit.SECONDS);

        assertThat(finished).isTrue();

        Wallet finalWalletA = walletRepository.findById(walletA.getId()).orElseThrow();
        Wallet finalWalletB = walletRepository.findById(walletB.getId()).orElseThrow();

        System.out.println("================================================================================");
        System.out.println("            PESSIMISTIC BIDIRECTIONAL DEADLOCK-PREVENTION REPORT                ");
        System.out.println("================================================================================");
        System.out.printf("Execution Time         : %d ms across %d concurrent worker threads%n", durationMs, threadCount);
        System.out.printf("Bidirectional Traffic  : 500 A->B + 500 B->A simultaneously%n");
        System.out.printf("Transfers Succeeded    : %d / %d%n", successCount.get(), totalTransfers);
        System.out.printf("Deadlocks / Failures   : %d%n", failureCount.get());
        System.out.printf("Wallet A Balance       : %d (Expected: %d)%n", finalWalletA.getBalance(), initialBalance);
        System.out.printf("Wallet B Balance       : %d (Expected: %d)%n", finalWalletB.getBalance(), initialBalance);
        System.out.println("================================================================================");

        assertThat(failureCount.get()).isZero();
        assertThat(successCount.get()).isEqualTo(totalTransfers);
        assertThat(finalWalletA.getBalance()).isEqualTo(initialBalance);
        assertThat(finalWalletB.getBalance()).isEqualTo(initialBalance);
    }

    @Test
    @DisplayName("OPTIMISTIC STRATEGY: 200 parallel transfers across 20 threads with retries, exponential backoff, and jitter - MUST PASS")
    void testOptimisticStrategy_withRetriesAndBackoff() throws InterruptedException {
        // Create 10 users and 10 wallets to form a small wallet pool
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        List<User> users = new ArrayList<>();
        List<Wallet> wallets = new ArrayList<>();
        long initialPerWallet = 500_000L;
        int walletCount = 10;

        for (int i = 0; i < walletCount; i++) {
            User u = userRepository.save(new User("opt_u" + i + "_" + suffix, "user" + i + "_" + suffix + "@opt.com", "hash", "ROLE_USER"));
            Wallet w = walletRepository.save(new Wallet(u.getId(), "INR", initialPerWallet));
            users.add(u);
            wallets.add(w);
        }

        long totalMoneyBefore = initialPerWallet * walletCount; // 5,000,000 minor units
        int totalTransfers = 200;
        int threadCount = 20;
        long transferAmount = 10L;

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(totalTransfers);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < totalTransfers; i++) {
            final int fromIndex = i % walletCount;
            final int toIndex = (fromIndex + 1 + (i % (walletCount - 1))) % walletCount; // Distinct destination wallet

            final UUID fromWalletId = wallets.get(fromIndex).getId();
            final UUID toWalletId = wallets.get(toIndex).getId();
            final UUID callerUserId = users.get(fromIndex).getId();

            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startGate.await();
                    optimisticLockingStrategy.transfer(
                            new TransferRequest(fromWalletId, toWalletId, transferAmount, "Optimistic transfer with retry"),
                            callerUserId
                    );
                    successCount.incrementAndGet();
                } catch (Exception ex) {
                    failureCount.incrementAndGet();
                    log.error("Optimistic transfer failed after retries: {}", ex.getMessage());
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(10, TimeUnit.SECONDS);
        long startTime = System.currentTimeMillis();
        startGate.countDown();
        boolean finished = doneLatch.await(60, TimeUnit.SECONDS);
        long durationMs = System.currentTimeMillis() - startTime;
        executor.shutdown();
        executor.awaitTermination(10, TimeUnit.SECONDS);

        assertThat(finished).as("All 200 optimistic tasks must finish within the 60s timeout").isTrue();

        long totalMoneyAfter = 0L;
        for (Wallet w : wallets) {
            Wallet refreshed = walletRepository.findById(w.getId()).orElseThrow();
            totalMoneyAfter += refreshed.getBalance();
        }

        double retriesCount = transferMetrics.getRetryCount("optimistic");
        double successMetric = transferMetrics.getSuccessCount("optimistic");

        System.out.println("================================================================================");
        System.out.println("             STRATEGY 2: OPTIMISTIC LOCKING BENCHMARK REPORT                    ");
        System.out.println("================================================================================");
        System.out.printf("Execution Time         : %d ms across %d concurrent worker threads%n", durationMs, threadCount);
        System.out.printf("Transfers Succeeded    : %d / %d%n", successCount.get(), totalTransfers);
        System.out.printf("Transfers Failed       : %d%n", failureCount.get());
        System.out.printf("Total Money Parity     : %d == %d%n", totalMoneyBefore, totalMoneyAfter);
        System.out.printf("Balance Discrepancy    : %d minor units (PERFECT CONSERVATION)%n", totalMoneyAfter - totalMoneyBefore);
        System.out.println("--------------------------------------------------------------------------------");
        System.out.printf("Micrometer transfer_lock_retries_total : %.0f retries handled automatically%n", retriesCount);
        System.out.printf("Micrometer transfer_success_total      : %.0f successful transfers%n", successMetric);
        System.out.println("================================================================================");

        assertThat(successCount.get()).isEqualTo(totalTransfers);
        assertThat(failureCount.get()).isZero();
        assertThat(totalMoneyAfter).isEqualTo(totalMoneyBefore);

        // Verify that retries actually occurred and were recorded by Micrometer!
        assertThat(retriesCount)
                .as("Under 50 concurrent threads, optimistic locking collisions must trigger and record retries")
                .isGreaterThan(0.0);
    }
}
