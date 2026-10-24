package com.paywallet.recon.service;

import com.paywallet.common.exception.ResourceNotFoundException;
import com.paywallet.recon.domain.ReconDiscrepancy;
import com.paywallet.recon.domain.ReconReport;
import com.paywallet.recon.domain.ReconStatus;
import com.paywallet.recon.domain.WalletLedgerAuditView;
import com.paywallet.recon.dto.ReconDiscrepancyResponse;
import com.paywallet.recon.dto.ReconReportResponse;
import com.paywallet.recon.repository.ReconAuditRepository;
import com.paywallet.recon.repository.ReconDiscrepancyRepository;
import com.paywallet.recon.repository.ReconReportRepository;
import com.paywallet.wallet.domain.Wallet;
import com.paywallet.wallet.domain.WalletStatus;
import com.paywallet.wallet.repository.WalletRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
public class ReconciliationServiceImpl implements ReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(ReconciliationServiceImpl.class);

    private final ReconReportRepository reportRepository;
    private final ReconDiscrepancyRepository discrepancyRepository;
    private final ReconAuditRepository auditRepository;
    private final WalletRepository walletRepository;
    private final boolean autoFreezeOnDiscrepancy;

    private final Timer reconTimer;
    private final Counter auditedWalletsCounter;
    private final Counter discrepanciesCounter;

    public ReconciliationServiceImpl(
            ReconReportRepository reportRepository,
            ReconDiscrepancyRepository discrepancyRepository,
            ReconAuditRepository auditRepository,
            WalletRepository walletRepository,
            MeterRegistry meterRegistry,
            @Value("${paywallet.recon.auto-freeze-on-discrepancy:false}") boolean autoFreezeOnDiscrepancy
    ) {
        this.reportRepository = reportRepository;
        this.discrepancyRepository = discrepancyRepository;
        this.auditRepository = auditRepository;
        this.walletRepository = walletRepository;
        this.autoFreezeOnDiscrepancy = autoFreezeOnDiscrepancy;

        this.reconTimer = Timer.builder("recon_duration_seconds")
                .description("Time taken to execute EOD reconciliation")
                .register(meterRegistry);
        this.auditedWalletsCounter = Counter.builder("recon_wallets_audited_total")
                .description("Total number of wallets audited by reconciliation")
                .register(meterRegistry);
        this.discrepanciesCounter = Counter.builder("recon_discrepancies_total")
                .description("Total number of balance discrepancies detected")
                .register(meterRegistry);
    }

    @Override
    @Transactional
    public ReconReportResponse runReconciliation() {
        return reconTimer.record(() -> {
            String datePrefix = LocalDate.now(ZoneOffset.UTC).toString();
            String runId = "RECON-" + datePrefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            log.info("Starting reconciliation run: {}", runId);

            ReconReport report = new ReconReport(runId);
            report = reportRepository.save(report);

            try {
                List<WalletLedgerAuditView> auditViews = auditRepository.auditAllWallets();
                int totalAudited = auditViews.size();
                int matchedCount = 0;
                int discrepancyCount = 0;

                for (WalletLedgerAuditView audit : auditViews) {
                    long walletBalance = audit.getWalletBalance();
                    long ledgerBalance = audit.getLedgerBalance();
                    long diff = walletBalance - ledgerBalance;

                    if (diff == 0) {
                        matchedCount++;
                    } else {
                        discrepancyCount++;
                        log.error("RECON DISCREPANCY DETECTED for walletId={}: walletBalance={} ledgerBalance={} difference={}",
                                audit.getWalletId(), walletBalance, ledgerBalance, diff);

                        ReconDiscrepancy discrepancy = new ReconDiscrepancy(
                                audit.getWalletId(),
                                audit.getCurrency(),
                                walletBalance,
                                ledgerBalance,
                                diff
                        );
                        report.addDiscrepancy(discrepancy);

                        if (autoFreezeOnDiscrepancy) {
                            walletRepository.findById(audit.getWalletId()).ifPresent(w -> {
                                w.setStatus(WalletStatus.FROZEN);
                                walletRepository.save(w);
                                log.warn("Wallet {} has been FROZEN due to reconciliation balance mismatch", w.getId());
                            });
                        }
                    }
                }

                long totalSystemBalance = auditRepository.sumAllWalletBalances();
                long totalLedgerCredits = auditRepository.sumAllLedgerCredits();
                long totalLedgerDebits = auditRepository.sumAllLedgerDebits();

                report.setTotalWalletsAudited(totalAudited);
                report.setMatchedWallets(matchedCount);
                report.setDiscrepancyCount(discrepancyCount);
                report.setTotalSystemBalance(totalSystemBalance);
                report.setTotalLedgerCredits(totalLedgerCredits);
                report.setTotalLedgerDebits(totalLedgerDebits);
                report.setCompletedAt(Instant.now());

                if (discrepancyCount > 0) {
                    report.setStatus(ReconStatus.COMPLETED_WITH_DISCREPANCIES);
                    log.warn("Reconciliation {} completed WITH DISCREPANCIES. Audited={}, Matched={}, Discrepancies={}",
                            runId, totalAudited, matchedCount, discrepancyCount);
                } else {
                    report.setStatus(ReconStatus.COMPLETED);
                    log.info("Reconciliation {} completed successfully. All {} wallets matched.", runId, totalAudited);
                }

                auditedWalletsCounter.increment(totalAudited);
                discrepanciesCounter.increment(discrepancyCount);

                ReconReport saved = reportRepository.save(report);
                return ReconReportResponse.from(saved);

            } catch (Exception ex) {
                log.error("Reconciliation run {} failed: {}", runId, ex.getMessage(), ex);
                report.setStatus(ReconStatus.FAILED);
                report.setErrorMessage(ex.getMessage());
                report.setCompletedAt(Instant.now());
                reportRepository.save(report);
                throw new IllegalStateException("Reconciliation failed: " + ex.getMessage(), ex);
            }
        });
    }

    @Override
    @Transactional(readOnly = true)
    public ReconReportResponse getLatestReport() {
        return reportRepository.findTopByOrderByStartedAtDesc()
                .map(ReconReportResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("No reconciliation reports found"));
    }

    @Override
    @Transactional(readOnly = true)
    public ReconReportResponse getReportById(UUID id) {
        return reportRepository.findById(id)
                .map(ReconReportResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("ReconReport", id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReconDiscrepancyResponse> getDiscrepancies(UUID reportId) {
        if (!reportRepository.existsById(reportId)) {
            throw new ResourceNotFoundException("ReconReport", reportId);
        }
        return discrepancyRepository.findByReconReportId(reportId).stream()
                .map(ReconDiscrepancyResponse::from)
                .toList();
    }
}
