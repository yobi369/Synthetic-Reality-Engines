import { SimulationEngine } from '../src/engine/SimulationEngine';
import type { WorldConfig, WorldPresetId } from '../src/types/simulation';
import { pearsonCorrelation, summarize, type SummaryStatistics } from './statistics';

export const SENSITIVITY_PARAMETERS = [
  'friction', 'gravity', 'dayCycleLength', 'resourceRegenMultiplier',
  'mutationRate', 'maxAgents', 'disasterFrequency',
] as const satisfies readonly (keyof WorldConfig)[];

export type SensitivityParameter = typeof SENSITIVITY_PARAMETERS[number];
export type SensitivityOverrides = Partial<Record<SensitivityParameter, number>>;

const METRICS = ['population', 'totalWealth', 'averageHealth', 'resourceAbundance'] as const;
type Metric = typeof METRICS[number];

export interface SensitivityScenario {
  overrides: SensitivityOverrides;
  runs: Array<{ seed: number } & Record<Metric, number>>;
  aggregate: Record<Metric, SummaryStatistics>;
  pairedDeltaFromBaseline: Record<Metric, SummaryStatistics>;
  parameterCorrelations: Record<string, number>;
}

export interface SensitivityReport {
  schemaVersion: 1;
  preset: WorldPresetId;
  requestedTicks: number;
  seeds: number[];
  createdAt: string;
  baseline: Record<Metric, SummaryStatistics>;
  scenarios: SensitivityScenario[];
}

function validateOverrides(overrides: SensitivityOverrides): void {
  for (const [key, value] of Object.entries(overrides)) {
    if (!SENSITIVITY_PARAMETERS.includes(key as SensitivityParameter)) throw new Error(`Unsupported sensitivity parameter: ${key}`);
    if (!Number.isFinite(value)) throw new Error(`Sensitivity value for ${key} must be finite.`);
    if (key === 'friction' && (value! < 0 || value! > 1)) throw new Error('friction must be between 0 and 1.');
    if (key === 'dayCycleLength' && (!Number.isInteger(value) || value! < 1)) throw new Error('dayCycleLength must be a positive integer.');
    if (key === 'maxAgents' && (!Number.isInteger(value) || value! < 1 || value! > 10_000)) throw new Error('maxAgents must be an integer from 1 to 10,000.');
    if (key === 'resourceRegenMultiplier' && value! < 0) throw new Error('resourceRegenMultiplier cannot be negative.');
    if (key === 'mutationRate' && (value! < 0 || value! > 1)) throw new Error('mutationRate must be between 0 and 1.');
    if (key === 'disasterFrequency' && (value! < 0 || value! > 1)) throw new Error('disasterFrequency must be between 0 and 1.');
  }
}

function metrics(engine: SimulationEngine): Record<Metric, number> {
  return {
    population: engine.agents.length,
    totalWealth: engine.agents.reduce((sum, agent) => sum + agent.wealth, 0),
    averageHealth: engine.agents.length ? engine.agents.reduce((sum, agent) => sum + agent.health, 0) / engine.agents.length : 0,
    resourceAbundance: engine.resources.reduce((sum, resource) => sum + resource.amount, 0),
  };
}

function runScenario(preset: WorldPresetId, seeds: readonly number[], ticks: number, overrides: SensitivityOverrides) {
  return seeds.map(seed => {
    const engine = new SimulationEngine(preset, seed);
    Object.assign(engine.config, overrides);
    for (let tick = 0; tick < ticks; tick += 1) engine.worldStep();
    return { seed, ...metrics(engine) };
  });
}

function aggregateRuns(runs: Array<{ seed: number } & Record<Metric, number>>): Record<Metric, SummaryStatistics> {
  return Object.fromEntries(METRICS.map(metric => [metric, summarize(runs.map(run => run[metric]))])) as Record<Metric, SummaryStatistics>;
}

function cartesianGrid(grid: Partial<Record<SensitivityParameter, readonly number[]>>): SensitivityOverrides[] {
  const entries = Object.entries(grid) as Array<[SensitivityParameter, readonly number[]]>;
  if (entries.length === 0) throw new Error('Provide at least one parameter grid.');
  for (const [key, values] of entries) {
    if (!SENSITIVITY_PARAMETERS.includes(key) || !Array.isArray(values) || values.length < 1 || values.length > 20) throw new Error(`Invalid grid for ${key}.`);
    values.forEach(value => validateOverrides({ [key]: value }));
  }
  let scenarios: SensitivityOverrides[] = [{}];
  for (const [key, values] of entries) {
    scenarios = scenarios.flatMap(scenario => values.map(value => ({ ...scenario, [key]: value })));
    if (scenarios.length > 100) throw new Error('Parameter grid exceeds the 100-scenario safety limit.');
  }
  return scenarios;
}

export function runParameterGridSensitivity(input: {
  preset: WorldPresetId;
  seeds: readonly number[];
  ticks: number;
  grid: Partial<Record<SensitivityParameter, readonly number[]>>;
}): SensitivityReport {
  if (input.seeds.length < 3 || input.seeds.length > 100) throw new Error('Sensitivity analysis requires 3–100 unique seeds.');
  if (new Set(input.seeds).size !== input.seeds.length || input.seeds.some(seed => !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)) throw new Error('Seeds must be unique unsigned 32-bit integers.');
  if (!Number.isSafeInteger(input.ticks) || input.ticks < 1 || input.ticks > 100_000) throw new Error('Ticks must be between 1 and 100,000.');
  const scenarios = cartesianGrid(input.grid);
  if (scenarios.length * input.seeds.length * input.ticks > 5_000_000) throw new Error('Sensitivity workload exceeds the 5,000,000 tick safety budget.');

  const baselineRuns = runScenario(input.preset, input.seeds, input.ticks, {});
  const baseline = aggregateRuns(baselineRuns);
  const results = scenarios.map(overrides => {
    const runs = runScenario(input.preset, input.seeds, input.ticks, overrides);
    const aggregate = aggregateRuns(runs);
    const pairedDeltaFromBaseline = Object.fromEntries(METRICS.map(metric => [
      metric,
      summarize(runs.map((run, index) => run[metric] - baselineRuns[index][metric])),
    ])) as Record<Metric, SummaryStatistics>;
    return { overrides, runs, aggregate, pairedDeltaFromBaseline, parameterCorrelations: {} as Record<string, number> };
  });

  for (const parameter of Object.keys(input.grid) as SensitivityParameter[]) {
    const values = results.map(result => result.overrides[parameter]!);
    if (new Set(values).size < 2 || results.length < 3) continue;
    for (const metric of METRICS) {
      const correlation = pearsonCorrelation(values, results.map(result => result.aggregate[metric].mean));
      for (const result of results) result.parameterCorrelations[`${parameter}:${metric}`] = correlation;
    }
  }

  return { schemaVersion: 1, preset: input.preset, requestedTicks: input.ticks, seeds: [...input.seeds], createdAt: new Date().toISOString(), baseline, scenarios: results };
}
