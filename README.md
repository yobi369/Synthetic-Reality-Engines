# Synthetic Reality Engines

**A programmable-world simulation workbench for studying emergent behaviour.**

Synthetic Reality Engines (SRE) is an interactive research prototype for constructing and observing artificial worlds populated by autonomous agents. The current application combines a TypeScript simulation engine with a React control surface for world observation, agent inspection, governance experiments, timeline branching, ecological events and simulation telemetry.

> SRE is an experimental simulation environment, not a validated scientific model. Results should be treated as exploratory until the underlying rules, parameters and validation datasets have been independently reviewed.

## What is in the repository

- **Simulation core** — world state, agent populations, resources, factions, buildings, weather, disasters and world progression.
- **Agent inspection** — inspect individual agents and their state, goals, memories and relationships.
- **World canvas** — observe the simulation and apply architect-level interventions.
- **Economy and governance views** — inspect market indicators, factions, laws and historical signals.
- **Evolution and timelines** — explore clades/speciation and fork or switch simulation timelines.
- **Research Lab** — run independent multi-seed batches in a Web Worker, compare outcome distributions, inspect 95% confidence intervals and export JSON reports.
- **Experiment provenance** — create SHA-256 content-addressed manifests for browser exports and account-backed saves when the build embeds a Git commit revision.
- **AI-assisted narration** — optionally request chronicles and agent-thought text through a server-side Gemini integration, with bounded request deadlines and explicit unavailable responses.

The AI endpoints are optional presentation/interpretation features. They are not the simulation authority: world state is owned by the local simulation engine.

## Technology

- React 19 + TypeScript
- Vite 6
- Tailwind CSS 4
- Canvas-based simulation visualisation
- Express API server and optional Google Gemini integration
- Bun lockfile and package manager workflow

## Run locally

Requirements: Bun (recommended) and a supported modern browser.

```bash
bun install --frozen-lockfile
cp .env.example .env
# Set GEMINI_API_KEY only if AI narration is wanted.
bun run dev
```

For account and server-side run features during development, start the API in a second terminal with `PORT=3001 bun run server:dev`; the Vite development server proxies `/api` requests to it. On Windows PowerShell, use `$env:PORT=3001; bun run server:dev`.

The Vite development server is configured for port **3000**. Run `bun run start` to launch the Express API server. For production, build with `bun run build`, then launch with `bun run start:prod`. The simulation interface can run without a Gemini API key.

## Quality commands

```bash
bun run lint
bun run test
bun run build
bun run research:batch -- --preset civilization --seeds 11,22,33 --ticks 1000 --output batch-report.json
bun run research:sensitivity -- --preset civilization --parameter resourceRegenMultiplier --values 0.5,1,1.5 --seeds 11,22,33 --ticks 1000 --output sensitivity-report.json
```

## Configuration

| Variable | Required | Purpose |
|---|---:|---|
| `GEMINI_API_KEY` | No | Server-side key for optional Gemini narration |
| `PORT` | No | HTTP server port (defaults to 3000) |
| `HOST` | No | Bind address (defaults to 0.0.0.0) |
| `NODE_ENV` | No | Set to `production` to serve the built frontend |
| `DATA_DIR` | No | Server-side JSON store directory; mount a persistent volume here in production |

Never put provider keys in Vite-exposed variables (for example, `VITE_GEMINI_API_KEY`) or commit real secrets.

## Product boundaries and current limitations

- The engine now accepts an explicit numeric seed (`new SimulationEngine(preset, seed)`) and uses an internal PRNG for engine randomness. Identical seeds and identical operation sequences reproduce engine trajectories; default construction uses a time-derived seed.
- Timeline forks remain in-memory. Runs can be exported/imported as versioned JSON. Architect actions are recorded in the run's intervention ledger and included in snapshots. Browser exports and account-backed saves can include a verifiable provenance manifest; it records declared inputs but does not independently prove that a run was honestly executed.
- The current model is a 2D agent/world simulation. It has deterministic computational regression tests, but no empirical calibration or demonstrated real-world predictive validity.
- The interactive `microbial` preset is explicitly **UNVALIDATED** and must not be presented as an LTEE or real microbial prediction model. A separate, narrow LTEE research subsystem exists under `src/research/ltee/` and is documented in `docs/EMPIRICAL_LTEE_VALIDATION.md`.
- AI-generated chronicles are narrative interpretations, not evidence or ground truth.
- Parameter-grid sensitivity analysis runs paired seeds against a baseline and reports aggregate statistics, paired deltas and descriptive parameter/outcome correlations. These are exploratory results, not causal estimates.
- Deterministic intervention replay is not yet available. The ledger records user actions, but some existing events omit resolved random inputs or complete spawn parameters; those records cannot yet be replayed faithfully.
- Live simulation stepping still runs on the main browser thread. The Research Lab batch worker does not move the interactive world loop off-thread.
- Performance and population limits need formal benchmark coverage before large-scale claims are made.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/ROADMAP.md](docs/ROADMAP.md), [docs/INTERVENTION_REPLAY.md](docs/INTERVENTION_REPLAY.md), [docs/EXTERNAL_SCIENTIFIC_REVIEW.md](docs/EXTERNAL_SCIENTIFIC_REVIEW.md) and [SECURITY.md](SECURITY.md).

