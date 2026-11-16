// HEADWATERS — the between-days upgrade draft: pick 1 of 3 from the pool
// of upgrades not yet taken. The draft is the run's build: reservoir depth,
// gate speed, flood defence, mill income, or jam-clearing.

import { UPGRADES } from './config.js';
import { shuffle } from './random.js';

export function drawDraft(s) {
  const left = UPGRADES.filter((u) => !s.upgrades.includes(u.id));
  const pool = left.length >= 3 ? left : UPGRADES.filter((u) => !s.upgrades.includes(u.id));
  const picks = shuffle(s.rng, pool).slice(0, 3);
  // If the pool is nearly empty, allow repeats of nothing: pad with the
  // three cheapest-feeling leftovers (never happens before day 6 in practice).
  while (picks.length < 3) picks.push(UPGRADES.find((u) => !picks.includes(u)));
  return picks;
}
