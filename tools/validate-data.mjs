#!/usr/bin/env node
// EMBERVEIL — data validator.
// Checks every js/data/ content module against docs/CONTRACTS.md:
//   - canonical monster/npc/item ids all exist (and nothing invented beyond them)
//   - every cross-reference resolves (drops, shops, quest giver/target/rewards,
//     prereq/next, platshop give.itemId, achievement killMonster keys, pet eggs)
//   - schema field presence + types per contract
//   - Consistency rules 1-4 (rule 5 is editorial and not machine-checkable)
// Exit code 0 = clean, 1 = failures (listed on stderr).

import { ITEMS } from '../js/data/items.js';
import { MONSTERS } from '../js/data/monsters.js';
import { NPCS } from '../js/data/npcs.js';
import { QUESTS } from '../js/data/quests.js';
import { PLAT_ITEMS, PLAT_EXTRA_ITEMS } from '../js/data/platshop.js';
import { ACHIEVEMENTS } from '../js/data/achievements.js';
import { LORE } from '../js/data/lore.js';
import { PETS } from '../js/data/pets.js';

const errors = [];
const err = (m) => errors.push(m);

// ── Canonical vocabulary from CONTRACTS.md ─────────────────────────────────

const ZONES = ['lumenhold', 'dawnmeadow', 'thornwood', 'cinderdunes', 'frostfell', 'hollowdepths'];
// Level bands per contract. Lumenhold is the safe hub town; its merchants serve
// the early-to-mid journey (band 1-17), so the +-8 rule caps town stock at lvl 25
// (endgame gear is drop-only, per design).
const ZONE_BANDS = {
  lumenhold: [1, 17], dawnmeadow: [1, 8], thornwood: [7, 16],
  cinderdunes: [15, 25], frostfell: [24, 33], hollowdepths: [32, 40],
};

const KINDS = ['slime', 'boar', 'wolf', 'wisp', 'mushroom', 'bandit', 'spider', 'scorpion',
  'golem', 'treant', 'wraith', 'skeleton', 'yeti', 'bat', 'drake', 'knight', 'hollowking'];

// id -> { kind, lvl, zone, boss }
const CANON_MONSTERS = {
  dew_slime: { kind: 'slime', lvl: 1, zone: 'dawnmeadow', boss: false },
  meadow_boar: { kind: 'boar', lvl: 3, zone: 'dawnmeadow', boss: false },
  thistle_sprite: { kind: 'wisp', lvl: 5, zone: 'dawnmeadow', boss: false },
  field_wolf: { kind: 'wolf', lvl: 7, zone: 'dawnmeadow', boss: false },
  bramblehide: { kind: 'boar', lvl: 9, zone: 'dawnmeadow', boss: true },
  thorn_creeper: { kind: 'mushroom', lvl: 9, zone: 'thornwood', boss: false },
  bandit_scout: { kind: 'bandit', lvl: 11, zone: 'thornwood', boss: false },
  webweaver: { kind: 'spider', lvl: 12, zone: 'thornwood', boss: false },
  timber_wolf: { kind: 'wolf', lvl: 14, zone: 'thornwood', boss: false },
  bark_treant: { kind: 'treant', lvl: 15, zone: 'thornwood', boss: false },
  oakenheart: { kind: 'treant', lvl: 17, zone: 'thornwood', boss: true },
  ash_scorpion: { kind: 'scorpion', lvl: 17, zone: 'cinderdunes', boss: false },
  dune_marauder: { kind: 'bandit', lvl: 19, zone: 'cinderdunes', boss: false },
  cinder_wisp: { kind: 'wisp', lvl: 21, zone: 'cinderdunes', boss: false },
  sand_golem: { kind: 'golem', lvl: 23, zone: 'cinderdunes', boss: false },
  sirocco: { kind: 'scorpion', lvl: 26, zone: 'cinderdunes', boss: true },
  frost_bat: { kind: 'bat', lvl: 25, zone: 'frostfell', boss: false },
  snow_wolf: { kind: 'wolf', lvl: 27, zone: 'frostfell', boss: false },
  ice_wraith: { kind: 'wraith', lvl: 29, zone: 'frostfell', boss: false },
  frost_yeti: { kind: 'yeti', lvl: 31, zone: 'frostfell', boss: false },
  borealis: { kind: 'drake', lvl: 34, zone: 'frostfell', boss: true },
  hollow_skeleton: { kind: 'skeleton', lvl: 33, zone: 'hollowdepths', boss: false },
  gloom_spider: { kind: 'spider', lvl: 35, zone: 'hollowdepths', boss: false },
  umbral_knight: { kind: 'knight', lvl: 37, zone: 'hollowdepths', boss: false },
  void_wraith: { kind: 'wraith', lvl: 38, zone: 'hollowdepths', boss: false },
  hollow_king: { kind: 'hollowking', lvl: 40, zone: 'hollowdepths', boss: true },
};

