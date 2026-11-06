import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import type { UserRecord, SessionRecord, RunRecord, InterventionRecord } from './storage-json';

const scrypt = promisify(scryptCallback);
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const baseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!baseUrl || !serviceKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are both required for PostgreSQL storage.');

type DbRow = Record<string, any>;
type RestResult<T> = { data: T; headers: Headers };

async function rest<T>(table: string, query = '', init: RequestInit = {}): Promise<RestResult<T>> {
  const response = await fetch(`${baseUrl}/rest/v1/${table}${query}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const raw = response.status === 204 ? '' : await response.text();
  if (!response.ok) {
    let detail = raw;
    try { detail = JSON.parse(raw)?.message || JSON.parse(raw)?.hint || raw; } catch { /* retain response text */ }
    throw new Error(`PostgreSQL storage request failed (${response.status}): ${String(detail).slice(0, 240)}`);
  }
  return { data: (raw ? JSON.parse(raw) : null) as T, headers: response.headers };
}

const enc = (value: string) => encodeURIComponent(value);
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const toUser = (row: DbRow): UserRecord => ({
  id: row.id, email: row.email, passwordSalt: row.password_salt,
  passwordHash: row.password_hash, createdAt: row.created_at,
});
const toRun = (row: DbRow): RunRecord => ({
  id: row.id, ownerId: row.owner_id, name: row.name, preset: row.preset,
  seed: Number(row.seed), tick: Number(row.tick), snapshot: row.snapshot,
  manifest: row.manifest ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at,
});
const toIntervention = (row: DbRow): InterventionRecord => ({
  id: row.id, runId: row.run_id, ownerId: row.owner_id, tick: Number(row.tick),
  epoch: Number(row.epoch), action: row.action, parameters: row.parameters,
  recordedAt: row.recorded_at,
});

export async function registerUser(emailInput: string, password: string): Promise<UserRecord> {
  const email = normalizeEmail(emailInput);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (password.length < 12 || password.length > 256) throw new Error('Password must be 12–256 characters.');
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64) as Buffer;
  const user: UserRecord = {
    id: randomBytes(16).toString('hex'), email, passwordSalt: salt.toString('hex'),
    passwordHash: derived.toString('hex'), createdAt: new Date().toISOString(),
  };
  try {
    await rest<DbRow[]>('sre_users', '', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ id: user.id, email, password_salt: user.passwordSalt, password_hash: user.passwordHash }),
    });
  } catch (error) {
    if (String(error).includes('23505') || String(error).toLowerCase().includes('duplicate')) throw new Error('An account with this email already exists.');
    throw error;
  }
  return user;
}

export async function authenticateUser(emailInput: string, password: string): Promise<UserRecord | null> {
  const email = normalizeEmail(emailInput);
  if (email.length > 254 || password.length > 256) return null;
  const { data } = await rest<DbRow[]>('sre_users', `?email=eq.${enc(email)}&select=*&limit=1`);
  const row = data[0];
  if (!row) { await scrypt(password, Buffer.alloc(16), 64); return null; }
  const actual = await scrypt(password, Buffer.from(row.password_salt, 'hex'), 64) as Buffer;
  const expected = Buffer.from(row.password_hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? toUser(row) : null;
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: number }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await rest('sre_sessions', `?expires_at=lt.${enc(new Date().toISOString())}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  await rest('sre_sessions', '', {
    method: 'POST', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ token_hash: hashToken(token), user_id: userId, expires_at: new Date(expiresAt).toISOString() }),
  });
  return { token, expiresAt };
}

export async function findSession(token: string): Promise<UserRecord | null> {
  const { data: sessions } = await rest<DbRow[]>('sre_sessions', `?token_hash=eq.${enc(hashToken(token))}&expires_at=gt.${enc(new Date().toISOString())}&select=user_id&limit=1`);
  if (!sessions[0]) return null;
  const { data: users } = await rest<DbRow[]>('sre_users', `?id=eq.${enc(sessions[0].user_id)}&select=*&limit=1`);
  return users[0] ? toUser(users[0]) : null;
}

export async function revokeSession(token: string): Promise<void> {
  await rest('sre_sessions', `?token_hash=eq.${enc(hashToken(token))}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
}

export async function saveRun(ownerId: string, input: Omit<RunRecord, 'ownerId' | 'createdAt' | 'updatedAt'>): Promise<RunRecord> {
  const { data } = await rest<DbRow[]>('sre_runs', '?on_conflict=owner_id,id', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      id: input.id, owner_id: ownerId, name: input.name, preset: input.preset,
      seed: input.seed, tick: input.tick, snapshot: input.snapshot,
      manifest: input.manifest ?? null, updated_at: new Date().toISOString(),
    }),
  });
  if (!data[0]) throw new Error('Database did not return the saved run.');
  return toRun(data[0]);
}

export async function listRuns(ownerId: string): Promise<Omit<RunRecord, 'snapshot' | 'manifest'>[]> {
  const { data } = await rest<DbRow[]>('sre_runs', `?owner_id=eq.${enc(ownerId)}&select=id,owner_id,name,preset,seed,tick,created_at,updated_at&order=updated_at.desc`);
  return data.map(row => {
    const { snapshot: _snapshot, manifest: _manifest, ...metadata } = toRun({ ...row, snapshot: null });
    return metadata;
  });
}

export async function getRun(ownerId: string, runId: string): Promise<RunRecord | null> {
  const { data } = await rest<DbRow[]>('sre_runs', `?owner_id=eq.${enc(ownerId)}&id=eq.${enc(runId)}&select=*&limit=1`);
  return data[0] ? toRun(data[0]) : null;
}

export async function deleteRun(ownerId: string, runId: string): Promise<boolean> {
  const { data } = await rest<DbRow[]>('sre_runs', `?owner_id=eq.${enc(ownerId)}&id=eq.${enc(runId)}&select=id`, {
    method: 'DELETE', headers: { Prefer: 'return=representation' },
  });
  return data.length > 0;
}

export async function appendIntervention(record: InterventionRecord): Promise<void> {
  await rest('sre_interventions', '?on_conflict=owner_id,run_id,id', {
    method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({
      id: record.id, run_id: record.runId, owner_id: record.ownerId, tick: record.tick,
      epoch: record.epoch, action: record.action, parameters: record.parameters,
      recorded_at: record.recordedAt,
    }),
  });
}

export async function listInterventions(ownerId: string, runId: string): Promise<InterventionRecord[]> {
  const { data } = await rest<DbRow[]>('sre_interventions', `?owner_id=eq.${enc(ownerId)}&run_id=eq.${enc(runId)}&select=*&order=tick.asc,recorded_at.asc`);
  return data.map(toIntervention);
}

export async function storageHealth(): Promise<{ schemaVersion: number; users: number; runs: number }> {
  const [users, runs] = await Promise.all([
    rest<DbRow[]>('sre_users', '?select=id&limit=0', { headers: { Prefer: 'count=exact' } }),
    rest<DbRow[]>('sre_runs', '?select=id&limit=0', { headers: { Prefer: 'count=exact' } }),
  ]);
  const count = (headers: Headers) => Number((headers.get('content-range') || '').split('/')[1] || 0);
  return { schemaVersion: 4, users: count(users.headers), runs: count(runs.headers) };
}
