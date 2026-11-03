# Product roadmap

This roadmap distinguishes existing prototype capabilities from work still required. A feature is not considered complete merely because a UI panel exists.

## Stage 1 — Engineering foundation

- [x] Document product scope and scientific limitations.
- [x] Add a repeatable CI gate for type checking, tests and production build.
- [x] Add initial simulation construction/reset invariant tests.
- [ ] Establish a supported Node/Bun version matrix and lockfile policy.
- [ ] Add dependency and secret scanning.

## Stage 2 — Trustworthy simulation core

- [ ] Replace ambient `Math.random` calls with an injected, versioned seeded PRNG.
- [ ] Persist PRNG state through reset, fork, export and restore.
- [ ] Add schema-versioned world snapshots and migration tests.
- [ ] Define and test invariants: finite coordinates, bounded health/energy, valid faction references, non-negative resource quantities and population caps.
- [ ] Add property-based tests for long-running state transitions.
- [ ] Add deterministic replay of architect interventions.

## Stage 3 — Scientific experiment workflow

- [ ] Define experiment/run manifests: engine revision, preset, complete config, seed, duration and intervention log.
- [ ] Support export/import with validation and integrity checks.
- [ ] Add batch runs and replicated-seed comparisons.
- [ ] Add sensitivity analysis and confidence intervals for selected metrics.
- [ ] Publish benchmark scenarios and independent validation datasets.
- [ ] Document model assumptions and known failure modes.

## Stage 4 — Performance and scale

- [ ] Establish baseline benchmarks by population size and simulation duration.
- [ ] Profile perception, interaction resolution, history retention and canvas rendering.
- [ ] Bound or sample long-lived logs, histories and agent memories.
- [ ] Consider worker-based stepping and render decoupling.
- [ ] Define explicit limits and graceful degradation for large worlds.

## Stage 5 — Production operations

- [ ] Consolidate development and production API handlers.
- [ ] Validate all API inputs with strict schemas and payload limits.
- [ ] Add rate limits, provider deadlines, cancellation and safe error responses.
- [ ] Add structured logs, metrics and readiness checks.
- [ ] Decide on persistence, tenancy and authentication before multi-user hosting.
- [ ] Add backup/restore and deployment smoke tests.

## Release gates

A research release requires reproducible seeded runs, validated export/import, documented model assumptions, automated invariants and repeatable benchmark results. A production hosted release additionally requires security controls, operational monitoring, persistence strategy and deployment acceptance testing.
