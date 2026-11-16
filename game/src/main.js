// HEADWATERS — boot and the one loop: input every frame, the world in fixed
// 1/60 s steps, the renderer painting what is there. Screens: title, play,
// draft, win, lose, paused. ?shot=<scene>&seed=<n> stages a screenshot scene
// and raises window.__shotReady when the frame is composed.

import { W, H } from './config.js';
import { newWorld, resetWorld, startRun, step, toggleGate, clickJam, pickUpgrade, winGame, loseGame } from './world.js';
import { render } from './render.js';
import { toLogical, hitGate, hitJam, hitGateBar, hitDraftCard } from './input.js';
import { unlockAudio, setMuted, isMuted, setRush, sfx } from './audio.js';
import { updateFx, spawnRain, spawnSplash } from './particles.js';
import { stageShot, botTick } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 7);
const shot = params.get('shot') || '';

const state = newWorld(seed);
let last = performance.now();
let acc = 0;
let splashTimer = 0;

function announce(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function startGame() {
  unlockAudio();
  resetWorld(state, (seed + Math.floor(Math.random() * 100000)) >>> 0);
  // Keep the player's seed stable for the run's RNG: re-seed from the run seed.
  startRun(state);
  announce('Day 1. Open the gates to water the valley.');
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (state.mode === 'play' && !state.paused) {
    acc += dt;
    const fixed = 1 / 60;
    let n = 0;
    while (acc >= fixed && n < 5) {
      step(state, fixed);
      updateFx(state, fixed);
      spawnRain(state, fixed);
      acc -= fixed;
      n++;
    }
    // Splash particles where water is flowing.
    splashTimer -= dt;
    if (splashTimer <= 0) {
      splashTimer = 0.12;
      // Splash at the reservoir inflow when the spring gate runs.
      if (state.gates[0].flow > 1) spawnSplash(state, 738, 224, 1);
      if (state.gates[5].flow > 1) spawnSplash(state, 1180, 296, 2);
    }
    setRush(Math.min(1, (state._totalFlow || 0) / 24));
  } else {
    // Title / draft / end screens still animate (water shimmer, rain).
    state.anim += dt;
    updateFx(state, dt);
    if (state.mode === 'title') spawnRain(state, dt);
  }
  render(ctx, state);
}

function onKey(e) {
  const k = e.key.toLowerCase();
  if (k === 'm') { setMuted(!isMuted()); return; }
  if (k === 'p' && (state.mode === 'play' || state.mode === 'paused')) {
    if (state.mode === 'play') { state.prevMode = 'play'; state.mode = 'paused'; }
    else state.mode = state.prevMode;
    return;
  }
  if (k === 'enter') {
    if (state.mode === 'title' || state.mode === 'win' || state.mode === 'lose') {
      sfx('click');
      startGame();
    }
    return;
  }
  if (state.mode === 'draft') {
    if (k === '1' || k === '2' || k === '3') pickUpgrade(state, Number(k) - 1);
    return;
  }
  if (state.mode !== 'play') return;
  if (k >= '1' && k <= '6') {
    const id = Number(k) - 1;
    state.selected = id;
    toggleGate(state, id);
  }
}

function onPointer(e) {
  unlockAudio();
  const p = toLogical(canvas, e.clientX, e.clientY);
  if (state.mode === 'title' || state.mode === 'win' || state.mode === 'lose') {
    if (e.type === 'click') startGame();
    return;
  }
  if (state.mode === 'draft') {
    const card = hitDraftCard(p.x, p.y);
    if (card >= 0) pickUpgrade(state, card);
    return;
  }
  if (state.mode !== 'play') return;
  const jam = hitJam(state, p.x, p.y);
  if (jam >= 0) { clickJam(state, jam); return; }
  const gate = hitGate(p.x, p.y);
  if (gate >= 0) { state.selected = gate; toggleGate(state, gate); return; }
  const bar = hitGateBar(p.x, p.y);
  if (bar >= 0) { state.selected = bar; toggleGate(state, bar); }
}

window.addEventListener('keydown', onKey);
canvas.addEventListener('pointerdown', onPointer);
window.addEventListener('resize', fitCanvas);
fitCanvas();

if (shot) {
  stageShot(state, shot, seed);
  // Let two frames paint, then signal the screenshot driver.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
} else {
  state.mode = 'title';
}

requestAnimationFrame(frame);

// Debug / play-test hooks (not part of the visible game).
window.__headwaters = {
  state,
  snapshot() {
    return {
      mode: state.mode, day: state.day, dayT: +state.dayT.toFixed(2),
      coins: state.coins, score: Math.floor(state.score),
      flood: +state.flood.toFixed(1), floodMax: state.floodMax,
      reservoir: +state.reservoir.stored.toFixed(1),
      water: Math.floor(state.waterDelivered),
      townsWatered: state.towns.filter((t) => t.watered).length,
      townsAlive: state.towns.filter((t) => !t.lost).length,
      gates: state.gates.map((g) => ({ open: g.open, jam: g.jam, flow: +g.flow.toFixed(2) })),
      weather: state.weather,
      draft: state.draft ? state.draft.map((d) => d.id) : null,
      upgrades: state.upgrades.slice(),
      won: state.mode === 'win',
    };
  },
  botTick() { botTick(state); },
  ff(sec) {
    const n = Math.round(sec * 60);
    for (let i = 0; i < n; i++) {
      if (state.mode === 'play') botTick(state);
      step(state, 1 / 60);
      updateFx(state, 1 / 60);
      if (state.mode === 'draft') break;
    }
    return this.snapshot();
  },
  ffRaw(sec) {
    const n = Math.round(sec * 60);
    for (let i = 0; i < n; i++) {
      step(state, 1 / 60);
      if (state.mode === 'draft') break;
    }
    return this.snapshot();
  },
  start() { startGame(); },
  win() { winGame(state); },
  lose(reason) { loseGame(state, reason || 'Debug defeat.'); },
  setFlood(v) { state.flood = v; },
  setDayT(v) { state.dayT = v; },
};
