# EMBERVEIL — Game Design Document

A 2D top-down mobile action-RPG in the spirit of classic mobile MMORPGs, built as a
single-player experience (multiplayer-shaped systems, offline). Original world, lore,
and content. Three classes: **Warrior**, **Archer**, **Mage**.

Runs entirely in the browser (no build step, no dependencies) as a PWA — installable
to a phone home screen, playable offline.

---

## 1. Pillars

1. **Feature-complete classic-MMO loop**: grind zones, level, allocate stats, learn and
   rank up skills, loot gear, upgrade it at the blacksmith (with fail risk), quest
   through a story, bank your treasure, and spend Platinum in the premium shop.
2. **Mobile-first controls**: virtual joystick + tap-to-target, big touch buttons,
   auto-attack toggle, quick-slot potions.
3. **High-fidelity 2D**: everything is painted procedurally at device resolution —
   soft-gradient painterly terrain, rim-lit characters with anime proportions and
   large expressive eyes, glowing spell effects, particles, day/night ambient light,
   parallax clouds. No pixel art, no low-res sprites.

## 2. Lore synopsis (full text in docs/LORE.md)

The world of **Emberveil** was once sealed from the raw mana ocean called the
**Maelstrom** by a living barrier known as the **Veil**. A generation ago the Archmage
**Vael Morwyn** tore the Veil open in his hunger for a life without end — the night the
sky burned is remembered as **the Sundering**. Mana-storms twisted beasts into
monsters, and Morwyn became the **Hollow King**, ruling the deep places with his
Umbral Legion.

The free city of **Lumenhold** endures behind its lantern-walls. Children born after
the Sundering sometimes carry a spark of the Veil itself — **Veilwalkers** — able to
survive raw mana and close the wounds in the world. You are the newest of them.
Three orders train Veilwalkers:

- **The Bastion Oath** — shieldbearers and blade-masters (Warrior)
- **The Thornwood Wardens** — hunters who never miss twice (Archer)
- **The Azure Arcanum** — scholars of the ember-flame (Mage)

The story quest chain follows the player from Dawnmeadow chores to sealing the five
**Veilshards** and confronting the Hollow King in the Hollow Depths.

## 3. World

| Zone id        | Name               | Biome    | Levels | Notes                       |
|----------------|--------------------|----------|--------|-----------------------------|
| `lumenhold`    | Lumenhold          | town     | safe   | Hub: all services, trainers |
| `dawnmeadow`   | Dawnmeadow Fields  | meadow   | 1–8    | Starter zone                |
| `thornwood`    | The Thornwood      | forest   | 7–16   | Dense forest, bandits       |
| `cinderdunes`  | The Cinderdunes    | desert   | 15–25  | Ash desert, mana-storms     |
| `frostfell`    | Frostfell Pass     | snow     | 24–33  | Mountain pass               |
| `hollowdepths` | The Hollow Depths  | cave     | 32–40  | Endgame crypt, final boss   |

Zones are free-movement 2D fields (grid collision), connected by glowing portal
gates. Each zone has monster spawn areas, a field NPC, props (trees/rocks/ruins),
and one boss lair. Town has no monsters.

## 4. Classes and stats

Primary stats: **STR, DEX, INT, VIT, AGI**. +3 stat points per level (spend in
Character window). Level cap 40 (v1).

Derived (see `js/game/stats.js` for exact formulas):

- **HP** = (50 + VIT·12 + level·8) · classHpMult — war 1.25 / arc 1.0 / mag 0.85
- **MP** = (20 + INT·8 + level·4) · classMpMult — war 0.7 / arc 0.9 / mag 1.35
- **ATK** (war) = STR·2.0 + DEX·0.5 + weaponAtk · (1 + 0.06·plus)
- **ATK** (arc) = DEX·2.0 + STR·0.5 + weaponAtk · (1 + 0.06·plus)
- **MATK** (mag) = INT·2.2 + weaponMatk · (1 + 0.06·plus)
- **DEF** = VIT·1.2 + armor pieces (each +6%/plus)
- **CRIT%** = 5 + DEX·0.25 (cap 45) · crit deals 1.6×
- **EVA%** = AGI·0.35 (cap 30) · **Move speed** bonus from AGI (small)
- HP/MP regen out of combat; potions in combat.

