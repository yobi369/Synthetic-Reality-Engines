import { writeFile } from 'node:fs/promises';
import { runParameterGridSensitivity, type SensitivityParameter } from './sensitivity';
import type { WorldPresetId } from '../src/types/simulation';

const args = process.argv.slice(2);
function argument(name: string, fallback: string): string {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || fallback : fallback;
}
const preset = argument('--preset', 'civilization') as WorldPresetId;
const validPresets: WorldPresetId[] = ['civilization', 'wasteland', 'galactic', 'microbial', 'sandbox'];
if (!validPresets.includes(preset)) throw new Error('Unsupported preset.');
const seeds = argument('--seeds', '11,22,33,44,55').split(',').map(value => Number(value.trim()));
const ticks = Number(argument('--ticks', '1000'));
const parameter = argument('--parameter', 'resourceRegenMultiplier') as SensitivityParameter;
const values = argument('--values', '0.5,1,1.5').split(',').map(value => Number(value.trim()));
const output = argument('--output', 'sensitivity-report.json');
const report = runParameterGridSensitivity({ preset, seeds, ticks, grid: { [parameter]: values } });
await writeFile(output, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify({ output, preset, scenarios: report.scenarios.length, seeds: report.seeds.length, ticks }, null, 2));