// id -> { zone, role, cls }
const CANON_NPCS = {
  elder_maren: { zone: 'lumenhold', role: 'story', cls: null },
  captain_aldric: { zone: 'lumenhold', role: 'trainer', cls: 'warrior' },
  sylvie: { zone: 'lumenhold', role: 'trainer', cls: 'archer' },
  magister_orin: { zone: 'lumenhold', role: 'trainer', cls: 'mage' },
  merchant_bella: { zone: 'lumenhold', role: 'merchant', cls: null },
  torvald: { zone: 'lumenhold', role: 'blacksmith', cls: null },
  banker_odo: { zone: 'lumenhold', role: 'banker', cls: null },
  zephyr: { zone: 'lumenhold', role: 'platinum', cls: null },
  scout_finn: { zone: 'dawnmeadow', role: 'field', cls: null },
  hermit_gale: { zone: 'thornwood', role: 'field', cls: null },
  caravaneer_rasha: { zone: 'cinderdunes', role: 'field', cls: null },
  ranger_eydis: { zone: 'frostfell', role: 'field', cls: null },
  lysander: { zone: 'hollowdepths', role: 'field', cls: null },
};

// Canonical item ids (id conventions section), with expected type per family.
const CANON_ITEMS = new Map(); // id -> expected type
{
  const add = (id, type) => CANON_ITEMS.set(id, type);
  for (const c of ['war', 'arc', 'mag']) {
    for (let k = 1; k <= 8; k++) add(`w_${c}_${k}`, 'weapon');
    for (let k = 1; k <= 6; k++) { add(`c_${c}_${k}`, 'chest'); add(`h_${c}_${k}`, 'helm'); add(`b_${c}_${k}`, 'boots'); }
  }
  for (let k = 1; k <= 4; k++) add(`s_war_${k}`, 'shield');
  for (let k = 1; k <= 5; k++) { add(`r_${k}`, 'ring'); add(`am_${k}`, 'amulet'); }
  for (let k = 1; k <= 4; k++) { add(`p_hp_${k}`, 'potion'); add(`p_mp_${k}`, 'potion'); }
  for (let k = 1; k <= 3; k++) add(`food_${k}`, 'food');
  add('scroll_return', 'scroll');
  for (let k = 1; k <= 3; k++) { add(`wstone_${k}`, 'scroll'); add(`astone_${k}`, 'scroll'); }
  for (const m of ['m_slime_gel', 'm_boar_tusk', 'm_wolf_pelt', 'm_spore_cap', 'm_silk_strand',
    'm_bandit_insignia', 'm_scorpion_stinger', 'm_golem_core', 'm_wisp_ember', 'm_bat_wing',
    'm_wraith_essence', 'm_yeti_fur', 'm_bone_shard', 'm_umbral_plate', 'm_drake_scale',
    'm_void_essence']) add(m, 'material');
  for (let k = 1; k <= 5; k++) add(`q_veilshard_${k}`, 'quest');
  add('q_maren_letter', 'quest'); add('q_caravan_ledger', 'quest'); add('q_frost_bloom', 'quest');
  for (const c of ['cos_duelist', 'cos_scholar', 'cos_ranger', 'cos_shadow']) add(c, 'costume');
  for (const e of ['egg_emberfox', 'egg_frostowl', 'egg_stonepup']) add(e, 'egg');
}
// Extra inventory items the platshop defines (task-mandated additions).
const ALLOWED_PLAT_EXTRA = ['plat_feather', 'plat_bwstone', 'plat_grune'];