## Research and responsible use

For serious experiments, retain the preset, configuration, code revision, seed, intervention sequence, run duration and outputs. The server exposes account registration/login, owner-scoped run storage, and intervention audit endpoints. Passwords are derived with scrypt; bearer sessions are stored as SHA-256 token hashes. The default persistence adapter is an atomic, versioned JSON file store (schema v3, with v1/v2 migration); set `DATA_DIR` to a persistent mounted volume and back it up. Account-backed runs persist optional verified experiment manifests. This is single-instance storage, not a horizontally scalable database. Use the research validation protocol in [docs/RESEARCH_VALIDATION.md](docs/RESEARCH_VALIDATION.md). Avoid using simulated outcomes as substitutes for empirical evidence or real-world policy decisions.

## Contributing

Contributions should include a clear problem statement, a focused change, tests for changed behaviour and updated documentation where user-facing behaviour or scientific interpretation changes. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License and intellectual property

This project is proprietary and **All Rights Reserved**. No open-source license is granted. You may view the public repository, but viewing or accessing it does not grant permission to copy, modify, redistribute, sublicense, commercially exploit, or create derivative works from the project without prior written permission from the copyright holder.

Commercial use, third-party deployment, product integration, redistribution, and derivative development require a separate written license or agreement. Third-party dependencies and other separately licensed materials remain subject to their own license terms.

See the [LICENSE](LICENSE) file for the complete terms. Licensing enquiries can be made through the [GitHub repository owner](https://github.com/yobi369).

## Run persistence

- Export a run as a versioned JSON snapshot and import it later from the experiment controls. When the frontend build embeds a valid Git commit SHA, exports include a SHA-256 experiment manifest; import verifies the digest when a manifest is present.
- The browser periodically autosaves the latest simulation state to local storage and attempts to restore it on the next visit.
- Snapshot restoration validates core state and restores the PRNG stream so continued simulation can be reproducible.
- Browser autosave remains local to the browser profile and may be cleared or quota-limited. Account-backed saves are available through the server API; retain exported JSON files as portable backups.

## Server-side accounts and runs

The Express server provides `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, and authenticated `/api/runs` endpoints. Run records and intervention events are scoped to the authenticated account. Use a reverse proxy with HTTPS in production. The current in-process rate limiter is bounded but not shared between instances; do not horizontally scale this adapter. The JSON store supports in-code migrations from schema versions 1 and 2 to version 3 and writes through a temporary file followed by atomic rename. Account-backed run saves verify optional experiment-manifest digests before persisting them.

**Deployment requirement:** configure `DATA_DIR` on a persistent disk/volume. Ephemeral container filesystems are not durable. The current adapter is intended for a single server instance; use a managed relational database and shared session infrastructure before horizontal scaling or multi-instance deployment.


## Storage backends

The server supports two storage backends:

- **Local development:** when both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are unset, the existing versioned JSON store remains active. Set `DATA_DIR` to choose its directory.
- **Shared PostgreSQL:** set both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the server process to use the dedicated Supabase PostgreSQL database. Supplying only one variable is a startup configuration error; the application will not silently fall back to JSON when a partial database configuration is present.

The service-role key is a server secret. Never put it in a `VITE_*` variable, frontend bundle, checked-in `.env` file, or browser request. The browser continues to call this application's authenticated API; it does not connect directly to Supabase.

The schema is versioned in `supabase/migrations/`. The initial migration creates account, hashed-session, run-snapshot, and intervention tables; enforces ownership through composite keys and foreign keys; and enables Row Level Security while granting data access only to the server's `service_role`. Run migrations only against the dedicated **Synthetic-Reality-Engines-DB** project, not another project in the organization.

For Supabase application traffic, this integration uses the HTTPS Data API and server-only service-role authentication. The existing JSON backend remains available for isolated local tests and development. Existing JSON files are not automatically copied into PostgreSQL; use a separately reviewed, verified migration/export process before moving any production user data.
