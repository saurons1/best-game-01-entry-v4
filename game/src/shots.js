// HEADWATERS — screenshot scenes behind ?shot=title|play|draft|win.
// Each scene plays the real rules forward from a fresh world for a fixed
// number of steps (stepPlain: fixed steps, no input, no auto-play eating the
// composition), so the frame is a genuine render of the game's own code.

import { newWorld, startRun, beginDay, winGame, resetWorld } from './world.js';
import { step } from './world.js';
import { updateFx, spawnRain } from './particles.js';
import { drawDraft } from './upgrades.js';

function stepPlain(s, n) {
  for (let i = 0; i < n; i++) {
    step(s, 1 / 60);
    updateFx(s, 1 / 60);
    spawnRain(s, 1 / 60);
    if (s.mode !== 'play') break;
  }
}

// A sensible gate policy, used ONLY to stage the draft shot through day 1.
export function botTick(s) {
  if (s.mode !== 'play') return;
  for (let i = 0; i < 5; i++) {
    if (s.gates[i].jam > 0) { s.gates[i].jam = 0; s.stats.jamsCleared++; continue; }
    if (!s.gates[i].open) s.gates[i].open = true;
  }
  const spill = s.gates[5];
  if (spill.jam === 0) spill.open = s.flood > 50 || s.reservoir.stored > s.reservoir.cap * 0.92;
}

export function stageShot(s, scene, seed) {
  resetWorld(s, seed);
  if (scene === 'title') {
    s.mode = 'title';
    // A living valley behind the title: day 1 water running, no interaction.
    s.day = 1;
    beginDay(s);
    s.gates[0].open = true; s.gates[1].open = true; s.gates[2].open = true;
    s.gates[3].open = true; s.gates[4].open = true;
    s.mode = 'play';
    stepPlain(s, 120);
    s.mode = 'title';
    s.dayT = 0;
    s.flood = 0;
    return;
  }
  if (scene === 'play') {
    startRun(s);
    // Jump to day 3, storm about to arrive: the cover's pressure moment.
    s.day = 3;
    beginDay(s);
    s.dayT = 8;
    s.gates[0].open = true; s.gates[1].open = true; s.gates[2].open = true;
    s.gates[3].open = true; s.gates[4].open = true;
    s.reservoir.stored = 62;
    s.flood = 38;
    s.coins = 47;
    s.score = 612;
    s.waterDelivered = 188;
    s.towns[0].tank = 16; s.towns[0].watered = true;
    s.towns[1].tank = 11;
    s.towns[2].tank = 9;
    s.towns[3].tank = 4;
    s.farms[0].water = 14; s.farms[0].watered = true;
    s.farms[1].water = 8;
    s.selected = 3;
    s.banner = '⛈ STORM SURGE INCOMING — watch the dam!';
    s.bannerT = 99;
    stepPlain(s, 90);
    s.bannerT = 99;
    return;
  }
  if (scene === 'draft') {
    startRun(s);
    s.gates[0].open = true; s.gates[1].open = true; s.gates[2].open = true;
    s.gates[3].open = true; s.gates[4].open = true;
    // Play day 1 out with the staging bot until the draft opens.
    for (let i = 0; i < 60 * 46 && s.mode === 'play'; i++) {
      botTick(s);
      step(s, 1 / 60);
      updateFx(s, 1 / 60);
    }
    if (s.mode !== 'draft') {
      // Fallback: force the draft open so the shot still shows it.
      s.day = 2;
      s.draft = drawDraft(s);
      s.mode = 'draft';
    }
    return;
  }
  if (scene === 'win') {
    startRun(s);
    s.day = 7;
    s.stats.daysDone = 7;
    s.coins = 214;
    s.score = 2840;
    s.waterDelivered = 642;
    s.towns[0].watered = true;
    s.towns[2].watered = true;
    s.towns[3].watered = true;
    s.towns[1].lost = true;
    s.stats.jamsCleared = 5;
    s.upgrades = ['bigres', 'fastgate', 'floodwall', 'millwheel', 'axe'];
    s.flood = 61;
    winGame(s);
    return;
  }
  // Unknown scene: plain title.
  s.mode = 'title';
}
