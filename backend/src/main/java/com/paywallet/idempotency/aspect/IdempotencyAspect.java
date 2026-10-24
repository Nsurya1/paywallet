package com.paywallet.idempotency.aspect;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.paywallet.auth.security.SecurityUtils;
import com.paywallet.idempotency.annotation.Idempotent;
import com.paywallet.idempotency.core.RequestHasher;
import com.paywallet.idempotency.exception.InvalidIdempotencyKeyException;
import com.paywallet.idempotency.service.ClaimResult;
import com.paywallet.idempotency.service.IdempotencyService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.time.Duration;
import java.util.UUID;

@Aspect
@Component
@Order(10)
public class IdempotencyAspect {

    private static final Logger log = LoggerFactory.getLogger(IdempotencyAspect.class);
    private static final String IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";
    private static final String IDEMPOTENT_REPLAY_HEADER = "Idempotent-Replay";
    private static final int MAX_KEY_LENGTH = 64;

    private final IdempotencyService idempotencyService;
    private final RequestHasher requestHasher;
    private final ObjectMapper objectMapper;

    public IdempotencyAspect(
            IdempotencyService idempotencyService,
            RequestHasher requestHasher,
            ObjectMapper objectMapper
    ) {
        this.idempotencyService = idempotencyService;
        this.requestHasher = requestHasher;
        this.objectMapper = objectMapper;
    }

    @Around("@annotation(idempotent)")
    public Object handleIdempotency(ProceedingJoinPoint pjp, Idempotent idempotent) throws Throwable {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return pjp.proceed();
        }

        HttpServletRequest request = attributes.getRequest();
        HttpServletResponse response = attributes.getResponse();

        String rawKey = request.getHeader(IDEMPOTENCY_KEY_HEADER);
        if (rawKey == null || rawKey.trim().isEmpty()) {
            throw new InvalidIdempotencyKeyException("Header '" + IDEMPOTENCY_KEY_HEADER + "' is required and cannot be empty");
        }

        String idemKey = rawKey.trim();
        if (idemKey.length() > MAX_KEY_LENGTH) {
            throw new InvalidIdempotencyKeyException("Header '" + IDEMPOTENCY_KEY_HEADER + "' exceeds maximum allowed length of " + MAX_KEY_LENGTH + " characters");
        }

        UUID userId = SecurityUtils.getCurrentUserId();
        String method = request.getMethod();
        String path = request.getRequestURI();

        Object bodyArg = extractRequestBody(pjp);
        String requestHash = requestHasher.computeHash(method, path, userId, bodyArg);

        String waitTimeoutHeader = request.getHeader("Idempotency-Wait-Timeout-Ms");
        Long waitTimeoutOverride = null;
        if (waitTimeoutHeader != null && !waitTimeoutHeader.isBlank()) {
            try {
                waitTimeoutOverride = Long.parseLong(waitTimeoutHeader.trim());
            } catch (NumberFormatException ignored) {}
        }

        Duration ttl = Duration.ofSeconds(idempotent.ttlSeconds());

        ClaimResult claim = idempotencyService.claimOrGetSaved(userId, idemKey, requestHash, ttl, waitTimeoutOverride);

        if (claim.isReplay()) {
            if (response != null) {
                response.addHeader(IDEMPOTENT_REPLAY_HEADER, "true");
            }
            return reconstructResponse(claim, pjp);
        }

        Object result;
        try {
            result = pjp.proceed();
        } catch (Throwable t) {
            idempotencyService.fail(userId, idemKey, ttl);
            throw t;
        }

        int statusCode = 200;
        String responseJson = "";

        if (result instanceof ResponseEntity<?> re) {
            statusCode = re.getStatusCode().value();
            Object body = re.getBody();
            if (body != null) {
                responseJson = objectMapper.writeValueAsString(body);
            }
        } else if (result != null) {
            responseJson = objectMapper.writeValueAsString(result);
        }

        idempotencyService.complete(userId, idemKey, requestHash, statusCode, responseJson, ttl);

        return result;
    }

    private Object extractRequestBody(ProceedingJoinPoint pjp) {
        MethodSignature signature = (MethodSignature) pjp.getSignature();
        Method method = signature.getMethod();
        Annotation[][] parameterAnnotations = method.getParameterAnnotations();
        Object[] args = pjp.getArgs();

        for (int i = 0; i < parameterAnnotations.length; i++) {
            for (Annotation annotation : parameterAnnotations[i]) {
                if (annotation instanceof RequestBody) {
                    return args[i];
                }
            }
        }

        for (Object arg : args) {
            if (arg != null && !(arg instanceof HttpServletRequest) && !(arg instanceof HttpServletResponse)) {
                return arg;
            }
        }

        return null;
    }

    private Object reconstructResponse(ClaimResult claim, ProceedingJoinPoint pjp) throws JsonProcessingException {
        MethodSignature signature = (MethodSignature) pjp.getSignature();
        Class<?> returnType = signature.getReturnType();

        if (ResponseEntity.class.isAssignableFrom(returnType)) {
            Type genericType = signature.getMethod().getGenericReturnType();
            if (genericType instanceof ParameterizedType pt && pt.getActualTypeArguments().length > 0) {
                Type bodyType = pt.getActualTypeArguments()[0];
                JavaType javaType = objectMapper.getTypeFactory().constructType(bodyType);
                Object deserializedBody = null;
                if (claim.responseBody() != null && !claim.responseBody().isBlank()) {
                    deserializedBody = objectMapper.readValue(claim.responseBody(), javaType);
                }
                return ResponseEntity
                        .status(claim.statusCode())
                        .header(IDEMPOTENT_REPLAY_HEADER, "true")
                        .body(deserializedBody);
            }

            return ResponseEntity
                    .status(claim.statusCode())
                    .header(IDEMPOTENT_REPLAY_HEADER, "true")
                    .body(claim.responseBody());
        }

        if (claim.responseBody() != null && !claim.responseBody().isBlank()) {
            return objectMapper.readValue(claim.responseBody(), returnType);
        }

        return null;
    }
}
