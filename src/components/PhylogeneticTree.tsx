import React, { useState } from 'react';
import { SpeciesClade, Agent } from '../types/simulation';
import {
  Dna,
  GitCommit,
  Sparkles,
  Zap,
  Activity,
  Layers,
  Compass,
  AlertTriangle,
  Flame,
  Shield,
  Eye,
  TrendingUp
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip
} from 'recharts';

interface PhylogeneticTreeProps {
  clades: SpeciesClade[];
  agents: Agent[];
  epoch: number;
  tick: number;
}

export const PhylogeneticTree: React.FC<PhylogeneticTreeProps> = ({
  clades,
  agents,
  epoch,
  tick
}) => {
  const [selectedCladeId, setSelectedCladeId] = useState<string>(clades[0]?.id || '');

  const selectedClade = clades.find(c => c.id === selectedCladeId) || clades[0];

  // Radar data for selected clade
  const radarData = selectedClade
    ? [
        { trait: 'Speed', value: Math.round((selectedClade.traits.avgSpeed / 4.5) * 100) },
        { trait: 'Aggression', value: Math.round(selectedClade.traits.avgAggression * 100) },
        { trait: 'Curiosity', value: Math.round(selectedClade.traits.avgCuriosity * 100) },
        { trait: 'Trade Affinity', value: Math.round(selectedClade.traits.avgTrade * 100) },
        { trait: 'Vision Radius', value: Math.round((selectedClade.traits.avgVision / 220) * 100) },
        { trait: 'Metabolism', value: Math.round((selectedClade.traits.avgMetabolism / 0.1) * 100) }
      ]
    : [];

  const activeCladesCount = clades.filter(c => !c.extinct).length;
  const extinctCladesCount = clades.filter(c => c.extinct).length;

  return (
    <div id="phylogenetic-tree-container" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md p-6 rounded-xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Dna className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Phylogenetic Tree of Life & Speciation Cladogram
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {activeCladesCount} Active Subspecies
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Real-time tracking of evolutionary cladogenesis, genetic mutations, and biological/synthetic speciation drift across epochs.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
            TOTAL CLADES: <span className="text-emerald-400 font-bold">{clades.length}</span>
          </div>
          {extinctCladesCount > 0 && (
            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-red-900/40 text-red-400">
              EXTINCT: <span className="font-bold">{extinctCladesCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Cladogram Tree Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lineage Branching List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
            Identified Evolutionary Clades
          </div>

          <div className="space-y-3">
            {clades.map((clade) => {
              const isSelected = clade.id === selectedClade?.id;
              const liveMembers = agents.filter(a => a.speciesCladeId === clade.id);

              return (
                <div
                  key={clade.id}
                  id={`clade-node-${clade.id}`}
                  onClick={() => setSelectedCladeId(clade.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500 shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                      : clade.extinct
                      ? 'bg-slate-900/20 border-slate-800/40 opacity-60'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-4 h-4 rounded-full mt-1 shrink-0"
                      style={{ backgroundColor: clade.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base">{clade.name}</h3>
                        {clade.extinct ? (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-red-950 text-red-400 border border-red-800 rounded">
                            EXTINCT
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                            {liveMembers.length} ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Founder: <span className="text-slate-300 font-medium">{clade.founderName}</span> • Emerged Epoch {clade.foundingEpoch}
                      </p>

                      {/* Mutation Highlights */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {clade.mutationHighlights.map((mut, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-950 text-[10px] font-mono text-emerald-400 rounded border border-emerald-500/20"
                          >
                            + {mut}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick trait stats */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800/80 text-center text-xs font-mono shrink-0 w-full sm:w-auto">
                    <div>
                      <div className="text-[9px] text-slate-500">SPEED</div>
                      <div className="font-semibold text-white">{clade.traits.avgSpeed.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500">AGGRO</div>
                      <div className="font-semibold text-pink-400">{Math.round(clade.traits.avgAggression * 100)}%</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500">CURIOSITY</div>
                      <div className="font-semibold text-sky-400">{Math.round(clade.traits.avgCuriosity * 100)}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Clade Deep Genomic Radar */}
        {selectedClade && (
          <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4 flex flex-col">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">
                Genomic Radar: {selectedClade.name}
              </h3>
            </div>

            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="trait" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis stroke="#475569" angle={30} domain={[0, 100]} tick={false} />
                  <Radar
                    name={selectedClade.name}
                    dataKey="value"
                    stroke={selectedClade.color}
                    fill={selectedClade.color}
                    fillOpacity={0.4}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '11px'
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Founder Ancestor:</span>
                <span className="text-white">{selectedClade.founderName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Founding Epoch:</span>
                <span className="text-white">Epoch {selectedClade.foundingEpoch}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Avg Metabolism:</span>
                <span className="text-emerald-400">{selectedClade.traits.avgMetabolism.toFixed(3)} E/t</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Vision Radius:</span>
                <span className="text-sky-400">{Math.round(selectedClade.traits.avgVision)} px</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
