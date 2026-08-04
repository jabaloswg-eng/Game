# EMBERVEIL — A Veilwalker's Tale 🔥

A **2D mobile action-RPG** in the spirit of the classic pocket MMORPGs — built as a
single-player experience with an entirely original world, story, and cast. It runs in
any modern browser with **zero dependencies and no build step**, installs to a phone
home screen as a PWA, and keeps working offline.

> The Archmage Vael Morwyn tore the Veil that sealed our world from the raw mana of
> the Maelstrom. The sky burned, the beasts changed, and he crowned himself the
> **Hollow King**. You are a **Veilwalker** — one of the few born able to touch both
> worlds — and the five shards of the Veil are waiting to be won back.

## Play it

- **Phone (recommended):** open the game URL in your browser → *Add to Home Screen*.
  Fullscreen, portrait or landscape, works offline after the first visit.
- **Local:** `python3 -m http.server 8080` in this folder → http://localhost:8080
- Desktop testing: WASD to move, tap = click, `1–4` skills, `Space` attack, `B`ag,
  `C`haracter, `K` skills, `Q`uests, `M`ap, `E` talk, `R`/`F` potions.

## The game

- **Three Orders (classes):** ⚔ **Warrior** (Bastion Oath), 🏹 **Archer** (Thornwood
  Wardens), 🔮 **Mage** (Azure Arcanum) — each with 8 rankable skills, its own stat
  growth, and its own feel (tank & cleave / range & poison / burst, slows and self-heal).
- **Six zones:** Lumenhold (hub town) → Dawnmeadow Fields → the Thornwood → the
  Cinderdunes → Frostfell Pass → the Hollow Depths, with 26 monster types and
  **5 bosses** ending at the Hollow King himself.
- **Classic MMO systems, all in:** stat points (STR/DEX/INT/VIT/AGI), EXP curve with
  level-40 cap, tap-to-target + auto-attack combat, aggro AI, quest chains (10-chapter
  main story + 14 side quests), inventory/equipment with 6 rarity tiers, monster drops,
  gold economy, merchant + blacksmith shops, **+1…+10 forge enhancement with fail risk**
  (from +8 items can shatter — bring a Guardian Rune), bank vault, achievements,
  wearable **titles**, buff foods, potions, teleport scrolls, death penalty, day/night
  cycle, minimap + world map, autosave with **3 character slots**.
- **💎 Platinum Shop:** the full premium-shop experience — EXP tomes, stat/skill
  resets, bag & bank expansions, Phoenix Feathers, blessed forge stones, costume sets,
  hair dyes, and **pet eggs** (companions that follow you and grant auras). Since this
  is single-player, Platinum is earned by playing: achievements, level milestones,
  boss first-kills, story chapters, and a daily gift. No real money anywhere.
- **Rendering:** everything is painted procedurally on canvas at device resolution —
  painterly terrain with biome palettes, anime-styled rim-lit characters, glowing
  spell effects and particles, dynamic ambient light, water shimmer, drifting cloud
  shadows. No sprite sheets, no pixel art.

## Repo layout

```
index.html  css/  js/
  js/core/   loop-adjacent plumbing: state bus, input, audio synth, saves, utils
  js/gfx/    procedural painters: characters, monsters, terrain, props, icons, particles
  js/world/  zone runtime, entities & AI
  js/game/   stats, combat, inventory, quests, premium (plat shop · achievements · pets)
  js/ui/     HUD + all windows
  js/data/   pure content: classes, skills, zones, items, monsters, npcs, quests,
             platshop, achievements, pets, lore
docs/       DESIGN.md (GDD) · CONTRACTS.md (data schemas) · LORE.md (world bible)
tools/      validate-data.mjs — cross-reference checker for all content
valley/     the previous project in this repo (a small 3D valley RPG), kept intact
```

`node tools/validate-data.mjs` verifies every item/monster/NPC/quest/shop reference
resolves and all schemas conform.

---
Made with Claude Code. All lore, names, art, and content are original to Emberveil.
