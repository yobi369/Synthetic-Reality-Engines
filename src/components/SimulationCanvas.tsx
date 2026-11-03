import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Agent,
  Building,
  DisasterEvent,
  Faction,
  ResourceNode,
  WorldConfig,
  CosmicAnomaly,
  AgentDialogue,
  CosmicToolType,
  WeatherState,
  WeatherType
} from '../types/simulation';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  Crosshair,
  MapPin,
  Sparkles,
  Layers,
  Info,
  Radio,
  Sliders,
  MessageSquare,
  Compass,
  Atom,
  Flame,
  Sun,
  CloudRain,
  Snowflake,
  Zap,
  Wind,
  Thermometer,
  ShieldAlert,
  Gauge,
  ChevronDown,
  Droplets,
  Activity,
  Shield
} from 'lucide-react';

interface SimulationCanvasProps {
  config: WorldConfig;
  agents: Agent[];
  factions: Faction[];
  resources: ResourceNode[];
  buildings: Building[];
  disasters: DisasterEvent[];
  anomalies?: CosmicAnomaly[];
  dialogues?: AgentDialogue[];
  weather?: WeatherState;
  onSetWeather?: (type: WeatherType) => void;
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string | null) => void;
  onCanvasClickSpawn?: (x: number, y: number) => void;
  spawnMode: string | null;
  cosmicTool?: CosmicToolType;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  config,
  agents,
  factions,
  resources,
  buildings,
  disasters,
  anomalies = [],
  dialogues = [],
  weather,
  onSetWeather,
  selectedAgentId,
  onSelectAgent,
  onCanvasClickSpawn,
  spawnMode,
  cosmicTool = 'none'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Layer Visibility Toggles
  const [showVision, setShowVision] = useState<boolean>(false);
  const [showTerritories, setShowTerritories] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showTradeRoutes, setShowTradeRoutes] = useState<boolean>(true);
  const [showDialogues, setShowDialogues] = useState<boolean>(true);
  const [showAnomalies, setShowAnomalies] = useState<boolean>(true);
  const [showWeatherEffects, setShowWeatherEffects] = useState<boolean>(true);

  // Weather Dropdown UI State
  const [showWeatherMenu, setShowWeatherMenu] = useState<boolean>(false);

  // Hover & mouse coordinates
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Weather particle simulation pool
  const particlesRef = useRef<Particle[]>([]);
  const tickRef = useRef<number>(0);

  // Initialize and update particles
  const updateParticles = useCallback((w?: WeatherState) => {
    if (!w || w.currentType === 'clear') {
      particlesRef.current = [];
      return;
    }

    const maxCount = w.currentType === 'acid_rain' ? 120 :
                     w.currentType === 'sandstorm' ? 140 :
                     w.currentType === 'solar_flare' ? 80 :
                     w.currentType === 'cooling_period' ? 90 :
                     w.currentType === 'ion_tempest' ? 60 : 70;

    let pool = particlesRef.current;

    // Spawn new particles
    while (pool.length < maxCount) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      let pColor = '#ffffff';
      let size = Math.random() * 2 + 1;
      const wx = w.windVector?.x || 0;
      const wy = w.windVector?.y || 0;
      let vx = wx * 1.5 + (Math.random() - 0.5);
      let vy = wy * 1.5 + (Math.random() - 0.5);

      if (w.currentType === 'solar_flare') {
        pColor = Math.random() > 0.4 ? '#f59e0b' : '#ef4444';
        size = Math.random() * 3 + 1.5;
        vy = (Math.random() - 0.5) * 2;
      } else if (w.currentType === 'acid_rain') {
        pColor = '#84cc16';
        size = Math.random() * 2 + 1;
        vx = wx * 1.2 - 0.5;
        vy = Math.random() * 6 + 4;
      } else if (w.currentType === 'cooling_period') {
        pColor = '#38bdf8';
        size = Math.random() * 2.5 + 1;
        vy = Math.random() * 1.5 + 0.5;
        vx += (Math.random() - 0.5) * 0.8;
      } else if (w.currentType === 'ion_tempest') {
        pColor = Math.random() > 0.5 ? '#a855f7' : '#06b6d4';
        size = Math.random() * 3 + 1;
        vx = (Math.random() - 0.5) * 5;
        vy = (Math.random() - 0.5) * 5;
      } else if (w.currentType === 'sandstorm') {
        pColor = '#d97706';
        size = Math.random() * 2.5 + 1;
        vx = (wx || 1) * 6 + Math.random() * 3;
        vy = wy * 2 + (Math.random() - 0.5) * 2;
      } else if (w.currentType === 'mutagenic_monsoon') {
        pColor = '#ec4899';
        size = Math.random() * 3 + 1.5;
        vy = Math.random() * 2.5 + 1;
      }

      pool.push({
        x: Math.random() * config.width,
        y: Math.random() * config.height,
        vx,
        vy,
        size,
        alpha: Math.random() * 0.7 + 0.3,
        color: pColor,
        life: 0,
        maxLife: Math.floor(Math.random() * 100 + 50)
      });
    }

    // Step existing particles
    for (let i = pool.length - 1; i >= 0; i--) {
      const p = pool[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      // Wrap around world
      if (p.x < 0) p.x = config.width;
      if (p.x > config.width) p.x = 0;
      if (p.y < 0) p.y = config.height;
      if (p.y > config.height) p.y = 0;

      if (p.life >= p.maxLife) {
        p.life = 0;
        p.x = Math.random() * config.width;
        p.y = Math.random() * config.height;
      }
    }

    particlesRef.current = pool;
  }, [config.width, config.height]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      tickRef.current++;
      // Dynamic resolution sizing
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply Pan & Zoom
      ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-config.width / 2, -config.height / 2);

      // 1. Draw World Background & Biome Grid
      drawWorldBackdrop(ctx, config);

      // 2. Draw Faction Territories (if enabled)
      if (showTerritories) {
        drawTerritories(ctx, factions);
      }

      // 3. Draw Cosmic Anomalies & Physics Fields
      if (showAnomalies && anomalies.length > 0) {
        drawCosmicAnomalies(ctx, anomalies);
      }

      // 4. Draw Trade Routes
      if (showTradeRoutes) {
        drawTradeRoutes(ctx, buildings, agents);
      }

      // 5. Draw Resource Nodes
      drawResources(ctx, resources);

      // 6. Draw Buildings & Settlements
      drawBuildings(ctx, buildings, factions);

      // 7. Draw Disasters & Dynamic Environmental Hazards
      drawDisasters(ctx, disasters);

      // 8. Draw Autonomous Agents (with Shelter Shields & Metabolic Stress Indicators)
      drawAgents(ctx, agents, buildings, weather, selectedAgentId, showVision, showLabels);

      // 9. Draw Atmospheric Weather & Particles
      if (showWeatherEffects && weather) {
        updateParticles(weather);
        drawWeatherAtmosphere(ctx, weather, config);
      }

      // 10. Draw Holographic Speech Bubbles
      if (showDialogues && dialogues.length > 0) {
        drawHoloDialogues(ctx, dialogues);
      }

      // 11. Draw Cosmic Tool Reticle Preview if active
      if (cosmicTool && cosmicTool !== 'none' && hoverPos) {
        drawToolReticle(ctx, cosmicTool, hoverPos.x, hoverPos.y);
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    config,
    agents,
    factions,
    resources,
    buildings,
    disasters,
    anomalies,
    dialogues,
    weather,
    selectedAgentId,
    zoom,
    pan,
    showVision,
    showTerritories,
    showLabels,
    showTradeRoutes,
    showDialogues,
    showAnomalies,
    showWeatherEffects,
    cosmicTool,
    hoverPos,
    updateParticles
  ]);

  // Helper Drawing Functions
  const drawWorldBackdrop = (ctx: CanvasRenderingContext2D, cfg: WorldConfig) => {
    ctx.fillStyle = cfg.biomeType === 'wasteland' ? '#0d0907' :
                    cfg.biomeType === 'cosmic' ? '#030612' :
                    cfg.biomeType === 'primordial_sea' ? '#031214' : '#070c1b';
    ctx.fillRect(0, 0, cfg.width, cfg.height);

    // Subtle Grid lines
    ctx.strokeStyle = cfg.biomeType === 'wasteland' ? 'rgba(249, 115, 22, 0.08)' :
                      cfg.biomeType === 'cosmic' ? 'rgba(168, 85, 247, 0.08)' :
                      cfg.biomeType === 'primordial_sea' ? 'rgba(20, 184, 166, 0.08)' : 'rgba(56, 189, 248, 0.06)';
    ctx.lineWidth = 1;

    const gridSize = 40;
    ctx.beginPath();
    for (let x = 0; x <= cfg.width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cfg.height);
    }
    for (let y = 0; y <= cfg.height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(cfg.width, y);
    }
    ctx.stroke();

    // World Outer Neon Border
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, cfg.width, cfg.height);
  };

  const drawTerritories = (ctx: CanvasRenderingContext2D, facs: Faction[]) => {
    facs.forEach((f) => {
      const grad = ctx.createRadialGradient(
        f.territoryCenter.x,
        f.territoryCenter.y,
        10,
        f.territoryCenter.x,
        f.territoryCenter.y,
        f.territoryRadius
      );
      grad.addColorStop(0, `${f.color}22`);
      grad.addColorStop(0.7, `${f.color}0a`);
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.territoryCenter.x, f.territoryCenter.y, f.territoryRadius, 0, Math.PI * 2);
      ctx.fill();

      // Border circle
      ctx.strokeStyle = `${f.color}44`;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    });
  };

  const drawCosmicAnomalies = (ctx: CanvasRenderingContext2D, anoms: CosmicAnomaly[]) => {
    const time = Date.now() * 0.003;
    anoms.forEach(a => {
      if (a.type === 'black_hole') {
        // Gravitational singularity
        const grad = ctx.createRadialGradient(a.x, a.y, 5, a.x, a.y, a.radius);
        grad.addColorStop(0, '#000000');
        grad.addColorStop(0.3, '#3b0764');
        grad.addColorStop(0.7, 'rgba(168, 85, 247, 0.2)');
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
        ctx.fill();

        // Accretion disk rings
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius * 0.4 + Math.sin(time) * 4, time, time + Math.PI * 1.6);
        ctx.stroke();

        ctx.fillStyle = '#f3e8ff';
        ctx.font = 'bold 10px Fira Code, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ SINGULARITY', a.x, a.y - a.radius - 4);
      } else if (a.type === 'mutagenic_fog') {
        // Biohazard mutagen mist
        const grad = ctx.createRadialGradient(a.x, a.y, 5, a.x, a.y, a.radius);
        grad.addColorStop(0, 'rgba(132, 204, 22, 0.4)');
        grad.addColorStop(0.7, 'rgba(132, 204, 22, 0.12)');
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#bef264';
        ctx.font = 'bold 10px Fira Code, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('☣ MUTAGENIC MIST', a.x, a.y - a.radius - 4);
      } else if (a.type === 'chrono_vortex') {
        // Chrono vortex
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius, time * 2, time * 2 + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#67e8f9';
        ctx.font = 'bold 10px Fira Code, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⏳ CHRONO VORTEX', a.x, a.y - a.radius - 4);
      } else if (a.type === 'obsidian_mountain') {
        // Solid rock barrier
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const pts = 6;
        for (let i = 0; i < pts; i++) {
          const ang = (i * Math.PI * 2) / pts;
          const r = a.radius * (0.8 + (i % 2 === 0 ? 0.2 : 0));
          const px = a.x + Math.cos(ang) * r;
          const py = a.y + Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 10px Fira Code, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⛰ OBSIDIAN CRAG', a.x, a.y + a.radius + 12);
      } else if (a.type === 'hydro_oasis') {
        // Restorative oasis
        const grad = ctx.createRadialGradient(a.x, a.y, 5, a.x, a.y, a.radius);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
        grad.addColorStop(0.7, 'rgba(56, 189, 248, 0.15)');
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10px Fira Code, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('💧 HYDRO SANCTUARY', a.x, a.y - a.radius - 4);
      }
    });
  };

  const drawTradeRoutes = (ctx: CanvasRenderingContext2D, blds: Building[], ags: Agent[]) => {
    const markets = blds.filter(b => b.type === 'market_bazaar' || b.type === 'space_dock' || b.type === 'settlement');
    for (let i = 0; i < markets.length; i++) {
      for (let j = i + 1; j < markets.length; j++) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.moveTo(markets[i].x, markets[i].y);
        ctx.lineTo(markets[j].x, markets[j].y);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
  };

  const drawResources = (ctx: CanvasRenderingContext2D, resList: ResourceNode[]) => {
    resList.forEach((r) => {
      const pct = Math.max(0.1, r.amount / r.maxAmount);
      const currentRadius = r.radius * (0.6 + pct * 0.4);

      // Glow aura
      const aura = ctx.createRadialGradient(r.x, r.y, 2, r.x, r.y, currentRadius * 1.6);
      aura.addColorStop(0, `${r.color}66`);
      aura.addColorStop(0.7, `${r.color}15`);
      aura.addColorStop(1, 'transparent');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(r.x, r.y, currentRadius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Core Node
      ctx.fillStyle = r.color;
      ctx.beginPath();
      ctx.arc(r.x, r.y, currentRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff88';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label & Amount
      ctx.fillStyle = '#ffffff';
      ctx.font = '9px Fira Code, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${r.type.toUpperCase()}`, r.x, r.y - currentRadius - 4);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`${Math.round(r.amount)}`, r.x, r.y + currentRadius + 11);
    });
  };

  const drawBuildings = (ctx: CanvasRenderingContext2D, blds: Building[], facs: Faction[]) => {
    blds.forEach((b) => {
      const faction = facs.find(f => f.id === b.factionId);
      const color = faction ? faction.color : '#38bdf8';

      ctx.fillStyle = `${color}33`;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      ctx.beginPath();
      if (b.type === 'settlement' || b.type === 'shelter') {
        const size = 18;
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const px = b.x + size * Math.cos(angle);
          const py = b.y + size * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else if (b.type === 'market_bazaar' || b.type === 'space_dock') {
        const size = 16;
        ctx.moveTo(b.x, b.y - size);
        ctx.lineTo(b.x + size, b.y);
        ctx.lineTo(b.x, b.y + size);
        ctx.lineTo(b.x - size, b.y);
        ctx.closePath();
      } else {
        ctx.rect(b.x - 12, b.y - 12, 24, 24);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.name, b.x, b.y + 26);
    });
  };

  const drawDisasters = (ctx: CanvasRenderingContext2D, dList: DisasterEvent[]) => {
    dList.forEach((d) => {
      const radius = d.radius * (0.8 + Math.sin(Date.now() * 0.005) * 0.2);

      ctx.strokeStyle = d.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const cloud = ctx.createRadialGradient(d.x, d.y, 5, d.x, d.y, radius);
      cloud.addColorStop(0, `${d.color}77`);
      cloud.addColorStop(0.8, `${d.color}22`);
      cloud.addColorStop(1, 'transparent');
      ctx.fillStyle = cloud;
      ctx.beginPath();
      ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = d.color;
      ctx.font = 'bold 11px Fira Code, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`⚠️ ${d.name.toUpperCase()}`, d.x, d.y);
    });
  };

  const drawAgents = (
    ctx: CanvasRenderingContext2D,
    agentList: Agent[],
    blds: Building[],
    w: WeatherState | undefined,
    selectedId: string | null,
    showVis: boolean,
    showLbl: boolean
  ) => {
    agentList.forEach((a) => {
      const isSelected = a.id === selectedId;

      // Check if agent is inside shelter enclave
      const inShelter = blds.some(b => Math.hypot(b.x - a.x, b.y - a.y) < b.influenceRadius);

      // Shelter protection aura
      if (inShelter && w && w.currentType !== 'clear') {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.size + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Harsh weather metabolic stress aura if exposed outside shelter
      if (!inShelter && w && w.effects.metabolismMultiplier > 1.3) {
        ctx.strokeStyle = w.currentType === 'cooling_period' ? 'rgba(56, 189, 248, 0.5)' :
                          w.currentType === 'acid_rain' ? 'rgba(132, 204, 22, 0.5)' :
                          w.currentType === 'solar_flare' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(217, 119, 6, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.size + 5 + Math.sin(Date.now() * 0.01) * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (showVis || isSelected) {
        ctx.strokeStyle = isSelected ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.08)';
        ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.05)' : 'transparent';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.genetics.visionRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      if (isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.size + 8, 0, Math.PI * 2);
        ctx.stroke();

        if (a.targetX && a.targetY) {
          ctx.strokeStyle = '#38bdf888';
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(a.targetX, a.targetY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      const heading = Math.atan2(a.vy, a.vx);

      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(heading);

      ctx.fillStyle = a.color;
      ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;

      if (a.role === 'Warrior' || a.role === 'Predator') {
        ctx.beginPath();
        ctx.moveTo(a.size + 4, 0);
        ctx.lineTo(-a.size, -a.size);
        ctx.lineTo(-a.size * 0.5, 0);
        ctx.lineTo(-a.size, a.size);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (a.role === 'Trader') {
        ctx.beginPath();
        ctx.moveTo(a.size + 2, 0);
        ctx.lineTo(0, -a.size);
        ctx.lineTo(-a.size - 2, 0);
        ctx.lineTo(0, a.size);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, a.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(a.size * 0.6, 0, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      const healthPct = a.health / a.maxHealth;
      ctx.strokeStyle = healthPct > 0.5 ? '#10b981' : healthPct > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.size + 3, -Math.PI / 2, -Math.PI / 2 + healthPct * Math.PI * 2);
      ctx.stroke();

      if (showLbl || isSelected) {
        ctx.fillStyle = isSelected ? '#38bdf8' : '#e2e8f0';
        ctx.font = isSelected ? 'bold 10px Plus Jakarta Sans' : '9px Plus Jakarta Sans';
        ctx.textAlign = 'center';
        ctx.fillText(a.name, a.x, a.y - a.size - 7);
      }
    });
  };

  const drawWeatherAtmosphere = (
    ctx: CanvasRenderingContext2D,
    w: WeatherState,
    cfg: WorldConfig
  ) => {
    if (w.currentType === 'clear') return;

    // 1. Ambient atmospheric glow / haze
    const intensity = w.intensity || 0.5;
    let ambientColor = 'rgba(0,0,0,0)';

    if (w.currentType === 'solar_flare') {
      ambientColor = `rgba(245, 158, 11, ${0.08 * intensity})`;
    } else if (w.currentType === 'acid_rain') {
      ambientColor = `rgba(132, 204, 22, ${0.09 * intensity})`;
    } else if (w.currentType === 'cooling_period') {
      ambientColor = `rgba(56, 189, 248, ${0.08 * intensity})`;
    } else if (w.currentType === 'ion_tempest') {
      ambientColor = `rgba(168, 85, 247, ${0.09 * intensity})`;
    } else if (w.currentType === 'sandstorm') {
      ambientColor = `rgba(217, 119, 6, ${0.12 * intensity})`;
    } else if (w.currentType === 'mutagenic_monsoon') {
      ambientColor = `rgba(236, 72, 153, ${0.08 * intensity})`;
    }

    ctx.fillStyle = ambientColor;
    ctx.fillRect(0, 0, cfg.width, cfg.height);

    // 2. Weather particles
    const pool = particlesRef.current;
    pool.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (w.currentType === 'acid_rain') {
        // Falling rain streaks
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 2);
        ctx.stroke();
      } else if (w.currentType === 'solar_flare') {
        // Shimmering radiant heat mote
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (w.currentType === 'cooling_period') {
        // Hexagonal frost snowflake
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (w.currentType === 'ion_tempest') {
        // Static spark bolt
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + (Math.random() - 0.5) * 8, p.y + (Math.random() - 0.5) * 8);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  };

  const drawHoloDialogues = (ctx: CanvasRenderingContext2D, diags: AgentDialogue[]) => {
    diags.forEach(d => {
      const text = d.text;
      ctx.font = '10px Plus Jakarta Sans, sans-serif';
      const textWidth = ctx.measureText(text).width;
      const boxWidth = Math.max(120, textWidth + 24);
      const boxHeight = 36;
      const x = d.x - boxWidth / 2;
      const y = d.y - boxHeight;

      // Glowing holographic card
      const catColor =
        d.category === 'trade' ? '#f59e0b' :
        d.category === 'combat' ? '#ef4444' :
        d.category === 'reproduction' ? '#ec4899' :
        d.category === 'diplomacy' ? '#38bdf8' : '#a855f7';

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = `${catColor}aa`;
      ctx.lineWidth = 1.5;

      // Rounded rectangle
      ctx.beginPath();
      ctx.roundRect(x, y, boxWidth, boxHeight, 6);
      ctx.fill();
      ctx.stroke();

      // Speaker monikers badge
      ctx.fillStyle = catColor;
      ctx.font = 'bold 8px Fira Code, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${d.category.toUpperCase()} • ${d.agent1Name}`, x + 8, y + 12);

      // Speech text
      ctx.fillStyle = '#f8fafc';
      ctx.font = '10px Plus Jakarta Sans, sans-serif';
      ctx.fillText(text, x + 8, y + 26);
    });
  };

  const drawToolReticle = (ctx: CanvasRenderingContext2D, tool: string, mx: number, my: number) => {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(mx, my, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '10px Fira Code, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`TOOL: ${tool.toUpperCase()}`, mx, my + 54);
  };

  // Mouse / Canvas Click & Drag Handling
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.shiftKey || cosmicTool === 'none') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Convert screen coordinates to world coordinates
    const worldX = (clientX - (canvas.width / 2 + pan.x)) / zoom + config.width / 2;
    const worldY = (clientY - (canvas.height / 2 + pan.y)) / zoom + config.height / 2;
    setHoverPos({ x: worldX, y: worldY });

    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const worldX = (clientX - (canvas.width / 2 + pan.x)) / zoom + config.width / 2;
    const worldY = (clientY - (canvas.height / 2 + pan.y)) / zoom + config.height / 2;

    // If a cosmic tool or spawn brush is active
    if (cosmicTool && cosmicTool !== 'none') {
      onCanvasClickSpawn?.(worldX, worldY);
      return;
    }

    if (spawnMode) {
      onCanvasClickSpawn?.(worldX, worldY);
      return;
    }

    // Agent selection
    const clickedAgent = agents.find(
      a => Math.hypot(a.x - worldX, a.y - worldY) < a.size + 12
    );

    if (clickedAgent) {
      onSelectAgent(clickedAgent.id);
    } else {
      onSelectAgent(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom(prev => Math.max(0.4, Math.min(3.5, prev * zoomFactor)));
  };

  const resetViewport = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      id="simulation-canvas-container"
      ref={containerRef}
      className="relative w-full h-[600px] lg:h-[680px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col"
    >
      <canvas
        id="synthetic-reality-canvas"
        ref={canvasRef}
        className="w-full h-full cursor-crosshair block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleCanvasClick}
        onWheel={handleWheel}
      />

      {/* Floating Canvas Controls Overlay */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-800 shadow-lg text-xs text-slate-300">
        <button
          id="btn-zoom-in"
          onClick={() => setZoom(z => Math.min(3.5, z * 1.2))}
          className="p-1.5 hover:bg-slate-800 hover:text-sky-400 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          id="btn-zoom-out"
          onClick={() => setZoom(z => Math.max(0.4, z / 1.2))}
          className="p-1.5 hover:bg-slate-800 hover:text-sky-400 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          id="btn-zoom-reset"
          onClick={resetViewport}
          className="p-1.5 hover:bg-slate-800 hover:text-sky-400 rounded transition-colors"
          title="Reset Camera"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-slate-800" />
        <span className="font-mono text-slate-400">{Math.round(zoom * 100)}%</span>
      </div>

      {/* Layer Visibility Pills */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 shadow-lg text-xs">
        <button
          id="btn-toggle-territories"
          onClick={() => setShowTerritories(!showTerritories)}
          className={`px-2 py-1 rounded font-medium transition-colors ${
            showTerritories ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Territories
        </button>
        <button
          id="btn-toggle-vision"
          onClick={() => setShowVision(!showVision)}
          className={`px-2 py-1 rounded font-medium transition-colors ${
            showVision ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Radar
        </button>
        <button
          id="btn-toggle-dialogues"
          onClick={() => setShowDialogues(!showDialogues)}
          className={`px-2 py-1 rounded font-medium transition-colors ${
            showDialogues ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Holo-Speech
        </button>
        <button
          id="btn-toggle-anomalies"
          onClick={() => setShowAnomalies(!showAnomalies)}
          className={`px-2 py-1 rounded font-medium transition-colors ${
            showAnomalies ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Cosmic Physics
        </button>
        <button
          id="btn-toggle-weather-fx"
          onClick={() => setShowWeatherEffects(!showWeatherEffects)}
          className={`px-2 py-1 rounded font-medium transition-colors ${
            showWeatherEffects ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Atmosphere
        </button>
      </div>

      {/* Dynamic Climate & Weather Control Widget */}
      {weather && (
        <div className="absolute top-16 right-4 z-20 flex flex-col items-end">
          <div className="bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 shadow-xl flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-800/80 text-amber-400">
                {weather.currentType === 'solar_flare' && <Sun className="w-4 h-4 animate-pulse text-amber-400" />}
                {weather.currentType === 'acid_rain' && <Droplets className="w-4 h-4 animate-bounce text-lime-400" />}
                {weather.currentType === 'cooling_period' && <Snowflake className="w-4 h-4 animate-spin text-sky-400" />}
                {weather.currentType === 'ion_tempest' && <Zap className="w-4 h-4 animate-pulse text-purple-400" />}
                {weather.currentType === 'sandstorm' && <Wind className="w-4 h-4 animate-pulse text-amber-600" />}
                {weather.currentType === 'mutagenic_monsoon' && <Activity className="w-4 h-4 animate-pulse text-pink-400" />}
                {weather.currentType === 'clear' && <Sun className="w-4 h-4 text-emerald-400" />}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs text-slate-100">{weather.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ({Math.max(0, Math.round(weather.duration))} ticks)
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-300">
                  <span className={weather.effects.metabolismMultiplier > 1 ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
                    Metab: {weather.effects.metabolismMultiplier.toFixed(1)}x
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className={weather.effects.energyDrainRate > 1 ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                    Drain: {weather.effects.energyDrainRate.toFixed(1)}x
                  </span>
                </div>
              </div>
            </div>

            {/* Climate Switcher Button */}
            {onSetWeather && (
              <div className="relative">
                <button
                  id="btn-weather-menu"
                  onClick={() => setShowWeatherMenu(!showWeatherMenu)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 border border-slate-700 transition-colors"
                  title="Force Climate Cycle"
                >
                  <span>Climate</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showWeatherMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-1 z-30 flex flex-col gap-0.5">
                    <div className="px-2 py-1 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                      Force Climate Event
                    </div>
                    {[
                      { type: 'clear' as WeatherType, label: 'Clear Skies', icon: '☀️', color: 'text-emerald-400' },
                      { type: 'solar_flare' as WeatherType, label: 'Solar Flare (Metabolism 1.8x)', icon: '🔥', color: 'text-amber-400' },
                      { type: 'acid_rain' as WeatherType, label: 'Acid Rain (Health/Drain)', icon: '☣️', color: 'text-lime-400' },
                      { type: 'cooling_period' as WeatherType, label: 'Cooling Period (Slow/Drain)', icon: '❄️', color: 'text-sky-400' },
                      { type: 'ion_tempest' as WeatherType, label: 'Ion Tempest (Static Disrupt)', icon: '⚡', color: 'text-purple-400' },
                      { type: 'sandstorm' as WeatherType, label: 'Sandstorm (Vision 0.4x)', icon: '🌪️', color: 'text-amber-500' },
                      { type: 'mutagenic_monsoon' as WeatherType, label: 'Mutagenic Monsoon', icon: '🧬', color: 'text-pink-400' }
                    ].map(item => (
                      <button
                        key={item.type}
                        id={`btn-weather-select-${item.type}`}
                        onClick={() => {
                          onSetWeather(item.type);
                          setShowWeatherMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center gap-2 hover:bg-slate-800 transition-colors ${
                          weather.currentType === item.type ? 'bg-slate-800/90 font-medium' : ''
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span className={item.color}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Coordinates & Entity HUD */}
      <div className="absolute bottom-3 left-4 flex items-center gap-3 bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-md border border-slate-800 text-[11px] font-mono text-slate-400">
        <span>X: {hoverPos ? Math.round(hoverPos.x) : 0}</span>
        <span>Y: {hoverPos ? Math.round(hoverPos.y) : 0}</span>
        <div className="h-3 w-px bg-slate-800" />
        <span className="text-sky-400">{agents.length} Entities</span>
        <span className="text-emerald-400">{resources.length} Nodes</span>
        {anomalies.length > 0 && <span className="text-purple-400">{anomalies.length} Anomalies</span>}
      </div>
    </div>
  );
};
