package com.paywallet.common.exception;

public class ResourceNotFoundException extends BusinessException {

    public ResourceNotFoundException(String message) {
        super("RESOURCE_NOT_FOUND", message);
    }

    public ResourceNotFoundException(String resourceName, Object id) {
        super("RESOURCE_NOT_FOUND", String.format("%s with ID '%s' was not found", resourceName, id));
    }
}
