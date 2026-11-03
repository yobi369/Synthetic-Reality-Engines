import React, { useState } from 'react';
import { Agent, Faction } from '../types/simulation';
import {
  Brain,
  Zap,
  Radio,
  Send,
  Sparkles,
  Shield,
  Activity,
  Heart,
  TrendingUp,
  Flame,
  Search,
  Users
} from 'lucide-react';

interface NeuralMindVisualizerProps {
  agent: Agent;
  faction?: Faction;
  onSendThought: (agentId: string, thought: string) => void;
}

export const NeuralMindVisualizer: React.FC<NeuralMindVisualizerProps> = ({
  agent,
  faction,
  onSendThought
}) => {
  const [directiveInput, setDirectiveInput] = useState('');
  const [isTransmitting, setIsTransmitting] = useState(false);

  // Compute cognitive drive activations (0-100%)
  const survivalDrive = Math.round((1 - agent.energy / agent.maxEnergy) * 100);
  const wealthDrive = Math.round(agent.genetics.tradeAffinity * 100);
  const combatDrive = Math.round(agent.genetics.aggression * 100);
  const curiosityDrive = Math.round(agent.genetics.curiosity * 100);
  const kinshipDrive = Math.round((agent.energy > 70 ? 80 : 30));
  const loyaltyDrive = Math.round(agent.factionId ? 85 : 20);

  const cognitiveNodes = [
    { id: 'survival', label: 'Survival Instinct', value: survivalDrive, icon: Activity, color: '#ef4444' },
    { id: 'wealth', label: 'Market Acumen', value: wealthDrive, icon: TrendingUp, color: '#f59e0b' },
    { id: 'combat', label: 'Aggression Drive', value: combatDrive, icon: Flame, color: '#ec4899' },
    { id: 'curiosity', label: 'Cognitive Curiosity', value: curiosityDrive, icon: Search, color: '#38bdf8' },
    { id: 'kinship', label: 'Kinship & Lineage', value: kinshipDrive, icon: Heart, color: '#10b981' },
    { id: 'loyalty', label: 'Faction Alignment', value: loyaltyDrive, icon: Shield, color: '#8b5cf6' }
  ];

  const handleTransmitDirective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directiveInput.trim()) return;
    setIsTransmitting(true);
    onSendThought(agent.id, directiveInput.trim());
    setTimeout(() => {
      setDirectiveInput('');
      setIsTransmitting(false);
    }, 600);
  };

  return (
    <div id="neural-mind-visualizer" className="p-6 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{agent.name}</span>
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {agent.speciesName || agent.role}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Live Synaptic Cognitive Graph & Neural Impulse Stream
            </p>
          </div>
        </div>

        <div className="text-right font-mono text-xs text-slate-400">
          <div>GEN: <span className="text-purple-400 font-bold">{agent.generation}</span></div>
          <div>AGE: <span className="text-sky-400">{agent.age} Ticks</span></div>
        </div>
      </div>

      {/* Active Thought Stream */}
      <div className="bg-slate-950 p-4 rounded-lg border border-purple-500/30 relative overflow-hidden">
        <div className="flex items-center gap-2 text-xs font-mono text-purple-400 mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>CURRENT SYNAPSE FIRING</span>
        </div>
        <p className="text-sm text-purple-100 font-medium italic">
          "{agent.currentThought || 'Processing ambient environmental sensory feed...'}"
        </p>
        <div className="mt-2 text-xs text-slate-500 font-mono">
          PRIMARY GOAL: <span className="text-slate-300">{agent.goal}</span>
        </div>
      </div>

      {/* Synaptic Cognitive Matrix (Graph Bars) */}
      <div className="space-y-3">
        <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          Neural Drive Activations
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cognitiveNodes.map((node) => {
            const Icon = node.icon;
            return (
              <div
                key={node.id}
                className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <Icon className="w-3.5 h-3.5" style={{ color: node.color }} />
                    <span>{node.label}</span>
                  </div>
                  <span className="font-mono font-bold" style={{ color: node.color }}>
                    {node.value}%
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${node.value}%`,
                      backgroundColor: node.color
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Associative Memory Stream */}
      <div className="space-y-2">
        <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          Recent Associative Memories ({agent.memory?.length || 0})
        </div>
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 max-h-28 overflow-y-auto space-y-1 text-xs font-mono text-slate-400">
          {(agent.memory || []).slice().reverse().map((mem, i) => (
            <div key={i} className="flex items-start gap-2 text-slate-300">
              <span className="text-purple-500">•</span>
              <span>{mem}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Architect Directive Injection Form */}
      <form onSubmit={handleTransmitDirective} className="space-y-2 pt-2 border-t border-slate-800">
        <label className="block text-xs font-medium text-slate-300">
          Transmit Neural Directive (Telepathic Command)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={directiveInput}
            onChange={e => setDirectiveInput(e.target.value)}
            placeholder="e.g., Focus on brokering peace with the neighboring settlement..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={isTransmitting}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition-colors shadow-lg shadow-purple-900/30 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Transmit</span>
          </button>
        </div>
      </form>
    </div>
  );
};
