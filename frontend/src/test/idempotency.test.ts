import { describe, it, expect } from 'vitest';
import { generateIdempotencyKey } from '../lib/idempotency';

describe('idempotency utils', () => {
  it('generates a valid UUID v4 string', () => {
    const key = generateIdempotencyKey();
    expect(key).toBeDefined();
    expect(typeof key).toBe('string');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(key).toMatch(uuidRegex);
  });

  it('generates distinct keys on sequential invocations', () => {
    const key1 = generateIdempotencyKey();
    const key2 = generateIdempotencyKey();
    expect(key1).not.toBe(key2);
  });
});
