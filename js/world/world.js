// Zone runtime: builds terrain, spawns monsters/NPCs, handles collision + portals.
import { G, emit } from '../core/state.js';
import { TILE, clamp, dist } from '../core/util.js';
import { ZONES } from '../data/zones.js';
import { monsterById, npcById, LORE } from '../data/db.js';
import { buildZoneTerrain } from '../gfx/tiles.js';
import { Monster, Npc } from './entities.js';
import { startMusic } from '../core/audio.js';

const terrainCache = new Map();

export function loadZone(zoneId, spawnPos = null) {
  const def = ZONES[zoneId];
  if (!def) throw new Error('unknown zone ' + zoneId);

  let terrain = terrainCache.get(zoneId);
  if (!terrain) { terrain = buildZoneTerrain(def); terrainCache.set(zoneId, terrain); }

  const zone = {
    def, terrain,
    W: terrain.W * TILE, H: terrain.H * TILE,
    portals: def.portals.map(p => ({ ...p, x: (p.at[0] + 0.5) * TILE, y: (p.at[1] + 0.5) * TILE })),
    respawnQueue: [], // {monsterId, area, at}
  };

  G.zone = zone;
  G.entities = [];
  G.projectiles = [];
  G.lootFly = [];
  G.target = null;

  // NPCs
  for (const n of def.npcs) {
    const data = npcById(n.id);
    if (data) G.entities.push(new Npc(data, (n.at[0] + 0.5) * TILE, (n.at[1] + 0.5) * TILE));
  }
  // Monsters
  for (const s of def.spawns) {
    for (let i = 0; i < s.n; i++) spawnMonster(zone, s.id, s.area);
  }
  // Boss
  if (def.boss) {
    const alive = !G.flags['bossDown_' + def.boss.id] ||
      (Date.now() - G.flags['bossDown_' + def.boss.id]) > 90 * 1000;
    if (alive) {
      const m = monsterById(def.boss.id);
      if (m) {
        const bx = (def.boss.at[0] + 0.5) * TILE, by = (def.boss.at[1] + 0.5) * TILE;
        const mon = new Monster(m, bx, by, null);
        mon.homeX = bx; mon.homeY = by;
        G.entities.push(mon);
      }
    }
  }

  // player placement
  if (G.player) {
    const [px, py] = spawnPos || def.playerStart.map(v => (v + 0.5) * TILE);
    G.player.x = spawnPos ? spawnPos[0] : px;
    G.player.y = spawnPos ? spawnPos[1] : py;
    if (G.player.petEntity) { G.player.petEntity.x = G.player.x - 40; G.player.petEntity.y = G.player.y; }
  }

  startMusic(def.music || def.biome);
  emit('zoneLoaded', zoneId);
  return zone;
}

export function spawnMonster(zone, monsterId, area, atPos = null) {
  const data = monsterById(monsterId);
  if (!data) return null;
  let x, y, tries = 30;
  if (atPos) { [x, y] = atPos; }
  else {
    do {
      x = (area.x + Math.random() * area.w + 0.5) * TILE;
      y = (area.y + Math.random() * area.h + 0.5) * TILE;
    } while (isBlockedPx(zone, x, y) && --tries > 0);
    if (tries <= 0) { x = (area.x + area.w / 2) * TILE; y = (area.y + area.h / 2) * TILE; }
  }
  const mon = new Monster(data, x, y, area);
  G.entities.push(mon);
  return mon;
}

export function isBlockedPx(zone, x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= zone.terrain.W || ty >= zone.terrain.H) return true;
  return zone.terrain.block[ty * zone.terrain.W + tx] === 1;
}

// Slide-move: try full vector, then each axis — smooth wall glides.
export function moveWithCollision(zone, ent, dx, dy) {
  const r = 10; // body radius for collision probing
  const tryMove = (nx, ny) => {
    for (const [ox, oy] of [[0, 0], [r, 0], [-r, 0], [0, r * 0.6], [0, -r * 0.6]]) {
      if (isBlockedPx(zone, nx + ox, ny + oy)) return false;
    }
    return true;
  };
  let moved = false;
  if (tryMove(ent.x + dx, ent.y + dy)) { ent.x += dx; ent.y += dy; moved = true; }
  else {
    if (dx !== 0 && tryMove(ent.x + dx, ent.y)) { ent.x += dx; moved = true; }
    if (dy !== 0 && tryMove(ent.x, ent.y + dy)) { ent.y += dy; moved = true; }
  }
  ent.x = clamp(ent.x, TILE, zone.W - TILE);
  ent.y = clamp(ent.y, TILE, zone.H - TILE);
  return moved;
}

export function updateRespawns(dt) {
  const zone = G.zone;
  if (!zone) return;
  for (let i = zone.respawnQueue.length - 1; i >= 0; i--) {
    const r = zone.respawnQueue[i];
    r.at -= dt;
    if (r.at <= 0) {
      zone.respawnQueue.splice(i, 1);
      spawnMonster(zone, r.monsterId, r.area);
    }
  }
}

export function portalNear(x, y) {
  if (!G.zone) return null;
  for (const p of G.zone.portals) {
    if (dist(x, y, p.x, p.y) < TILE * 1.4) return p;
  }
  return null;
}

export function zoneBlurb(zoneId) {
  return LORE.zones?.[zoneId]?.blurb || '';
}
