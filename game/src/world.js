// HEADWATERS — world state and the fixed-step simulation.
// Owns the state object (mutated in place so the renderer never holds a stale
// copy), the day cycle, the water economy and win/lose. Drawing lives in
// render.js; weather scheduling in weather.js; gate flow in gates.js.

import {
  DAY_LEN, DAYS, GATES, TOWNS, FARMS, DAY_PLANS, WEATHER,
  TOWN_PAY, FARM_PAY, MILL_RATE, DAY_BONUS, JAM_HP,
} from './config.js';
import { makeRng, shuffle } from './random.js';
import { currentFront, forecastList, planJam, planEvent } from './weather.js';
import { stepGates } from './gates.js';
import { settleDay } from './towns.js';
import { drawDraft } from './upgrades.js';
import { sfx } from './audio.js';

export function bestScore() {
  try { return Number(window.localStorage.getItem('headwaters-best') || 0) || 0; }
  catch { return 0; }
}

export function saveBest(v) {
  try { window.localStorage.setItem('headwaters-best', String(Math.floor(v))); } catch { /* private mode */ }
}

export function newWorld(seed) {
  const rng = makeRng(seed);
  const s = {
    seed, rng,
    mode: 'title',            // title | play | draft | win | lose | paused
    prevMode: 'play',
    day: 1, dayT: 0, dayLen: DAY_LEN,
    time: 0, anim: 0,
    coins: 0, score: 0, best: bestScore(),
    waterDelivered: 0, waterSpilled: 0,
    flood: 0, floodMax: 100,
    springBase: 6,
    weather: 'clear',
    fronts: DAY_PLANS[0].slice(),
    gates: GATES.map((g) => ({ id: g.id, open: false, jam: 0, flow: 0, level: 1 })),
    reservoir: { stored: 30, cap: 100 },
    mill: { buffer: 0, spin: 0, earned: 0 },
    farms: FARMS.map((f) => ({ id: f.id, name: f.name, water: 0, need: f.need, watered: false })),
    towns: TOWNS.map((t) => ({ id: t.id, name: t.name, side: t.side, x: t.x, y: t.y, tank: 0, need: t.need, health: t.health, watered: false, lost: false })),
    upgrades: [],
    draft: null,
    banner: null, bannerT: 0,
    log: [],
    events: [],               // scheduled one-off events this day {at, kind, done}
    fx: [],                   // particles (owned by particles.js)
    rain: [],                 // rain/snow drops
    selected: 0,              // selected gate id for the bottom panel
    stats: { jamsCleared: 0, townsSaved: 0, daysDone: 0, millCoins: 0 },
    endReason: '',
    endStats: null,
    jamFlash: 0,
    floodWarned: false,
    paused: false,
  };
  return s;
}

// Mutate the state object in place (never replace it): main.js and the
// renderer hold the same reference for the whole session.
export function resetWorld(s, seed) {
  const fresh = newWorld(seed);
  for (const k of Object.keys(s)) delete s[k];
  Object.assign(s, fresh);
}

export function startRun(s) {
  s.mode = 'play';
  s.day = 1;
  beginDay(s);
  s.banner = 'DAY 1 — OPEN THE GATES. WATER ONLY FLOWS WHERE YOU OPEN IT.';
  s.bannerT = 4;
}

export function beginDay(s) {
  s.dayT = 0;
  s.fronts = DAY_PLANS[s.day - 1].slice();
  s.weather = s.fronts[0].type;
  s.events = [];
  // One jam event and one surprise event per day (day 1 is gentle: jam only
  // from day 2 on; day 7 boss has no jams, the flood is the whole fight).
  if (s.day >= 2 && s.day < 7) {
    s.events.push({ at: 8 + s.rng() * 10, kind: 'jam', done: false });
    s.events.push({ at: 20 + s.rng() * 12, kind: planEvent(s.rng), done: false });
  }
  if (s.day === 7) {
    s.events.push({ at: 7, kind: 'downpour', done: false });
  }
  for (const t of s.towns) { t.tank = 0; t.watered = false; }
  for (const f of s.farms) { f.water = 0; f.watered = false; }
  s.flood = Math.max(0, s.flood - 12);
  s.log.push(`Day ${s.day} — ${WEATHER[s.weather].label}`);
}

export function addLog(s, msg) {
  s.log.push(msg);
  if (s.log.length > 5) s.log.shift();
}

export function setBanner(s, msg, secs = 3.5) {
  s.banner = msg;
  s.bannerT = secs;
}

export function toggleGate(s, id) {
  const g = s.gates[id];
  if (!g || s.mode !== 'play') return;
  if (g.jam > 0) { setBanner(s, 'JAMMED! Click the beaver dam to clear it.', 2.5); sfx('warn'); return; }
  g.open = !g.open;
  sfx(g.open ? 'gateOpen' : 'gateClose');
}

export function clickJam(s, id) {
  const g = s.gates[id];
  if (!g || g.jam <= 0) return;
  g.jam -= s.upgrades.includes('axe') ? 3 : 1;
  if (g.jam <= 0) {
    g.jam = 0;
    s.stats.jamsCleared++;
    addLog(s, `Jam cleared: ${GATES[id].name}`);
    sfx('clear');
    spawnClearBurst(s, id);
  } else {
    sfx('click');
  }
}

function spawnClearBurst(s, id) {
  const at = GATES[id].gateAt;
  for (let i = 0; i < 14; i++) {
    s.fx.push({ kind: 'chip', x: at[0], y: at[1], vx: (s.rng() - 0.5) * 160, vy: -40 - s.rng() * 120, life: 0.7, max: 0.7, size: 3 + s.rng() * 3, color: '#c98a4b' });
  }
}

