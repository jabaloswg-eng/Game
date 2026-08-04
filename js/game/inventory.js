// Inventory, equipment, bank, gold/plat, potions, enhancement.
import { G, emit } from '../core/state.js';
import { itemById, EQUIP_TYPES, UPGRADABLE, ENHANCE, sellPrice } from '../data/db.js';
import { recompute } from './stats.js';
import { chance } from '../core/util.js';
import { sfx } from '../core/audio.js';

// Inventory instances: {id, qty, plus?, lvl?} — gear qty always 1.
export function addItem(id, qty = 1, inst = null) {
  const p = G.player;
  const item = itemById(id);
  if (!item) return false;
  if (item.stack > 1) {
    // top up existing stacks
    for (const s of p.inv) {
      if (s && s.id === id && s.qty < item.stack) {
        const room = item.stack - s.qty;
        const put = Math.min(room, qty);
        s.qty += put; qty -= put;
        if (qty <= 0) { emit('invChanged'); return true; }
      }
    }
  }
  while (qty > 0) {
    const idx = p.inv.findIndex((s, i) => i < p.invSize && s === null);
    if (idx === -1) { emit('invChanged'); return false; }
    const put = item.stack > 1 ? Math.min(item.stack, qty) : 1;
    p.inv[idx] = inst ? { ...inst } : { id, qty: put, ...(EQUIP_TYPES.has(item.type) ? { plus: 0, lvl: item.lvl } : {}) };
    qty -= put;
  }
  emit('invChanged');
  return true;
}

export function removeItem(id, qty = 1) {
  const p = G.player;
  let need = qty;
  for (let i = 0; i < p.inv.length && need > 0; i++) {
    const s = p.inv[i];
    if (s && s.id === id) {
      const take = Math.min(s.qty, need);
      s.qty -= take; need -= take;
      if (s.qty <= 0) p.inv[i] = null;
    }
  }
  emit('invChanged');
  return need === 0;
}

export function countItem(id) {
  return G.player.inv.reduce((n, s) => n + (s && s.id === id ? s.qty : 0), 0);
}

export function addGold(n) {
  G.player.gold += n;
  if (n > 0) G.player.counters.gold_earned += n;
  emit('goldChanged');
}
export function addPlat(n, spent = false) {
  G.player.plat += n;
  if (spent && n < 0) G.player.counters.plat_spent += -n;
  emit('platChanged');
}

export function equipFromInv(invIdx) {
  const p = G.player;
  const inst = p.inv[invIdx];
  if (!inst) return false;
  const item = itemById(inst.id);
  if (!item || !EQUIP_TYPES.has(item.type)) return false;
  if (item.cls !== 'any' && item.cls !== p.cls) { emit('wrongClass', item); return false; }
  if (item.lvl > p.level) { emit('lowLevel', item); return false; }
  const slot = item.type;
  const old = p.equip[slot];
  p.equip[slot] = { id: inst.id, plus: inst.plus || 0, lvl: item.lvl };
  p.inv[invIdx] = old ? { id: old.id, qty: 1, plus: old.plus || 0, lvl: old.lvl } : null;
  recompute(p);
  sfx.open();
  emit('invChanged'); emit('equipChanged');
  return true;
}

export function unequip(slot) {
  const p = G.player;
  const inst = p.equip[slot];
  if (!inst) return false;
  const idx = p.inv.findIndex((s, i) => i < p.invSize && s === null);
  if (idx === -1) { emit('bagFull', itemById(inst.id)); return false; }
  p.inv[idx] = { id: inst.id, qty: 1, plus: inst.plus || 0, lvl: inst.lvl };
  p.equip[slot] = null;
  recompute(p);
  emit('invChanged'); emit('equipChanged');
  return true;
}

export function usePotionSlot(which) { // 0 = best HP potion, 1 = best MP potion
  const p = G.player;
  if (p.dead) return false;
  const ids = which === 0 ? ['p_hp_4', 'p_hp_3', 'p_hp_2', 'p_hp_1'] : ['p_mp_4', 'p_mp_3', 'p_mp_2', 'p_mp_1'];
  for (const id of ids) {
    if (countItem(id) > 0) return useItemById(id);
  }
  emit('noPotion', which);
  return false;
}

export function useItemById(id) {
  const idx = G.player.inv.findIndex(s => s && s.id === id);
  return idx >= 0 ? useItemAt(idx) : false;
}

export function useItemAt(invIdx) {
  const p = G.player;
  const inst = p.inv[invIdx];
  if (!inst) return false;
  const item = itemById(inst.id);
  if (!item) return false;

  if (EQUIP_TYPES.has(item.type)) return equipFromInv(invIdx);

  if (item.type === 'egg') { emit('hatchEgg', inst, invIdx); return true; }

  if (item.id === 'plat_feather') return false; // used from death screen only

  if (!item.use) return false;
  let used = false;
  if (item.use.heal) { p.hp = Math.min(p.d.hpMax, p.hp + item.use.heal); used = true; sfx.potion();
    emit('healed', item.use.heal); }
  if (item.use.mana) { p.mp = Math.min(p.d.mpMax, p.mp + item.use.mana); used = true; sfx.potion();
    emit('healed', 0); }
  if (item.use.buff) {
    const b = item.use.buff;
    p.buffs = p.buffs.filter(x => x.id !== item.id);
    p.buffs.push({ id: item.id, stat: b.stat, amount: b.amount, pct: b.pct, until: b.dur, icon: 'food' });
    recompute(p);
    used = true; sfx.buff();
  }
  if (item.use.teleport) { emit('teleport', item.use.teleport); used = true; }
  if (used) {
    inst.qty--;
    if (inst.qty <= 0) p.inv[invIdx] = null;
    emit('invChanged');
  }
  return used;
}

