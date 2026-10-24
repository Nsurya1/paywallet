package com.paywallet.recon.service;

import com.paywallet.recon.dto.ReconDiscrepancyResponse;
import com.paywallet.recon.dto.ReconReportResponse;

import java.util.List;
import java.util.UUID;

public interface ReconciliationService {

    /**
     * Executes an End-of-Day (EOD) or on-demand reconciliation run comparing
     * each wallet's current balance with the sum of its immutable ledger entries.
     */
    ReconReportResponse runReconciliation();

    /**
     * Fetches the most recent reconciliation report.
     */
    ReconReportResponse getLatestReport();

    /**
     * Fetches a specific reconciliation report by ID.
     */
    ReconReportResponse getReportById(UUID id);

    /**
     * Retrieves all discrepancies detected for a given reconciliation run.
     */
    List<ReconDiscrepancyResponse> getDiscrepancies(UUID reportId);
}