Class base stats (level 1) and per-level auto-gains are in `js/data/classes.js`.
EXP to next level: `need(n) = round(24·n^2.15 + 26·n)` — fast early, slow 30+.
Death: respawn in Lumenhold with a 5% EXP-to-next-level penalty (never de-level);
a **Phoenix Feather** (Platinum item) revives on the spot with no penalty.

## 5. Skills

8 skills per class, unlocked by level (1/3/6/10/14/18/24/30), each rankable 1→5
with skill points (+1 point per level; rank-up costs = next rank). Mix of strikes,
AoEs, buffs, a self-heal (Mage), a stun (Warrior), a DoT (Archer). Four assignable
skill slots on the HUD + 2 potion quick slots. Full definitions in `js/data/skills.js`.

## 6. Items and economy

- **Slots**: weapon, chest, helm, boots, shield (Warrior only), ring, amulet, costume (cosmetic).
- **Rarity tiers**: 0 Common (grey), 1 Fine (green), 2 Rare (blue), 3 Epic (violet),
  4 Legendary (gold), 5 Mythic (crimson).
- **Currencies**: Gold (drops/vendors) and **Platinum** (premium; earned via
  achievements, level milestones, first-kill boss bonuses, daily gift).
- **Enhancement** (blacksmith): weapons/armor go +1…+10 using Whetstones/Tempers +
  gold. Success chance falls with level; from +4 a failure drops one plus; from +7 a
  failure **shatters** the item unless a Guardian Rune (Platinum) is socketed.
  +N adds 6% weapon ATK / armor DEF per plus and a growing glow aura.
- **Bank**: 24-slot storage in town (expandable via Platinum).
- **Shops**: general merchant (potions/food/scrolls), blacksmith (gear), plat vendor.
- Monster drops: gold, materials, gear, rare skill tomes. Boss first-kills award Platinum.

## 7. Platinum Shop (premium shop, all earnable in-game)

Categories: **Growth** (EXP tomes, stat/skill reset tonics, bag/bank expansions),
**Convenience** (teleport sigils, portable merchant, Phoenix Feathers),
**Enhance** (Guardian Runes, Blessed Whetstones), **Cosmetics** (costume sets, dyes,
weapon glamours), **Pets** (eggs → followers that auto-loot and give small auras).
Catalog in `js/data/platshop.js`.

## 8. Quests, achievements, titles

- Main story chain (10 chapters) + ~14 side quests across zones. Types: kill,
  collect (drop items), talk/deliver, boss. Quest markers over NPC heads
  (! available, ? in-progress/complete), quest log window, EXP/gold/item/plat rewards.
- ~24 achievements (kills, levels, enhancement, wealth, exploration, story) — most
  award Platinum. Some award **Titles** shown under the character name.

## 9. UI (mobile)

- **HUD**: HP/MP orbs + EXP bar (top-left) · target frame (top-center) · minimap
  (top-right) · joystick (bottom-left) · 4 skill buttons, attack/auto button, 2
  potion slots (bottom-right) · menu row (Bag, Character, Skills, Quests, Map,
  Shop-in-range, Settings) · scrolling combat/system log (bottom-center, collapsible).
- **Windows** (draggable sheets on phone): Inventory, Equipment/Character, Skills,
  Quest Log, Merchant, Blacksmith (enhance), Bank, Platinum Shop, World Map,
  Achievements/Titles, Settings, NPC dialogue.
- Damage numbers float and fade; level-ups burst gold light; toasts for loot.

## 10. Tech

- Plain ES modules, zero deps: `index.html` + `css/` + `js/`. Canvas world render
  (DPR-aware), DOM UI layer. WebAudio-synthesized SFX + ambient music. Saves in
  `localStorage` (3 character slots, autosave every 20s + on events). PWA manifest +
  service worker (network-first index, cache-first modules, `skipWaiting`).
- Target: 60fps on mid phones. Zone terrain pre-rendered to offscreen chunks;
  sprites pre-rendered per direction/frame to offscreen canvases at 2× logical size.
