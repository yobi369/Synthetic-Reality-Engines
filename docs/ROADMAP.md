# Product roadmap and release gates

This roadmap distinguishes verified implementation work from remaining operational and scientific acceptance work.

## Stage 1 — Engineering foundation

- [x] Document product scope and scientific limitations.
- [x] CI typecheck, automated tests and production build.
- [x] Initial simulation construction/reset invariant tests.
- [ ] Establish a supported Node/Bun version matrix and lockfile policy.
- [ ] Add dependency and secret scanning.
- [x] Add baseline browser security headers, disable Express fingerprinting, cap JSON request bodies and bound in-process rate-limit memory.
- [x] Remove fabricated AI narration fallbacks; validate bounded AI request payloads and provider response schemas.
- [ ] Add provider deadlines/cancellation and shared rate limiting before public multi-instance exposure.

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
- [x] Add a versioned, SHA-256 content-addressed experiment-manifest utility with source revision, configuration, seed, ordered interventions, operation sequence and runtime metadata.
- [ ] Integrate experiment manifests into the run export/import and account-backed save workflows.
- [ ] Add batch runs, sensitivity analysis and confidence intervals.
- [x] Select and pin the LTEE public reference dataset; implement a reproducible, per-population temporal holdout benchmark for published adaptation-curve families.
- [x] Implement a separate LTEE forward-time subsystem with heritable selection coefficients, beneficial mutation, diminishing-returns effects, daily 1:100 serial transfer and ancestor competition assays.
- [x] Calibrate on six complete non-mutator populations and evaluate a pre-held temporal test split; compare five fitness encodings and profile parameter sensitivity.
- [x] Add a separately implemented Python reference replay that independently recalculates the selected parameter sets and calibration/holdout metrics in CI.
- [ ] Obtain external independent researcher reproduction and review before claiming independent scientific replication (tracked in [issue #2](https://github.com/yobi369/Synthetic-Reality-Engines/issues/2)).
- [ ] Connect the generic agent-based microbial preset only after a defensible genotype/resource/fitness mapping and separate acceptance study.

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

### Upgrade branch implementation notes

The `upgrade/research-platform-foundation` branch adds bounded HTTP security helpers, baseline response headers, stricter AI request/response validation, explicit provider-unavailable responses instead of fabricated narration, and a content-addressed experiment manifest utility. The rate limiter remains per-process and the manifest utility is not yet wired into the UI/export workflow; neither is presented as a completed production-scale capability.

## Scientific claims boundary

The automated suite currently establishes computational repeatability and selected state invariants. It does **not** establish empirical validity, predictive accuracy, or fidelity to real ecosystems, societies, economies, or physical systems. Those claims require a defined target domain, licensed reference data, pre-registered metrics, calibration/holdout separation, uncertainty analysis and independent replication. See [RESEARCH_VALIDATION.md](RESEARCH_VALIDATION.md).

## Deployment requirements

The current server-side adapter is single-instance file persistence. Set `DATA_DIR` to a persistent, access-restricted volume; an ephemeral container filesystem is not durable. Deploy behind HTTPS. Do not scale to multiple application instances until persistence, sessions and rate limiting use shared transactional services.

A hosted release is not accepted until the persistent volume survives restart, backups can be restored, CI passes on the exact release commit, and an operational smoke test succeeds.
