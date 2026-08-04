// Platinum economy: shop purchases, achievements engine, pets, daily gift.
import { G, emit, on } from '../core/state.js';
import { PLAT_ITEMS, ACHIEVEMENTS, petByEggId, petById } from '../data/db.js';
import { addItem, removeItem, addPlat } from './inventory.js';
import { recompute } from './stats.js';
import { Pet } from '../world/entities.js';
import { sfx } from '../core/audio.js';
import { LEVEL_PLAT } from '../data/classes.js';

export function buyPlatItem(platId) {
  const p = G.player;
  const pi = PLAT_ITEMS.find(x => x.id === platId);
  if (!pi) return { ok: false, reason: 'unknown' };
  if (p.plat < pi.plat) return { ok: false, reason: 'plat' };

  const g = pi.give || {};
  if (g.itemId) {
    if (!addItem(g.itemId, g.qty || 1)) return { ok: false, reason: 'bag' };
  } else if (g.effect) {
    const r = applyEffect(g.effect);
    if (!r.ok) return r;
  }
  addPlat(-pi.plat, true);
  sfx.plat();
  emit('platPurchase', pi);
  return { ok: true };
}

function applyEffect(effect) {
  const p = G.player;
  switch (effect) {
    case 'bag+6':
      if (p.invSize >= 48) return { ok: false, reason: 'max' };
      p.invSize += 6;
      while (p.inv.length < p.invSize) p.inv.push(null);
      emit('invChanged');
      return { ok: true };
    case 'bank+12':
      if (p.bankSize >= 72) return { ok: false, reason: 'max' };
      p.bankSize += 12;
      while (p.bank.length < p.bankSize) p.bank.push(null);
      return { ok: true };
    case 'statReset': {
      // manual points are refunded; class base + auto growth stays
      const spent = p.statSpent || {};
      let refunded = 0;
      for (const k of ['str', 'dex', 'int_', 'vit', 'agi']) {
        const s = spent[k] || 0;
        p.stats[k] -= s; refunded += s;
      }
      p.statSpent = { str: 0, dex: 0, int_: 0, vit: 0, agi: 0 };
      p.statPoints += refunded;
      recompute(p);
      emit('statsDirty');
      return { ok: true };
    }
    case 'skillReset': {
      let refunded = 0;
      for (const [id, rank] of Object.entries(p.skillRanks)) {
        for (let r = 1; r <= rank; r++) refunded += r;
        delete p.skillRanks[id];
      }
      p.skillPoints += refunded;
      p.skillSlots = [null, null, null, null];
      emit('skillsChanged');
      return { ok: true };
    }
    case 'exp50_30m':
      pushBuff({ id: 'exptome1', stat: 'exp', pct: 0.5, until: 1800, icon: 'tome', persist: true });
      return { ok: true };
    case 'exp100_30m':
      pushBuff({ id: 'exptome2', stat: 'exp', pct: 1.0, until: 1800, icon: 'tome', persist: true });
      return { ok: true };
    case 'merchant30m':
      pushBuff({ id: 'merchant', stat: 'merchant', until: 1800, icon: 'coin', persist: true });
      return { ok: true };
    case 'dye_azure': p.hair = '#4a9ad8'; emit('equipChanged'); return { ok: true };
    case 'dye_crimson': p.hair = '#c03a4a'; emit('equipChanged'); return { ok: true };
    default: return { ok: false, reason: 'unknown effect' };
  }
}

function pushBuff(b) {
  const p = G.player;
  p.buffs = p.buffs.filter(x => x.id !== b.id);
  p.buffs.push(b);
  recompute(p);
  emit('statsDirty');
}

export function hasMerchantBuff() {
  return G.player.buffs.some(b => b.stat === 'merchant');
}

/* ---------- pets ---------- */
export function hatchEgg(inst, invIdx) {
  const p = G.player;
  const pet = petByEggId(inst.id);
  if (!pet) return false;
  removeAt(invIdx);
  setActivePet(pet.id);
  p.counters.pet_hatched = 1;
  emit('petHatched', pet);
  sfx.levelup();
  return true;
}
function removeAt(idx) {
  const p = G.player;
  const s = p.inv[idx];
  if (!s) return;
  s.qty--; if (s.qty <= 0) p.inv[idx] = null;
  emit('invChanged');
}
export function setActivePet(petId) {
  const p = G.player;
  const pet = petById(petId);
  if (!pet) return;
  p.pet = pet;
  p.petEntity = new Pet(pet, p);
  p.petEntity.x = p.x - 40; p.petEntity.y = p.y;
  recompute(p);
  emit('statsDirty');
}

/* ---------- achievements ---------- */
export function checkAchievements() {
  const p = G.player;
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (p.achievements.includes(a.id)) continue;
    if (achieved(a, p)) {
      p.achievements.push(a.id);
      if (a.rewardPlat) { addPlat(a.rewardPlat); }
      if (a.title && !p.titles.includes(a.title)) p.titles.push(a.title);
      newly.push(a);
    }
  }
  for (const a of newly) emit('achievement', a);
  return newly;
}

function achieved(a, p) {
  const c = a.check || {};
  switch (c.type) {
    case 'kills': return p.counters.total_kills >= c.n;
    case 'killMonster': return (p.kills[c.key] || 0) >= c.n;
    case 'level': return p.level >= c.n;
    case 'gold': return p.counters.gold_earned >= c.n;
    case 'quests':
      if (c.key === 'main') return p.quests.done.filter(q => q.startsWith('mq_')).length >= c.n;
      return p.counters.quests_done >= c.n;
    case 'enhance': return p.counters.enhance_best >= c.n;
    case 'bosses': return p.counters.bosses >= c.n;
    case 'zones': return p.counters.zones.length >= c.n;
    case 'platSpent': return p.counters.plat_spent >= c.n;
    case 'petHatch': return !!p.counters.pet_hatched;
    default: return false;
  }
}

/* ---------- daily gift + level milestones ---------- */
export function initPremium() {
  on('monsterKilled', () => checkAchievements());
  on('questCompleted', () => checkAchievements());
  on('levelUp', () => {
    const p = G.player;
    const plat = LEVEL_PLAT[p.level];
    if (plat && !G.flags['lvlplat_' + p.level]) {
      G.flags['lvlplat_' + p.level] = true;
      addPlat(plat);
      emit('platGain', plat, `Level ${p.level} milestone`);
    }
    checkAchievements();
  });
  on('enhanced', () => checkAchievements());
  on('platPurchase', () => checkAchievements());
  on('petHatched', () => checkAchievements());
  on('zoneDiscovered', () => checkAchievements());
  on('hatchEgg', (inst, idx) => hatchEgg(inst, idx));

  // daily gift
  const today = new Date().toISOString().slice(0, 10);
  if (G.flags.dailyGift !== today) {
    G.flags.dailyGift = today;
    addPlat(5);
    setTimeout(() => emit('platGain', 5, 'Daily traveler’s gift'), 1200);
  }
}
