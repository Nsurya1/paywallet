package com.paywallet.recon.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "recon_reports")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReconReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "run_id", nullable = false, unique = true, length = 64)
    private String runId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private ReconStatus status = ReconStatus.IN_PROGRESS;

    @Column(name = "total_wallets_audited", nullable = false)
    private int totalWalletsAudited = 0;

    @Column(name = "matched_wallets", nullable = false)
    private int matchedWallets = 0;

    @Column(name = "discrepancy_count", nullable = false)
    private int discrepancyCount = 0;

    @Column(name = "total_system_balance", nullable = false)
    private long totalSystemBalance = 0;

    @Column(name = "total_ledger_credits", nullable = false)
    private long totalLedgerCredits = 0;

    @Column(name = "total_ledger_debits", nullable = false)
    private long totalLedgerDebits = 0;

    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @OneToMany(mappedBy = "reconReport", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<ReconDiscrepancy> discrepancies = new ArrayList<>();

    public ReconReport(String runId) {
        this.runId = runId;
        this.status = ReconStatus.IN_PROGRESS;
        this.startedAt = Instant.now();
    }

    public void addDiscrepancy(ReconDiscrepancy discrepancy) {
        discrepancies.add(discrepancy);
        discrepancy.setReconReport(this);
    }
}
