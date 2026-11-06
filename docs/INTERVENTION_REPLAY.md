# Deterministic intervention replay

## Contract

Replay starts from a fresh engine initialized with the recorded preset and unsigned 32-bit seed. The event list is applied in its original order. The engine advances to each event's recorded tick before applying that event. The same seed, engine revision, preset, event order and supported parameters are required.

`replayInterventionHistory` intentionally fails closed when an event is unknown, incomplete, non-monotonic or not safe to reproduce. It does not silently skip unsupported events.

## Supported historical actions

- World reset/preset/seed reset events with their recorded preset and seed.
- Pause, resume, speed changes, single-step and epoch-leap markers.
- Validated world configuration updates.
- Explicit weather changes.
- Disaster triggers (the engine's seeded PRNG resolves omitted disaster coordinates).
- Cosmic tool events with explicit tool and coordinates.
- Agent healing and wealth boosts with explicit target and amount.
- Agent cloning when the source and recorded clone identifier match the replayed result.
- Governance decrees with recorded identifier, title, category and effects.

## Unsupported actions

- Custom agent spawn events: the current historical event records do not contain the complete resolved coordinates and genetics.
- AI agent directives: the event stores the request text, but a later provider response can mutate the agent state and is not captured as a resolved event output.
- Timeline fork/switch and imported-run events: these require checkpoint graph semantics, not a linear event stream.
- Any unknown future action.

Do not edit old event records to fabricate missing inputs. Update the event producer to record complete, validated, resolved inputs before enabling a new action for replay.

## Alternative futures

`compareAlternativeFutures` replays the common history to a fork tick, captures one immutable fork snapshot, restores two independent engines from that snapshot, applies their respective future event streams, and advances both to the same horizon. The result includes branch snapshots and comparable population, wealth, health, resource and weather outcomes.

For a valid comparison, use the same engine revision, preset, seed, fork tick, horizon and shared history. Change only the declared future intervention stream. Treat differences as model-conditional outcomes, not causal claims about the real world.

## Current limitations

This is deterministic replay for the explicitly supported subset, not full replay of every historical interaction. Event replay across timeline jumps requires checkpoint graph support. Wall-clock identifiers may differ in snapshots even when scientific observables match; tests therefore compare deterministic trajectories and reported observables rather than asserting byte-identical JSON snapshots.
