import { describe, expect, test } from 'bun:test';
import { SimulationEngine } from '../src/engine/SimulationEngine';

const PRESETS = ['civilization', 'wasteland', 'galactic', 'microbial', 'sandbox'] as const;

function metrics(engine: SimulationEngine) {
  return {
    tick: engine.tick,
    population: engine.agents.length,
    meanHealth: engine.agents.length ? engine.agents.reduce((sum, a) => sum + a.health, 0) / engine.agents.length : 0,
    resources: engine.resources.reduce((sum, resource) => sum + resource.amount, 0),
    factionWealth: engine.factions.reduce((sum, faction) => sum + faction.wealth, 0)
  };
}

describe('scientific verification baselines (computational, not empirical validation)', () => {
  test('same preset, seed and operation sequence produce identical observable metrics', () => {
    for (const preset of PRESETS) {
      const a = new SimulationEngine(preset, 20261103);
      const b = new SimulationEngine(preset, 20261103);
      for (let tick = 0; tick < 50; tick++) { a.worldStep(); b.worldStep(); }
      expect(metrics(a)).toEqual(metrics(b));
      expect(a.agents).toEqual(b.agents);
      expect(a.resources).toEqual(b.resources);
      expect(a.factions).toEqual(b.factions);
    }
  });

  test('world state remains finite and within declared population bounds over a short horizon', () => {
    for (const preset of PRESETS) {
      const engine = new SimulationEngine(preset, 8080);
      for (let tick = 0; tick < 100; tick++) {
        engine.worldStep();
        expect(engine.agents.length).toBeLessThanOrEqual(engine.config.maxAgents);
        for (const agent of engine.agents) {
          for (const value of [agent.x, agent.y, agent.health, agent.energy, agent.wealth]) {
            expect(Number.isFinite(value)).toBe(true);
          }
          expect(agent.health).toBeGreaterThanOrEqual(0);
          expect(agent.energy).toBeGreaterThanOrEqual(0);
        }
        for (const resource of engine.resources) {
          expect(Number.isFinite(resource.amount)).toBe(true);
          expect(resource.amount).toBeGreaterThanOrEqual(0);
          expect(resource.amount).toBeLessThanOrEqual(resource.maxAmount);
        }
      }
      expect(engine.tick).toBe(100);
    }
  });

  test('different seeds produce distinguishable initial conditions across presets', () => {
    for (const preset of PRESETS) {
      const a = new SimulationEngine(preset, 11);
      const b = new SimulationEngine(preset, 12);
      expect(a.agents).not.toEqual(b.agents);
    }
  });

  test('interventions are ordered, timestamped and included in run snapshots', () => {
    const engine = new SimulationEngine('civilization', 91);
    engine.recordIntervention('test.parameter.change', { parameter: 'gravity', value: 0.5 });
    engine.recordIntervention('test.agent.action', { agentId: engine.agents[0]?.id });
    const events = engine.createFullSnapshot().interventions;
    expect(events).toHaveLength(2);
    expect(events?.[0]?.tick).toBe(0);
    expect(events?.[1]?.id).not.toBe(events?.[0]?.id);
    expect(events?.[0]?.recordedAt).toBeTruthy();
  });
});
