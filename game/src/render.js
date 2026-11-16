// HEADWATERS — render: every pixel the player sees. The valley is drawn
// from the live state each frame: glowing cyan channels on a dark dusk field,
// so the water network is the first thing a shrunken screenshot shows.

import {
  W, H, TOP_H, LEFT_W, BOT_H, VALLEY, PALETTE, GATES, TOWNS, FARMS,
  SPRING, RESERVOIR, MILL, WEATHER, DAY_PLANS,
} from './config.js';
import { forecastList } from './weather.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h, edge) {
  ctx.fillStyle = PALETTE.panel;
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = edge || PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function polyline(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
}

function channelPath(ctx, pts, width, color, glow) {
  polyline(ctx, pts);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// Animated flow dashes riding a channel.
function flowDashes(ctx, pts, offset, color, width) {
  const total = pathLength(pts);
  const step = 26;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  for (let d = (offset % step); d < total; d += step) {
    const p = pointAt(pts, d);
    const q = pointAt(pts, Math.min(total, d + 11));
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(q[0], q[1]);
    ctx.stroke();
  }
}

function pathLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}

function pointAt(pts, d) {
  let left = d;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (left <= seg) {
      const t = seg === 0 ? 0 : left / seg;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
    }
    left -= seg;
  }
  return pts[pts.length - 1];
}

export function render(ctx, s) {
  ctx.clearRect(0, 0, W, H);
  drawSky(ctx, s);
  drawValley(ctx, s);
  drawTopBar(ctx, s);
  drawLeftPanel(ctx, s);
  drawGateBar(ctx, s);
  if (s.banner && s.bannerT > 0 && (s.mode === 'play' || s.mode === 'draft')) drawBanner(ctx, s);
  if (s.mode === 'title') drawTitle(ctx, s);
  if (s.mode === 'draft') drawDraftScreen(ctx, s);
  if (s.mode === 'win') drawEndScreen(ctx, s, true);
  if (s.mode === 'lose') drawEndScreen(ctx, s, false);
  if (s.mode === 'paused') drawPaused(ctx, s);
}

