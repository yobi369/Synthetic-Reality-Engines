import { describe, expect, test } from 'bun:test';
import { EventEmitter } from 'node:events';
import { applySecurityHeaders, createClientDisconnectSignal, createRateLimiter } from '../server/security';

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
    expect(limit('d', 10, 1_000)).toBe(false);
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
  test('aborts upstream work when the client disconnects', () => {
    const response = Object.assign(new EventEmitter(), { writableEnded: false });
    const signal = createClientDisconnectSignal(response, 1_000);
    response.emit('close');
    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBeInstanceOf(DOMException);
  });

  test('does not abort a normally completed response', () => {
    const response = Object.assign(new EventEmitter(), { writableEnded: true });
    const signal = createClientDisconnectSignal(response, 1_000);
    response.emit('finish');
    response.emit('close');
    expect(signal.aborted).toBe(false);
  });
});
