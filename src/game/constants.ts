export const COLORS = {
  bg: '#00050A',
  cyan: '#00FFFF', // Power Lines / Active
  magenta: '#FF00FF', // Cracks / Enemies
  gold: '#FFD700', // Vents
  ui: '#004466', // Borders / Faded
  uiGhost: 'rgba(0, 68, 102, 0.3)',
  marineSnow: 'rgba(255, 255, 255, 0.05)',
  fog: 'rgba(0, 5, 10, 0.9)',
};

export const LEVEL_THEMES = [
  { main: '#00FFFF', accent: '#00Teal', mood: 'Calm, steady pulse.' },
  { main: '#FFD700', accent: '#FF8C00', mood: 'Amber heat haze.' },
  { main: '#FF0000', accent: '#8B0000', mood: 'Red-alert scanlines.' }
];

export const LEVELS = [
  {
    id: 1,
    name: "THE SHALLOWS",
    cells: 14,
    ventsToConnect: 3,
    energy: 100,
    caType: 'still-life',
    hazardProb: 0,
    description: "Find 3 Power Sources and link them to your Base. Follow the dotted lines for the best path.",
    color: '#00FFFF'
  },
  {
    id: 2,
    name: "THERMAL RIDGE",
    cells: 32,
    ventsToConnect: 6,
    energy: 150,
    caType: 'oscillators',
    hazardProb: 0.2,
    description: "Lava cells detected. Your bots will try to go around them. Keep your base powered.",
    color: '#FFD700'
  },
  {
    id: 3,
    name: "ABYSSAL TRENCH",
    cells: 60,
    ventsToConnect: 10,
    energy: 250,
    caType: 'spaceships',
    hazardProb: 0.4,
    description: "Extreme depth. Moving cracks will try to break your cables. Repair them quickly!",
    color: '#FF4444'
  }
];

export const GAME_BOUNDS = {
  width: 1200,
  height: 800
};