/* ---------- bank ---------- */
export function bankDeposit(invIdx) {
  const p = G.player;
  const inst = p.inv[invIdx];
  if (!inst) return false;
  const idx = p.bank.findIndex((s, i) => i < p.bankSize && s === null);
  if (idx === -1) { emit('bankFull'); return false; }
  p.bank[idx] = inst;
  p.inv[invIdx] = null;
  emit('invChanged');
  return true;
}
export function bankWithdraw(bankIdx) {
  const p = G.player;
  const inst = p.bank[bankIdx];
  if (!inst) return false;
  const idx = p.inv.findIndex((s, i) => i < p.invSize && s === null);
  if (idx === -1) { emit('bagFull', itemById(inst.id)); return false; }
  p.inv[idx] = inst;
  p.bank[bankIdx] = null;
  emit('invChanged');
  return true;
}

/* ---------- merchant ---------- */
export function buyItem(id, qty = 1) {
  const p = G.player;
  const item = itemById(id);
  if (!item) return false;
  const cost = item.price * qty;
  if (p.gold < cost) { emit('noGold'); return false; }
  if (!addItem(id, qty)) { emit('bagFull', item); return false; }
  p.gold -= cost;
  sfx.coin();
  emit('goldChanged');
  return true;
}
export function sellItemAt(invIdx, qty = 1) {
  const p = G.player;
  const inst = p.inv[invIdx];
  if (!inst) return false;
  const item = itemById(inst.id);
  if (!item || item.type === 'quest') { emit('cantSell'); return false; }
  const take = Math.min(qty, inst.qty);
  const value = sellPrice(item) * take + Math.round((inst.plus || 0) * item.price * 0.1);
  inst.qty -= take;
  if (inst.qty <= 0) p.inv[invIdx] = null;
  addGold(value);
  sfx.coin();
  emit('invChanged');
  return true;
}

/* ---------- enhancement (blacksmith) ---------- */
export function canEnhance(inst) {
  if (!inst) return null;
  const item = itemById(inst.id);
  if (!item || !UPGRADABLE.has(item.type)) return null;
  const plus = inst.plus || 0;
  if (plus >= ENHANCE.max) return null;
  const target = plus + 1;
  const stoneTier = ENHANCE.stoneTier(target);
  const stoneId = (item.type === 'weapon' ? 'wstone_' : 'astone_') + stoneTier;
  return {
    target, stoneId, stoneTier,
    gold: ENHANCE.goldCost(item, target),
    chance: ENHANCE.chance[target],
    riskDrop: target > ENHANCE.dropFrom,
    riskShatter: target > ENHANCE.shatterFrom,
  };
}

export function enhance(where, idx, useBlessed, useRune) {
  // where: 'inv' | 'equip' — idx is inv index or slot name
  const p = G.player;
  const inst = where === 'inv' ? p.inv[idx] : p.equip[idx];
  const info = canEnhance(inst);
  if (!info) return { ok: false, reason: 'invalid' };
  if (p.gold < info.gold) return { ok: false, reason: 'gold' };
  const stoneId = useBlessed ? 'plat_bwstone' : info.stoneId;
  if (countItem(stoneId) < 1) return { ok: false, reason: 'stone' };
  if (useRune && countItem('plat_grune') < 1) return { ok: false, reason: 'rune' };

  p.gold -= info.gold;
  removeItem(stoneId, 1);
  if (useRune) removeItem('plat_grune', 1);

  let ch = info.chance + (useBlessed ? 0.15 : 0);
  const success = chance(Math.min(0.95, ch));
  let result;
  if (success) {
    inst.plus = info.target;
    p.counters.enhance_best = Math.max(p.counters.enhance_best, inst.plus);
    result = { ok: true, success: true, plus: inst.plus };
    sfx.forge();
  } else if (info.riskShatter && !useRune) {
    if (where === 'inv') p.inv[idx] = null; else p.equip[idx] = null;
    result = { ok: true, success: false, shattered: true };
    sfx.forgeFail();
  } else if (info.riskDrop) {
    inst.plus = Math.max(0, (inst.plus || 0) - 1);
    result = { ok: true, success: false, dropped: true, plus: inst.plus };
    sfx.forgeFail();
  } else {
    result = { ok: true, success: false, plus: inst.plus || 0 };
    sfx.forgeFail();
  }
  recompute(p);
  emit('invChanged'); emit('equipChanged'); emit('goldChanged'); emit('enhanced', result);
  return result;
}
