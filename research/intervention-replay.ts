import { SimulationEngine } from '../src/engine/SimulationEngine';
import type { InterventionEvent, TimelineFork, WeatherType, WorldConfig, WorldLaw, WorldPresetId } from '../src/types/simulation';

const RESET_ACTIONS = new Set(['world.preset.reset', 'world.reset', 'world.seed.reset']);
const WEATHER_TYPES = new Set<WeatherType>(['clear', 'solar_flare', 'acid_rain', 'cooling_period', 'ion_tempest', 'sandstorm', 'mutagenic_monsoon']);
const COSMIC_TOOLS = new Set(['resource', 'meteor', 'black_hole', 'mutagenic_fog', 'chrono_vortex', 'obsidian_mountain', 'hydro_oasis', 'lightning_smite']);
const DISASTERS = new Set(['meteor', 'radiation_storm', 'resource_bloom', 'economic_boom', 'pandemic', 'solar_flare', 'singularity_spark']);

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Intervention parameters must be an object.');
  return value as Record<string, unknown>;
}
function stringValue(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 500) throw new Error(`Invalid intervention parameter: ${name}.`);
  return value;
}
function numberValue(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid intervention parameter: ${name}.`);
  return value;
}
function seedValue(value: unknown): number {
  const seed = numberValue(value, 'seed');
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Replay seed is outside the unsigned 32-bit range.');
  return seed;
}
function resetWorld(engine: SimulationEngine, preset: unknown, seed: unknown): void {
  const id = stringValue(preset, 'preset') as WorldPresetId;
  if (!['civilization', 'wasteland', 'galactic', 'microbial', 'sandbox'].includes(id)) throw new Error('Unsupported replay preset.');
  engine.reset(id, seedValue(seed));
}
function applyIntervention(engine: SimulationEngine, event: InterventionEvent): void {
  const p = object(event.parameters);
  switch (event.action) {
    case 'world.preset.reset': resetWorld(engine, p.presetId, p.seed); return;
    case 'world.reset':
    case 'world.seed.reset': resetWorld(engine, p.preset, p.seed); return;
    case 'simulation.pause': engine.isRunning = false; return;
    case 'simulation.resume': engine.isRunning = true; return;
    case 'simulation.single_step':
    case 'simulation.epoch_leap': return; // The recorded tick already includes these steps.
    case 'simulation.speed.change': {
      const speed = numberValue(p.speed, 'speed');
      if (speed < 1 || speed > 100) throw new Error('Replay speed must be between 1 and 100.');
      engine.speed = speed;
      return;
    }
    case 'world.config.update': {
      const next = { ...engine.config };
      for (const [key, value] of Object.entries(p)) {
        if (!(key in next)) throw new Error(`Unsupported world configuration field: ${key}.`);
        const current = next[key as keyof WorldConfig];
        if (typeof current === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error(`Invalid numeric configuration field: ${key}.`);
        if (typeof current === 'boolean' && typeof value !== 'boolean') throw new Error(`Invalid boolean configuration field: ${key}.`);
        if (typeof current === 'string' && typeof value !== 'string') throw new Error(`Invalid string configuration field: ${key}.`);
        (next as Record<string, unknown>)[key] = value;
      }
      engine.config = next;
      return;
    }
    case 'weather.set': {
      const type = stringValue(p.type, 'type') as WeatherType;
      if (!WEATHER_TYPES.has(type)) throw new Error('Unsupported replay weather type.');
      engine.triggerWeatherCycle(type);
      return;
    }
    case 'disaster.trigger': {
      const type = stringValue(p.type, 'type');
      if (!DISASTERS.has(type as never)) throw new Error('Unsupported replay disaster type.');
      engine.triggerDisaster(type as Parameters<SimulationEngine['triggerDisaster']>[0]);
      return;
    }
    case 'cosmic_tool.apply': {
      const tool = stringValue(p.tool, 'tool');
      if (!COSMIC_TOOLS.has(tool)) throw new Error('Unsupported replay cosmic tool.');
      engine.triggerCosmicTool(tool as Parameters<SimulationEngine['triggerCosmicTool']>[0], numberValue(p.x, 'x'), numberValue(p.y, 'y'));
      return;
    }
    case 'agent.directive': {
      const agent = engine.agents.find(item => item.id === stringValue(p.agentId, 'agentId'));
      if (!agent) throw new Error('Replay directive references an unknown agent.');
      const directive = stringValue(p.directive, 'directive');
      agent.currentThought = directive;
      agent.goal = `Responding to neural directive: "${directive.slice(0, 30)}..."`;
      agent.thoughtTimer = 200;
      agent.memory = [...(agent.memory || []).slice(-8), `Direct neural directive: ${directive}`];
      return;
    }
    case 'agent.heal': {
      const agent = engine.agents.find(item => item.id === stringValue(p.agentId, 'agentId'));
      if (!agent) throw new Error('Replay heal references an unknown agent.');
      agent.health = agent.maxHealth; agent.energy = agent.maxEnergy;
      agent.currentThought = 'Vitality restored by Architect.'; agent.thoughtTimer = 100;
      return;
    }
    case 'agent.wealth_boost': {
      const agent = engine.agents.find(item => item.id === stringValue(p.agentId, 'agentId'));
      if (!agent) throw new Error('Replay wealth boost references an unknown agent.');
      const amount = numberValue(p.amount, 'amount');
      if (Math.abs(amount) > 1_000_000) throw new Error('Replay wealth adjustment exceeds the safety bound.');
      agent.wealth += amount;
      agent.currentThought = 'Assets subsidized by the Architect.'; agent.thoughtTimer = 100;
      return;
    }
    case 'agent.clone': {
      const source = engine.agents.find(item => item.id === stringValue(p.sourceAgentId, 'sourceAgentId'));
      if (!source) throw new Error('Replay clone references an unknown source agent.');
      const clone = engine.createAgent({
        name: `${source.name}-Clone`, role: source.role, factionId: source.factionId,
        x: source.x + (engine.sampleRandom() - 0.5) * 30,
        y: source.y + (engine.sampleRandom() - 0.5) * 30,
        color: source.color, parentGenetics: source.genetics, generation: source.generation + 1,
      });
      if (typeof p.cloneId === 'string' && p.cloneId !== clone.id) throw new Error('Replay clone identifier diverged; event history is not reproducible.');
      engine.addLog('emergence', 'Agent Cloned', `${clone.name} cloned from ${source.name}.`, 'high');
      return;
    }
    case 'governance.decree': {
      const id = stringValue(p.lawId, 'lawId');
      const law: WorldLaw = {
        id, title: stringValue(p.title, 'title'),
        category: stringValue(p.category, 'category') as WorldLaw['category'],
        description: 'Cosmic decree mandated by supreme authority.',
        effects: object(p.effects) as WorldLaw['effects'],
        status: 'ratified', proposedByFactionId: 'architect', epochRatified: engine.epoch,
        votesFor: engine.factions.map(faction => faction.id), votesAgainst: [],
      };
      engine.laws = [law, ...engine.laws];
      engine.addLog('diplomacy', 'Supreme Decree Enacted', `Universal law "${law.title}" promulgated across all realms.`, 'critical');
      return;
    }
    default:
      throw new Error(`Intervention action "${event.action}" is not replay-safe or is missing required recorded inputs.`);
  }
}

function advanceTo(engine: SimulationEngine, targetTick: number): void {
  if (!Number.isSafeInteger(targetTick) || targetTick < 0) throw new Error('Replay target tick must be a non-negative integer.');
  if (targetTick < engine.tick) throw new Error('Replay history moved backwards without a supported checkpoint event.');
  while (engine.tick < targetTick) engine.worldStep();
}

export function replayInterventionHistory(input: {
  preset: WorldPresetId;
  seed: number;
  events: readonly InterventionEvent[];
  targetTick: number;
}): SimulationEngine {
  const engine = new SimulationEngine(input.preset, seedValue(input.seed));
  for (const event of input.events) {
    if (!Number.isSafeInteger(event.tick) || event.tick < 0) throw new Error('Intervention history contains an invalid tick.');
    if (event.tick > input.targetTick) continue;
    if (event.tick < engine.tick && !RESET_ACTIONS.has(event.action)) throw new Error('Intervention history is non-monotonic; replay requires a checkpoint.');
    if (event.tick >= engine.tick) advanceTo(engine, event.tick);
    applyIntervention(engine, event);
  }
  advanceTo(engine, input.targetTick);
  engine.interventions = structuredClone(input.events) as InterventionEvent[];
  return engine;
}

export interface AlternativeFutureResult {
  forkTick: number;
  horizonTick: number;
  baseline: { snapshot: TimelineFork['snapshotState']; population: number; totalWealth: number; averageHealth: number; resourceAbundance: number; weather: string };
  alternative: { snapshot: TimelineFork['snapshotState']; population: number; totalWealth: number; averageHealth: number; resourceAbundance: number; weather: string };
}

function summarizeFuture(engine: SimulationEngine) {
  return {
    snapshot: engine.createFullSnapshot(),
    population: engine.agents.length,
    totalWealth: engine.agents.reduce((sum, agent) => sum + agent.wealth, 0),
    averageHealth: engine.agents.length ? engine.agents.reduce((sum, agent) => sum + agent.health, 0) / engine.agents.length : 0,
    resourceAbundance: engine.resources.reduce((sum, resource) => sum + resource.amount, 0),
    weather: engine.weather.currentType,
  };
}

export function compareAlternativeFutures(input: {
  preset: WorldPresetId;
  seed: number;
  history: readonly InterventionEvent[];
  forkTick: number;
  horizonTick: number;
  baselineFutureEvents?: readonly InterventionEvent[];
  alternativeFutureEvents: readonly InterventionEvent[];
}): AlternativeFutureResult {
  if (!Number.isSafeInteger(input.forkTick) || input.forkTick < 0 || !Number.isSafeInteger(input.horizonTick) || input.horizonTick < input.forkTick) {
    throw new Error('Alternative-future horizon must be at or after the fork tick.');
  }
  const prefix = input.history.filter(event => event.tick <= input.forkTick);
  const forkState = replayInterventionHistory({ preset: input.preset, seed: input.seed, events: prefix, targetTick: input.forkTick }).createFullSnapshot();
  const baseline = new SimulationEngine(input.preset, input.seed);
  const alternative = new SimulationEngine(input.preset, input.seed);
  baseline.restoreRunSnapshot(forkState, input.seed, input.preset);
  alternative.restoreRunSnapshot(forkState, input.seed, input.preset);
  const baselineEvents = [...(input.baselineFutureEvents || [])].filter(event => event.tick >= input.forkTick && event.tick <= input.horizonTick);
  const alternativeEvents = [...input.alternativeFutureEvents].filter(event => event.tick >= input.forkTick && event.tick <= input.horizonTick);
  const baselineFuture = replayInterventionHistory({ preset: input.preset, seed: input.seed, events: baselineEvents, targetTick: input.horizonTick });
  const alternativeFuture = replayInterventionHistory({ preset: input.preset, seed: input.seed, events: alternativeEvents, targetTick: input.horizonTick });
  // Restore each branch from the shared fork point before applying its own future event stream.
  baseline.restoreRunSnapshot(forkState, input.seed, input.preset);
  alternative.restoreRunSnapshot(forkState, input.seed, input.preset);
  for (const event of baselineEvents) {
    if (event.tick >= baseline.tick) advanceTo(baseline, event.tick);
    applyIntervention(baseline, event);
  }
  advanceTo(baseline, input.horizonTick);
  for (const event of alternativeEvents) {
    if (event.tick >= alternative.tick) advanceTo(alternative, event.tick);
    applyIntervention(alternative, event);
  }
  advanceTo(alternative, input.horizonTick);
  void baselineFuture; void alternativeFuture;
  return { forkTick: input.forkTick, horizonTick: input.horizonTick, baseline: summarizeFuture(baseline), alternative: summarizeFuture(alternative) };
}
