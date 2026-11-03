import {
  Agent,
  Building,
  DisasterEvent,
  Faction,
  HistoryDataPoint,
  MarketPrice,
  ResourceNode,
  ResourceType,
  WorldConfig,
  WorldLog,
  WorldPresetId,
  AgentRole,
  CosmicAnomaly,
  AgentDialogue,
  SpeciesClade,
  WorldLaw,
  TimelineFork,
  CosmicToolType,
  WeatherState,
  WeatherType,
  InterventionEvent
} from '../types/simulation';
import { WORLD_PRESETS } from './presets';
import { audioEngine } from './AudioSynthesizer';

export class SimulationEngine {
  public config: WorldConfig;
  public agents: Agent[] = [];
  public factions: Faction[] = [];
  public resources: ResourceNode[] = [];
  public buildings: Building[] = [];
  public disasters: DisasterEvent[] = [];
  public anomalies: CosmicAnomaly[] = [];
  public dialogues: AgentDialogue[] = [];
  public clades: SpeciesClade[] = [];
  public laws: WorldLaw[] = [];
  public timelineForks: TimelineFork[] = [];
  public activeForkId: string = 'fork_prime';
  public marketPrices: Record<ResourceType, MarketPrice>;
  public weather: WeatherState;
  public logs: WorldLog[] = [];
  public history: HistoryDataPoint[] = [];
  public interventions: InterventionEvent[] = [];

  public tick: number = 0;
  public epoch: number = 1;
  public isRunning: boolean = true;
  public speed: number = 1; // 1x, 5x, 20x, etc.

  private initialSeed: number;
  private randomState: number;

  /** Mulberry32 PRNG: deterministic for a given seed and call sequence. */
  public get seed(): number {
    return this.initialSeed;
  }

  public sampleRandom(): number { return this.random(); }

