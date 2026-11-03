# Contributing

## Before changing code

1. Read [the architecture overview](docs/ARCHITECTURE.md) and [the roadmap](docs/ROADMAP.md).
2. Keep changes focused and preserve the distinction between simulation state and UI presentation.
3. Do not describe an unvalidated simulation outcome as scientific evidence.

## Local verification

```bash
bun install --frozen-lockfile
bun run lint
bun run test
bun run build
```

## Pull requests

Include:
- the problem and intended behaviour;
- affected engine concepts and UI surfaces;
- tests and commands actually run;
- performance or compatibility impact;
- documentation changes for new model assumptions or limitations.

Avoid committing generated build output, local environment files, credentials or user data.
