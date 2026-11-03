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
- **AI-assisted narration** — optionally request chronicles and agent-thought text through a server-side Gemini integration.

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
- Timeline forks remain in-memory. Runs can be exported/imported as versioned JSON. Architect actions are recorded in the run's intervention ledger and included in snapshots.
- The current model is a 2D agent/world simulation. It has deterministic computational regression tests, but no empirical calibration or demonstrated real-world predictive validity.
- AI-generated chronicles are narrative interpretations, not evidence or ground truth.
- Performance and population limits need formal benchmark coverage before large-scale claims are made.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/ROADMAP.md](docs/ROADMAP.md) and [SECURITY.md](SECURITY.md).

## Research and responsible use

For serious experiments, retain the preset, configuration, code revision, seed, intervention sequence, run duration and outputs. The server exposes account registration/login, owner-scoped run storage, and intervention audit endpoints. Passwords are derived with scrypt; bearer sessions are stored as SHA-256 token hashes. The default persistence adapter is an atomic, versioned JSON file store; set `DATA_DIR` to a persistent mounted volume and back it up. This is single-instance storage, not a horizontally scalable database. Use the research validation protocol in [docs/RESEARCH_VALIDATION.md](docs/RESEARCH_VALIDATION.md). Avoid using simulated outcomes as substitutes for empirical evidence or real-world policy decisions.

## Contributing

Contributions should include a clear problem statement, a focused change, tests for changed behaviour and updated documentation where user-facing behaviour or scientific interpretation changes. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

No license is currently declared. Unless a license is added, standard copyright restrictions apply; do not assume the code is open for reuse or redistribution.


## Run persistence

- Export a run as a versioned JSON snapshot and import it later from the experiment controls.
- The browser periodically autosaves the latest simulation state to local storage and attempts to restore it on the next visit.
- Snapshot restoration validates core state and restores the PRNG stream so continued simulation can be reproducible.
- Browser storage is local to the browser profile and may be cleared or quota-limited. Keep exported JSON files as portable backups; this is not cloud or multi-user persistence.


## Server-side accounts and runs

The Express server provides `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, and authenticated `/api/runs` endpoints. Run records and intervention events are scoped to the authenticated account. Use a reverse proxy with HTTPS in production. The JSON store supports an in-code schema migration from version 1 to version 2 and writes through a temporary file followed by atomic rename.

**Deployment requirement:** configure `DATA_DIR` on a persistent disk/volume. Ephemeral container filesystems are not durable. The current adapter is intended for a single server instance; use a managed relational database and shared session infrastructure before horizontal scaling or multi-instance deployment.
