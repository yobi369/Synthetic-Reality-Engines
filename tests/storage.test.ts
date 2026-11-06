import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

let storage: typeof import('../server/storage');
let directory = '';

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'sre-storage-'));
  process.env.DATA_DIR = directory;
  storage = await import('../server/storage');
});

afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe('server-side identity and private run storage', () => {
  test('registers accounts, hashes sessions and rejects invalid credentials', async () => {
    const user = await storage.registerUser('Researcher@example.org', 'a-long-test-password-123');
    expect(user.email).toBe('researcher@example.org');
    expect(user.passwordHash).not.toBe('a-long-test-password-123');
    expect(await storage.authenticateUser(user.email, 'wrong-password')).toBeNull();
    expect((await storage.authenticateUser(user.email, 'a-long-test-password-123'))?.id).toBe(user.id);
    const session = await storage.createSession(user.id);
    expect((await storage.findSession(session.token))?.id).toBe(user.id);
    await storage.revokeSession(session.token);
    expect(await storage.findSession(session.token)).toBeNull();
  });

  test('isolates saved runs and audit records by account owner', async () => {
    const alice = await storage.registerUser('alice@example.org', 'alice-test-password-123');
    const bob = await storage.registerUser('bob@example.org', 'bob-test-password-123');
    await storage.saveRun(alice.id, { id: 'run-a', name: 'Private', preset: 'civilization', seed: 7, tick: 0, snapshot: { tick: 0 } });
    expect(await storage.getRun(bob.id, 'run-a')).toBeNull();
    expect(await storage.listRuns(bob.id)).toHaveLength(0);
    await storage.appendIntervention({ id: 'evt-1', runId: 'run-a', ownerId: alice.id, tick: 1, epoch: 1, action: 'test.event', parameters: {}, recordedAt: new Date().toISOString() });
    expect(await storage.listInterventions(bob.id, 'run-a')).toHaveLength(0);
    expect(await storage.listInterventions(alice.id, 'run-a')).toHaveLength(1);
  });

  test('migrates version-one stores to version three without losing existing records', async () => {
    const legacy = { schemaVersion: 1, users: [], sessions: [], runs: [] };
    await writeFile(path.join(directory, 'synthetic-reality-store.json'), JSON.stringify(legacy));
    const health = await storage.storageHealth();
    expect(health.schemaVersion).toBe(3);
    const migrated = JSON.parse(await readFile(path.join(directory, 'synthetic-reality-store.json'), 'utf8'));
    expect(migrated.interventions).toEqual([]);
  });

  test('migrates version-two stores to version three while retaining intervention records', async () => {
    const legacy = { schemaVersion: 2, users: [], sessions: [], runs: [], interventions: [{ id: 'legacy-event' }] };
    await writeFile(path.join(directory, 'synthetic-reality-store.json'), JSON.stringify(legacy));
    const health = await storage.storageHealth();
    expect(health.schemaVersion).toBe(3);
    const migrated = JSON.parse(await readFile(path.join(directory, 'synthetic-reality-store.json'), 'utf8'));
    expect(migrated.interventions).toEqual([{ id: 'legacy-event' }]);
  });

  test('persists optional experiment manifests with saved runs', async () => {
    const user = await storage.registerUser('manifest@example.org', 'manifest-test-password-123');
    const manifest = { schemaVersion: 1, digest: 'a'.repeat(64) };
    await storage.saveRun(user.id, { id: 'manifest-run', name: 'Manifest run', preset: 'civilization', seed: 12, tick: 5, snapshot: { tick: 5 }, manifest });
    expect((await storage.getRun(user.id, 'manifest-run'))?.manifest).toEqual(manifest);
  });

  test('rejects duplicate accounts and weak passwords', async () => {
    await storage.registerUser('duplicate@example.org', 'strong-password-123');
    await expect(storage.registerUser('DUPLICATE@example.org', 'strong-password-123')).rejects.toThrow();
    await expect(storage.registerUser('weak@example.org', 'short')).rejects.toThrow();
  });
});
