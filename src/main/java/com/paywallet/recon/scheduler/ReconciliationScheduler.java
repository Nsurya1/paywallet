package com.paywallet.recon.scheduler;

import com.paywallet.recon.dto.ReconReportResponse;
import com.paywallet.recon.service.ReconciliationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "paywallet.recon.scheduler.enabled", havingValue = "true", matchIfMissing = true)
public class ReconciliationScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReconciliationScheduler.class);

    private final ReconciliationService reconciliationService;

    public ReconciliationScheduler(ReconciliationService reconciliationService) {
        this.reconciliationService = reconciliationService;
    }

    @Scheduled(cron = "${paywallet.recon.cron:0 0 0 * * *}")
    public void runScheduledReconciliation() {
        log.info("Triggering scheduled End-of-Day (EOD) reconciliation job...");
        try {
            ReconReportResponse report = reconciliationService.runReconciliation();
            log.info("Scheduled reconciliation job completed. RunId={}, Status={}, Wallets={}, Discrepancies={}",
                    report.runId(), report.status(), report.totalWalletsAudited(), report.discrepancyCount());
        } catch (Exception ex) {
            log.error("Scheduled reconciliation job encountered an error: {}", ex.getMessage(), ex);
        }
    }
}
