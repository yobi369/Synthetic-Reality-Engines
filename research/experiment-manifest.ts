export interface ManifestIntervention {
  readonly id: string;
  readonly tick: number;
  readonly epoch: number;
  readonly action: string;
  readonly parameters: Readonly<Record<string, unknown>>;
}

export interface ExperimentManifestInput {
  readonly experimentId: string;
  readonly sourceRevision: string;
  readonly engineVersion: string;
  readonly preset: string;
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly seed: number;
  readonly interventions: readonly ManifestIntervention[];
  readonly tickHorizon: number;
  readonly operationSequence: readonly string[];
  readonly analysisVersion: string;
  readonly runtime: { readonly name: string; readonly version: string; readonly platform: string; readonly architecture: string };
  readonly createdAt?: string;
}

export interface ExperimentManifest extends ExperimentManifestInput {
  readonly schemaVersion: 1;
  readonly createdAt: string;
  readonly digest: string;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map(key => [key, stableValue(record[key])]));
  }
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Manifest values must contain only finite numbers.');
  if (typeof value === 'bigint' || typeof value === 'function' || typeof value === 'symbol' || value === undefined) throw new Error('Manifest contains a non-JSON value.');
  return value;
}

export function canonicalManifestJson(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

async function digestManifest(payload: Omit<ExperimentManifest, 'digest'>): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalManifestJson(payload));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createExperimentManifest(input: ExperimentManifestInput): Promise<ExperimentManifest> {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(input.experimentId)) throw new Error('Invalid experiment ID.');
  if (!/^[a-f0-9]{7,64}$/i.test(input.sourceRevision)) throw new Error('Source revision must be a Git commit SHA.');
  if (!input.engineVersion.trim() || input.engineVersion.length > 80) throw new Error('Invalid engine version.');
  if (!input.preset.trim() || input.preset.length > 100) throw new Error('Invalid preset.');
  if (!Number.isInteger(input.seed) || input.seed < 0 || input.seed > 0xffffffff) throw new Error('Seed must be an unsigned 32-bit integer.');
  if (!Number.isSafeInteger(input.tickHorizon) || input.tickHorizon < 0) throw new Error('Tick horizon must be a non-negative safe integer.');
  if (!Array.isArray(input.interventions) || input.interventions.length > 100_000) throw new Error('Intervention ledger exceeds the supported limit.');
  if (!Array.isArray(input.operationSequence) || input.operationSequence.length > 10_000) throw new Error('Operation sequence exceeds the supported limit.');
  if (input.interventions.some((event, index) => !event.id || event.id.length > 120 || !Number.isSafeInteger(event.tick) || event.tick < 0 || event.tick > input.tickHorizon || !Number.isSafeInteger(event.epoch) || event.epoch < 1 || !/^[a-z][a-z0-9_.-]{1,79}$/.test(event.action) || (index > 0 && event.tick < input.interventions[index - 1].tick))) {
    throw new Error('Interventions must be valid and ordered by non-decreasing tick.');
  }
  if (new Set(input.interventions.map(event => event.id)).size !== input.interventions.length) throw new Error('Intervention IDs must be unique.');
  if (input.operationSequence.some(operation => typeof operation !== 'string' || !operation.trim() || operation.length > 120)) throw new Error('Invalid operation sequence entry.');
  for (const field of [input.runtime.name, input.runtime.version, input.runtime.platform, input.runtime.architecture]) {
    if (typeof field !== 'string' || !field.trim() || field.length > 100) throw new Error('Invalid runtime metadata.');
  }

  const payload: Omit<ExperimentManifest, 'digest'> = {
    schemaVersion: 1,
    experimentId: input.experimentId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    sourceRevision: input.sourceRevision.toLowerCase(),
    engineVersion: input.engineVersion,
    preset: input.preset,
    configuration: JSON.parse(canonicalManifestJson(input.configuration)),
    seed: input.seed,
    interventions: JSON.parse(canonicalManifestJson(input.interventions)),
    tickHorizon: input.tickHorizon,
    operationSequence: [...input.operationSequence],
    analysisVersion: input.analysisVersion,
    runtime: { ...input.runtime },
  };
  return { ...payload, digest: await digestManifest(payload) };
}

export async function verifyExperimentManifest(manifest: ExperimentManifest): Promise<boolean> {
  if (!manifest || manifest.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(manifest.digest)) return false;
  const { digest, ...payload } = manifest;
  try { return await digestManifest(payload) === digest; } catch { return false; }
}
