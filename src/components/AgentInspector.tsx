import React, { useState } from 'react';
import {
  Agent,
  Faction,
  ResourceType
} from '../types/simulation';
import {
  X,
  Brain,
  Zap,
  Activity,
  Heart,
  Coins,
  Dna,
  Send,
  Eye,
  Shield,
  Crosshair,
  Sparkles,
  Package,
  Clock,
  Compass
} from 'lucide-react';

interface AgentInspectorProps {
  agent: Agent | null;
  faction?: Faction;
  onClose: () => void;
  onInjectThought: (agentId: string, customThought: string) => void;
  onHealAgent: (agentId: string) => void;
  onBoostWealth: (agentId: string) => void;
  onCloneAgent: (agentId: string) => void;
}

export const AgentInspector: React.FC<AgentInspectorProps> = ({
  agent,
  faction,
  onClose,
  onInjectThought,
  onHealAgent,
  onBoostWealth,
  onCloneAgent
}) => {
  const [whisperInput, setWhisperInput] = useState('');
  const [isInjecting, setIsInjecting] = useState(false);

  if (!agent) return null;

  const handleSendWhisper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whisperInput.trim()) return;
    setIsInjecting(true);
    onInjectThought(agent.id, whisperInput.trim());
    setWhisperInput('');
    setTimeout(() => setIsInjecting(false), 600);
  };

  return (
    <div className="w-full lg:w-96 bg-[#080e22]/95 border border-cyan-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md flex flex-col gap-4 font-mono text-xs cyber-panel">
      {/* Header with Agent Name & Faction */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-black font-bold text-sm shadow-md"
            style={{ backgroundColor: agent.color }}
          >
            {agent.role.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm font-sans tracking-wide">
                {agent.name}
              </h3>
              <span className="text-[10px] bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/30">
                Gen {agent.generation}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="text-amber-300 font-semibold">{agent.role}</span>
              <span>•</span>
              <span style={{ color: faction?.color || '#00f0ff' }}>
                {faction?.name || agent.factionId}
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-md cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Live Mind Matrix & Consciousness */}
      <div className="bg-[#040817] p-3 rounded-lg border border-cyan-500/20 relative">
        <div className="flex items-center justify-between text-cyan-400 text-[11px] font-bold mb-1.5">
          <span className="flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            Neural Mind Matrix
          </span>
          <span className="text-[10px] text-slate-400 uppercase">State: {agent.state}</span>
        </div>

        <div className="p-2.5 rounded bg-cyan-950/30 border border-cyan-500/20 text-cyan-200 text-xs italic leading-relaxed">
          "{agent.currentThought}"
        </div>

        <div className="mt-2 text-[11px] text-slate-300 flex items-center justify-between">
          <span className="text-slate-400">Current Directive:</span>
          <span className="text-amber-300 font-semibold">{agent.goal}</span>
        </div>

        {/* Neural Whisper Prompt Input */}
        <form onSubmit={handleSendWhisper} className="mt-2.5 flex items-center gap-1.5">
          <input
            type="text"
            value={whisperInput}
            onChange={(e) => setWhisperInput(e.target.value)}
            placeholder="Whisper neural thought..."
            className="flex-1 bg-[#091124] border border-cyan-500/30 rounded px-2 py-1 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={isInjecting || !whisperInput.trim()}
            className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-400/40 rounded cursor-pointer transition-all disabled:opacity-40"
            title="Inject Neural Thought"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Core Vitals: Health, Energy, Wealth */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#050b1d] p-2 rounded-lg border border-slate-800">
          <div className="flex items-center gap-1 text-emerald-400 text-[10px] mb-0.5">
            <Heart className="w-3 h-3" />
            <span>VITALITY</span>
          </div>
          <div className="text-sm font-bold text-white">
            {Math.round(agent.health)} <span className="text-[10px] text-slate-400">/ 100</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all"
              style={{ width: `${Math.max(0, Math.min(100, (agent.health / agent.maxHealth) * 100))}%` }}
            />
          </div>
        </div>

        <div className="bg-[#050b1d] p-2 rounded-lg border border-slate-800">
          <div className="flex items-center gap-1 text-amber-400 text-[10px] mb-0.5">
            <Zap className="w-3 h-3" />
            <span>ENERGY</span>
          </div>
          <div className="text-sm font-bold text-white">
            {Math.round(agent.energy)} <span className="text-[10px] text-slate-400">/ {Math.round(agent.maxEnergy)}</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
            <div
              className="bg-amber-400 h-full rounded-full transition-all"
              style={{ width: `${Math.max(0, Math.min(100, (agent.energy / agent.maxEnergy) * 100))}%` }}
            />
          </div>
        </div>

        <div className="bg-[#050b1d] p-2 rounded-lg border border-slate-800">
          <div className="flex items-center gap-1 text-cyan-400 text-[10px] mb-0.5">
            <Coins className="w-3 h-3" />
            <span>CREDITS</span>
          </div>
          <div className="text-sm font-bold text-white">
            {agent.wealth} <span className="text-[10px] text-slate-400">c</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Trades: {agent.trades} | Kills: {agent.kills}
          </div>
        </div>
      </div>

      {/* Cargo / Inventory Breakdown */}
      <div className="bg-[#050b1d] p-2.5 rounded-lg border border-slate-800">
        <div className="flex items-center justify-between text-slate-300 text-[11px] font-bold mb-2">
          <span className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-cyan-400" />
            Cargo Payload
          </span>
          <span className="text-[10px] text-slate-400">
            Total: {(Object.values(agent.inventory) as number[]).reduce((a, b) => a + b, 0).toFixed(0)} units
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
          {(Object.keys(agent.inventory) as ResourceType[]).map((rKey) => (
            <div key={rKey} className="bg-[#081229] px-2 py-1 rounded border border-slate-800 flex justify-between">
              <span className="text-slate-400 capitalize">{rKey}:</span>
              <span className="text-cyan-300 font-bold">{Math.round(agent.inventory[rKey] || 0)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Genomic Traits / Behavioral Alleles */}
      <div className="bg-[#050b1d] p-2.5 rounded-lg border border-slate-800">
        <div className="flex items-center justify-between text-purple-300 text-[11px] font-bold mb-2">
          <span className="flex items-center gap-1">
            <Dna className="w-3.5 h-3.5 text-purple-400" />
            Genetic Trait Alleles
          </span>
          <span className="text-[10px] text-slate-400">Age: {agent.age} ticks</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Velocity:</span>
              <span className="text-slate-200">{agent.genetics.speed.toFixed(1)} px/t</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded">
              <div className="bg-cyan-400 h-1 rounded" style={{ width: `${(agent.genetics.speed / 4.5) * 100}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Perception:</span>
              <span className="text-slate-200">{Math.round(agent.genetics.visionRadius)} px</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded">
              <div className="bg-cyan-400 h-1 rounded" style={{ width: `${(agent.genetics.visionRadius / 220) * 100}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Aggression:</span>
              <span className="text-slate-200">{Math.round(agent.genetics.aggression * 100)}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded">
              <div className="bg-red-400 h-1 rounded" style={{ width: `${agent.genetics.aggression * 100}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Commerce:</span>
              <span className="text-slate-200">{Math.round(agent.genetics.tradeAffinity * 100)}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded">
              <div className="bg-amber-400 h-1 rounded" style={{ width: `${agent.genetics.tradeAffinity * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* God-Mode Intervention Actions */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
        <button
          onClick={() => onHealAgent(agent.id)}
          className="flex-1 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold cursor-pointer transition-colors"
        >
          Heal (+HP)
        </button>
        <button
          onClick={() => onBoostWealth(agent.id)}
          className="flex-1 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold cursor-pointer transition-colors"
        >
          +50 Credits
        </button>
        <button
          onClick={() => onCloneAgent(agent.id)}
          className="flex-1 py-1.5 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/30 rounded text-[10px] font-bold cursor-pointer transition-colors"
        >
          Clone Unit
        </button>
      </div>
    </div>
  );
};
