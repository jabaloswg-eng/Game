// Shared game state + a tiny event bus. Every module imports G instead of each other,
// which keeps the dependency graph flat and cycle-free.
export const G = {
  // runtime
  canvas: null, ctx: null, dpr: 1, viewW: 0, viewH: 0, zoom: 1,
  cam: { x: 0, y: 0 },
  time: 0,            // seconds since boot
  worldClock: 480,    // minutes-of-day for the day/night cycle (starts 8:00)
  running: false,
  // world
  zone: null,         // active zone runtime (built by world.js)
  entities: [],       // monsters + npcs + pets + props-with-depth
  projectiles: [],
  lootFly: [],
  player: null,
  target: null,       // targeted monster (or npc)
  // meta
  slot: 0,
  settings: { sfx: true, music: true, shake: true, showDmg: true, autoPotion: false },
  flags: {},          // misc persisted flags (firstKills, daily gift date, ...)
  ui: {},             // dom refs filled by hud.js
  paused: false,
};

if (typeof window !== 'undefined') window.G = G; // debug / test handle

const listeners = {};
export function on(ev, fn) { (listeners[ev] ??= []).push(fn); }
export function emit(ev, ...args) {
  const l = listeners[ev];
  if (l) for (const fn of l) fn(...args);
}
