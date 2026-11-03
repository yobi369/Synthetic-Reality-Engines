# Architecture

## System overview

SRE is currently a browser-first application with a local in-memory simulation engine and optional server-side AI narration.

```text
React application (src/App.tsx)
  ├── Control surfaces and views (src/components/)
  ├── SimulationEngine (src/engine/SimulationEngine.ts)
  │     ├── World presets
  │     ├── Agents, factions, resources and buildings
  │     ├── Weather, disasters and anomalies
  │     ├── Economy, laws and evolution
  │     └── History and in-memory timeline snapshots
  └── HTTP API
        ├── /api/health
        ├── /api/chronicler
        └── /api/agent-thought
              └── Optional Gemini provider
```

The engine is instantiated by the React application and advanced by the browser animation loop. Components receive snapshots/arrays of the engine's current state for rendering. The engine, not the AI provider, owns authoritative simulation state.

## Main domain concepts

- **WorldConfig** defines dimensions, environmental parameters, capacity and biome selection.
- **Agent** represents an autonomous entity with needs, state, role, genetics, memory and relationships.
- **Faction** groups agents and carries ideology, wealth, technology, territory and policy parameters.
- **ResourceNode / Building** model harvestable resources and constructed infrastructure.
- **WeatherState / DisasterEvent / CosmicAnomaly** modify environmental conditions and world events.
- **WorldLaw** represents proposed, ratified or repealed policy with configurable effects.
- **SpeciesClade** records lineage and aggregate traits.
- **TimelineFork** stores an in-memory snapshot of selected world state.
- **HistoryDataPoint / WorldLog** provide observability and narrative context.

## Runtime responsibilities

### Browser

The browser owns the active simulation instance and rendering loop. UI controls invoke engine methods and then synchronize visible state. This is suitable for an interactive single-user prototype, but it is not a multi-user authoritative simulation service.

### API server

The Express server provides health and optional AI endpoints. Provider credentials must remain server-side. API request validation, rate limiting, provider timeouts, structured error handling and operational telemetry are required before exposing these endpoints to untrusted public traffic.

The Vite development middleware also implements API routes. Keep development and production behaviour aligned; avoid maintaining two independent copies of provider logic as the API evolves.

## State and determinism

The current engine uses ambient randomness in agent behaviour and other simulation operations. Therefore:
- a run cannot yet be reconstructed from its initial preset alone;
- timeline snapshots are not durable archives;
- comparing two runs does not constitute a controlled experiment.

A future deterministic design should inject a versioned PRNG into the engine, persist its state in snapshots, and record configuration, engine version, seed and intervention events in a run manifest.

## Scientific interpretation

The engine is an artificial-world sandbox. A plausible-looking emergent pattern is not automatically evidence of a real-world mechanism. Research-grade claims require explicit hypotheses, operational definitions, calibration, sensitivity analysis, replicated seeded runs and independent validation against appropriate external data.

## Recommended future boundaries

1. Extract pure domain rules from the UI and isolate side effects behind interfaces.
2. Add seeded randomness and schema-versioned serialisation.
3. Build invariant/property tests for state transitions and resource accounting.
4. Add benchmark scenarios and population scaling measurements.
5. Separate API implementation from Vite middleware and apply production request controls.
6. Add experiment manifests, replayable interventions and export/import validation.
