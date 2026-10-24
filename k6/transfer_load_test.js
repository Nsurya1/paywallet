import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Load Test Configuration
export const options = {
  stages: [
    { duration: '15s', target: 20 },  // Ramp up to 20 virtual users
    { duration: '30s', target: 50 },  // Ramp up to 50 virtual users
    { duration: '30s', target: 100 }, // Peak high-concurrency load (100 VUs)
    { duration: '15s', target: 0 },   // Graceful ramp down
  ],
  thresholds: {
    // 95% of requests must complete below 500ms; 99% below 1000ms
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    // Less than 1% request failure rate across entire run
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Setup phase: Provision test accounts and seed initial wallet balances
export function setup() {
  console.log('--- Initializing Load Test Environment ---');
  const accounts = [];
  const accountCount = 10;
  const initialTopUp = 1000000; // 10,000.00 INR (in minor units)

  for (let i = 0; i < accountCount; i++) {
    const username = `k6_user_${uuidv4().substring(0, 8)}`;
    const email = `${username}@paywallet.com`;
    const password = 'StrongP@ssw0rd123';

    // 1. Register
    const regRes = http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify({ username, email, password }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    check(regRes, { 'Register success': (r) => r.status === 201 });
    const token = regRes.json('accessToken');

    // 2. Create Wallet
    const walletRes = http.post(
      `${BASE_URL}/wallets`,
      JSON.stringify({ currency: 'INR' }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': uuidv4(),
        },
      }
    );
    check(walletRes, { 'Wallet created': (r) => r.status === 201 });
    const walletId = walletRes.json('id');

    // 3. Fund Initial Balance
    const topUpRes = http.post(
      `${BASE_URL}/wallets/${walletId}/topup`,
      JSON.stringify({ amount: initialTopUp, paymentMethod: 'CARD' }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': uuidv4(),
        },
      }
    );
    check(topUpRes, { 'Top-up funded': (r) => r.status === 200 });

    accounts.push({ username, token, walletId });
  }

  console.log(`Provisioned ${accounts.length} test accounts with funded balances.`);
  return { accounts, adminToken: accounts[0].token };
}

// Virtual User Execution Phase: Concurrent high-throughput transfers
export default function (data) {
  const accounts = data.accounts;
  const fromIndex = Math.floor(Math.random() * accounts.length);
  let toIndex = Math.floor(Math.random() * accounts.length);
  while (toIndex === fromIndex) {
    toIndex = Math.floor(Math.random() * accounts.length);
  }

  const sender = accounts[fromIndex];
  const receiver = accounts[toIndex];
  const amount = Math.floor(Math.random() * 500) + 50; // Random amount: 50 to 550 paise
  const idempotencyKey = uuidv4();

  const transferPayload = JSON.stringify({
    fromWalletId: sender.walletId,
    toWalletId: receiver.walletId,
    amount: amount,
    reference: `k6-bench-${idempotencyKey.substring(0, 8)}`,
  });

  const res = http.post(`${BASE_URL}/transfers`, transferPayload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sender.token}`,
      'Idempotency-Key': idempotencyKey,
    },
  });

  check(res, {
    'Transfer status 200 OK': (r) => r.status === 200,
    'Transfer response has id': (r) => r.json('id') !== undefined,
  });

  // Short realistic pause between user transactions
  sleep(0.05);
}

// Teardown Phase: Run mathematical ledger reconciliation to verify absolute consistency
export function teardown(data) {
  console.log('--- Executing Post-Benchmark Reconciliation Audit ---');
  const reconRes = http.post(
    `${BASE_URL}/recon/run`,
    null,
    {
      headers: {
        'Authorization': `Bearer ${data.adminToken}`,
      },
    }
  );

  const reconPassed = check(reconRes, {
    'Reconciliation status 200': (r) => r.status === 200,
    'Reconciliation COMPLETED': (r) => r.json('report.status') === 'COMPLETED',
    'Zero balance discrepancies': (r) => r.json('report.discrepancyCount') === 0,
  });

  if (reconPassed) {
    console.log('AUDIT VERIFIED: Zero discrepancies detected. ∑ Debits == ∑ Credits across all transfers.');
  } else {
    console.error('RECONCILIATION FAILED! Discrepancies detected:', reconRes.body);
  }
}
