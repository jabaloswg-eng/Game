# The Valley 🗡️

A small open-world 3D adventure that runs in your web browser — the first
step toward a bigger action RPG. You play a sword-carrying adventurer
exploring a green valley surrounded by mountains, with a lake, forests,
rocks and flowers.

## How to play

| Input | Action |
|---|---|
| **W A S D** (or arrow keys) | Move |
| **Shift** | Sprint |
| **Space** | Jump |
| **Drag the mouse** | Look around |
| **Scroll wheel** | Zoom in / out |

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
| `src/character.js` | The hero's 3D model and its animations |
| `src/controls.js` | Reads your keyboard/mouse and controls the camera |
| `vendor/three.module.js` | [Three.js](https://threejs.org), the 3D graphics library the game is built on |
| `.github/workflows/pages.yml` | Automatically publishes the game to GitHub Pages on every update |

## Roadmap

Ideas for future versions, roughly in order:

1. Combat — draw the sword, attack, hit effects
2. Enemies that roam the valley
3. NPCs and dialogue
4. Quests
5. Inventory and loot
6. Saving your progress
7. Better character model and animations
8. Sound and music
