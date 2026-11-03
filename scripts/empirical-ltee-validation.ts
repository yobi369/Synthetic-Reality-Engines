import { readFileSync } from 'node:fs';

export interface FitnessObservation {
  generation: number;
  population: string;
  replicate: number;
  fitness: number;
}

export interface FitnessPoint {
  generation: number;
  population: string;
  fitness: number;
  replicates: number;
}

export interface CurveModel {
  name: 'baseline' | 'power-law' | 'saturating';
  parameters: Record<string, number>;
  predict: (generation: number) => number;
  trainRmse: number;
}

export function parseFitnessCsv(csv: string): FitnessObservation[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('LTEE dataset is empty');
  const header = lines[0].split(',');
  const index = Object.fromEntries(header.map((name, i) => [name, i]));
  for (const field of ['Generation', 'Population', 'Rep', 'Fitness']) {
    if (index[field] === undefined) throw new Error(`LTEE dataset is missing required column: ${field}`);
  }

  const observations: FitnessObservation[] = [];
  for (const [offset, line] of lines.slice(1).entries()) {
    const cells = line.split(',');
    const generation = Number(cells[index.Generation]);
    const replicate = Number(cells[index.Rep]);
    const fitnessText = cells[index.Fitness] ?? '';
    if (fitnessText === '') continue;
    const fitness = Number(fitnessText);
    const population = cells[index.Population]?.trim();
    if (!population || !Number.isFinite(generation) || generation < 0 ||
        !Number.isInteger(replicate) || replicate < 1 || !Number.isFinite(fitness) || fitness <= 0) {
      throw new Error(`Invalid LTEE observation at CSV line ${offset + 2}`);
    }
    observations.push({ generation, population, replicate, fitness });
  }
  if (!observations.length) throw new Error('LTEE dataset contains no valid fitness observations');
  return observations;
}

