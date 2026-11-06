# Experiment manifest format

The research module `research/experiment-manifest.ts` defines a version-1, content-addressed manifest for an experiment run. It is intended to make the inputs needed to reproduce a run explicit and tamper-evident.

## Recorded fields

- Experiment identifier and creation timestamp.
- Immutable source revision (Git commit SHA), engine version and preset.
- Full JSON configuration and unsigned 32-bit random seed.
- Ordered intervention ledger, including event IDs, ticks, epochs, action names and parameters.
- Tick horizon and ordered operation sequence (for example, stepping, pausing and resuming).
- Analysis version and runtime name, version, platform and architecture.

## Integrity

The manifest is serialized using recursively sorted object keys and hashed with SHA-256. The digest is stored alongside the manifest. `verifyExperimentManifest` recomputes the digest and detects post-creation edits. The utility rejects invalid seeds, malformed revisions, invalid event ordering, duplicate event IDs, oversized ledgers and non-JSON/non-finite values.

## Current integration boundary

This module is a tested foundation, not yet an automatic guarantee for every saved run. The browser run export/import and account-backed storage paths must be connected to manifest creation and verification before the product can claim end-to-end provenance enforcement. A digest proves that a manifest has not changed relative to its digest; it does not prove that the source code, runtime or reported experiment was truthful.

## Example

```ts
const manifest = createExperimentManifest({
  experimentId: 'baseline-001',
  sourceRevision: '0123456789abcdef0123456789abcdef01234567',
  engineVersion: '0.1.0',
  preset: 'civilization',
  configuration: { populationCap: 500 },
  seed: 42,
  interventions: [],
  tickHorizon: 10_000,
  operationSequence: ['step:10000'],
  analysisVersion: 'analysis-1',
  runtime: { name: 'bun', version: '1.x', platform: 'linux', architecture: 'x64' },
});

if (!verifyExperimentManifest(manifest)) throw new Error('Manifest integrity check failed');
```
