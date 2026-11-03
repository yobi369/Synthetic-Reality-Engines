import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  aggregateReplicates,
  bootstrapCalibrationUncertainty,
  bootstrapPopulationRmse,
  fitCandidateModels,
  parseFitnessCsv,
  runLteeValidation,
  temporalSplit
} from '../scripts/empirical-ltee-validation';

const csv = readFileSync(new URL('../research/data/ltee_fitness.csv', import.meta.url), 'utf8');

describe('LTEE empirical validation pipeline', () => {
  test('parses the public competition dataset and excludes only missing fitness rows', () => {
    const rows = parseFitnessCsv(csv);
    expect(rows).toHaveLength(922);
    expect(new Set(rows.map(row => row.population)).size).toBe(12);
    expect(rows.every(row => row.fitness > 0 && Number.isFinite(row.fitness))).toBe(true);
  });

  test('aggregates replicate measurements without mixing populations or generations', () => {
    const points = aggregateReplicates(parseFitnessCsv(csv));
    expect(points.length).toBeGreaterThan(400);
    expect(points.every(point => point.replicates >= 1)).toBe(true);
    expect(points.find(point => point.population === 'Ara - 1' && point.generation === 0)?.replicates).toBeGreaterThan(1);
  });

  test('uses a within-population temporal holdout with no future observations in calibration', () => {
    const split = temporalSplit(aggregateReplicates(parseFitnessCsv(csv)));
    expect(split.train.length).toBeGreaterThan(0);
    expect(split.test.length).toBeGreaterThan(0);
    for (const population of new Set(split.test.map(point => point.population))) {
      const cutoff = split.cutoffs[population];
      expect(split.train.filter(point => point.population === population).every(point => point.generation <= cutoff)).toBe(true);
      expect(split.test.filter(point => point.population === population).every(point => point.generation > cutoff)).toBe(true);
    }
  });

  test('fits only the declared candidate families and is deterministic', () => {
    const split = temporalSplit(aggregateReplicates(parseFitnessCsv(csv)));
    const first = fitCandidateModels(split.train);
    const second = fitCandidateModels(split.train);
    expect(first.map(model => [model.name, model.parameters, model.trainRmse]))
      .toEqual(second.map(model => [model.name, model.parameters, model.trainRmse]));
    expect(first.map(model => model.name).sort()).toEqual(['baseline', 'power-law', 'saturating']);
  });

  test('runs holdout evaluation with reproducible population-cluster bootstrap intervals', () => {
    const result = runLteeValidation(csv);
    expect(result.dataset.observationsWithFitness).toBe(922);
    expect(result.dataset.populations).toBe(12);
    expect(result.holdoutMetrics).toHaveLength(3);
    expect(result.perPopulationHoldout).toHaveLength(12);
    const split = temporalSplit(aggregateReplicates(parseFitnessCsv(csv)));
    const model = fitCandidateModels(split.train)[0];
    const calibration = bootstrapCalibrationUncertainty(split.train, 44, 30);
    expect(calibration.iterations).toBe(30);
    expect(calibration.modelSelectionFrequency['power-law'] + calibration.modelSelectionFrequency.saturating + calibration.modelSelectionFrequency.baseline).toBeCloseTo(1, 4);
    expect(calibration.conditionalParameterIntervals95['power-law'].exponent[0]).toBeLessThanOrEqual(calibration.conditionalParameterIntervals95['power-law'].exponent[1]);
    expect(bootstrapPopulationRmse(split.test, model.predict)).toEqual(
      bootstrapPopulationRmse(split.test, model.predict)
    );
    for (const metric of result.holdoutMetrics) {
      expect(metric.confidenceInterval95.lower95).toBeLessThanOrEqual(metric.confidenceInterval95.upper95);
    }
  });

  test('rejects datasets that do not contain the required schema', () => {
    expect(() => parseFitnessCsv('Generation,Population\n0,Ara - 1')).toThrow('missing required column');
  });
});
