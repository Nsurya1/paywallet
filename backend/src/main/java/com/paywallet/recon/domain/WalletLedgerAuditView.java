package com.paywallet.recon.domain;

import java.util.UUID;

public interface WalletLedgerAuditView {
    UUID getWalletId();
    String getCurrency();
    long getWalletBalance();
    long getLedgerBalance();
}
