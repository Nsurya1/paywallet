package com.paywallet.recon.controller;

import com.paywallet.recon.dto.ReconDiscrepancyResponse;
import com.paywallet.recon.dto.ReconReportResponse;
import com.paywallet.recon.dto.ReconTriggerResponse;
import com.paywallet.recon.service.ReconciliationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/recon")
@Tag(name = "Reconciliation", description = "End-of-Day (EOD) and On-Demand Ledger Reconciliation API")
public class ReconciliationController {

    private final ReconciliationService reconciliationService;

    public ReconciliationController(ReconciliationService reconciliationService) {
        this.reconciliationService = reconciliationService;
    }

    @PostMapping("/run")
    @Operation(summary = "Trigger reconciliation", description = "Runs reconciliation across all wallets and ledger entries, detecting balance drift or discrepancies.")
    public ResponseEntity<ReconTriggerResponse> triggerReconciliation() {
        ReconReportResponse report = reconciliationService.runReconciliation();
        String message = report.discrepancyCount() == 0
                ? "Reconciliation completed successfully with zero discrepancies."
                : "Reconciliation completed with " + report.discrepancyCount() + " discrepancy(ies) detected.";
        return ResponseEntity.ok(new ReconTriggerResponse(message, report));
    }

    @GetMapping("/reports/latest")
    @Operation(summary = "Get latest reconciliation report", description = "Retrieves summary metrics from the most recent reconciliation run.")
    public ResponseEntity<ReconReportResponse> getLatestReport() {
        return ResponseEntity.ok(reconciliationService.getLatestReport());
    }

    @GetMapping("/reports/{id}")
    @Operation(summary = "Get reconciliation report by ID", description = "Retrieves details of a specific reconciliation report.")
    public ResponseEntity<ReconReportResponse> getReportById(@PathVariable UUID id) {
        return ResponseEntity.ok(reconciliationService.getReportById(id));
    }

    @GetMapping("/reports/{id}/discrepancies")
    @Operation(summary = "Get report discrepancies", description = "Lists all wallet balance discrepancies identified during a specific reconciliation run.")
    public ResponseEntity<List<ReconDiscrepancyResponse>> getDiscrepancies(@PathVariable UUID id) {
        return ResponseEntity.ok(reconciliationService.getDiscrepancies(id));
    }
}
