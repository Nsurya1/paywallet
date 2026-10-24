package com.paywallet.recon.repository;

import com.paywallet.recon.domain.ReconReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReconReportRepository extends JpaRepository<ReconReport, UUID> {
    Optional<ReconReport> findTopByOrderByStartedAtDesc();
    Optional<ReconReport> findByRunId(String runId);
}
