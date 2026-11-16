// HEADWATERS — particles: splashes, coin sparkles, jam chips, rain and snow.
// All motion is cosmetic; nothing here touches the simulation.

import { WEATHER } from './config.js';

export function spawnSplash(s, x, y, n = 3) {
  for (let i = 0; i < n; i++) {
    s.fx.push({
      kind: 'drop', x, y,
      vx: (s.rng() - 0.5) * 60, vy: -20 - s.rng() * 60,
      life: 0.5 + s.rng() * 0.3, max: 0.8, size: 2 + s.rng() * 2.5,
      color: '#59e6ff',
    });
  }
}

export function spawnCoinSpark(s, x, y) {
  s.fx.push({
    kind: 'coin', x, y, vx: 0, vy: -46, life: 0.9, max: 0.9, size: 5, color: '#ffd166',
  });
}

export function spawnRain(s, dt) {
  const w = WEATHER[s.weather];
  const heavy = s.weather === 'storm' || s.weather.startsWith('surge');
  const rate = s.weather === 'rain' ? 40 : heavy ? 90 : s.weather === 'snowmelt' ? 14 : 0;
  if (rate <= 0) return;
  if (s.rng() < rate * dt) {
    s.rain.push({
      x: 200 + s.rng() * 1080, y: -10,
      vy: 320 + s.rng() * 160, vx: heavy ? -60 : -18,
      snow: s.weather === 'snowmelt',
    });
  }
  if (s.rain.length > 260) s.rain.splice(0, s.rain.length - 260);
}

export function updateFx(s, dt) {
  for (let i = s.fx.length - 1; i >= 0; i--) {
    const p = s.fx[i];
    p.life -= dt;
    if (p.life <= 0) { s.fx.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.kind === 'drop' ? 260 * dt : 0;
  }
  for (let i = s.rain.length - 1; i >= 0; i--) {
    const r = s.rain[i];
    r.y += r.vy * dt;
    r.x += r.vx * dt;
    if (r.y > 800) s.rain.splice(i, 1);
  }
}

export function drawFx(ctx, s) {
  for (const p of s.fx) {
    const a = Math.max(0, p.life / p.max);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    if (p.kind === 'coin') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('¢', p.x, p.y + 3);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(140, 200, 255, 0.4)';
  ctx.lineWidth = 1;
  for (const r of s.rain) {
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x + r.vx * 0.03, r.y + (r.snow ? 8 : 16));
    ctx.stroke();
  }
}
