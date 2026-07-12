// progression.js — experience, levels (1–50), and saving progress in the
// browser so it survives page reloads.

const MAX_LEVEL = 50;
const SAVE_KEY = 'valley-save-v1';

// The talent tree: three branches, unlocked top to bottom, one skill
// point per level-up. Effects are applied in main.js via has(id).
export const TALENT_TREE = [
  { branch: 'Warrior', icon: '⚔️', color: '#e0885a', nodes: [
    { id: 'w1', name: 'Sharpened Blade', desc: '+5 sword damage' },
    { id: 'w2', name: 'Relentless', desc: 'Charge cooldown −2s' },
    { id: 'w3', name: 'Brutal Strikes', desc: '+10 sword damage' },
    { id: 'w4', name: 'Devastating Charge', desc: 'Charge slash deals ×2.2 damage' },
    { id: 'w5', name: 'Echo Charge', desc: 'For 15s after a Charge, you may Charge once more, ignoring its cooldown' },
  ]},
  { branch: 'Agility', icon: '💨', color: '#7ec8e3', nodes: [
    { id: 'a1', name: 'Fleet Foot', desc: '+10% movement speed' },
    { id: 'a2', name: 'Wind Step', desc: 'Dash cooldown −0.6s' },
    { id: 'a3', name: 'Sprinter', desc: '+12% sprint speed' },
    { id: 'a4', name: 'Sky Hop', desc: 'Jump a second time in mid-air' },
  ]},
  { branch: 'Vitality', icon: '❤️', color: '#8fce6e', nodes: [
    { id: 'v1', name: 'Tough Hide', desc: '+30 max HP' },
    { id: 'v2', name: 'Quick Mending', desc: 'Regeneration +2.5 HP/s' },
    { id: 'v3', name: 'Stoneskin', desc: 'Damage taken −15%' },
    { id: 'v4', name: 'Colossus', desc: '+50 max HP' },
  ]},
];

// XP needed to go from `level` to `level + 1`. Deliberately steep: early
// levels take a handful of kills, later ones take hundreds and thousands.
export function xpToNext(level) {
  return Math.round(50 * Math.pow(level, 1.8));
}

const ALL_NODE_IDS = new Set(TALENT_TREE.flatMap((b) => b.nodes.map((n) => n.id)));

export function createProgression() {
  let level = 1;
  let xp = 0;
  let talents = new Set();
  let gold = 0;
  let potions = 0;

  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved && Number.isFinite(saved.level) && Number.isFinite(saved.xp)) {
      level = Math.min(MAX_LEVEL, Math.max(1, Math.floor(saved.level)));
      xp = Math.max(0, Math.floor(saved.xp));
      if (Array.isArray(saved.talents)) {
        talents = new Set(saved.talents.filter((t) => ALL_NODE_IDS.has(t)));
      }
      gold = Math.max(0, Math.floor(saved.gold || 0));
      potions = Math.max(0, Math.floor(saved.potions || 0));
    }
  } catch { /* no save or corrupted save — start fresh */ }

  const badge = document.getElementById('levelbadge');
  const xpFill = document.getElementById('xpfill');
  const banner = document.getElementById('levelup');

  function availablePoints() {
    return Math.max(0, level - 1 - talents.size);
  }

  function refreshHud() {
    badge.textContent = `Lv ${level}`;
    badge.classList.toggle('points', availablePoints() > 0);
    const need = xpToNext(level);
    xpFill.style.width = level >= MAX_LEVEL ? '100%' : `${Math.min(100, (xp / need) * 100)}%`;
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        level, xp, talents: [...talents], gold, potions,
      }));
    } catch { /* storage may be unavailable (private mode) — play on */ }
  }

  // returns true when this gain caused a level-up
  function gainXP(amount) {
    if (level >= MAX_LEVEL) return false;
    xp += amount;
    let leveled = false;
    while (level < MAX_LEVEL && xp >= xpToNext(level)) {
      xp -= xpToNext(level);
      level++;
      leveled = true;
    }
    refreshHud();
    save();
    if (leveled) {
      banner.classList.add('show');
      setTimeout(() => banner.classList.remove('show'), 2200);
    }
    return leveled;
  }

  refreshHud();

  const has = (id) => talents.has(id);

  // a node can be learned with a free point once the node above it is owned
  function canLearn(id) {
    if (has(id) || availablePoints() <= 0) return false;
    for (const b of TALENT_TREE) {
      const i = b.nodes.findIndex((n) => n.id === id);
      if (i === 0) return true;
      if (i > 0) return has(b.nodes[i - 1].id);
    }
    return false;
  }

  function learn(id) {
    if (!canLearn(id)) return false;
    talents.add(id);
    refreshHud();
    save();
    return true;
  }

  return {
    gainXP,
    get level() { return level; },
    get xp() { return xp; },
    get gold() { return gold; },
    get potions() { return potions; },
    addGold(n) { gold += n; save(); },
    addPotion(n = 1) { potions += n; save(); },
    usePotion() {
      if (potions <= 0) return false;
      potions--;
      save();
      return true;
    },
    has, canLearn, learn, availablePoints,
    get talents() { return [...talents]; },
    maxHp: () => 100 + (level - 1) * 6 + (has('v1') ? 30 : 0) + (has('v4') ? 50 : 0),
    swordDamage: () => 25 + (level - 1) + (has('w1') ? 5 : 0) + (has('w3') ? 10 : 0),
  };
}
