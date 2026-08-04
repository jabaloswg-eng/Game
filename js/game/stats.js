// Derived-stat computation. Called whenever level/stats/gear/buffs change;
// writes the result onto player.d (derived) so hot paths never recompute.
import { CLASSES, expNeed, LEVEL_CAP } from '../data/classes.js';
import { itemById } from '../data/db.js';
import { clamp } from '../core/util.js';

export const PLUS_FACTOR = 0.06; // +N ⇒ +6% weapon atk / armor def per plus

export function gearBonus(player) {
  const sum = { atk: 0, matk: 0, def: 0, str: 0, dex: 0, int_: 0, vit: 0, agi: 0,
    hp: 0, mp: 0, crit: 0, eva: 0 };
  for (const slot of Object.keys(player.equip)) {
    const inst = player.equip[slot];
    if (!inst) continue;
    const it = itemById(inst.id);
    if (!it || !it.stats) continue;
    const plusMul = 1 + PLUS_FACTOR * (inst.plus || 0);
    for (const [k, v] of Object.entries(it.stats)) {
      if (!(k in sum)) continue;
      const boosted = (k === 'atk' || k === 'matk' || k === 'def') ? v * plusMul : v;
      sum[k] += boosted;
    }
  }
  return sum;
}

export function recompute(player) {
  const cls = CLASSES[player.cls];
  const gear = gearBonus(player);
  const petAura = player.pet?.aura || null;

  const str = player.stats.str + gear.str;
  const dex = player.stats.dex + gear.dex;
  const int_ = player.stats.int_ + gear.int_;
  const vit = player.stats.vit + gear.vit;
  const agi = player.stats.agi + gear.agi;

  const d = {};
  d.hpMax = Math.round((50 + vit * 12 + player.level * 8) * cls.hpMult) + gear.hp;
  d.mpMax = Math.round((20 + int_ * 8 + player.level * 4) * cls.mpMult) + gear.mp;

  if (player.cls === 'warrior') d.atk = str * 2.0 + dex * 0.5 + gear.atk;
  else if (player.cls === 'archer') d.atk = dex * 2.0 + str * 0.5 + gear.atk;
  else d.atk = str * 1.2 + gear.atk; // mage melee poke
  d.matk = player.cls === 'mage' ? int_ * 2.2 + gear.matk : int_ * 0.8 + gear.matk;
  d.def = vit * 1.2 + gear.def;
  d.crit = clamp(5 + dex * 0.25 + gear.crit, 0, 45);
  d.eva = clamp(agi * 0.35 + gear.eva, 0, 30);
  d.speed = 170 * (1 + Math.min(agi * 0.002, 0.12));
  d.atkSpd = 1.1; // seconds per basic attack
  d.lifesteal = 0; d.manashield = 0; d.regen = 0; d.pierceGlow = 0;

  if (petAura) {
    if (petAura.stat === 'atk') { d.atk += petAura.amount; d.matk += petAura.amount; }
    else if (petAura.stat === 'def') d.def += petAura.amount;
    else if (petAura.stat === 'mp') d.mpMax += petAura.amount;
    else if (petAura.stat === 'hp') d.hpMax += petAura.amount;
  }

  // Buffs (timed). Each: {stat, pct?, add?, atkPct?, defPct?, evaAdd?, until}
  for (const b of player.buffs) {
    const s = b.stat;
    if (s === 'atk') { d.atk *= 1 + (b.pct || 0); d.matk *= 1 + (b.pct || 0); }
    else if (s === 'matk') d.matk *= 1 + (b.pct || 0);
    else if (s === 'def') d.def *= 1 + (b.pct || 0);
    else if (s === 'crit') d.crit = clamp(d.crit + (b.add || 0), 0, 75);
    else if (s === 'speed') { d.speed *= 1 + (b.pct || 0); d.eva = clamp(d.eva + (b.evaAdd || 0), 0, 60); }
    else if (s === 'atkspd') { d.atkSpd /= 1 + (b.pct || 0); d.atk *= 1 + (b.atkPct || 0); d.def *= 1 + (b.defPct || 0); }
    else if (s === 'lifesteal') d.lifesteal += b.pct || 0;
    else if (s === 'manashield') d.manashield = Math.max(d.manashield, b.pct || 0);
    else if (s === 'regen') d.regen += b.amount || 0;
    else if (s === 'exp') d.expBoost = (d.expBoost || 0) + (b.pct || 0);
  }

  d.atk = Math.round(d.atk); d.matk = Math.round(d.matk); d.def = Math.round(d.def);
  player.d = d;
  player.hp = clamp(player.hp, 0, d.hpMax);
  player.mp = clamp(player.mp, 0, d.mpMax);
  return d;
}

export function grantExp(player, amount) {
  if (player.level >= LEVEL_CAP) return { leveled: false, amount: 0 };
  const boost = 1 + (player.d.expBoost || 0);
  amount = Math.round(amount * boost);
  player.exp += amount;
  let leveled = false;
  while (player.level < LEVEL_CAP && player.exp >= expNeed(player.level)) {
    player.exp -= expNeed(player.level);
    player.level++;
    leveled = true;
    const g = CLASSES[player.cls].grow;
    for (const k of ['str', 'dex', 'int_', 'vit', 'agi']) {
      player.autoGain[k] = (player.autoGain[k] || 0) + g[k];
      const whole = Math.floor(player.autoGain[k]);
      if (whole > 0) { player.stats[k] += whole; player.autoGain[k] -= whole; }
    }
    player.statPoints += 3;
    player.skillPoints += 1;
  }
  if (player.level >= LEVEL_CAP) player.exp = 0;
  return { leveled, amount };
}
