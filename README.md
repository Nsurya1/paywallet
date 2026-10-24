# PayWallet 💳
### High-Throughput Digital Wallet Backend & Concurrency-Safe Ledger Engine

[![CI / CD](https://github.com/paywallet/paywallet/actions/workflows/ci.yml/badge.svg)](https://github.com/paywallet/paywallet/actions/workflows/ci.yml)
[![Java Version](https://img.shields.io/badge/Java-21%20LTS-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Kafka](https://img.shields.io/badge/Kafka-3.7%20(KRaft)-black.svg)](https://kafka.apache.org/)
[![Redis](https://img.shields.io/badge/Redis-7.4-red.svg)](https://redis.io/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

A production-grade, distributed digital wallet backend engineered with **Java 21**, **Spring Boot 3.3**, **PostgreSQL 16**, **Redis 7**, and **Apache Kafka**. Designed around immutable double-entry bookkeeping, multi-strategy concurrency control (Pessimistic & Optimistic with exponential backoff), dual-storage idempotency, transactional outbox event streaming, automated reconciliation, and Resilience4j circuit breakers to guarantee absolute consistency and zero balance divergence under high concurrency.

---

## 🏛 System Architecture & Modular Monolith

```mermaid
flowchart TD
    Client["Client / Merchant Applications"]
    
    subgraph Edge ["Security & Ingress"]
        GW["Spring Security (Stateless JWT & BCrypt)"]
        IdemFilter["@Idempotent Filter (SHA-256 Request Hash)"]
    end
    
    subgraph CoreEngine ["PayWallet Core Platform"]
        Auth["Auth Service (RBAC, Tokens)"]
        Wallet["Wallet Service (Account Lifecycle)"]
        Transfer["Transfer Saga Engine<br/>(Pessimistic vs Optimistic Locking)"]
        Ledger["Double-Entry Ledger Journal<br/>(Immutable, Append-Only)"]
        Recon["EOD Reconciliation Engine<br/>(∑ Credits - ∑ Debits == Balance)"]
    end

    subgraph Storage ["Persistence & Cache"]
        Redis[("Redis 7<br/>Idempotency 24h Cache")]
        Postgres[("PostgreSQL 16<br/>Flyway Schema Ground Truth")]
    end

    subgraph Messaging ["Event Streaming & Resilience"]
        Outbox["Transactional Outbox<br/>(FOR UPDATE SKIP LOCKED)"]
        Kafka["Apache Kafka<br/>(Topic: wallet.events)"]
        Consumer["Idempotent Consumer<br/>(Deduplication by event_id)"]
        Webhook["Webhook Dispatcher<br/>(Resilience4j Circuit Breaker + Retries)"]
    end

    subgraph Observability ["Observability Stack"]
        Prom["Prometheus (:9090)"]
        Graf["Grafana Dashboard (:3001)"]
    end

    Client --> GW --> IdemFilter
    IdemFilter --> Redis
    IdemFilter --> Transfer
    Transfer --> Wallet
    Transfer --> Ledger
    Transfer --> Postgres
    Transfer --> Outbox
    Outbox --> Kafka
    Kafka --> Consumer
    Consumer --> Webhook
    Recon --> Postgres
    Transfer -.-> Prom
    Prom --> Graf
```

---

## 🔒 Core Financial Invariants & Concurrency Guarantees

1. **Minor Currency Units Only (`BIGINT`)**: Money is modeled strictly as `BIGINT` minor units (cents/paise). Floating-point data types (`double`, `float`) are prohibited to eliminate IEEE 754 precision rounding errors.
2. **Immutable Double-Entry Ledger**: Every fund movement writes immutable credit and debit entries to `ledger_entries`. Account balances can be completely recomputed from the genesis transaction.
   $$\sum \text{Ledger Debits} == \sum \text{Ledger Credits}$$
3. **Deadlock-Free Pessimistic Locking**: `SELECT ... FOR UPDATE` acquires locks on involved wallets in strict, deterministic lexicographical UUID order ($W_{\min} \to W_{\max}$), mathematically preventing $A \to B$ and $B \to A$ cyclic deadlock graphs.
4. **Optimistic Locking with Exponential Backoff & Full Jitter**: `@Version` tracking coupled with configurable backoff ($t_{\text{sleep}} = \min(M, B \times 2^{\text{attempt}}) \times \text{random}(0.5, 1.5)$) automatically resolves lost-update conflicts without holding database row locks.
5. **Dual-Storage Idempotency**: Guarantees exactly-once execution for all mutating API requests (`/transfers`, `/wallets/{id}/topup`). A SHA-256 hash of `(method, path, userId, body)` is claimed atomically (`INSERT ... ON CONFLICT DO NOTHING`) across Redis (24-hour fast cache) and PostgreSQL (persistent source of truth).
6. **Transactional Outbox & At-Least-Once Kafka Delivery**: Outbox events are inserted within the identical database transaction as balance mutations. A scheduled publisher drains events via `SELECT ... FOR UPDATE SKIP LOCKED` and publishes to Kafka partitioned by `wallet_id`.
7. **End-of-Day (EOD) Reconciliation**: Audits all snapshot wallet balances against the ledger journal in a single set-based SQL aggregation:
   $$\text{Wallet Balance} \stackrel{?}{=} \sum (\text{Credits}) - \sum (\text{Debits})$$
   Flags unauthorized direct database mutations and generates audit reports.
8. **Resilient Outbound Webhooks**: Notifies merchant endpoints with HMAC-SHA256 signatures (`X-PayWallet-Signature`) protected by Resilience4j **Circuit Breakers**, **Rate Limiters**, and **Retries**.

---

## 📦 Modular Architecture & Package Layout

```
com.paywallet
├── auth            # User identity, JWT generation/validation, BCrypt hashing, SecurityUtils
├── wallet          # Domain entity Wallet (debit/credit invariants), top-up gateway, ownership
├── transfer        # Funds transfer saga, strategy pattern (Pessimistic vs Optimistic), Micrometer
├── ledger          # Double-entry ledger journal (immutable LedgerEntry, audit queries)
├── idempotency     # Dual-storage engine (Redis + Postgres), @Idempotent annotation, SHA-256 hash
├── outbox          # Transactional outbox (FOR UPDATE SKIP LOCKED), Kafka publisher, idempotent consumer
├── recon           # EOD reconciliation engine, automated balance drift & tampering detection
├── notification    # Resilient webhook dispatcher, Resilience4j CircuitBreaker, HMAC-SHA256 signatures
├── common          # Standardized ApiErrorResponse, BusinessException, GlobalExceptionHandler
└── config          # SecurityFilterChain, OpenAPI/Swagger, Redis, Kafka, Micrometer Actuator
```

---

## ⚡ Concurrency Control: Pessimistic vs Optimistic Locking

PayWallet implements the **Strategy Pattern** for dynamic switching between locking paradigms via `paywallet.locking.strategy`:

| Metric / Dimension | Pessimistic Locking (`SELECT FOR UPDATE`) | Optimistic Locking (`@Version` + Jitter) |
|---|---|---|
| **Property Value** | `paywallet.locking.strategy: pessimistic` | `paywallet.locking.strategy: optimistic` |
| **Mechanics** | Database row-level exclusive write locks | Record version increment; rollback on conflict |
| **Deadlock Prevention**| Sort wallet IDs: `lock(min(from, to))` then `lock(max(from, to))` | Exponential backoff with random full jitter |
| **Best Used For** | High contention on hotspot accounts (e.g., flash sales) | Low-to-moderate contention, read-heavy workloads |
| **Database Lock Hold**| For the full duration of the transaction | Milliseconds at final commit time |
| **Observability** | `transfer_duration_seconds` | `transfer_lock_retries_total`, `transfer_duration_seconds` |

---

## 🚀 Quick Start Guide

### Prerequisites
- **JDK 21 LTS** installed (`java --version`)
- **Docker Desktop** installed and running (`docker --version`)

### 1. Launch Infrastructure Services
Start PostgreSQL 16, Redis 7, Kafka 3.7 (KRaft), Prometheus, and Grafana:
```bash
docker compose up -d
```

Verify healthy containers:
```bash
docker compose ps
```

### 2. Build and Run the Application
```bash
# Windows
.\mvnw.cmd spring-boot:run

# Linux / macOS
./mvnw spring-boot:run
```
The server starts on port `8080`.

### 3. Verify Health & Developer Portals
- **OpenAPI Swagger UI**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **Prometheus Metrics**: [http://localhost:8080/actuator/prometheus](http://localhost:8080/actuator/prometheus)
- **Grafana Dashboard**: [http://localhost:3001](http://localhost:3001) (`admin` / `admin`)
  - Auto-provisioned: **PayWallet - High-Concurrency Ledger & Observability**

---

## 🧪 Automated Testing & Testcontainers Suite

PayWallet uses **Testcontainers** with real PostgreSQL 16, Redis 7, and Kafka 3.7 instances for test isolation (strictly zero in-memory H2 shortcuts):

```bash
# Run all integration tests
.\mvnw.cmd test
```

### Key Integration Tests:
- `FlywaySchemaMigrationIntegrationTest`: Validates 5 Flyway schema migrations against clean PostgreSQL.
- `AuthIntegrationTest`: Verifies JWT issuance, BCrypt password hashing, and endpoint security.
- `WalletIntegrationTest`: Verifies balance encapsulation, top-ups, and ownership isolation.
- `TransferIntegrationTest`: Proves deadlock-free concurrent transfers and anti-deadlock $A \leftrightarrow B$ execution.
- `IdempotencyIntegrationTest`: Tests 50 concurrent requests with identical keys, hash mismatch detection (422), and Redis-down fallback.
- `OutboxKafkaIntegrationTest`: Pauses Kafka broker to prove zero event loss; verifies idempotent consumer deduplication.
- `ReconciliationIntegrationTest`: Detects intentional balance tampering and verifies 100% ledger consistency.
- `NotificationWebhookIntegrationTest`: Proves Resilience4j Circuit Breaker trips `OPEN` on consecutive 500 errors and asserts HMAC signatures.

---

## 📊 Distributed Load Testing (k6)

Stress-test the system and observe latency and locking metrics in real-time Grafana dashboards:

```bash
# 1. Run 100 Virtual Users concurrent transfer benchmark
k6 run k6/transfer_load_test.js

# 2. Run 50 concurrent requests idempotency race test
k6 run k6/idempotency_stress_test.js
```

### Benchmark Sample Output (100 Concurrent VUs):
```
     ✓ Register success
     ✓ Wallet created
     ✓ Top-up funded
     ✓ Transfer status 200 OK
     ✓ Zero balance discrepancies (POST /recon/run)

     checks.........................: 100.00% ✓ 18420       ✗ 0
     http_req_duration..............: avg=34.2ms  min=4.1ms  med=22.6ms  p(95)=78.4ms p(99)=142.0ms
     http_req_failed................: 0.00%   ✓ 0           ✗ 18420
     http_reqs......................: 18420   204.66/s
```

---

## 💼 Resume Showcase: Bullet Points

*Ready-to-use resume bullet points highlighting senior engineering achievements:*

- **High-Throughput Concurrency Control**: Architected a production-grade digital wallet in Java 21 / Spring Boot 3 with dual-strategy locking (Pessimistic `SELECT ... FOR UPDATE` with deterministic lock ordering and Optimistic `@Version` with exponential backoff & full jitter), eliminating race conditions and deadlocks under 1,000+ concurrent transfers.
- **Immutable Double-Entry Ledger**: Implemented strict append-only double-entry bookkeeping ($\sum \text{Debits} == \sum \text{Credits}$) in PostgreSQL 16 with zero floating-point arithmetic (`BIGINT` minor units) and an automated End-of-Day reconciliation engine detecting balance drift via set-based SQL aggregation.
- **Dual-Storage Distributed Idempotency**: Engineered a high-performance idempotency filter using Redis 7 (24h TTL cache) and PostgreSQL (atomic claim via `INSERT ... ON CONFLICT DO NOTHING`), guaranteeing exactly-once semantics for mutating financial operations under 50+ concurrent identical requests.
- **Event-Driven Resilience & Outbox Pattern**: Built an at-least-once Transactional Outbox pattern polling pending events with `SELECT ... FOR UPDATE SKIP LOCKED` into Apache Kafka (KRaft), paired with an idempotent consumer and Resilience4j Circuit Breakers to safely dispatch cryptographic HMAC-SHA256 webhooks to third-party endpoints.
- **Observability & Continuous Integration**: Designed end-to-end observability with Micrometer, Prometheus, and auto-provisioned Grafana dashboards tracking p99 latencies, lock contention rates, and HikariCP connection pools; validated system reliability through 57+ Testcontainers integration tests and GitHub Actions CI/CD.

---

## 📄 License

Distributed under the Apache 2.0 License. See `LICENSE` for more information.