const ITEM_TYPES = ['weapon', 'chest', 'helm', 'boots', 'shield', 'ring', 'amulet',
  'potion', 'food', 'scroll', 'material', 'quest', 'costume', 'egg'];
const GEAR_TYPES = ['weapon', 'chest', 'helm', 'boots', 'shield', 'ring', 'amulet'];
const CLASSES = ['warrior', 'archer', 'mage'];
const STAT_KEYS = ['atk', 'matk', 'def', 'str', 'dex', 'int_', 'vit', 'agi', 'hp', 'mp', 'crit', 'eva'];
const NPC_ROLES = ['story', 'trainer', 'merchant', 'blacksmith', 'banker', 'platinum', 'field'];
const QUEST_TYPES = ['kill', 'collect', 'talk', 'boss'];
const PLAT_CATS = ['growth', 'convenience', 'enhance', 'cosmetic', 'pet'];
// Documented effect enum + the three task-mandated additions
// ('merchant30m', 'dye_azure', 'dye_crimson').
const PLAT_EFFECTS = ['bag+6', 'bank+12', 'statReset', 'skillReset', 'exp50_30m', 'exp100_30m',
  'merchant30m', 'dye_azure', 'dye_crimson'];
const ACH_TYPES = ['kills', 'killMonster', 'level', 'gold', 'quests', 'enhance', 'bosses',
  'zones', 'platSpent', 'petHatch'];

// ── Small helpers ──────────────────────────────────────────────────────────

const isStr = (v) => typeof v === 'string' && v.length > 0;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isHex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

function checkDupes(list, name) {
  const seen = new Set();
  for (const e of list) {
    if (seen.has(e.id)) err(`${name}: duplicate id '${e.id}'`);
    seen.add(e.id);
  }
}

function noFunctions(value, path) {
  if (typeof value === 'function') { err(`${path}: data modules must not contain functions`); return; }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) noFunctions(v, `${path}.${k}`);
  }
}

// ── Index the pools ────────────────────────────────────────────────────────

const itemById = new Map();       // ITEMS + PLAT_EXTRA_ITEMS (full inventory pool)
for (const it of [...ITEMS, ...PLAT_EXTRA_ITEMS]) {
  if (itemById.has(it.id)) err(`items pool: duplicate id '${it.id}' across ITEMS/PLAT_EXTRA_ITEMS`);
  itemById.set(it.id, it);
}
const monsterById = new Map(MONSTERS.map((m) => [m.id, m]));
const npcById = new Map(NPCS.map((n) => [n.id, n]));
const questById = new Map(QUESTS.map((q) => [q.id, q]));

checkDupes(ITEMS, 'ITEMS');
checkDupes(PLAT_EXTRA_ITEMS, 'PLAT_EXTRA_ITEMS');
checkDupes(MONSTERS, 'MONSTERS');
checkDupes(NPCS, 'NPCS');
checkDupes(QUESTS, 'QUESTS');
checkDupes(PLAT_ITEMS, 'PLAT_ITEMS');
checkDupes(ACHIEVEMENTS, 'ACHIEVEMENTS');
checkDupes(PETS, 'PETS');

noFunctions({ ITEMS, MONSTERS, NPCS, QUESTS, PLAT_ITEMS, PLAT_EXTRA_ITEMS, ACHIEVEMENTS, LORE, PETS }, 'data');

// ── Canonical coverage: every contract id exists, none invented ────────────

