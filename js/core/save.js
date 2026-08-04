// Save system: three character slots in localStorage, autosave-friendly.
const KEY = 'emberveil_save_v1';

function loadRoot() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { slots: [null, null, null] }; }
  catch { return { slots: [null, null, null] }; }
}
function storeRoot(root) {
  try { localStorage.setItem(KEY, JSON.stringify(root)); return true; }
  catch { return false; }
}

export function listSlots() { return loadRoot().slots; }

export function saveSlot(slot, data) {
  const root = loadRoot();
  root.slots[slot] = data;
  return storeRoot(root);
}

export function loadSlot(slot) { return loadRoot().slots[slot] || null; }

export function deleteSlot(slot) {
  const root = loadRoot();
  root.slots[slot] = null;
  storeRoot(root);
}

// Serialize the live player + world position into a plain object.
export function snapshot(G) {
  const p = G.player;
  return {
    v: 1, savedAt: Date.now(),
    name: p.name, cls: p.cls, hair: p.hair,
    level: p.level, exp: p.exp,
    stats: { ...p.stats }, autoGain: { ...p.autoGain }, statSpent: { ...p.statSpent },
    statPoints: p.statPoints, skillPoints: p.skillPoints,
    skillRanks: { ...p.skillRanks }, skillSlots: [...p.skillSlots],
    hp: p.hp, mp: p.mp,
    gold: p.gold, plat: p.plat,
    inv: p.inv.map(it => it ? { ...it } : null),
    invSize: p.invSize,
    equip: Object.fromEntries(Object.entries(p.equip).map(([k, v]) => [k, v ? { ...v } : null])),
    bank: p.bank.map(it => it ? { ...it } : null),
    bankSize: p.bankSize,
    quests: JSON.parse(JSON.stringify(p.quests)),
    kills: { ...p.kills }, counters: { ...p.counters },
    achievements: [...p.achievements], titles: [...p.titles], title: p.title,
    pet: p.pet ? { id: p.pet.id } : null,
    buffs: p.buffs.filter(b => b.persist).map(b => ({ ...b })),
    zone: G.zone?.def.id || 'lumenhold',
    x: p.x, y: p.y,
    flags: { ...G.flags },
    settings: { ...G.settings },
    playSeconds: p.playSeconds || 0,
  };
}
