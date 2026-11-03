import React, { useState } from 'react';
import {
  HistoryDataPoint,
  MarketPrice,
  WorldLog,
  Faction,
  ResourceType
} from '../types/simulation';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Shield,
  Coins,
  FileText,
  Filter,
  Download,
  Flame,
  Dna,
  Sparkles,
  Zap
} from 'lucide-react';

interface ObservabilityDashboardProps {
  history: HistoryDataPoint[];
  marketPrices: Record<ResourceType, MarketPrice>;
  logs: WorldLog[];
  factions: Faction[];
  epoch: number;
  tick: number;
}

export const ObservabilityDashboard: React.FC<ObservabilityDashboardProps> = ({
  history,
  marketPrices,
  logs,
  factions,
  epoch,
  tick
}) => {
  const [logFilter, setLogFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLogs = logs.filter((l) => {
    const matchesFilter = logFilter === 'all' || l.type === logFilter;
    const matchesQuery =
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  const latestStats = history[history.length - 1] || {
    population: 0,
    totalWealth: 0,
    averageHealth: 100,
    resourceAbundance: 0,
    tradeVolume: 0,
    activeConflicts: 0,
    techScore: 1
  };

  const exportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sre-chronicle-epoch-${epoch}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Vital Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="cyber-panel p-3 rounded-xl border border-cyan-500/20">
          <div className="text-slate-400 text-[10px] uppercase">Active Population</div>
          <div className="text-xl font-bold text-cyan-300 font-display mt-0.5">
            {latestStats.population}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Epoch {epoch}</span>
          </div>
        </div>

        <div className="cyber-panel p-3 rounded-xl border border-cyan-500/20">
          <div className="text-slate-400 text-[10px] uppercase">World GDP / Wealth</div>
          <div className="text-xl font-bold text-amber-300 font-display mt-0.5">
            {latestStats.totalWealth.toLocaleString()} <span className="text-xs">c</span>
          </div>
          <div className="text-[10px] text-amber-400/80 mt-1 flex items-center gap-1">
            <Coins className="w-3 h-3" />
            <span>Circulating Assets</span>
          </div>
        </div>

        <div className="cyber-panel p-3 rounded-xl border border-cyan-500/20">
          <div className="text-slate-400 text-[10px] uppercase">Resource Abundance</div>
          <div className="text-xl font-bold text-emerald-300 font-display mt-0.5">
            {latestStats.resourceAbundance.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Active Reserves</span>
          </div>
        </div>

        <div className="cyber-panel p-3 rounded-xl border border-cyan-500/20">
          <div className="text-slate-400 text-[10px] uppercase">Trade Volume</div>
          <div className="text-xl font-bold text-purple-300 font-display mt-0.5">
            {latestStats.tradeVolume}
          </div>
          <div className="text-[10px] text-purple-400/80 mt-1 flex items-center gap-1">
            <Activity className="w-3 h-3" />
            <span>Bazaar Transactions</span>
          </div>
        </div>

        <div className="cyber-panel p-3 rounded-xl border border-cyan-500/20">
          <div className="text-slate-400 text-[10px] uppercase">Average Vitality</div>
          <div className="text-xl font-bold text-blue-300 font-display mt-0.5">
            {latestStats.averageHealth}%
          </div>
          <div className="text-[10px] text-blue-400/80 mt-1 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>Biome Resilience</span>
          </div>
        </div>

        <div className="cyber-panel p-3 rounded-xl border border-cyan-500/20">
          <div className="text-slate-400 text-[10px] uppercase">Tech Advancement</div>
          <div className="text-xl font-bold text-pink-300 font-display mt-0.5">
            {latestStats.techScore}x
          </div>
          <div className="text-[10px] text-pink-400/80 mt-1 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>Scientific Quotient</span>
          </div>
        </div>
      </div>

      {/* Observability Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Population Dynamics & Resource Cycles */}
        <div className="cyber-panel p-4 rounded-xl border border-cyan-500/20">
          <div className="flex items-center justify-between mb-4 border-b border-cyan-500/20 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-white font-sans text-sm tracking-wide">
                Population & Ecosystem Resource Cycles
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Time Window: 50 Ticks</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="popGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="resGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="tick" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: '#091124', borderColor: '#00f0ff44', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="population" stroke="#00f0ff" fillOpacity={1} fill="url(#popGrad)" name="Organisms (Pop)" />
                <Area type="monotone" dataKey="resourceAbundance" stroke="#10b981" fillOpacity={1} fill="url(#resGrad)" name="Resource Reserve" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Dynamic Commodity Pricing & Market Inflation */}
        <div className="cyber-panel p-4 rounded-xl border border-cyan-500/20">
          <div className="flex items-center justify-between mb-4 border-b border-cyan-500/20 pb-2">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-white font-sans text-sm tracking-wide">
                Emergent Market Commodity Pricing
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Supply / Demand Arbitrage</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3 font-mono text-xs">
            {(Object.keys(marketPrices) as ResourceType[]).map((rKey) => {
              const item = marketPrices[rKey];
              return (
                <div key={rKey} className="bg-[#050b1d] p-2 rounded border border-slate-800 flex justify-between items-center">
                  <span className="capitalize text-slate-400">{rKey}</span>
                  <span className="text-amber-300 font-bold">{item.price} c</span>
                </div>
              );
            })}
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="tick" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: '#091124', borderColor: '#f59e0b44', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="totalWealth" stroke="#f59e0b" dot={false} strokeWidth={2} name="Total Wealth (c)" />
                <Line type="monotone" dataKey="tradeVolume" stroke="#c084fc" dot={false} strokeWidth={2} name="Trade Volume" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Emergence Annals & Live World Chronicle Feed */}
      <div className="cyber-panel p-4 rounded-xl border border-cyan-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-cyan-500/20 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-white font-sans text-sm tracking-wide">
              Live Emergence Annals & Event Stream
            </h3>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30">
              {filteredLogs.length} Events Logged
            </span>
          </div>

          {/* Controls: Filter, Search, Export */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <div className="flex items-center gap-1 bg-[#091124] p-1 rounded-lg border border-slate-800">
              {['all', 'emergence', 'economy', 'diplomacy', 'science', 'disaster'].map((f) => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`px-2 py-0.5 rounded capitalize transition-all cursor-pointer ${
                    logFilter === f
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search annals..."
              className="bg-[#091124] border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-400 text-xs"
            />

            <button
              onClick={exportLogs}
              className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-900/50 rounded-lg cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Annals List */}
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No emergence logs match the active filter criteria.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const typeColors: Record<string, string> = {
                emergence: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30',
                economy: 'text-amber-400 border-amber-500/40 bg-amber-950/30',
                diplomacy: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30',
                science: 'text-purple-400 border-purple-500/40 bg-purple-950/30',
                disaster: 'text-red-400 border-red-500/40 bg-red-950/30',
                combat: 'text-rose-400 border-rose-500/40 bg-rose-950/30',
                evolution: 'text-lime-400 border-lime-500/40 bg-lime-950/30'
              };

              return (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                    typeColors[log.type] || 'text-slate-300 border-slate-800 bg-[#091124]'
                  } ${log.importance === 'critical' ? 'shadow-[0_0_12px_rgba(239,68,68,0.2)]' : ''}`}
                >
                  <div className="flex items-start sm:items-center gap-2.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/40 border border-white/10 shrink-0">
                      {log.type}
                    </span>
                    <div>
                      <span className="font-bold text-white tracking-wide mr-2 font-sans">
                        {log.title}:
                      </span>
                      <span className="text-slate-300 font-mono text-[11px]">
                        {log.message}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 shrink-0 self-end sm:self-auto">
                    Epoch {log.epoch} • Tick {log.tick}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};
