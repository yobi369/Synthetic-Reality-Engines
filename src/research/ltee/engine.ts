/**
 * LTEE-specific, forward-time population-genetics model.
 *
 * Scope: a deterministic-seeded, finite-bottleneck approximation of the
 * daily LTEE serial-transfer protocol. It is deliberately separate from the
 * interactive agent-based SimulationEngine.
 */
export const LTEE_GENERATIONS_PER_TRANSFER = Math.log2(100);
export const LTEE_TRANSFER_RATIO = 100;
export const LTEE_DAILY_MUTATION_WINDOW = LTEE_GENERATIONS_PER_TRANSFER;

export interface LteeModelParameters {
  /** Per-cell beneficial mutation probability per bacterial generation. */
  beneficialMutationRate: number;
  /** Mean of the exponential distribution of beneficial selection effects. */
  meanBeneficialEffect: number;
  /** Diminishing-returns coefficient acting on the current genetic background. */
  diminishingReturns: number;
  /** Aggregate-model transfer bottleneck; default 5e6, represented by fitness classes rather than individual cells. */
  effectiveBottleneck: number;
  /** Maximum explicit fitness classes retained after each transfer. */
  maxFitnessClasses: number;
}

export const DEFAULT_LTEE_PARAMETERS: LteeModelParameters = {
  beneficialMutationRate: 0.000003,
  meanBeneficialEffect: 0.025,
  diminishingReturns: 1,
  effectiveBottleneck: 5_000_000,
  maxFitnessClasses: 64
};

export interface LteeFitnessClass {
  /** Per-generation logit selection coefficient relative to the ancestor. */
  selectionCoefficient: number;
  frequency: number;
}

export interface LteePopulationSnapshot {
  generation: number;
  transfer: number;
  classes: LteeFitnessClass[];
}

export interface LteeAssayInput {
  initialEvolvedCount: number;
  initialAncestorCount: number;
  ancestorLogFoldChange: number;
}

export interface LteeAssayPrediction {
  /** Original LTEE statistic: evolved/ancestor realized growth-rate ratio. */
  relativeFitness: number;
  /** Logit-encoded selection per transfer cycle. */
  logitPerCycle: number;
  /** Logit-encoded selection per ancestor generation; relativeFitness - 1. */
  logitPerGeneration: number;
  /** Log-encoded change in evolved relative abundance per cycle. */
  logPerCycle: number;
  /** Log-encoded change in evolved relative abundance per ancestor generation. */
  logPerGeneration: number;
  finalEvolvedFrequency: number;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: number, label: string): number {
  let hash = seed >>> 0;
  for (let i = 0; i < label.length; i++) {
    hash = Math.imul(hash ^ label.charCodeAt(i), 16777619) >>> 0;
  }
  return hash >>> 0;
}

function poisson(lambda: number, random: () => number): number {
  if (!(lambda > 0)) return 0;
  if (lambda < 30) {
    const threshold = Math.exp(-lambda);
    let product = 1;
    let count = 0;
    do {
      count++;
      product *= Math.max(random(), Number.MIN_VALUE);
    } while (product > threshold);
    return count - 1;
  }
  const u1 = Math.max(random(), Number.MIN_VALUE);
  const u2 = random();
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * normal));
}

function mergeToClassLimit(classes: Map<number, number>, limit: number): void {
  while (classes.size > limit) {
    let rarestKey = 0;
    let rarestCount = Infinity;
    for (const [key, count] of classes) {
      if (count < rarestCount) {
        rarestCount = count;
        rarestKey = key;
      }
    }
    classes.delete(rarestKey);
    let nearestKey: number | undefined;
    let nearestDistance = Infinity;
    for (const key of classes.keys()) {
      const distance = Math.abs(key - rarestKey);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestKey = key;
      }
    }
    if (nearestKey === undefined) {
      classes.set(rarestKey, rarestCount);
    } else {
      classes.set(nearestKey, (classes.get(nearestKey) ?? 0) + rarestCount);
    }
  }
}

