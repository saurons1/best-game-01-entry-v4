// HEADWATERS — configuration: layout, palette, gates, towns, weather, upgrades.
// Every number that tunes the game lives here so the balance can be read at a glance.

export const W = 1280;
export const H = 800;

export const TOP_H = 46;      // top HUD bar height
export const LEFT_W = 198;    // left weather / flood panel width
export const BOT_H = 136;     // bottom gate bar height
export const VALLEY = { x: LEFT_W, y: TOP_H, w: W - LEFT_W, h: H - TOP_H - BOT_H };

export const DAY_LEN = 42;    // seconds per day shift
export const DAYS = 7;
export const TOWN_COUNT = 4;

export const PALETTE = {
  skyTop: '#0b1030',
  skyMid: '#141b45',
  skyBot: '#1d2a5e',
  dusk: '#3a2b5c',
  mountainFar: '#232a52',
  mountainNear: '#171d3d',
  snow: '#cdd8f2',
  ground: '#101a33',
  groundHi: '#16244a',
  channelDry: '#1d3a5e',
  channelWet: '#19c8e8',
  channelGlow: '#59e6ff',
  deepWater: '#0a6f92',
  reservoir: '#0e7490',
  amber: '#ffb347',
  wheat: '#e8b64c',
  wheatDry: '#8a6d3b',
  townLight: '#ffd27a',
  roof: '#7a3b4f',
  roof2: '#4f6b8a',
  millWood: '#8a5a33',
  danger: '#ff5d5d',
  dangerSoft: '#ff9d5c',
  ok: '#5cf2a6',
  ink: '#eaf2ff',
  inkDim: '#9fb2d8',
  inkFaint: '#6b7ea6',
  panel: 'rgba(10, 16, 38, 0.88)',
  panelEdge: '#2c3f6e',
  card: '#131f45',
  cardEdge: '#3b5a9e',
  gold: '#ffd166',
};

export const SPRING = { x: 738, y: 92 };
export const RESERVOIR = { x: 738, y: 298, r: 74 };
export const MILL = { x: 428, y: 336 };
export const RIVER_OUT = { x: 1252, y: 298 };

// Channels: each gate owns one channel polyline (valley coords, absolute).
// from/to are node keys; points trace the water path.
export const GATES = [
  {
    id: 0, key: '1', name: 'SPRING GATE', short: 'SPRING',
    from: 'spring', to: 'reservoir', rate: 7,
    points: [[738, 96], [738, 150], [738, 224]],
    gateAt: [738, 178], labelAt: [788, 168],
    blurb: 'Spring → reservoir',
  },
  {
    id: 1, key: '2', name: 'MILL RACE', short: 'MILL',
    from: 'spring', to: 'mill', rate: 5,
    points: [[738, 100], [660, 140], [560, 210], [470, 290], [438, 322]],
    gateAt: [606, 176], labelAt: [560, 148],
    blurb: 'Spring → mill',
  },
  {
    id: 2, key: '3', name: 'FIELD GATE', short: 'FIELDS',
    from: 'reservoir', to: 'farms', rate: 6,
    points: [[738, 372], [738, 430], [700, 470], [640, 500]],
    gateAt: [738, 420], labelAt: [792, 414],
    blurb: 'Reservoir → fields',
  },
  {
    id: 3, key: '4', name: 'EAST MAIN', short: 'EAST',
    from: 'reservoir', to: 'townsEast', rate: 6,
    points: [[812, 298], [900, 300], [980, 340], [1030, 430], [1052, 520]],
    gateAt: [948, 318], labelAt: [912, 288],
    blurb: '→ east towns',
  },
  {
    id: 4, key: '5', name: 'WEST MAIN', short: 'WEST',
    from: 'mill', to: 'townsWest', rate: 6,
    points: [[428, 380], [420, 440], [400, 500], [380, 560]],
    gateAt: [420, 452], labelAt: [330, 448],
    blurb: 'Mill → west towns',
  },
  {
    id: 5, key: '6', name: 'SPILLWAY', short: 'SPILL',
    from: 'reservoir', to: 'river', rate: 9,
    points: [[812, 298], [920, 290], [1060, 292], [1180, 296], [1252, 298]],
    gateAt: [1096, 292], labelAt: [1064, 262],
    blurb: '→ river · cuts flood',
  },
];

export const TOWNS = [
  { id: 0, name: 'ALDERWICK', side: 'west', x: 330, y: 606, need: 16, health: 3 },
  { id: 1, name: 'MILLBROOK', side: 'west', x: 540, y: 626, need: 16, health: 3 },
  { id: 2, name: 'FERNFORD', side: 'east', x: 930, y: 626, need: 16, health: 3 },
  { id: 3, name: 'STONEHOLLOW', side: 'east', x: 1140, y: 606, need: 16, health: 3 },
];

