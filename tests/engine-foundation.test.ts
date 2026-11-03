import { describe, expect, test } from "bun:test";
import { SimulationEngine } from "../src/engine/SimulationEngine";

describe("SimulationEngine foundation", () => {
  test("initializes a populated world with valid dimensions and a prime timeline", () => {
    const engine = new SimulationEngine("civilization");

    expect(engine.config.width).toBeGreaterThan(0);
    expect(engine.config.height).toBeGreaterThan(0);
    expect(engine.agents.length).toBeGreaterThan(0);
    expect(engine.agents.length).toBeLessThanOrEqual(engine.config.maxAgents);
    expect(engine.timelineForks).toHaveLength(1);
    expect(engine.timelineForks[0]?.id).toBe("fork_prime");
    expect(engine.tick).toBe(0);
    expect(engine.epoch).toBe(1);
  });

  test("starts agents with unique identifiers and valid faction references", () => {
    const engine = new SimulationEngine("civilization");
    const ids = engine.agents.map((agent) => agent.id);
    const factionIds = new Set(engine.factions.map((faction) => faction.id));

    expect(new Set(ids).size).toBe(ids.length);
    for (const agent of engine.agents) {
      expect(factionIds.has(agent.factionId)).toBe(true);
      expect(Number.isFinite(agent.x)).toBe(true);
      expect(Number.isFinite(agent.y)).toBe(true);
      expect(Number.isFinite(agent.health)).toBe(true);
      expect(Number.isFinite(agent.energy)).toBe(true);
    }
  });

  test("reset restores a clean world at epoch one", () => {
    const engine = new SimulationEngine("civilization");
    engine.worldStep();
    engine.reset("wasteland");

    expect(engine.config.presetId).toBe("wasteland");
    expect(engine.tick).toBe(0);
    expect(engine.epoch).toBe(1);
    expect(engine.timelineForks).toHaveLength(1);
    expect(engine.timelineForks[0]?.id).toBe("fork_prime");
    expect(engine.agents.length).toBeGreaterThan(0);
    expect(engine.agents.length).toBeLessThanOrEqual(engine.config.maxAgents);
  });
});
