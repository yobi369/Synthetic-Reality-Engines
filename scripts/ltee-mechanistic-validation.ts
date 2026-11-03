import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_LTEE_PARAMETERS,
  LteeAssayInput,
  LteeFitnessClass,
  LteeModelParameters,
  LteePopulationSnapshot,
  LTEE_GENERATIONS_PER_TRANSFER,
  predictLteeCompetition,
  simulateLteePopulation
} from '../src/research/ltee/engine';

export type FitnessEncoding =
  | 'original-relative-growth-ratio'
  | 'logit-per-generation'
  | 'logit-per-cycle'
  | 'log-per-cycle'
  | 'log-per-generation';

export interface RawLteeAssay {
  population: string;
  generation: number;
  replicate: number;
  mutatorEver: boolean;
  observed: Record<FitnessEncoding, number>;
  assay: LteeAssayInput;
}

interface AggregatePoint {
  population: string;
  generation: number;
  replicates: number;
  observed: Record<FitnessEncoding, number>;
  predicted?: Record<FitnessEncoding, number>;
}

const ENCODINGS: FitnessEncoding[] = [
  'original-relative-growth-ratio',
  'logit-per-generation',
  'logit-per-cycle',
  'log-per-cycle',
  'log-per-generation'
];

export function parseLteeAssays(csv: string): RawLteeAssay[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('LTEE dataset is empty');
  const header = lines[0].split(',');
  const index = Object.fromEntries(header.map((name, i) => [name, i]));
  const required = [
    'Generation', 'Population', 'Rep', 'Red.Pop', 'White.Pop',
    'Red.0', 'White.0', 'D.0', 'Red.1', 'White.1', 'D.1',
    'Fitness', 'Mutator.Ever'
  ];
  for (const field of required) {
    if (index[field] === undefined) throw new Error(`LTEE source data is missing required column: ${field}`);
  }

  const observations: RawLteeAssay[] = [];
  for (const [offset, line] of lines.slice(1).entries()) {
    const cells = line.split(',');
    const fitnessText = cells[index.Fitness] ?? '';
    if (!fitnessText) continue;
    const generation = Number(cells[index.Generation]);
    const replicate = Number(cells[index.Rep]);
    const population = cells[index.Population]?.trim();
    const redIsEvolved = cells[index['Red.Pop']] === population;
    const whiteIsEvolved = cells[index['White.Pop']] === population;
    if (redIsEvolved === whiteIsEvolved) {
      throw new Error(`Cannot identify evolved marker for ${population} at CSV line ${offset + 2}`);
    }
    const red0 = Number(cells[index['Red.0']]);
    const white0 = Number(cells[index['White.0']]);
    const red1 = Number(cells[index['Red.1']]);
    const white1 = Number(cells[index['White.1']]);
    const dilution0 = Number(cells[index['D.0']]);
    const dilution1 = Number(cells[index['D.1']]);
    const evolved0 = redIsEvolved ? red0 : white0;
    const ancestor0 = redIsEvolved ? white0 : red0;
    const evolved1 = redIsEvolved ? red1 : white1;
    const ancestor1 = redIsEvolved ? white1 : red1;
    const values = [generation, replicate, evolved0, ancestor0, evolved1, ancestor1, dilution0, dilution1];
    if (!population || values.some(value => !Number.isFinite(value) || value <= 0) ||
        generation < 0 || !Number.isInteger(replicate)) {
      throw new Error(`Invalid LTEE competition row at CSV line ${offset + 2}`);
    }

    const evolvedLogFoldChange = Math.log((evolved1 * dilution1) / (evolved0 * dilution0));
    const ancestorLogFoldChange = Math.log((ancestor1 * dilution1) / (ancestor0 * dilution0));
    if (!(ancestorLogFoldChange > 0)) {
      throw new Error(`Non-positive ancestor growth in ${population}, generation ${generation}`);
    }
    const logitPerCycle = Math.log(evolved1 / ancestor1) - Math.log(evolved0 / ancestor0);
    const originalFitness = evolvedLogFoldChange / ancestorLogFoldChange;
    const suppliedFitness = Number(fitnessText);
    if (Math.abs(originalFitness - suppliedFitness) > 0.00001) {
      throw new Error(`Fitness reconstruction mismatch at CSV line ${offset + 2}: ${originalFitness} vs ${suppliedFitness}`);
    }
    const initialFrequency = evolved0 / (evolved0 + ancestor0);
    const finalFrequency = evolved1 / (evolved1 + ancestor1);
    const logPerCycle = Math.log(finalFrequency) - Math.log(initialFrequency);
    observations.push({
      population,
      generation,
      replicate,
      mutatorEver: cells[index['Mutator.Ever']] === 'Yes',
      assay: {
        initialEvolvedCount: evolved0,
        initialAncestorCount: ancestor0,
        ancestorLogFoldChange
      },
      observed: {
        'original-relative-growth-ratio': originalFitness,
        'logit-per-generation': originalFitness - 1,
        'logit-per-cycle': logitPerCycle,
        'log-per-cycle': logPerCycle,
        'log-per-generation': logPerCycle / ancestorLogFoldChange
      }
    });
  }
  if (!observations.length) throw new Error('LTEE source data contains no complete competition assays');
  return observations;
}

