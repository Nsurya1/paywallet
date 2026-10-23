package com.paywallet.wallet.exception;

import com.paywallet.common.exception.BusinessException;

public class InsufficientFundsException extends BusinessException {

    public InsufficientFundsException(String message) {
        super("INSUFFICIENT_FUNDS", message);
    }
}
