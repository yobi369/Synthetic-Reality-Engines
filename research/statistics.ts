export interface SummaryStatistics {
  count: number;
  mean: number;
  sampleStandardDeviation: number;
  confidence95: { lower: number; upper: number };
}

const T_975: Record<number, number> = {
  2: 12.706, 3: 4.303, 4: 3.182, 5: 2.776, 6: 2.571, 7: 2.447, 8: 2.365, 9: 2.306,
  10: 2.262, 11: 2.228, 12: 2.201, 13: 2.179, 14: 2.160, 15: 2.145, 16: 2.131,
  17: 2.120, 18: 2.110, 19: 2.101, 20: 2.093, 21: 2.086, 22: 2.080, 23: 2.074,
  24: 2.069, 25: 2.064, 26: 2.060, 27: 2.056, 28: 2.052, 29: 2.048, 30: 2.045,
};

export function summarize(values: readonly number[]): SummaryStatistics {
  if (values.length === 0 || values.some(value => !Number.isFinite(value))) throw new Error('Statistics require at least one finite observation.');
  const count = values.length;
  const average = values.reduce((sum, value) => sum + value, 0) / count;
  const variance = count > 1 ? values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (count - 1) : 0;
  const standardDeviation = Math.sqrt(variance);
  const critical = count === 1 ? 0 : (T_975[count] ?? 1.96);
  const margin = count === 1 ? 0 : critical * standardDeviation / Math.sqrt(count);
  return { count, mean: average, sampleStandardDeviation: standardDeviation, confidence95: { lower: average - margin, upper: average + margin } };
}

export function pearsonCorrelation(x: readonly number[], y: readonly number[]): number {
  if (x.length !== y.length || x.length < 3 || [...x, ...y].some(value => !Number.isFinite(value))) throw new Error('Correlation requires at least three paired finite observations.');
  const meanX = x.reduce((sum, value) => sum + value, 0) / x.length;
  const meanY = y.reduce((sum, value) => sum + value, 0) / y.length;
  const numerator = x.reduce((sum, value, index) => sum + (value - meanX) * (y[index] - meanY), 0);
  const denominatorX = Math.sqrt(x.reduce((sum, value) => sum + (value - meanX) ** 2, 0));
  const denominatorY = Math.sqrt(y.reduce((sum, value) => sum + (value - meanY) ** 2, 0));
  if (denominatorX === 0 || denominatorY === 0) throw new Error('Correlation is undefined for a constant input.');
  return numerator / (denominatorX * denominatorY);
}