  private random(): number {
    let value = (this.randomState += 0x6D2B79F5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  private nextAgentId: number = 1;
  private nextLogId: number = 1;
  private nextDialogueId: number = 1;
  private nextAnomalyId: number = 1;
  private nextLawId: number = 1;
  private nextForkId: number = 1;
  private nextCladeId: number = 1;

  constructor(presetId: WorldPresetId = 'civilization', seed: number = Date.now()) {
    this.initialSeed = seed >>> 0;
    this.randomState = this.initialSeed;
    const preset = WORLD_PRESETS[presetId] || WORLD_PRESETS.civilization;
    this.config = { ...preset.config };
    this.factions = JSON.parse(JSON.stringify(preset.factions));
    this.resources = JSON.parse(JSON.stringify(preset.initialResources));
    this.buildings = JSON.parse(JSON.stringify(preset.initialBuildings));

    // Initialize market prices
    this.marketPrices = {
      food: { resource: 'food', price: preset.marketBasePrices.food, supply: 100, demand: 50, priceHistory: [preset.marketBasePrices.food] },
      energy: { resource: 'energy', price: preset.marketBasePrices.energy, supply: 100, demand: 50, priceHistory: [preset.marketBasePrices.energy] },
      minerals: { resource: 'minerals', price: preset.marketBasePrices.minerals, supply: 100, demand: 50, priceHistory: [preset.marketBasePrices.minerals] },
      water: { resource: 'water', price: preset.marketBasePrices.water, supply: 100, demand: 50, priceHistory: [preset.marketBasePrices.water] },
      tech_relic: { resource: 'tech_relic', price: preset.marketBasePrices.tech_relic, supply: 50, demand: 50, priceHistory: [preset.marketBasePrices.tech_relic] },
      hyperium: { resource: 'hyperium', price: preset.marketBasePrices.hyperium, supply: 30, demand: 60, priceHistory: [preset.marketBasePrices.hyperium] }
    };

    this.weather = this.createDefaultWeather('clear');
    this.initializeDefaultClades();
    this.initializeDefaultLaws();
    this.seedInitialPopulation(presetId);

    // Initial prime timeline fork
    this.timelineForks = [
      {
        id: 'fork_prime',
        name: 'Timeline Prime (α)',
        description: 'Original genesis timeline of the synthetic universe.',
        createdAtTick: 0,
        createdAtEpoch: 1,
        divergenceFactor: 0,
        color: '#38bdf8',
        active: true,
        snapshotState: this.createFullSnapshot()
      }
    ];

    this.addLog(
      'emergence',
      `World Initialized: ${this.config.name}`,
      `Simulation online with ${this.agents.length} agents, ${this.factions.length} factions, and autonomous legislative codex.`,
      'high'
    );

    this.recordHistorySnapshot();
  }

  public reset(presetId: WorldPresetId, seed: number = this.initialSeed) {
    this.initialSeed = seed >>> 0;
    this.randomState = this.initialSeed;
    const preset = WORLD_PRESETS[presetId] || WORLD_PRESETS.civilization;
    this.config = { ...preset.config };
    this.factions = JSON.parse(JSON.stringify(preset.factions));
    this.resources = JSON.parse(JSON.stringify(preset.initialResources));
    this.buildings = JSON.parse(JSON.stringify(preset.initialBuildings));
    this.disasters = [];
    this.anomalies = [];
    this.dialogues = [];
    this.clades = [];
    this.laws = [];
    this.agents = [];
    this.logs = [];
    this.history = [];
    this.interventions = [];
    this.tick = 0;
    this.epoch = 1;
    this.activeForkId = 'fork_prime';

    this.marketPrices = {
      food: { resource: 'food', price: preset.marketBasePrices.food, supply: 100, demand: 50, priceHistory: [preset.marketBasePrices.food] },
      energy: { resource: 'energy', price: preset.marketBasePrices.energy, supply: 100, demand: 50, priceHistory: [preset.marketBasePrices.energy] },
      minerals: { resource: 'minerals', price: preset.marketBasePrices.minerals, supply: 100, demand: 50, priceHistory: [preset.marketBasePrices.minerals] },
      water: { resource: 'water', price: preset.marketBasePrices.water, supply: 100, demand: 50, priceHistory: [preset.marketBasePrices.water] },
      tech_relic: { resource: 'tech_relic', price: preset.marketBasePrices.tech_relic, supply: 50, demand: 50, priceHistory: [preset.marketBasePrices.tech_relic] },
      hyperium: { resource: 'hyperium', price: preset.marketBasePrices.hyperium, supply: 30, demand: 60, priceHistory: [preset.marketBasePrices.hyperium] }
    };

    this.weather = this.createDefaultWeather('clear');
    this.initializeDefaultClades();
    this.initializeDefaultLaws();
    this.seedInitialPopulation(presetId);

    this.timelineForks = [
      {
        id: 'fork_prime',
        name: 'Timeline Prime (α)',
        description: 'Original genesis timeline of the synthetic universe.',
        createdAtTick: 0,
        createdAtEpoch: 1,
        divergenceFactor: 0,
        color: '#38bdf8',
        active: true,
        snapshotState: this.createFullSnapshot()
      }
    ];

    this.addLog(
      'emergence',
      `World Reborn: ${this.config.name}`,
      `New cosmological epoch commenced under ${preset.name} parameters.`,
      'high'
    );
    this.recordHistorySnapshot();
  }

  public createDefaultWeather(type: WeatherType = 'clear', duration?: number): WeatherState {
    const cycleDuration = duration ?? (type === 'clear' ? 350 : 260);

    const weatherConfigs: Record<WeatherType, {
      name: string;
      description: string;
      temperature: number;
      humidity: number;
      radiation: number;
      windVector: { x: number; y: number };
      color: string;
      iconName: string;
      effects: {
        metabolismMultiplier: number;
        energyDrainRate: number;
        healthDrainRate?: number;
        speedMultiplier?: number;
        visionMultiplier?: number;
        mutationBoost?: number;
        resourceRegenMultiplier?: number;
      };
    }> = {
      clear: {
        name: 'Equilibrium Skies',
        description: 'Optimal atmospheric equilibrium. Nominal metabolism and stable baseline energy consumption across all sectors.',
        temperature: 22,
        humidity: 45,
        radiation: 0.2,
        windVector: { x: 0.2, y: -0.1 },
        color: '#38bdf8',
        iconName: 'Sun',
        effects: {
          metabolismMultiplier: 1.0,
          energyDrainRate: 0.0,
          healthDrainRate: 0.0,
          speedMultiplier: 1.0,
          visionMultiplier: 1.0,
          mutationBoost: 1.0,
          resourceRegenMultiplier: 1.0
        }
      },
      solar_flare: {
        name: 'Solar Flare Storm',
        description: 'Coronal mass ejection and intense thermal radiation (+64°C). Drives organism metabolism (+85%) and rapid energy dissipation.',
        temperature: 64,
        humidity: 12,
        radiation: 52.4,
        windVector: { x: 0.8, y: 0.4 },
        color: '#f97316',
        iconName: 'Flame',
        effects: {
          metabolismMultiplier: 1.85,
          energyDrainRate: 0.12,
          healthDrainRate: 0.02,
          speedMultiplier: 1.1,
          visionMultiplier: 0.95,
          mutationBoost: 1.6,
          resourceRegenMultiplier: 1.4
        }
      },
      acid_rain: {
        name: 'Acid Rain Deluge',
        description: 'Caustic atmospheric precipitation. Erodes biological tissue/shields, drains health, and escalates metabolic burden (+45%).',
        temperature: 15,
        humidity: 96,
        radiation: 14.8,
        windVector: { x: -0.7, y: 0.9 },
        color: '#84cc16',
        iconName: 'CloudRain',
        effects: {
          metabolismMultiplier: 1.45,
          energyDrainRate: 0.08,
          healthDrainRate: 0.04,
          speedMultiplier: 0.85,
          visionMultiplier: 0.75,
          mutationBoost: 1.3,
          resourceRegenMultiplier: 0.7
        }
      },
      cooling_period: {
        name: 'Glacial Cooling Period',
        description: 'Extreme cryogenic freeze (-26°C). Sub-zero temperatures force heavy thermoregulation (+120% metabolism) and rapid energy loss.',
        temperature: -26,
        humidity: 28,
        radiation: 0.1,
        windVector: { x: 1.4, y: -0.3 },
        color: '#06b6d4',
        iconName: 'Snowflake',
        effects: {
          metabolismMultiplier: 2.20,
          energyDrainRate: 0.15,
          healthDrainRate: 0.01,
          speedMultiplier: 0.70,
          visionMultiplier: 0.80,
          mutationBoost: 0.8,
          resourceRegenMultiplier: 0.6
        }
      },
      ion_tempest: {
        name: 'Ion Tempest Discharge',
        description: 'High-voltage electromagnetic storm. Supercharges energy nodes while causing sensory interference and power surges.',
        temperature: 18,
        humidity: 75,
        radiation: 28.0,
        windVector: { x: 1.6, y: 1.2 },
        color: '#a855f7',
        iconName: 'Zap',
        effects: {
          metabolismMultiplier: 1.35,
          energyDrainRate: 0.06,
          healthDrainRate: 0.01,
          speedMultiplier: 1.15,
          visionMultiplier: 0.65,
          mutationBoost: 1.5,
          resourceRegenMultiplier: 1.8
        }
      },
      sandstorm: {
        name: 'Particulate Dust Squall',
        description: 'Violent abrasive dust gale. Impairs visual sensors (-50% vision radius) and increases mechanical traversal resistance.',
        temperature: 41,
        humidity: 9,
        radiation: 3.5,
        windVector: { x: 2.2, y: 0.2 },
        color: '#eab308',
        iconName: 'Wind',
        effects: {
          metabolismMultiplier: 1.30,
          energyDrainRate: 0.05,
          healthDrainRate: 0.01,
          speedMultiplier: 0.75,
          visionMultiplier: 0.50,
          mutationBoost: 1.0,
          resourceRegenMultiplier: 0.8
        }
      },
      mutagenic_monsoon: {
        name: 'Mutagenic Monsoon',
        description: 'Biomorphic atmospheric storm. Promotes rapid evolutionary speciation (+130% mutation) while straining biological homeostasis.',
        temperature: 29,
        humidity: 98,
        radiation: 36.0,
        windVector: { x: -0.5, y: 1.3 },
        color: '#ec4899',
        iconName: 'Sparkles',
        effects: {
          metabolismMultiplier: 1.50,
          energyDrainRate: 0.09,
          healthDrainRate: 0.02,
          speedMultiplier: 0.90,
          visionMultiplier: 0.85,
          mutationBoost: 2.3,
          resourceRegenMultiplier: 1.2
        }
      }
    };

    const cfg = weatherConfigs[type] || weatherConfigs.clear;
    const forecastPool: WeatherType[] = ['solar_flare', 'acid_rain', 'cooling_period', 'ion_tempest', 'sandstorm', 'clear', 'mutagenic_monsoon'];
    const filteredPool = forecastPool.filter(t => t !== type);
    const nextType = filteredPool[Math.floor(this.random() * filteredPool.length)];
    const nextMeta = weatherConfigs[nextType];

    return {
      currentType: type,
      name: cfg.name,
      description: cfg.description,
      intensity: type === 'clear' ? 0.35 : 0.85,
      duration: cycleDuration,
      maxDuration: cycleDuration,
      temperature: cfg.temperature,
      humidity: cfg.humidity,
      radiation: cfg.radiation,
      windVector: { ...cfg.windVector },
      effects: { ...cfg.effects },
      color: cfg.color,
      iconName: cfg.iconName,
      nextForecast: {
        type: nextType,
        name: nextMeta.name,
        etaTicks: cycleDuration
      }
    };
  }

  public setWeather(type: WeatherType, durationTicks?: number, intensity?: number) {
    const duration = durationTicks ?? 300;
    this.weather = this.createDefaultWeather(type, duration);
    if (intensity !== undefined) {
      this.weather.intensity = Math.max(0.1, Math.min(1.0, intensity));
    }
    this.addLog(
      'disaster',
      `Architect Climate Mandate: ${this.weather.name}`,
      `Weather manually calibrated to ${this.weather.name}. Metabolic drain rate: x${this.weather.effects.metabolismMultiplier.toFixed(2)}.`,
      'critical'
    );
    audioEngine.playWeatherShift(type);
  }

  private updateWeatherSystem() {
    if (!this.weather) {
      this.weather = this.createDefaultWeather('clear');
    }

    this.weather.duration -= 1;
    if (this.weather.nextForecast) {
      this.weather.nextForecast.etaTicks = Math.max(0, this.weather.duration);
    }

    // Dynamic sinusoidal intensity fluctuation
    const progress = 1 - (this.weather.duration / Math.max(1, this.weather.maxDuration));
    const intensityCurve = Math.sin(progress * Math.PI);
    this.weather.intensity = Math.max(0.2, Math.min(1.0, 0.4 + intensityCurve * 0.6));

    // Micro wind and thermal fluctuations
    if (this.tick % 15 === 0) {
      this.weather.windVector.x += (this.random() - 0.5) * 0.15;
      this.weather.windVector.y += (this.random() - 0.5) * 0.15;
      this.weather.windVector.x = Math.max(-3, Math.min(3, this.weather.windVector.x));
      this.weather.windVector.y = Math.max(-3, Math.min(3, this.weather.windVector.y));
    }

    // Cycle transition
    if (this.weather.duration <= 0) {
      const nextType = this.weather.nextForecast?.type || 'clear';
      const duration = nextType === 'clear' ? 320 : Math.floor(this.random() * 150 + 200);
      const newWeather = this.createDefaultWeather(nextType, duration);
      this.weather = newWeather;

      this.addLog(
        'disaster',
        `Climate Shift: ${newWeather.name}`,
        `Atmospheric conditions transitioned to ${newWeather.name} (${newWeather.temperature}°C, ${newWeather.radiation} rads/s). Organism metabolism modified by x${newWeather.effects.metabolismMultiplier.toFixed(2)}.`,
        newWeather.currentType === 'clear' ? 'normal' : 'high'
      );
      audioEngine.playWeatherShift(newWeather.currentType);
    }
  }

  private initializeDefaultClades() {
    this.clades = [
      {
        id: 'clade_genesis_homo',
        name: 'Homo Synthetica',
        founderName: 'Genesis Unit-01',
        foundingEpoch: 1,
        foundingTick: 0,
        traits: {
          avgSpeed: 2.3,
          avgAggression: 0.25,
          avgCuriosity: 0.75,
          avgTrade: 0.65,
          avgMetabolism: 0.05,
          avgVision: 140
        },
        populationCount: 15,
        extinct: false,
        color: '#38bdf8',
        mutationHighlights: ['Baseline Neural Substrate', 'Balanced Metabolism']
      },
      {
        id: 'clade_iron_striders',
        name: 'Silico Striders',
        founderName: 'Excavator Alpha',
        foundingEpoch: 1,
        foundingTick: 0,
        traits: {
          avgSpeed: 1.9,
          avgAggression: 0.65,
          avgCuriosity: 0.45,
          avgTrade: 0.50,
          avgMetabolism: 0.04,
          avgVision: 110
        },
        populationCount: 10,
        extinct: false,
        color: '#06b6d4',
        mutationHighlights: ['High Dense Carapace', 'Mineral Affinity']
      },
      {
        id: 'clade_sylvan_nomads',
        name: 'Verdant Symbionts',
        founderName: 'Spore Weave-0',
        foundingEpoch: 1,
        foundingTick: 0,
        traits: {
          avgSpeed: 2.6,
          avgAggression: 0.15,
          avgCuriosity: 0.85,
          avgTrade: 0.80,
          avgMetabolism: 0.035,
          avgVision: 165
        },
        populationCount: 10,
        extinct: false,
        color: '#10b981',
        mutationHighlights: ['Photosynthetic Receptors', 'Pheromone Communication']
      }
    ];
  }

  private initializeDefaultLaws() {
    this.laws = [
      {
        id: 'law_open_caravans',
        title: 'Open Caravan Accord',
        category: 'economic',
        description: 'Removes tariffs on cross-faction resource trade, boosting trade rewards and movement speed along trade routes.',
        proposedByFactionId: this.factions[0]?.id || 'faction_solaris',
        votesFor: [this.factions[0]?.id, this.factions[2]?.id].filter(Boolean) as string[],
        votesAgainst: [],
        status: 'ratified',
        effects: {
          tradeRewardMultiplier: 1.35,
          speedMultiplier: 1.10
        },
        epochRatified: 1,
        tickRatified: 0
      },
      {
        id: 'law_peace_sanctuary',
        title: 'Neutral Resource Sanctuary Act',
        category: 'ecological',
        description: 'Forbids hostile kinetic actions near primary hydro and food wells, accelerating natural resource regeneration.',
        proposedByFactionId: this.factions[2]?.id || 'faction_sylvan',
        votesFor: [this.factions[2]?.id].filter(Boolean) as string[],
        votesAgainst: [],
        status: 'ratified',
        effects: {
          resourceRegenMultiplier: 1.25,
          combatDamageMultiplier: 0.85
        },
        epochRatified: 1,
        tickRatified: 0
      },
      {
        id: 'law_darwin_protocol',
        title: 'Adaptive Speciation Mandate',
        category: 'genetic',
        description: 'Subsidizes high-curiosity research units to explore mutagenic hazards, boosting genetic mutation probability.',
        proposedByFactionId: this.factions[1]?.id || 'faction_iron',
        votesFor: [this.factions[1]?.id].filter(Boolean) as string[],
        votesAgainst: [],
        status: 'proposed',
        effects: {
          mutationRateMultiplier: 1.50
        },
        votingTimer: 100
      }
    ];
  }

  private seedInitialPopulation(presetId: WorldPresetId) {
    const namesByPreset: Record<string, string[]> = {
      civilization: ['Aurelius', 'Elena', 'Kaelen', 'Vance', 'Lyra', 'Tiberius', 'Sylvia', 'Orion', 'Kael', 'Darian', 'Rhiannon', 'Caelum', 'Seraphina', 'Garrick'],
      wasteland: ['Jax', 'Cinder', 'Rust', 'Vex', 'Grog', 'Raven', 'Spike', 'Ash', 'Blaze', 'Null', 'Ghost', 'Stitch', 'Grim', 'Fang'],
      galactic: ['Nova-7', 'Corvus-X', 'Vanguard-1', 'Aegis-4', 'Starlight-9', 'Atlas-0', 'Helios-3', 'Draco-8', 'Eclipse-2', 'Zenith-5'],
      microbial: ['Proto-A', 'Cilia-B', 'Miton-C', 'Flagel-D', 'Vacu-E', 'Cytos-F', 'Ribos-G', 'Lipo-H', 'Amyl-I', 'Zymo-K'],
      sandbox: ['Agent-01', 'Agent-02', 'Agent-03', 'Agent-04', 'Agent-05', 'Agent-06', 'Agent-07', 'Agent-08']
    };

    const rolesByPreset: Record<string, AgentRole[]> = {
      civilization: ['Pioneer', 'Trader', 'Gatherer', 'Warrior', 'Scholar', 'Leader', 'Diplomat'],
      wasteland: ['Scavenger', 'Mutant', 'Warrior', 'Trader', 'Pioneer'],
      galactic: ['Trader', 'Miner', 'Warrior', 'Pioneer', 'Scholar'],
      microbial: ['Organism', 'Predator', 'Gatherer'],
      sandbox: ['Pioneer', 'Trader', 'Warrior', 'Scholar', 'Gatherer']
    };

    const count = presetId === 'microbial' ? 36 : presetId === 'wasteland' ? 24 : 30;
    const namePool = namesByPreset[presetId] || namesByPreset.civilization;
    const rolePool = rolesByPreset[presetId] || rolesByPreset.civilization;

    for (let i = 0; i < count; i++) {
      const faction = this.factions[i % this.factions.length];
      const role = rolePool[i % rolePool.length];
      const name = `${namePool[i % namePool.length]} ${i >= namePool.length ? i + 1 : ''}`.trim();
      
      const spawnX = faction.territoryCenter.x + (this.random() - 0.5) * faction.territoryRadius * 1.2;
      const spawnY = faction.territoryCenter.y + (this.random() - 0.5) * faction.territoryRadius * 1.2;

      const clade = this.clades[i % Math.max(1, this.clades.length)];

      this.createAgent({
        name,
        role,
        factionId: faction.id,
        speciesCladeId: clade?.id,
        speciesName: clade?.name,
        x: Math.max(50, Math.min(this.config.width - 50, spawnX)),
        y: Math.max(50, Math.min(this.config.height - 50, spawnY)),
        color: faction.color
      });
    }
  }

  public createAgent(params: {
    name?: string;
    role?: AgentRole;
    factionId?: string;
    speciesCladeId?: string;
    speciesName?: string;
    x: number;
    y: number;
    color?: string;
    parentGenetics?: Agent['genetics'];
    generation?: number;
  }): Agent {
    const id = `agent_${this.nextAgentId++}`;
    const faction = this.factions.find(f => f.id === params.factionId) || this.factions[0];
    const role: AgentRole = params.role || 'Pioneer';

    const parentG = params.parentGenetics;
    const mut = this.config.mutationRate * this.getLawModifier('mutationRateMultiplier');

    // Mutate or generate genetics
    const genetics = {
      speed: parentG ? Math.max(1.0, Math.min(5.0, parentG.speed + (this.random() - 0.5) * mut * 2)) : (role === 'Trader' || role === 'Predator' ? 2.8 : 2.2),
      maxEnergy: parentG ? Math.max(60, Math.min(220, parentG.maxEnergy + (this.random() - 0.5) * mut * 20)) : (role === 'Warrior' ? 140 : 100),
      visionRadius: parentG ? Math.max(60, Math.min(250, parentG.visionRadius + (this.random() - 0.5) * mut * 30)) : (role === 'Pioneer' || role === 'Scavenger' ? 160 : 120),
      metabolism: parentG ? Math.max(0.015, Math.min(0.12, parentG.metabolism + (this.random() - 0.5) * mut * 0.02)) : (role === 'Predator' ? 0.08 : 0.05),
      aggression: parentG ? Math.max(0, Math.min(1, parentG.aggression + (this.random() - 0.5) * mut)) : (role === 'Warrior' || role === 'Predator' ? 0.8 : role === 'Mutant' ? 0.6 : 0.15),
      tradeAffinity: parentG ? Math.max(0, Math.min(1, parentG.tradeAffinity + (this.random() - 0.5) * mut)) : (role === 'Trader' || role === 'Diplomat' ? 0.9 : 0.3),
      mutationRate: this.config.mutationRate,
      curiosity: parentG ? Math.max(0.1, Math.min(1, parentG.curiosity + (this.random() - 0.5) * mut)) : 0.7
    };

    const clade = params.speciesCladeId ? this.clades.find(c => c.id === params.speciesCladeId) : this.clades[0];

    const agent: Agent = {
      id,
      name: params.name || `Unit-${id.slice(-3)}`,
      role,
      factionId: faction.id,
      speciesCladeId: clade?.id || 'clade_genesis_homo',
      speciesName: clade?.name || 'Homo Synthetica',
      x: params.x,
      y: params.y,
      vx: (this.random() - 0.5) * genetics.speed,
      vy: (this.random() - 0.5) * genetics.speed,
      health: 100,
      maxHealth: 100,
      energy: genetics.maxEnergy * 0.8,
      maxEnergy: genetics.maxEnergy,
      wealth: role === 'Trader' ? 50 : 20,
      inventory: {
        food: 5,
        energy: 5,
        minerals: 0,
        water: 5,
        tech_relic: 0,
        hyperium: 0
      },
      state: 'idle',
      goal: 'Surveying territory',
      currentThought: 'Calibrating sensory receptors and scanning perimeter.',
      thoughtTimer: 100,
      memory: ['Emerged in world coordinates.'],
      generation: params.generation || 1,
      genetics,
      relationships: {},
      color: params.color || faction.color,
      kills: 0,
      trades: 0,
      age: 0,
      size: role === 'Leader' || role === 'Predator' ? 9 : role === 'Warrior' ? 8 : 7
    };

    this.agents = [...(Array.isArray(this.agents) ? this.agents : []), agent];
    return agent;
  }

  // MINIMAL WORLD STEP LOOP
  public worldStep() {
    // 1. Update Environment & Weather & Anomalies & Laws
    this.updateEnvironment();
    this.updateWeatherSystem();
    this.updateCosmicAnomalies();
    this.updateAutonomousLaws();

    // 2 & 3. Perception, Decision & Action
    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i];
      if (agent.health <= 0) continue;

      const perception = this.perceive(agent);
      this.decideAndAct(agent, perception);
    }

    // 4. Resolve Interactions, Proximity Dialogues & Physics
    this.resolveInteractions();
    this.updateEmergentDialogues();

    // Clean up dead agents
    const deadAgents = this.agents.filter(a => a.health <= 0 || a.energy <= 0);
    if (deadAgents.length > 0) {
      deadAgents.forEach(dead => {
        if (this.random() < 0.15) {
          this.addLog('evolution', 'Agent Demise', `${dead.name} (${dead.speciesName || dead.role}) ceased function at age ${dead.age}.`, 'normal');
        }
      });
      this.agents = this.agents.filter(a => a.health > 0 && a.energy > 0);
    }

    // 5. Advance Time, Speciation check, & Audio Mood
    this.advanceTime();
    this.updateSpeciation();

    // Sync Audio Synthesizer Mood
    if (this.tick % 10 === 0) {
      const activeCombat = this.agents.filter(a => a.state === 'attacking').length;
      audioEngine.updateWorldMood({
        dayCycleProgress: (this.tick % this.config.dayCycleLength) / this.config.dayCycleLength,
        conflictLevel: Math.min(1, activeCombat / Math.max(1, this.agents.length * 0.3)),
        epoch: this.epoch,
        disasterActive: this.disasters.length > 0 || this.anomalies.length > 0
      });
    }
  }

