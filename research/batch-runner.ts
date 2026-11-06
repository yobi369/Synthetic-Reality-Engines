import { SimulationEngine } from '../src/engine/SimulationEngine';
import type { WorldPresetId } from '../src/types/simulation';
import { summarize } from './statistics';

export interface BatchRunResult {
  seed: number;
  ticks: number;
  population: number;
  totalWealth: number;
  averageHealth: number;
  resourceAbundance: number;
  elapsedMs: number;
  ticksPerSecond: number;
}

export interface BatchExperimentReport {
  schemaVersion: 1;
  preset: WorldPresetId;
  requestedTicks: number;
  createdAt: string;
  runs: BatchRunResult[];
  aggregate: {
    population: ReturnType<typeof summarize>;
    totalWealth: ReturnType<typeof summarize>;
    averageHealth: ReturnType<typeof summarize>;
    resourceAbundance: ReturnType<typeof summarize>;
    ticksPerSecond: ReturnType<typeof summarize>;
  };
}

export function runBatchExperiments(input: { preset: WorldPresetId; seeds: readonly number[]; ticks: number }): BatchExperimentReport {
  if (input.seeds.length < 2 || input.seeds.length > 100) throw new Error('Batch runs require between 2 and 100 seeds.');
  if (new Set(input.seeds).size !== input.seeds.length || input.seeds.some(seed => !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)) throw new Error('Seeds must be unique unsigned 32-bit integers.');
  if (!Number.isSafeInteger(input.ticks) || input.ticks < 1 || input.ticks > 100_000) throw new Error('Ticks must be between 1 and 100,000.');

  const runs = input.seeds.map(seed => {
    const engine = new SimulationEngine(input.preset, seed);
    const started = performance.now();
    for (let tick = 0; tick < input.ticks; tick += 1) engine.worldStep();
    const elapsedMs = Math.max(0.001, performance.now() - started);
    const totalWealth = engine.agents.reduce((sum, agent) => sum + agent.wealth, 0);
    const averageHealth = engine.agents.length ? engine.agents.reduce((sum, agent) => sum + agent.health, 0) / engine.agents.length : 0;
    const resourceAbundance = engine.resources.reduce((sum, resource) => sum + resource.amount, 0);
    return {
      seed, ticks: engine.tick, population: engine.agents.length, totalWealth, averageHealth,
      resourceAbundance, elapsedMs, ticksPerSecond: engine.tick / (elapsedMs / 1_000),
    };
  });

  return {
    schemaVersion: 1, preset: input.preset, requestedTicks: input.ticks, createdAt: new Date().toISOString(), runs,
    aggregate: {
      population: summarize(runs.map(run => run.population)),
      totalWealth: summarize(runs.map(run => run.totalWealth)),
      averageHealth: summarize(runs.map(run => run.averageHealth)),
      resourceAbundance: summarize(runs.map(run => run.resourceAbundance)),
      ticksPerSecond: summarize(runs.map(run => run.ticksPerSecond)),
    },
  };
}