function normalizeBottleneck(classes: Map<number, number>, size: number, random: () => number): void {
  const sampled = new Map<number, number>();
  let total = 0;
  let largestKey = 0;
  let largestCount = -1;
  for (const [key, count] of classes) {
    const draw = poisson(count, random);
    if (draw > 0) {
      sampled.set(key, draw);
      total += draw;
      if (draw > largestCount) {
        largestCount = draw;
        largestKey = key;
      }
    }
  }
  if (total === 0) {
    sampled.set(0, size);
  } else {
    const adjusted = (sampled.get(largestKey) ?? 0) + size - total;
    if (adjusted > 0) sampled.set(largestKey, adjusted);
    else {
      // This is an exceptionally unlikely Poisson-tail case; use the largest
      // surviving class as the deterministic correction recipient.
      const key = [...sampled.keys()].sort((a, b) => (sampled.get(b) ?? 0) - (sampled.get(a) ?? 0))[0];
      sampled.set(key, Math.max(1, (sampled.get(key) ?? 0) + size - total));
    }
  }
  classes.clear();
  for (const [key, count] of sampled) if (count > 0) classes.set(key, count);
  const correctedTotal = [...classes.values()].reduce((sum, count) => sum + count, 0);
  if (correctedTotal !== size) {
    const key = [...classes.keys()].sort((a, b) => (classes.get(b) ?? 0) - (classes.get(a) ?? 0))[0];
    classes.set(key, (classes.get(key) ?? 0) + size - correctedTotal);
  }
}

export function interpolateSnapshot(
  before: LteePopulationSnapshot,
  after: LteePopulationSnapshot,
  generation: number
): LteePopulationSnapshot {
  if (after.generation === before.generation) return after;
  const fraction = Math.max(0, Math.min(1, (generation - before.generation) / (after.generation - before.generation)));
  const frequencies = new Map<number, number>();
  for (const item of before.classes) frequencies.set(Math.round(item.selectionCoefficient * 1e6), item.frequency * (1 - fraction));
  for (const item of after.classes) {
    const key = Math.round(item.selectionCoefficient * 1e6);
    frequencies.set(key, (frequencies.get(key) ?? 0) + item.frequency * fraction);
  }
  return {
    generation,
    transfer: before.transfer + (after.transfer - before.transfer) * fraction,
    classes: [...frequencies.entries()].map(([key, frequency]) => ({
      selectionCoefficient: key / 1e6,
      frequency
    })).filter(item => item.frequency > 0)
  };
}

/**
 * Simulate one LTEE population. Selection acts during each ~6.64-generation
 * batch-growth phase. Beneficial mutations arise at the end of the growth
 * phase and first affect descendants in the next cycle. A Poissonized,
 * fixed-size bottleneck approximates the 1:100 daily serial transfer.
 */
