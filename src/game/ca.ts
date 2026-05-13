export class CellularAutomata {
  grid: boolean[][];
  rows: number;
  cols: number;

  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;
    this.grid = Array(rows).fill(0).map(() => Array(cols).fill(false));
  }

  seedPattern(type: string, xOffset: number, yOffset: number) {
    if (type === 'still-life') {
      // Block
      this.safeSet(xOffset, yOffset, true);
      this.safeSet(xOffset + 1, yOffset, true);
      this.safeSet(xOffset, yOffset + 1, true);
      this.safeSet(xOffset + 1, yOffset + 1, true);
    } else if (type === 'oscillators') {
      // Blinker
      this.safeSet(xOffset, yOffset, true);
      this.safeSet(xOffset, yOffset + 1, true);
      this.safeSet(xOffset, yOffset + 2, true);
    } else if (type === 'spaceships') {
      // Glider
      this.safeSet(xOffset + 1, yOffset, true);
      this.safeSet(xOffset + 2, yOffset + 1, true);
      this.safeSet(xOffset, yOffset + 2, true);
      this.safeSet(xOffset + 1, yOffset + 2, true);
      this.safeSet(xOffset + 2, yOffset + 2, true);
    }
  }

  safeSet(x: number, y: number, val: boolean) {
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
      this.grid[y][x] = val;
    }
  }

  step() {
    const newGrid = this.grid.map(row => [...row]);
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const neighbors = this.countNeighbors(x, y);
        if (this.grid[y][x]) {
          if (neighbors < 2 || neighbors > 3) newGrid[y][x] = false;
        } else {
          if (neighbors === 3) newGrid[y][x] = true;
        }
      }
    }
    this.grid = newGrid;
  }

  countNeighbors(x: number, y: number) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        const nx = (x + i + this.cols) % this.cols;
        const ny = (y + j + this.rows) % this.rows;
        if (this.grid[ny][nx]) count++;
      }
    }
    return count;
  }
}
