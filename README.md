# The Valley 🗡️

A small open-world 3D action RPG that runs in your web browser. You play
a sword-carrying adventurer exploring a green valley surrounded by
mountains — and defending yourself against the goblins, wolves and boars
that live there.

## How to play

| Input | Action |
|---|---|
| **W A S D** (or arrow keys) | Move |
| **Click** (or **J**) | Attack with your sword |
| **1** | Charge — dash to a distant enemy and land an empowered slash |
| **Shift** | Sprint |
| **Space** | Jump |
| **Drag the mouse** | Look around |
| **Scroll wheel** | Zoom in / out |

Monsters wander near their dens. Get too close and they'll chase you —
goblins swing clubs, wolves are fast, boars hit hard. Your health bar is
in the top-left corner; it slowly recovers once you're out of combat, and
if you fall you respawn at the valley's center. Defeated monsters return
to their dens after about half a minute.

## Leveling and skills

Every kill grants experience (shown in the purple bar under your health).
Levels go up to **50**, each level adds health and sword damage, and the
XP curve is intentionally punishing — early levels come quick, the last
ones are a badge of honor. Your level and XP are saved in the browser,
so progress survives closing the page.

Battle skills live on the bar at the bottom of the screen. The first
skill is **Charge** (key 1): if an enemy is within ~25 meters, your hero
rushes it at blinding speed and lands a slash that hits 60% harder.
Eight-second cooldown. More skills will unlock at higher levels in
future versions.

## Running the game

The game is a plain website — no installation needed. It just has to be
*served* by a web server (browsers block some features when you open the
file directly).

**Easiest:** play the published version on GitHub Pages (see below).

**On your own computer**, if you have Python installed:

```
python3 -m http.server
```

then open <http://localhost:8000> in your browser.

## What each file does

| File | Purpose |
|---|---|
| `index.html` | The web page: loading screen, controls hint, and it starts the game |
| `src/main.js` | The heart of the game: sets everything up and runs the game loop |
| `src/world.js` | Builds the valley — terrain, lake, trees, rocks, flowers, sky, sunlight |
| `src/character.js` | The hero's 3D model, animations and sword attack |
| `src/enemies.js` | The monsters: models, behavior (wander/chase/attack), health |
| `src/controls.js` | Reads your keyboard/mouse and controls the camera |
| `src/fx.js` | Floating damage numbers |
| `src/particles.js` | Glowing particle bursts — hit sparks, level-ups, charge streaks |
| `src/progression.js` | XP, levels, and saving progress in the browser |
| `src/skills.js` | The skill bar: triggers, cooldowns, level unlocks |
| `src/textures.js` | Procedural textures (grass, bark, water ripples) painted in code |
| `src/assets.js` | Loads real 3D models (GLB files) and preps them for the game |
| `assets/` | 3D model files and the Blender scripts that generate them |
| `vendor/jsm/` | Three.js add-ons (bloom/glow effect, GLB model loader) |

## Asset pipeline

The game can now use real 3D models (`.glb` files) alongside its
code-built ones. Two ways to make them:

- **Blender (scripted):** `assets/blender/goblin.py` builds the masked
  tribal goblin from scratch — run
  `blender --background --python assets/blender/goblin.py` to regenerate
  `assets/goblin-blender.glb` (set `PREVIEW=1` to also render a preview
  image). Tweak the script, re-run, refresh the game.
- **AI (image → 3D):** a full-body character image is converted to a GLB
  with [TripoSR](https://github.com/VAST-AI-Research/TripoSR) (free, open
  source, runs on CPU) via `tools/image-to-3d.sh`. `tools/prep-image.py`
  cleans the image first (cuts the subject out of the background). The
  goblin concept art in `assets/reference/` became `assets/goblin-ai.glb`
  this way.

To give a monster a GLB model, add a variant name to its den entry in
`src/enemies.js` (e.g. `['goblin', 20, 12, 'blender']` loads
`assets/goblin-blender.glb`).
| `vendor/three.module.js` | [Three.js](https://threejs.org), the 3D graphics library the game is built on |
| `.github/workflows/pages.yml` | Automatically publishes the game to GitHub Pages on every update |

## Roadmap

Ideas for future versions, roughly in order:

1. ~~Combat — draw the sword, attack, hit effects~~ ✅
2. ~~Enemies that roam the valley~~ ✅
3. NPCs and dialogue
4. Quests
5. Inventory and loot
6. Saving your progress
7. Better character model and animations
8. Sound and music
