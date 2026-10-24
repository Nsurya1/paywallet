# PayWallet 💳
### High-Throughput Digital Wallet Platform & Concurrency-Safe Ledger Engine

[![CI / CD](https://github.com/paywallet/paywallet/actions/workflows/ci.yml/badge.svg)](https://github.com/paywallet/paywallet/actions/workflows/ci.yml)
[![Java Version](https://img.shields.io/badge/Java-21%20LTS-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Kafka](https://img.shields.io/badge/Kafka-3.7%20(KRaft)-black.svg)](https://kafka.apache.org/)
[![Redis](https://img.shields.io/badge/Redis-7.4-red.svg)](https://redis.io/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

A production-grade, distributed digital wallet platform engineered with **Java 21**, **Spring Boot 3.3**, **PostgreSQL 16**, **Redis 7**, **Apache Kafka**, and a **React 18 / Tailwind CSS** single-page application. Designed around immutable double-entry bookkeeping, multi-strategy concurrency control (Pessimistic & Optimistic with exponential backoff), dual-storage idempotency, transactional outbox event streaming, automated reconciliation, and Resilience4j circuit breakers to guarantee absolute consistency and zero balance divergence under high concurrency.

---

## 📁 Repository Structure

The project is cleanly decoupled into dedicated **`backend`** and **`frontend`** modules:

```
PayWallet/
├── backend/                         # Java 21 / Spring Boot 3.3.4 Modular Monolith
│   ├── src/                         # Application & Testcontainers Integration Tests
│   ├── .mvn/                        # Maven Wrapper Configuration
│   ├── Dockerfile                   # Multi-stage production container build
│   ├── pom.xml                      # Maven Dependencies (Spring Data JPA, Kafka, Redis)
│   └── mvnw / mvnw.cmd              # Maven execution scripts
├── frontend/                        # React 18 / Vite / Tailwind CSS Client SPA
│   ├── src/                         # React components, pages, context, and API client
│   ├── package.json                 # React dependencies, Lucide icons, Vitest
│   ├── vite.config.js               # Proxy to backend (:8080) & Vitest jsdom config
│   └── tailwind.config.js           # Tailwind UI styling system
├── docker/                          # Prometheus, Grafana, and Observability configs
│   ├── grafana/                     # Auto-provisioned dashboards & data sources
│   └── prometheus.yml               # Micrometer actuator metrics scraping configuration
├── docker-compose.yml               # Local infrastructure (PostgreSQL 16, Redis 7, Kafka)
├── k6/                              # Distributed performance & idempotency stress tests
├── .github/workflows/ci.yml         # GitHub Actions CI/CD pipeline (backend + frontend)
└── README.md
```

---

## 🏛 System Architecture & Modular Monolith

```mermaid
flowchart TD
    Client["Client / React 18 SPA (:5173)"]
    
    subgraph Ingress ["Ingress & Security"]
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

    Client -->|Axios + JWT| Ingress
    Ingress --> CoreEngine
    CoreEngine --> Storage
    CoreEngine --> Messaging
    Storage --> Recon
    Observability -.->|Scrapes| Ingress
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
- **Node.js 18+** installed (`node --version`)
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

### 2. Run the Backend API Server
```bash
cd backend

# Windows
.\mvnw.cmd spring-boot:run

# Linux / macOS
./mvnw spring-boot:run
```
*The Spring Boot server starts on port `8085`. Flyway executes database migrations `V1` through `V5` automatically.*

### 3. Run the Frontend Single-Page App
In a separate terminal:
```bash
cd frontend

npm install
npm run dev
```
*The React SPA starts on `http://localhost:5173` with Vite HMR, proxying `/auth`, `/wallets`, `/transfers`, `/webhooks` directly to the backend on `:8085`.*

### 4. Verify Health & Developer Portals
- **Frontend SPA**: [http://localhost:5173](http://localhost:5173)
- **OpenAPI Swagger UI**: [http://localhost:8085/swagger-ui.html](http://localhost:8085/swagger-ui.html)
- **Prometheus Metrics**: [http://localhost:8085/actuator/prometheus](http://localhost:8085/actuator/prometheus)
- **Grafana Dashboard**: [http://localhost:3001](http://localhost:3001) (`admin` / `admin`)
  - Auto-provisioned: **PayWallet - High-Concurrency Ledger & Observability**

---

## 🧪 Automated Testing

### 1. Backend Integration Tests (Testcontainers)
Tests run against real PostgreSQL 16, Redis 7, and Kafka 3.7 containers:
```bash
cd backend
.\mvnw.cmd test
```

### 2. Frontend Unit & Component Tests (Vitest)
Unit tests verify minor unit currency transformations, idempotency UUID generation, and in-flight transfer state transitions:
```bash
cd frontend
npm test
```

---

## 📊 Distributed Load Testing (k6)

Stress-test the system and observe latency and locking metrics in real-time Grafana dashboards:

```bash
# 1. Run 100 Virtual Users concurrent transfer benchmark
k6 run k6/transfer_load_test.js

# 2. Run 50 concurrent requests idempotency race test
k6 run k6/idempotency_stress_test.js
```

---

## 💼 Resume Showcase: Bullet Points

- **High-Throughput Concurrency Control**: Architected a production-grade digital wallet in Java 21 / Spring Boot 3 with dual-strategy locking (Pessimistic `SELECT ... FOR UPDATE` with deterministic lock ordering and Optimistic `@Version` with exponential backoff & full jitter), eliminating race conditions and deadlocks under 1,000+ concurrent transfers.
- **Immutable Double-Entry Ledger**: Implemented strict append-only double-entry bookkeeping ($\sum \text{Debits} == \sum \text{Credits}$) in PostgreSQL 16 with zero floating-point arithmetic (`BIGINT` minor units) and an automated End-of-Day reconciliation engine detecting balance drift via set-based SQL aggregation.
- **Dual-Storage Distributed Idempotency**: Engineered a high-performance idempotency filter using Redis 7 (24h TTL cache) and PostgreSQL (atomic claim via `INSERT ... ON CONFLICT DO NOTHING`), guaranteeing exactly-once semantics for mutating financial operations under 50+ concurrent identical requests.
- **Event-Driven Resilience & Outbox Pattern**: Built an at-least-once Transactional Outbox pattern polling pending events with `SELECT ... FOR UPDATE SKIP LOCKED` into Apache Kafka (KRaft), paired with an idempotent consumer and Resilience4j Circuit Breakers to safely dispatch cryptographic HMAC-SHA256 webhooks to third-party endpoints.
- **Full-Stack Architecture & Observability**: Delivered a decoupled React 18 SPA with idempotency key preservation on network retries, and configured end-to-end observability with Micrometer, Prometheus, and auto-provisioned Grafana dashboards tracking p99 latencies, lock contention rates, and HikariCP connection pools.

---

## 📄 License

Distributed under the Apache 2.0 License. See `LICENSE` for more information.
