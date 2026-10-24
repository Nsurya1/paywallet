package com.paywallet.recon.dto;

public record ReconTriggerResponse(
        String message,
        ReconReportResponse report
) {}