export const FARMS = [
  { id: 0, name: 'LOW FIELD', x: 600, y: 540, need: 14 },
  { id: 1, name: 'HIGH FIELD', x: 800, y: 548, need: 14 },
];

// Weather fronts. mult scales spring flow; flood is risk gained per second
// while the front is active; label is what the forecast panel shows.
export const WEATHER = {
  clear:    { label: 'CLEAR SKIES',  mult: 1.0, flood: 0.0, color: '#9fb2d8', icon: '☀' },
  rain:     { label: 'RAIN',         mult: 1.6, flood: 0.4, color: '#59b7ff', icon: '🌧' },
  storm:    { label: 'STORM SURGE',  mult: 2.2, flood: 1.6, color: '#b78cff', icon: '⛈' },
  dry:      { label: 'DRY SPELL',    mult: 0.4, flood: 0.0, color: '#ffb347', icon: '☀' },
  snowmelt: { label: 'SNOWMELT',     mult: 1.5, flood: 0.2, color: '#cfe8ff', icon: '❄' },
  surge1:   { label: 'FLOOD · PHASE 1', mult: 2.5, flood: 1.8, color: '#ff9d5c', icon: '🌊' },
  surge2:   { label: 'FLOOD · PHASE 2', mult: 3.0, flood: 2.6, color: '#ff7a5c', icon: '🌊' },
  surge3:   { label: 'FLOOD · PHASE 3', mult: 3.6, flood: 3.6, color: '#ff5d5d', icon: '🌊' },
};

// Day plans: weather fronts scheduled by seconds-into-day. Day 7 is the boss.
export const DAY_PLANS = [
  [{ at: 0, type: 'clear' }, { at: 16, type: 'rain' }, { at: 30, type: 'clear' }],
  [{ at: 0, type: 'rain' }, { at: 14, type: 'clear' }, { at: 26, type: 'dry' }],
  [{ at: 0, type: 'clear' }, { at: 10, type: 'storm' }, { at: 24, type: 'rain' }, { at: 34, type: 'clear' }],
  [{ at: 0, type: 'dry' }, { at: 12, type: 'snowmelt' }, { at: 28, type: 'rain' }],
  [{ at: 0, type: 'rain' }, { at: 12, type: 'storm' }, { at: 26, type: 'clear' }, { at: 34, type: 'dry' }],
  [{ at: 0, type: 'clear' }, { at: 8, type: 'snowmelt' }, { at: 20, type: 'storm' }, { at: 32, type: 'rain' }],
  // THE HUNDRED-YEAR FLOOD — three phases, no let-up.
  [{ at: 0, type: 'surge1' }, { at: 14, type: 'surge2' }, { at: 28, type: 'surge3' }],
];

// Upgrade draft pool. Each may be taken once unless noted.
export const UPGRADES = [
  { id: 'bigres',  name: 'DEEP RESERVOIR', desc: 'Reservoir holds +70 water. Room to ride out a surge.', icon: '◉', apply: 'bigres' },
  { id: 'fastgate', name: 'BRASS GEARS',  desc: 'Every gate flows +50% faster.', icon: '⚙', apply: 'fastgate' },
  { id: 'bigspill', name: 'WIDE SPILLWAY', desc: 'Spillway dumps water twice as fast.', icon: '≋', apply: 'bigspill' },
  { id: 'well',    name: 'DEEP WELL',     desc: 'Spring flow +2, even in a dry spell.', icon: '⛲', apply: 'well' },
  { id: 'millwheel', name: 'GREAT WHEEL', desc: 'The mill earns double coin per water.', icon: '✦', apply: 'millwheel' },
  { id: 'floodwall', name: 'FLOOD WALL',  desc: 'The dam holds +25 flood risk before it breaks.', icon: '▣', apply: 'floodwall' },
  { id: 'axe',     name: 'SHARP AXE',     desc: 'Beaver dams and log jams clear in 1 click.', icon: '🪓', apply: 'axe' },
  { id: 'fertile', name: 'RICH SOIL',     desc: 'Watered fields pay double coin.', icon: '🌾', apply: 'fertile' },
  { id: 'cistern', name: 'TOWN CISTERNS', desc: 'Towns need 25% less water each day.', icon: '🏺', apply: 'cistern' },
  { id: 'gauge',   name: 'RAIN GAUGE',    desc: 'Forecast shows further ahead. +150 score.', icon: '◎', apply: 'gauge' },
];

export const TOWN_PAY = 8;    // coins per watered town at day end
export const FARM_PAY = 6;    // coins per watered field at day end
export const MILL_RATE = 6;   // water units per 1 coin at the mill
export const DAY_BONUS = 100; // score per survived day
export const JAM_HP = 3;      // clicks to clear a jam (1 with SHARP AXE)
