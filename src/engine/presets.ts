import { WorldConfig, Faction, ResourceNode, Agent, Building, WorldPresetId, ResourceType } from '../types/simulation';

export interface WorldPresetData {
  id: WorldPresetId;
  name: string;
  subtitle: string;
  tagline: string;
  icon: string;
  description: string;
  config: WorldConfig;
  factions: Faction[];
  initialResources: ResourceNode[];
  initialAgents: Agent[];
  initialBuildings: Building[];
  marketBasePrices: Record<ResourceType, number>;
  colorTheme: {
    bg: string;
    grid: string;
    accent: string;
  };
}

export const WORLD_PRESETS: Record<WorldPresetId, WorldPresetData> = {
  civilization: {
    id: 'civilization',
    name: 'AI Kingdoms & Civilization',
    subtitle: 'Societies, Laws, Tech & Diplomacy',
    tagline: 'Witness autonomous factions expand borders, negotiate treaties, trade goods, and evolve through technological eras.',
    icon: 'Crown',
    description: 'Autonomous factions build settlements, extract resources, trade along caravans, form alliances or wage wars, and advance from primitive to cybernetic eras.',
    config: {
      name: 'Chronicles of Aethelgard',
      presetId: 'civilization',
      description: 'A thriving continent where three sovereign factions balance diplomacy, market commerce, and territorial expansion.',
      width: 1200,
      height: 750,
      friction: 0.92,
      gravity: 0,
      dayCycleLength: 300,
      resourceRegenMultiplier: 1.0,
      mutationRate: 0.05,
      maxAgents: 90,
      disasterFrequency: 0.002,
      toroidalWorld: false,
      biomeType: 'temperate'
    },
    colorTheme: {
      bg: '#080d1a',
      grid: 'rgba(56, 189, 248, 0.06)',
      accent: '#38bdf8'
    },
    factions: [
      {
        id: 'faction_solaris',
        name: 'Solaris Imperium',
        color: '#f59e0b',
        secondaryColor: '#fbbf24',
        ideology: 'Commercial Hegemony & Solar Order',
        bannerIcon: 'Sun',
        wealth: 850,
        techLevel: 1,
        techEra: 'Classical',
        territoryCenter: { x: 300, y: 250 },
        territoryRadius: 180,
        allies: ['faction_sylvan'],
        enemies: [],
        laws: { taxRate: 0.15, defenseBudget: 0.35, opennessToTrade: 0.85 }
      },
      {
        id: 'faction_iron',
        name: 'Iron Guild Confederacy',
        color: '#06b6d4',
        secondaryColor: '#22d3ee',
        ideology: 'Industrial Might & Mineral Monopoly',
        bannerIcon: 'Shield',
        wealth: 620,
        techLevel: 2,
        techEra: 'Industrial',
        territoryCenter: { x: 900, y: 260 },
        territoryRadius: 190,
        allies: [],
        enemies: [],
        laws: { taxRate: 0.25, defenseBudget: 0.50, opennessToTrade: 0.60 }
      },
      {
        id: 'faction_sylvan',
        name: 'Sylvan Enclave',
        color: '#10b981',
        secondaryColor: '#34d399',
        ideology: 'Ecological Symbiosis & Tech Synthesis',
        bannerIcon: 'Trees',
        wealth: 740,
        techLevel: 1,
        techEra: 'Classical',
        territoryCenter: { x: 600, y: 550 },
        territoryRadius: 175,
        allies: ['faction_solaris'],
        enemies: [],
        laws: { taxRate: 0.10, defenseBudget: 0.20, opennessToTrade: 0.90 }
      }
    ],
    marketBasePrices: {
      food: 12,
      energy: 18,
      minerals: 24,
      water: 10,
      tech_relic: 55,
      hyperium: 90
    },
    initialResources: [
      { id: 'res_1', type: 'food', x: 260, y: 200, amount: 200, maxAmount: 250, regenRate: 0.4, radius: 24, color: '#10b981' },
      { id: 'res_2', type: 'minerals', x: 950, y: 200, amount: 300, maxAmount: 350, regenRate: 0.3, radius: 26, color: '#06b6d4' },
      { id: 'res_3', type: 'water', x: 550, y: 480, amount: 250, maxAmount: 300, regenRate: 0.5, radius: 28, color: '#3b82f6' },
      { id: 'res_4', type: 'food', x: 650, y: 590, amount: 180, maxAmount: 220, regenRate: 0.35, radius: 22, color: '#10b981' },
      { id: 'res_5', type: 'tech_relic', x: 600, y: 350, amount: 80, maxAmount: 120, regenRate: 0.1, radius: 20, color: '#a855f7' },
      { id: 'res_6', type: 'energy', x: 380, y: 300, amount: 160, maxAmount: 200, regenRate: 0.25, radius: 22, color: '#f59e0b' },
      { id: 'res_7', type: 'minerals', x: 820, y: 320, amount: 200, maxAmount: 250, regenRate: 0.3, radius: 24, color: '#06b6d4' }
    ],
    initialBuildings: [
      { id: 'bld_1', type: 'settlement', name: 'Sol Citadel', factionId: 'faction_solaris', x: 300, y: 250, health: 500, maxHealth: 500, level: 2, influenceRadius: 160, resourceStorage: { food: 150, minerals: 50 } },
      { id: 'bld_2', type: 'market_bazaar', name: 'Grand Agora', factionId: 'faction_solaris', x: 370, y: 230, health: 300, maxHealth: 300, level: 1, influenceRadius: 100, resourceStorage: {} },
      { id: 'bld_3', type: 'settlement', name: 'Iron Bastion', factionId: 'faction_iron', x: 900, y: 260, health: 650, maxHealth: 650, level: 2, influenceRadius: 170, resourceStorage: { minerals: 220 } },
      { id: 'bld_4', type: 'market_bazaar', name: 'Smelters Post', factionId: 'faction_iron', x: 830, y: 250, health: 300, maxHealth: 300, level: 1, influenceRadius: 100, resourceStorage: {} },
      { id: 'bld_5', type: 'settlement', name: 'Verdant Sanctuary', factionId: 'faction_sylvan', x: 600, y: 550, health: 450, maxHealth: 450, level: 2, influenceRadius: 160, resourceStorage: { water: 120, food: 180 } },
      { id: 'bld_6', type: 'academy', name: 'Botanical Academy', factionId: 'faction_sylvan', x: 660, y: 520, health: 250, maxHealth: 250, level: 1, influenceRadius: 110, resourceStorage: {} }
    ],
    initialAgents: []
  },

  wasteland: {
    id: 'wasteland',
    name: 'Post-Apocalyptic Survival & Ruins',
    subtitle: 'Resource Scarcity, Barter & Radiation Hazards',
    tagline: 'In a scorched world, scavengers, mutant hordes, and survival enclaves clash over water springs, fuel cells, and fortified shelters.',
    icon: 'Radioactive',
    description: 'Extreme environmental constraints, frequent radiation storms, high scarcity, barter economies, and tactical skirmishes over vital hydration reserves.',
    config: {
      name: 'Sector Zero: Ashlands',
      presetId: 'wasteland',
      description: 'A desolate wasteland where radiation storms sweep across ruins and water is worth more than gold.',
      width: 1200,
      height: 750,
      friction: 0.90,
      gravity: 0,
      dayCycleLength: 240,
      resourceRegenMultiplier: 0.5,
      mutationRate: 0.25,
      maxAgents: 75,
      disasterFrequency: 0.006,
      toroidalWorld: false,
      biomeType: 'wasteland'
    },
    colorTheme: {
      bg: '#0d0907',
      grid: 'rgba(249, 115, 22, 0.06)',
      accent: '#f97316'
    },
    factions: [
      {
        id: 'faction_scavengers',
        name: 'Rustborn Scavengers',
        color: '#f97316',
        secondaryColor: '#fb923c',
        ideology: 'Salvage, Survival & Scrap Barter',
        bannerIcon: 'Wrench',
        wealth: 340,
        techLevel: 1,
        techEra: 'Primitive',
        territoryCenter: { x: 300, y: 350 },
        territoryRadius: 170,
        allies: [],
        enemies: ['faction_mutants'],
        laws: { taxRate: 0.05, defenseBudget: 0.40, opennessToTrade: 0.70 }
      },
      {
        id: 'faction_mutants',
        name: 'Glowfang Brood',
        color: '#84cc16',
        secondaryColor: '#a3e635',
        ideology: 'Radiation Adaptation & Bio-Dominance',
        bannerIcon: 'Biohazard',
        wealth: 210,
        techLevel: 0,
        techEra: 'Primitive',
        territoryCenter: { x: 920, y: 380 },
        territoryRadius: 200,
        allies: [],
        enemies: ['faction_scavengers', 'faction_vault'],
        laws: { taxRate: 0.0, defenseBudget: 0.80, opennessToTrade: 0.10 }
      },
      {
        id: 'faction_vault',
        name: 'Vault-77 Preppers',
        color: '#0284c7',
        secondaryColor: '#38bdf8',
        ideology: 'Technological Preservation & Fortress Law',
        bannerIcon: 'ShieldAlert',
        wealth: 520,
        techLevel: 2,
        techEra: 'Industrial',
        territoryCenter: { x: 620, y: 200 },
        territoryRadius: 150,
        allies: [],
        enemies: ['faction_mutants'],
        laws: { taxRate: 0.20, defenseBudget: 0.60, opennessToTrade: 0.40 }
      }
    ],
    marketBasePrices: {
      food: 35,
      water: 45,
      energy: 25,
      minerals: 15,
      tech_relic: 70,
      hyperium: 110
    },
    initialResources: [
      { id: 'w_res_1', type: 'water', x: 600, y: 450, amount: 150, maxAmount: 180, regenRate: 0.18, radius: 24, color: '#38bdf8' },
      { id: 'w_res_2', type: 'food', x: 320, y: 300, amount: 90, maxAmount: 120, regenRate: 0.15, radius: 18, color: '#f59e0b' },
      { id: 'w_res_3', type: 'minerals', x: 880, y: 420, amount: 220, maxAmount: 250, regenRate: 0.2, radius: 22, color: '#a8a29e' },
      { id: 'w_res_4', type: 'energy', x: 620, y: 170, amount: 140, maxAmount: 170, regenRate: 0.22, radius: 20, color: '#eab308' },
      { id: 'w_res_5', type: 'tech_relic', x: 450, y: 600, amount: 60, maxAmount: 90, regenRate: 0.05, radius: 16, color: '#c084fc' }
    ],
    initialBuildings: [
      { id: 'w_bld_1', type: 'shelter', name: 'Scrap Compound', factionId: 'faction_scavengers', x: 300, y: 350, health: 380, maxHealth: 380, level: 1, influenceRadius: 150, resourceStorage: { minerals: 80 } },
      { id: 'w_bld_2', type: 'shelter', name: 'Irradiated Hive', factionId: 'faction_mutants', x: 920, y: 380, health: 500, maxHealth: 500, level: 1, influenceRadius: 170, resourceStorage: {} },
      { id: 'w_bld_3', type: 'shelter', name: 'Bunker 77 AirLock', factionId: 'faction_vault', x: 620, y: 200, health: 600, maxHealth: 600, level: 2, influenceRadius: 140, resourceStorage: { water: 90, energy: 80 } }
    ],
    initialAgents: []
  },

  galactic: {
    id: 'galactic',
    name: 'Galactic Trade & Deep Void Politics',
    subtitle: 'Stellar Fleets, Asteroid Mining & Hyperium Arbitrage',
    tagline: 'Command or observe star-trading guilds, automated mining drones, orbital space docks, and void raiders in deep vacuum.',
    icon: 'Rocket',
    description: 'Dynamic inter-station commerce, price arbitrage of rare space minerals, asteroid mining extraction, high speed space mechanics, and orbital defense.',
    config: {
      name: 'Orion Nebula Sector 9',
      presetId: 'galactic',
      description: 'Zero-gravity commercial corridor where deep-space freighters and mining barges fuel a multi-trillion credit economy.',
      width: 1200,
      height: 750,
      friction: 0.98,
      gravity: 0,
      dayCycleLength: 400,
      resourceRegenMultiplier: 1.2,
      mutationRate: 0.02,
      maxAgents: 80,
      disasterFrequency: 0.003,
      toroidalWorld: true,
      biomeType: 'cosmic'
    },
    colorTheme: {
      bg: '#040714',
      grid: 'rgba(168, 85, 247, 0.07)',
      accent: '#c084fc'
    },
    factions: [
      {
        id: 'faction_stellar',
        name: 'Stellar Mining Combine',
        color: '#38bdf8',
        secondaryColor: '#7dd3fc',
        ideology: 'Deep Space Extraction & Automated Logistics',
        bannerIcon: 'Compass',
        wealth: 1400,
        techLevel: 3,
        techEra: 'Cybernetic',
        territoryCenter: { x: 250, y: 380 },
        territoryRadius: 210,
        allies: ['faction_merchants'],
        enemies: ['faction_void_pirates'],
        laws: { taxRate: 0.12, defenseBudget: 0.45, opennessToTrade: 0.90 }
      },
      {
        id: 'faction_merchants',
        name: 'Omni-Corp Trade Fleet',
        color: '#f59e0b',
        secondaryColor: '#fcd34d',
        ideology: 'Hyperium Free-Market Arbitrage',
        bannerIcon: 'Coins',
        wealth: 1850,
        techLevel: 3,
        techEra: 'Cybernetic',
        territoryCenter: { x: 950, y: 380 },
        territoryRadius: 200,
        allies: ['faction_stellar'],
        enemies: ['faction_void_pirates'],
        laws: { taxRate: 0.08, defenseBudget: 0.30, opennessToTrade: 0.95 }
      },
      {
        id: 'faction_void_pirates',
        name: 'Dark Matter Corsairs',
        color: '#ef4444',
        secondaryColor: '#f87171',
        ideology: 'Fleet Plunder & Anarchic Privateering',
        bannerIcon: 'Skull',
        wealth: 480,
        techLevel: 2,
        techEra: 'Industrial',
        territoryCenter: { x: 600, y: 150 },
        territoryRadius: 180,
        allies: [],
        enemies: ['faction_stellar', 'faction_merchants'],
        laws: { taxRate: 0.0, defenseBudget: 0.90, opennessToTrade: 0.20 }
      }
    ],
    marketBasePrices: {
      food: 20,
      energy: 30,
      minerals: 40,
      water: 25,
      tech_relic: 85,
      hyperium: 150
    },
    initialResources: [
      { id: 'g_res_1', type: 'hyperium', x: 600, y: 400, amount: 280, maxAmount: 320, regenRate: 0.3, radius: 28, color: '#c084fc' },
      { id: 'g_res_2', type: 'minerals', x: 200, y: 220, amount: 350, maxAmount: 400, regenRate: 0.4, radius: 26, color: '#38bdf8' },
      { id: 'g_res_3', type: 'energy', x: 1000, y: 220, amount: 300, maxAmount: 350, regenRate: 0.35, radius: 24, color: '#f59e0b' },
      { id: 'g_res_4', type: 'water', x: 600, y: 620, amount: 200, maxAmount: 250, regenRate: 0.25, radius: 22, color: '#06b6d4' },
      { id: 'g_res_5', type: 'tech_relic', x: 400, y: 280, amount: 90, maxAmount: 140, regenRate: 0.1, radius: 18, color: '#a855f7' }
    ],
    initialBuildings: [
      { id: 'g_bld_1', type: 'space_dock', name: 'Asteroid Station Alpha', factionId: 'faction_stellar', x: 250, y: 380, health: 800, maxHealth: 800, level: 3, influenceRadius: 180, resourceStorage: { minerals: 200, hyperium: 100 } },
      { id: 'g_bld_2', type: 'market_bazaar', name: 'Deep Space Exchange', factionId: 'faction_merchants', x: 950, y: 380, health: 700, maxHealth: 700, level: 3, influenceRadius: 190, resourceStorage: { hyperium: 150 } },
      { id: 'g_bld_3', type: 'turret', name: 'Corsair Outpost', factionId: 'faction_void_pirates', x: 600, y: 150, health: 500, maxHealth: 500, level: 2, influenceRadius: 160, resourceStorage: {} }
    ],
    initialAgents: []
  },

  microbial: {
    id: 'microbial',
    name: 'Microbial Life & Speciation Matrix',
    subtitle: 'Exploratory agent ecology — scientifically unvalidated',
    tagline: 'Research prototype only: explore emergent mutation, reproduction and food-web behaviour. This preset is not calibrated to LTEE data or validated against real microbial populations.',
    icon: 'Dna',
    description: 'UNVALIDATED RESEARCH PROTOTYPE. Abstract single-cell agents consume resources, mutate simulation traits and interact as an emergent food web. Not an LTEE model; do not interpret outputs as empirical microbial predictions.',
    config: {
      name: 'Primordial Hydrothermal Vents',
      presetId: 'microbial',
      description: 'Unvalidated abstract microbial-style sandbox. It does not implement experimentally faithful LTEE serial transfer, competition assays or calibrated genotype-to-fitness mapping.',
      width: 1200,
      height: 750,
      friction: 0.94,
      gravity: 0,
      dayCycleLength: 150,
      resourceRegenMultiplier: 2.0,
      mutationRate: 0.35,
      maxAgents: 120,
      disasterFrequency: 0.001,
      toroidalWorld: true,
      biomeType: 'primordial_sea'
    },
    colorTheme: {
      bg: '#041315',
      grid: 'rgba(20, 184, 166, 0.06)',
      accent: '#14b8a6'
    },
    factions: [
      {
        id: 'faction_phyto',
        name: 'Cyanobacteria Bloom',
        color: '#10b981',
        secondaryColor: '#6ee7b7',
        ideology: 'Photosynthetic Clustering & Fast Division',
        bannerIcon: 'Leaf',
        wealth: 100,
        techLevel: 0,
        techEra: 'Primitive',
        territoryCenter: { x: 350, y: 375 },
        territoryRadius: 220,
        allies: [],
        enemies: ['faction_flagellates'],
        laws: { taxRate: 0, defenseBudget: 0.1, opennessToTrade: 0.1 }
      },
      {
        id: 'faction_flagellates',
        name: 'Predatory Flagellates',
        color: '#f43f5e',
        secondaryColor: '#fb7185',
        ideology: 'Apex Metabolism & Organelle Hunting',
        bannerIcon: 'Flame',
        wealth: 80,
        techLevel: 0,
        techEra: 'Primitive',
        territoryCenter: { x: 850, y: 375 },
        territoryRadius: 200,
        allies: [],
        enemies: ['faction_phyto', 'faction_symbionts'],
        laws: { taxRate: 0, defenseBudget: 0.9, opennessToTrade: 0.0 }
      },
      {
        id: 'faction_symbionts',
        name: 'Bio-Luminescent Symbionts',
        color: '#06b6d4',
        secondaryColor: '#67e8f9',
        ideology: 'Mineral Crystallization & Colony Defense',
        bannerIcon: 'Sparkles',
        wealth: 120,
        techLevel: 0,
        techEra: 'Primitive',
        territoryCenter: { x: 600, y: 550 },
        territoryRadius: 180,
        allies: ['faction_phyto'],
        enemies: ['faction_flagellates'],
        laws: { taxRate: 0, defenseBudget: 0.3, opennessToTrade: 0.4 }
      }
    ],
    marketBasePrices: {
      food: 5,
      energy: 8,
      minerals: 12,
      water: 5,
      tech_relic: 30,
      hyperium: 50
    },
    initialResources: [
      { id: 'm_res_1', type: 'food', x: 300, y: 250, amount: 400, maxAmount: 500, regenRate: 0.8, radius: 32, color: '#10b981' },
      { id: 'm_res_2', type: 'energy', x: 400, y: 500, amount: 350, maxAmount: 450, regenRate: 0.7, radius: 30, color: '#eab308' },
      { id: 'm_res_3', type: 'minerals', x: 850, y: 250, amount: 300, maxAmount: 400, regenRate: 0.6, radius: 28, color: '#06b6d4' },
      { id: 'm_res_4', type: 'water', x: 600, y: 375, amount: 400, maxAmount: 500, regenRate: 0.9, radius: 34, color: '#3b82f6' },
      { id: 'm_res_5', type: 'food', x: 900, y: 520, amount: 320, maxAmount: 400, regenRate: 0.6, radius: 28, color: '#10b981' }
    ],
    initialBuildings: [],
    initialAgents: []
  },

  sandbox: {
    id: 'sandbox',
    name: 'Custom Programmable Sandbox',
    subtitle: 'God-Mode Canvas, Dynamic Physics & Free Rules',
    tagline: 'A clean blueprint laboratory to spawn custom agent populations, trigger celestial cataclysms, edit laws in real time, and inspect emergence.',
    icon: 'Cpu',
    description: 'Maximum freedom: place resources with brush clicks, summon meteorites or market booms, adjust gravity and mutation rates, and inspect the continuous simulation pipeline.',
    config: {
      name: 'Synthetic Reality Matrix #42',
      presetId: 'sandbox',
      description: 'An open algorithmic sandbox designed for testing emergence theories and experimenting with agent behavioral models.',
      width: 1200,
      height: 750,
      friction: 0.92,
      gravity: 0,
      dayCycleLength: 300,
      resourceRegenMultiplier: 1.0,
      mutationRate: 0.1,
      maxAgents: 100,
      disasterFrequency: 0.002,
      toroidalWorld: false,
      biomeType: 'cyber_grid'
    },
    colorTheme: {
      bg: '#060a16',
      grid: 'rgba(0, 240, 255, 0.06)',
      accent: '#00f0ff'
    },
    factions: [
      {
        id: 'faction_alpha',
        name: 'Nexus Prime Core',
        color: '#00f0ff',
        secondaryColor: '#67e8f9',
        ideology: 'Cybernetic Equilibrium',
        bannerIcon: 'Cpu',
        wealth: 1000,
        techLevel: 3,
        techEra: 'Cybernetic',
        territoryCenter: { x: 350, y: 375 },
        territoryRadius: 200,
        allies: ['faction_beta'],
        enemies: [],
        laws: { taxRate: 0.1, defenseBudget: 0.3, opennessToTrade: 0.9 }
      },
      {
        id: 'faction_beta',
        name: 'Vector Collective',
        color: '#a855f7',
        secondaryColor: '#c084fc',
        ideology: 'Computational Synthesis',
        bannerIcon: 'Share2',
        wealth: 1000,
        techLevel: 3,
        techEra: 'Cybernetic',
        territoryCenter: { x: 850, y: 375 },
        territoryRadius: 200,
        allies: ['faction_alpha'],
        enemies: [],
        laws: { taxRate: 0.1, defenseBudget: 0.3, opennessToTrade: 0.9 }
      }
    ],
    marketBasePrices: {
      food: 10,
      energy: 15,
      minerals: 20,
      water: 10,
      tech_relic: 50,
      hyperium: 100
    },
    initialResources: [
      { id: 's_res_1', type: 'energy', x: 300, y: 300, amount: 250, maxAmount: 300, regenRate: 0.5, radius: 24, color: '#f59e0b' },
      { id: 's_res_2', type: 'food', x: 400, y: 450, amount: 250, maxAmount: 300, regenRate: 0.5, radius: 24, color: '#10b981' },
      { id: 's_res_3', type: 'minerals', x: 800, y: 300, amount: 250, maxAmount: 300, regenRate: 0.5, radius: 24, color: '#06b6d4' },
      { id: 's_res_4', type: 'tech_relic', x: 900, y: 450, amount: 150, maxAmount: 200, regenRate: 0.3, radius: 22, color: '#a855f7' },
      { id: 's_res_5', type: 'water', x: 600, y: 375, amount: 300, maxAmount: 350, regenRate: 0.6, radius: 26, color: '#38bdf8' }
    ],
    initialBuildings: [
      { id: 's_bld_1', type: 'settlement', name: 'Nexus Hub', factionId: 'faction_alpha', x: 350, y: 375, health: 600, maxHealth: 600, level: 2, influenceRadius: 180, resourceStorage: { energy: 100 } },
      { id: 's_bld_2', type: 'settlement', name: 'Vector Matrix', factionId: 'faction_beta', x: 850, y: 375, health: 600, maxHealth: 600, level: 2, influenceRadius: 180, resourceStorage: { minerals: 100 } }
    ],
    initialAgents: []
  }
};
