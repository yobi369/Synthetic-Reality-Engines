import React, { useState } from 'react';
import {
  X,
  Plus,
  Users,
  Shield,
  Coins,
  Cpu,
  Dna,
  Zap
} from 'lucide-react';
import { Faction, AgentRole } from '../types/simulation';

interface AgentSpawnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  factions: Faction[];
  onSpawn: (params: {
    name: string;
    role: AgentRole;
    factionId: string;
    speed: number;
    visionRadius: number;
    aggression: number;
    tradeAffinity: number;
  }) => void;
}

export const AgentSpawnerModal: React.FC<AgentSpawnerModalProps> = ({
  isOpen,
  onClose,
  factions,
  onSpawn
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<AgentRole>('Pioneer');
  const [factionId, setFactionId] = useState(factions[0]?.id || '');
  const [speed, setSpeed] = useState(2.4);
  const [visionRadius, setVisionRadius] = useState(130);
  const [aggression, setAggression] = useState(0.2);
  const [tradeAffinity, setTradeAffinity] = useState(0.5);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSpawn({
      name: name.trim() || `Agent-${Math.floor(Math.random() * 900 + 100)}`,
      role,
      factionId: factionId || factions[0]?.id,
      speed,
      visionRadius,
      aggression,
      tradeAffinity
    });
    onClose();
  };

  const roles: AgentRole[] = [
    'Pioneer',
    'Trader',
    'Gatherer',
    'Warrior',
    'Scholar',
    'Leader',
    'Scavenger',
    'Mutant',
    'Organism',
    'Predator',
    'Miner',
    'Diplomat'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#091124] border border-cyan-500/40 rounded-2xl p-6 shadow-2xl cyber-panel">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 flex items-center justify-center text-cyan-400 border border-cyan-500/30">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white font-sans text-sm">
                Synthetic Organism Spawner
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Inject custom agent into live world
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 font-mono text-xs">
          
          <div>
            <label className="block text-slate-300 text-[11px] mb-1">Agent Designation / Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Commander Lyra, Bio-Cell X"
              className="w-full bg-[#040817] border border-cyan-500/30 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 outline-none focus:border-cyan-400 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-300 text-[11px] mb-1">Role / Function:</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AgentRole)}
                className="w-full bg-[#040817] border border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-cyan-300 outline-none focus:border-cyan-400 text-xs cursor-pointer"
              >
                {roles.map((r) => (
                  <option key={r} value={r} className="bg-[#0b1329] text-white">
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 text-[11px] mb-1">Faction Alignment:</label>
              <select
                value={factionId}
                onChange={(e) => setFactionId(e.target.value)}
                className="w-full bg-[#040817] border border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-cyan-300 outline-none focus:border-cyan-400 text-xs cursor-pointer"
              >
                {factions.map((f) => (
                  <option key={f.id} value={f.id} className="bg-[#0b1329]" style={{ color: f.color }}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Genetic Parameters */}
          <div className="p-3 bg-[#040817] rounded-lg border border-slate-800 space-y-2.5">
            <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Dna className="w-3 h-3" />
              <span>Genomic Trait Calibration</span>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span>Velocity:</span>
                <span className="text-cyan-300">{speed.toFixed(1)} px/t</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="4.5"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span>Vision Radar:</span>
                <span className="text-cyan-300">{visionRadius} px</span>
              </div>
              <input
                type="range"
                min="60"
                max="220"
                step="10"
                value={visionRadius}
                onChange={(e) => setVisionRadius(parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span>Aggression:</span>
                <span className="text-red-300">{Math.round(aggression * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={aggression}
                onChange={(e) => setAggression(parseFloat(e.target.value))}
                className="w-full accent-red-400 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-sans rounded-xl cursor-pointer transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Instantiate Unit in World</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
