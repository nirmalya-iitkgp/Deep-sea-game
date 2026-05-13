import { Engine, Sector, Edge } from './engine';
import { CellularAutomata } from './ca';

export interface GameState {
  seed: string;
  level: number;
  energy: number;
  cable: number;
  revealedSectors: number[];
  builtCables: number[]; // Sector IDs connected to the network
  vents: number[]; // Sector IDs that are vents
  relics: number[]; // Sector IDs that are relics
  foundRelics: number[]; // Sector IDs of found relics
  drones: { pos: number; target: number; path: number[]; progress: number }[];
  droneEfficiency: number; // 0 to 5 level
}

export function encodeState(state: GameState): string {
  const data = JSON.stringify({
    s: state.seed,
    l: state.level,
    e: Math.floor(state.energy),
    c: state.cable,
    r: state.revealedSectors,
    b: state.builtCables,
    v: state.vents,
    rl: state.relics,
    fr: state.foundRelics,
    de: state.droneEfficiency
  });
  return btoa(data);
}

export function decodeState(hash: string): Partial<GameState> | null {
  try {
    const data = JSON.parse(atob(hash));
    return {
      seed: data.s,
      level: data.l,
      energy: data.e,
      cable: data.c,
      revealedSectors: data.r,
      builtCables: data.b,
      vents: data.v,
      relics: data.rl || [],
      foundRelics: data.fr || [],
      droneEfficiency: data.de || 0
    };
  } catch (e) {
    return null;
  }
}
