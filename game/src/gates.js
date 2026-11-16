// HEADWATERS — gate flow: the water network's plumbing.
// Spring -> reservoir/mill, reservoir -> farms/towns/spillway, mill -> towns.
// Each tick moves real water; every unit is counted for score and flood.

import { GATES, WEATHER, MILL_RATE } from './config.js';

function gateRate(s, id) {
  const base = GATES[id].rate;
  let r = base;
  if (s.upgrades.includes('fastgate')) r *= 1.5;
  if (id === 5 && s.upgrades.includes('bigspill')) r *= 2;
  return r;
}

export function springFlow(s) {
  const w = WEATHER[s.weather];
  return s.springBase * w.mult;
}

export function stepGates(s, dt) {
  const g = s.gates;
  for (const gate of g) gate.flow = 0;

  // --- Spring split: gates 1 and 2 share the spring in proportion to their
  // rates, so opening one throttles the other but never starves it outright.
  let spring = springFlow(s);
  const want0 = g[0].open && g[0].jam === 0 ? gateRate(s, 0) : 0;
  const want1 = g[1].open && g[1].jam === 0 ? gateRate(s, 1) : 0;
  const total = want0 + want1;
  let toRes = 0;
  let toMill = 0;
  if (total > 0) {
    toRes = Math.min(want0, (spring * want0) / total);
    toMill = Math.min(want1, (spring * want1) / total);
    spring -= toRes + toMill;
  }
  g[0].flow = toRes;
  g[1].flow = toMill;

  // --- Reservoir: inflow, then outflows (fields, east towns, spillway).
  // Outflows share whatever water is actually there in proportion to their
  // rates, so no single open gate starves the others when the reservoir runs low.
  const res = s.reservoir;
  res.stored += toRes * dt;
  const rFarms = g[2].open && g[2].jam === 0 ? gateRate(s, 2) : 0;
  const rEast = g[3].open && g[3].jam === 0 ? gateRate(s, 3) : 0;
  const rSpill = g[5].open && g[5].jam === 0 ? gateRate(s, 5) : 0;
  const rTotal = rFarms + rEast + rSpill;
  let toFarms = 0, toEast = 0, toSpill = 0;
  if (rTotal > 0 && res.stored > 0) {
    const have = res.stored;
    toFarms = Math.min(rFarms * dt, have * rFarms / rTotal);
    toEast = Math.min(rEast * dt, have * rEast / rTotal);
    toSpill = Math.min(rSpill * dt, have * rSpill / rTotal);
    res.stored = Math.max(0, have - toFarms - toEast - toSpill);
  }
  // Overflow: stored past the cap spills over the dam and feeds the flood.
  const cap = res.cap;
  let overflow = 0;
  if (res.stored > cap) {
    overflow = res.stored - cap;
    res.stored = cap;
    s.flood += overflow * 0.9;
  }
  toFarms /= dt; toEast /= dt; toSpill /= dt;
  g[2].flow = toFarms;
  g[3].flow = toEast;
  g[5].flow = toSpill;
  s.waterSpilled += toSpill * dt;
  // --- Mill: water spins the wheel (coins), then sits in the tailrace buffer.
  const mill = s.mill;
  mill.buffer += toMill * dt;
  mill.spin += toMill * dt * 2.2;
  const millMult = s.upgrades.includes('millwheel') ? 2 : 1;
  // Coins from flow this tick, fractional parts carried in mill.earned.
  const coinUnits = (toMill * dt / MILL_RATE) * millMult;
  mill.earned += coinUnits;
  const whole = Math.floor(mill.earned);
  if (whole > 0) {
    mill.earned -= whole;
    s.coins += whole;
    s.stats.millCoins += whole;
    s.score += whole * 2;
  }

  // --- West towns draw from the mill tailrace through gate 5.
  let toWest = 0;
  if (g[4].open && g[4].jam === 0) {
    toWest = Math.min(gateRate(s, 4), mill.buffer / dt);
    mill.buffer = Math.max(0, mill.buffer - toWest * dt);
  }
  g[4].flow = toWest;
  // Tailrace buffer caps: excess water over the wheel spills harmlessly onward.
  if (mill.buffer > 24) mill.buffer = 24;

  // --- Deliver to farms and towns.
  deliverToFarms(s, toFarms * dt);
  deliverToTowns(s, 'east', toEast * dt);
  deliverToTowns(s, 'west', toWest * dt);

  s._overflow = overflow;
  s._totalFlow = toRes + toMill + toFarms + toEast + toWest + toSpill;
}

function deliverToFarms(s, amount) {
  if (amount <= 0) return;
  const thirsty = s.farms.filter((f) => !f.watered);
  if (thirsty.length === 0) return;
  const share = amount / thirsty.length;
  for (const f of thirsty) {
    f.water += share;
    s.waterDelivered += share;
    if (f.water >= f.need) {
      f.watered = true;
      f.water = f.need;
      s.score += 25;
    }
  }
}

function deliverToTowns(s, side, amount) {
  if (amount <= 0) return;
  const thirsty = s.towns.filter((t) => t.side === side && !t.lost && !t.watered);
  if (thirsty.length === 0) return;
  const share = amount / thirsty.length;
  for (const t of thirsty) {
    t.tank += share;
    s.waterDelivered += share;
    if (t.tank >= t.need) {
      t.watered = true;
      t.tank = t.need;
      s.score += 40;
    }
  }
}
