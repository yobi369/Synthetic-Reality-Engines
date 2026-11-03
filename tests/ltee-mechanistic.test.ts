import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_LTEE_PARAMETERS,
  LTEE_GENERATIONS_PER_TRANSFER,
  predictLteeCompetition,
  simulateLteePopulation
} from '../src/research/ltee/engine';
import { parseLteeAssays } from '../scripts/ltee-mechanistic-validation';

const csv = readFileSync(new URL('../research/data/ltee_fitness.csv', import.meta.url), 'utf8');

describe('LTEE-specific serial-transfer engine', () => {
  test('reconstructs the published fitness statistic from raw colony counts and plate dilutions', () => {
    const rows = parseLteeAssays(csv);
    expect(rows).toHaveLength(922);
    const first = rows.find(row => row.population === 'Ara - 1' && row.generation === 0)!;
    expect(first.observed['original-relative-growth-ratio']).toBeCloseTo(0.910699904, 7);
    expect(first.observed['logit-per-generation']).toBeCloseTo(first.observed['original-relative-growth-ratio'] - 1, 12);
    expect(first.observed['logit-per-cycle']).toBeLessThan(0);
  });

  test('identifies evolved and ancestral markers in both Ara-minus and Ara-plus lines', () => {
    const rows = parseLteeAssays(csv);
    const minus = rows.find(row => row.population === 'Ara - 1' && row.generation === 500)!;
    const plus = rows.find(row => row.population === 'Ara + 1' && row.generation === 500)!;
    expect(minus.assay.initialEvolvedCount).toBeGreaterThan(0);
    expect(plus.assay.initialEvolvedCount).toBeGreaterThan(0);
    expect(minus.assay.ancestorLogFoldChange).toBeGreaterThan(0);
    expect(plus.assay.ancestorLogFoldChange).toBeGreaterThan(0);
  });

  test('restricts the constant-mutation calibration cohort to six complete non-mutator lines', () => {
    const rows = parseLteeAssays(csv).filter(row => !row.mutatorEver);
    expect(new Set(rows.map(row => row.population)).size).toBe(6);
    expect(new Set(rows.map(row => row.population))).toEqual(new Set([
      'Ara - 5', 'Ara - 6', 'Ara + 1', 'Ara + 2', 'Ara + 4', 'Ara + 5'
    ]));
  });

  test('uses the 1:100 daily transfer interval and preserves population frequencies', () => {
    expect(LTEE_GENERATIONS_PER_TRANSFER).toBeCloseTo(6.643856, 5);
    const snapshots = simulateLteePopulation('test-line', [0, 100, 500], {
      ...DEFAULT_LTEE_PARAMETERS,
      beneficialMutationRate: 0,
      effectiveBottleneck: 1000,
      maxFitnessClasses: 16
    }, 9);
    expect(snapshots.get(0)?.classes).toEqual([{ selectionCoefficient: 0, frequency: 1 }]);
    for (const snapshot of snapshots.values()) {
      expect(snapshot.classes.reduce((sum, item) => sum + item.frequency, 0)).toBeCloseTo(1, 10);
      expect(snapshot.classes.every(item => item.selectionCoefficient === 0)).toBe(true);
    }
    expect(snapshots.get(500)?.transfer).toBeCloseTo(500 / LTEE_GENERATIONS_PER_TRANSFER, 0);
  });

  test('is deterministic for a fixed population, seed and parameter set', () => {
    const params = { ...DEFAULT_LTEE_PARAMETERS, effectiveBottleneck: 1000, maxFitnessClasses: 16 };
    const a = simulateLteePopulation('Ara - 5', [0, 500, 1000], params, 123);
    const b = simulateLteePopulation('Ara - 5', [0, 500, 1000], params, 123);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });

  test('mutation creates heritable beneficial fitness classes and competition assay reads them', () => {
    const params = {
      ...DEFAULT_LTEE_PARAMETERS,
      beneficialMutationRate: 0.0001,
      meanBeneficialEffect: 0.08,
      diminishingReturns: 0,
      effectiveBottleneck: 1000,
      maxFitnessClasses: 32
    };
    const snapshots = simulateLteePopulation('mutating-line', [0, 5000], params, 17);
    const evolved = snapshots.get(5000)!;
    expect(evolved.classes.some(item => item.selectionCoefficient > 0)).toBe(true);
    const assay = predictLteeCompetition(evolved, {
      initialEvolvedCount: 100,
      initialAncestorCount: 100,
      ancestorLogFoldChange: LTEE_GENERATIONS_PER_TRANSFER
    });
    expect(assay.relativeFitness).toBeGreaterThan(1);
    expect(assay.logitPerGeneration).toBeCloseTo(assay.relativeFitness - 1, 12);
    expect(assay.finalEvolvedFrequency).toBeGreaterThan(0.5);
  });

  test('competition assay handles a neutral evolved population exactly', () => {
    const neutral = simulateLteePopulation('neutral-line', [0], {
      ...DEFAULT_LTEE_PARAMETERS,
      beneficialMutationRate: 0
    }, 1).get(0)!;
    const assay = predictLteeCompetition(neutral, {
      initialEvolvedCount: 200,
      initialAncestorCount: 300,
      ancestorLogFoldChange: LTEE_GENERATIONS_PER_TRANSFER
    });
    expect(assay.relativeFitness).toBeCloseTo(1, 12);
    expect(assay.logitPerCycle).toBeCloseTo(0, 12);
    expect(assay.finalEvolvedFrequency).toBeCloseTo(0.4, 12);
  });
});
