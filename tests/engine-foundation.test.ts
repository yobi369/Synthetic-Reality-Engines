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


describe("seeded simulation", () => {
  test("same seed produces identical initial worlds and tick trajectories", () => {
    const first = new SimulationEngine("civilization", 123456);
    const second = new SimulationEngine("civilization", 123456);

    expect(first.agents).toEqual(second.agents);
    expect(first.weather).toEqual(second.weather);
    for (let i = 0; i < 20; i++) {
      first.worldStep();
      second.worldStep();
    }
    expect(first.agents).toEqual(second.agents);
    expect(first.factions).toEqual(second.factions);
    expect(first.resources).toEqual(second.resources);
    expect(first.weather).toEqual(second.weather);
    expect(first.tick).toBe(second.tick);
  });

  test("different seeds produce different initial populations", () => {
    const first = new SimulationEngine("civilization", 100);
    const second = new SimulationEngine("civilization", 200);
    expect(first.agents).not.toEqual(second.agents);
  });

  test("reset restores the constructor seed and reproducible initial state", () => {
    const engine = new SimulationEngine("civilization", 77);
    const initialAgents = structuredClone(engine.agents);
    engine.worldStep();
    engine.reset("civilization");
    expect(engine.agents).toEqual(initialAgents);
  });
});


describe("seeded timeline restoration", () => {
  test("restored timeline continues from its captured random state", () => {
    const engine = new SimulationEngine("microbial", 909);
    for (let i = 0; i < 8; i++) engine.worldStep();
    const fork = engine.forkTimeline("checkpoint", "determinism test");
    for (let i = 0; i < 12; i++) engine.worldStep();
    expect(engine.switchTimeline(fork.id)).toBe(true);
    for (let i = 0; i < 12; i++) engine.worldStep();
    const replay = new SimulationEngine("microbial", 909);
    for (let i = 0; i < 8; i++) replay.worldStep();
    for (let i = 0; i < 12; i++) replay.worldStep();
    expect(engine.agents).toEqual(replay.agents);
    expect(engine.resources).toEqual(replay.resources);
    expect(engine.tick).toBe(replay.tick);
  });
});

describe("run snapshot persistence", () => {
  test("restores complete state and resumes the same seeded trajectory", () => {
    const source = new SimulationEngine("microbial", 314159);
    for (let i = 0; i < 15; i++) source.worldStep();
    const snapshot = source.createFullSnapshot();
    const restored = new SimulationEngine("microbial", 1);
    restored.restoreRunSnapshot(snapshot, source.seed, "microbial");

    expect(restored.seed).toBe(source.seed);
    expect(restored.tick).toBe(source.tick);
    expect(restored.agents).toEqual(source.agents);
    expect(restored.logs).toEqual(source.logs);
    expect(restored.history).toEqual(source.history);
    for (let i = 0; i < 10; i++) {
      source.worldStep();
      restored.worldStep();
    }
    expect(restored.agents).toEqual(source.agents);
    expect(restored.resources).toEqual(source.resources);
    expect(restored.weather).toEqual(source.weather);
  });

  test("rejects malformed snapshots before applying them", () => {
    const engine = new SimulationEngine("civilization", 5);
    const invalid = { ...engine.createFullSnapshot(), agents: null } as any;
    expect(() => engine.restoreRunSnapshot(invalid, 5, "civilization")).toThrow();
    expect(() => engine.restoreRunSnapshot(engine.createFullSnapshot(), -1, "civilization")).toThrow();
  });

  test("all built-in presets initialize valid, bounded worlds", () => {
    for (const preset of ["civilization", "wasteland", "galactic", "microbial", "sandbox"] as const) {
      const engine = new SimulationEngine(preset, 42);
      expect(engine.config.presetId).toBe(preset);
      expect(engine.config.width).toBeGreaterThan(0);
      expect(engine.config.height).toBeGreaterThan(0);
      expect(engine.agents.length).toBeGreaterThan(0);
      expect(engine.agents.length).toBeLessThanOrEqual(engine.config.maxAgents);
      engine.worldStep();
      expect(engine.tick).toBe(1);
    }
  });
});
