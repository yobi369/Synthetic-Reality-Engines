import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const scrypt = promisify(scryptCallback);
const SCHEMA_VERSION = 2;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export interface UserRecord { id: string; email: string; passwordSalt: string; passwordHash: string; createdAt: string }
export interface SessionRecord { tokenHash: string; userId: string; expiresAt: number }
export interface RunRecord {
  id: string; ownerId: string; name: string; preset: string; seed: number; tick: number;
  snapshot: unknown; createdAt: string; updatedAt: string;
}
export interface InterventionRecord {
  id: string; runId: string; ownerId: string; tick: number; epoch: number;
  action: string; parameters: Record<string, unknown>; recordedAt: string;
}
interface StoreV1 { schemaVersion: 1; users: UserRecord[]; sessions: SessionRecord[]; runs: RunRecord[] }
interface StoreV2 { schemaVersion: 2; users: UserRecord[]; sessions: SessionRecord[]; runs: RunRecord[]; interventions: InterventionRecord[] }
type Store = StoreV2;

const dataDirectory = path.resolve(process.env.DATA_DIR || './data');
const storePath = path.join(dataDirectory, 'synthetic-reality-store.json');
let writeQueue: Promise<void> = Promise.resolve();

function emptyStore(): Store { return { schemaVersion: SCHEMA_VERSION, users: [], sessions: [], runs: [], interventions: [] }; }

async function migrate(raw: any): Promise<Store> {
  if (!raw || typeof raw !== 'object') return emptyStore();
  if (raw.schemaVersion === 1) {
    const migrated: Store = { schemaVersion: 2, users: raw.users || [], sessions: raw.sessions || [], runs: raw.runs || [], interventions: [] };
    await persist(migrated);
    return migrated;
  }
  if (raw.schemaVersion === SCHEMA_VERSION && Array.isArray(raw.users) && Array.isArray(raw.sessions) && Array.isArray(raw.runs) && Array.isArray(raw.interventions)) return raw as Store;
  throw new Error('Unsupported or corrupt storage schema. Back up the data file before upgrading.');
}

async function persist(store: Store): Promise<void> {
  await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  const temporary = storePath + '.tmp';
  await writeFile(temporary, JSON.stringify(store), { mode: 0o600 });
  await rename(temporary, storePath);
}

async function readStore(): Promise<Store> {
  try { return await migrate(JSON.parse(await readFile(storePath, 'utf8'))); }
  catch (error: any) { if (error?.code === 'ENOENT') { const initial = emptyStore(); await persist(initial); return initial; } throw error; }
}

async function mutate<T>(operation: (store: Store) => T | Promise<T>): Promise<T> {
  let release!: () => void;
  const previous = writeQueue;
  writeQueue = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try { const store = await readStore(); const result = await operation(store); await persist(store); return result; }
  finally { release(); }
}

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function registerUser(emailInput: string, password: string): Promise<UserRecord> {
  const email = normalizeEmail(emailInput);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (password.length < 12 || password.length > 256) throw new Error('Password must be 12–256 characters.');
  return mutate(async store => {
    if (store.users.some(user => user.email === email)) throw new Error('An account with this email already exists.');
    const salt = randomBytes(16);
    const derived = await scrypt(password, salt, 64) as Buffer;
    const user: UserRecord = { id: randomBytes(16).toString('hex'), email, passwordSalt: salt.toString('hex'), passwordHash: derived.toString('hex'), createdAt: new Date().toISOString() };
    store.users.push(user);
    return user;
  });
}

export async function authenticateUser(emailInput: string, password: string): Promise<UserRecord | null> {
  const email = normalizeEmail(emailInput);
  const store = await readStore();
  const user = store.users.find(item => item.email === email);
  if (!user) { await scrypt(password, Buffer.alloc(16), 64); return null; }
  const actual = await scrypt(password, Buffer.from(user.passwordSalt, 'hex'), 64) as Buffer;
  const expected = Buffer.from(user.passwordHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? user : null;
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: number }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await mutate(store => {
    store.sessions = store.sessions.filter(session => session.expiresAt > Date.now());
    store.sessions.push({ tokenHash: hashToken(token), userId, expiresAt });
  });
  return { token, expiresAt };
}

export async function findSession(token: string): Promise<UserRecord | null> {
  const store = await readStore();
  const session = store.sessions.find(item => item.tokenHash === hashToken(token) && item.expiresAt > Date.now());
  return session ? store.users.find(user => user.id === session.userId) || null : null;
}

export async function revokeSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await mutate(store => { store.sessions = store.sessions.filter(item => item.tokenHash !== tokenHash); });
}

export async function saveRun(ownerId: string, input: Omit<RunRecord, 'ownerId' | 'createdAt' | 'updatedAt'>): Promise<RunRecord> {
  return mutate(store => {
    const existing = store.runs.find(run => run.id === input.id && run.ownerId === ownerId);
    const now = new Date().toISOString();
    const run: RunRecord = { ...input, ownerId, createdAt: existing?.createdAt || now, updatedAt: now };
    if (existing) Object.assign(existing, run); else store.runs.push(run);
    return run;
  });
}
export async function listRuns(ownerId: string): Promise<Omit<RunRecord, 'snapshot'>[]> {
  const store = await readStore();
  return store.runs.filter(run => run.ownerId === ownerId).map(({ snapshot, ...metadata }) => metadata);
}
export async function getRun(ownerId: string, runId: string): Promise<RunRecord | null> {
  const store = await readStore();
  return store.runs.find(run => run.id === runId && run.ownerId === ownerId) || null;
}
export async function deleteRun(ownerId: string, runId: string): Promise<boolean> {
  return mutate(store => {
    const index = store.runs.findIndex(run => run.id === runId && run.ownerId === ownerId);
    if (index < 0) return false;
    store.runs.splice(index, 1);
    store.interventions = store.interventions.filter(item => item.runId !== runId || item.ownerId !== ownerId);
    return true;
  });
}
export async function appendIntervention(record: InterventionRecord): Promise<void> {
  await mutate(store => { store.interventions.push(record); });
}
export async function listInterventions(ownerId: string, runId: string): Promise<InterventionRecord[]> {
  const store = await readStore();
  return store.interventions.filter(item => item.ownerId === ownerId && item.runId === runId);
}
export async function storageHealth(): Promise<{ schemaVersion: number; users: number; runs: number }> {
  const store = await readStore();
  return { schemaVersion: store.schemaVersion, users: store.users.length, runs: store.runs.length };
}
