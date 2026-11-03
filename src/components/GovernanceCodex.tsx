import React, { useState } from 'react';
import { WorldLaw, Faction } from '../types/simulation';
import {
  Scale,
  Scroll,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Shield,
  Zap,
  TrendingUp,
  Award,
  Vote,
  PlusCircle
} from 'lucide-react';

interface GovernanceCodexProps {
  laws: WorldLaw[];
  factions: Faction[];
  epoch: number;
  tick: number;
  onPromulgateDecree: (law: Partial<WorldLaw>) => void;
}

export const GovernanceCodex: React.FC<GovernanceCodexProps> = ({
  laws,
  factions,
  epoch,
  tick,
  onPromulgateDecree
}) => {
  const [showDecreeModal, setShowDecreeModal] = useState(false);
  const [decreeTitle, setDecreeTitle] = useState('');
  const [decreeCategory, setDecreeCategory] = useState<WorldLaw['category']>('economic');
  const [decreeDesc, setDecreeDesc] = useState('');
  const [speedBoost, setSpeedBoost] = useState(1.2);
  const [tradeBoost, setTradeBoost] = useState(1.4);

  const ratifiedLaws = laws.filter(l => l.status === 'ratified');
  const proposedLaws = laws.filter(l => l.status === 'proposed');

  const handlePromulgate = (e: React.FormEvent) => {
    e.preventDefault();
    onPromulgateDecree({
      title: decreeTitle.trim() || 'Architect Sovereign Edict',
      category: decreeCategory,
      description: decreeDesc.trim() || 'Cosmic decree mandated by supreme executive authority.',
      effects: {
        speedMultiplier: speedBoost,
        tradeRewardMultiplier: tradeBoost
      }
    });
    setDecreeTitle('');
    setDecreeDesc('');
    setShowDecreeModal(false);
  };

  return (
    <div id="governance-codex-container" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md p-6 rounded-xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Autonomous Constitution & Governance Codex
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {ratifiedLaws.length} Active Treaties
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Autonomous faction leaders draft, debate, and ratify emergent world laws that dynamically alter economic tariffs, combat rules, and speciation rates.
          </p>
        </div>

        <button
          id="btn-open-decree-modal"
          onClick={() => setShowDecreeModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold rounded-lg text-sm transition-all shadow-lg shadow-amber-900/30 cursor-pointer"
        >
          <Award className="w-4 h-4" />
          Issue Sovereign Decree
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Legislative Session (Proposed Bills) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
              <Vote className="w-4 h-4 text-sky-400" />
              <span>World Senate Chamber (Active Votes)</span>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Quorum: {Math.ceil(factions.length * 0.5)}/{factions.length}
            </span>
          </div>

          {proposedLaws.length === 0 ? (
            <div className="p-8 bg-slate-900/40 rounded-xl border border-slate-800 text-center text-slate-500 text-sm">
              No bills currently under legislative debate. Next council session convenes soon.
            </div>
          ) : (
            proposedLaws.map(law => {
              const proposingFaction = factions.find(f => f.id === law.proposedByFactionId);
              return (
                <div
                  key={law.id}
                  id={`bill-card-${law.id}`}
                  className="p-5 bg-slate-900/70 rounded-xl border border-sky-500/30 shadow-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      BILL IN SESSION • {law.category.toUpperCase()}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-mono text-amber-400">
                      <Clock className="w-3.5 h-3.5" />
                      Voting Active
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">{law.title}</h3>
                  <p className="text-xs text-slate-400">{law.description}</p>

                  {/* Faction Votes Indicator */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Faction Votes:</span>
                      <span className="font-mono text-white">
                        {law.votesFor.length} For / {law.votesAgainst.length} Against
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {factions.map(f => {
                        const isFor = law.votesFor.includes(f.id);
                        const isAgainst = law.votesAgainst.includes(f.id);
                        return (
                          <span
                            key={f.id}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                              isFor
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                : isAgainst
                                ? 'bg-red-950 text-red-400 border-red-800'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {f.name.split(' ')[0]}: {isFor ? 'AYE' : isAgainst ? 'NAY' : 'DELIBERATING'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Ratified Codex of World Laws */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
            <Scroll className="w-4 h-4 text-amber-400" />
            <span>Ratified Constitutional Codex</span>
          </div>

          <div className="space-y-3">
            {ratifiedLaws.map(law => (
              <div
                key={law.id}
                id={`ratified-law-${law.id}`}
                className="p-5 bg-slate-900/60 rounded-xl border border-slate-800 shadow-md space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {law.category.toUpperCase()} ACT
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Enacted Epoch {law.epochRatified || 1}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{law.title}</span>
                </h3>
                <p className="text-xs text-slate-400">{law.description}</p>

                {/* Modifiers Pill Badges */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {law.effects.speedMultiplier && (
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-sky-400 border border-slate-800">
                      SPEED ×{law.effects.speedMultiplier}
                    </span>
                  )}
                  {law.effects.tradeRewardMultiplier && (
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-amber-400 border border-slate-800">
                      TRADE DIVIDEND ×{law.effects.tradeRewardMultiplier}
                    </span>
                  )}
                  {law.effects.combatDamageMultiplier && (
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-pink-400 border border-slate-800">
                      COMBAT DAMAGE ×{law.effects.combatDamageMultiplier}
                    </span>
                  )}
                  {law.effects.resourceRegenMultiplier && (
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-emerald-400 border border-slate-800">
                      REGEN ×{law.effects.resourceRegenMultiplier}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Sovereign Decree Promulgation */}
      {showDecreeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold text-white">Promulgate Sovereign Decree</h3>
            </div>
            <p className="text-xs text-slate-400">
              Exercise divine executive authority to immediately bind all autonomous factions under an inviolable universal law.
            </p>

            <form onSubmit={handlePromulgate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Decree Title
                </label>
                <input
                  type="text"
                  value={decreeTitle}
                  onChange={e => setDecreeTitle(e.target.value)}
                  placeholder="e.g., Edict of Hyper-Commerce & Velocity"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={decreeCategory}
                  onChange={e => setDecreeCategory(e.target.value as WorldLaw['category'])}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="economic">Economic Reform</option>
                  <option value="diplomatic">Diplomatic Accord</option>
                  <option value="military">Military Directive</option>
                  <option value="ecological">Ecological Preservation</option>
                  <option value="genetic">Genomic Policy</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Decree Text / Mandate
                </label>
                <textarea
                  value={decreeDesc}
                  onChange={e => setDecreeDesc(e.target.value)}
                  placeholder="e.g., By supreme order, all trade caravans operate with heightened velocity and doubled market dividends."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Speed Multiplier: {speedBoost}x</label>
                  <input
                    type="range"
                    min="0.8"
                    max="2.0"
                    step="0.1"
                    value={speedBoost}
                    onChange={e => setSpeedBoost(parseFloat(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Trade Bonus: {tradeBoost}x</label>
                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.2"
                    value={tradeBoost}
                    onChange={e => setTradeBoost(parseFloat(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDecreeModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-lg shadow-amber-900/30"
                >
                  Ratify Decree
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
