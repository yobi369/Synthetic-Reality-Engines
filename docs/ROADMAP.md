# Product roadmap and release gates

This roadmap distinguishes verified implementation work from remaining operational and scientific acceptance work.

## Stage 1 — Engineering foundation

- [x] Document product scope and scientific limitations.
- [x] CI typecheck, automated tests and production build.
- [x] Initial simulation construction/reset invariant tests.
- [ ] Establish a supported Node/Bun version matrix and lockfile policy.
- [ ] Add dependency and secret scanning.

## Stage 2 — Trustworthy simulation core

- [x] Replace simulation-engine ambient randomness with a seeded Mulberry32 PRNG.
- [x] Persist PRNG state and entity counters through reset, fork, export and restore.
- [x] Versioned JSON run snapshots and file-store schema migration tests.
- [x] Computational invariants for finite state, non-negative bounded resources and population caps across five presets.
- [ ] Add property-based tests for long-running state transitions.
- [ ] Implement deterministic intervention replay (events are captured and retained, but not yet replayed automatically).

## Stage 3 — Scientific experiment workflow

- [x] Export/import with format validation and deterministic continuation.
- [x] Capture architect interventions in an append-only run ledger.
- [x] Document experiment provenance and a reference-dataset validation protocol.
- [x] Add repeatable multi-preset, multi-seed performance benchmark runner.
- [ ] Add full run manifests including immutable source revision and complete execution environment.
- [ ] Add batch runs, sensitivity analysis and confidence intervals.
- [ ] Select a domain-specific empirical dataset and complete independent validation.

## Stage 4 — Performance and scale

- [x] Add a repeatable benchmark harness reporting ticks/second and selected state metrics.
- [ ] Establish baselines across controlled population sizes and runtime environments.
- [ ] Profile perception, interaction resolution, history retention and canvas rendering.
- [ ] Bound or sample long-lived logs, histories and agent memories.
- [ ] Consider worker-based stepping and render decoupling.
- [ ] Define explicit limits and graceful degradation for large worlds.

## Stage 5 — Hosted operations and security

- [x] Server-side account registration/login with scrypt password derivation.
- [x] Expiring, revocable bearer sessions; session tokens are stored as hashes.
- [x] Owner-scoped run create/list/read/delete endpoints and React account UI.
- [x] Append-only intervention ingestion/retrieval with idempotent event IDs.
- [x] Versioned single-instance JSON persistence with atomic replacement and v1-to-v2 migration.
- [x] API input bounds, payload limits, registration/login rate limits and storage readiness check.
- [ ] Replace the single-instance JSON store and in-process rate limiter with a transactional shared database before multi-instance scaling.
- [ ] Add automated backup/restore and hosted persistent-volume restart acceptance tests.
- [ ] Add structured logs, operational metrics and deployment smoke tests.
- [ ] Consolidate duplicate development/production AI API handlers and add provider deadlines/cancellation.

## Scientific claims boundary

The automated suite currently establishes computational repeatability and selected state invariants. It does **not** establish empirical validity, predictive accuracy, or fidelity to real ecosystems, societies, economies, or physical systems. Those claims require a defined target domain, licensed reference data, pre-registered metrics, calibration/holdout separation, uncertainty analysis and independent replication. See [RESEARCH_VALIDATION.md](RESEARCH_VALIDATION.md).

## Deployment requirements

The current server-side adapter is single-instance file persistence. Set `DATA_DIR` to a persistent, access-restricted volume; an ephemeral container filesystem is not durable. Deploy behind HTTPS. Do not scale to multiple application instances until persistence, sessions and rate limiting use shared transactional services.

A hosted release is not accepted until the persistent volume survives restart, backups can be restored, CI passes on the exact release commit, and an operational smoke test succeeds.
