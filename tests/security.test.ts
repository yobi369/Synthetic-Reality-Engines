import { describe, expect, test } from 'bun:test';
import { applySecurityHeaders, createRateLimiter } from '../server/security';

describe('HTTP security helpers', () => {
  test('enforces a fixed window and resets after expiry', () => {
    const limit = createRateLimiter({ windowMs: 100, maxEntries: 10 });
    expect(limit('client-a', 2, 1_000)).toBe(true);
    expect(limit('client-a', 2, 1_001)).toBe(true);
    expect(limit('client-a', 2, 1_002)).toBe(false);
    expect(limit('client-a', 2, 1_101)).toBe(true);
  });

  test('bounds retained client keys under high-cardinality traffic', () => {
    const limit = createRateLimiter({ windowMs: 60_000, maxEntries: 3 });
    expect(limit('a', 10, 1_000)).toBe(true);
    expect(limit('b', 10, 1_000)).toBe(true);
    expect(limit('c', 10, 1_000)).toBe(true);
    expect(limit('d', 10, 1_000)).toBe(true);
  });

  test('sets baseline browser security headers', () => {
    const headers = new Map<string, string>();
    let continued = false;
    applySecurityHeaders({}, { setHeader: (name, value) => headers.set(name, value) }, () => { continued = true; });
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('X-Frame-Options')).toBe('DENY');
    expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(continued).toBe(true);
  });
});