for (const [id, type] of CANON_ITEMS) {
  const it = ITEMS.find((x) => x.id === id);
  if (!it) err(`ITEMS: canonical item '${id}' missing`);
  else if (it.type !== type) err(`ITEMS: '${id}' should be type '${type}', got '${it.type}'`);
}
for (const it of ITEMS) if (!CANON_ITEMS.has(it.id)) err(`ITEMS: '${it.id}' is not a canonical CONTRACTS.md id`);
for (const it of PLAT_EXTRA_ITEMS) if (!ALLOWED_PLAT_EXTRA.includes(it.id)) err(`PLAT_EXTRA_ITEMS: unexpected id '${it.id}'`);

for (const [id, c] of Object.entries(CANON_MONSTERS)) {
  const m = monsterById.get(id);
  if (!m) { err(`MONSTERS: canonical monster '${id}' missing`); continue; }
  if (m.kind !== c.kind) err(`MONSTERS: '${id}' kind should be '${c.kind}', got '${m.kind}'`);
  if (m.lvl !== c.lvl) err(`MONSTERS: '${id}' lvl should be ${c.lvl}, got ${m.lvl}`);
  if (m.boss !== c.boss) err(`MONSTERS: '${id}' boss flag should be ${c.boss}`);
}
for (const m of MONSTERS) if (!CANON_MONSTERS[m.id]) err(`MONSTERS: '${m.id}' is not a canonical CONTRACTS.md id`);

for (const [id, c] of Object.entries(CANON_NPCS)) {
  const n = npcById.get(id);
  if (!n) { err(`NPCS: canonical npc '${id}' missing`); continue; }
  if (n.zone !== c.zone) err(`NPCS: '${id}' zone should be '${c.zone}', got '${n.zone}'`);
  if (n.role !== c.role) err(`NPCS: '${id}' role should be '${c.role}', got '${n.role}'`);
  if (n.cls !== c.cls) err(`NPCS: '${id}' cls should be ${JSON.stringify(c.cls)}, got ${JSON.stringify(n.cls)}`);
}
for (const n of NPCS) if (!CANON_NPCS[n.id]) err(`NPCS: '${n.id}' is not a canonical CONTRACTS.md id`);

for (let k = 1; k <= 10; k++) if (!questById.has(`mq_${k}`)) err(`QUESTS: main-chain quest 'mq_${k}' missing`);

// ── Item schema ────────────────────────────────────────────────────────────