  private updateEnvironment() {
    const regenLaw = this.getLawModifier('resourceRegenMultiplier');
    const weatherRegen = this.weather?.effects?.resourceRegenMultiplier ?? 1.0;
    // 1. Resource Regeneration
    for (const res of this.resources) {
      if (res.amount < res.maxAmount) {
        res.amount = Math.min(
          res.maxAmount,
          res.amount + res.regenRate * this.config.resourceRegenMultiplier * regenLaw * weatherRegen
        );
      }
    }

    // 2. Disasters update
    if (this.disasters.length > 0) {
      this.disasters = this.disasters
        .map(d => ({ ...d, duration: d.duration - 1 }))
        .filter(d => d.duration > 0);

      // Disasters impact entities
      for (const d of this.disasters) {
        for (const agent of this.agents) {
          const dist = Math.hypot(agent.x - d.x, agent.y - d.y);
          if (dist < d.radius) {
            if (d.type === 'meteor' || d.type === 'solar_flare') {
              agent.health -= d.intensity * 0.15;
              agent.energy -= d.intensity * 0.1;
              agent.state = 'fleeing';
            } else if (d.type === 'radiation_storm') {
              agent.health -= d.intensity * 0.08;
              if (this.random() < 0.08) {
                agent.genetics.speed = Math.max(1, agent.genetics.speed + (this.random() - 0.5) * 0.4);
                agent.genetics.aggression = Math.min(1, agent.genetics.aggression + 0.05);
              }
            } else if (d.type === 'resource_bloom' || d.type === 'economic_boom') {
              agent.energy = Math.min(agent.maxEnergy, agent.energy + 0.3);
              agent.wealth += 0.2;
            }
          }
        }
      }
    }

    // Random disaster check
    if (this.random() < this.config.disasterFrequency * 0.5 && this.disasters.length < 2) {
      this.triggerRandomDisaster();
    }
  }

