import { describe, expect, test } from 'bun:test';
import { runParameterGridSensitivity } from '../research/sensitivity';

describe('parameter-grid sensitivity analysis', () => {
  test('uses paired seeds and reports aggregate and paired deltas', () => {
    const report = runParameterGridSensitivity({
      preset: 'civilization', seeds: [11, 22, 33], ticks: 5,
      grid: { resourceRegenMultiplier: [0.5, 1, 1.5] },
    });
    expect(report.scenarios).toHaveLength(3);
    expect(report.baseline.population.count).toBe(3);
    expect(report.scenarios[0].pairedDeltaFromBaseline.population.count).toBe(3);
    expect(report.scenarios[1].overrides.resourceRegenMultiplier).toBe(1);
  });

  test('rejects oversized or invalid grids before simulation', () => {
    expect(() => runParameterGridSensitivity({
      preset: 'civilization', seeds: [1, 2, 3], ticks: 10,
      grid: { friction: [-0.1, 0.5] },
    })).toThrow();
    expect(() => runParameterGridSensitivity({
      preset: 'civilization', seeds: [1, 2], ticks: 10,
      grid: { friction: [0.2, 0.5] },
    })).toThrow();
  });
});
