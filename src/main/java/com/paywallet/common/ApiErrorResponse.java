package com.paywallet.common;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiErrorResponse(
        int status,
        String error,
        String message,
        String path,
        Instant timestamp,
        List<ValidationError> fieldErrors
) {
    public record ValidationError(String field, String message) {}

    public static ApiErrorResponse of(int status, String error, String message, String path) {
        return new ApiErrorResponse(status, error, message, path, Instant.now(), List.of());
    }

    public static ApiErrorResponse of(int status, String error, String message, String path, List<ValidationError> fieldErrors) {
        return new ApiErrorResponse(status, error, message, path, Instant.now(), fieldErrors);
    }
}
