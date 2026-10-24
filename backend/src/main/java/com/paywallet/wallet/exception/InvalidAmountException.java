package com.paywallet.wallet.exception;

import com.paywallet.common.exception.BusinessException;

public class InvalidAmountException extends BusinessException {

    public InvalidAmountException(String message) {
        super("INVALID_AMOUNT", message);
    }
}
