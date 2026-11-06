import type { UserRecord, RunRecord, InterventionRecord } from './storage-json';
import { createHash } from 'node:crypto';

export type { UserRecord, SessionRecord, RunRecord, InterventionRecord } from './storage-json';

const hasSupabaseUrl = Boolean(process.env.SUPABASE_URL);
const hasSupabaseKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
if (hasSupabaseUrl !== hasSupabaseKey) {
  throw new Error('Configure both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or neither to use local JSON storage.');
}

const backend = hasSupabaseUrl
  ? await import('./storage-postgres')
  : await import('./storage-json');

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const hashToken = (token: string) => createHashToken(token);
const createHashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const registerUser = (email: string, password: string): Promise<UserRecord> => backend.registerUser(email, password);
export const authenticateUser = (email: string, password: string): Promise<UserRecord | null> => backend.authenticateUser(email, password);
export const createSession = (userId: string): Promise<{ token: string; expiresAt: number }> => backend.createSession(userId);
export const findSession = (token: string): Promise<UserRecord | null> => backend.findSession(token);
export const revokeSession = (token: string): Promise<void> => backend.revokeSession(token);
export const saveRun = (ownerId: string, input: Omit<RunRecord, 'ownerId' | 'createdAt' | 'updatedAt'>): Promise<RunRecord> => backend.saveRun(ownerId, input);
export const listRuns = (ownerId: string): Promise<Omit<RunRecord, 'snapshot' | 'manifest'>[]> => backend.listRuns(ownerId);
export const getRun = (ownerId: string, runId: string): Promise<RunRecord | null> => backend.getRun(ownerId, runId);
export const deleteRun = (ownerId: string, runId: string): Promise<boolean> => backend.deleteRun(ownerId, runId);
export const appendIntervention = (record: InterventionRecord): Promise<void> => backend.appendIntervention(record);
export const listInterventions = (ownerId: string, runId: string): Promise<InterventionRecord[]> => backend.listInterventions(ownerId, runId);
export const storageHealth = (): Promise<{ schemaVersion: number; users: number; runs: number }> => backend.storageHealth();