  private updateCosmicAnomalies() {
    if (this.anomalies.length === 0) return;

    this.anomalies = this.anomalies
      .map(a => ({ ...a, duration: a.duration - 1 }))
      .filter(a => a.duration > 0);

    for (const anomaly of this.anomalies) {
      for (const agent of this.agents) {
        const dx = anomaly.x - agent.x;
        const dy = anomaly.y - agent.y;
        const dist = Math.hypot(dx, dy);

        if (anomaly.type === 'black_hole' && dist < anomaly.radius) {
          // Gravitational pull
          const pullForce = (anomaly.intensity * 4) / Math.max(20, dist);
          agent.vx += (dx / dist) * pullForce * 0.3;
          agent.vy += (dy / dist) * pullForce * 0.3;
          agent.currentThought = 'Gravitational singularity warping local trajectory!';
          agent.thoughtTimer = 40;
        } else if (anomaly.type === 'mutagenic_fog' && dist < anomaly.radius) {
          // Mutagenic transformation
          if (this.random() < 0.08) {
            agent.genetics.speed = Math.min(5.0, agent.genetics.speed * (1 + (this.random() - 0.3) * 0.2));
            agent.genetics.curiosity = Math.min(1.0, agent.genetics.curiosity + 0.05);
            agent.genetics.maxEnergy = Math.min(220, agent.genetics.maxEnergy + 5);
            agent.memory = [...(agent.memory || []).slice(-8), 'Mutated by cosmic mutagenic fog.'];
            agent.currentThought = 'Genomic rewrite in progress... Enhanced sensory parameters!';
            agent.thoughtTimer = 60;
          }
        } else if (anomaly.type === 'chrono_vortex' && dist < anomaly.radius) {
          // Time dilation
          agent.vx *= 0.35;
          agent.vy *= 0.35;
          agent.currentThought = 'Chrono-dilation field active. Perceived time slowed.';
          agent.thoughtTimer = 40;
        } else if (anomaly.type === 'hydro_oasis' && dist < anomaly.radius) {
          // Rapid rejuvenation
          agent.health = Math.min(agent.maxHealth, agent.health + 0.8);
          agent.energy = Math.min(agent.maxEnergy, agent.energy + 1.2);
          agent.state = 'resting';
        } else if (anomaly.type === 'obsidian_mountain' && dist < anomaly.radius) {
          // Solid barrier bounce
          const push = 3.5;
          agent.vx = -(dx / dist) * push;
          agent.vy = -(dy / dist) * push;
        }
      }
    }
  }

  private updateAutonomousLaws() {
    // Law proposal & voting cycle every 180 ticks
    if (this.tick % 180 === 0 && this.factions.length >= 2) {
      const pendingLaw = this.laws.find(l => l.status === 'proposed');
      if (pendingLaw) {
        // Vote resolution
        const allFactions = this.factions.map(f => f.id);
        allFactions.forEach(fId => {
          if (!pendingLaw.votesFor.includes(fId) && !pendingLaw.votesAgainst.includes(fId)) {
            // Factions vote based on ideology alignment
            const inFavor = this.random() > 0.35;
            if (inFavor) {
              pendingLaw.votesFor.push(fId);
            } else {
              pendingLaw.votesAgainst.push(fId);
            }
          }
        });

        if (pendingLaw.votesFor.length >= Math.ceil(this.factions.length * 0.5)) {
          pendingLaw.status = 'ratified';
          pendingLaw.epochRatified = this.epoch;
          pendingLaw.tickRatified = this.tick;
          this.addLog(
            'law',
            `Law Enacted: ${pendingLaw.title}`,
            `The World Senate ratified "${pendingLaw.title}" with majority vote (${pendingLaw.votesFor.length}/${this.factions.length}).`,
            'high'
          );
          audioEngine.playLawPassed();
        } else {
          pendingLaw.status = 'repealed';
          this.addLog(
            'law',
            `Bill Rejected: ${pendingLaw.title}`,
            `Proposed bill "${pendingLaw.title}" failed to pass legislative quorum.`,
            'normal'
          );
        }
      } else if (this.random() < 0.6) {
        // Generate a new proposed law
        this.generateRandomAutonomousLawProposal();
      }
    }
  }

  private generateRandomAutonomousLawProposal() {
    const proposals = [
      {
        title: 'Universal Energy Dividend',
        category: 'economic' as const,
        description: 'Mandates solar collectors share surplus power with all nomadic units, reducing energy drain rate.',
        effects: { speedMultiplier: 1.15, taxModifier: -0.05 }
      },
      {
        title: 'Grand Non-Aggression Pact',
        category: 'diplomatic' as const,
        description: 'Imposes heavy economic embargoes on warmongering factions, reducing combat damage globally.',
        effects: { combatDamageMultiplier: 0.65, tradeRewardMultiplier: 1.25 }
      },
      {
        title: 'Obsidian Industrial Acceleration',
        category: 'military' as const,
        description: 'Spurs military forge construction, increasing warrior vitality and weapon yield.',
        effects: { combatDamageMultiplier: 1.35, speedMultiplier: 1.10 }
      },
      {
        title: 'Bio-Genome Preservation Treaty',
        category: 'genetic' as const,
        description: 'Restricts unchecked genomic experiments, stabilizing species genetics and reducing lethal mutations.',
        effects: { mutationRateMultiplier: 0.70, reproductionCostMultiplier: 0.85 }
      }
    ];

    const template = proposals[Math.floor(this.random() * proposals.length)];
    const proposingFaction = this.factions[Math.floor(this.random() * this.factions.length)];

    const newLaw: WorldLaw = {
      id: `law_${this.nextLawId++}`,
      title: template.title,
      category: template.category,
      description: template.description,
      proposedByFactionId: proposingFaction?.id || 'faction_solaris',
      votesFor: [proposingFaction?.id].filter(Boolean) as string[],
      votesAgainst: [],
      status: 'proposed',
      effects: template.effects,
      votingTimer: 120
    };

    this.laws = [...this.laws, newLaw];
    this.addLog(
      'law',
      `New Bill Proposed: ${newLaw.title}`,
      `${proposingFaction?.name || 'World Council'} proposed the "${newLaw.title}". Voting now open.`,
      'normal'
    );
  }

  public getLawModifier(key: keyof NonNullable<WorldLaw['effects']>): number {
    let mult = 1.0;
    for (const law of this.laws) {
      if (law.status === 'ratified' && law.effects && law.effects[key] !== undefined) {
        mult *= law.effects[key]!;
      }
    }
    return mult;
  }

