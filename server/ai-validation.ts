type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function boundedText(value: unknown, maximum: number, optional = false): string | null {
  if (optional && (value === undefined || value === null || value === '')) return '';
  if (typeof value !== 'string' || value.length > maximum) return null;
  return value.trim();
}

export interface ChroniclerInput {
  worldName: string; epoch: number; population: number; factions: unknown[];
  topEvents: string[]; economicStats: JsonRecord; userPrompt: string;
}

export function validateChroniclerInput(value: unknown): ChroniclerInput | null {
  if (!isRecord(value)) return null;
  const worldName = boundedText(value.worldName, 100);
  const userPrompt = boundedText(value.userPrompt, 1_000, true);
  if (worldName === null || !worldName || userPrompt === null) return null;
  if (!Number.isSafeInteger(value.epoch) || (value.epoch as number) < 0 || (value.epoch as number) > 1_000_000_000) return null;
  if (!Number.isSafeInteger(value.population) || (value.population as number) < 0 || (value.population as number) > 1_000_000_000) return null;
  const factions = value.factions === undefined ? [] : value.factions;
  const topEvents = value.topEvents === undefined ? [] : value.topEvents;
  const economicStats = value.economicStats === undefined ? {} : value.economicStats;
  if (!Array.isArray(factions) || factions.length > 30 || JSON.stringify(factions).length > 12_000) return null;
  if (!Array.isArray(topEvents) || topEvents.length > 20 || topEvents.some(event => typeof event !== 'string' || event.length > 300)) return null;
  if (!isRecord(economicStats) || JSON.stringify(economicStats).length > 8_000) return null;
  return { worldName, epoch: value.epoch as number, population: value.population as number, factions, topEvents: topEvents as string[], economicStats, userPrompt };
}

export interface AgentThoughtInput {
  agent: Record<string, string | number>;
  surroundings: string;
  recentMemory: string;
}

export function validateAgentThoughtInput(value: unknown): AgentThoughtInput | null {
  if (!isRecord(value) || !isRecord(value.agent)) return null;
  const agent: Record<string, string | number> = {};
  for (const key of ['name', 'role', 'faction', 'goal'] as const) {
    const text = boundedText(value.agent[key], 100, true);
    if (text === null) return null;
    if (text) agent[key] = text;
  }
  for (const key of ['health', 'energy', 'wealth'] as const) {
    const number = value.agent[key];
    if (number !== undefined) {
      if (typeof number !== 'number' || !Number.isFinite(number) || Math.abs(number) > 1_000_000_000) return null;
      agent[key] = number;
    }
  }
  const surroundings = boundedText(value.surroundings, 1_000, true);
  const recentMemory = boundedText(value.recentMemory, 1_000, true);
  if (surroundings === null || recentMemory === null || JSON.stringify(value.agent).length > 4_000) return null;
  return { agent, surroundings, recentMemory };
}
