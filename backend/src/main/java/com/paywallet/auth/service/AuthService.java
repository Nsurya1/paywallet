package com.paywallet.auth.service;

import com.paywallet.auth.domain.User;
import com.paywallet.auth.dto.AuthResponse;
import com.paywallet.auth.dto.LoginRequest;
import com.paywallet.auth.dto.RegisterRequest;
import com.paywallet.auth.dto.UserSummary;
import com.paywallet.auth.jwt.JwtTokenProvider;
import com.paywallet.auth.repository.UserRepository;
import com.paywallet.auth.security.SecurityUtils;
import com.paywallet.common.exception.BusinessException;
import com.paywallet.common.exception.ResourceNotFoundException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new BusinessException("DUPLICATE_USERNAME", "Username '" + request.username() + "' is already taken");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException("DUPLICATE_EMAIL", "Email '" + request.email() + "' is already registered");
        }

        String passwordHash = passwordEncoder.encode(request.password());
        User user = new User(request.username(), request.email(), passwordHash, "ROLE_USER");
        User savedUser = userRepository.save(user);

        String token = jwtTokenProvider.generateToken(savedUser);
        return AuthResponse.of(token, jwtTokenProvider.getExpirationSeconds(), UserSummary.from(savedUser));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid username or password");
        }

        String token = jwtTokenProvider.generateToken(user);
        return AuthResponse.of(token, jwtTokenProvider.getExpirationSeconds(), UserSummary.from(user));
    }

    @Transactional(readOnly = true)
    public UserSummary getCurrentUserProfile() {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", currentUserId));
        return UserSummary.from(user);
    }
}