function aggregate(observations: RawLteeAssay[]): AggregatePoint[] {
  const groups = new Map<string, RawLteeAssay[]>();
  for (const row of observations) {
    const key = `${row.population}::${row.generation}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].map(rows => {
    const observed = {} as Record<FitnessEncoding, number>;
    for (const encoding of ENCODINGS) {
      observed[encoding] = rows.reduce((sum, row) => sum + row.observed[encoding], 0) / rows.length;
    }
    return {
      population: rows[0].population,
      generation: rows[0].generation,
      replicates: rows.length,
      observed
    };
  }).sort((a, b) => a.population.localeCompare(b.population) || a.generation - b.generation);
}

function temporalSplit(points: AggregatePoint[], fraction = 0.8) {
  const maxima = new Map<string, number>();
  for (const point of points) maxima.set(point.population, Math.max(maxima.get(point.population) ?? 0, point.generation));
  const cutoffs = Object.fromEntries([...maxima].map(([population, maximum]) => [population, maximum * fraction]));
  const train = points.filter(point => point.generation <= cutoffs[point.population]);
  const test = points.filter(point => point.generation > cutoffs[point.population]);
  for (const population of maxima.keys()) {
    if (!train.some(point => point.population === population) || !test.some(point => point.population === population)) {
      throw new Error(`Population ${population} does not have both calibration and holdout data`);
    }
  }
  return { train, test, cutoffs };
}

function interpolateClasses(
  before: LteePopulationSnapshot,
  after: LteePopulationSnapshot,
  generation: number
): LteePopulationSnapshot {
  if (after.generation === before.generation) return after;
  const alpha = (generation - before.generation) / (after.generation - before.generation);
  const byCoefficient = new Map<number, number>();
  for (const item of before.classes) {
    byCoefficient.set(item.selectionCoefficient, item.frequency * (1 - alpha));
  }
  for (const item of after.classes) {
    byCoefficient.set(item.selectionCoefficient,
      (byCoefficient.get(item.selectionCoefficient) ?? 0) + item.frequency * alpha);
  }
  return {
    generation,
    transfer: before.transfer + (after.transfer - before.transfer) * alpha,
    classes: [...byCoefficient].map(([selectionCoefficient, frequency]) => ({ selectionCoefficient, frequency }))
      .filter(item => item.frequency > 0)
  };
}

function snapshotPredictions(
  population: string,
  generations: number[],
  assays: RawLteeAssay[],
  parameters: LteeModelParameters,
  seed: number
): Map<number, Record<FitnessEncoding, number>[]> {
  const snapshots = simulateLteePopulation(population, generations, parameters, seed);
  const predictions = new Map<number, Record<FitnessEncoding, number>[]>();
  for (const generation of generations) {
    const snapshot = snapshots.get(generation);
    if (!snapshot) throw new Error(`Missing simulation snapshot for ${population} at ${generation}`);
    const rows = assays.filter(row => row.generation === generation);
    predictions.set(generation, rows.map(row => {
      const predicted = predictLteeCompetition(snapshot, row.assay);
      return {
        'original-relative-growth-ratio': predicted.relativeFitness,
        'logit-per-generation': predicted.logitPerGeneration,
        'logit-per-cycle': predicted.logitPerCycle,
        'log-per-cycle': predicted.logPerCycle,
        'log-per-generation': predicted.logPerGeneration
      };
    }));
  }
  return predictions;
}

function predictCandidate(
  observations: RawLteeAssay[],
  points: AggregatePoint[],
  parameters: LteeModelParameters,
  seed: number
): AggregatePoint[] {
  const byPopulation = new Map<string, RawLteeAssay[]>();
  for (const row of observations) {
    const rows = byPopulation.get(row.population) ?? [];
    rows.push(row);
    byPopulation.set(row.population, rows);
  }
  const result: AggregatePoint[] = [];
  for (const [population, rows] of byPopulation) {
    const generations = [...new Set(rows.map(row => row.generation))].sort((a, b) => a - b);
    const predictions = snapshotPredictions(population, generations, rows, parameters, seed);
    const rowOffset = new Map<number, number>();
    for (const point of points.filter(item => item.population === population)) {
      const predictionRows = predictions.get(point.generation) ?? [];
      const matchingRows = rows.filter(row => row.generation === point.generation);
      const predicted = {} as Record<FitnessEncoding, number>;
      for (const encoding of ENCODINGS) {
        predicted[encoding] = predictionRows.reduce((sum, item) => sum + item[encoding], 0) /
          Math.max(1, predictionRows.length);
      }
      result.push({ ...point, predicted });
      rowOffset.set(point.generation, matchingRows.length);
    }
  }
  return result;
}

function populationRmse(points: AggregatePoint[], encoding: FitnessEncoding, holdout: boolean): number {
  const populations = [...new Set(points.map(point => point.population))];
  const errors = populations.map(population => {
    const rows = points.filter(point => point.population === population);
    return Math.sqrt(rows.reduce((sum, point) => {
      const predicted = point.predicted?.[encoding] ?? 0;
      const observed = point.observed[encoding];
      return sum + (predicted - observed) ** 2;
    }, 0) / rows.length);
  });
  return errors.reduce((sum, value) => sum + value, 0) / errors.length;
}

function mae(points: AggregatePoint[], encoding: FitnessEncoding): number {
  const populations = [...new Set(points.map(point => point.population))];
  return populations.reduce((total, population) => {
    const rows = points.filter(point => point.population === population);
    return total + rows.reduce((sum, point) =>
      sum + Math.abs((point.predicted?.[encoding] ?? 0) - point.observed[encoding]), 0) / rows.length;
  }, 0) / populations.length;
}

function parameterGrid(): LteeModelParameters[] {
  const mutationRates = [0.000001, 0.000003, 0.00001];
  const meanEffects = [0.01, 0.03, 0.06];
  const diminishingReturns = [0, 1, 3];
  return mutationRates.flatMap(beneficialMutationRate =>
    meanEffects.flatMap(meanBeneficialEffect =>
      diminishingReturns.map(diminishing => ({
        ...DEFAULT_LTEE_PARAMETERS,
        beneficialMutationRate,
        meanBeneficialEffect,
        diminishingReturns: diminishing
      }))
    )
  );
}

function bootstrapSelection(
  candidateScores: Array<{ parameters: LteeModelParameters; byPopulation: Record<string, number> }>,
  populations: string[],
  seed = 20261104,
  iterations = 250
) {
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const selected = new Map<string, number>();
  for (let iteration = 0; iteration < iterations; iteration++) {
    const sampled = Array.from({ length: populations.length }, () =>
      populations[Math.floor(random() * populations.length)]);
    let best = candidateScores[0];
    let bestScore = Infinity;
    for (const candidate of candidateScores) {
      const score = sampled.reduce((sum, population) => sum + candidate.byPopulation[population], 0) / sampled.length;
      if (score < bestScore) { best = candidate; bestScore = score; }
    }
    const key = JSON.stringify(best.parameters);
    selected.set(key, (selected.get(key) ?? 0) + 1);
  }
  return [...selected.entries()].map(([parameters, count]) => ({
    parameters: JSON.parse(parameters),
    selectionFrequency: count / iterations
  })).sort((a, b) => b.selectionFrequency - a.selectionFrequency);
}

function bootstrapHoldout(
  byPopulation: Record<string, number[]>,
  seed = 20261105,
  iterations = 1000
) {
  const populations = Object.keys(byPopulation);
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const samples: number[] = [];
  for (let iteration = 0; iteration < iterations; iteration++) {
    const chosen = Array.from({ length: populations.length }, () =>
      populations[Math.floor(random() * populations.length)]);
    let squared = 0;
    let n = 0;
    for (const population of chosen) {
      for (const error of byPopulation[population]) { squared += error; n++; }
    }
    samples.push(Math.sqrt(squared / n));
  }
  samples.sort((a, b) => a - b);
  return { lower95: samples[Math.floor(iterations * 0.025)], upper95: samples[Math.floor(iterations * 0.975)], iterations, seed };
}

function evaluateMetric(
  candidates: Array<{ parameters: LteeModelParameters; predictions: AggregatePoint[] }>,
  train: AggregatePoint[],
  test: AggregatePoint[],
  encoding: FitnessEncoding
) {
  const scored = candidates.map(candidate => {
    const trainPredictions = candidate.predictions.filter(point =>
      train.some(row => row.population === point.population && row.generation === point.generation));
    const testPredictions = candidate.predictions.filter(point =>
      test.some(row => row.population === point.population && row.generation === point.generation));
    const byPopulation: Record<string, number> = {};
    for (const population of [...new Set(train.map(point => point.population))]) {
      byPopulation[population] = populationRmse(
        trainPredictions.filter(point => point.population === population), encoding, false
      );
    }
    return {
      ...candidate,
      trainRmse: populationRmse(trainPredictions, encoding, false),
      holdoutRmse: populationRmse(testPredictions, encoding, true),
      holdoutMae: mae(testPredictions, encoding),
      byPopulation
    };
  }).sort((a, b) => a.trainRmse - b.trainRmse);
  const best = scored[0];
  const holdoutErrors: Record<string, number[]> = {};
  for (const population of [...new Set(test.map(point => point.population))]) {
    holdoutErrors[population] = best.predictions
      .filter(point => point.population === population && test.some(row =>
        row.population === point.population && row.generation === point.generation))
      .map(point => (point.predicted?.[encoding] ?? 0 - point.observed[encoding]) ** 2);
  }
  const bootstrap = bootstrapHoldout(holdoutErrors);
  const populations = [...new Set(train.map(point => point.population))];
  const stability = bootstrapSelection(scored.map(candidate => ({
    parameters: candidate.parameters,
    byPopulation: candidate.byPopulation
  })), populations);
  const profiles: Record<string, Array<{ value: number; bestCalibrationRmse: number }>> = {};
  for (const key of ['beneficialMutationRate', 'meanBeneficialEffect', 'diminishingReturns'] as const) {
    const values = [...new Set(scored.map(candidate => candidate.parameters[key]))].sort((a, b) => a - b);
    profiles[key] = values.map(value => ({
      value,
      bestCalibrationRmse: Math.min(...scored
        .filter(candidate => candidate.parameters[key] === value)
        .map(candidate => candidate.trainRmse))
    }));
  }
  return {
    encoding,
    selectedParameters: best.parameters,
    calibrationRmse: best.trainRmse,
    holdoutRmse: best.holdoutRmse,
    holdoutMae: best.holdoutMae,
    holdoutClusterBootstrap95: bootstrap,
    bootstrapParameterSelection: stability,
    calibrationProfileSensitivity: profiles,
    perPopulationHoldout: [...new Set(test.map(point => point.population))].map(population => ({
      population,
      points: test.filter(point => point.population === population).length,
      rmse: populationRmse(best.predictions.filter(point => point.population === population &&
        test.some(row => row.population === population && row.generation === point.generation)), encoding, true)
    }))
  };
}

export function runMechanisticLteeValidation(csv: string) {
  const sourceHash = createHash('sha256').update(csv).digest('hex');
  const rawAll = parseLteeAssays(csv);
  // Constant-beneficial-mutation-rate model: use the six complete, non-mutator
  // populations. Mutator lines and the citrate innovation violate the narrow
  // shared-environment/constant-mutation assumptions of this first model.
  const raw = rawAll.filter(row => !row.mutatorEver);
  const points = aggregate(raw);
  const split = temporalSplit(points, 0.8);
  const grid = parameterGrid();
  const candidates: Array<{ parameters: LteeModelParameters; predictions: AggregatePoint[] }> = [];
  for (const parameters of grid) {
    candidates.push({
      parameters,
      predictions: predictCandidate(raw, points, parameters, 20261103)
    });
  }
  const metrics = ENCODINGS.map(encoding =>
    evaluateMetric(candidates, split.train, split.test, encoding)
  );
  return {
    schemaVersion: 1,
    dataset: {
      citation: 'Wiser, Ribeck & Lenski (2014), Dryad DOI:10.5061/dryad.0hc2m',
      sha256: sourceHash,
      sourceRows: csv.trim().split(/\r?\n/).length - 1,
      completeCompetitionAssays: rawAll.length,
      missingFitnessRows: csv.trim().split(/\r?\n/).length - 1 - rawAll.length,
      allPopulations: [...new Set(rawAll.map(row => row.population))].length,
      calibratedPopulations: [...new Set(raw.map(row => row.population))],
      excludedMutatorOrNonconstantLines: [...new Set(rawAll.filter(row => row.mutatorEver).map(row => row.population))]
    },
    experiment: {
      environment: 'DM25 glucose-limited minimal medium, 37 C; no explicit ecological interactions',
      dailyTransferRatio: 100,
      generationsPerTransfer: LTEE_GENERATIONS_PER_TRANSFER,
      computationalBottleneck: DEFAULT_LTEE_PARAMETERS.effectiveBottleneck,
      bottleneckNote: 'Scaled effective inoculum for tractable forward simulation; not the LTEE census population.',
      mutationTiming: 'Beneficial mutations arise at the end of batch growth and affect descendants in the next transfer cycle.',
      dfe: 'Exponential beneficial-effect distribution with background-dependent mean (diminishing returns).',
      assay: 'Mix evolved population with its marked ancestor and calculate competition outcomes from logit changes over the measured ancestor log-fold-change.'
    },
    calibration: {
      split: 'Within each of six complete non-mutator populations, generations <= 80% of its maximum are calibration; later generations are untouched holdout.',
      objective: 'Mean of population-specific RMSE values; each population receives equal weight.',
      gridCandidates: grid.length,
      grid,
      seed: 20261103
    },
    metrics
  };
}

if (process.argv[1]?.includes('ltee-mechanistic-validation.ts')) {
  const csv = readFileSync(new URL('../research/data/ltee_fitness.csv', import.meta.url), 'utf8');
  process.stdout.write(JSON.stringify(runMechanisticLteeValidation(csv), null, 2) + '\n');
}
