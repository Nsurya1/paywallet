package com.paywallet.wallet.exception;

import com.paywallet.common.exception.BusinessException;

public class WalletAccessDeniedException extends BusinessException {

    public WalletAccessDeniedException(String message) {
        super("WALLET_ACCESS_DENIED", message);
    }
}
