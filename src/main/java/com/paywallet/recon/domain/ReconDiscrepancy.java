package com.paywallet.recon.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "recon_discrepancies")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReconDiscrepancy {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recon_report_id", nullable = false)
    private ReconReport reconReport;

    @Column(name = "wallet_id", nullable = false)
    private UUID walletId;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "wallet_balance", nullable = false)
    private long walletBalance;

    @Column(name = "ledger_balance", nullable = false)
    private long ledgerBalance;

    @Column(name = "difference", nullable = false)
    private long difference;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private DiscrepancyStatus status = DiscrepancyStatus.UNRESOLVED;

    @Column(name = "detected_at", nullable = false, updatable = false)
    private Instant detectedAt = Instant.now();

    public ReconDiscrepancy(
            UUID walletId,
            String currency,
            long walletBalance,
            long ledgerBalance,
            long difference
    ) {
        this.walletId = walletId;
        this.currency = currency;
        this.walletBalance = walletBalance;
        this.ledgerBalance = ledgerBalance;
        this.difference = difference;
        this.status = DiscrepancyStatus.UNRESOLVED;
        this.detectedAt = Instant.now();
    }
}
