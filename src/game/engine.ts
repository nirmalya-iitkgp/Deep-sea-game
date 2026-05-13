import { Delaunay } from 'd3-delaunay';
import seedrandom from 'seedrandom';

export interface Point {
  x: number;
  y: number;
}

export interface Sector {
  id: number;
  centroid: Point;
  polygon: number[][];
  type: string;
  revealed: boolean;
  isVent: boolean;
  isRelic?: boolean;
  cost: number;
}

export interface Edge {
  u: number; // sector index
  v: number;
  weight: number;
}

export class Engine {
  rng: any;
  seed: string;

  constructor(seed: string) {
    this.seed = seed;
    this.rng = seedrandom(seed);
  }

  // PRNG Helpers
  random() {
    return this.rng();
  }

  randomRange(min: number, max: number) {
    return this.random() * (max - min) + min;
  }

  // Voronoi Map Generation
  generateMap(width: number, height: number, n: number, levelIdx: number): Sector[] {
    const margin = 60;
    const points: [number, number][] = [];
    
    // Safety check for tiny dimensions
    const safeWidth = Math.max(width, margin * 3);
    const safeHeight = Math.max(height, margin * 3);

    // Always fixed core at center
    points.push([safeWidth / 2, safeHeight / 2]);
    
    for (let i = 1; i < n; i++) {
      points.push([
        margin + this.random() * (safeWidth - margin * 2), 
        margin + this.random() * (safeHeight - margin * 2)
      ]);
    }

    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, safeWidth, safeHeight]);
    
    const sectors: Sector[] = [];
    for (let i = 0; i < points.length; i++) {
      const poly = voronoi.cellPolygon(i);
      if (!poly) continue;
      const polygon = Array.from(poly) as number[][];
      const typeRoll = this.random();
      let type = 'stable';
      let cost = 1;

      if (levelIdx > 0 && typeRoll < 0.2) {
        type = 'volcanic';
        cost = 3;
      }

      sectors.push({
        id: i,
        centroid: { x: points[i][0], y: points[i][1] },
        polygon,
        type,
        revealed: i === 0, // Core revealed
        isVent: false,
        cost
      });
    }

    // Place Vents (avoiding core at 0)
    const ventCount = Math.min([3, 6, 10][levelIdx], sectors.length - 1);
    let placed = 0;
    // Map of sectors that are actually in the list
    const candidates = sectors.filter(s => s.id !== 0);
    
    while (placed < ventCount && candidates.length > 0) {
      const vIdx = Math.floor(this.random() * candidates.length);
      const targetSector = candidates[vIdx];
      if (!targetSector.isVent) {
        targetSector.isVent = true;
        candidates.splice(vIdx, 1);
        placed++;
      }
    }

    // Place Relics (randomly in the abyss)
    const relicCount = 4 + Math.floor(this.random() * 3);
    let relicsPlaced = 0;
    while (relicsPlaced < relicCount && candidates.length > 0) {
      const rIdx = Math.floor(this.random() * candidates.length);
      const targetSector = candidates[rIdx];
      if (!targetSector.isVent && !targetSector.isRelic) {
        targetSector.isRelic = true;
        candidates.splice(rIdx, 1);
        relicsPlaced++;
      }
    }

    return sectors;
  }

  // Drunkard's Walk for Sonar
  drunkardsWalk(start: Point, steps: number, sectors: Sector[]): number[] {
    const touchedIds = new Set<number>();
    let cx = start.x;
    let cy = start.y;

    for (let i = 0; i < steps; i++) {
      const angle = this.random() * Math.PI * 2;
      cx += Math.cos(angle) * 5;
      cy += Math.sin(angle) * 5;

      // Find which sector this point is in
      const sector = sectors.find(s => this.isPointInPolygon({x: cx, y: cy}, s.polygon));
      if (sector) touchedIds.add(sector.id);
    }

    return Array.from(touchedIds);
  }

  isPointInPolygon(point: Point, vs: number[][]) {
    var x = point.x, y = point.y;
    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];
        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
  }

  // Kruskal's MST
  getMST(nodes: Sector[]): Edge[] {
    const edges: Edge[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = Math.hypot(nodes[i].centroid.x - nodes[j].centroid.x, nodes[i].centroid.y - nodes[j].centroid.y);
        edges.push({ u: nodes[i].id, v: nodes[j].id, weight: d });
      }
    }

    edges.sort((a, b) => a.weight - b.weight);

    const parent: Record<number, number> = {};
    const find = (i: number): number => {
      if (parent[i] === undefined) return i;
      return find(parent[i]);
    };

    const union = (i: number, j: number) => {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) parent[rootI] = rootJ;
    };

    const mst: Edge[] = [];
    for (const edge of edges) {
      if (find(edge.u) !== find(edge.v)) {
        mst.push(edge);
        union(edge.u, edge.v);
      }
    }
    return mst;
  }

  // A* Search for Drones
  findAStarPath(startId: number, endId: number, sectors: Sector[], nodes: number[]): number[] | null {
    // nodes are the IDs of sectors that have built Cables
    const openSet = [startId];
    const cameFrom: Record<number, number> = {};
    const gScore: Record<number, number> = {};
    const fScore: Record<number, number> = {};

    gScore[startId] = 0;
    fScore[startId] = this.heuristic(startId, endId, sectors);

    while (openSet.length > 0) {
      // Get node in openSet with lowest fScore
      let currentIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (fScore[openSet[i]] < fScore[openSet[currentIdx]]) currentIdx = i;
      }
      const current = openSet[currentIdx];

      if (current === endId) return this.reconstructPath(cameFrom, current);

      openSet.splice(currentIdx, 1);

      // Get neighbors (sectors that share an edge in Voronoi AND are in 'nodes' build list)
      const neighbors = this.getNeighbors(current, sectors).filter(id => nodes.includes(id));

      for (const neighbor of neighbors) {
        const neighborSector = sectors[neighbor];
        const tentativeGScore = gScore[current] + neighborSector.cost;

        if (gScore[neighbor] === undefined || tentativeGScore < gScore[neighbor]) {
          cameFrom[neighbor] = current;
          gScore[neighbor] = tentativeGScore;
          fScore[neighbor] = gScore[neighbor] + this.heuristic(neighbor, endId, sectors);
          if (!openSet.includes(neighbor)) openSet.push(neighbor);
        }
      }
    }
    return null;
  }

  heuristic(a: number, b: number, sectors: Sector[]) {
    return Math.hypot(sectors[a].centroid.x - sectors[b].centroid.x, sectors[a].centroid.y - sectors[b].centroid.y);
  }

  reconstructPath(cameFrom: Record<number, number>, current: number): number[] {
    const path = [current];
    while (cameFrom[current] !== undefined) {
      current = cameFrom[current];
      path.unshift(current);
    }
    return path;
  }

  getNeighbors(id: number, sectors: Sector[]): number[] {
    const s = sectors[id];
    return sectors.filter(other => {
      if (other.id === id) return false;
      // Simple check: if centroids are under a certain distance or sharing vertices
      // For performance in this demo, let's use distance threshold or index
      const d = Math.hypot(s.centroid.x - other.centroid.x, s.centroid.y - other.centroid.y);
      return d < 250; // Approximated Voronoi adjacency
    }).map(o => o.id);
  }
}