function checkItem(it, src) {
  const w = `${src} '${it.id}'`;
  if (!isStr(it.id)) err(`${src}: item with missing/empty id`);
  if (!isStr(it.name)) err(`${w}: name must be a non-empty string`);
  if (!ITEM_TYPES.includes(it.type)) err(`${w}: bad type '${it.type}'`);
  if (![...CLASSES, 'any'].includes(it.cls)) err(`${w}: bad cls '${it.cls}'`);
  if (!isNum(it.tier) || it.tier < 0 || it.tier > 5) err(`${w}: tier must be 0..5`);
  if (!isNum(it.lvl) || it.lvl < 0) err(`${w}: lvl must be a number >= 0`);
  if (!isNum(it.price) || it.price < 0) err(`${w}: price must be a number >= 0`);
  if (!isNum(it.stack) || it.stack < 1) err(`${w}: stack must be >= 1`);
  if (!isStr(it.desc)) err(`${w}: desc must be a non-empty string`);
  if (it.stats !== null) {
    if (typeof it.stats !== 'object' || Array.isArray(it.stats)) err(`${w}: stats must be object or null`);
    else for (const [k, v] of Object.entries(it.stats)) {
      if (!STAT_KEYS.includes(k)) err(`${w}: unknown stat key '${k}'`);
      if (!isNum(v)) err(`${w}: stat '${k}' must be a number`);
    }
  }
  if (it.use !== null) {
    if (typeof it.use !== 'object' || Array.isArray(it.use)) err(`${w}: use must be object or null`);
    else {
      for (const k of Object.keys(it.use)) if (!['heal', 'mana', 'buff', 'teleport'].includes(k)) err(`${w}: unknown use key '${k}'`);
      if ('heal' in it.use && !isNum(it.use.heal)) err(`${w}: use.heal must be a number`);
      if ('mana' in it.use && !isNum(it.use.mana)) err(`${w}: use.mana must be a number`);
      if ('teleport' in it.use && it.use.teleport !== 'lumenhold') err(`${w}: use.teleport must be 'lumenhold'`);
      if ('buff' in it.use) {
        const b = it.use.buff;
        if (!b || !isStr(b.stat) || !isNum(b.amount) || !isNum(b.dur)) err(`${w}: use.buff must be {stat,amount,dur}`);
      }
    }
  }
  // Weapons carry atk (war/arc) or matk (mage).
  if (it.type === 'weapon' && it.stats) {
    if (it.cls === 'mage' && !isNum(it.stats.matk)) err(`${w}: mage weapon must carry matk`);
    if ((it.cls === 'warrior' || it.cls === 'archer') && !isNum(it.stats.atk)) err(`${w}: ${it.cls} weapon must carry atk`);
  }
  if (it.type === 'shield' && it.cls !== 'warrior') err(`${w}: shields are warrior-only`);
  if (/^(wstone|astone)_\d$/.test(it.id) && (it.type !== 'scroll' || it.use !== null)) {
    err(`${w}: whetstones/tempers must be type 'scroll' with use:null`);
  }
  // Rule 4: gear price ~ 30*lvl*(tier+1) (helm/boots run ~60%/~40% of slot value).
  if (GEAR_TYPES.includes(it.type) && it.lvl > 0) {
    const ref = 30 * it.lvl * (it.tier + 1);
    if (it.price < 0.35 * ref || it.price > 1.25 * ref) {
      err(`${w}: gear price ${it.price} outside ~30*lvl*(tier+1) band (ref ${ref}, allowed ${Math.round(0.35 * ref)}..${Math.round(1.25 * ref)})`);
    }
  }
}
for (const it of ITEMS) checkItem(it, 'ITEMS');
for (const it of PLAT_EXTRA_ITEMS) checkItem(it, 'PLAT_EXTRA_ITEMS');

// ── Monster schema + drop references ───────────────────────────────────────

for (const m of MONSTERS) {
  const w = `MONSTERS '${m.id}'`;
  if (!isStr(m.name)) err(`${w}: name must be a non-empty string`);
  if (!KINDS.includes(m.kind)) err(`${w}: unknown painter kind '${m.kind}'`);
  for (const f of ['lvl', 'hp', 'atk', 'def', 'exp', 'speed', 'aggro', 'range', 'atkSpd', 'size']) {
    if (!isNum(m[f])) err(`${w}: '${f}' must be a number`);
  }
  if (!Array.isArray(m.gold) || m.gold.length !== 2 || !m.gold.every(isNum) || m.gold[0] > m.gold[1]) {
    err(`${w}: gold must be [min,max] with min <= max`);
  }
  if (typeof m.boss !== 'boolean') err(`${w}: boss must be boolean`);
  if (!isHex(m.tint)) err(`${w}: tint must be a #rrggbb hex color`);
  if (!isStr(m.desc)) err(`${w}: desc must be a non-empty string`);
  if (!Array.isArray(m.drops)) { err(`${w}: drops must be an array`); continue; }
  for (const d of m.drops) {
    if (!d || !isStr(d.id) || !isNum(d.ch) || d.ch <= 0 || d.ch > 1) {
      err(`${w}: drop entries must be {id, ch 0..1} (got ${JSON.stringify(d)})`);
      continue;
    }
    if (!itemById.has(d.id)) err(`${w}: drop '${d.id}' not found in ITEMS+PLAT_EXTRA_ITEMS`);
  }
}

// ── NPC schema + shop rules ────────────────────────────────────────────────

