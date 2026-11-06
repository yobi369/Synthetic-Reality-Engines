# External scientific review packet

## Purpose

This packet makes the current evidence and its limits explicit so an independent computational-science reviewer can reproduce and challenge the work. It is not itself an external review, endorsement, certification, or validation claim.

## Scope of review

Please review separately:

1. The general 2D agent/world simulator under `src/engine/`.
2. The LTEE-specific research subsystem under `src/research/ltee/`.
3. The parameter-grid and multi-seed research tooling under `research/`.

Do not infer that validation of the LTEE subsystem validates the general simulator or the interactive `microbial` preset.

## Reproduction

Use the exact commit SHA under review and the lockfile:

```bash
bun install --frozen-lockfile
bun run lint
bun run test
bun run build
bun run research:batch -- --preset civilization --seeds 11,22,33,44,55 --ticks 1000 --output batch-report.json
bun run research:sensitivity -- --preset civilization --parameter resourceRegenMultiplier --values 0.5,1,1.5 --seeds 11,22,33,44,55 --ticks 1000 --output sensitivity-report.json
bun run research:ltee
bun run research:ltee-mechanistic
```

For the LTEE mechanistic pipeline, independently run the Python reproduction script against the generated report as shown in CI.

## Questions for reviewers

- Are state transitions, update order, boundary conditions and random-number use internally coherent?
- Are the selected observables scientifically meaningful and operationally defined?
- Are the parameter ranges justified independently of the observed outcomes?
- Are holdout populations and time windows genuinely independent of calibration?
- Are uncertainty intervals appropriate for the sampling design and dependence structure?
- Are sensitivity conclusions robust to seed selection, grid resolution and model misspecification?
- Can a reviewer reproduce the reported results from the immutable revision and declared inputs?
- Which claims should be narrowed, rejected or tested with external empirical data?

## Evidence to return

Please provide reviewer identity and relevant expertise, exact commit SHA, commands and environment, datasets and versions, deviations from the reproduction procedure, findings with severity, corrected calculations or counterexamples, and a clear statement of what the evidence does and does not support.

## Current limitations requiring explicit review

- The general 2D agent/world simulator has computational regression tests, not demonstrated empirical predictive validity.
- The interactive `microbial` preset is unvalidated and is not an LTEE model.
- LTEE subsystem validation is narrow and dataset-specific; it does not validate unrelated presets or mechanisms.
- Parameter-grid sensitivity results are exploratory. Correlation across grid points is descriptive and is not a causal effect estimate.
- Intervention replay, worker-based live stepping, transactional shared persistence, hosted restore acceptance and distributed rate limiting remain separate engineering gates.
- Provenance manifest integrity verifies declared content consistency, not truthful execution or external attestation.

## Review status

**Pending independent external reviewers.** No reviewer has been appointed and no external scientific endorsement is claimed.