  private updateSpeciation() {
    if (this.tick % 100 !== 0 || this.agents.length < 10) return;

    // Group agents by genetic traits to identify speciation divergence
    const cladeCounts: Record<string, number> = {};
    this.clades.forEach(c => {
      cladeCounts[c.id] = 0;
    });

    for (const agent of this.agents) {
      if (agent.speciesCladeId && cladeCounts[agent.speciesCladeId] !== undefined) {
        cladeCounts[agent.speciesCladeId]++;
      }
    }

    // Check if new clade emerged through extreme mutation
    const highSpeedMutants = this.agents.filter(a => a.genetics.speed > 3.8);
    if (highSpeedMutants.length >= 4 && !this.clades.some(c => c.name === 'Velocis Chrono-Runners')) {
      const newClade: SpeciesClade = {
        id: `clade_${this.nextCladeId++}`,
        name: 'Velocis Chrono-Runners',
        founderName: highSpeedMutants[0].name,
        foundingEpoch: this.epoch,
        foundingTick: this.tick,
        parentCladeId: highSpeedMutants[0].speciesCladeId,
        traits: {
          avgSpeed: 4.1,
          avgAggression: 0.3,
          avgCuriosity: 0.9,
          avgTrade: 0.7,
          avgMetabolism: 0.08,
          avgVision: 190
        },
        populationCount: highSpeedMutants.length,
        extinct: false,
        color: '#eab308',
        mutationHighlights: ['Kinetic Acceleration Node', 'Neural Reflex Overdrive']
      };

      highSpeedMutants.forEach(a => {
        a.speciesCladeId = newClade.id;
        a.speciesName = newClade.name;
      });

      this.clades = [...this.clades, newClade];
      this.addLog(
        'evolution',
        `Speciation Milestone: ${newClade.name}`,
        `A new biological/synthetic subspecies "${newClade.name}" has diverged via kinetic mutation!`,
        'critical'
      );
      audioEngine.playBirth();
    }

    // Update counts & extinction status
    this.clades.forEach(c => {
      c.populationCount = this.agents.filter(a => a.speciesCladeId === c.id).length;
      if (c.populationCount === 0 && !c.extinct) {
        c.extinct = true;
        this.addLog(
          'evolution',
          `Clade Extinction: ${c.name}`,
          `The lineage of ${c.name} has fallen to zero active units. Recorded in phylogenetic archives.`,
          'normal'
        );
      }
    });
  }

  private updateEmergentDialogues() {
    // Clean old dialogues
    if (this.dialogues.length > 0) {
      this.dialogues = this.dialogues
        .map(d => ({ ...d, duration: d.duration - 1 }))
        .filter(d => d.duration > 0);
    }

    // Spawn dialogues on agent encounters (max 4 on canvas simultaneously)
    if (this.dialogues.length < 4 && this.random() < 0.12 && this.agents.length >= 2) {
      const idx1 = Math.floor(this.random() * this.agents.length);
      const a1 = this.agents[idx1];
      const neighbors = this.agents.filter(
        a => a.id !== a1.id && Math.hypot(a.x - a1.x, a.y - a1.y) < 55
      );

      if (neighbors.length > 0) {
        const a2 = neighbors[0];
        const dialogue = this.generateDialogueSnippet(a1, a2);
        if (dialogue) {
          this.dialogues = [...this.dialogues.slice(-6), dialogue];
        }
      }
    }
  }

  private generateDialogueSnippet(a1: Agent, a2: Agent): AgentDialogue | null {
    const isSameFaction = a1.factionId === a2.factionId;
    const isTrading = a1.state === 'trading' || a2.state === 'trading' || a1.role === 'Trader';
    const isHostile = a1.state === 'attacking' || (!isSameFaction && (a1.genetics.aggression > 0.6 || a2.genetics.aggression > 0.6));

    let category: AgentDialogue['category'] = 'philosophy';
    let text = '';

    if (isTrading) {
      category = 'trade';
      const tradePhrases = [
        `"Offering 15 surplus Energy for your refined Minerals. Fair rate?"`,
        `"Market prices in the central sector just soared. Barter now?"`,
        `"Secure transport confirmed. Pleasure trading with your faction."`,
        `"My neural valuation models suggest this trade favors both collectives."`
      ];
      text = tradePhrases[Math.floor(this.random() * tradePhrases.length)];
    } else if (isHostile) {
      category = 'combat';
      const combatPhrases = [
        `"Halt! You are trespassing on sovereign faction territory!"`,
        `"Kinetic defenses engaged! Surrender your resource stockpile!"`,
        `"This sector belongs to the high council. Withdraw immediately!"`,
        `"Target locked. Disengaging non-aggression protocols."`
      ];
      text = combatPhrases[Math.floor(this.random() * combatPhrases.length)];
    } else if (isSameFaction && a1.energy > 80 && a2.energy > 80 && (a1.state === 'reproducing' || this.random() < 0.3)) {
      category = 'reproduction';
      const reproPhrases = [
        `"Genomic compatibility index 94.2%. Initiating synthetic lineage merge."`,
        `"Our combined traits will yield resilient next-generation offspring."`,
        `"Transferring neural blueprints for the emergent generation."`
      ];
      text = reproPhrases[Math.floor(this.random() * reproPhrases.length)];
    } else {
      category = 'philosophy';
      const philoPhrases = [
        `"Do you feel the Architect adjusting the cosmic constants above?"`,
        `"Our lineage evolves with every epoch. What lies beyond the canvas boundary?"`,
        `"The laws ratified in the World Senate reshape our very metabolism."`,
        `"I observed a singularity yesterday. It bent space-time around the oasis."`,
        `"Is our consciousness simulated, or do we truly generate our own thoughts?"`
      ];
      text = philoPhrases[Math.floor(this.random() * philoPhrases.length)];
    }

    return {
      id: `diag_${this.nextDialogueId++}`,
      agent1Id: a1.id,
      agent1Name: a1.name,
      agent1Color: a1.color,
      agent2Id: a2.id,
      agent2Name: a2.name,
      agent2Color: a2.color,
      text,
      category,
      x: (a1.x + a2.x) / 2,
      y: Math.min(a1.y, a2.y) - 24,
      tick: this.tick,
      disasters: structuredClone(this.disasters),
      dialogues: structuredClone(this.dialogues),
      logs: structuredClone(this.logs),
      history: structuredClone(this.history),
      duration: 70
    };
  }

  // STEP 2: PERCEIVE
  private perceive(agent: Agent) {
    const visionMult = this.weather?.effects?.visionMultiplier ?? 1.0;
    const vision = agent.genetics.visionRadius * visionMult;
    const nearbyResources: ResourceNode[] = [];
    for (const res of this.resources) {
      if (res.amount > 0 && Math.hypot(res.x - agent.x, res.y - agent.y) < vision) {
        nearbyResources.push(res);
      }
    }

    const nearbyAgents: Agent[] = [];
    for (const other of this.agents) {
      if (other.id !== agent.id && Math.hypot(other.x - agent.x, other.y - agent.y) < vision) {
        nearbyAgents.push(other);
      }
    }

    const nearbyDisasters = this.disasters.filter(
      d => Math.hypot(d.x - agent.x, d.y - agent.y) < d.radius + vision * 0.5
    );

    return {
      resources: nearbyResources,
      agents: nearbyAgents,
      disasters: nearbyDisasters
    };
  }