for (const n of NPCS) {
  const w = `NPCS '${n.id}'`;
  if (!isStr(n.name) || !isStr(n.title)) err(`${w}: name/title must be non-empty strings`);
  if (!ZONES.includes(n.zone)) err(`${w}: unknown zone '${n.zone}'`);
  if (!NPC_ROLES.includes(n.role)) err(`${w}: unknown role '${n.role}'`);
  if (n.role === 'trainer' ? !CLASSES.includes(n.cls) : n.cls !== null) {
    err(`${w}: cls must be a class for trainers, null otherwise`);
  }
  if (!n.look || !['robe', 'hair', 'skin', 'accent'].every((k) => isHex(n.look[k]))) {
    err(`${w}: look must be {robe,hair,skin,accent} hex colors`);
  }
  if (!Array.isArray(n.lines) || n.lines.length !== 3 || !n.lines.every(isStr)) {
    err(`${w}: lines must be exactly 3 non-empty strings`);
  }
  if (n.shop !== null && !Array.isArray(n.shop)) err(`${w}: shop must be an array or null`);

  // Rule 3: trainers sell nothing.
  if (n.role === 'trainer' && Array.isArray(n.shop) && n.shop.length > 0) {
    err(`${w}: trainers must not have shop stock`);
  }
  if (Array.isArray(n.shop)) {
    const [lo, hi] = ZONE_BANDS[n.zone] ?? [1, 40];
    for (const id of n.shop) {
      const it = itemById.get(id);
      if (!it) { err(`${w}: shop item '${id}' not found in ITEMS+PLAT_EXTRA_ITEMS`); continue; }
      // Rule 3: stock within +-8 levels of the zone (lvl-0 consumables/materials exempt).
      if (it.lvl > 0 && (it.lvl < lo - 8 || it.lvl > hi + 8)) {
        err(`${w}: shop item '${id}' (lvl ${it.lvl}) outside zone band ${lo}-${hi} +-8`);
      }
    }
  }
}

// ── Quest schema + references + rules 2 & 4 ────────────────────────────────

for (const q of QUESTS) {
  const w = `QUESTS '${q.id}'`;
  if (!/^(mq|sq)_/.test(q.id)) err(`${w}: id must start with 'mq_' or 'sq_'`);
  if (!isStr(q.name)) err(`${w}: name must be a non-empty string`);
  if (!npcById.has(q.giver)) err(`${w}: giver '${q.giver}' is not an NPC id`);
  if (!isNum(q.minLvl) || q.minLvl < 1) err(`${w}: minLvl must be a number >= 1`);
  if (q.prereq !== null && !questById.has(q.prereq)) err(`${w}: prereq '${q.prereq}' is not a quest id`);
  if (q.next !== null && !questById.has(q.next)) err(`${w}: next '${q.next}' is not a quest id`);
  if (!QUEST_TYPES.includes(q.type)) err(`${w}: unknown type '${q.type}'`);
  if (!isNum(q.count) || q.count < 1) err(`${w}: count must be >= 1`);
  if (q.type === 'talk' && q.count !== 1) err(`${w}: talk quests must have count 1`);
  if (!ZONES.includes(q.zone)) err(`${w}: unknown zone '${q.zone}'`);
  for (const f of ['offer', 'progress', 'complete']) if (!isStr(q[f])) err(`${w}: '${f}' must be a non-empty string`);

  // Target resolution per type (rule 1).
  if (q.type === 'kill' || q.type === 'boss') {
    const m = monsterById.get(q.target);
    if (!m) err(`${w}: ${q.type} target '${q.target}' is not a monster id`);
    else {
      if (q.type === 'boss' && !m.boss) err(`${w}: boss quest targets non-boss '${q.target}'`);
      const cz = CANON_MONSTERS[q.target]?.zone;
      if (cz && cz !== q.zone) err(`${w}: target '${q.target}' lives in '${cz}' but quest zone is '${q.zone}'`);
    }
  } else if (q.type === 'collect') {
    if (!itemById.has(q.target)) err(`${w}: collect target '${q.target}' is not an item id`);
    // Rule 2: the quest zone's monsters must drop the collect target.
    const zoneMonsters = MONSTERS.filter((m) => CANON_MONSTERS[m.id]?.zone === q.zone);
    if (!zoneMonsters.some((m) => m.drops.some((d) => d.id === q.target))) {
      err(`${w}: no monster in '${q.zone}' drops collect target '${q.target}'`);
    }
  } else if (q.type === 'talk') {
    if (!npcById.has(q.target)) err(`${w}: talk target '${q.target}' is not an NPC id`);
  }

  // Rewards.
  if (!q.rewards || !isNum(q.rewards.exp) || !isNum(q.rewards.gold)) {
    err(`${w}: rewards must include numeric exp and gold`);
  } else {
    for (const k of Object.keys(q.rewards)) if (!['exp', 'gold', 'plat', 'items'].includes(k)) err(`${w}: unknown rewards key '${k}'`);
    if ('plat' in q.rewards && (!isNum(q.rewards.plat) || q.rewards.plat < 1)) err(`${w}: rewards.plat must be a number >= 1`);
    if ('items' in q.rewards) {
      if (!Array.isArray(q.rewards.items)) err(`${w}: rewards.items must be an array`);
      else for (const r of q.rewards.items) {
        if (!r || !isStr(r.id) || !isNum(r.qty) || r.qty < 1) err(`${w}: rewards.items entries must be {id, qty>=1}`);
        else if (!itemById.has(r.id)) err(`${w}: reward item '${r.id}' not found in ITEMS+PLAT_EXTRA_ITEMS`);
      }
    }
    // Rule 4: kill-quest gold ~ 12 * monster lvl * count / 3.
    if (q.type === 'kill') {
      const m = monsterById.get(q.target);
      if (m) {
        const ref = 12 * m.lvl * q.count / 3;
        if (q.rewards.gold < 0.6 * ref || q.rewards.gold > 1.6 * ref) {
          err(`${w}: kill gold ${q.rewards.gold} far from ~12*lvl*count/3 (ref ${Math.round(ref)})`);
        }
      }
    }
  }
}

