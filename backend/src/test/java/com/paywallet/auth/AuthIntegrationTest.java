package com.paywallet.auth;

import com.paywallet.BaseIntegrationTest;
import com.paywallet.auth.dto.AuthResponse;
import com.paywallet.auth.dto.LoginRequest;
import com.paywallet.auth.dto.RegisterRequest;
import com.paywallet.auth.dto.UserSummary;
import com.paywallet.common.ApiErrorResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AuthIntegrationTest extends BaseIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUpHttpClient() {
        restTemplate.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory());
    }

    private String getBaseUrl() {
        return "http://localhost:" + port + "/auth";
    }

    @Test
    @DisplayName("POST /auth/register - Successful registration creates user, hashes password, and returns JWT")
    void successfulRegistration() {
        String username = "register_test_" + UUID.randomUUID().toString().substring(0, 8);
        RegisterRequest request = new RegisterRequest(
                username,
                username + "@paywallet.com",
                "StrongP@ssw0rd!"
        );

        ResponseEntity<AuthResponse> response = restTemplate.postForEntity(
                getBaseUrl() + "/register",
                request,
                AuthResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        AuthResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.accessToken()).isNotBlank();
        assertThat(body.tokenType()).isEqualTo("Bearer");
        assertThat(body.expiresInSeconds()).isPositive();
        assertThat(body.user().username()).isEqualTo(username);
        assertThat(body.user().email()).isEqualTo(request.email());
        assertThat(body.user().role()).isEqualTo("ROLE_USER");

        // Verify password in DB is hashed and not plaintext
        String storedHash = jdbcTemplate.queryForObject(
                "SELECT password_hash FROM users WHERE username = ?",
                String.class,
                username
        );
        assertThat(storedHash).isNotBlank();
        assertThat(storedHash).isNotEqualTo("StrongP@ssw0rd!");
        assertThat(passwordEncoder.matches("StrongP@ssw0rd!", storedHash)).isTrue();
    }

    @Test
    @DisplayName("POST /auth/register - Rejects duplicate username with standard ApiErrorResponse")
    void duplicateUsernameRegistrationFails() {
        String username = "dup_user_" + UUID.randomUUID().toString().substring(0, 8);
        RegisterRequest request = new RegisterRequest(
                username,
                username + "@paywallet.com",
                "Password123!"
        );

        ResponseEntity<AuthResponse> firstResponse = restTemplate.postForEntity(
                getBaseUrl() + "/register",
                request,
                AuthResponse.class
        );
        assertThat(firstResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        RegisterRequest duplicateRequest = new RegisterRequest(
                username,
                "different_" + username + "@paywallet.com",
                "Password123!"
        );

        ResponseEntity<ApiErrorResponse> errorResponse = restTemplate.postForEntity(
                getBaseUrl() + "/register",
                duplicateRequest,
                ApiErrorResponse.class
        );

        assertThat(errorResponse.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        ApiErrorResponse errorBody = errorResponse.getBody();
        assertThat(errorBody).isNotNull();
        assertThat(errorBody.error()).isEqualTo("DUPLICATE_USERNAME");
        assertThat(errorBody.message()).contains(username);
        assertThat(errorBody.path()).isEqualTo("/auth/register");
    }

    @Test
    @DisplayName("POST /auth/register - Rejects invalid payload with standard 400 validation error JSON")
    void invalidRegistrationPayloadReturnsValidationErrors() {
        RegisterRequest invalidRequest = new RegisterRequest(
                "a", // Too short
                "not-an-email",
                "short" // Less than 8 chars
        );

        ResponseEntity<ApiErrorResponse> response = restTemplate.postForEntity(
                getBaseUrl() + "/register",
                invalidRequest,
                ApiErrorResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        ApiErrorResponse errorBody = response.getBody();
        assertThat(errorBody).isNotNull();
        assertThat(errorBody.error()).isEqualTo("Bad Request");
        assertThat(errorBody.fieldErrors()).isNotEmpty();
        assertThat(errorBody.fieldErrors()).anyMatch(fe -> fe.field().equals("username"));
        assertThat(errorBody.fieldErrors()).anyMatch(fe -> fe.field().equals("email"));
        assertThat(errorBody.fieldErrors()).anyMatch(fe -> fe.field().equals("password"));
    }

    @Test
    @DisplayName("POST /auth/login - Successful login returns valid JWT token and user summary")
    void successfulLogin() {
        String username = "login_test_" + UUID.randomUUID().toString().substring(0, 8);
        RegisterRequest registerReq = new RegisterRequest(username, username + "@paywallet.com", "MySecretP@ss1");
        restTemplate.postForEntity(getBaseUrl() + "/register", registerReq, AuthResponse.class);

        LoginRequest loginReq = new LoginRequest(username, "MySecretP@ss1");
        ResponseEntity<AuthResponse> loginResponse = restTemplate.postForEntity(
                getBaseUrl() + "/login",
                loginReq,
                AuthResponse.class
        );

        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        AuthResponse authBody = loginResponse.getBody();
        assertThat(authBody).isNotNull();
        assertThat(authBody.accessToken()).isNotBlank();
        assertThat(authBody.user().username()).isEqualTo(username);
    }

    @Test
    @DisplayName("POST /auth/login - Login with incorrect password returns 401 Unauthorized")
    void loginWithWrongPasswordFails() {
        String username = "wrong_pwd_" + UUID.randomUUID().toString().substring(0, 8);
        RegisterRequest registerReq = new RegisterRequest(username, username + "@paywallet.com", "CorrectP@ss1");
        restTemplate.postForEntity(getBaseUrl() + "/register", registerReq, AuthResponse.class);

        LoginRequest wrongLoginReq = new LoginRequest(username, "WrongPassword!");
        ResponseEntity<ApiErrorResponse> response = restTemplate.postForEntity(
                getBaseUrl() + "/login",
                wrongLoginReq,
                ApiErrorResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        ApiErrorResponse errorBody = response.getBody();
        assertThat(errorBody).isNotNull();
        assertThat(errorBody.message()).isEqualTo("Invalid username or password");
    }

    @Test
    @DisplayName("GET /auth/me - Access protected endpoint without token returns 401 with standard error JSON")
    void accessProtectedEndpointWithoutTokenFails() {
        ResponseEntity<ApiErrorResponse> response = restTemplate.getForEntity(
                getBaseUrl() + "/me",
                ApiErrorResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        ApiErrorResponse errorBody = response.getBody();
        assertThat(errorBody).isNotNull();
        assertThat(errorBody.status()).isEqualTo(401);
        assertThat(errorBody.path()).isEqualTo("/auth/me");
    }

    @Test
    @DisplayName("GET /auth/me - Access protected endpoint with valid JWT token returns authenticated user profile")
    void accessProtectedEndpointWithValidTokenSuccess() {
        String username = "protected_user_" + UUID.randomUUID().toString().substring(0, 8);
        RegisterRequest registerReq = new RegisterRequest(username, username + "@paywallet.com", "ValidSecretP@ss1");
        ResponseEntity<AuthResponse> regResponse = restTemplate.postForEntity(
                getBaseUrl() + "/register",
                registerReq,
                AuthResponse.class
        );
        String token = regResponse.getBody().accessToken();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        ResponseEntity<UserSummary> response = restTemplate.exchange(
                getBaseUrl() + "/me",
                HttpMethod.GET,
                requestEntity,
                UserSummary.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        UserSummary profile = response.getBody();
        assertThat(profile).isNotNull();
        assertThat(profile.username()).isEqualTo(username);
        assertThat(profile.email()).isEqualTo(registerReq.email());
        assertThat(profile.role()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("GET /auth/me - Access protected endpoint with forged/tampered token returns 401")
    void accessProtectedEndpointWithTamperedTokenFails() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer eyJhbGciOiJIUzI1NiJ9.tampered.token");
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        ResponseEntity<ApiErrorResponse> response = restTemplate.exchange(
                getBaseUrl() + "/me",
                HttpMethod.GET,
                requestEntity,
                ApiErrorResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        ApiErrorResponse errorBody = response.getBody();
        assertThat(errorBody).isNotNull();
        assertThat(errorBody.status()).isEqualTo(401);
    }
}
