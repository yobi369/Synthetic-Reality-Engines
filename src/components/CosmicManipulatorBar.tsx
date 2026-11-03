import React from 'react';
import { CosmicToolType } from '../types/simulation';
import {
  MousePointer,
  Atom,
  Flame,
  Clock,
  Sparkles,
  Droplet,
  Zap,
  Mountain,
  Radiation,
  Apple
} from 'lucide-react';

interface CosmicManipulatorBarProps {
  activeTool: CosmicToolType;
  onSelectTool: (tool: CosmicToolType) => void;
}

export const CosmicManipulatorBar: React.FC<CosmicManipulatorBarProps> = ({
  activeTool,
  onSelectTool
}) => {
  const tools: { id: CosmicToolType; label: string; icon: React.FC<{ className?: string }>; color: string; desc: string }[] = [
    { id: 'none', label: 'Select / Pan', icon: MousePointer, color: '#94a3b8', desc: 'Standard inspection & world navigation' },
    { id: 'black_hole', label: 'Singularity', icon: Atom, color: '#c084fc', desc: 'Spawns a gravitational black hole pulling entities into orbit' },
    { id: 'mutagenic_fog', label: 'Mutagen Mist', icon: Radiation, color: '#bef264', desc: 'Deploys radioactive fog triggering spontaneous genetic speciation' },
    { id: 'chrono_vortex', label: 'Chrono Field', icon: Clock, color: '#67e8f9', desc: 'Creates a time-dilation vortex that slows local velocity' },
    { id: 'hydro_oasis', label: 'Hydro Oasis', icon: Droplet, color: '#38bdf8', desc: 'Materializes a healing oasis replenishing health & energy' },
    { id: 'obsidian_mountain', label: 'Obsidian Crag', icon: Mountain, color: '#94a3b8', desc: 'Terraforms an impenetrable basalt barrier blocking passage' },
    { id: 'lightning_smite', label: 'Divine Smite', icon: Zap, color: '#facc15', desc: 'Strikes targeted coordinates with kinetic lightning' },
    { id: 'meteor', label: 'Meteor Strike', icon: Flame, color: '#f87171', desc: 'Triggers a devastating cataclysmic meteor impact' },
    { id: 'resource', label: 'Seed Harvest', icon: Apple, color: '#34d399', desc: 'Spawns rich food & mineral sustenance nodes' }
  ];

  return (
    <div id="cosmic-manipulator-bar" className="bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
          Cosmic Manipulator
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              id={`tool-btn-${tool.id}`}
              onClick={() => onSelectTool(tool.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-purple-600/30 text-white border border-purple-500 shadow-md shadow-purple-900/40 ring-1 ring-purple-500/40'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
              }`}
              title={tool.desc}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: tool.color }} />
              <span>{tool.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
