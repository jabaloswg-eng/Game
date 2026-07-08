// progression.js — experience, levels (1–50), and saving progress in the
// browser so it survives page reloads.

const MAX_LEVEL = 50;
const SAVE_KEY = 'valley-save-v1';

// XP needed to go from `level` to `level + 1`. Deliberately steep: early
// levels take a handful of kills, later ones take hundreds and thousands.
export function xpToNext(level) {
  return Math.round(50 * Math.pow(level, 1.8));
}

export function createProgression() {
  let level = 1;
  let xp = 0;

  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved && Number.isFinite(saved.level) && Number.isFinite(saved.xp)) {
      level = Math.min(MAX_LEVEL, Math.max(1, Math.floor(saved.level)));
      xp = Math.max(0, Math.floor(saved.xp));
    }
  } catch { /* no save or corrupted save — start fresh */ }

  const badge = document.getElementById('levelbadge');
  const xpFill = document.getElementById('xpfill');
  const banner = document.getElementById('levelup');

  function refreshHud() {
    badge.textContent = `Lv ${level}`;
    const need = xpToNext(level);
    xpFill.style.width = level >= MAX_LEVEL ? '100%' : `${Math.min(100, (xp / need) * 100)}%`;
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ level, xp }));
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

  return {
    gainXP,
    get level() { return level; },
    get xp() { return xp; },
    maxHp: () => 100 + (level - 1) * 6,
    swordDamage: () => 25 + (level - 1),
  };
}
