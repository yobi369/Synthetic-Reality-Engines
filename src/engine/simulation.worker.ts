import { SimulationEngine } from './SimulationEngine';
import type { TimelineFork, WorldPresetId } from '../types/simulation';

type WorkerCommand =
  | { type: 'initialize'; presetId: WorldPresetId; seed: number; isRunning: boolean; speed: number }
  | { type: 'hydrate'; presetId: WorldPresetId; seed: number; snapshot: TimelineFork['snapshotState']; timelineForks: TimelineFork[]; activeForkId: string; isRunning: boolean; speed: number }
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'set-speed'; speed: number }
  | { type: 'step' }
  | { type: 'epoch-leap' };

type WorkerState = {
  type: 'state';
  presetId: WorldPresetId;
  seed: number;
  snapshot: TimelineFork['snapshotState'];
  timelineForks: TimelineFork[];
  activeForkId: string;
  isRunning: boolean;
  speed: number;
};

type WorkerError = { type: 'error'; message: string };

const workerScope = globalThis as typeof globalThis & {
  onmessage: ((event: MessageEvent<WorkerCommand>) => void) | null;
  postMessage(message: WorkerState | WorkerError): void;
};

let engine: SimulationEngine | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let presetId: WorldPresetId = 'civilization';

function publish(): void {
  if (!engine) return;
  workerScope.postMessage({
    type: 'state',
    presetId,
    seed: engine.seed,
    snapshot: engine.createFullSnapshot(),
    timelineForks: structuredClone(engine.timelineForks),
    activeForkId: engine.activeForkId,
    isRunning: engine.isRunning,
    speed: engine.speed
  });
}

function stopTimer(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
}

function schedule(): void {
  stopTimer();
  if (!engine?.isRunning) return;
  // Keep the scheduler at 30 Hz; speed controls the number of deterministic
  // simulation steps per frame rather than multiplying both interval and work.
  timer = setTimeout(() => {
    if (!engine?.isRunning) return;
    try {
      const steps = Math.max(1, Math.min(20, Math.floor(engine.speed)));
      for (let index = 0; index < steps; index += 1) engine.worldStep();
      publish();
      schedule();
    } catch (error) {
      engine.isRunning = false;
      publish();
      workerScope.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Simulation worker failed.'
      });
    }
  }, 1000 / 30);
}

function hydrate(command: Extract<WorkerCommand, { type: 'hydrate' }>): void {
  stopTimer();
  const restored = new SimulationEngine(command.presetId, command.seed);
  restored.restoreRunSnapshot(command.snapshot, command.seed, command.presetId);
  restored.timelineForks = structuredClone(command.timelineForks);
  restored.activeForkId = command.activeForkId;
  restored.isRunning = command.isRunning;
  restored.speed = command.speed;
  engine = restored;
  presetId = command.presetId;
  publish();
  schedule();
}

workerScope.onmessage = (event: MessageEvent<WorkerCommand>) => {
  const command = event.data;
  try {
    switch (command.type) {
      case 'initialize':
        stopTimer();
        presetId = command.presetId;
        engine = new SimulationEngine(command.presetId, command.seed);
        engine.isRunning = command.isRunning;
        engine.speed = command.speed;
        publish();
        schedule();
        break;
      case 'hydrate':
        hydrate(command);
        break;
      case 'start':
        if (engine) engine.isRunning = true;
        publish();
        schedule();
        break;
      case 'pause':
        if (engine) engine.isRunning = false;
        stopTimer();
        publish();
        break;
      case 'set-speed':
        if (engine && Number.isFinite(command.speed)) engine.speed = Math.max(1, Math.min(20, Math.floor(command.speed)));
        publish();
        schedule();
        break;
      case 'step':
        if (engine) {
          engine.worldStep();
          publish();
        }
        break;
      case 'epoch-leap':
        if (engine) {
          for (let index = 0; index < 250; index += 1) engine.worldStep();
          engine.recordIntervention('simulation.epoch_leap', { steps: 250 });
          publish();
        }
        break;
    }
  } catch (error) {
    workerScope.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Simulation worker command failed.'
    });
  }
};
