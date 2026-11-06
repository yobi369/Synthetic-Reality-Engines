import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Flame,
  Zap,
  Sparkles,
  Shield,
  Activity,
  Layers,
  BarChart3,
  Cpu,
  BookOpen,
  Plus,
  Compass,
  Radio,
  RefreshCw,
  GitBranch,
  Dna,
  Scale,
  Volume2,
  VolumeX,
  FlaskConical
} from 'lucide-react';
import { WorldPresetId } from '../types/simulation';
import { WORLD_PRESETS } from '../engine/presets';
import { audioEngine } from '../engine/AudioSynthesizer';

export type AppViewType =
  | 'canvas'
  | 'multiverse'
  | 'phylogeny'
  | 'governance'
  | 'observability'
  | 'architecture'
  | 'research';

interface HeaderProps {
  currentPreset: WorldPresetId;
  onSelectPreset: (id: WorldPresetId) => void;
  isRunning: boolean;
  onToggleRun: () => void;
  onStep: () => void;
  speed: number;
  onSetSpeed: (spd: number) => void;
  onEpochLeap: () => void;
  onReset: () => void;
  tick: number;
  epoch: number;
  population: number;
  activeView: AppViewType;
  onSelectView: (view: AppViewType) => void;
  onTriggerDisaster: (type: any) => void;
  onOpenSpawner: () => void;
  onOpenChronicler: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPreset,
  onSelectPreset,
  isRunning,
  onToggleRun,
  onStep,
  speed,
  onSetSpeed,
  onEpochLeap,
  onReset,
  tick,
  epoch,
  population,
  activeView,
  onSelectView,
  onTriggerDisaster,
  onOpenSpawner,
  onOpenChronicler
}) => {
  const [showDisasterMenu, setShowDisasterMenu] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const toggleAudio = () => {
    audioEngine.init();
    audioEngine.resume();
    const muted = audioEngine.toggleMute();
    setIsAudioMuted(muted);
  };

  return (
    <header className="w-full bg-slate-950/95 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-50 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        
        {/* Logo & Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-sky-950/80 border border-sky-400/40 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.25)]">
              <Cpu className="w-5 h-5 animate-pulse text-sky-400" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-sky-400 font-semibold px-1.5 py-0.5 rounded bg-sky-950/60 border border-sky-500/30">
                  FRINGE SYNTHETIC REALITY
                </span>
                <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                  Quantum Loom v3.0
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                SYNTHETIC REALITY ENGINE
              </h1>
            </div>
          </div>

          {/* Quick Metrics (Mobile) */}
          <div className="flex items-center gap-2 lg:hidden font-mono text-xs">
            <span className="text-sky-300 bg-sky-950/80 px-2 py-1 rounded border border-sky-500/30">
              E:{epoch} T:{tick}
            </span>
            <span className="text-emerald-300 bg-emerald-950/80 px-2 py-1 rounded border border-emerald-500/30">
              Pop:{population}
            </span>
          </div>
        </div>

        {/* Navigation View Switcher */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 self-start lg:self-auto overflow-x-auto w-full sm:w-auto">
          <button
            id="view-canvas-btn"
            onClick={() => onSelectView('canvas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'canvas'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Reality Canvas</span>
          </button>

          <button
            id="view-multiverse-btn"
            onClick={() => onSelectView('multiverse')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'multiverse'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-400/40 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Time Loom</span>
          </button>

          <button
            id="view-phylogeny-btn"
            onClick={() => onSelectView('phylogeny')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'phylogeny'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Dna className="w-3.5 h-3.5" />
            <span>Tree of Life</span>
          </button>

          <button
            id="view-governance-btn"
            onClick={() => onSelectView('governance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'governance'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Constitution</span>
          </button>

          <button
            id="view-observability-btn"
            onClick={() => onSelectView('observability')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'observability'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Observability</span>
          </button>

          <button
            id="view-research-btn"
            onClick={() => onSelectView('research')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'research'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Research Lab</span>
          </button>

          <button
            id="view-architecture-btn"
            onClick={() => onSelectView('architecture')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'architecture'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Architecture Lab</span>
          </button>
        </div>

        {/* Global Controls, Speed, Sound & Actions */}
        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2">
          {/* Preset Selector */}
          <select
            id="preset-selector"
            value={currentPreset}
            onChange={(e) => onSelectPreset(e.target.value as WorldPresetId)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer font-medium"
          >
            <option value="civilization">AI Kingdoms & Civilization</option>
            <option value="wasteland">Wasteland Survival & Mutants</option>
            <option value="galactic">Galactic Space Pioneers</option>
            <option value="microbial">Microbial Life Primordial</option>
            <option value="sandbox">Pure Genesis Sandbox</option>
          </select>

          {/* Procedural Audio Ambient Synth Toggle */}
          <button
            id="btn-audio-toggle"
            onClick={toggleAudio}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              !isAudioMuted
                ? 'bg-purple-950/60 border-purple-500/40 text-purple-400 hover:bg-purple-900/60'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title={isAudioMuted ? 'Unmute Generative Synth' : 'Mute Generative Synth'}
          >
            {!isAudioMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Primary Simulation Controls */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              id="btn-toggle-play"
              onClick={onToggleRun}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                isRunning
                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
              }`}
              title={isRunning ? 'Pause Simulation' : 'Run Simulation'}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <button
              id="btn-step-tick"
              onClick={onStep}
              disabled={isRunning}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40 text-xs transition-colors cursor-pointer"
              title="Step 1 Tick"
            >
              <Zap className="w-3.5 h-3.5" />
            </button>

            {/* Speed Multiplier Pill Selector */}
            <div className="flex items-center bg-slate-950 rounded px-1 py-0.5 border border-slate-800 text-[11px] font-mono">
              {[1, 5, 20].map((spd) => (
                <button
                  key={spd}
                  onClick={() => onSetSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    speed === spd
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <button
              id="btn-epoch-leap"
              onClick={onEpochLeap}
              className="p-1.5 rounded text-purple-400 hover:bg-purple-950 text-xs transition-colors cursor-pointer"
              title="Fast Forward 1 Epoch (+300 Ticks)"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>

            <button
              id="btn-reset-world"
              onClick={onReset}
              className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 text-xs transition-colors cursor-pointer"
              title="Reset Universe"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* AI Chronicler Button */}
          <button
            id="btn-ai-chronicler"
            onClick={onOpenChronicler}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-purple-900/30 transition-all cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Chronicler</span>
          </button>
        </div>

      </div>
    </header>
  );
};
