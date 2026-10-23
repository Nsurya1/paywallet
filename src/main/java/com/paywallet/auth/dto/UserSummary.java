package com.paywallet.auth.dto;

import com.paywallet.auth.domain.User;

import java.util.UUID;

public record UserSummary(
        UUID id,
        String username,
        String email,
        String role
) {
    public static UserSummary from(User user) {
        return new UserSummary(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole()
        );
    }
}