export function aggregateReplicates(observations: FitnessObservation[]): FitnessPoint[] {
  const groups = new Map<string, FitnessObservation[]>();
  for (const row of observations) {
    const key = `${row.population}::${row.generation}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].map(group => ({
    generation: group[0].generation,
    population: group[0].population,
    fitness: group.reduce((sum, row) => sum + row.fitness, 0) / group.length,
    replicates: group.length
  })).sort((a, b) => a.population.localeCompare(b.population) || a.generation - b.generation);
}

export function temporalSplit(points: FitnessPoint[], trainingFraction = 0.8) {
  if (!(trainingFraction > 0 && trainingFraction < 1)) throw new Error('trainingFraction must be between 0 and 1');
  const maxima = new Map<string, number>();
  for (const point of points) maxima.set(point.population, Math.max(maxima.get(point.population) ?? 0, point.generation));
  const train: FitnessPoint[] = [];
  const test: FitnessPoint[] = [];
  const cutoffs: Record<string, number> = {};
  for (const point of points) {
    const cutoff = (maxima.get(point.population) ?? 0) * trainingFraction;
    cutoffs[point.population] = cutoff;
    (point.generation <= cutoff ? train : test).push(point);
  }
  for (const population of maxima.keys()) {
    if (!train.some(point => point.population === population) || !test.some(point => point.population === population)) {
      throw new Error(`Population ${population} does not have both calibration and holdout observations`);
    }
  }
  return { train, test, cutoffs };
}

function rmse(points: FitnessPoint[], predict: (generation: number) => number): number {
  return Math.sqrt(points.reduce((sum, point) => sum + (point.fitness - predict(point.generation)) ** 2, 0) / points.length);
}

function fitLinearFeature(
  name: CurveModel['name'],
  train: FitnessPoint[],
  feature: (generation: number) => number,
  parameters: Record<string, number>
): CurveModel {
  const numerator = train.reduce((sum, point) => sum + feature(point.generation) * (point.fitness - 1), 0);
  const denominator = train.reduce((sum, point) => sum + feature(point.generation) ** 2, 0);
  const amplitude = denominator > 0 ? Math.max(0, numerator / denominator) : 0;
  const predict = (generation: number) => 1 + amplitude * feature(generation);
  return { name, parameters: { ...parameters, amplitude }, predict, trainRmse: rmse(train, predict) };
}

export function fitCandidateModels(train: FitnessPoint[]): CurveModel[] {
  const baselinePredict = (_generation: number) => 1;
  const models: CurveModel[] = [{
    name: 'baseline',
    parameters: { intercept: 1 },
    predict: baselinePredict,
    trainRmse: rmse(train, baselinePredict)
  }];

  let bestPower: CurveModel | undefined;
  for (let exponent = 0.05; exponent <= 1.500001; exponent += 0.005) {
    const model = fitLinearFeature('power-law', train, generation => generation === 0 ? 0 : generation ** exponent, { exponent });
    if (!bestPower || model.trainRmse < bestPower.trainRmse) bestPower = model;
  }
  if (bestPower) models.push(bestPower);

  let bestSaturating: CurveModel | undefined;
  for (let saturation = 0; saturation <= 0.0010001; saturation += 0.000001) {
    const model = fitLinearFeature('saturating', train, generation => generation / (1 + saturation * generation), { saturation });
    if (!bestSaturating || model.trainRmse < bestSaturating.trainRmse) bestSaturating = model;
  }
  if (bestSaturating) models.push(bestSaturating);
  return models;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function bootstrapPopulationRmse(
  test: FitnessPoint[],
  predict: (generation: number) => number,
  seed = 20261103,
  iterations = 1000
) {
  const byPopulation = new Map<string, number[]>();
  for (const point of test) {
    const errors = byPopulation.get(point.population) ?? [];
    errors.push((point.fitness - predict(point.generation)) ** 2);
    byPopulation.set(point.population, errors);
  }
  const populations = [...byPopulation.keys()];
  if (!populations.length) throw new Error('No holdout populations available for bootstrap');
  const random = seededRandom(seed);
  const samples: number[] = [];
  for (let iteration = 0; iteration < iterations; iteration++) {
    let squaredError = 0;
    let count = 0;
    for (let draw = 0; draw < populations.length; draw++) {
      const population = populations[Math.floor(random() * populations.length)];
      const errors = byPopulation.get(population)!;
      for (const error of errors) { squaredError += error; count++; }
    }
    samples.push(Math.sqrt(squaredError / count));
  }
  samples.sort((a, b) => a - b);
  return {
    lower95: samples[Math.floor(iterations * 0.025)],
    upper95: samples[Math.min(iterations - 1, Math.floor(iterations * 0.975))],
    iterations,
    seed
  };
}

export function runLteeValidation(csv: string) {
  const raw = parseFitnessCsv(csv);
  const points = aggregateReplicates(raw);
  const split = temporalSplit(points, 0.8);
  const candidates = fitCandidateModels(split.train).sort((a, b) => a.trainRmse - b.trainRmse);
  const selected = candidates[0];
  const holdout = candidates.map(model => ({
    model: model.name,
    trainRmse: Number(model.trainRmse.toFixed(6)),
    holdoutRmse: Number(rmse(split.test, model.predict).toFixed(6)),
    holdoutMae: Number((split.test.reduce((sum, point) => sum + Math.abs(point.fitness - model.predict(point.generation)), 0) / split.test.length).toFixed(6)),
    confidenceInterval95: bootstrapPopulationRmse(split.test, model.predict)
  }));
  const byPopulation = [...new Set(split.test.map(point => point.population))].map(population => {
    const rows = split.test.filter(point => point.population === population);
    return {
      population,
      holdoutPoints: rows.length,
      selectedModelRmse: Number(rmse(rows, selected.predict).toFixed(6))
    };
  });
  return {
    dataset: {
      citation: 'Wiser, Ribeck & Lenski (2014), Dryad DOI:10.5061/dryad.0hc2m',
      source: 'https://github.com/benjaminhgood/LTEE-metagenomic/blob/master/additional_data/Concatenated.LTEE.data.all.csv',
      observationsWithFitness: raw.length,
      aggregatedPopulationGenerationPoints: points.length,
      populations: new Set(points.map(point => point.population)).size,
      missingFitnessRowsExcluded: csv.trim().split(/\\r?\\n/).length - 1 - raw.length
    },
    protocol: {
      split: 'Within each population, earliest 80% of its observed generation range for calibration; latest 20% held out.',
      aggregation: 'Arithmetic mean of valid replicate fitness measurements at each population-generation pair.',
      target: 'Reported relative fitness from ancestor-vs-evolved-population competition assays.',
      selection: 'Choose among constant-baseline, power-law and saturating curves by calibration RMSE only.',
      bootstrap: '1,000 cluster-bootstrap resamples of populations; fixed seed 20261103.'
    },
    selectedModel: selected.name,
    selectedParameters: selected.parameters,
    holdoutMetrics: holdout,
    perPopulationHoldout: byPopulation,
    cutoffsByPopulation: split.cutoffs
  };
}

if (import.meta.main) {
  const csvPath = new URL('../research/data/ltee_fitness.csv', import.meta.url);
  const csv = readFileSync(csvPath, 'utf8');
  process.stdout.write(JSON.stringify(runLteeValidation(csv), null, 2) + '\\n');
}
