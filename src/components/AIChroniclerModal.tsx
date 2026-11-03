import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  X,
  Send,
  Download,
  Copy,
  Check,
  Cpu,
  Globe2,
  ScrollText
} from 'lucide-react';
import { Faction, HistoryDataPoint, WorldLog } from '../types/simulation';

interface AIChroniclerModalProps {
  isOpen: boolean;
  onClose: () => void;
  worldName: string;
  epoch: number;
  population: number;
  factions: Faction[];
  logs: WorldLog[];
  history: HistoryDataPoint[];
}

export const AIChroniclerModal: React.FC<AIChroniclerModalProps> = ({
  isOpen,
  onClose,
  worldName,
  epoch,
  population,
  factions,
  logs,
  history
}) => {
  const [loading, setLoading] = useState(false);
  const [chronicleData, setChronicleData] = useState<{
    title: string;
    chronicle: string;
    recommendation: string;
    source: string;
  } | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchChronicle = async (customQuery?: string) => {
    setLoading(true);
    try {
      const topEvents = logs.slice(0, 8).map(l => `${l.title}: ${l.message}`);
      const latestStats = history[history.length - 1] || {};

      const res = await fetch('/api/chronicler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worldName,
          epoch,
          population,
          factions: factions.map(f => ({ name: f.name, wealth: f.wealth, techEra: f.techEra })),
          topEvents,
          economicStats: latestStats,
          userPrompt: customQuery
        })
      });

      const data = await res.json();
      if (data.success) {
        setChronicleData({
          title: data.title || `Annals of ${worldName} — Epoch ${epoch}`,
          chronicle: data.chronicle || 'The simulation marches onward in computational equilibrium.',
          recommendation: data.recommendation || 'Observe emerging trade patterns.',
          source: data.source || 'gemini_ai'
        });
      }
    } catch (err) {
      console.warn('Failed to call /api/chronicler:', err);
      // Fallback
      setChronicleData({
        title: `Annals of ${worldName} — Epoch ${epoch}`,
        chronicle: `In this era, ${population} autonomous organisms populated the known realm. The factions of ${factions.map(f => f.name).join(', ')} maintained strategic operations across varying biomes.\n\nTechnological progress advanced steadily as trade convoys formed dynamic exchange routes between market outposts.`,
        recommendation: 'Monitor population density and adjust resource regeneration if starvation occurs.',
        source: 'local_engine'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !chronicleData) {
      fetchChronicle();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!chronicleData) return;
    navigator.clipboard.writeText(`# ${chronicleData.title}\n\n${chronicleData.chronicle}\n\n**Architect Advice:** ${chronicleData.recommendation}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-3xl bg-[#091124] border border-purple-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(168,85,247,0.25)] flex flex-col max-h-[90vh] cyber-panel">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-purple-500/20 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <ScrollText className="w-5 h-5 animate-pulse text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-purple-400 font-bold px-1.5 py-0.5 rounded bg-purple-950 border border-purple-500/30">
                  ORACLE AI CHRONICLER
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Epoch {epoch} Lore Record
                </span>
              </div>
              <h2 className="text-lg font-bold text-white font-display">
                The Grand Annals of {worldName}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Chronicle Content */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 font-mono">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-purple-300">
              <Sparkles className="w-8 h-8 animate-spin text-purple-400" />
              <p className="text-sm font-sans tracking-wide">
                Synthesizing emergent world lore and analyzing sociological trends...
              </p>
            </div>
          ) : chronicleData ? (
            <div className="space-y-4">
              
              {/* Title Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/50 to-cyan-950/40 border border-purple-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-purple-400 uppercase tracking-widest font-bold">
                    Historical Tome Entry
                  </div>
                  <h3 className="text-base font-bold text-white font-sans mt-0.5">
                    {chronicleData.title}
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-1 rounded bg-black/40 text-purple-300 border border-purple-500/30">
                  {chronicleData.source === 'gemini_ai' ? '✨ Gemini AI Grounded' : '⚙️ Deterministic Core'}
                </span>
              </div>

              {/* Chronicle Text */}
              <div className="p-5 rounded-xl bg-[#040817] border border-slate-800 text-slate-200 text-sm leading-relaxed whitespace-pre-line font-sans shadow-inner">
                {chronicleData.chronicle}
              </div>

              {/* Cosmic Advice for the Architect */}
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-3">
                <Globe2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-cyan-400 font-mono tracking-wider">
                    Cosmic Observation for the Architect
                  </div>
                  <p className="text-xs text-cyan-200 mt-0.5 font-sans leading-relaxed">
                    {chronicleData.recommendation}
                  </p>
                </div>
              </div>

            </div>
          ) : null}
        </div>

        {/* Custom Inquiry Query Input */}
        <div className="mt-4 pt-4 border-t border-purple-500/20 flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Ask the Oracle (e.g. 'Analyze wealth distribution', 'Forecast next war')..."
            className="flex-1 w-full bg-[#040817] border border-purple-500/30 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-400 font-mono"
          />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => fetchChronicle(userPrompt)}
              disabled={loading}
              className="flex-1 sm:flex-initial px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Inquire</span>
            </button>
            <button
              onClick={handleCopy}
              className="p-2 bg-[#040817] hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 cursor-pointer"
              title="Copy Chronicle"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