export function applyJam(s, gateId) {
  const g = s.gates[gateId];
  if (!g || g.jam > 0) return;
  g.jam = JAM_HP;
  g.open = false;
  setBanner(s, `BEAVER DAM! ${GATES[gateId].name} is blocked — click it to clear.`, 4);
  addLog(s, `Beaver dam: ${GATES[gateId].name}`);
  s.jamFlash = 1;
  sfx('jam');
}

export function applyDownpour(s) {
  s.flood = Math.min(s.floodMax, s.flood + 9);
  setBanner(s, 'SUDDEN DOWNPOUR — flood risk jumps!', 3.5);
  addLog(s, 'Sudden downpour');
  sfx('flood');
}

export function endDay(s) {
  const report = settleDay(s);
  s.stats.daysDone++;
  s.score += DAY_BONUS;
  s.coins += report.coins;
  for (const line of report.lines) addLog(s, line);
  if (report.coins > 0) sfx('deliver');
  const alive = s.towns.filter((t) => !t.lost).length;
  if (alive === 0) return loseGame(s, 'Every town ran dry. The valley empties.');
  if (s.day >= DAYS) return winGame(s);
  s.day++;
  s.draft = drawDraft(s);
  s.mode = 'draft';
  sfx('draft');
  setBanner(s, `DAY ${s.day - 1} DONE — pick an upgrade`, 3);
}

export function pickUpgrade(s, idx) {
  if (s.mode !== 'draft' || !s.draft || !s.draft[idx]) return;
  const up = s.draft[idx];
  s.upgrades.push(up.id);
  if (up.apply === 'bigres') s.reservoir.cap += 70;
  if (up.apply === 'floodwall') s.floodMax += 25;
  if (up.apply === 'gauge') s.score += 150;
  if (up.apply === 'well') s.springBase += 2;
  addLog(s, `Upgrade: ${up.name}`);
  sfx('pick');
  s.draft = null;
  s.mode = 'play';
  beginDay(s);
  setBanner(s, s.day === 7
    ? 'DAY 7 — THE HUNDRED-YEAR FLOOD. Hold the dam. Keep one town standing.'
    : `DAY ${s.day} — ${WEATHER[s.fronts[0].type].label}`, 4);
}

function finishStats(s) {
  return {
    days: s.stats.daysDone,
    score: Math.floor(s.score),
    coins: s.coins,
    water: Math.floor(s.waterDelivered),
    towns: s.towns.filter((t) => !t.lost).length,
    jams: s.stats.jamsCleared,
    upgrades: s.upgrades.length,
    best: Math.max(s.best, Math.floor(s.score)),
  };
}

export function winGame(s) {
  s.mode = 'win';
  s.endReason = 'You held the valley through the Hundred-Year Flood.';
  s.endStats = finishStats(s);
  if (s.endStats.score > s.best) { s.best = s.endStats.score; saveBest(s.best); }
  sfx('win');
}

export function loseGame(s, reason) {
  s.mode = 'lose';
  s.endReason = reason;
  s.endStats = finishStats(s);
  if (s.endStats.score > s.best) { s.best = s.endStats.score; saveBest(s.best); }
  sfx('lose');
}

// One fixed step (dt seconds). Called by main.js at 60 Hz.
export function step(s, dt) {
  s.anim += dt;
  if (s.bannerT > 0) s.bannerT -= dt;
  if (s.jamFlash > 0) s.jamFlash -= dt * 2;
  if (s.mode !== 'play') return;

  s.time += dt;
  s.dayT += dt;

  // Weather follows the day plan; forecast panel reads the same plan.
  const front = currentFront(s);
  if (front !== s.weather) {
    s.weather = front;
    const w = WEATHER[front];
    setBanner(s, `${w.icon} ${w.label} — spring flow ×${w.mult}`, 3);
    addLog(s, `${w.label} rolls in`);
    if (front === 'storm' || front.startsWith('surge')) sfx('warn');
  }

  // Scheduled events fire once.
  for (const ev of s.events) {
    if (!ev.done && s.dayT >= ev.at) {
      ev.done = true;
      if (ev.kind === 'jam') applyJam(s, planJam(s.rng));
      else if (ev.kind === 'downpour') applyDownpour(s);
      else if (ev.kind === 'dry') { setBanner(s, 'DRY SPELL DEEPENS — the spring slows.', 3); }
    }
  }

  stepGates(s, dt);

  // Flood risk: weather adds, overflow adds, spillway relieves, slow decay.
  const w = WEATHER[s.weather];
  s.flood += w.flood * dt;
  // A brim-full reservoir in a storm presses on the dam: keeping water
  // moving out (towns, fields, spillway) is what holds the flood down.
  if (s.reservoir.stored > s.reservoir.cap * 0.9 && (s.weather === 'storm' || s.weather.startsWith('surge'))) {
    s.flood += 1.2 * dt;
  }
  if (s.gates[5].open && s.gates[5].flow > 0) {
    s.flood -= (s.upgrades.includes('bigspill') ? 2.0 : 1.0) * dt;
  }
  s.flood -= 0.25 * dt;
  s.flood = Math.max(0, Math.min(s.floodMax, s.flood));

  if (s.flood > 70 && !s.floodWarned) {
    s.floodWarned = true;
    setBanner(s, '⚠ FLOOD RISK CRITICAL — open the SPILLWAY!', 3.5);
    sfx('warn');
  }
  if (s.flood < 45) s.floodWarned = false;

  if (s.flood >= s.floodMax) {
    loseGame(s, 'The dam broke. The valley drowned under the flood.');
    return;
  }

  if (s.dayT >= s.dayLen) endDay(s);
}
