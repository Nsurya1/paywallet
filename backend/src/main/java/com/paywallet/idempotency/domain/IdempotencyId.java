package com.paywallet.idempotency.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class IdempotencyId implements Serializable {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "idem_key", length = 128, nullable = false)
    private String idemKey;

    public IdempotencyId() {}

    public IdempotencyId(UUID userId, String idemKey) {
        this.userId = userId;
        this.idemKey = idemKey;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getIdemKey() {
        return idemKey;
    }

    public void setIdemKey(String idemKey) {
        this.idemKey = idemKey;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        IdempotencyId that = (IdempotencyId) o;
        return Objects.equals(userId, that.userId) && Objects.equals(idemKey, that.idemKey);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, idemKey);
    }

    @Override
    public String toString() {
        return "IdempotencyId{" +
                "userId=" + userId +
                ", idemKey='" + idemKey + '\'' +
                '}';
    }
}
