import { describe, expect, test } from 'bun:test';
import { pearsonCorrelation, summarize } from '../research/statistics';

describe('repeat-run statistical summaries', () => {
  test('computes sample mean, deviation and a Student-t interval', () => {
    const result = summarize([1, 2, 3, 4, 5]);
    expect(result.count).toBe(5);
    expect(result.mean).toBe(3);
    expect(result.sampleStandardDeviation).toBeCloseTo(Math.sqrt(2.5));
    expect(result.confidence95.lower).toBeLessThan(3);
    expect(result.confidence95.upper).toBeGreaterThan(3);
  });
  test('handles one observation without inventing uncertainty', () => {
    expect(summarize([7]).confidence95).toEqual({ lower: 7, upper: 7 });
  });
  test('rejects empty and non-finite samples', () => {
    expect(() => summarize([])).toThrow();
    expect(() => summarize([1, Number.NaN])).toThrow();
  });
  test('computes paired Pearson correlation', () => {
    expect(pearsonCorrelation([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    expect(() => pearsonCorrelation([1, 1, 1], [2, 3, 4])).toThrow();
  });
});
