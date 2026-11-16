// HEADWATERS — input: pointer and keyboard, with hit-testing against gates,
// jams, draft cards and the bottom gate bar. Coordinates are converted from
// CSS pixels to the 1280x800 logical canvas before any test.

import { W, H, GATES, BOT_H } from './config.js';

export function toLogical(canvas, clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * W,
    y: ((clientY - r.top) / r.height) * H,
  };
}

// Gate click targets: a generous circle around each gate wheel.
export function hitGate(x, y) {
  for (const g of GATES) {
    const dx = x - g.gateAt[0];
    const dy = y - g.gateAt[1];
    if (dx * dx + dy * dy <= 30 * 30) return g.id;
  }
  return -1;
}

// A jam sits on its gate; clicking the jammed gate clears it instead of toggling.
export function hitJam(s, x, y) {
  const id = hitGate(x, y);
  if (id >= 0 && s.gates[id].jam > 0) return id;
  return -1;
}

// Bottom gate bar: six slots across the width.
export function hitGateBar(x, y) {
  if (y < H - BOT_H || y > H - 8) return -1;
  if (x < 210 || x > 890) return -1;
  const i = Math.floor((x - 210) / ((890 - 210) / 6));
  return i >= 0 && i < 6 ? i : -1;
}

// Draft cards: three cards centred in the valley.
export function hitDraftCard(x, y) {
  if (y < 300 || y > 560) return -1;
  const cards = [300, 530, 760];
  for (let i = 0; i < 3; i++) {
    if (x >= cards[i] && x <= cards[i] + 220) return i;
  }
  return -1;
}

export function hitRestartButton(x, y) {
  // The PRESS ENTER line is keyboard-driven; the button rect is for clicks.
  return x >= 540 && x <= 740 && y >= 640 && y <= 690;
}
