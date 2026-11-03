export type WorldPresetId =
  | 'civilization'
  | 'wasteland'
  | 'galactic'
  | 'microbial'
  | 'sandbox';

export type AgentRole =
  | 'Pioneer'
  | 'Trader'
  | 'Gatherer'
  | 'Warrior'
  | 'Scholar'
  | 'Leader'
  | 'Scavenger'
  | 'Mutant'
  | 'Organism'
  | 'Predator'
  | 'Miner'
  | 'Diplomat';

export type AgentState =
  | 'idle'
  | 'seeking_resource'
  | 'trading'
  | 'fleeing'
  | 'attacking'
  | 'reproducing'
  | 'building'
  | 'resting'
  | 'researching';

export type ResourceType =
  | 'food'
  | 'energy'
  | 'minerals'
  | 'water'
  | 'tech_relic'
  | 'hyperium';

export interface AgentGenetics {
  speed: number;
  maxEnergy: number;
  visionRadius: number;
  metabolism: number;
  aggression: number;
  tradeAffinity: number;
  mutationRate: number;
  curiosity: number;
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  factionId: string;
  speciesCladeId?: string;
  speciesName?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX?: number;
  targetY?: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  wealth: number;
  inventory: Record<ResourceType, number>;
  state: AgentState;
  goal: string;
  currentThought: string;
  thoughtTimer: number;
  memory: string[];
  generation: number;
  genetics: AgentGenetics;
  relationships: Record<string, number>; // agentId or factionId -> sentiment (-100 to 100)
  color: string;
  kills: number;
  trades: number;
  age: number;
  size: number;
}

export interface Faction {
  id: string;
  name: string;
  color: string;
  secondaryColor: string;
  ideology: string;
  bannerIcon: string;
  wealth: number;
  techLevel: number;
  techEra: 'Primitive' | 'Classical' | 'Industrial' | 'Cybernetic' | 'Transcendent';
  territoryCenter: { x: number; y: number };
  territoryRadius: number;
  allies: string[];
  enemies: string[];
  laws: {
    taxRate: number; // 0 to 1
    defenseBudget: number; // 0 to 1
    opennessToTrade: number; // 0 to 1
  };
}

export interface ResourceNode {
  id: string;
  type: ResourceType;
  x: number;
  y: number;
  amount: number;
  maxAmount: number;
  regenRate: number;
  radius: number;
  color: string;
}

export interface Building {
  id: string;
  type: 'settlement' | 'market_bazaar' | 'turret' | 'academy' | 'shelter' | 'hydro_station' | 'space_dock';
  name: string;
  factionId: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  level: number;
  influenceRadius: number;
  resourceStorage: Partial<Record<ResourceType, number>>;
}

export interface DisasterEvent {
  id: string;
  type: 'meteor' | 'radiation_storm' | 'resource_bloom' | 'economic_boom' | 'pandemic' | 'solar_flare' | 'singularity_spark';
  name: string;
  x: number;
  y: number;
  radius: number;
  duration: number; // ticks left
  maxDuration: number;
  intensity: number;
  color: string;
}

export type CosmicToolType =
  | 'none'
  | 'inspect'
  | 'resource'
  | 'meteor'
  | 'black_hole'
  | 'mutagenic_fog'
  | 'chrono_vortex'
  | 'obsidian_mountain'
  | 'hydro_oasis'
  | 'lightning_smite';

export interface CosmicAnomaly {
  id: string;
  type: 'black_hole' | 'mutagenic_fog' | 'chrono_vortex' | 'obsidian_mountain' | 'hydro_oasis' | 'lightning_smite';
  x: number;
  y: number;
  radius: number;
  intensity: number;
  duration: number;
  maxDuration: number;
  color: string;
  name: string;
}

export interface AgentDialogue {
  id: string;
  agent1Id: string;
  agent1Name: string;
  agent1Color: string;
  agent2Id?: string;
  agent2Name?: string;
  agent2Color?: string;
  text: string;
  category: 'trade' | 'diplomacy' | 'philosophy' | 'reproduction' | 'combat' | 'curiosity' | 'governance';
  x: number;
  y: number;
  tick: number;
  duration: number; // ticks to show
}