function drawSky(ctx, s) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, PALETTE.skyTop);
  g.addColorStop(0.45, PALETTE.skyMid);
  g.addColorStop(0.8, PALETTE.dusk);
  g.addColorStop(1, PALETTE.skyBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Stars.
  ctx.fillStyle = 'rgba(220, 232, 255, 0.7)';
  for (let i = 0; i < 60; i++) {
    const x = (i * 173) % W;
    const y = (i * 97) % 200 + 8;
    ctx.globalAlpha = 0.25 + ((i * 37) % 10) / 18;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
  // Moon.
  ctx.fillStyle = '#f4e9c8';
  ctx.beginPath();
  ctx.arc(1180, 74, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(244, 233, 200, 0.25)';
  ctx.beginPath();
  ctx.arc(1180, 74, 38, 0, Math.PI * 2);
  ctx.fill();
  // Far mountains.
  ctx.fillStyle = PALETTE.mountainFar;
  ctx.beginPath();
  ctx.moveTo(LEFT_W, 240);
  ctx.lineTo(340, 110); ctx.lineTo(470, 210); ctx.lineTo(600, 96); ctx.lineTo(760, 70);
  ctx.lineTo(900, 180); ctx.lineTo(1040, 100); ctx.lineTo(1200, 200); ctx.lineTo(1280, 150);
  ctx.lineTo(1280, 320); ctx.lineTo(LEFT_W, 320); ctx.closePath();
  ctx.fill();
  // Snow caps.
  ctx.fillStyle = PALETTE.snow;
  const caps = [[600, 96, 46], [760, 70, 52], [1040, 100, 40], [340, 110, 34]];
  for (const [x, y, w] of caps) {
    ctx.beginPath();
    ctx.moveTo(x - w, y + 26); ctx.lineTo(x, y); ctx.lineTo(x + w, y + 26);
    ctx.lineTo(x + w * 0.5, y + 14); ctx.lineTo(x, y + 26); ctx.lineTo(x - w * 0.5, y + 14);
    ctx.closePath();
    ctx.fill();
  }
  // Near ridge.
  ctx.fillStyle = PALETTE.mountainNear;
  ctx.beginPath();
  ctx.moveTo(LEFT_W, 300);
  ctx.lineTo(420, 210); ctx.lineTo(560, 280); ctx.lineTo(760, 190); ctx.lineTo(980, 270);
  ctx.lineTo(1160, 210); ctx.lineTo(1280, 260); ctx.lineTo(1280, 360); ctx.lineTo(LEFT_W, 360);
  ctx.closePath();
  ctx.fill();
  // Valley floor.
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(LEFT_W, 330, W - LEFT_W, H - 330 - BOT_H);
  ctx.fillStyle = PALETTE.groundHi;
  for (let i = 0; i < 5; i++) {
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.ellipse(760, 420 + i * 48, 420 - i * 40, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawValley(ctx, s) {
  drawChannels(ctx, s);
  drawSpring(ctx, s);
  drawReservoir(ctx, s);
  drawMill(ctx, s);
  drawFarms(ctx, s);
  drawTowns(ctx, s);
  drawRiver(ctx, s);
  drawGates(ctx, s);
  // Rising flood water at the valley floor when risk is high.
  if (s.flood > 55) {
    const h = (s.flood - 55) * 1.1;
    ctx.fillStyle = 'rgba(10, 111, 146, 0.45)';
    ctx.fillRect(LEFT_W, H - BOT_H - h, W - LEFT_W, h);
    ctx.fillStyle = 'rgba(89, 230, 255, 0.8)';
    ctx.fillRect(LEFT_W, H - BOT_H - h, W - LEFT_W, 2);
  }
  // Boss bar on day 7.
  if (s.day === 7 && (s.mode === 'play' || s.mode === 'draft')) {
    const phase = s.weather === 'surge1' ? 1 : s.weather === 'surge2' ? 2 : 3;
    const bx = 560, by = 58, bw = 360, bh = 20;
    panel(ctx, bx - 10, by - 8, bw + 20, bh + 30, '#ff5d5d');
    text(ctx, '🌊 THE HUNDRED-YEAR FLOOD', bx + bw / 2, by + 2, 13, '#ff8d7a', 'center');
    ctx.fillStyle = '#3a1020';
    rr(ctx, bx, by + 12, bw, 8, 4); ctx.fill();
    ctx.fillStyle = '#ff5d5d';
    rr(ctx, bx, by + 12, (bw * phase) / 3, 8, 4); ctx.fill();
    text(ctx, `PHASE ${phase}/3`, bx + bw + 8, by + 16, 11, '#ffb0a0', 'left');
  }
  // Day progress bar (thin, under the top bar).
  if (s.mode === 'play') {
    ctx.fillStyle = 'rgba(20, 30, 60, 0.9)';
    ctx.fillRect(LEFT_W, TOP_H, W - LEFT_W, 5);
    ctx.fillStyle = '#59e6ff';
    ctx.fillRect(LEFT_W, TOP_H, (W - LEFT_W) * (s.dayT / s.dayLen), 5);
  }
}

function drawChannels(ctx, s) {
  for (const def of GATES) {
    const g = s.gates[def.id];
    const flowing = g.open && g.jam === 0 && g.flow > 0.05;
    // Dry bed.
    channelPath(ctx, def.points, 13, '#0d1a30', 0);
    channelPath(ctx, def.points, 9, PALETTE.channelDry, 0);
    // Wet glow when water moves.
    if (flowing) {
      const w = 5 + Math.min(6, g.flow);
      channelPath(ctx, def.points, w + 5, 'rgba(25, 200, 232, 0.35)', 12);
      channelPath(ctx, def.points, w, PALETTE.channelWet, 10);
      flowDashes(ctx, def.points, s.anim * 90, '#bdf6ff', 3);
    } else if (g.open && g.jam === 0) {
      channelPath(ctx, def.points, 6, 'rgba(25, 200, 232, 0.45)', 6);
    }
  }
}

function drawSpring(ctx, s) {
  const pulse = 1 + Math.sin(s.anim * 2.2) * 0.06;
  ctx.save();
  ctx.translate(SPRING.x, SPRING.y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = 'rgba(89, 230, 255, 0.25)';
  ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.channelGlow;
  ctx.shadowColor = PALETTE.channelGlow; ctx.shadowBlur = 22;
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#dffaff';
  ctx.beginPath(); ctx.arc(-4, -5, 8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  text(ctx, '✦ SPRING', SPRING.x + 42, SPRING.y - 8, 12, '#bdf6ff', 'left');
  const w = WEATHER[s.weather];
  text(ctx, `flow ×${w.mult}`, SPRING.x + 42, SPRING.y + 10, 11, PALETTE.inkDim, 'left');
}

function drawReservoir(ctx, s) {
  const r = RESERVOIR.r;
  const frac = s.reservoir.stored / s.reservoir.cap;
  ctx.save();
  ctx.translate(RESERVOIR.x, RESERVOIR.y);
  // Dam wall.
  ctx.strokeStyle = '#5a4632';
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.arc(0, 0, r + 4, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  // Basin.
  ctx.fillStyle = '#0a2036';
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.72, 0, 0, Math.PI * 2); ctx.fill();
  // Water level.
  const level = r * 0.72 * (0.25 + frac * 0.75);
  ctx.fillStyle = frac > 0.9 ? '#1fb6d8' : PALETTE.reservoir;
  ctx.shadowColor = PALETTE.channelGlow; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.ellipse(0, r * 0.72 - level, r - 6, level, 0, Math.PI, 0); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
  text(ctx, 'RESERVOIR', RESERVOIR.x - 88, RESERVOIR.y - 4, 12, '#bdf6ff', 'right');
  text(ctx, `${Math.floor(s.reservoir.stored)}/${s.reservoir.cap}`, RESERVOIR.x, RESERVOIR.y + 4, 13, '#eaf2ff', 'center');
  if (frac > 0.9) text(ctx, 'FULL!', RESERVOIR.x, RESERVOIR.y + 22, 11, '#ff9d5c', 'center');
}

function drawMill(ctx, s) {
  const { x, y } = MILL;
  ctx.fillStyle = PALETTE.millWood;
  rr(ctx, x - 34, y - 18, 68, 44, 4); ctx.fill();
  ctx.fillStyle = '#6b4423';
  ctx.beginPath(); ctx.moveTo(x - 38, y - 18); ctx.lineTo(x, y - 42); ctx.lineTo(x + 38, y - 18); ctx.closePath(); ctx.fill();
  // Wheel, spinning with the water.
  ctx.save();
  ctx.translate(x - 44, y + 8);
  ctx.rotate(s.mill.spin);
  ctx.strokeStyle = '#d9a05b';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); ctx.stroke();
  }
  ctx.restore();
  text(ctx, 'MILL', x, y - 52, 12, '#ffd27a', 'center');
  text(ctx, `¢ ${s.stats.millCoins}`, x, y + 40, 11, PALETTE.gold, 'center');
}

function drawFarms(ctx, s) {
  for (const def of FARMS) {
    const f = s.farms[def.id];
    const frac = Math.min(1, f.water / f.need);
    ctx.save();
    ctx.translate(def.x, def.y);
    ctx.fillStyle = f.watered ? '#3d2f16' : '#241c10';
    rr(ctx, -72, -26, 144, 52, 6); ctx.fill();
    // Wheat rows: green-gold when watered, dry brown when thirsty.
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 9; c++) {
        const lit = frac > (c / 9);
        ctx.fillStyle = lit ? PALETTE.wheat : PALETTE.wheatDry;
        const sway = Math.sin(s.anim * 1.6 + c * 0.7 + r) * 1.5;
        ctx.fillRect(-62 + c * 14 + sway, -18 + r * 11, 3, 9);
      }
    }
    ctx.restore();
    text(ctx, f.watered ? '✓ ' + def.name : def.name, def.x, def.y - 38, 11, f.watered ? PALETTE.ok : '#e8d9a0', 'center');
    // Need bar.
    ctx.fillStyle = '#0a1428';
    rr(ctx, def.x - 36, def.y + 32, 72, 6, 3); ctx.fill();
    ctx.fillStyle = f.watered ? PALETTE.ok : '#59b7ff';
    rr(ctx, def.x - 36, def.y + 32, 72 * frac, 6, 3); ctx.fill();
  }
}

function drawTowns(ctx, s) {
  for (const t of s.towns) {
    if (t.lost) {
      // Ruined town: grey shells, no lights.
      ctx.fillStyle = '#2a2f45';
      for (let i = 0; i < 3; i++) {
        rr(ctx, t.x - 52 + i * 36, t.y - 14, 30, 26, 3); ctx.fill();
      }
      text(ctx, t.name, t.x, t.y - 30, 11, '#6b7ea6', 'center');
      text(ctx, '✕ ABANDONED', t.x, t.y + 26, 11, '#ff5d5d', 'center');
      continue;
    }
    // Houses with amber windows when watered.
    const lit = t.watered;
    const cols = ['#7a3b4f', '#4f6b8a', '#8a5a33'];
    for (let i = 0; i < 3; i++) {
      const hx = t.x - 52 + i * 36;
      ctx.fillStyle = cols[i];
      rr(ctx, hx, t.y - 16, 30, 28, 3); ctx.fill();
      ctx.fillStyle = '#2c1e2e';
      ctx.beginPath(); ctx.moveTo(hx - 2, t.y - 16); ctx.lineTo(hx + 15, t.y - 30); ctx.lineTo(hx + 32, t.y - 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = lit ? PALETTE.townLight : '#3a3f5c';
      if (lit) { ctx.shadowColor = PALETTE.townLight; ctx.shadowBlur = 8; }
      ctx.fillRect(hx + 10, t.y - 6, 9, 9);
      ctx.shadowBlur = 0;
    }
    text(ctx, t.name, t.x, t.y - 40, 11, PALETTE.ink, 'center');
    // Tank bar + hearts.
    const frac = Math.min(1, t.tank / t.need);
    ctx.fillStyle = '#0a1428';
    rr(ctx, t.x - 34, t.y + 18, 68, 6, 3); ctx.fill();
    ctx.fillStyle = lit ? PALETTE.ok : '#59b7ff';
    rr(ctx, t.x - 34, t.y + 18, 68 * frac, 6, 3); ctx.fill();
    text(ctx, '♥'.repeat(t.health) + '♡'.repeat(Math.max(0, 3 - t.health)), t.x, t.y + 36, 11, '#ff7a9e', 'center');
    if (lit) text(ctx, '✓ WATERED', t.x, t.y + 52, 11, PALETTE.ok, 'center');
  }
}

function drawRiver(ctx, s) {
  const flowing = s.gates[5].open && s.gates[5].flow > 0;
  ctx.strokeStyle = flowing ? PALETTE.channelWet : PALETTE.channelDry;
  ctx.lineWidth = flowing ? 12 : 8;
  ctx.lineCap = 'round';
  if (flowing) { ctx.shadowColor = PALETTE.channelGlow; ctx.shadowBlur = 12; }
  ctx.beginPath();
  ctx.moveTo(1236, 298);
  ctx.quadraticCurveTo(1270, 340, 1252, 420);
  ctx.quadraticCurveTo(1240, 520, 1270, 664);
  ctx.stroke();
  ctx.shadowBlur = 0;
  text(ctx, 'RIVER →', 1236, 640, 11, PALETTE.inkDim, 'center');
}

function drawGates(ctx, s) {
  for (const def of GATES) {
    const g = s.gates[def.id];
    const [x, y] = def.gateAt;
    const jammed = g.jam > 0;
    // Post + wheel.
    ctx.fillStyle = '#3a2f22';
    ctx.fillRect(x - 3, y - 20, 6, 40);
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fillStyle = jammed ? '#5c3a1e' : g.open ? '#1d7a8a' : '#33415e';
    ctx.fill();
    ctx.strokeStyle = jammed ? '#ff9d5c' : g.open ? PALETTE.channelGlow : '#7d8fb5';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    if (g.open && !jammed) { ctx.shadowColor = PALETTE.channelGlow; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0; }
    // Spokes.
    ctx.strokeStyle = '#dfe9ff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 4 + (g.open ? s.anim * 0.6 : 0);
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(a) * 11, y - Math.sin(a) * 11);
      ctx.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11);
      ctx.stroke();
    }
    // Key + label (the label drops below the logs while a gate is jammed).
    text(ctx, def.key, x, y - 26, 12, PALETTE.gold, 'center');
    text(ctx, def.short, x, jammed ? y + 62 : y + 30, 10, g.open ? PALETTE.channelGlow : PALETTE.inkDim, 'center');
    if (jammed) {
      // Beaver dam: logs + hp pips.
      ctx.fillStyle = '#8a5a33';
      for (let i = 0; i < 3; i++) {
        rr(ctx, x - 26 + i * 4, y + 12 + i * 6, 52 - i * 8, 7, 3); ctx.fill();
      }
      text(ctx, '🦫 JAM ×' + g.jam, x, y + 46, 11, '#ffb347', 'center');
      if (s.jamFlash > 0 && Math.floor(s.anim * 6) % 2 === 0) {
        ctx.strokeStyle = '#ff5d5d';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.stroke();
      }
    }
    if (s.selected === def.id && s.mode === 'play') {
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawTopBar(ctx, s) {
  ctx.fillStyle = '#0a0f26';
  ctx.fillRect(0, 0, W, TOP_H);
  ctx.fillStyle = 'rgba(89, 230, 255, 0.15)';
  ctx.fillRect(0, TOP_H - 2, W, 2);
  text(ctx, 'HEADWATERS', 14, TOP_H / 2 + 1, 19, PALETTE.channelGlow, 'left');
  text(ctx, 'hold the valley · mind the water', 168, TOP_H / 2 + 2, 11, PALETTE.inkDim, 'left');
  const alive = s.towns.filter((t) => !t.lost).length;
  const watered = s.towns.filter((t) => t.watered).length;
  const items = [
    [`DAY ${s.day}/7`, '#eaf2ff'],
    [`◷ ${Math.max(0, Math.ceil(s.dayLen - s.dayT))}s`, '#eaf2ff'],
    [`¢ ${s.coins}`, PALETTE.gold],
    [`💧 ${Math.floor(s.waterDelivered)}`, '#59e6ff'],
    [`TOWNS ${watered}/${alive}`, alive === 0 ? '#ff5d5d' : '#eaf2ff'],
    [`SCORE ${Math.floor(s.score)}`, '#eaf2ff'],
    [`BEST ${s.best}`, PALETTE.inkDim],
  ];
  let x = 560;
  for (const [label, color] of items) {
    text(ctx, label, x, TOP_H / 2 + 1, 14, color, 'left');
    x += ctx.measureText(label).width + 26;
  }
  const w = WEATHER[s.weather];
  text(ctx, `${w.icon} ${w.label}`, W - 14, TOP_H / 2 + 1, 13, w.color, 'right');
}

function drawLeftPanel(ctx, s) {
  const x = 0, y = TOP_H, w = LEFT_W;
  ctx.fillStyle = 'rgba(8, 13, 32, 0.92)';
  ctx.fillRect(x, y, w, H - TOP_H);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(w - 1, y, 1, H - TOP_H);
  let cy = y + 16;
  text(ctx, 'WEATHER INCOMING', 12, cy, 12, PALETTE.inkDim, 'left');
  cy += 20;
  const fronts = forecastList(s);
  const cur = WEATHER[s.weather];
  panel(ctx, 10, cy, w - 20, 34, cur.color);
  text(ctx, `${cur.icon} NOW: ${cur.label}`, 18, cy + 12, 12, cur.color, 'left');
  text(ctx, `×${cur.mult} flow`, 18, cy + 26, 10, PALETTE.inkDim, 'left');
  cy += 44;
  for (const f of fronts) {
    const fw = WEATHER[f.type];
    text(ctx, `${fw.icon} ${fw.label}`, 12, cy, 11, fw.color, 'left');
    text(ctx, f.boss ? 'DAY 7' : f.tomorrow ? 'TOMORROW' : `in ${f.eta}s`, w - 12, cy, 11, PALETTE.inkDim, 'right');
    cy += 17;
  }
  cy += 8;
  // Boss callout.
  panel(ctx, 10, cy, w - 20, 52, '#ff5d5d');
  text(ctx, '🌊 DAY 7 BOSS', 18, cy + 13, 12, '#ff8d7a', 'left');
  text(ctx, 'THE HUNDRED-YEAR', 18, cy + 28, 11, '#ffb0a0', 'left');
  text(ctx, 'FLOOD · 3 PHASES', 18, cy + 42, 11, '#ffb0a0', 'left');
  cy += 64;
  // Flood risk meter.
  text(ctx, 'FLOOD RISK', 12, cy, 12, PALETTE.inkDim, 'left');
  cy += 12;
  const frac = s.flood / s.floodMax;
  const col = frac > 0.7 ? '#ff5d5d' : frac > 0.45 ? '#ff9d5c' : '#59e6ff';
  ctx.fillStyle = '#0a1428';
  rr(ctx, 10, cy, w - 20, 16, 4); ctx.fill();
  ctx.fillStyle = col;
  rr(ctx, 10, cy, (w - 20) * frac, 16, 4); ctx.fill();
  text(ctx, `${Math.floor(s.flood)}/${s.floodMax}`, w / 2, cy + 8, 11, '#fff', 'center');
  cy += 26;
  text(ctx, frac > 0.7 ? '⚠ OPEN THE SPILLWAY!' : frac > 0.45 ? 'Rising — watch the dam' : 'Dam holding', 12, cy, 11, col, 'left');
  cy += 22;
  // Upgrades owned.
  text(ctx, 'UPGRADES', 12, cy, 12, PALETTE.inkDim, 'left');
  cy += 16;
  if (s.upgrades.length === 0) {
    text(ctx, '— none yet —', 12, cy, 11, PALETTE.inkFaint, 'left');
    cy += 16;
  } else {
    for (const id of s.upgrades) {
      text(ctx, '✓ ' + id.toUpperCase(), 12, cy, 11, PALETTE.ok, 'left');
      cy += 15;
    }
  }
  cy += 6;
  // Log.
  text(ctx, 'VALLEY LOG', 12, cy, 12, PALETTE.inkDim, 'left');
  cy += 16;
  for (const line of s.log.slice(-6)) {
    text(ctx, line.length > 26 ? line.slice(0, 25) + '…' : line, 12, cy, 10, PALETTE.inkFaint, 'left');
    cy += 14;
  }
  // Controls footnote.
  text(ctx, 'CLICK gates · 1-6 keys', 12, H - 30, 10, PALETTE.inkFaint, 'left');
  text(ctx, 'P pause · M sound', 12, H - 16, 10, PALETTE.inkFaint, 'left');
}

function drawGateBar(ctx, s) {
  const y = H - BOT_H;
  ctx.fillStyle = '#0a0f26';
  ctx.fillRect(0, y, W, BOT_H);
  ctx.fillStyle = 'rgba(89, 230, 255, 0.15)';
  ctx.fillRect(0, y, W, 2);
  text(ctx, 'SLUICE GATES — WATER ONLY FLOWS WHERE YOU OPEN IT', 212, y + 18, 12, PALETTE.inkDim, 'left');
  const slotW = (890 - 210) / 6;
  for (let i = 0; i < 6; i++) {
    const def = GATES[i];
    const g = s.gates[i];
    const sx = 210 + i * slotW;
    const sel = s.selected === i;
    panel(ctx, sx + 3, y + 30, slotW - 6, 76, sel ? PALETTE.gold : PALETTE.panelEdge);
    const state = g.jam > 0 ? '🦫 JAMMED' : g.open ? '● OPEN' : '○ SHUT';
    const col = g.jam > 0 ? '#ff9d5c' : g.open ? PALETTE.channelGlow : PALETTE.inkDim;
    text(ctx, `[${def.key}] ${def.short}`, sx + 10, y + 46, 12, '#eaf2ff', 'left');
    text(ctx, state, sx + 10, y + 64, 12, col, 'left');
    if (g.flow > 0.05) text(ctx, `~${g.flow.toFixed(1)}/s`, sx + 10, y + 82, 11, '#59e6ff', 'left');
    else if (g.jam > 0) text(ctx, `click ×${g.jam} to clear`, sx + 10, y + 82, 10, '#ffb347', 'left');
    else text(ctx, def.blurb, sx + 10, y + 82, 9, PALETTE.inkFaint, 'left');
    if (g.open && g.flow > 0.05) {
      ctx.fillStyle = '#59e6ff';
      ctx.fillRect(sx + 10, y + 92, (slotW - 26) * Math.min(1, g.flow / 9), 4);
    }
  }
  // Selected-gate detail panel (right).
  const def = GATES[s.selected];
  const g = s.gates[s.selected];
  panel(ctx, 906, y + 30, 360, 76, PALETTE.gold);
  text(ctx, `▸ ${def.name}`, 918, y + 46, 13, PALETTE.gold, 'left');
  text(ctx, def.blurb, 918, y + 64, 11, PALETTE.inkDim, 'left');
  text(ctx, g.jam > 0 ? `JAMMED — click the gate ${g.jam}× to clear` : g.open ? `OPEN — flowing ~${g.flow.toFixed(1)}/s` : 'SHUT — press its key or click it', 918, y + 82, 11, g.jam > 0 ? '#ff9d5c' : '#eaf2ff', 'left');
  text(ctx, 'WIN: survive Day 7 with ≥1 town standing.', 918, y + 98, 10, PALETTE.inkFaint, 'left');
}

function drawBanner(ctx, s) {
  const msg = s.banner;
  ctx.font = 'bold 15px monospace';
  const w = Math.min(ctx.measureText(msg).width + 36, W - LEFT_W - 24);
  const x = LEFT_W + 12;
  panel(ctx, x, 56, w, 34, '#3b5a9e');
  text(ctx, msg, x + 18, 74, 15, '#eaf2ff', 'left');
}

function drawTitle(ctx, s) {
  ctx.fillStyle = 'rgba(6, 10, 26, 0.72)';
  ctx.fillRect(LEFT_W, TOP_H, W - LEFT_W, H - TOP_H - BOT_H);
  const cx = 740;
  text(ctx, 'HEADWATERS', cx, 170, 64, PALETTE.channelGlow, 'center');
  text(ctx, 'hold the valley · mind the water', cx, 212, 18, '#bdf6ff', 'center');
  text(ctx, 'WATER ONLY FLOWS WHERE YOU OPEN IT', cx, 252, 17, PALETTE.gold, 'center');
  const lines = [
    'Route the mountain spring through 6 sluice gates to reservoirs, the mill,',
    'the wheat fields and 4 towns. Water a town and it pays coin; leave it dry',
    'and it withers. Fill the reservoir too far in a storm and the dam breaks.',
    '',
    'CLICK a gate (or press 1–6) to open / shut it.  Click a beaver dam to clear it.',
    'Between days, draft 1 upgrade from 3.  Day 7 brings THE HUNDRED-YEAR FLOOD.',
  ];
  lines.forEach((l, i) => text(ctx, l, cx, 292 + i * 24, 14, PALETTE.ink, 'center', i === 4 ? 'bold' : 'normal'));
  text(ctx, 'WIN: survive Day 7 with at least 1 town standing.', cx, 452, 15, PALETTE.ok, 'center');
  text(ctx, 'LOSE: the dam breaks — or every town runs dry.', cx, 478, 15, '#ff8d7a', 'center');
  text(ctx, '▶ PRESS ENTER TO BEGIN ◀', cx, 540, 20, '#ffffff', 'center');
  text(ctx, '7 days · weather fronts · beaver dams · upgrade drafts · flood boss', cx, 580, 12, PALETTE.inkDim, 'center');
}

function drawDraftScreen(ctx, s) {
  ctx.fillStyle = 'rgba(6, 10, 26, 0.78)';
  ctx.fillRect(LEFT_W, TOP_H, W - LEFT_W, H - TOP_H - BOT_H);
  const cx = 740;
  text(ctx, `DAY ${s.day - 1} SURVIVED — CHOOSE AN UPGRADE`, cx, 250, 24, PALETTE.gold, 'center');
  text(ctx, 'Pick 1 of 3 — click a card or press 1 / 2 / 3', cx, 282, 14, PALETTE.inkDim, 'center');
  const cards = [300, 530, 760];
  s.draft.forEach((up, i) => {
    const x = cards[i];
    panel(ctx, x, 310, 220, 210, PALETTE.cardEdge);
    ctx.fillStyle = PALETTE.card;
    rr(ctx, x, 310, 220, 210, 8); ctx.fill();
    text(ctx, up.icon, x + 110, 352, 34, PALETTE.channelGlow, 'center');
    text(ctx, up.name, x + 110, 396, 15, '#eaf2ff', 'center');
    wrapText(ctx, up.desc, x + 110, 428, 200, 13, PALETTE.inkDim);
    text(ctx, `[ ${i + 1} ]`, x + 110, 496, 15, PALETTE.gold, 'center');
  });
}

function wrapText(ctx, str, cx, y, maxW, size, color) {
  ctx.font = `bold ${size}px monospace`;
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  lines.forEach((l, i) => text(ctx, l, cx, y + i * 17, size, color, 'center', 'normal'));
}

function drawEndScreen(ctx, s, won) {
  ctx.fillStyle = won ? 'rgba(6, 26, 18, 0.82)' : 'rgba(26, 8, 10, 0.82)';
  ctx.fillRect(LEFT_W, TOP_H, W - LEFT_W, H - TOP_H - BOT_H);
  const cx = 740;
  const st = s.endStats || { days: 0, score: 0, coins: 0, water: 0, towns: 0, jams: 0, upgrades: 0, best: 0 };
  if (won) {
    text(ctx, '👑 THE VALLEY HOLDS', cx, 180, 46, PALETTE.gold, 'center');
    text(ctx, 'You survived the Hundred-Year Flood.', cx, 222, 17, PALETTE.ok, 'center');
  } else {
    text(ctx, 'THE VALLEY IS LOST', cx, 180, 46, '#ff5d5d', 'center');
    text(ctx, s.endReason, cx, 222, 16, '#ffb0a0', 'center');
  }
  panel(ctx, cx - 210, 250, 420, 250, PALETTE.cardEdge);
  const rows = [
    ['DAYS SURVIVED', `${st.days} / 7`],
    ['SCORE', `${st.score}`],
    ['BEST', `${st.best}`],
    ['COIN EARNED', `${st.coins}`],
    ['WATER DELIVERED', `${st.water}`],
    ['TOWNS STANDING', `${st.towns} / 4`],
    ['JAMS CLEARED', `${st.jams}`],
    ['UPGRADES TAKEN', `${st.upgrades}`],
  ];
  rows.forEach((r, i) => {
    text(ctx, r[0], cx - 190, 274 + i * 26, 13, PALETTE.inkDim, 'left');
    text(ctx, r[1], cx + 190, 274 + i * 26, 13, '#eaf2ff', 'right');
  });
  const blink = Math.floor(s.anim * 2) % 2 === 0;
  text(ctx, '▶ PRESS ENTER TO PLAY AGAIN ◀', cx, 556, 19, blink ? '#ffffff' : '#ffd166', 'center');
  text(ctx, won ? 'WIN: survived Day 7 with a town standing.' : 'LOSE: the dam broke, or every town ran dry.', cx, 592, 12, PALETTE.inkDim, 'center');
}

function drawPaused(ctx, s) {
  ctx.fillStyle = 'rgba(6, 10, 26, 0.7)';
  ctx.fillRect(LEFT_W, TOP_H, W - LEFT_W, H - TOP_H - BOT_H);
  text(ctx, '❚❚ PAUSED', 740, 360, 40, '#eaf2ff', 'center');
  text(ctx, 'Press P to resume', 740, 410, 16, PALETTE.inkDim, 'center');
}
