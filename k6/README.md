# PayWallet k6 Concurrency Benchmark & Observability Suite

This directory contains distributed load testing scripts designed to stress-test PayWallet under extreme concurrency and validate ledger mathematical consistency in real time.

---

## 🚀 Prerequisites & Installation

### Install k6
- **Windows (Chocolatey)**:
  ```powershell
  choco install k6
  ```
- **macOS (Homebrew)**:
  ```bash
  brew install k6
  ```
- **Linux (Debian/Ubuntu)**:
  ```bash
  sudo gpg -k
  sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
  echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
  sudo apt-get update && sudo apt-get install k6
  ```

---

## 📊 Available Benchmarks

### 1. High-Throughput Concurrent Transfers (`transfer_load_test.js`)
- **Profile**: Ramps from 0 to 100 concurrent Virtual Users (VUs) executing transfers across randomly selected wallet pairs.
- **Invariants Checked**:
  - `p95` response latency < 500ms
  - `p99` response latency < 1,000ms
  - Error rate < 1%
  - **Automated Post-Test Ledger Audit**: Calls `/recon/run` at teardown to verify that $\sum \text{Debits} == \sum \text{Credits}$ across all transfers and that zero balance discrepancies exist.

**Run**:
```bash
k6 run k6/transfer_load_test.js
```

### 2. High-Concurrency Idempotency Race (`idempotency_stress_test.js`)
- **Profile**: 50 concurrent VUs hit `/wallets/{id}/topup` with the exact same `Idempotency-Key` header simultaneously.
- **Invariants Checked**:
  - Exactly **one** top-up is processed ($10,000 paise).
  - Subsequent requests either replay the completed response or fail fast with `409 Conflict`.
  - Final wallet balance is strictly verified: $10,000 paise (zero duplicate credits).

**Run**:
```bash
k6 run k6/idempotency_stress_test.js
```

---

## 📈 Real-Time Observability (Prometheus & Grafana)

1. Start all infrastructure components:
   ```bash
   docker compose up -d
   ```
2. Start PayWallet:
   ```bash
   .\mvnw.cmd spring-boot:run
   ```
3. Open Grafana:
   - **URL**: [http://localhost:3001](http://localhost:3001)
   - **Username / Password**: `admin` / `admin`
   - **Pre-provisioned Dashboard**: Navigate to **Dashboards** $\to$ **PayWallet** $\to$ **PayWallet - High-Concurrency Ledger & Observability**.
4. Run k6 with real-time Prometheus streaming:
   ```bash
   k6 run --out experimental-prometheus-rw=http://localhost:9090/api/v1/write k6/transfer_load_test.js
   ```

---

## 🎯 Sample Benchmark Results

```
     ✓ Register success
     ✓ Wallet created
     ✓ Top-up funded
     ✓ Transfer status 200 OK
     ✓ Zero balance discrepancies

     checks.........................: 100.00% ✓ 18420       ✗ 0
     http_req_duration..............: avg=34.2ms  min=4.1ms  med=22.6ms  max=342.1ms p(95)=78.4ms p(99)=142.0ms
     http_req_failed................: 0.00%   ✓ 0           ✗ 18420
     http_reqs......................: 18420   204.66/s
```
