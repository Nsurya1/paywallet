package com.paywallet.recon.repository;

import com.paywallet.recon.domain.ReconDiscrepancy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReconDiscrepancyRepository extends JpaRepository<ReconDiscrepancy, UUID> {
    List<ReconDiscrepancy> findByReconReportId(UUID reportId);
    List<ReconDiscrepancy> findByWalletId(UUID walletId);
}
