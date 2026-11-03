import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SimulationEngine } from './engine/SimulationEngine';
import {
  WorldPresetId,
  WorldConfig,
  Agent,
  CosmicToolType,
  WorldLaw,
  TimelineFork,
  WeatherType
} from './types/simulation';
import { Header, AppViewType } from './components/Header';
import { SimulationCanvas } from './components/SimulationCanvas';
import { AgentInspector } from './components/AgentInspector';
import { ObservabilityDashboard } from './components/ObservabilityDashboard';
import { ArchitectureLab } from './components/ArchitectureLab';
import { MultiverseLoom } from './components/MultiverseLoom';
import { PhylogeneticTree } from './components/PhylogeneticTree';
import { GovernanceCodex } from './components/GovernanceCodex';
import { CosmicManipulatorBar } from './components/CosmicManipulatorBar';
import { NeuralMindVisualizer } from './components/NeuralMindVisualizer';
import { AIChroniclerModal } from './components/AIChroniclerModal';
import { AgentSpawnerModal } from './components/AgentSpawnerModal';
import { audioEngine } from './engine/AudioSynthesizer';
import confetti from 'canvas-confetti';

export default function App() {
  // Seed is visible and user-selectable for repeatable experiment runs.
  const [seedInput, setSeedInput] = useState<string>(() => String(Date.now() >>> 0));
  const engineRef = useRef<SimulationEngine>(new SimulationEngine('civilization', Number(seedInput)));

  // UI Reactive States
  const [currentPreset, setCurrentPreset] = useState<WorldPresetId>('civilization');
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);
  const [tick, setTick] = useState<number>(0);
  const [epoch, setEpoch] = useState<number>(1);
  const [population, setPopulation] = useState<number>(0);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Active View Tab
  const [activeView, setActiveView] = useState<AppViewType>('canvas');

  // God-Mode Cosmic Manipulator Tool
  const [cosmicTool, setCosmicTool] = useState<CosmicToolType>('none');

  // Modals
  const [showChronicler, setShowChronicler] = useState<boolean>(false);
  const [showSpawner, setShowSpawner] = useState<boolean>(false);

  // Trigger celebration on epoch advance
  const prevEpochRef = useRef<number>(1);

  // Sync state from engine
  const syncStateFromEngine = useCallback(() => {
    const engine = engineRef.current;
    setTick(engine.tick);
    setEpoch(engine.epoch);
    setPopulation(engine.agents.length);

    if (engine.epoch > prevEpochRef.current) {
      prevEpochRef.current = engine.epoch;
      audioEngine.playEpochSound();
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.15 },
        colors: ['#38bdf8', '#10b981', '#f59e0b', '#a855f7']
      });
    }
  }, []);

  // Main Simulation Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTickTime = performance.now();

    const loop = (currentTime: number) => {
      const engine = engineRef.current;
      if (engine.isRunning) {
        // Run simulation steps proportional to speed
        const targetInterval = 1000 / (30 * engine.speed);
        if (currentTime - lastTickTime >= targetInterval) {
          const stepsToExecute = Math.min(engine.speed, 20);
          for (let i = 0; i < stepsToExecute; i++) {
            engine.worldStep();
          }
          lastTickTime = currentTime;
          syncStateFromEngine();
        }
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [syncStateFromEngine]);

  // Audio initial interaction listener
  useEffect(() => {
    const unlockAudio = () => {
      audioEngine.init();
      audioEngine.resume();
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('click', unlockAudio, { once: true });
    return () => window.removeEventListener('click', unlockAudio);
  }, []);

  // Handlers
  const handleSelectPreset = (presetId: WorldPresetId) => {
    setCurrentPreset(presetId);
    engineRef.current.reset(presetId, engineRef.current.seed);
    setSelectedAgentId(null);
    prevEpochRef.current = 1;
    syncStateFromEngine();
  };

  const handleToggleRun = () => {
    const engine = engineRef.current;
    engine.isRunning = !engine.isRunning;
    setIsRunning(engine.isRunning);
  };

  const handleStep = () => {
    const engine = engineRef.current;
    engine.worldStep();
    syncStateFromEngine();
  };

  const handleSetSpeed = (spd: number) => {
    engineRef.current.speed = spd;
    setSpeed(spd);
  };

  const handleEpochLeap = () => {
    const engine = engineRef.current;
    for (let i = 0; i < 250; i++) {
      engine.worldStep();
    }
    syncStateFromEngine();
  };

  const handleReset = () => {
    engineRef.current.reset(currentPreset, engineRef.current.seed);
    setSelectedAgentId(null);
    prevEpochRef.current = 1;
    syncStateFromEngine();
  };

  const handleExportRun = () => {
    const engine = engineRef.current;
    const run = {
      format: "synthetic-reality-run",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      engineVersion: "0.1.0",
      seed: engine.seed,
      preset: currentPreset,
      tick: engine.tick,
      epoch: engine.epoch,
      config: engine.config,
      snapshot: engine.createFullSnapshot(),
      logs: engine.logs
    };
    const blob = new Blob([JSON.stringify(run, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `synthetic-reality-${currentPreset}-seed-${engine.seed}-tick-${engine.tick}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleApplySeed = () => {
    const parsed = Number(seedInput);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 0xffffffff) return;
    engineRef.current.reset(currentPreset, parsed);
    setSelectedAgentId(null);
    prevEpochRef.current = 1;
    syncStateFromEngine();
  };

  const handleTriggerDisaster = (type: any) => {
    engineRef.current.triggerDisaster(type);
    syncStateFromEngine();
  };

  const handleUpdateConfig = (newCfg: Partial<WorldConfig>) => {
    engineRef.current.config = { ...engineRef.current.config, ...newCfg };
  };

  const handleInjectThought = async (agentId: string, thoughtText: string) => {
    const agent = engineRef.current.agents.find(a => a.id === agentId);
    if (!agent) return;

    agent.currentThought = thoughtText;
    agent.goal = `Responding to neural directive: "${thoughtText.slice(0, 30)}..."`;
    agent.thoughtTimer = 200;
    agent.memory = [...(agent.memory || []).slice(-8), `Direct neural directive: ${thoughtText}`];

    try {
      const res = await fetch('/api/agent-thought', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent,
          surroundings: `Biome status nominal. Active nearby entities: ${engineRef.current.agents.length}.`,
          recentMemory: thoughtText
        })
      });
      const data = await res.json();
      if (data.thought) {
        agent.currentThought = data.thought;
      }
    } catch {
      // Deterministic fallback already set
    }
    syncStateFromEngine();
  };

  const handleHealAgent = (agentId: string) => {
    const agent = engineRef.current.agents.find(a => a.id === agentId);
    if (agent) {
      agent.health = agent.maxHealth;
      agent.energy = agent.maxEnergy;
      agent.currentThought = 'Vitality restored by Architect.';
      agent.thoughtTimer = 100;
      syncStateFromEngine();
    }
  };

  const handleBoostWealth = (agentId: string) => {
    const agent = engineRef.current.agents.find(a => a.id === agentId);
    if (agent) {
      agent.wealth += 50;
      agent.currentThought = 'Assets subsidized by the Architect.';
      agent.thoughtTimer = 100;
      syncStateFromEngine();
    }
  };

  const handleCloneAgent = (agentId: string) => {
    const agent = engineRef.current.agents.find(a => a.id === agentId);
    if (agent) {
      const clone = engineRef.current.createAgent({
        name: `${agent.name}-Clone`,
        role: agent.role,
        factionId: agent.factionId,
        x: agent.x + (Math.random() - 0.5) * 30,
        y: agent.y + (Math.random() - 0.5) * 30,
        color: agent.color,
        parentGenetics: agent.genetics,
        generation: agent.generation + 1
      });
      engineRef.current.addLog('emergence', 'Agent Cloned', `${clone.name} cloned from ${agent.name}.`, 'high');
      setSelectedAgentId(clone.id);
      syncStateFromEngine();
    }
  };

  const handleSpawnCustomAgent = (params: any) => {
    const engine = engineRef.current;
    const faction = engine.factions.find(f => f.id === params.factionId) || engine.factions[0];
    const spawnX = faction.territoryCenter.x + (Math.random() - 0.5) * 50;
    const spawnY = faction.territoryCenter.y + (Math.random() - 0.5) * 50;

    const newAgent = engine.createAgent({
      name: params.name,
      role: params.role,
      factionId: faction.id,
      x: Math.max(50, Math.min(engine.config.width - 50, spawnX)),
      y: Math.max(50, Math.min(engine.config.height - 50, spawnY)),
      color: faction.color,
      parentGenetics: {
        speed: params.speed,
        maxEnergy: 120,
        visionRadius: params.visionRadius,
        metabolism: 0.05,
        aggression: params.aggression,
        tradeAffinity: params.tradeAffinity,
        mutationRate: engine.config.mutationRate,
        curiosity: 0.8
      }
    });

    engine.addLog('emergence', 'Unit Instantiated', `${newAgent.name} (${newAgent.role}) spawned into ${faction.name}.`, 'high');
    setSelectedAgentId(newAgent.id);
    syncStateFromEngine();
  };

  // Cosmic Tool Canvas Click
  const handleCanvasClickSpawn = (x: number, y: number) => {
    const engine = engineRef.current;
    if (cosmicTool && cosmicTool !== 'none' && cosmicTool !== 'inspect') {
      engine.triggerCosmicTool(cosmicTool, x, y);
      syncStateFromEngine();
    }
  };

  // Weather System Manual Trigger
  const handleSetWeather = (type: WeatherType) => {
    engineRef.current.triggerWeatherCycle(type);
    syncStateFromEngine();
  };

  // Multiverse Fork & Jump
  const handleForkTimeline = (name: string, description: string) => {
    const newForkId = engineRef.current.forkTimeline(name, description);
    syncStateFromEngine();
  };

  const handleSwitchTimeline = (forkId: string) => {
    engineRef.current.switchTimeline(forkId);
    setSelectedAgentId(null);
    syncStateFromEngine();
  };

  // Constitution Sovereign Decree
  const handlePromulgateDecree = (decree: Partial<WorldLaw>) => {
    const newLaw: WorldLaw = {
      id: `law_decree_${Date.now()}`,
      title: decree.title || 'Architect Sovereign Decree',
      category: decree.category || 'economic',
      description: decree.description || 'Cosmic decree mandated by supreme authority.',
      effects: decree.effects || { speedMultiplier: 1.2, tradeRewardMultiplier: 1.5 },
      status: 'ratified',
      proposedByFactionId: 'architect',
      epochRatified: engineRef.current.epoch,
      votesFor: engineRef.current.factions.map(f => f.id),
      votesAgainst: []
    };
    engineRef.current.laws = [newLaw, ...engineRef.current.laws];
    audioEngine.playLawSound();
    engineRef.current.addLog('diplomacy', 'Supreme Decree Enacted', `Universal law "${newLaw.title}" promulgated across all realms.`, 'critical');
    syncStateFromEngine();
  };

  const selectedAgent = engineRef.current.agents.find(a => a.id === selectedAgentId) || null;
  const selectedAgentFaction = engineRef.current.factions.find(f => f.id === selectedAgent?.factionId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-black">
      
      {/* Top Command Header */}
      <Header
        currentPreset={currentPreset}
        onSelectPreset={handleSelectPreset}
        isRunning={isRunning}
        onToggleRun={handleToggleRun}
        onStep={handleStep}
        speed={speed}
        onSetSpeed={handleSetSpeed}
        onEpochLeap={handleEpochLeap}
        onReset={handleReset}
        tick={tick}
        epoch={epoch}
        population={population}
        activeView={activeView}
        onSelectView={setActiveView}
        onTriggerDisaster={handleTriggerDisaster}
        onOpenSpawner={() => setShowSpawner(true)}
        onOpenChronicler={() => setShowChronicler(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <section className="flex flex-col sm:flex-row sm:items-end gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex-1">
            <label htmlFor="simulation-seed" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Experiment seed (0–4,294,967,295)</label>
            <input id="simulation-seed" inputMode="numeric" pattern="[0-9]*" value={seedInput} onChange={event => setSeedInput(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100" aria-describedby="seed-help" />
            <p id="seed-help" className="mt-1 text-xs text-slate-500">Use the same seed and preset to reproduce the same engine run. Applying a seed restarts the world.</p>
          </div>
          <button type="button" onClick={handleApplySeed} disabled={!Array.from(seedInput).every(char => char >= '0' && char <= '9') || !Number.isSafeInteger(Number(seedInput)) || Number(seedInput) > 0xffffffff} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40">Apply seed & restart</button>
        </section>
        
        {/* VIEW 1: Live Interactive Reality Canvas & Cosmic Manipulator */}
        {activeView === 'canvas' && (
          <div className="space-y-4">
            {/* Cosmic Manipulator God-Mode Toolbar */}
            <CosmicManipulatorBar
              activeTool={cosmicTool}
              onSelectTool={setCosmicTool}
            />

            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Primary Simulation Viewport */}
              <div className="flex-1 w-full">
                <SimulationCanvas
                  config={engineRef.current.config}
                  agents={[...engineRef.current.agents]}
                  factions={[...engineRef.current.factions]}
                  resources={[...engineRef.current.resources]}
                  buildings={[...engineRef.current.buildings]}
                  disasters={[...engineRef.current.disasters]}
                  anomalies={[...engineRef.current.anomalies]}
                  dialogues={[...engineRef.current.dialogues]}
                  weather={engineRef.current.weather}
                  onSetWeather={handleSetWeather}
                  selectedAgentId={selectedAgentId}
                  onSelectAgent={setSelectedAgentId}
                  onCanvasClickSpawn={handleCanvasClickSpawn}
                  spawnMode={null}
                  cosmicTool={cosmicTool}
                />
              </div>

              {/* Side Drawer: Selected Agent Mind Inspector */}
              {selectedAgent ? (
                <div className="w-full lg:w-96 space-y-4">
                  <AgentInspector
                    agent={selectedAgent}
                    faction={selectedAgentFaction}
                    onClose={() => setSelectedAgentId(null)}
                    onInjectThought={handleInjectThought}
                    onHealAgent={handleHealAgent}
                    onBoostWealth={handleBoostWealth}
                    onCloneAgent={handleCloneAgent}
                  />

                  {/* Deep Synaptic Mind Visualizer */}
                  <NeuralMindVisualizer
                    agent={selectedAgent}
                    faction={selectedAgentFaction}
                    onSendThought={handleInjectThought}
                  />
                </div>
              ) : (
                <div className="w-full lg:w-80 p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm font-mono text-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-sky-400 font-bold uppercase tracking-wider text-[11px]">
                      Cosmic Realm Status
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      Epoch {epoch}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="text-slate-400 text-[11px]">Active Factions:</div>
                    <div className="space-y-1.5">
                      {engineRef.current.factions.map(f => {
                        const count = engineRef.current.agents.filter(a => a.factionId === f.id).length;
                        return (
                          <div key={f.id} className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                              <span className="text-white font-sans text-xs">{f.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {count} units • <span className="text-amber-400 font-bold">{f.wealth}c</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="text-slate-400 text-[11px]">Emergent Systems Active:</div>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                      <div className="p-2 rounded bg-slate-950 border border-slate-800 text-purple-400">
                        ⏳ Multiverse: {engineRef.current.timelineForks.length} Branches
                      </div>
                      <div className="p-2 rounded bg-slate-950 border border-slate-800 text-emerald-400">
                        🧬 Clades: {engineRef.current.clades.filter(c => !c.extinct).length} Active
                      </div>
                      <div className="p-2 rounded bg-slate-950 border border-slate-800 text-amber-400">
                        📜 Laws: {engineRef.current.laws.filter(l => l.status === 'ratified').length} Ratified
                      </div>
                      <div className="p-2 rounded bg-slate-950 border border-slate-800 text-sky-400">
                        💬 Dialogues: {engineRef.current.dialogues.length} In-Flight
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-500/30 text-sky-300 text-[11px] leading-relaxed">
                    💡 <strong>Architect Control:</strong> Click any agent to inspect its synaptic mind, or select a God-Ray tool from the top toolbar and click anywhere on the canvas to manipulate reality.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: Multiverse Time Loom & Reality Forking */}
        {activeView === 'multiverse' && (
          <MultiverseLoom
            forks={[...engineRef.current.timelineForks]}
            activeForkId={engineRef.current.activeTimelineId}
            currentTick={tick}
            currentEpoch={epoch}
            onForkTimeline={handleForkTimeline}
            onSwitchTimeline={handleSwitchTimeline}
          />
        )}

        {/* VIEW 3: Phylogenetic Tree of Life & Speciation */}
        {activeView === 'phylogeny' && (
          <PhylogeneticTree
            clades={[...engineRef.current.clades]}
            agents={[...engineRef.current.agents]}
            epoch={epoch}
            tick={tick}
          />
        )}

        {/* VIEW 4: Autonomous Constitution & Governance Codex */}
        {activeView === 'governance' && (
          <GovernanceCodex
            laws={[...engineRef.current.laws]}
            factions={[...engineRef.current.factions]}
            epoch={epoch}
            tick={tick}
            onPromulgateDecree={handlePromulgateDecree}
          />
        )}

        {/* VIEW 5: Emergence & Observability Dashboard */}
        {activeView === 'observability' && (
          <ObservabilityDashboard
            history={[...engineRef.current.history]}
            marketPrices={{ ...engineRef.current.marketPrices }}
            logs={[...engineRef.current.logs]}
            factions={[...engineRef.current.factions]}
            epoch={epoch}
            tick={tick}
          />
        )}

        {/* VIEW 6: Engine Architecture Lab */}
        {activeView === 'architecture' && (
          <ArchitectureLab
            config={engineRef.current.config}
            onUpdateConfig={handleUpdateConfig}
            onRunStep={handleStep}
          />
        )}

      </main>

      {/* AI World Chronicler Modal */}
      <AIChroniclerModal
        isOpen={showChronicler}
        onClose={() => setShowChronicler(false)}
        worldName={engineRef.current.config.name}
        epoch={epoch}
        population={population}
        factions={[...engineRef.current.factions]}
        logs={[...engineRef.current.logs]}
        history={[...engineRef.current.history]}
      />

      {/* Custom Agent Spawner Modal */}
      <AgentSpawnerModal
        isOpen={showSpawner}
        onClose={() => setShowSpawner(false)}
        factions={[...engineRef.current.factions]}
        onSpawn={handleSpawnCustomAgent}
      />

      {/* Footer Branding Bar */}
      <footer className="w-full bg-slate-950/90 border-t border-slate-800 py-3 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sky-400 font-bold">SYNTHETIC REALITY ENGINE</span>
            <span>•</span>
            <span className="text-slate-500">Autonomous Fringe Universe Simulation</span>
          </div>
          <div className="text-slate-400">
            Quantum Time Loom • Emergent Speciation • Autonomous Governance
          </div>
        </div>
      </footer>

    </div>
  );
}
