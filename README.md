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

The Vite development server is configured for port **3000**. The simulation interface can run without a Gemini API key; AI-assisted endpoints should report that the provider is not configured rather than pretending that generated content came from a model.

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

Never put provider keys in Vite-exposed variables (for example, `VITE_GEMINI_API_KEY`) or commit real secrets.

## Product boundaries and current limitations

- The engine now accepts an explicit numeric seed (`new SimulationEngine(preset, seed)`) and uses an internal PRNG for engine randomness. Identical seeds and identical operation sequences reproduce engine trajectories; default construction uses a time-derived seed.
- Timeline snapshots are in-memory application state; durable persistence, schema-versioned exports and restore workflows are not yet established.
- The current model is a 2D agent/world simulation. It does not claim physically validated mechanics, real-world predictive accuracy or scientific reproducibility.
- AI-generated chronicles are narrative interpretations, not evidence or ground truth.
- Performance and population limits need formal benchmark coverage before large-scale claims are made.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/ROADMAP.md](docs/ROADMAP.md) and [SECURITY.md](SECURITY.md).

## Research and responsible use

For serious experiments, record the preset, configuration, code revision, intervention sequence, run duration and observed outputs. For reproducible comparisons, provide the same explicit seed and record the preset, configuration, code revision, seed and intervention sequence. Exportable run manifests and durable snapshots remain future work. Avoid using simulated outcomes as substitutes for empirical evidence or real-world policy decisions.

## Contributing

Contributions should include a clear problem statement, a focused change, tests for changed behaviour and updated documentation where user-facing behaviour or scientific interpretation changes. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

No license is currently declared. Unless a license is added, standard copyright restrictions apply; do not assume the code is open for reuse or redistribution.