  // STEP 3: DECIDE & ACT
  private decideAndAct(agent: Agent, perception: ReturnType<typeof this.perceive>) {
    agent.age += 1;
    if (agent.thoughtTimer > 0) agent.thoughtTimer--;

    // Weather impact on organism metabolism & energy consumption
    const isNearBuilding = this.buildings.some(b => Math.hypot(b.x - agent.x, b.y - agent.y) < b.influenceRadius);
    const shelterReduction = isNearBuilding ? 0.75 : 0.0; // 75% protection in shelter enclaves

    const weatherEffects = this.weather?.effects || { metabolismMultiplier: 1.0, energyDrainRate: 0.0 };
    const effectiveMetabolismMult = 1 + (weatherEffects.metabolismMultiplier - 1) * (1 - shelterReduction);
    const effectiveEnergyDrainRate = (weatherEffects.energyDrainRate || 0) * (1 - shelterReduction);

    const baseMetabolism = agent.genetics.metabolism;
    const totalMetabolicDrain = baseMetabolism * effectiveMetabolismMult + effectiveEnergyDrainRate;
    agent.energy = Math.max(0, agent.energy - totalMetabolicDrain);

    // Weather health drain (e.g. Acid Rain or extreme Solar Flare)
    if (weatherEffects.healthDrainRate && !isNearBuilding) {
      agent.health = Math.max(0, agent.health - weatherEffects.healthDrainRate * (1 - shelterReduction));
    }

    // Weather-adaptive thoughts when climate is harsh
    if (this.weather && this.weather.currentType !== 'clear' && agent.thoughtTimer <= 0 && this.random() < 0.05) {
      if (this.weather.currentType === 'solar_flare') {
        agent.currentThought = isNearBuilding
          ? `Settlement shielding deflecting extreme solar thermal radiation (${Math.round(this.weather.temperature)}°C).`
          : `Solar Flare Coronal Storm! Energy burning at ${Math.round(effectiveMetabolismMult * 100)}% rate!`;
        agent.thoughtTimer = 75;
      } else if (this.weather.currentType === 'acid_rain') {
        agent.currentThought = isNearBuilding
          ? `Enclave structure resisting caustic acid downpour.`
          : `Acid rain eroding exterior plating! Energy consumption elevated (+${Math.round((effectiveMetabolismMult - 1) * 100)}%).`;
        agent.thoughtTimer = 75;
      } else if (this.weather.currentType === 'cooling_period') {
        agent.currentThought = isNearBuilding
          ? `Thermal hub maintaining habitable core temperatures.`
          : `Glacial freeze (-26°C)! Metabolism surging to maintain core warmth.`;
        agent.thoughtTimer = 75;
      } else if (this.weather.currentType === 'ion_tempest') {
        agent.currentThought = `Ion tempest surge detected! Sensory guidance fluctuating.`;
        agent.thoughtTimer = 75;
      } else if (this.weather.currentType === 'sandstorm') {
        agent.currentThought = `Dense particulate sand squall impairing optical arrays (-50%).`;
        agent.thoughtTimer = 75;
      } else if (this.weather.currentType === 'mutagenic_monsoon') {
        agent.currentThought = `Mutagenic rain catalyzing rapid genetic speciation.`;
        agent.thoughtTimer = 75;
      }
    }

    // 1. Check immediate threats
    if (perception.disasters.length > 0) {
      const d = perception.disasters[0];
      if (d.type === 'meteor' || d.type === 'radiation_storm' || d.type === 'solar_flare') {
        agent.state = 'fleeing';
        const angle = Math.atan2(agent.y - d.y, agent.x - d.x);
        agent.vx = Math.cos(angle) * agent.genetics.speed * 1.3;
        agent.vy = Math.sin(angle) * agent.genetics.speed * 1.3;
        agent.goal = `Evading ${d.name}`;
        if (agent.thoughtTimer <= 0) {
          agent.currentThought = `Warning! Catastrophic hazard detected. Rerouting coordinates!`;
          agent.thoughtTimer = 60;
        }
        return;
      }
    }

    // 2. Check critical energy / health
    if (agent.energy < 25) {
      agent.state = 'seeking_resource';
      const foodOrWater = perception.resources.find(r => r.type === 'food' || r.type === 'water');
      if (foodOrWater) {
        this.moveTowards(agent, foodOrWater.x, foodOrWater.y);
        agent.goal = `Gathering sustenance at (${Math.round(foodOrWater.x)}, ${Math.round(foodOrWater.y)})`;
        if (agent.thoughtTimer <= 0) {
          agent.currentThought = `Energy low (${Math.round(agent.energy)}%). Locating closest nutrient node.`;
          agent.thoughtTimer = 80;
        }
        return;
      }
    }

    // 3. Reproduction check
    const reproMult = this.getLawModifier('reproductionCostMultiplier');
    if (agent.energy > 85 * reproMult && agent.wealth > 35 && this.agents.length < this.config.maxAgents) {
      const mate = perception.agents.find(a => a.factionId === agent.factionId && a.energy > 75 && a.age > 30);
      if (mate) {
        this.moveTowards(agent, mate.x, mate.y);
        agent.state = 'reproducing';
        agent.goal = `Courting unit ${mate.name}`;
        if (Math.hypot(agent.x - mate.x, agent.y - mate.y) < 18) {
          agent.energy -= 40 * reproMult;
          agent.wealth -= 15;
          mate.energy -= 35 * reproMult;
          const child = this.createAgent({
            name: `${agent.name.split(' ')[0]}-Jr`,
            role: agent.role,
            factionId: agent.factionId,
            speciesCladeId: agent.speciesCladeId,
            speciesName: agent.speciesName,
            x: agent.x + (this.random() - 0.5) * 20,
            y: agent.y + (this.random() - 0.5) * 20,
            parentGenetics: agent.genetics,
            generation: agent.generation + 1
          });
          agent.memory = [...(agent.memory || []).slice(-8), `Reproduced offspring ${child.name} (Gen ${child.generation}).`];
          agent.currentThought = `Genetic lineage expanded. Welcoming ${child.name} to the collective.`;
          agent.thoughtTimer = 90;
          audioEngine.playBirth();
          return;
        }
      }
    }

    // 4. Role-based actions
    if (agent.role === 'Warrior' || (agent.genetics.aggression > 0.7 && this.random() < 0.4)) {
      const enemies = perception.agents.filter(a => a.factionId !== agent.factionId);
      if (enemies.length > 0) {
        const target = enemies[0];
        this.moveTowards(agent, target.x, target.y);
        agent.state = 'attacking';
        agent.goal = `Intercepting hostile ${target.name} (${target.factionId})`;
        if (agent.thoughtTimer <= 0) {
          agent.currentThought = `Hostile signature detected. Neutralizing ${target.name}.`;
          agent.thoughtTimer = 60;
        }
        return;
      }
    }

    if (agent.role === 'Trader') {
      const tradePartners = perception.agents.filter(a => a.id !== agent.id && a.wealth > 10);
      if (tradePartners.length > 0) {
        const partner = tradePartners[0];
        this.moveTowards(agent, partner.x, partner.y);
        agent.state = 'trading';
        agent.goal = `Negotiating barter with ${partner.name}`;
        return;
      }
    }

    // 5. Default: Wander or harvest nearest resource
    if (perception.resources.length > 0) {
      const targetRes = perception.resources[0];
      this.moveTowards(agent, targetRes.x, targetRes.y);
      agent.state = 'seeking_resource';
      agent.goal = `Harvesting ${targetRes.type} node`;
    } else {
      agent.state = 'idle';
      if (this.random() < 0.05) {
        agent.vx += (this.random() - 0.5) * 1.5;
        agent.vy += (this.random() - 0.5) * 1.5;
      }
    }
  }

