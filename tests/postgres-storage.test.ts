import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

let storage: typeof import('../server/storage-postgres');
const originalFetch = globalThis.fetch;
const originalUrl = process.env.SUPABASE_URL;
const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let requests: Array<{ url: string; init: RequestInit }> = [];

beforeAll(async () => {
  process.env.SUPABASE_URL = 'https://isolated-test-project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-server-only-service-role-key';
  storage = await import('../server/storage-postgres');
});

beforeEach(() => { requests = []; });

afterAll(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
});

function stubFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    requests.push({ url, init });
    return handler(url, init);
  }) as typeof fetch;
}

const runRow = {
  id: 'run-1', owner_id: 'owner-1', name: 'Test run', preset: 'civilization',
  seed: 17, tick: 12, snapshot: { tick: 12 }, manifest: null,
  created_at: '2026-11-06T00:00:00.000Z', updated_at: '2026-11-06T00:01:00.000Z',
};

describe('Supabase PostgreSQL storage adapter', () => {
  test('upserts run snapshots with owner-scoped conflict keys and server-only credentials', async () => {
    stubFetch(() => new Response(JSON.stringify([runRow]), { status: 201, headers: { 'content-type': 'application/json' } }));
    const saved = await storage.saveRun('owner-1', {
      id: 'run-1', name: 'Test run', preset: 'civilization', seed: 17, tick: 12, snapshot: { tick: 12 },
    });
    expect(saved.ownerId).toBe('owner-1');
    expect(saved.snapshot).toEqual({ tick: 12 });
    expect(requests[0].url).toContain('on_conflict=owner_id,id');
    expect(requests[0].init.headers).toMatchObject({
      apikey: 'test-server-only-service-role-key',
      authorization: 'Bearer test-server-only-service-role-key',
      Prefer: 'resolution=merge-duplicates,return=representation',
    });
  });

  test('scopes run reads to the authenticated owner and run identifier', async () => {
    stubFetch(() => new Response(JSON.stringify([runRow]), { status: 200, headers: { 'content-type': 'application/json' } }));
    const result = await storage.getRun('owner-1', 'run-1');
    expect(result?.id).toBe('run-1');
    expect(requests[0].url).toContain('owner_id=eq.owner-1');
    expect(requests[0].url).toContain('id=eq.run-1');
  });

  test('writes interventions idempotently using the composite owner/run/event key', async () => {
    stubFetch(() => new Response(null, { status: 204 }));
    await storage.appendIntervention({
      id: 'event-1', runId: 'run-1', ownerId: 'owner-1', tick: 4, epoch: 1,
      action: 'simulation.pause', parameters: {}, recordedAt: '2026-11-06T00:00:00.000Z',
    });
    expect(requests[0].url).toContain('on_conflict=owner_id,run_id,id');
    expect(requests[0].init.headers).toMatchObject({
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    });
  });

  test('reports database-backed health counts from PostgREST content-range headers', async () => {
    stubFetch((url) => new Response('[]', {
      status: 200,
      headers: { 'content-type': 'application/json', 'content-range': url.includes('sre_users') ? '*/3' : '*/8' },
    }));
    expect(await storage.storageHealth()).toEqual({ schemaVersion: 4, users: 3, runs: 8 });
    expect(requests).toHaveLength(2);
  });
  test('uses the atomic shared PostgreSQL RPC for distributed rate limiting', async () => {
    stubFetch(() => new Response('true', { status: 200, headers: { 'content-type': 'application/json' } }));
    expect(await storage.consumeRateLimit('login:203.0.113.10', 10, 60_000)).toBe(true);
    expect(requests[0].url).toContain('/rpc/sre_consume_rate_limit');
    const body = JSON.parse(String(requests[0].init.body));
    expect(body.p_maximum).toBe(10);
    expect(body.p_bucket_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(body.p_bucket_hash).not.toContain('203.0.113.10');
  });

});
