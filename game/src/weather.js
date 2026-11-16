// HEADWATERS — weather: the day plan, the forecast list, and random events.
// The plan is fixed per day (see config DAY_PLANS); jams and surprises are
// rolled from the seeded RNG so a seed replays exactly.

import { DAY_PLANS, WEATHER } from './config.js';
import { pick } from './random.js';

export function currentFront(s) {
  let type = s.fronts[0].type;
  for (const f of s.fronts) {
    if (s.dayT >= f.at) type = f.type;
  }
  return type;
}

// Next fronts with ETA in seconds, for the WEATHER INCOMING panel.
export function forecastList(s) {
  const out = [];
  for (const f of s.fronts) {
    if (f.at > s.dayT) out.push({ type: f.type, eta: Math.ceil(f.at - s.dayT), now: false });
  }
  // If the day is nearly over, show tomorrow's first front.
  if (out.length < 3 && s.day < 7) {
    const next = DAY_PLANS[s.day][0];
    out.push({ type: next.type, eta: Math.ceil(s.dayLen - s.dayT), now: false, tomorrow: true });
  }
  if (s.day === 7) {
    out.push({ type: 'surge3', eta: 0, now: false, boss: true });
  }
  return out.slice(0, 4);
}

export function planJam(rng) {
  // Any gate except the spillway can jam (a jammed spillway would be a
  // guaranteed flood; the game stays fair by sparing it).
  return pick(rng, [0, 1, 2, 3, 4]);
}

export function planEvent(rng) {
  return pick(rng, ['downpour', 'dry', 'jam']);
}

export function weatherLabel(type) {
  return WEATHER[type] ? WEATHER[type].label : type;
}
