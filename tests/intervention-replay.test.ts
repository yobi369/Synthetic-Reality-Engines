import { describe, expect, test } from 'bun:test';
import type { InterventionEvent } from '../src/types/simulation';
import { compareAlternativeFutures, replayInterventionHistory } from '../research/intervention-replay';

function event(tick: number, action: string, parameters: Record<string, unknown>): InterventionEvent {
  return { id: `evt-${tick}-${action}`, tick, epoch: 1, action, parameters, recordedAt: '2026-01-01T00:00:00.000Z' };
}

describe('deterministic intervention replay', () => {
  test('replays supported weather and configuration actions for a fixed seed', () => {
    const events = [
      event(0, 'weather.set', { type: 'solar_flare' }),
      event(5, 'world.config.update', { resourceRegenMultiplier: 1.25 }),
    ];
    const first = replayInterventionHistory({ preset: 'civilization', seed: 123, events, targetTick: 30 });
    const second = replayInterventionHistory({ preset: 'civilization', seed: 123, events, targetTick: 30 });
    expect(first.tick).toBe(30);
    expect(first.weather.currentType).toBe('solar_flare');
    expect(first.agents.length).toBe(second.agents.length);
    expect(first.agents.map(agent => [agent.id, agent.x, agent.y, agent.health])).toEqual(second.agents.map(agent => [agent.id, agent.x, agent.y, agent.health]));
  });

  test('fails closed when historical events omit inputs required for replay', () => {
    expect(() => replayInterventionHistory({
      preset: 'civilization', seed: 123, events: [event(0, 'agent.spawn', { agentId: 'agent_1' })], targetTick: 5,
    })).toThrow(/not replay-safe/);
    expect(() => replayInterventionHistory({
      preset: 'civilization', seed: 123, events: [event(0, 'agent.directive', { agentId: 'agent_1', directive: 'think' })], targetTick: 5,
    })).toThrow(/not replay-safe/);
  });

  test('compares two futures from the same fork snapshot', () => {
    const result = compareAlternativeFutures({
      preset: 'civilization', seed: 42, history: [], forkTick: 10, horizonTick: 40,
      alternativeFutureEvents: [event(10, 'weather.set', { type: 'acid_rain' })],
    });
    expect(result.baseline.snapshot.tick).toBe(40);
    expect(result.alternative.snapshot.tick).toBe(40);
    expect(result.baseline.weather).not.toBe(result.alternative.weather);
  });
});
