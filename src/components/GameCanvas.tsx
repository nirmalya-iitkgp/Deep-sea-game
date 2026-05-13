import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Engine, Sector, Edge, Point } from '../game/engine';
import { CellularAutomata } from '../game/ca';
import { COLORS, LEVELS, GAME_BOUNDS } from '../game/constants';
import { GameState, encodeState, decodeState } from '../game/state';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Zap, Cpu, Compass, ShieldAlert, Award, Grid, MousePointer2, Hammer, Loader2 } from 'lucide-react';
import Menu from './Menu';

type InteractionMode = 'BUILD' | 'WELD';

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [levelIdx, setLevelIdx] = useState<number | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [ca, setCa] = useState<CellularAutomata | null>(null);
  const [mst, setMst] = useState<Edge[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [mode, setMode] = useState<InteractionMode>('BUILD');
  const [hoveredSector, setHoveredSector] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [pulses, setPulses] = useState<{ x: number, y: number, r: number, life: number }[]>([]);

  // Resize Handler
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Initialize from Hash or Menu
  const startGame = useCallback((lvl: number) => {
    const seed = `ABYSS-${Math.floor(Math.random() * 999)}`;
    const newEngine = new Engine(seed);
    // Use fixed logical dimensions for the map generation
    const initialSectors = newEngine.generateMap(GAME_BOUNDS.width, GAME_BOUNDS.height, LEVELS[lvl].cells, lvl);
    
    const initialGameState: GameState = {
      seed,
      level: lvl,
      energy: LEVELS[lvl].energy,
      cable: 100,
      revealedSectors: [0],
      builtCables: [0],
      vents: initialSectors.filter(s => s.isVent).map(s => s.id),
      relics: initialSectors.filter(s => s.isRelic).map(s => s.id),
      foundRelics: [],
      drones: [],
      droneEfficiency: 0
    };

    setEngine(newEngine);
    setSectors(initialSectors);
    setGameState(initialGameState);
    setCa(new CellularAutomata(80, 120));
    setLevelIdx(lvl);
    setGameOver(false);
    setWon(false);
    
    // Seed CA
    const tempCa = new CellularAutomata(80, 120);
    for(let i=0; i < (lvl + 1) * 2; i++) {
        tempCa.seedPattern(LEVELS[lvl].caType, Math.floor(newEngine.random() * 110), Math.floor(newEngine.random() * 70));
    }
    setCa(tempCa);
  }, []);

  const getRank = useCallback(() => {
    if (!gameState || levelIdx === null) return 'C';
    const energyRatio = gameState.energy / LEVELS[levelIdx].energy;
    if (energyRatio > 0.8) return 'S';
    if (energyRatio > 0.5) return 'A';
    if (energyRatio > 0.3) return 'B';
    return 'C';
  }, [gameState, levelIdx]);

  useEffect(() => {
    // Commented out to prevent auto-skipping the menu if user has stale hash
    /*
    const hash = window.location.hash.slice(1);
    const saved = decodeState(hash);
    if (saved && saved.level !== undefined) {
      startGame(saved.level);
    }
    */
  }, [startGame]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setMode(prev => prev === 'BUILD' ? 'WELD' : 'BUILD');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Compute MST
  useEffect(() => {
    if (!engine || !gameState) return;
    const ventSectors = sectors.filter(s => gameState.vents.includes(s.id) && gameState.revealedSectors.includes(s.id));
    ventSectors.push(sectors[0]);
    if (ventSectors.length > 1) {
      setMst(engine.getMST(ventSectors));
    }
  }, [gameState?.revealedSectors, sectors, engine]);

  // Game Loop
  useEffect(() => {
    if (!gameState || !engine || gameOver) return;

    const interval = setInterval(() => {
      setGameState(prev => {
        if (!prev || levelIdx === null) return null;
        
        // CA damage check: if a CA cell overlaps a power line (connector between 2 built sectors)
        // For simplicity, let's just say random energy drain if CA exists
        let damage = 0;
        if (ca) {
           // Small chance of energetic drain per active CA cell
           damage = 0.005; 
        }

        let newEnergy = prev.energy - (0.05 * Math.max(0.2, 1 - prev.droneEfficiency * 0.15)) - damage; 
        const newDrones = [...prev.drones];
        const newFoundRelics = [...prev.foundRelics];
        const newTexts: FloatingText[] = [];

        // Check for found relics
        prev.revealedSectors.forEach(id => {
           if (prev.relics.includes(id) && !newFoundRelics.includes(id)) {
              newFoundRelics.push(id);
              newEnergy += 50; // Relic boost!
              const s = sectors[id];
              newTexts.push({ 
                id: Math.random(), 
                x: s.centroid.x, 
                y: s.centroid.y, 
                text: 'ANCIENT RELIC FOUND +50', 
                color: '#FFD700', 
                life: 1 
              });
           }
        });

        newDrones.forEach((drone, idx) => {
          drone.progress += 0.02 + (prev.droneEfficiency * 0.005);
          if (drone.progress >= 1) {
            if (drone.target === 0) {
              const energyVal = 15 + (prev.droneEfficiency * 2);
              newEnergy += energyVal;
              newTexts.push({
                id: Math.random(),
                x: sectors[0].centroid.x,
                y: sectors[0].centroid.y - 10,
                text: `+${energyVal}`,
                color: '#00FFFF',
                life: 1
              });

              const vent = prev.vents[Math.floor(Math.random() * prev.vents.length)];
              const path = engine.findAStarPath(0, vent, sectors, prev.builtCables);
              if (path) {
                newDrones[idx] = { pos: 0, target: vent, path, progress: 0 };
              } else {
                 newDrones.splice(idx, 1);
              }
            } else {
              const path = engine.findAStarPath(drone.target, 0, sectors, prev.builtCables);
              if (path) {
                newDrones[idx] = { pos: drone.target, target: 0, path, progress: 0 };
              }
            }
          }
        });

        if (newEnergy <= 0) {
          setGameOver(true);
          setWon(false);
          return { ...prev, energy: 0 };
        }

        const connectedVents = prev.vents.filter(v => prev.builtCables.includes(v));
        if (connectedVents.length >= LEVELS[levelIdx].ventsToConnect) {
           setWon(true);
           setGameOver(true);
        }

        const newState: GameState = { ...prev, energy: newEnergy, drones: newDrones, foundRelics: newFoundRelics };
        if (Math.random() < 0.05) window.location.hash = encodeState(newState);

        // Update floating texts and pulses
        setFloatingTexts(prevTexts => 
          [...prevTexts, ...newTexts]
            .map(t => ({ ...t, life: t.life - 0.05, y: t.y - 1 }))
            .filter(t => t.life > 0)
        );
        setPulses(prevPulses => 
          prevPulses
            .map(p => ({ ...p, r: p.r + 10, life: p.life - 0.05 }))
            .filter(p => p.life > 0)
        );

        return newState;
      });

      ca?.step();
    }, 100);

    return () => clearInterval(interval);
  }, [gameState, engine, gameOver, levelIdx, ca, sectors]);

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Save context for scaling
      ctx.save();
      const scaleX = canvas.width / GAME_BOUNDS.width;
      const scaleY = canvas.height / GAME_BOUNDS.height;
      ctx.scale(scaleX, scaleY);

      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, GAME_BOUNDS.width, GAME_BOUNDS.height);

      // Map Grid Lines (Subtle)
      ctx.strokeStyle = COLORS.uiGhost;
      ctx.setLineDash([2, 4]);
      sectors.forEach(s => {
        ctx.beginPath();
        if(s.polygon.length > 0) {
          ctx.moveTo(s.polygon[0][0], s.polygon[0][1]);
          s.polygon.forEach(p => ctx.lineTo(p[0], p[1]));
          ctx.closePath();
          ctx.stroke();
        }
      });
      ctx.setLineDash([]);

      // 1. Draw Sectors
      sectors.forEach(sector => {
        const isRevealed = gameState.revealedSectors.includes(sector.id);
        if (isRevealed) {
          if (sector.id === hoveredSector) {
             ctx.fillStyle = 'rgba(0, 255, 255, 0.05)';
             ctx.beginPath();
             sector.polygon.forEach((p, i) => i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
             ctx.fill();
          }

          if (sector.isVent) {
            ctx.fillStyle = COLORS.gold;
            ctx.beginPath();
            ctx.arc(sector.centroid.x, sector.centroid.y, 4, 0, Math.PI*2);
            ctx.fill();
            ctx.font = '8px monospace';
            ctx.fillText(`V-${sector.id}`, sector.centroid.x + 8, sector.centroid.y + 3);
          }

          if (sector.isRelic && !gameState.foundRelics.includes(sector.id)) {
             ctx.fillStyle = '#FFD700';
             ctx.strokeStyle = '#FFFFFF';
             ctx.lineWidth = 1;
             ctx.beginPath();
             ctx.moveTo(sector.centroid.x, sector.centroid.y - 4);
             ctx.lineTo(sector.centroid.x + 4, sector.centroid.y);
             ctx.lineTo(sector.centroid.x, sector.centroid.y + 4);
             ctx.lineTo(sector.centroid.x - 4, sector.centroid.y);
             ctx.fill();
             ctx.stroke();
          }
        } else {
           ctx.fillStyle = COLORS.fog;
           ctx.beginPath();
           sector.polygon.forEach((p, j) => j === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
           ctx.fill();
        }
      });

      // 2. Core
      ctx.fillStyle = COLORS.cyan;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sectors[0].centroid.x, sectors[0].centroid.y, 8, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();

      // 3. MST (Ghost)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.setLineDash([1, 8]);
      mst.forEach(edge => {
        const u = sectors[edge.u];
        const v = sectors[edge.v];
        ctx.beginPath();
        ctx.moveTo(u.centroid.x, u.centroid.y);
        ctx.lineTo(v.centroid.x, v.centroid.y);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // 4. Built Cables (Snap Logic)
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 2;
      gameState.builtCables.forEach(cId => {
        if(cId === 0) return;
        const s = sectors[cId];
        const neighbors = gameState.builtCables.filter(id => id !== cId);
        let nearest = 0;
        let minDist = Infinity;
        neighbors.forEach(nId => {
          const d = Math.hypot(s.centroid.x - sectors[nId].centroid.x, s.centroid.y - sectors[nId].centroid.y);
          if (d < minDist) { minDist = d; nearest = nId; }
        });
        ctx.beginPath();
        ctx.moveTo(s.centroid.x, s.centroid.y);
        ctx.lineTo(sectors[nearest].centroid.x, sectors[nearest].centroid.y);
        ctx.stroke();
      });
      ctx.lineWidth = 1;

      // 5. CA Cracks
      if (ca) {
        ctx.fillStyle = COLORS.magenta;
        const cellW = GAME_BOUNDS.width / ca.cols;
        const cellH = GAME_BOUNDS.height / ca.rows;
        for (let y = 0; y < ca.rows; y++) {
          for (let x = 0; x < ca.cols; x++) {
            if (ca.grid[y][x]) {
              ctx.fillRect(x * cellW, y * cellH, cellW-1, cellH-1);
            }
          }
        }
      }

      // 6. Drones (Following Path)
      gameState.drones.forEach(drone => {
         let x, y;
         if (drone.path && drone.path.length >= 2) {
            const segmentCount = drone.path.length - 1;
            const segmentIdx = Math.min(Math.floor(drone.progress * segmentCount), segmentCount - 1);
            const segmentProgress = (drone.progress * segmentCount) % 1;
            
            const start = sectors[drone.path[segmentIdx]].centroid;
            const end = sectors[drone.path[segmentIdx + 1]].centroid;
            
            x = start.x + (end.x - start.x) * segmentProgress;
            y = start.y + (end.y - start.y) * segmentProgress;
         } else {
            const start = sectors[drone.pos].centroid;
            const target = sectors[drone.target].centroid;
            x = start.x + (target.x - start.x) * drone.progress;
            y = start.y + (target.y - start.y) * drone.progress;
         }

         ctx.fillStyle = COLORS.gold;
         ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI*2); ctx.fill();
         ctx.strokeStyle = 'white'; ctx.stroke();
      });

      // 7. Pulses & Floating Texts
      pulses.forEach(p => {
         ctx.strokeStyle = `rgba(0, 255, 255, ${p.life})`;
         ctx.lineWidth = 2;
         ctx.beginPath();
         ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
         ctx.stroke();
      });

      floatingTexts.forEach(t => {
         ctx.fillStyle = t.color;
         ctx.globalAlpha = t.life;
         ctx.font = 'bold 10px monospace';
         ctx.textAlign = 'center';
         ctx.fillText(t.text, t.x, t.y);
         ctx.globalAlpha = 1;
      });

      // 8. Drag Line
      if (dragStart && mode === 'BUILD') {
         const isLowCable = (gameState?.cable || 0) < 10;
         ctx.strokeStyle = isLowCable ? '#FF00FF' : '#FFFFFF';
         ctx.lineWidth = 1.5;
         ctx.setLineDash([3, 3]);
         ctx.beginPath();
         ctx.moveTo(dragStart.x, dragStart.y);
         ctx.lineTo(mousePos.x, mousePos.y);
         ctx.stroke();
         ctx.setLineDash([]);
         ctx.lineWidth = 1;

         // Highlight potential target
         const target = sectors.find(sec => engine?.isPointInPolygon(mousePos, sec.polygon));
         if (target && gameState?.revealedSectors.includes(target.id) && !gameState.builtCables.includes(target.id)) {
            ctx.strokeStyle = isLowCable ? '#FF00FF' : COLORS.cyan;
            ctx.setLineDash([2, 1]);
            ctx.beginPath();
            target.polygon.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            ctx.closePath();
            ctx.stroke();
            ctx.setLineDash([]);
         }
      }

      ctx.restore();
      requestAnimationFrame(render);
    };
    render();
  }, [sectors, gameState, mst, ca, hoveredSector, dragStart, mousePos, mode]);

  const getLogicalCoords = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Map to logical coordinates
    const scaleX = GAME_BOUNDS.width / rect.width;
    const scaleY = GAME_BOUNDS.height / rect.height;
    return { x: x * scaleX, y: y * scaleY };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getLogicalCoords(e);
    setMousePos({ x, y });
    const s = sectors.find(sec => engine?.isPointInPolygon({ x, y }, sec.polygon));
    setHoveredSector(s ? s.id : null);

    // Weld interaction
    if (mode === 'WELD' && e.buttons === 1 && ca) {
       const cellX = Math.floor(x / (GAME_BOUNDS.width / ca.cols));
       const cellY = Math.floor(y / (GAME_BOUNDS.height / ca.rows));
       ca.safeSet(cellX, cellY, false);
    }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if (!gameState || gameState.energy < 15) return;
    const { x, y } = getLogicalCoords(e);
    const revealedIds = engine?.drunkardsWalk({ x, y }, 1000, sectors) || [];
    setPulses(prev => [...prev, { x, y, r: 0, life: 1 }]);
    setGameState(prev => prev ? ({
      ...prev,
      energy: prev.energy - 15,
      revealedSectors: Array.from(new Set([...prev.revealedSectors, ...revealedIds]))
    }) : null);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (mode === 'BUILD') {
      const { x, y } = getLogicalCoords(e);
      const s = sectors.find(sec => engine?.isPointInPolygon({ x, y }, sec.polygon));
      if (s && gameState?.builtCables.includes(s.id)) {
        setDragStart(s.centroid);
      }
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (dragStart && mode === 'BUILD') {
      const { x, y } = getLogicalCoords(e);
      const s = sectors.find(sec => engine?.isPointInPolygon({ x, y }, sec.polygon));
      
      if (s && gameState && gameState.revealedSectors.includes(s.id) && !gameState.builtCables.includes(s.id)) {
        buildCable(s.id);
      }
    }
    setDragStart(null);
  };

  const buildCable = (sectorId: number, isProbe = false) => {
    if (!gameState || (!isProbe && gameState.cable < 10) || gameState.builtCables.includes(sectorId)) {
      if (gameState && gameState.cable < 10 && !isProbe) {
        const s = sectors[sectorId] || { centroid: mousePos };
        setFloatingTexts(prev => [...prev, {
          id: Math.random(),
          x: s.centroid.x,
          y: s.centroid.y,
          text: 'INSUFFICIENT CABLE',
          color: '#FF00FF',
          life: 1
        }]);
      }
      return;
    }
    setGameState(prev => {
      if(!prev) return null;
      const isVent = sectors[sectorId].isVent;
      const path = engine?.findAStarPath(0, sectorId, sectors, [...prev.builtCables, sectorId]) || [];
      return {
        ...prev,
        cable: isProbe ? prev.cable : prev.cable - 10,
        builtCables: [...prev.builtCables, sectorId],
        drones: isVent ? [...prev.drones, { pos: 0, target: sectorId, path, progress: 0 }] : prev.drones
      };
    });
  };

  if (levelIdx === null) return <Menu onStart={startGame} />;

  return (
    <div className="flex flex-col md:flex-row w-full h-screen bg-[#00050A] text-[#00FFFF] font-mono select-none deep-sea-bg overflow-hidden">
      <div className="absolute inset-0 crt-overlay opacity-20 pointer-events-none z-50" />
      <div className="absolute inset-0 marine-snow pointer-events-none z-0" />
      <div className="caustics" />
      
      {/* COMMAND DECK ZONE */}
      <div className="flex-1 flex flex-col relative overflow-hidden min-w-0" ref={containerRef}>
        
        {/* RESOURCE HEADER */}
        <div className="h-12 border-b border-[#004466] flex items-center justify-between px-4 bg-black/80 backdrop-blur-md z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { window.location.hash = ''; setLevelIdx(null); }}
              className="p-1.5 hover:bg-[#00FFFF]/10 border border-[#004466] transition-all group"
              title="RETURN TO SURFACE"
            >
              <Grid className="w-4 h-4 text-[#00FFFF]/60 group-hover:text-[#00FFFF]" />
            </button>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-gold" />
              <span className="text-xs font-bold px-2 py-0.5 bg-gold/5 border border-gold/20">
                {Math.floor(gameState?.energy || 0)} POWER
              </span>
            </div>
          </div>

          {/* MISSION PROGRESS TRACKER */}
          <div className="flex items-center gap-4 px-4 h-full flex-1 justify-center max-w-sm mx-4">
             <div className="flex items-center gap-3">
                <div className="flex gap-1">
                   {Array(LEVELS[levelIdx!].ventsToConnect).fill(0).map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-2.5 h-2.5 border ${i < (gameState?.builtCables.filter(id => sectors[id]?.isVent).length || 0) ? 'bg-gold border-white' : 'border-[#004466]'}`} 
                      />
                   ))}
                </div>
                <span className="text-[11px] font-bold text-gold/80">
                   {gameState?.builtCables.filter(id => sectors[id]?.isVent).length || 0} / {LEVELS[levelIdx!].ventsToConnect}
                </span>
             </div>
          </div>

          <div className="w-24 hidden sm:block">
            {/* Empty space to balance header */}
          </div>
        </div>

        {/* TACTICAL MAP */}
        <div className="flex-1 relative bg-[#00050A]">
          <canvas 
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            onMouseMove={onMouseMove}
            onDoubleClick={onDoubleClick}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            className="w-full h-full cursor-none"
          />
          <div className="absolute inset-0 vignette pointer-events-none" />

          {/* CUSTOM CURSOR */}
          <div 
            className="absolute pointer-events-none z-[100] transform -translate-x-1/2 -translate-y-1/2"
            style={{ 
              left: `${(mousePos.x / GAME_BOUNDS.width) * 100}%`, 
              top: `${(mousePos.y / GAME_BOUNDS.height) * 100}%` 
            }}
          >
            {mode === 'BUILD' ? (
              <div className="w-8 h-8 md:w-10 md:h-10 border-2 border-white dashed-border animate-pulse" style={{ borderStyle: 'dashed' }} />
            ) : (
              <div className="w-8 h-8 md:w-10 md:h-10 border-2 border-magenta flex items-center justify-center">
                <Hammer className="w-4 h-4 md:w-5 md:h-5 text-magenta animate-bounce" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MINIMAL SIDEBAR */}
      <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-[#004466] bg-black/40 flex flex-col p-4 z-40 gap-4">
        <div className="flex-1 overflow-hidden space-y-6">
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#00FFFF]/40">Active Mission</div>
            <div className="text-xs text-white/80 font-bold">{gameState?.seed}</div>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold text-[#00FFFF]/40">Objective</div>
            <div className="text-[11px] leading-relaxed text-white/70 border-l-2 border-cyan pl-3">
              Connect <span className="text-gold font-bold">{LEVELS[levelIdx!].ventsToConnect}</span> Power Vents to the base.
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold text-[#00FFFF]/40">Relics Collected</div>
            <div className="flex gap-1.5 flex-wrap">
               {gameState?.foundRelics.map((r, i) => (
                  <div key={i} className="w-4 h-4 bg-gold rotate-45 flex items-center justify-center border border-white">
                    <div className="w-1 h-1 bg-black rounded-full" />
                  </div>
               ))}
               {gameState?.foundRelics.length === 0 && <span className="text-[9px] opacity-20 italic">Scanning...</span>}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold text-[#00FFFF]/40">Active Bots</div>
            <div className="space-y-2 max-h-32 md:max-h-none overflow-y-auto pr-2">
            {gameState?.drones.map((d, i) => (
              <div key={i} className="text-[9px] flex items-center justify-between opacity-80 border-l border-[#00FFFF]/20 pl-2">
                <span>BOT_{i}</span>
                <span className={d.target === 0 ? 'text-gold' : 'text-cyan'}>
                  {d.target === 0 ? 'RETURNING' : 'HARVESTING'}
                </span>
              </div>
            ))}
            {gameState?.drones.length === 0 && (
              <div className="text-[9px] text-white/20 italic">No bots active</div>
            )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#004466]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-[#00FFFF]/40">Upgrades</span>
            </div>
            <button 
              onClick={() => {
                if (!gameState || gameState.droneEfficiency >= 5) return;
                const cost = 50 * (gameState.droneEfficiency + 1);
                if (gameState.energy < cost) return;
                setGameState(prev => prev ? ({
                  ...prev,
                  energy: prev.energy - cost,
                  droneEfficiency: prev.droneEfficiency + 1
                }) : null);
              }}
              disabled={!gameState || gameState.droneEfficiency >= 5 || gameState.energy < (50 * (gameState.droneEfficiency + 1))}
              className="w-full py-2 bg-cyan/10 border border-cyan/30 text-[9px] hover:bg-cyan/20 transition-all cursor-pointer uppercase font-bold disabled:opacity-30 disabled:cursor-not-allowed group flex items-center justify-between px-3 mb-2"
            >
              <div className="flex items-center gap-2">
                <Cpu className="w-3 h-3" />
                <span>Drone Efficiency Lvl_{gameState?.droneEfficiency}</span>
              </div>
              <span className="text-gold">-{gameState ? 50 * (gameState.droneEfficiency + 1) : 0}</span>
            </button>

            <button 
              onClick={() => {
                if (!gameState || gameState.energy < 40) return;
                const unconnected = gameState.vents.filter(v => !gameState.builtCables.includes(v));
                if (unconnected.length > 0) {
                  setGameState(prev => prev ? ({ ...prev, energy: prev.energy - 40 }) : null);
                  buildCable(unconnected[0], true);
                }
              }}
              disabled={!gameState || gameState.energy < 40}
              className="w-full py-2 bg-gold/10 border border-gold/30 text-[9px] hover:bg-gold/20 transition-all cursor-pointer uppercase font-bold disabled:opacity-30"
            >
              Secure [Remote Vent Probe] 
              <div className="text-[7px] text-gold/60 mt-1">COST: 40 ENERGY | INSTANT LINK</div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pb-safe">
          <button 
             onClick={() => setMode('BUILD')}
             className={`py-3 border flex flex-col items-center gap-1 transition-all ${mode === 'BUILD' ? 'bg-[#00FFFF] text-black border-[#00FFFF]' : 'border-[#004466] opacity-50'}`}
          >
            <Zap className="w-4 h-4" />
            <span className="text-[8px] font-bold uppercase">Build</span>
          </button>
          <button 
             onClick={() => setMode('WELD')}
             className={`py-3 border flex flex-col items-center gap-1 transition-all ${mode === 'WELD' ? 'bg-magenta text-white border-magenta' : 'border-[#004466] opacity-50'}`}
          >
            <Hammer className="w-4 h-4" />
            <span className="text-[8px] font-bold uppercase">Fix</span>
          </button>
        </div>
      </div>

      {/* GAME OVER FEEDBACK */}
      <AnimatePresence>
        {gameOver && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-8">
            <div className={`p-10 border-2 ${won ? 'border-gold' : 'border-magenta'} text-center max-w-sm`}>
              {won && <div className="text-gold text-6xl font-bold mb-2 font-display italic">RANK {getRank()}</div>}
              <h2 className={`text-4xl font-display font-bold mb-4 ${won ? 'text-gold' : 'text-magenta'}`}>
                {won ? 'LEVEL CLEAR!' : 'BASE LOST'}
              </h2>
              <p className="text-xs mb-4 opacity-60 uppercase">{won ? 'All power sources connected. Base stable.' : 'Power depleted. The base has failed.'}</p>
              
              {won && (
                 <div className="grid grid-cols-2 gap-4 mb-8 text-[10px] text-left uppercase tracking-tighter opacity-80">
                    <div className="border border-white/10 p-2">
                       <div className="opacity-40">Artifacts Found</div>
                       <div className="text-gold font-bold">{gameState?.foundRelics.length} / {gameState?.relics.length}</div>
                    </div>
                    <div className="border border-white/10 p-2">
                       <div className="opacity-40">Final Efficiency</div>
                       <div className="text-cyan font-bold">{Math.floor((gameState?.energy || 0) / LEVELS[levelIdx!].energy * 100)}%</div>
                    </div>
                 </div>
              )}

              <button 
                onClick={() => { window.location.hash = ''; setLevelIdx(null); }}
                className={`w-full py-4 ${won ? 'bg-gold text-black' : 'bg-white/5 border border-white/20 hover:bg-white/10 text-white'} transition-all font-bold text-xs uppercase`}
              >
                {won ? 'Ascend to Surface' : 'Return to Surface'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameCanvas;