// Main-chain linkage mq_1..mq_10.
for (let k = 1; k <= 10; k++) {
  const q = questById.get(`mq_${k}`);
  if (!q) continue;
  const expPrereq = k === 1 ? null : `mq_${k - 1}`;
  const expNext = k === 10 ? null : `mq_${k + 1}`;
  if (q.prereq !== expPrereq) err(`QUESTS 'mq_${k}': prereq should be ${JSON.stringify(expPrereq)}`);
  if (q.next !== expNext) err(`QUESTS 'mq_${k}': next should be ${JSON.stringify(expNext)}`);
}

// ── Platinum shop ──────────────────────────────────────────────────────────

for (const p of PLAT_ITEMS) {
  const w = `PLAT_ITEMS '${p.id}'`;
  if (!p.id?.startsWith('plat_')) err(`${w}: id must start with 'plat_'`);
  if (!isStr(p.name) || !isStr(p.desc)) err(`${w}: name/desc must be non-empty strings`);
  if (!PLAT_CATS.includes(p.cat)) err(`${w}: unknown cat '${p.cat}'`);
  if (!isNum(p.plat) || p.plat < 5 || p.plat > 120) err(`${w}: plat must be on the 5-120 scale`);
  if (!p.give || typeof p.give !== 'object') { err(`${w}: give must be an object`); continue; }
  const hasItem = 'itemId' in p.give;
  const hasEffect = 'effect' in p.give;
  if (hasItem === hasEffect) err(`${w}: give must have exactly one of itemId or effect`);
  if (hasItem) {
    if (!itemById.has(p.give.itemId)) err(`${w}: give.itemId '${p.give.itemId}' not found in ITEMS+PLAT_EXTRA_ITEMS`);
    if (!isNum(p.give.qty) || p.give.qty < 1) err(`${w}: give.qty must be >= 1`);
  }
  if (hasEffect && !PLAT_EFFECTS.includes(p.give.effect)) err(`${w}: unknown effect '${p.give.effect}'`);
}

// ── Achievements ───────────────────────────────────────────────────────────

