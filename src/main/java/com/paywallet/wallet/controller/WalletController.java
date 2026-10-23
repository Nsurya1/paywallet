package com.paywallet.wallet.controller;

import com.paywallet.wallet.dto.CreateWalletRequest;
import com.paywallet.wallet.dto.TopUpRequest;
import com.paywallet.wallet.dto.TopUpResponse;
import com.paywallet.wallet.dto.WalletResponse;
import com.paywallet.wallet.service.WalletService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/wallets")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Wallet Management", description = "Create wallet accounts, view balances, and process top-ups")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @PostMapping
    @Operation(summary = "Create a wallet account", description = "Creates a new currency wallet account for the authenticated user")
    public ResponseEntity<WalletResponse> createWallet(@Valid @RequestBody(required = false) CreateWalletRequest request) {
        CreateWalletRequest effectiveRequest = (request != null) ? request : new CreateWalletRequest("INR");
        WalletResponse response = walletService.createWallet(effectiveRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "List current user wallets", description = "Returns all currency wallets owned by the authenticated user")
    public ResponseEntity<List<WalletResponse>> getCurrentUserWallets() {
        List<WalletResponse> response = walletService.getCurrentUserWallets();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get wallet details", description = "Returns wallet balance and status. Only accessible by the wallet owner.")
    public ResponseEntity<WalletResponse> getWalletById(@PathVariable UUID id) {
        WalletResponse response = walletService.getWalletById(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/topup")
    @Operation(summary = "Top up wallet balance", description = "Simulates payment gateway deposit, crediting the wallet and writing an immutable ledger entry")
    public ResponseEntity<TopUpResponse> topUp(
            @PathVariable UUID id,
            @Valid @RequestBody TopUpRequest request
    ) {
        TopUpResponse response = walletService.topUp(id, request);
        return ResponseEntity.ok(response);
    }
}
