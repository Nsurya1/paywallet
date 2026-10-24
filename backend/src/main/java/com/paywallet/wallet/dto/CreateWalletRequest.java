package com.paywallet.wallet.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateWalletRequest(
        @Size(min = 3, max = 3, message = "Currency must be a 3-letter ISO code (e.g. INR, USD)")
        @Pattern(regexp = "^[A-Za-z]{3}$", message = "Currency must consist of 3 alphabetical characters")
        String currency
) {
    public CreateWalletRequest {
        if (currency == null || currency.isBlank()) {
            currency = "INR";
        } else {
            currency = currency.toUpperCase();
        }
    }
}
