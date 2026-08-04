// Central registry: merges every content module into fast lookup maps.
import { ITEMS } from './items.js';
import { MONSTERS } from './monsters.js';
import { NPCS } from './npcs.js';
import { QUESTS } from './quests.js';
import { PLAT_ITEMS, PLAT_EXTRA_ITEMS } from './platshop.js';
import { ACHIEVEMENTS } from './achievements.js';
import { PETS } from './pets.js';
import { LORE } from './lore.js';

const ALL_ITEMS = [...ITEMS, ...PLAT_EXTRA_ITEMS];
const itemMap = new Map(ALL_ITEMS.map(i => [i.id, i]));
const monMap = new Map(MONSTERS.map(m => [m.id, m]));
const npcMap = new Map(NPCS.map(n => [n.id, n]));
const questMap = new Map(QUESTS.map(q => [q.id, q]));
const petMap = new Map(PETS.map(p => [p.id, p]));
const petByEgg = new Map(PETS.map(p => [p.egg, p]));

export const itemById = id => itemMap.get(id);
export const monsterById = id => monMap.get(id);
export const npcById = id => npcMap.get(id);
export const questById = id => questMap.get(id);
export const petById = id => petMap.get(id);
export const petByEggId = id => petByEgg.get(id);

export { ALL_ITEMS, MONSTERS, NPCS, QUESTS, PLAT_ITEMS, ACHIEVEMENTS, PETS, LORE };

export const TIER_NAMES = ['Common', 'Fine', 'Rare', 'Epic', 'Legendary', 'Mythic'];
export const TIER_COLORS = ['#cfcfcf', '#8fe08f', '#7fb5ff', '#d09fff', '#ffd77a', '#ff8a7a'];
export const UPGRADABLE = new Set(['weapon', 'chest', 'helm', 'boots', 'shield']);
export const EQUIP_TYPES = new Set(['weapon', 'chest', 'helm', 'boots', 'shield', 'ring', 'amulet', 'costume']);

export function sellPrice(item) { return Math.max(1, Math.floor(item.price * 0.25)); }

// Enhancement table: chance to succeed going to +N; from +4 failure drops a plus,
// from +7 failure shatters (unless protected by a Guardian Rune).
export const ENHANCE = {
  chance: [1, 1, 0.9, 0.8, 0.65, 0.5, 0.4, 0.3, 0.22, 0.15, 0.1], // index = target plus
  goldCost: (item, plus) => Math.round(item.price * 0.2 * plus + 40 * plus * plus),
  stoneTier: plus => plus <= 3 ? 1 : plus <= 6 ? 2 : 3,
  dropFrom: 4, shatterFrom: 7, max: 10,
};
