# PayWallet - High-Throughput Digital Wallet & Concurrency-Safe Ledger

A production-grade, distributed digital wallet backend engineered with Spring Boot 3, PostgreSQL, Redis, Kafka, and Testcontainers. Built around double-entry bookkeeping principles, distributed locking, and transactional outbox patterns to guarantee absolute consistency and zero balance divergence under high concurrency.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Language & Runtime** | Java 21 LTS |
| **Framework** | Spring Boot 3.3.4 (Modular Monolith) |
| **Persistence** | Spring Data JPA, PostgreSQL 16 (Flyway Migrations) |
| **Cache & Locks** | Redis 7 (Distributed Locks & Idempotency Store) |
| **Messaging** | Apache Kafka 3.7 (KRaft mode, Transactional Outbox) |
| **Security** | Spring Security 6 with Stateless JWT |
| **Fault Tolerance** | Resilience4j (Rate Limiter, Circuit Breaker, Retry) |
| **Testing** | JUnit 5, Mockito, Testcontainers (Real PostgreSQL & Kafka) |
| **Observability** | Spring Boot Actuator, Micrometer, Prometheus, Grafana |
| **Load Testing** | k6 Distributed Stress Testing Suite |

---

## 🏛 Architecture & Modular Monolith Layout

```
com.paywallet
├── auth            # User identity, JWT generation/validation, RBAC
├── wallet          # Wallet lifecycle, accounts, cached balance views
├── transfer        # Funds transfer saga & balance movement orchestration
├── ledger          # Concurrency-safe immutable double-entry ledger engine
├── idempotency     # Deduplication layer for network retry protection
├── outbox          # Transactional outbox pattern for reliable event publishing
├── notification    # Async event consumers and transaction webhook dispatchers
├── recon           # EOD reconciliation: cached balance vs. journal integrity
├── common          # Standardized ApiErrorResponse, GlobalExceptionHandler
└── config          # SecurityFilterChain, OpenAPI/Swagger, Redis, Kafka configs
```

### Core Financial Invariants
1. **Minor Currency Units**: Money is stored strictly as `BIGINT` (cents/paise) to eliminate floating-point precision loss.
2. **Double-Entry Bookkeeping**: Every financial transaction generates balanced debit and credit entries (`∑ Debits = ∑ Credits`).
3. **Strict Schema Versioning**: Zero automatic JPA DDL (`ddl-auto: validate`). All schema evolution is managed via Flyway.
4. **Idempotent Mutations**: All state-modifying requests require unique idempotency keys.
5. **No In-Memory DBs in Integration Tests**: Real PostgreSQL testcontainers ensure dialect and constraint fidelity.

---

## 🚀 Getting Started

### Prerequisites
- **JDK 21** installed and configured (`java --version`)
- **Docker Desktop** running (`docker --version`)

### 1. Start Infrastructure Services
Start PostgreSQL, Redis, Kafka, Prometheus, and Grafana:
```bash
docker compose up -d
```

Verify running containers:
```bash
docker compose ps
```

### 2. Build & Run Application
```bash
# Windows
.\mvnw.cmd spring-boot:run

# Linux / macOS
./mvnw spring-boot:run
```

The application starts on port `8080` with the `dev` profile by default.

### 3. Verify System Health
- **Actuator Health Check**: [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)
- **Prometheus Metrics**: [http://localhost:8080/actuator/prometheus](http://localhost:8080/actuator/prometheus)
- **OpenAPI Swagger UI**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **Grafana Dashboard**: [http://localhost:3001](http://localhost:3001) (`admin` / `admin`)

---

## 🧪 Running Integration Tests

Integration tests leverage Testcontainers to spin up isolated PostgreSQL instances automatically:

```bash
# Windows
.\mvnw.cmd test

# Linux / macOS
./mvnw test
```

---

## 📊 Benchmarks & Concurrency Metrics
*(Benchmark results captured via k6 load tests will be recorded here in subsequent steps.)*
