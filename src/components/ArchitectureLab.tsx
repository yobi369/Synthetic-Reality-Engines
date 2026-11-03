import React, { useState } from 'react';
import {
  WorldConfig
} from '../types/simulation';
import {
  Cpu,
  Code2,
  GitBranch,
  Layers,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Globe2,
  Users,
  Compass,
  Zap,
  BookOpen
} from 'lucide-react';

interface ArchitectureLabProps {
  config: WorldConfig;
  onUpdateConfig: (newConfig: Partial<WorldConfig>) => void;
  onRunStep: () => void;
}

export const ArchitectureLab: React.FC<ArchitectureLabProps> = ({
  config,
  onUpdateConfig,
  onRunStep
}) => {
  const [selectedNode, setSelectedNode] = useState<string>('simulation_engine');
  const [codeLanguage, setCodeLanguage] = useState<'python' | 'typescript'>('python');

  const pythonCode = `def world_step(world):
    # 1. Update environment
    world.update_environment()
    
    # 2. Agents perceive
    for agent in world.agents:
        agent.perceive(world)
        
    # 3. Agents decide & act
    for agent in world.agents:
        action = agent.decide()
        world.apply_action(agent, action)
        
    # 4. Resolve interactions
    world.resolve_events()
    
    # 5. Advance time
    world.time += world.dt`;

  const tsCode = `// Core Synthetic Reality Engine Loop
public worldStep(): void {
  // 1. Update Environment (Cycles, Weather, Res Regeneration)
  this.updateEnvironment();

  // 2 & 3. Perception, Goal Utilities, Decision & Action
  for (const agent of this.agents) {
    if (agent.health <= 0) continue;
    const perception = this.perceive(agent);
    this.decideAndAct(agent, perception);
  }

  // 4. Resolve Interactions (Combat, Trade, Mitosis, Collisions)
  this.resolveInteractions();

  // 5. Advance Time & Record Observability State
  this.advanceTime();
}`;

  const nodeDetails: Record<string, { title: string; desc: string; components: string[]; codeSnippet: string }> = {
    world_config: {
      title: 'World Config & Axioms',
      desc: 'Defines the foundational laws, constants, friction rates, mutation limits, and initial seed state of the universe.',
      components: ['Friction & Physics Constants', 'Toroidal / Bound World Topology', 'Day / Night Cycle Parameters', 'Resource Regeneration Multipliers'],
      codeSnippet: `const worldConfig = {\n  width: ${config.width},\n  height: ${config.height},\n  friction: ${config.friction},\n  mutationRate: ${config.mutationRate}\n};`
    },
    simulation_engine: {
      title: 'Simulation Engine Core',
      desc: 'Orchestrates the continuous tick loop, spatial hash partitioning, disaster propagation, and celestial event dispatchers.',
      components: ['Time Manager (Ticks & Epochs)', 'Event & Cataclysm System', 'Vector Physics Integrator', 'Resource Ecology System'],
      codeSnippet: `engine.worldStep(); // Executes at 60 FPS or fast-forward`
    },
    agents: {
      title: 'Autonomous Agents & Mind Matrix',
      desc: 'Self-directed entities possessing individual perception radars, short/long-term memory, utility goals, and decision trees.',
      components: ['Perception Radar (Vision radius)', 'Episodic Memory Stream', 'Maslow Hierarchy Goal Evaluator', 'Genome & Allele Mutation'],
      codeSnippet: `agent.decideAndAct(perceptions); // Evaluates survival, trade, combat`
    },
    world_state: {
      title: 'Unified World State',
      desc: 'The single source of truth containing live positions, faction boundaries, active resource deposits, and market exchange balance.',
      components: ['Agent Population Array', 'Resource Grid Matrix', 'Settlement & Market Buildings', 'Dynamic Price Vectors'],
      codeSnippet: `const state = { agents: [...], resources: [...], market: {...} };`
    },
    observability: {
      title: 'Data & Observability Pipeline',
      desc: 'Gathers chronological metrics, records historical snapshots, tracks market inflation, and interfaces with the AI Chronicler.',
      components: ['Chronological Event Logger', 'Recharts Metric Stream', 'Replay History Buffer', 'Gemini AI Lore Synthesizer'],
      codeSnippet: `recordHistorySnapshot(); // Computes GDP, population, tech quotient`
    }
  };

  const selectedNodeInfo = nodeDetails[selectedNode] || nodeDetails.simulation_engine;

  return (
    <div className="w-full space-y-6">
      
      {/* Banner / Poster Header */}
      <div className="cyber-panel p-6 rounded-xl border border-cyan-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Cpu className="w-64 h-64 text-cyan-400" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/40 uppercase tracking-widest">
              Blueprint Architecture
            </span>
            <span className="text-xs text-slate-400 font-mono">
              "We don't just write programs. We create worlds."
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display tracking-tight">
            SYNTHETIC REALITY ENGINE ARCHITECTURE
          </h2>
          <p className="text-sm text-slate-300 max-w-3xl mt-1 leading-relaxed">
            A framework for simulating self-contained programmable worlds with autonomous agents, dynamic environments, resource economies, and emergent social dynamics.
          </p>
        </div>
      </div>

      {/* Interactive Blueprint Graph + Minimal Step Code */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Architecture Diagram (7 cols) */}
        <div className="lg:col-span-7 cyber-panel p-5 rounded-xl border border-cyan-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-white font-sans text-sm tracking-wide">
                Interactive Architecture Overview
              </h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-300">Click any block to inspect</span>
          </div>

          {/* Node Diagram Layout */}
          <div className="space-y-3 font-mono text-xs">
            
            {/* Row 1: World Config <--> Simulation Engine */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setSelectedNode('world_config')}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                  selectedNode === 'world_config'
                    ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)] text-white'
                    : 'bg-[#060c1d] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-cyan-400 font-bold mb-1">
                  <span>WORLD CONFIG</span>
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <ul className="text-[10px] text-slate-400 space-y-0.5">
                  <li>• Parameters & Rules</li>
                  <li>• Constants & Friction</li>
                  <li>• Initial Seed State</li>
                </ul>
              </div>

              <div
                onClick={() => setSelectedNode('simulation_engine')}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                  selectedNode === 'simulation_engine'
                    ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)] text-white'
                    : 'bg-[#060c1d] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-cyan-400 font-bold mb-1">
                  <span>SIMULATION ENGINE</span>
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <ul className="text-[10px] text-slate-400 space-y-0.5">
                  <li>• Time Manager & Ticks</li>
                  <li>• Event & Cataclysm System</li>
                  <li>• Physics & Resource Engine</li>
                </ul>
              </div>
            </div>

            {/* Connecting Flow Arrow */}
            <div className="flex items-center justify-center py-0.5 text-cyan-400 font-bold text-sm">
              ↕ Loop: Perceive → Decide → Act → World Updates → Repeat ↕
            </div>

            {/* Row 2: Agents <--> World State <--> Observability */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                onClick={() => setSelectedNode('agents')}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                  selectedNode === 'agents'
                    ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)] text-white'
                    : 'bg-[#060c1d] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-amber-400 font-bold mb-1">
                  <span>AGENTS</span>
                  <Users className="w-3.5 h-3.5" />
                </div>
                <ul className="text-[10px] text-slate-400 space-y-0.5">
                  <li>• Perception Radar</li>
                  <li>• Memory & Goals</li>
                  <li>• Utility Decisions</li>
                </ul>
              </div>

              <div
                onClick={() => setSelectedNode('world_state')}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                  selectedNode === 'world_state'
                    ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)] text-white'
                    : 'bg-[#060c1d] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-emerald-400 font-bold mb-1">
                  <span>WORLD STATE</span>
                  <Globe2 className="w-3.5 h-3.5" />
                </div>
                <ul className="text-[10px] text-slate-400 space-y-0.5">
                  <li>• Positions & Entities</li>
                  <li>• Faction Borders</li>
                  <li>• Market Prices</li>
                </ul>
              </div>

              <div
                onClick={() => setSelectedNode('observability')}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                  selectedNode === 'observability'
                    ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)] text-white'
                    : 'bg-[#060c1d] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-purple-400 font-bold mb-1">
                  <span>OBSERVABILITY</span>
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <ul className="text-[10px] text-slate-400 space-y-0.5">
                  <li>• Logging & Metrics</li>
                  <li>• Time Capsule Replay</li>
                  <li>• AI Chronicler</li>
                </ul>
              </div>
            </div>

          </div>

          {/* Selected Node Details Box */}
          <div className="mt-4 p-3.5 rounded-lg bg-[#040817] border border-cyan-500/30">
            <h4 className="text-cyan-300 font-bold text-xs flex items-center gap-1.5 mb-1 font-sans">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              {selectedNodeInfo.title}
            </h4>
            <p className="text-slate-300 text-xs mb-2 leading-relaxed">
              {selectedNodeInfo.desc}
            </p>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono">
              {selectedNodeInfo.components.map((c, i) => (
                <div key={i} className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Minimal World Step Code Explorer (5 cols) */}
        <div className="lg:col-span-5 cyber-panel p-5 rounded-xl border border-cyan-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white font-sans text-sm tracking-wide">
                  Minimal World Step
                </h3>
              </div>
              <div className="flex items-center gap-1 bg-[#040817] p-0.5 rounded border border-slate-800 font-mono text-[10px]">
                <button
                  onClick={() => setCodeLanguage('python')}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    codeLanguage === 'python' ? 'bg-cyan-500/30 text-cyan-300 font-bold' : 'text-slate-400'
                  }`}
                >
                  Python-like
                </button>
                <button
                  onClick={() => setCodeLanguage('typescript')}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    codeLanguage === 'typescript' ? 'bg-cyan-500/30 text-cyan-300 font-bold' : 'text-slate-400'
                  }`}
                >
                  TypeScript
                </button>
              </div>
            </div>

            <div className="p-3 bg-[#030612] rounded-lg border border-cyan-500/20 font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto">
              <pre className="text-cyan-200">
                {codeLanguage === 'python' ? pythonCode : tsCode}
              </pre>
            </div>
          </div>

          <div className="mt-4 p-3 bg-[#040817] rounded-lg border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-amber-400 mb-1">
              Deterministic Step Execution
            </div>
            <p className="text-slate-400 text-xs mb-3">
              Execute a discrete computational tick to observe state transition.
            </p>
            <button
              onClick={onRunStep}
              className="w-full py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 rounded-lg text-xs font-bold font-mono flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_0_12px_rgba(0,240,255,0.15)]"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Execute 1 World Step (Tick)</span>
            </button>
          </div>
        </div>

      </div>

      {/* Live Rule Sandbox & Parameters */}
      <div className="cyber-panel p-5 rounded-xl border border-cyan-500/20">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-white font-sans text-sm tracking-wide">
              Live World Rules & Axiom Tuner
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Modifies live simulation physics</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          
          {/* Slider 1: Resource Regen */}
          <div className="bg-[#050b1d] p-3 rounded-lg border border-slate-800">
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Resource Regen:</span>
              <span className="text-cyan-300 font-bold">{config.resourceRegenMultiplier}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={config.resourceRegenMultiplier}
              onChange={(e) => onUpdateConfig({ resourceRegenMultiplier: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Scarce (0.1x)</span>
              <span>Abundant (3.0x)</span>
            </div>
          </div>

          {/* Slider 2: Mutation Rate */}
          <div className="bg-[#050b1d] p-3 rounded-lg border border-slate-800">
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Genomic Mutation:</span>
              <span className="text-purple-300 font-bold">{(config.mutationRate * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.5"
              step="0.01"
              value={config.mutationRate}
              onChange={(e) => onUpdateConfig({ mutationRate: parseFloat(e.target.value) })}
              className="w-full accent-purple-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Stable (1%)</span>
              <span>Hyper-mutate (50%)</span>
            </div>
          </div>

          {/* Slider 3: Friction */}
          <div className="bg-[#050b1d] p-3 rounded-lg border border-slate-800">
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Friction / Drag:</span>
              <span className="text-amber-300 font-bold">{config.friction}</span>
            </div>
            <input
              type="range"
              min="0.80"
              max="0.99"
              step="0.01"
              value={config.friction}
              onChange={(e) => onUpdateConfig({ friction: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Heavy (0.80)</span>
              <span>Zero-G (0.99)</span>
            </div>
          </div>

          {/* Slider 4: Disaster Frequency */}
          <div className="bg-[#050b1d] p-3 rounded-lg border border-slate-800">
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Cataclysm Risk:</span>
              <span className="text-red-300 font-bold">{(config.disasterFrequency * 1000).toFixed(1)}‰</span>
            </div>
            <input
              type="range"
              min="0.000"
              max="0.010"
              step="0.001"
              value={config.disasterFrequency}
              onChange={(e) => onUpdateConfig({ disasterFrequency: parseFloat(e.target.value) })}
              className="w-full accent-red-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Peaceful (0)</span>
              <span>Chaos (10‰)</span>
            </div>
          </div>

        </div>
      </div>

      {/* Emergent Phenomena Catalog (From Poster) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="cyber-panel p-4 rounded-xl border border-cyan-500/20">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2 font-sans">
            <span>📊</span>
            <span>EMERGENT ECONOMIES</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Observe inflation spikes during scarcity, market depressions, dynamic trade routes, and commodity arbitrage.
          </p>
          <div className="text-[10px] font-mono text-amber-300/80 bg-amber-950/40 p-2 rounded border border-amber-500/20">
            Supply & Demand • Barter Cycles • Guild Monopolies
          </div>
        </div>

        <div className="cyber-panel p-4 rounded-xl border border-cyan-500/20">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2 font-sans">
            <span>🏛️</span>
            <span>EMERGENT SOCIETIES</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Factions draft defensive laws, form non-aggression pacts, establish cultural borders, and stage territorial wars.
          </p>
          <div className="text-[10px] font-mono text-emerald-300/80 bg-emerald-950/40 p-2 rounded border border-emerald-500/20">
            Diplomacy Pacts • Border Control • Faction Eras
          </div>
        </div>

        <div className="cyber-panel p-4 rounded-xl border border-cyan-500/20">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm mb-2 font-sans">
            <span>🧬</span>
            <span>EMERGENT ECOSYSTEMS</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Predator-prey oscillations, speciation branches, metabolic efficiency mutations, and survival adaptations.
          </p>
          <div className="text-[10px] font-mono text-rose-300/80 bg-rose-950/40 p-2 rounded border border-rose-500/20">
            Food Chains • Mitosis • Natural Selection
          </div>
        </div>

        <div className="cyber-panel p-4 rounded-xl border border-cyan-500/20">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-sm mb-2 font-sans">
            <span>💡</span>
            <span>EMERGENT TECH</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Scholars conduct research near academies, unlocking Classical, Industrial, and Cybernetic epochs.
          </p>
          <div className="text-[10px] font-mono text-purple-300/80 bg-purple-950/40 p-2 rounded border border-purple-500/20">
            Tech Tree • Academy Inventions • Cybernetic Singularity
          </div>
        </div>

      </div>

    </div>
  );
};
