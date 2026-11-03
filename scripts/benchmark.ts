import { SimulationEngine } from '../src/engine/SimulationEngine';

const presets = ['civilization', 'wasteland', 'galactic', 'microbial', 'sandbox'] as const;
const seeds = [17, 101, 2026];
const horizon = Number(process.env.BENCHMARK_TICKS || 1000);
const results: Array<Record<string, number | string>> = [];

for (const preset of presets) {
  for (const seed of seeds) {
    const engine = new SimulationEngine(preset, seed);
    const started = performance.now();
    for (let tick = 0; tick < horizon; tick++) engine.worldStep();
    const elapsedMs = performance.now() - started;
    results.push({
      preset, seed, ticks: horizon, elapsedMs: Number(elapsedMs.toFixed(2)),
      ticksPerSecond: Number((horizon / (elapsedMs / 1000)).toFixed(2)),
      finalPopulation: engine.agents.length,
      resourceTotal: Number(engine.resources.reduce((sum, item) => sum + item.amount, 0).toFixed(3)),
      interventionCount: engine.interventions.length
    });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  engineVersion: '0.1.0',
  runtime: process.version,
  platform: process.platform,
  architecture: process.arch,
  horizonTicks: horizon,
  results
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
