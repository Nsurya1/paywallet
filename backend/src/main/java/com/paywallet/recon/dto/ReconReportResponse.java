package com.paywallet.recon.dto;

import com.paywallet.recon.domain.ReconReport;
import com.paywallet.recon.domain.ReconStatus;

import java.time.Instant;
import java.util.UUID;

public record ReconReportResponse(
        UUID id,
        String runId,
        ReconStatus status,
        int totalWalletsAudited,
        int matchedWallets,
        int discrepancyCount,
        long totalSystemBalance,
        long totalLedgerCredits,
        long totalLedgerDebits,
        Instant startedAt,
        Instant completedAt,
        String errorMessage
) {
    public static ReconReportResponse from(ReconReport report) {
        return new ReconReportResponse(
                report.getId(),
                report.getRunId(),
                report.getStatus(),
                report.getTotalWalletsAudited(),
                report.getMatchedWallets(),
                report.getDiscrepancyCount(),
                report.getTotalSystemBalance(),
                report.getTotalLedgerCredits(),
                report.getTotalLedgerDebits(),
                report.getStartedAt(),
                report.getCompletedAt(),
                report.getErrorMessage()
        );
    }
}
