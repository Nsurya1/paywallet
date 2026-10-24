import http from 'k6/http';
import { check } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  scenarios: {
    concurrent_identical_requests: {
      executor: 'shared-iterations',
      vus: 50,
      iterations: 50,
      maxDuration: '20s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'], // Max 5% unexpected failure rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8085';

export function setup() {
  console.log('--- Setting up Idempotency Race Test ---');
  const username = `k6_idem_${uuidv4().substring(0, 8)}`;
  const email = `${username}@paywallet.com`;
  const password = 'StrongP@ssw0rd123';

  // 1. Register User
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

  // Shared idempotency key for all parallel iterations
  const sharedKey = `shared-idem-key-${uuidv4()}`;

  return { token, walletId, sharedKey };
}

export default function (data) {
  const payload = JSON.stringify({
    amount: 10000,
    paymentMethod: 'UPI',
  });

  // All 50 virtual users send the EXACT SAME key simultaneously
  const res = http.post(
    `${BASE_URL}/wallets/${data.walletId}/topup`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}`,
        'Idempotency-Key': data.sharedKey,
      },
    }
  );

  check(res, {
    'Status is 200 OK or 409 In-Flight': (r) => r.status === 200 || r.status === 409,
    'Consistent payload response if 200': (r) => {
      if (r.status === 200) {
        return r.json('amount') === 10000;
      }
      return true;
    },
  });
}

export function teardown(data) {
  // Query final wallet balance: must be EXACTLY 10,000 (1 single topup applied)!
  const res = http.get(
    `${BASE_URL}/wallets/${data.walletId}`,
    {
      headers: {
        'Authorization': `Bearer ${data.token}`,
      },
    }
  );

  check(res, {
    'Only ONE debit/credit occurred': (r) => r.json('balance') === 10000,
  });

  console.log(`Final Wallet Balance: ${res.json('balance')} paise (Expected exactly 10,000 paise).`);
}
