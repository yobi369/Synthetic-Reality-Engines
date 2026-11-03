import React, { useState } from 'react';
import { TimelineFork, HistoryDataPoint, WorldConfig } from '../types/simulation';
import {
  GitBranch,
  Split,
  FastForward,
  Clock,
  Zap,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  Shield,
  Activity,
  PlusCircle,
  Play
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface MultiverseLoomProps {
  forks: TimelineFork[];
  activeForkId: string;
  currentTick: number;
  currentEpoch: number;
  onForkTimeline: (name: string, description: string) => void;
  onSwitchTimeline: (forkId: string) => void;
}

export const MultiverseLoom: React.FC<MultiverseLoomProps> = ({
  forks,
  activeForkId,
  currentTick,
  currentEpoch,
  onForkTimeline,
  onSwitchTimeline
}) => {
  const [newForkName, setNewForkName] = useState('');
  const [newForkDesc, setNewForkDesc] = useState('');
  const [compareForkId, setCompareForkId] = useState<string | null>(null);
  const [showForkModal, setShowForkModal] = useState(false);

  const activeFork = forks.find(f => f.id === activeForkId) || forks[0];
  const compareFork = compareForkId ? forks.find(f => f.id === compareForkId) : null;

  const handleCreateFork = (e: React.FormEvent) => {
    e.preventDefault();
    onForkTimeline(
      newForkName.trim() || `Timeline Branch ${forks.length + 1}`,
      newForkDesc.trim() || `Quantum divergence at Tick ${currentTick}`
    );
    setNewForkName('');
    setNewForkDesc('');
    setShowForkModal(false);
  };

  return (
    <div id="multiverse-loom-container" className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md p-6 rounded-xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitBranch className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Multiverse Time Loom & Quantum Reality Forks
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {forks.length} Realities Active
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Branch the synthetic timeline into parallel universes. Alter constants, test divergent catastrophes, and compare evolutionary trajectories.
          </p>
        </div>

        <button
          id="btn-open-fork-modal"
          onClick={() => setShowForkModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-purple-900/30 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Quantum Fork Timeline
        </button>
      </div>

      {/* Timeline Branching Graph / Tree Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {forks.map((fork, idx) => {
          const isActive = fork.id === activeForkId;
          const isComparing = fork.id === compareForkId;
          const snap = fork.snapshotState;

          return (
            <div
              key={fork.id}
              id={`timeline-card-${fork.id}`}
              className={`relative p-5 rounded-xl border transition-all ${
                isActive
                  ? 'bg-slate-900/90 border-purple-500 shadow-xl shadow-purple-950/40 ring-1 ring-purple-500/50'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Active Badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: fork.color }}
                  />
                  <h3 className="font-bold text-white text-base">{fork.name}</h3>
                </div>
                {isActive && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                    Active Reality
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 mb-4 min-h-[32px] line-clamp-2">
                {fork.description}
              </p>

              {/* State Summary Stats */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-center text-xs mb-4 font-mono">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Epoch / Tick</div>
                  <div className="font-semibold text-slate-200">
                    E{snap.epoch} : T{snap.tick}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Population</div>
                  <div className="font-semibold text-sky-400">{snap.agents.length}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Laws Ratified</div>
                  <div className="font-semibold text-emerald-400">
                    {snap.laws.filter(l => l.status === 'ratified').length}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {!isActive ? (
                  <button
                    id={`btn-jump-reality-${fork.id}`}
                    onClick={() => onSwitchTimeline(fork.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Jump Reality
                  </button>
                ) : (
                  <div className="flex-1 py-1.5 px-3 bg-slate-800/60 text-slate-400 rounded-lg text-xs text-center font-mono">
                    Currently Navigating
                  </div>
                )}

                <button
                  id={`btn-compare-${fork.id}`}
                  onClick={() => setCompareForkId(isComparing ? null : fork.id)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    isComparing
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      : 'bg-slate-800/40 text-slate-400 hover:text-slate-200 border-slate-700'
                  }`}
                  title="Compare metrics side-by-side"
                >
                  <Split className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Parallel Reality Comparison (Split-Screen Metrics) */}
      {compareFork && (
        <div id="parallel-reality-comparison" className="p-6 bg-slate-900/80 rounded-xl border border-sky-500/30 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <Split className="w-5 h-5 text-sky-400" />
              <div>
                <h3 className="text-lg font-bold text-white">
                  Quantum Divergence: {activeFork.name} vs. {compareFork.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Side-by-side comparative analysis of parallel evolutionary trajectories.
                </p>
              </div>
            </div>
            <button
              onClick={() => setCompareForkId(null)}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 bg-slate-800 rounded"
            >
              Close Comparison
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Reality */}
            <div className="bg-slate-950 p-5 rounded-lg border border-purple-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-purple-400 uppercase tracking-wider">
                  Reality A (Active)
                </span>
                <span className="font-bold text-white">{activeFork.name}</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Population:</span>
                  <span className="text-white font-mono">{activeFork.snapshotState.agents.length}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Active Factions:</span>
                  <span className="text-white font-mono">{activeFork.snapshotState.factions.length}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Species Clades:</span>
                  <span className="text-white font-mono">
                    {activeFork.snapshotState.clades.filter(c => !c.extinct).length}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Cosmic Anomalies:</span>
                  <span className="text-white font-mono">{activeFork.snapshotState.anomalies.length}</span>
                </div>
              </div>
            </div>

            {/* Compared Reality */}
            <div className="bg-slate-950 p-5 rounded-lg border border-sky-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-sky-400 uppercase tracking-wider">
                  Reality B (Compared)
                </span>
                <span className="font-bold text-white">{compareFork.name}</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Population:</span>
                  <span className="text-white font-mono">{compareFork.snapshotState.agents.length}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Active Factions:</span>
                  <span className="text-white font-mono">{compareFork.snapshotState.factions.length}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Species Clades:</span>
                  <span className="text-white font-mono">
                    {compareFork.snapshotState.clades.filter(c => !c.extinct).length}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Cosmic Anomalies:</span>
                  <span className="text-white font-mono">{compareFork.snapshotState.anomalies.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Quantum Fork Creation */}
      {showForkModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-bold text-white">Quantum Reality Fork</h3>
            </div>
            <p className="text-xs text-slate-400">
              Create an isolated timeline branch captured from current simulation state at Epoch {currentEpoch}, Tick {currentTick}.
            </p>

            <form onSubmit={handleCreateFork} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Timeline Branch Name
                </label>
                <input
                  type="text"
                  value={newForkName}
                  onChange={e => setNewForkName(e.target.value)}
                  placeholder="e.g., Timeline β: Post-Singularity Utopia"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Hypothesis / Description
                </label>
                <textarea
                  value={newForkDesc}
                  onChange={e => setNewForkDesc(e.target.value)}
                  placeholder="e.g., Testing speciation drift with mutagenic fog and maximum trade deregulation."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForkModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg shadow-lg shadow-purple-900/30"
                >
                  Branch Reality
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
