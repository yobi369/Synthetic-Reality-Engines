import { writeFile } from 'node:fs/promises';
import { runBatchExperiments } from '../research/batch-runner';
import type { WorldPresetId } from '../src/types/simulation';

function argument(name: string, fallback: string): string {
  const index = Bun.argv.indexOf(name);
  return index >= 0 ? Bun.argv[index + 1] || fallback : fallback;
}

const preset = argument('--preset', 'civilization') as WorldPresetId;
const validPresets: WorldPresetId[] = ['civilization', 'wasteland', 'galactic', 'microbial', 'sandbox'];
if (!validPresets.includes(preset)) throw new Error('Unsupported preset.');
const seeds = argument('--seeds', '11,22,33,44,55').split(',').map(value => Number(value.trim()));
const ticks = Number(argument('--ticks', '1000'));
const output = argument('--output', 'batch-experiment-report.json');
const report = runBatchExperiments({ preset, seeds, ticks });
await writeFile(output, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify({ output, preset: report.preset, runs: report.runs.length, ticks: report.requestedTicks, aggregate: report.aggregate }, null, 2));
