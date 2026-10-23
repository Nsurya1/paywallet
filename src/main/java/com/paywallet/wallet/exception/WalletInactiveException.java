package com.paywallet.wallet.exception;

import com.paywallet.common.exception.BusinessException;

public class WalletInactiveException extends BusinessException {

    public WalletInactiveException(String message) {
        super("WALLET_INACTIVE", message);
    }
}