for (const a of ACHIEVEMENTS) {
  const w = `ACHIEVEMENTS '${a.id}'`;
  if (!isStr(a.name) || !isStr(a.desc)) err(`${w}: name/desc must be non-empty strings`);
  if (!a.check || !ACH_TYPES.includes(a.check.type)) err(`${w}: unknown check type '${a.check?.type}'`);
  else {
    if (!isNum(a.check.n) || a.check.n < 1) err(`${w}: check.n must be >= 1`);
    if ('key' in a.check && !isStr(a.check.key)) err(`${w}: check.key must be a string when present`);
    if (a.check.type === 'killMonster' && !monsterById.has(a.check.key)) {
      err(`${w}: killMonster key '${a.check.key}' is not a monster id`);
    }
  }
  if (!isNum(a.rewardPlat) || a.rewardPlat < 0) err(`${w}: rewardPlat must be a number >= 0`);
  if (a.title !== null && !isStr(a.title)) err(`${w}: title must be a string or null`);
}

// ── Lore ───────────────────────────────────────────────────────────────────

{
  const w = 'LORE';
  if (!isStr(LORE.title) || !isStr(LORE.subtitle)) err(`${w}: title/subtitle must be non-empty strings`);
  if (!Array.isArray(LORE.intro) || LORE.intro.length !== 3 || !LORE.intro.every(isStr)) {
    err(`${w}: intro must be exactly 3 paragraphs`);
  }
  if (!LORE.classIntro || !CLASSES.every((c) => isStr(LORE.classIntro[c]))) {
    err(`${w}: classIntro must cover warrior/archer/mage`);
  }
  for (const z of ZONES) if (!isStr(LORE.zones?.[z]?.blurb)) err(`${w}: zones.${z}.blurb missing`);
  for (const z of Object.keys(LORE.zones ?? {})) if (!ZONES.includes(z)) err(`${w}: unknown zone '${z}' in zones`);
  if (!Array.isArray(LORE.chronicle) || LORE.chronicle.length < 6 || LORE.chronicle.length > 8) {
    err(`${w}: chronicle must have 6-8 entries`);
  } else for (const c of LORE.chronicle) if (!isStr(c.h) || !isStr(c.body)) err(`${w}: chronicle entries must be {h, body}`);
}

// ── Pets ───────────────────────────────────────────────────────────────────

const PET_IDS = ['emberfox', 'frostowl', 'stonepup'];
for (const id of PET_IDS) if (!PETS.some((p) => p.id === id)) err(`PETS: canonical pet '${id}' missing`);
for (const p of PETS) {
  const w = `PETS '${p.id}'`;
  if (!PET_IDS.includes(p.id)) err(`${w}: not a canonical pet id`);
  if (!isStr(p.name) || !isStr(p.desc)) err(`${w}: name/desc must be non-empty strings`);
  if (!['fox', 'owl', 'pup'].includes(p.kind)) err(`${w}: kind must be fox/owl/pup`);
  if (!isHex(p.tint)) err(`${w}: tint must be a #rrggbb hex color`);
  const egg = itemById.get(p.egg);
  if (!egg) err(`${w}: egg '${p.egg}' not found in ITEMS+PLAT_EXTRA_ITEMS`);
  else if (egg.type !== 'egg') err(`${w}: egg '${p.egg}' must be an item of type 'egg'`);
  if (!p.aura || !STAT_KEYS.includes(p.aura.stat) || !isNum(p.aura.amount)) {
    err(`${w}: aura must be {stat: <stat key>, amount: number}`);
  }
}

// ── Report ─────────────────────────────────────────────────────────────────

if (errors.length) {
  console.error(`FAIL — ${errors.length} problem(s):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
} else {
  console.log(`OK — all checks passed: ${ITEMS.length} items (+${PLAT_EXTRA_ITEMS.length} plat extras), ` +
    `${MONSTERS.length} monsters, ${NPCS.length} npcs, ${QUESTS.length} quests, ` +
    `${PLAT_ITEMS.length} plat goods, ${ACHIEVEMENTS.length} achievements, ${PETS.length} pets, ` +
    `${LORE.chronicle.length} chronicle entries.`);
}
