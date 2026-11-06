export interface RateLimitOptions { windowMs?: number; maxEntries?: number }

/** A bounded, per-process fixed-window limiter. Use a shared store before horizontal scaling. */
export function createRateLimiter(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 60_000;
  const maxEntries = options.maxEntries ?? 10_000;
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return (key: string, maximum: number, now = Date.now()): boolean => {
    const normalizedKey = key.slice(0, 256) || 'unknown';
    let entry = buckets.get(normalizedKey);
    if (!entry || entry.resetAt <= now) {
      if (buckets.size >= maxEntries) {
        for (const [candidate, bucket] of buckets) {
          if (bucket.resetAt <= now) buckets.delete(candidate);
        }
        if (buckets.size >= maxEntries) {
          const oldestKey = buckets.keys().next().value;
          if (oldestKey !== undefined) buckets.delete(oldestKey);
        }
      }
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(normalizedKey, entry);
    }
    entry.count += 1;
    return entry.count <= maximum;
  };
}

export function applySecurityHeaders(_req: unknown, res: { setHeader(name: string, value: string): void }, next: () => void) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
}