export interface SpeciesClade {
  id: string;
  name: string;
  founderName: string;
  foundingEpoch: number;
  foundingTick: number;
  parentCladeId?: string;
  traits: {
    avgSpeed: number;
    avgAggression: number;
    avgCuriosity: number;
    avgTrade: number;
    avgMetabolism: number;
    avgVision: number;
  };
  populationCount: number;
  extinct: boolean;
  color: string;
  mutationHighlights: string[];
}

export interface WorldLaw {
  id: string;
  title: string;
  category: 'economic' | 'military' | 'ecological' | 'genetic' | 'diplomatic';
  description: string;
  proposedByFactionId: string;
  votesFor: string[]; // faction IDs
  votesAgainst: string[]; // faction IDs
  status: 'proposed' | 'ratified' | 'repealed';
  effects: {
    speedMultiplier?: number;
    combatDamageMultiplier?: number;
    taxModifier?: number;
    reproductionCostMultiplier?: number;
    tradeRewardMultiplier?: number;
    mutationRateMultiplier?: number;
    resourceRegenMultiplier?: number;
  };
  votingTimer?: number;
  epochRatified?: number;
  tickRatified?: number;
}

export interface TimelineFork {
  id: string;
  name: string;
  description: string;
  createdAtTick: number;
  createdAtEpoch: number;
  parentForkId?: string;
  divergenceFactor: number;
  color: string;
  active: boolean;
  snapshotState: {
    tick: number;
    epoch: number;
    agents: Agent[];
    factions: Faction[];
    resources: ResourceNode[];
    buildings: Building[];
    marketPrices: Record<ResourceType, MarketPrice>;
    laws: WorldLaw[];
    clades: SpeciesClade[];
    anomalies: CosmicAnomaly[];
    config: WorldConfig;
    weather?: WeatherState;
  };
}

export type WeatherType =
  | 'clear'
  | 'solar_flare'
  | 'acid_rain'
  | 'cooling_period'
  | 'ion_tempest'
  | 'mutagenic_monsoon'
  | 'sandstorm';

export interface WeatherEffects {
  metabolismMultiplier: number;
  energyDrainRate: number;
  healthDrainRate?: number;
  speedMultiplier?: number;
  visionMultiplier?: number;
  mutationBoost?: number;
  resourceRegenMultiplier?: number;
}

export interface WeatherState {
  currentType: WeatherType;
  name: string;
  description: string;
  intensity: number; // 0.0 to 1.0
  duration: number; // ticks left
  maxDuration: number;
  temperature: number; // °C
  humidity: number; // 0 to 100%
  radiation: number; // rads/s
  windVector: { x: number; y: number };
  effects: WeatherEffects;
  nextForecast: {
    type: WeatherType;
    name: string;
    etaTicks: number;
  };
  color: string;
  iconName: string;
}

export interface WorldConfig {
  name: string;
  presetId: WorldPresetId;
  description: string;
  width: number;
  height: number;
  friction: number;
  gravity: number;
  dayCycleLength: number; // in ticks
  resourceRegenMultiplier: number;
  mutationRate: number;
  maxAgents: number;
  disasterFrequency: number;
  toroidalWorld: boolean;
  biomeType: 'temperate' | 'wasteland' | 'cosmic' | 'primordial_sea' | 'cyber_grid';
}

export interface MarketPrice {
  resource: ResourceType;
  price: number;
  supply: number;
  demand: number;
  priceHistory: number[];
}

export interface WorldLog {
  id: string;
  tick: number;
  epoch: number;
  type: 'emergence' | 'diplomacy' | 'economy' | 'disaster' | 'evolution' | 'science' | 'combat' | 'law' | 'anomaly';
  title: string;
  message: string;
  importance: 'normal' | 'high' | 'critical';
}

export interface HistoryDataPoint {
  tick: number;
  epoch: number;
  population: number;
  totalWealth: number;
  averageHealth: number;
  resourceAbundance: number;
  tradeVolume: number;
  activeConflicts: number;
  techScore: number;
  speciationCount?: number;
  activeLawsCount?: number;
  weatherType?: string;
  temperature?: number;
  avgMetabolismDrain?: number;
  factionDistribution: Record<string, number>;
}

