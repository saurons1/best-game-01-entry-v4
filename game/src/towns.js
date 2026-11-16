// HEADWATERS — towns and farms economy: what a day's water is worth,
// and what a dry town costs. Called once when a day ends.

import { TOWN_PAY, FARM_PAY } from './config.js';

export function settleDay(s) {
  const lines = [];
  let coins = 0;

  for (const t of s.towns) {
    if (t.lost) continue;
    if (t.watered) {
      coins += TOWN_PAY;
      s.stats.townsSaved++;
      s.score += 50;
    } else {
      t.health -= 1;
      if (t.health <= 0) {
        t.lost = true;
        lines.push(`${t.name} ran dry and was abandoned.`);
      } else {
        lines.push(`${t.name} went thirsty (${t.health} ♥ left).`);
      }
    }
  }

  const fertile = s.upgrades.includes('fertile');
  for (const f of s.farms) {
    if (f.watered) {
      coins += fertile ? FARM_PAY * 2 : FARM_PAY;
      s.score += 30;
    }
  }

  const watered = s.towns.filter((t) => t.watered).length;
  const fields = s.farms.filter((f) => f.watered).length;
  lines.unshift(`Day ${s.day} ends: ${watered}/4 towns watered, ${fields}/2 fields green, +${coins} coin.`);
  return { coins, lines };
}