export function simulateLteePopulation(
  population: string,
  sampleGenerations: number[],
  parameters: LteeModelParameters,
  seed = 20261103
): Map<number, LteePopulationSnapshot> {
  if (parameters.beneficialMutationRate < 0 || parameters.meanBeneficialEffect <= 0 ||
      parameters.diminishingReturns < 0 || parameters.effectiveBottleneck < 100 ||
      parameters.maxFitnessClasses < 2) {
    throw new Error('Invalid LTEE model parameters');
  }
  const targets = [...new Set(sampleGenerations)].sort((a, b) => a - b);
  if (targets.some(generation => !Number.isFinite(generation) || generation < 0)) {
    throw new Error('Sample generations must be finite and non-negative');
  }
  const random = mulberry32(hashSeed(seed, population));
  const binWidth = 0.0001;
  const classes = new Map<number, number>([[0, parameters.effectiveBottleneck]]);
  const result = new Map<number, LteePopulationSnapshot>();
  let generation = 0;
  let transfer = 0;
  let targetIndex = 0;
  let previous: LteePopulationSnapshot = {
    generation: 0,
    transfer: 0,
    classes: [{ selectionCoefficient: 0, frequency: 1 }]
  };

  while (targetIndex < targets.length && targets[targetIndex] === 0) {
    result.set(0, previous);
    targetIndex++;
  }

  const maxGeneration = targets[targets.length - 1] ?? 0;
  while (generation < maxGeneration) {
    const dt = LTEE_GENERATIONS_PER_TRANSFER;
    const maximumCoefficient = Math.max(...classes.keys()) * binWidth;
    const weights = new Map<number, number>();
    let weightTotal = 0;
    for (const [key, count] of classes) {
      const weight = count * Math.exp((key * binWidth - maximumCoefficient) * dt);
      weights.set(key, weight);
      weightTotal += weight;
    }

    const selected = new Map<number, number>();
    for (const [key, weight] of weights) {
      selected.set(key, weightTotal > 0 ? weight / weightTotal * parameters.effectiveBottleneck : 0);
    }

    // Mutations occur at the end of the batch-growth phase; their effects are
    // expressed after the next transfer. Mutation counts are Poisson draws
    // under the per-cell mutation probability U * generations-per-transfer.
    const mutated = new Map<number, number>();
    const mutationProbability = 1 - Math.exp(-parameters.beneficialMutationRate * dt);
    for (const [key, count] of selected) {
      const mutationCount = Math.min(Math.floor(count), poisson(count * mutationProbability, random));
      const remaining = Math.max(0, count - mutationCount);
      if (remaining > 0) mutated.set(key, (mutated.get(key) ?? 0) + remaining);
      for (let event = 0; event < mutationCount; event++) {
        const parentCoefficient = key * binWidth;
        const meanEffect = parameters.meanBeneficialEffect *
          Math.exp(-parameters.diminishingReturns * Math.max(0, parentCoefficient));
        const effect = -meanEffect * Math.log(Math.max(random(), Number.MIN_VALUE));
        const mutantKey = Math.max(key + 1, Math.round((parentCoefficient + effect) / binWidth));
        mutated.set(mutantKey, (mutated.get(mutantKey) ?? 0) + 1);
      }
    }

    mergeToClassLimit(mutated, parameters.maxFitnessClasses);
    normalizeBottleneck(mutated, parameters.effectiveBottleneck, random);
    classes.clear();
    for (const [key, count] of mutated) classes.set(key, count);

    const previousGeneration = generation;
    generation += dt;
    transfer++;
    const current: LteePopulationSnapshot = {
      generation,
      transfer,
      classes: [...classes.entries()].map(([key, count]) => ({
        selectionCoefficient: key * binWidth,
        frequency: count / parameters.effectiveBottleneck
      }))
    };

    while (targetIndex < targets.length && targets[targetIndex] <= generation) {
      const target = targets[targetIndex];
      result.set(target, interpolateSnapshot(
        previous,
        current,
        Math.max(previousGeneration, target)
      ));
      targetIndex++;
    }
    previous = current;
  }
  return result;
}

export function predictLteeCompetition(
  snapshot: LteePopulationSnapshot,
  assay: LteeAssayInput
): LteeAssayPrediction {
  const { initialEvolvedCount, initialAncestorCount, ancestorLogFoldChange } = assay;
  if (!(initialEvolvedCount > 0) || !(initialAncestorCount > 0) || !(ancestorLogFoldChange > 0)) {
    throw new Error('Competition assay requires positive counts and ancestor log fold-change');
  }
  let maxExponent = -Infinity;
  for (const item of snapshot.classes) {
    maxExponent = Math.max(maxExponent, Math.log(item.frequency) +
      item.selectionCoefficient * ancestorLogFoldChange);
  }
  let evolvedFoldChange = 0;
  for (const item of snapshot.classes) {
    evolvedFoldChange += Math.exp(Math.log(item.frequency) +
      item.selectionCoefficient * ancestorLogFoldChange - maxExponent);
  }
  const logitPerCycle = maxExponent + Math.log(evolvedFoldChange);
  const logitPerGeneration = logitPerCycle / ancestorLogFoldChange;
  const initialFrequency = initialEvolvedCount / (initialEvolvedCount + initialAncestorCount);
  const initialLogit = Math.log(initialFrequency / (1 - initialFrequency));
  const finalLogit = initialLogit + logitPerCycle;
  const finalFrequency = finalLogit >= 0
    ? 1 / (1 + Math.exp(-finalLogit))
    : Math.exp(finalLogit) / (1 + Math.exp(finalLogit));
  const logPerCycle = Math.log(finalFrequency) - Math.log(initialFrequency);
  return {
    relativeFitness: 1 + logitPerGeneration,
    logitPerCycle,
    logitPerGeneration,
    logPerCycle,
    logPerGeneration: logPerCycle / ancestorLogFoldChange,
    finalEvolvedFrequency: finalFrequency
  };
}