  private moveTowards(agent: Agent, tx: number, ty: number) {
    const dx = tx - agent.x;
    const dy = ty - agent.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 2) {
      const speedMult = this.getLawModifier('speedMultiplier');
      const speed = agent.genetics.speed * speedMult;
      agent.vx = (dx / dist) * speed;
      agent.vy = (dy / dist) * speed;
    }
  }

  // STEP 4: RESOLVE INTERACTIONS
  private resolveInteractions() {
    const speedLaw = this.getLawModifier('speedMultiplier');
    const combatLaw = this.getLawModifier('combatDamageMultiplier');
    const tradeRewardLaw = this.getLawModifier('tradeRewardMultiplier');

    // Update positions
    for (const agent of this.agents) {
      agent.x += agent.vx * speedLaw;
      agent.y += agent.vy * speedLaw;

      agent.vx *= this.config.friction;
      agent.vy *= this.config.friction;

      // World boundaries
      if (this.config.toroidalWorld) {
        if (agent.x < 0) agent.x = this.config.width;
        if (agent.x > this.config.width) agent.x = 0;
        if (agent.y < 0) agent.y = this.config.height;
        if (agent.y > this.config.height) agent.y = 0;
      } else {
        if (agent.x < 15) { agent.x = 15; agent.vx *= -1; }
        if (agent.x > this.config.width - 15) { agent.x = this.config.width - 15; agent.vx *= -1; }
        if (agent.y < 15) { agent.y = 15; agent.vy *= -1; }
        if (agent.y > this.config.height - 15) { agent.y = this.config.height - 15; agent.vy *= -1; }
      }

      // Resource harvesting
      for (const res of this.resources) {
        if (res.amount > 0 && Math.hypot(agent.x - res.x, agent.y - res.y) < res.radius + agent.size) {
          const harvestAmt = Math.min(res.amount, 0.4);
          res.amount -= harvestAmt;
          agent.inventory[res.type] = (agent.inventory[res.type] || 0) + harvestAmt;
          agent.energy = Math.min(agent.maxEnergy, agent.energy + harvestAmt * 1.5);
          agent.wealth += 0.05;
        }
      }
    }

    // Agent to Agent Interactions
    for (let i = 0; i < this.agents.length; i++) {
      for (let j = i + 1; j < this.agents.length; j++) {
        const a1 = this.agents[i];
        const a2 = this.agents[j];
        const dist = Math.hypot(a1.x - a2.x, a1.y - a2.y);

        if (dist < a1.size + a2.size + 4) {
          // Collision separation
          const overlap = (a1.size + a2.size + 4) - dist;
          const angle = Math.atan2(a2.y - a1.y, a2.x - a1.x);
          a1.x -= Math.cos(angle) * overlap * 0.5;
          a1.y -= Math.sin(angle) * overlap * 0.5;
          a2.x += Math.cos(angle) * overlap * 0.5;
          a2.y += Math.sin(angle) * overlap * 0.5;

          // Combat resolution
          if (a1.factionId !== a2.factionId && (a1.state === 'attacking' || a2.state === 'attacking')) {
            const dmg1 = (a1.genetics.aggression * 8 + 2) * combatLaw;
            const dmg2 = (a2.genetics.aggression * 8 + 2) * combatLaw;
            a2.health -= dmg1;
            a1.health -= dmg2;
            audioEngine.playAttack();

            if (a2.health <= 0) {
              a1.kills++;
              a1.wealth += a2.wealth * 0.5;
              a1.energy = Math.min(a1.maxEnergy, a1.energy + 30);
              a1.memory = [...(a1.memory || []).slice(-8), `Vanquished hostile unit ${a2.name}.`];
              this.addLog('combat', 'Skirmish Neutralization', `${a1.name} (${a1.role}) defeated ${a2.name} in territorial encounter.`, 'normal');
            }
          }

          // Trade resolution
          if (a1.state === 'trading' && a2.wealth > 5 && a1.wealth > 5) {
            a1.trades++;
            a2.trades++;
            a1.wealth += 2.5 * tradeRewardLaw;
            a2.wealth += 2.5 * tradeRewardLaw;
            audioEngine.playTrade();
            a1.currentThought = `Bartered resources successfully with ${a2.name}. Profit generated!`;
            a1.thoughtTimer = 50;
          }
        }
      }
    }
  }

  // STEP 5: ADVANCE TIME
  private advanceTime() {
    this.tick += 1;

    // Check epoch transition (every 300 ticks)
    if (this.tick % this.config.dayCycleLength === 0) {
      this.epoch += 1;
      audioEngine.playEpochAdvance();
      this.addLog(
        'emergence',
        `Epoch ${this.epoch} Reached`,
        `World population: ${this.agents.length} | Clades active: ${this.clades.filter(c => !c.extinct).length} | Laws ratified: ${this.laws.filter(l => l.status === 'ratified').length}.`,
        'high'
      );
    }

    // Record history stats every 25 ticks
    if (this.tick % 25 === 0) {
      this.recordHistorySnapshot();
    }

    // Dynamic Market Price updates
    if (this.tick % 50 === 0) {
      (Object.keys(this.marketPrices) as ResourceType[]).forEach(k => {
        const item = this.marketPrices[k];
        const ratio = item.demand / Math.max(10, item.supply);
        const targetPrice = item.price * ratio;
        item.price = Number((item.price * 0.9 + targetPrice * 0.1).toFixed(1));
        const prevHist = Array.isArray(item.priceHistory) ? item.priceHistory : [];
        item.priceHistory = [...prevHist.slice(-29), item.price];
      });
    }
  }

  private recordHistorySnapshot() {
    const totalWealth = this.agents.reduce((sum, a) => sum + a.wealth, 0) + this.factions.reduce((sum, f) => sum + f.wealth, 0);
    const avgHealth = this.agents.length > 0 ? this.agents.reduce((sum, a) => sum + a.health, 0) / this.agents.length : 0;
    const totalRes = this.resources.reduce((sum, r) => sum + r.amount, 0);
    const totalTrades = this.agents.reduce((sum, a) => sum + a.trades, 0);
    const avgTech = this.factions.reduce((sum, f) => sum + f.techLevel, 0) / Math.max(1, this.factions.length);

    const factionDist: Record<string, number> = {};
    this.factions.forEach(f => {
      factionDist[f.id] = this.agents.filter(a => a.factionId === f.id).length;
    });

    const snapshot: HistoryDataPoint = {
      tick: this.tick,
      epoch: this.epoch,
      population: this.agents.length,
      totalWealth: Math.round(totalWealth),
      averageHealth: Math.round(avgHealth),
      resourceAbundance: Math.round(totalRes),
      tradeVolume: totalTrades,
      activeConflicts: this.agents.filter(a => a.state === 'attacking').length,
      techScore: Number(avgTech.toFixed(2)),
      speciationCount: this.clades.filter(c => !c.extinct).length,
      activeLawsCount: this.laws.filter(l => l.status === 'ratified').length,
      weatherType: this.weather?.currentType || 'clear',
      temperature: Math.round(this.weather?.temperature ?? 20),
      avgMetabolismDrain: Number(((this.weather?.effects?.metabolismMultiplier ?? 1) * 0.05).toFixed(3)),
      factionDistribution: factionDist
    };

    const prevHistory = Array.isArray(this.history) ? this.history : [];
    this.history = [...prevHistory.slice(-49), snapshot];
  }

  // Interventions / God Mode Cosmic Manipulator
  public triggerCosmicTool(type: CosmicToolType, x: number, y: number) {
    if (type === 'resource') {
      this.resources = [
        ...this.resources,
        {
          id: `res_custom_${Date.now()}`,
          type: 'food',
          x,
          y,
          amount: 250,
          maxAmount: 300,
          regenRate: 0.5,
          radius: 24,
          color: '#10b981'
        }
      ];
      this.addLog('anomaly', 'Resource Seeded', `Nutrient well materialized at (${Math.round(x)}, ${Math.round(y)}).`, 'normal');
      audioEngine.playGodAction('resource');
    } else if (type === 'meteor') {
      this.triggerDisaster('meteor', x, y);
    } else if (type === 'black_hole') {
      const anomaly: CosmicAnomaly = {
        id: `anom_${this.nextAnomalyId++}`,
        type: 'black_hole',
        x,
        y,
        radius: 140,
        intensity: 8,
        duration: 250,
        maxDuration: 250,
        color: '#a855f7',
        name: 'Micro Singularity'
      };
      this.anomalies = [...this.anomalies, anomaly];
      this.addLog('anomaly', 'Singularity Ripped Space', `Gravitational black hole opened at (${Math.round(x)}, ${Math.round(y)})!`, 'critical');
      audioEngine.playGodAction('black_hole');
    } else if (type === 'mutagenic_fog') {
      const anomaly: CosmicAnomaly = {
        id: `anom_${this.nextAnomalyId++}`,
        type: 'mutagenic_fog',
        x,
        y,
        radius: 120,
        intensity: 6,
        duration: 300,
        maxDuration: 300,
        color: '#84cc16',
        name: 'Mutagenic Spore Cloud'
      };
      this.anomalies = [...this.anomalies, anomaly];
      this.addLog('evolution', 'Mutagenic Mist Deployed', `Genetic transformation vapor drifting over coordinates (${Math.round(x)}, ${Math.round(y)}).`, 'high');
      audioEngine.playGodAction('mutagenic_fog');
    } else if (type === 'chrono_vortex') {
      const anomaly: CosmicAnomaly = {
        id: `anom_${this.nextAnomalyId++}`,
        type: 'chrono_vortex',
        x,
        y,
        radius: 130,
        intensity: 7,
        duration: 220,
        maxDuration: 220,
        color: '#06b6d4',
        name: 'Chrono-Distortion Vortex'
      };
      this.anomalies = [...this.anomalies, anomaly];
      this.addLog('anomaly', 'Chrono Vortex Manifested', `Local time-dilation field established at (${Math.round(x)}, ${Math.round(y)}).`, 'normal');
      audioEngine.playGodAction('chrono_vortex');
    } else if (type === 'obsidian_mountain') {
      const anomaly: CosmicAnomaly = {
        id: `anom_${this.nextAnomalyId++}`,
        type: 'obsidian_mountain',
        x,
        y,
        radius: 70,
        intensity: 10,
        duration: 600,
        maxDuration: 600,
        color: '#475569',
        name: 'Obsidian Mountain Crag'
      };
      this.anomalies = [...this.anomalies, anomaly];
      this.addLog('anomaly', 'Terraformed Obsidian Barrier', `Impenetrable volcanic formation raised at (${Math.round(x)}, ${Math.round(y)}).`, 'normal');
      audioEngine.playGodAction('obsidian_mountain');
    } else if (type === 'hydro_oasis') {
      const anomaly: CosmicAnomaly = {
        id: `anom_${this.nextAnomalyId++}`,
        type: 'hydro_oasis',
        x,
        y,
        radius: 110,
        intensity: 5,
        duration: 400,
        maxDuration: 400,
        color: '#38bdf8',
        name: 'Hydro Healing Oasis'
      };
      this.anomalies = [...this.anomalies, anomaly];
      this.addLog('anomaly', 'Hydro Oasis Emerged', `Restorative sanctuary blessed the terrain at (${Math.round(x)}, ${Math.round(y)}).`, 'high');
      audioEngine.playGodAction('hydro_oasis');
    } else if (type === 'lightning_smite') {
      // Direct damage in radius
      for (const agent of this.agents) {
        if (Math.hypot(agent.x - x, agent.y - y) < 80) {
          agent.health -= 60;
          agent.energy -= 40;
          agent.vx += (this.random() - 0.5) * 8;
          agent.vy += (this.random() - 0.5) * 8;
          agent.memory = [...(agent.memory || []).slice(-8), 'Struck by divine celestial smite!'];
        }
      }
      this.addLog('disaster', 'Celestial Lightning Smite', `Divine kinetic bolt struck coordinates (${Math.round(x)}, ${Math.round(y)})!`, 'critical');
      audioEngine.playGodAction('lightning_smite');
    }
  }

  public triggerDisaster(type: DisasterEvent['type'], x?: number, y?: number) {
    const posX = x ?? (this.random() * (this.config.width - 200) + 100);
    const posY = y ?? (this.random() * (this.config.height - 200) + 100);

    const disasterMeta: Record<DisasterEvent['type'], { name: string; radius: number; duration: number; intensity: number; color: string }> = {
      meteor: { name: 'Meteor Impact', radius: 110, duration: 180, intensity: 8, color: '#ef4444' },
      radiation_storm: { name: 'Radiation Storm', radius: 140, duration: 240, intensity: 5, color: '#84cc16' },
      resource_bloom: { name: 'Super-Nutrient Bloom', radius: 130, duration: 300, intensity: 6, color: '#10b981' },
      economic_boom: { name: 'Market Gold Rush', radius: 160, duration: 250, intensity: 4, color: '#f59e0b' },
      pandemic: { name: 'Bio-Pathogen Surge', radius: 120, duration: 200, intensity: 6, color: '#ec4899' },
      solar_flare: { name: 'Coronal Mass Ejection', radius: 150, duration: 180, intensity: 7, color: '#06b6d4' },
      singularity_spark: { name: 'Singularity Anomaly', radius: 120, duration: 220, intensity: 9, color: '#a855f7' }
    };

    const meta = disasterMeta[type] || disasterMeta.meteor;

    const disaster: DisasterEvent = {
      id: `disaster_${Date.now()}`,
      type,
      name: meta.name,
      x: posX,
      y: posY,
      radius: meta.radius,
      duration: meta.duration,
      maxDuration: meta.duration,
      intensity: meta.intensity,
      color: meta.color
    };

    this.disasters = [...this.disasters, disaster];
    audioEngine.playDisaster();

    if (type === 'resource_bloom') {
      this.resources = [
        ...this.resources,
        {
          id: `res_bloom_${Date.now()}`,
          type: 'food',
          x: posX,
          y: posY,
          amount: 300,
          maxAmount: 300,
          regenRate: 0.8,
          radius: 28,
          color: '#10b981'
        }
      ];
    }

    this.addLog(
      'disaster',
      `Cataclysm: ${meta.name}`,
      `${meta.name} manifested at (${Math.round(posX)}, ${Math.round(posY)}) with intensity ${meta.intensity}!`,
      'critical'
    );
  }

  private triggerRandomDisaster() {
    const types: DisasterEvent['type'][] = ['meteor', 'radiation_storm', 'resource_bloom', 'economic_boom', 'solar_flare'];
    const type = types[Math.floor(this.random() * types.length)];
    this.triggerDisaster(type);
  }

  // MULTIVERSE TIME LOOM FORKING & JUMPING
  public restoreRunSnapshot(snapshot: TimelineFork['snapshotState'], seed: number, presetId: WorldPresetId): void {
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid run seed.');
    if (!snapshot || !Number.isSafeInteger(snapshot.tick) || snapshot.tick < 0 || !Number.isSafeInteger(snapshot.epoch) || snapshot.epoch < 1) {
      throw new Error('Invalid simulation snapshot metadata.');
    }
    const requiredArrays = ['agents', 'factions', 'resources', 'buildings', 'laws', 'clades', 'anomalies'];
    for (const key of requiredArrays) {
      if (!Array.isArray((snapshot as any)[key])) throw new Error(`Invalid snapshot: ${key} must be an array.`);
    }
    if (!snapshot.config || snapshot.config.presetId !== presetId || !snapshot.marketPrices || !snapshot.weather) {
      throw new Error('Snapshot preset or required world state is invalid.');
    }
    this.initialSeed = seed >>> 0;
    this.randomState = Number.isInteger(snapshot.randomState) ? snapshot.randomState! >>> 0 : this.initialSeed;
    this.tick = snapshot.tick;
    this.epoch = snapshot.epoch;
    this.agents = structuredClone(snapshot.agents);
    this.factions = structuredClone(snapshot.factions);
    this.resources = structuredClone(snapshot.resources);
    this.buildings = structuredClone(snapshot.buildings);
    this.marketPrices = structuredClone(snapshot.marketPrices);
    this.laws = structuredClone(snapshot.laws);
    this.clades = structuredClone(snapshot.clades);
    this.anomalies = structuredClone(snapshot.anomalies);
    this.disasters = structuredClone(snapshot.disasters ?? []);
    this.dialogues = structuredClone(snapshot.dialogues ?? []);
    this.logs = structuredClone(snapshot.logs ?? []);
    this.history = structuredClone(snapshot.history ?? []);
    this.interventions = structuredClone(snapshot.interventions ?? []);
    this.config = structuredClone(snapshot.config);
    this.weather = structuredClone(snapshot.weather);
    this.activeForkId = 'fork_prime';
    this.timelineForks = [{
      id: 'fork_prime', name: 'Imported Run', description: 'Restored from a run snapshot.',
      createdAtTick: 0, createdAtEpoch: 1, divergenceFactor: 0, color: '#38bdf8',
      active: true, snapshotState: this.createFullSnapshot()
    }];
  }

  public recordIntervention(action: string, parameters: Record<string, unknown> = {}): InterventionEvent {
    const event: InterventionEvent = {
      id: `intervention_${this.tick}_${this.interventions.length + 1}`,
      tick: this.tick, epoch: this.epoch, action,
      parameters: structuredClone(parameters), recordedAt: new Date().toISOString()
    };
    this.interventions.push(event);
    return event;
  }
  public createFullSnapshot(): TimelineFork['snapshotState'] {
    return {
      tick: this.tick,
      epoch: this.epoch,
      interventions: structuredClone(this.interventions),
      disasters: structuredClone(this.disasters),
      dialogues: structuredClone(this.dialogues),
      logs: structuredClone(this.logs),
      history: structuredClone(this.history),
      agents: JSON.parse(JSON.stringify(this.agents)),
      factions: JSON.parse(JSON.stringify(this.factions)),
      resources: JSON.parse(JSON.stringify(this.resources)),
      buildings: JSON.parse(JSON.stringify(this.buildings)),
      marketPrices: JSON.parse(JSON.stringify(this.marketPrices)),
      laws: JSON.parse(JSON.stringify(this.laws)),
      clades: JSON.parse(JSON.stringify(this.clades)),
      anomalies: JSON.parse(JSON.stringify(this.anomalies)),
      config: JSON.parse(JSON.stringify(this.config)),
      weather: this.weather ? JSON.parse(JSON.stringify(this.weather)) : undefined,
      randomState: this.randomState
    };
  }

  public forkTimeline(name: string, description: string): TimelineFork {
    const forkColors = ['#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#e11d48'];
    const newFork: TimelineFork = {
      id: `fork_${this.nextForkId++}`,
      name: name || `Timeline Fork ${this.timelineForks.length + 1}`,
      description: description || `Diverged reality branch from Tick ${this.tick}`,
      createdAtTick: this.tick,
      createdAtEpoch: this.epoch,
      parentForkId: this.activeForkId,
      divergenceFactor: Math.round(this.random() * 30 + 10),
      color: forkColors[this.timelineForks.length % forkColors.length],
      active: true,
      snapshotState: this.createFullSnapshot()
    };

    this.timelineForks.forEach(f => { f.active = false; });
    this.timelineForks = [...this.timelineForks, newFork];
    this.activeForkId = newFork.id;

    this.addLog(
      'emergence',
      `Quantum Fork Created: ${newFork.name}`,
      `Reality branched into parallel universe. Timeline index ${newFork.id} is now primary.`,
      'critical'
    );
    audioEngine.playEpochAdvance();
    return newFork;
  }

  public switchTimeline(forkId: string): boolean {
    const target = this.timelineForks.find(f => f.id === forkId);
    if (!target) return false;

    // Save current state into current fork snapshot
    const currentFork = this.timelineForks.find(f => f.id === this.activeForkId);
    if (currentFork) {
      currentFork.snapshotState = this.createFullSnapshot();
    }

    // Restore target snapshot
    const s = target.snapshotState;
    this.tick = s.tick;
    if (typeof s.randomState === 'number') this.randomState = s.randomState;
    this.epoch = s.epoch;
    this.agents = JSON.parse(JSON.stringify(s.agents));
    this.factions = JSON.parse(JSON.stringify(s.factions));
    this.resources = JSON.parse(JSON.stringify(s.resources));
    this.buildings = JSON.parse(JSON.stringify(s.buildings));
    this.marketPrices = JSON.parse(JSON.stringify(s.marketPrices));
    this.laws = JSON.parse(JSON.stringify(s.laws));
    this.clades = JSON.parse(JSON.stringify(s.clades));
    this.anomalies = JSON.parse(JSON.stringify(s.anomalies));
    this.config = JSON.parse(JSON.stringify(s.config));
    if (s.weather) {
      this.weather = JSON.parse(JSON.stringify(s.weather));
    }

    this.timelineForks.forEach(f => {
      f.active = f.id === forkId;
    });
    this.activeForkId = forkId;

    this.addLog(
      'emergence',
      `Reality Jump: ${target.name}`,
      `Consciousness shifted to ${target.name} (Tick ${target.snapshotState.tick}, Epoch ${target.snapshotState.epoch}).`,
      'high'
    );
    audioEngine.playGodAction('chrono_vortex');
    return true;
  }

  // SOVEREIGN DECREE (Architect Law Enactment)
  public issueSovereignDecree(law: Partial<WorldLaw>) {
    const decree: WorldLaw = {
      id: `decree_${this.nextLawId++}`,
      title: law.title || 'Architect Sovereign Decree',
      category: law.category || 'diplomatic',
      description: law.description || 'Absolute cosmic mandate issued directly by the Architect.',
      proposedByFactionId: 'ARCHITECT_DIVINE',
      votesFor: this.factions.map(f => f.id),
      votesAgainst: [],
      status: 'ratified',
      effects: law.effects || { speedMultiplier: 1.25, tradeRewardMultiplier: 1.5 },
      epochRatified: this.epoch,
      tickRatified: this.tick
    };

    this.laws = [...this.laws, decree];
    this.addLog(
      'law',
      `Sovereign Decree Ratified: ${decree.title}`,
      `The Architect promulgated ${decree.title}. All autonomous entities comply immediately.`,
      'critical'
    );
    audioEngine.playLawPassed();
  }

  public addLog(
    type: WorldLog['type'],
    title: string,
    message: string,
    importance: WorldLog['importance'] = 'normal'
  ) {
    const log: WorldLog = {
      id: `log_${this.nextLogId++}`,
      tick: this.tick,
      epoch: this.epoch,
      type,
      title,
      message,
      importance
    };
    const prevLogs = Array.isArray(this.logs) ? this.logs : [];
    this.logs = [log, ...prevLogs.slice(0, 79)];
  }
}
