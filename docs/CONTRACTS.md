# EMBERVEIL — Data contracts

Canonical schemas + IDs. Content modules in `js/data/` are plain ES modules exporting
frozen arrays/objects. **All cross-references must use only the canonical IDs below.**
No functions in data files except where a field is documented as `(rank)=>number`
arrow-function scaling. Keep everything serializable otherwise.

## Canonical IDs

### Zones
`lumenhold` (town, safe) · `dawnmeadow` (meadow 1–8) · `thornwood` (forest 7–16) ·
`cinderdunes` (desert 15–25) · `frostfell` (snow 24–33) · `hollowdepths` (cave 32–40)

### Monster ids (id · painter kind · level)
Dawnmeadow: `dew_slime` slime 1 · `meadow_boar` boar 3 · `thistle_sprite` wisp 5 ·
`field_wolf` wolf 7 · **boss** `bramblehide` boar 9 ("Bramblehide the Sowking")
Thornwood: `thorn_creeper` mushroom 9 · `bandit_scout` bandit 11 · `webweaver` spider 12 ·
`timber_wolf` wolf 14 · `bark_treant` treant 15 · **boss** `oakenheart` treant 17
Cinderdunes: `ash_scorpion` scorpion 17 · `dune_marauder` bandit 19 · `cinder_wisp` wisp 21 ·
`sand_golem` golem 23 · **boss** `sirocco` scorpion 26 ("Sirocco, Broodmother of Ash")
Frostfell: `frost_bat` bat 25 · `snow_wolf` wolf 27 · `ice_wraith` wraith 29 ·
`frost_yeti` yeti 31 · **boss** `borealis` drake 34 ("Borealis the Pale Drake")
Hollow Depths: `hollow_skeleton` skeleton 33 · `gloom_spider` spider 35 · `umbral_knight` knight 37 ·
`void_wraith` wraith 38 · **final boss** `hollow_king` hollowking 40

Painter kinds available: `slime boar wolf wisp mushroom bandit spider scorpion golem
treant wraith skeleton yeti bat drake knight hollowking`

### NPC ids (all in Lumenhold unless noted)
`elder_maren` (story questgiver) · `captain_aldric` (Warrior trainer) ·
`sylvie` (Archer trainer) · `magister_orin` (Mage trainer) ·
`merchant_bella` (general merchant) · `torvald` (blacksmith: shop + enhance) ·
`banker_odo` (bank) · `zephyr` (Platinum vendor, "Zephyr the Wayfarer")
Field: `scout_finn` dawnmeadow · `hermit_gale` thornwood · `caravaneer_rasha` cinderdunes ·
`ranger_eydis` frostfell · `lysander` hollowdepths (a ghost)

### Item id conventions
Weapons: `w_war_1..8` (blades) · `w_arc_1..8` (bows) · `w_mag_1..8` (staves) —
tier k for character levels ≈ 1,5,10,15,20,25,30,35.
Armor: chest `c_war/arc/mag_1..6`, helm `h_war/arc/mag_1..6`, boots `b_war/arc/mag_1..6`
(levels ≈ 1,8,15,22,29,36) · shields `s_war_1..4` (war only, levels 5,15,25,35).
Jewelry (any class): rings `r_1..5`, amulets `am_1..5`.
Potions `p_hp_1..4`, `p_mp_1..4` · food `food_1..3` (regen buff) ·
scrolls: `scroll_return` (teleport to town), `wstone_1..3` (weapon whetstone tiers),
`astone_1..3` (armor temper tiers).
Materials (drops/quest/craft): `m_slime_gel m_boar_tusk m_wolf_pelt m_spore_cap
m_silk_strand m_bandit_insignia m_scorpion_stinger m_golem_core m_wisp_ember
m_bat_wing m_wraith_essence m_yeti_fur m_bone_shard m_umbral_plate m_drake_scale
m_void_essence`
Quest items: `q_veilshard_1..5` `q_maren_letter` `q_caravan_ledger` `q_frost_bloom`
Platinum shop: `plat_*` (see platshop schema). Pet eggs: `egg_emberfox egg_frostowl egg_stonepup`.
Costumes: `cos_duelist cos_scholar cos_ranger cos_shadow` (cosmetic slot, any class).

## Schemas

### items.js — `export const ITEMS = [Item…]`
```js
Item = { id, name, type,          // 'weapon'|'chest'|'helm'|'boots'|'shield'|'ring'|'amulet'|
                                  // 'potion'|'food'|'scroll'|'material'|'quest'|'costume'|'egg'
  cls,                            // 'warrior'|'archer'|'mage'|'any'
  tier,                           // 0..5 rarity
  lvl,                            // required level (0 for materials etc.)
  stats,                          // {atk?, matk?, def?, str?, dex?, int_?, vit?, agi?, hp?, mp?, crit?, eva?} or null
  price,                          // gold value (buy; sell = 25%)
  stack,                          // max stack (1 for gear)
  use,                            // consumables: {heal?, mana?, buff?:{stat,amount,dur}, teleport?:'lumenhold'} or null
  desc }                          // 1-line flavor text
```
Weapons carry `atk` (war/arc) or `matk` (mag). `wstone_k`/`astone_k` are type
'scroll' with `use:null` (blacksmith consumes them). Upgradable types: weapon,
chest, helm, boots, shield.

