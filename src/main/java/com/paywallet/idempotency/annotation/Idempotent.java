package com.paywallet.idempotency.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a controller endpoint as idempotent using the Idempotency-Key header.
 * Requests with the same key and same normalized payload will return the cached response.
 * Requests with the same key but different payload will be rejected with HTTP 422.
 * Concurrent requests with the same key will either wait or return HTTP 409.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Idempotent {

    /**
     * Cache retention TTL in seconds. Default is 86400 (24 hours).
     */
    long ttlSeconds() default 86400;
}
