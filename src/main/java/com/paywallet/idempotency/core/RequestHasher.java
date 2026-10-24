package com.paywallet.idempotency.core;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Iterator;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

@Component
public class RequestHasher {

    private final ObjectMapper objectMapper;

    public RequestHasher(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Computes a deterministic SHA-256 hash from HTTP method, path, userId, and normalized request body.
     */
    public String computeHash(String method, String path, UUID userId, Object body) {
        String normalizedBody = normalizeBody(body);
        String input = method.toUpperCase() + ":" + path + ":" + userId + ":" + normalizedBody;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available in current JVM", e);
        }
    }

    public String normalizeBody(Object body) {
        if (body == null) {
            return "";
        }
        try {
            JsonNode tree;
            if (body instanceof String s) {
                if (s.isBlank()) {
                    return "";
                }
                tree = objectMapper.readTree(s);
            } else if (body instanceof byte[] b) {
                if (b.length == 0) {
                    return "";
                }
                tree = objectMapper.readTree(b);
            } else {
                tree = objectMapper.valueToTree(body);
            }
            JsonNode canonicalTree = sortJsonNode(tree);
            return objectMapper.writeValueAsString(canonicalTree);
        } catch (Exception e) {
            return body.toString().trim();
        }
    }

    private JsonNode sortJsonNode(JsonNode node) {
        if (node == null) {
            return null;
        }
        if (node.isObject()) {
            ObjectNode sorted = objectMapper.createObjectNode();
            Map<String, JsonNode> map = new TreeMap<>();
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                map.put(entry.getKey(), sortJsonNode(entry.getValue()));
            }
            for (Map.Entry<String, JsonNode> entry : map.entrySet()) {
                sorted.set(entry.getKey(), entry.getValue());
            }
            return sorted;
        } else if (node.isArray()) {
            ArrayNode arrayNode = objectMapper.createArrayNode();
            for (JsonNode item : node) {
                arrayNode.add(sortJsonNode(item));
            }
            return arrayNode;
        }
        return node;
    }
}