### monsters.js — `export const MONSTERS = [Monster…]`
```js
Monster = { id, name, kind,       // painter kind (see list)
  lvl, hp, atk, def, exp,
  gold: [min,max], speed,         // px/s walk ~40-70, bosses slower/bigger
  aggro,                          // aggro radius px (0 = passive until hit)
  range,                          // attack range px (melee ~46, ranged ~180)
  atkSpd,                         // seconds between attacks
  drops: [{id, ch}…],             // item id + chance 0..1 (materials common .35, gear .04-.08, rare .01)
  size,                           // render scale 1.0 normal, bosses 1.6-2.2
  tint,                           // hex color accent for painter
  boss,                           // bool
  desc }
```
Balance targets: monster hp ≈ 3–4 player basic hits at-level; player deaths should
threaten only 2+ levels above. exp tuned so ~8–14 at-level kills per early level,
30–60 later.

### npcs.js — `export const NPCS = [Npc…]`
```js
Npc = { id, name, title,          // e.g. 'Elder of Lumenhold'
  zone, role,                     // 'story'|'trainer'|'merchant'|'blacksmith'|'banker'|'platinum'|'field'
  cls,                            // trainers: which class ('warrior'…) else null
  shop: [itemId…] | null,         // merchant stock
  look: {robe,hair,skin,accent},  // hex colors for the painter
  lines: [s,s,s] }                // idle chatter lines (shown when no quest)
```

### quests.js — `export const QUESTS = [Quest…]`
```js
Quest = { id,                     // 'mq_1'..'mq_10' main; 'sq_*' side
  name, giver,                    // npc id
  minLvl, prereq,                 // quest id | null
  type,                           // 'kill'|'collect'|'talk'|'boss'
  target,                         // monster id (kill/boss) | item id (collect) | npc id (talk)
  count,                          // kills or items needed (talk: 1)
  zone,                           // where objective lives
  rewards: {exp, gold, plat?, items?: [{id,qty}…]},
  offer, progress, complete,      // dialogue paragraphs (2-4 sentences each, in-character)
  next }                          // follow-up quest id | null
```
Main chain (10): meet Maren → prove yourself in Dawnmeadow → Bramblehide (shard 1) →
Thornwood bandits → Oakenheart (shard 2) → caravan in Cinderdunes → Sirocco (shard 3) →
Frostfell ranger → Borealis (shard 4) → the Hollow King (shard 5, finale).
Collect quests target material drops from that zone's monsters.

### platshop.js — `export const PLAT_ITEMS = [PlatItem…]`
```js
PlatItem = { id, name, cat,       // 'growth'|'convenience'|'enhance'|'cosmetic'|'pet'
  plat,                           // platinum price (5-120 scale)
  give: {itemId?, qty?,           // grants inventory item, OR
         effect?},                // 'bag+6'|'bank+12'|'statReset'|'skillReset'|'exp50_30m'|'exp100_30m'
  desc }
```

### achievements.js — `export const ACHIEVEMENTS = [Ach…]`
```js
Ach = { id, name, desc,
  check: {type, key?, n},         // type: 'kills'|'killMonster'|'level'|'gold'|'quests'|
                                  // 'enhance'|'bosses'|'zones'|'platSpent'|'petHatch'
  rewardPlat, title }             // title: string | null (wearable title)
```

### lore.js — `export const LORE = {…}`
```js
{ title, subtitle, intro: [para…],        // 3 short paragraphs for new-game cinematic
  classIntro: {warrior, archer, mage},    // 2-3 sentences each, second person
  zones: {zoneId: {blurb}},               // 1-2 sentence loading-screen text
  chronicle: [{h, body}…] }               // 6-8 lore-book entries (the in-game 'Chronicle')
```

### pets.js — `export const PETS = [Pet…]`
```js
Pet = { id,                       // 'emberfox'|'frostowl'|'stonepup'
  egg,                            // egg item id
  name, kind,                     // painter: 'fox'|'owl'|'pup'
  aura,                           // {stat, amount} tiny passive bonus
  tint, desc }
```

## Consistency rules

1. Every `drops[].id`, `shop[]` entry, quest `target`/`rewards.items[].id`,
   `give.itemId`, and pet `egg` **must exist in ITEMS** (or MONSTERS/NPCS for
   kill/talk targets).
2. Every zone's monsters must drop the materials its collect-quests need.
3. Trainers sell nothing; merchants' stock stays within ±8 levels of their zone.
4. Gold rewards ≈ 12·lvl per kill-quest, item prices ≈ 30·lvl·(tier+1) for gear.
5. All names/text original to Emberveil. Tone: warm high fantasy, a little wry,
   never grimdark. Second person for dialogue ("You there — the one with the
   Veil-mark…").
