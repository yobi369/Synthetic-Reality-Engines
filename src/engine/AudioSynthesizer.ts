// Procedural Generative Web Audio Synthesizer for Synthetic Reality Engine
// 100% synthesized in-browser, dynamic reactive soundscapes without external audio assets.

export type AudioTheme = 'ethereal' | 'cyber' | 'organic' | 'wasteland' | 'cosmic';

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private droneGain: GainNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private isRunning: boolean = false;
  private theme: AudioTheme = 'ethereal';
  private rootFreq: number = 110; // A2

  // Musical scales (multipliers from root)
  private scales: Record<string, number[]> = {
    pentatonic: [1, 1.125, 1.25, 1.5, 1.667, 2, 2.25, 2.5, 3], // Major pentatonic
    dorian: [1, 1.122, 1.189, 1.335, 1.498, 1.682, 1.782, 2], // Cyber dorian
    aeolian: [1, 1.122, 1.189, 1.335, 1.498, 1.587, 1.782, 2], // Minor wasteland
    lydian: [1, 1.125, 1.26, 1.414, 1.5, 1.688, 1.888, 2] // Cosmic harmonic
  };

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.setupDrone();
      this.isRunning = true;
    } catch {
      console.warn('Web Audio API not supported or suspended in current environment.');
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.ctx) {
      this.init();
    }
  }

  private setupDrone() {
    if (!this.ctx || !this.masterGain) return;

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
    this.droneFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc2 = this.ctx.createOscillator();

    this.droneOsc1.type = 'sine';
    this.droneOsc2.type = 'triangle';

    this.droneOsc1.frequency.setValueAtTime(this.rootFreq, this.ctx.currentTime);
    this.droneOsc2.frequency.setValueAtTime(this.rootFreq * 1.498, this.ctx.currentTime); // 5th

    this.droneOsc1.connect(this.droneFilter);
    this.droneOsc2.connect(this.droneFilter);
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    this.droneOsc1.start();
    this.droneOsc2.start();
  }

  public updateWorldMood(params: {
    dayCycleProgress: number; // 0 to 1
    conflictLevel: number; // 0 to 1
    epoch: number;
    disasterActive: boolean;
  }) {
    if (!this.ctx || !this.droneFilter || !this.droneOsc1 || !this.droneOsc2 || !this.droneGain) return;
    if (this.isMuted) return;

    const t = this.ctx.currentTime;
    const baseFreq = 80 + (params.epoch % 5) * 15;
    
    // Pitch shift for day vs night
    const dayPitchFactor = 1 + Math.sin(params.dayCycleProgress * Math.PI * 2) * 0.15;
    const targetFreq1 = baseFreq * dayPitchFactor;
    const targetFreq2 = baseFreq * 1.5 * (params.conflictLevel > 0.3 ? 1.414 : 1.498); // detuned tritone in war

    this.droneOsc1.frequency.setTargetAtTime(targetFreq1, t, 0.5);
    this.droneOsc2.frequency.setTargetAtTime(targetFreq2, t, 0.5);

    // Filter frequency opens up with high activity or disasters
    const targetFilterCutoff = params.disasterActive ? 750 : 220 + params.conflictLevel * 400;
    this.droneFilter.frequency.setTargetAtTime(targetFilterCutoff, t, 0.8);
  }

  public playBirth() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A Major arpeggio
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.06);

      gain.gain.setValueAtTime(0, t + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.12, t + i * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.4);
    });
  }

  public playTrade() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1046.5, t); // C6
    osc.frequency.exponentialRampToValueAtTime(1318.5, t + 0.08); // E6

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playAttack() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.15);

    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  public playGodAction(type: string = 'cosmic') {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type === 'lightning_smite' ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(type === 'black_hole' ? 60 : 300, t);
    osc.frequency.exponentialRampToValueAtTime(type === 'black_hole' ? 30 : 900, t + 0.4);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, t);
    filter.Q.setValueAtTime(6.0, t);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.55);
  }

  public playLawPassed() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const chord = [330, 415.3, 493.88, 659.25]; // E Major chord
    chord.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.85);
    });
  }

  public playLawSound() {
    this.playLawPassed();
  }

  public playEpochAdvance() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.8);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 1.2);
  }

  public playEpochSound() {
    this.playEpochAdvance();
  }

  public playDisaster() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.7);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.85);
  }

  public playWeatherShift(type: string) {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'solar_flare') {
      // Harmonic radiation surge
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.4);
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    } else if (type === 'acid_rain') {
      // Hissing high-pass noise chirp
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.linearRampToValueAtTime(320, t + 0.5);
      gain.gain.setValueAtTime(0.02, t);
      gain.gain.linearRampToValueAtTime(0.14, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    } else if (type === 'cooling_period') {
      // Low sub-zero resonant howl
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.linearRampToValueAtTime(70, t + 0.9);
      gain.gain.setValueAtTime(0.02, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    } else if (type === 'ion_tempest') {
      // Crackling lightning discharge
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(540, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.3);
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    } else {
      // Calm atmospheric equilibrium
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, t);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.4);
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    }

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 1.3);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.3, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public setVolume(vol: number) {
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  public getAudioLevels(): number {
    if (!this.analyser || this.isMuted) return 0;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return sum / (data.length * 255);
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setTheme(theme: AudioTheme) {
    this.theme = theme;
  }
}

export const audioEngine = new ProceduralAudioEngine();
