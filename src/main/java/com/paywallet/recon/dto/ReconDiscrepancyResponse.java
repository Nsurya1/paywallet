package com.paywallet.recon.dto;

import com.paywallet.recon.domain.DiscrepancyStatus;
import com.paywallet.recon.domain.ReconDiscrepancy;

import java.time.Instant;
import java.util.UUID;

public record ReconDiscrepancyResponse(
        UUID id,
        UUID reportId,
        UUID walletId,
        String currency,
        long walletBalance,
        long ledgerBalance,
        long difference,
        DiscrepancyStatus status,
        Instant detectedAt
) {
    public static ReconDiscrepancyResponse from(ReconDiscrepancy discrepancy) {
        return new ReconDiscrepancyResponse(
                discrepancy.getId(),
                discrepancy.getReconReport().getId(),
                discrepancy.getWalletId(),
                discrepancy.getCurrency(),
                discrepancy.getWalletBalance(),
                discrepancy.getLedgerBalance(),
                discrepancy.getDifference(),
                discrepancy.getStatus(),
                discrepancy.getDetectedAt()
        );
    }
}
