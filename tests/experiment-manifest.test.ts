import { describe, expect, test } from 'bun:test';
import { createExperimentManifest, verifyExperimentManifest } from '../research/experiment-manifest';

const input = {
  experimentId: 'baseline-run-01', sourceRevision: 'abcdef1234567', engineVersion: '0.1.0', preset: 'civilization',
  configuration: { world: { height: 80, width: 100 }, populationCap: 500 }, seed: 42,
  interventions: [
    { id: 'event-1', tick: 5, epoch: 1, action: 'policy.change', parameters: { tax: 0.1 } },
    { id: 'event-2', tick: 9, epoch: 2, action: 'resource.adjust', parameters: { amount: 3 } },
  ],
  tickHorizon: 100, operationSequence: ['step:10', 'pause', 'step:90'], analysisVersion: 'analysis-1',
  runtime: { name: 'bun', version: '1.x', platform: 'linux', architecture: 'x64' }, createdAt: '2026-01-01T00:00:00.000Z',
} as const;

describe('experiment provenance manifests', () => {
  test('creates a verifiable, content-addressed manifest', async () => {
    const manifest = await createExperimentManifest(input);
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(await verifyExperimentManifest(manifest)).toBe(true);
  });

  test('canonical digest does not depend on object key insertion order', async () => {
    const first = await createExperimentManifest(input);
    const reordered = await createExperimentManifest({ ...input, configuration: { populationCap: 500, world: { width: 100, height: 80 } } });
    expect(first.digest).toBe(reordered.digest);
  });

  test('detects any post-creation experiment modification', async () => {
    const manifest = await createExperimentManifest(input);
    const altered = { ...manifest, seed: 43 };
    expect(await verifyExperimentManifest(altered)).toBe(false);
  });

  test('rejects unordered or duplicate intervention events', async () => {
    await expect(createExperimentManifest({ ...input, interventions: [...input.interventions].reverse() })).rejects.toThrow();
    await expect(createExperimentManifest({ ...input, interventions: [input.interventions[0], { ...input.interventions[1], id: 'event-1' }] })).rejects.toThrow();
  });

  test('rejects invalid seeds and non-finite values', async () => {
    await expect(createExperimentManifest({ ...input, seed: -1 })).rejects.toThrow();
    await expect(createExperimentManifest({ ...input, configuration: { invalid: Number.NaN } })).rejects.toThrow();
  });
});
