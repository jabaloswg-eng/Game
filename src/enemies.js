// enemies.js — goblins, wolves and boars: their 3D models, simple AI
// (wander → chase → attack), health bars, damage and respawning.

import * as THREE from 'three';
import { terrainHeight, WATER_LEVEL } from './world.js';
import { loadModel } from './assets.js';

function mat(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
}

function part(geo, material) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  return mesh;
}

function box(w, h, d, material) {
  return part(new THREE.BoxGeometry(w, h, d), material);
}

// ---------------------------------------------------------------------------
// Monster models. Each builder returns the group plus the limbs the AI
// animates. Materials are created per monster so hit-flashes don't spread.
// ---------------------------------------------------------------------------

function buildGoblin() {
  const g = new THREE.Group();
  const skin = mat(0x6fae4e);
  const cloth = mat(0x7a5a3a);
  const mats = [skin, cloth];

  const body = box(0.42, 0.42, 0.28, cloth);
  body.position.y = 0.62;
  const head = part(new THREE.SphereGeometry(0.23, 10, 8), skin);
  head.position.y = 1.0;
  g.add(body, head);

  for (const side of [-1, 1]) {
    const ear = part(new THREE.ConeGeometry(0.07, 0.26, 5), skin);
    ear.position.set(side * 0.26, 1.08, 0);
    ear.rotation.z = side * -1.25;
    const eye = part(new THREE.SphereGeometry(0.04, 6, 5), mat(0xd23a3a));
    eye.position.set(side * 0.09, 1.02, 0.2);
    g.add(ear, eye);
  }

  const limbs = { arms: [], legs: [] };
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.28, 0.78, 0);
    const a = box(0.1, 0.36, 0.1, skin);
    a.position.y = -0.17;
    arm.add(a);
    g.add(arm);
    limbs.arms.push(arm);

    const leg = new THREE.Group();
    leg.position.set(side * 0.12, 0.42, 0);
    const l = box(0.13, 0.4, 0.13, cloth);
    l.position.y = -0.19;
    leg.add(l);
    g.add(leg);
    limbs.legs.push(leg);
  }

  // a crude wooden club in the right hand
  const club = part(new THREE.CylinderGeometry(0.05, 0.1, 0.55, 6), mat(0x5c4128));
  club.position.set(0, -0.42, 0.12);
  club.rotation.x = 0.6;
  limbs.arms[1].add(club);

  return { group: g, limbs, mats, barHeight: 1.55 };
}

function buildWolf() {
  const g = new THREE.Group();
  const fur = mat(0x8d9099);
  const dark = mat(0x5b5e66);
  const mats = [fur, dark];

  const body = box(0.38, 0.4, 1.05, fur);
  body.position.y = 0.58;

  const head = new THREE.Group();
  head.position.set(0, 0.78, 0.62);
  const skull = box(0.3, 0.28, 0.3, fur);
  const snout = box(0.14, 0.13, 0.24, dark);
  snout.position.set(0, -0.04, 0.24);
  head.add(skull, snout);
  for (const side of [-1, 1]) {
    const ear = part(new THREE.ConeGeometry(0.06, 0.16, 4), dark);
    ear.position.set(side * 0.1, 0.2, -0.02);
    head.add(ear);
    const eye = part(new THREE.SphereGeometry(0.035, 6, 5), mat(0xe8c33a));
    eye.position.set(side * 0.09, 0.05, 0.16);
    head.add(eye);
  }

  const tail = box(0.08, 0.08, 0.42, dark);
  tail.position.set(0, 0.68, -0.6);
  tail.rotation.x = -0.5;
  g.add(body, head, tail);

  const limbs = { legs: [], head };
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const leg = new THREE.Group();
    leg.position.set(sx * 0.15, 0.44, sz * 0.36);
    const l = box(0.1, 0.46, 0.1, fur);
    l.position.y = -0.22;
    leg.add(l);
    g.add(leg);
    limbs.legs.push(leg);
  }

  return { group: g, limbs, mats, barHeight: 1.3 };
}

function buildBoar() {
  const g = new THREE.Group();
  const hide = mat(0x7a4f2f);
  const dark = mat(0x5b3a22);
  const mats = [hide, dark];

  const body = box(0.55, 0.55, 1.0, hide);
  body.position.y = 0.52;
  const mane = box(0.3, 0.18, 0.7, dark);
  mane.position.y = 0.84;

  const head = new THREE.Group();
  head.position.set(0, 0.5, 0.62);
  const skull = box(0.38, 0.38, 0.32, hide);
  const snout = box(0.18, 0.15, 0.12, mat(0xcf9285));
  snout.position.set(0, -0.06, 0.2);
  head.add(skull, snout);
  for (const side of [-1, 1]) {
    const tusk = part(new THREE.ConeGeometry(0.035, 0.16, 5), mat(0xf0ead8));
    tusk.position.set(side * 0.12, -0.12, 0.18);
    tusk.rotation.x = -0.9;
    head.add(tusk);
    const eye = part(new THREE.SphereGeometry(0.035, 6, 5), mat(0x2a2020));
    eye.position.set(side * 0.13, 0.08, 0.17);
    head.add(eye);
  }
  g.add(body, mane, head);

  const limbs = { legs: [], head };
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const leg = new THREE.Group();
    leg.position.set(sx * 0.2, 0.35, sz * 0.34);
    const l = box(0.12, 0.36, 0.12, dark);
    l.position.y = -0.17;
    leg.add(l);
    g.add(leg);
    limbs.legs.push(leg);
  }

  return { group: g, limbs, mats, barHeight: 1.25 };
}

// ---------------------------------------------------------------------------
// Monster stats.
// ---------------------------------------------------------------------------

const TYPES = {
  goblin: { build: buildGoblin, hp: 50, damage: 8, chaseSpeed: 4.6, walkSpeed: 1.6, aggro: 16, range: 1.8, cooldown: 1.5 },
  wolf:   { build: buildWolf,   hp: 40, damage: 10, chaseSpeed: 7.2, walkSpeed: 2.4, aggro: 22, range: 2.0, cooldown: 1.1 },
  boar:   { build: buildBoar,   hp: 70, damage: 14, chaseSpeed: 5.6, walkSpeed: 1.4, aggro: 12, range: 1.9, cooldown: 1.9 },
};

const RESPAWN_SECONDS = 30;

// hand-placed dens around the valley; the first goblin is close to the
// player's spawn so there's something to fight right away. A fourth entry
// names a GLB model variant from the assets/ folder (e.g. 'blender' loads
// assets/goblin-blender.glb in place of the built-in primitive model).
const DENS = [
  ['goblin', 16, 8, 'ai'], ['goblin', 20, 12, 'blender'], ['goblin', -60, -40], ['goblin', -64, -34],
  ['goblin', -55, -44], ['goblin', 85, 30], ['goblin', 90, 36], ['goblin', 82, 40],
  ['wolf', 40, -70], ['wolf', 45, -65], ['wolf', 36, -63], ['wolf', -90, 80], ['wolf', -85, 85],
  ['boar', -30, -15], ['boar', 60, 75], ['boar', -95, 10], ['boar', 25, 95], ['boar', 110, -30],
];

// nudge a den position off water / cliffs
function settle(x, z) {
  for (let tries = 0; tries < 20; tries++) {
    const h = terrainHeight(x, z);
    if (h > WATER_LEVEL + 1 && h < 20) return { x, z };
    x += 5;
    z += 3;
  }
  return { x, z };
}

// ---------------------------------------------------------------------------

function makeHealthBar(height) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 8;
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  );
  sprite.scale.set(1.1, 0.14, 1);
  sprite.position.y = height;

  function redraw(frac) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 8);
    ctx.fillStyle = 'rgba(25,12,16,0.85)';
    ctx.fillRect(0, 0, 64, 8);
    ctx.fillStyle = frac > 0.4 ? '#46d160' : '#e04f3f';
    ctx.fillRect(1, 1, Math.max(0, 62 * frac), 6);
    tex.needsUpdate = true;
  }
  redraw(1);
  return { sprite, redraw };
}

// Replace an enemy's primitive body with a loaded GLB model, keeping its
// health bar, AI state and group transform untouched.
function swapToGLB(e, bar, { model, materials }) {
  const g = e.model.group;
  for (const child of [...g.children]) {
    if (child !== bar.sprite) g.remove(child);
  }
  g.add(model);
  e.model.visual = model;
  e.model.mats = materials;
  e.model.limbs = { legs: [], arms: [] }; // no rigged limbs: whole-body animation
}

export function createEnemies(scene) {
  const enemies = DENS.map(([type, dx, dz, variant]) => {
    const stats = TYPES[type];
    const { x, z } = settle(dx, dz);
    const model = stats.build();
    model.group.position.set(x, terrainHeight(x, z), z);
    scene.add(model.group);

    const bar = makeHealthBar(model.barHeight);
    model.group.add(bar.sprite);

    const e = {
      type, stats, model, bar,
      hp: stats.hp,
      home: new THREE.Vector2(x, z),
      state: 'wander',
      wanderTarget: new THREE.Vector2(x, z),
      wanderTimer: Math.random() * 3,
      cooldown: 0,
      windup: -1,
      flash: 0,
      phase: Math.random() * 10,
      deadTimer: 0,
    };

    if (variant) {
      // per-variant load tweaks (TripoSR models come out lying face-down)
      const opts = variant === 'ai'
        ? { height: 1.45, rotation: [-Math.PI / 2, 0, 0] }
        : { height: 1.45 };
      loadModel(`./assets/${type}-${variant}.glb`, opts)
        .then((loaded) => swapToGLB(e, bar, loaded))
        .catch((err) => console.warn(`Model ${type}-${variant} not loaded, keeping primitive:`, err));
    }

    return e;
  });

  function canStand(x, z) {
    return terrainHeight(x, z) > WATER_LEVEL - 0.4;
  }

  function moveToward(e, tx, tz, speed, dt) {
    const p = e.model.group.position;
    const dx = tx - p.x, dz = tz - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) return 0;
    const step = Math.min(speed * dt, d);
    const nx = p.x + (dx / d) * step;
    const nz = p.z + (dz / d) * step;
    if (canStand(nx, nz)) {
      p.x = nx;
      p.z = nz;
    }
    // smoothly face the direction of travel
    const targetYaw = Math.atan2(dx, dz);
    let dy = targetYaw - e.model.group.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    e.model.group.rotation.y += dy * Math.min(1, 8 * dt);
    return speed;
  }

  function animate(e, dt, moving) {
    const { limbs } = e.model;
    e.phase += dt * (moving > 0 ? 4 + moving * 1.6 : 2);
    const swing = moving > 0 ? Math.sin(e.phase) * 0.65 : 0;
    if (limbs.legs.length === 0) {
      // GLB model without rigged limbs: hop while moving, breathe while idle
      const v = e.model.visual;
      if (v) {
        v.position.y = moving > 0
          ? Math.abs(Math.sin(e.phase)) * 0.14
          : Math.sin(e.phase * 0.5) * 0.02;
      }
    } else if (limbs.legs.length === 4) {
      // quadruped trot: diagonal legs move together
      limbs.legs[0].rotation.x = swing;
      limbs.legs[3].rotation.x = swing;
      limbs.legs[1].rotation.x = -swing;
      limbs.legs[2].rotation.x = -swing;
    } else {
      limbs.legs[0].rotation.x = swing;
      limbs.legs[1].rotation.x = -swing;
      limbs.arms[0].rotation.x = -swing;
      // right arm swings the club during the windup
      limbs.arms[1].rotation.x = e.windup > 0 ? -1.8 + e.windup * 3 : swing * 0.7;
    }
    // lunge forward while attacking
    const lunge = e.windup > 0 ? 0.25 : 0;
    e.model.group.rotation.x += (lunge - e.model.group.rotation.x) * Math.min(1, 10 * dt);
  }

  function die(e) {
    e.state = 'dead';
    e.deadTimer = 0;
    e.windup = -1;
    e.bar.sprite.visible = false;
  }

  function revive(e) {
    e.hp = e.stats.hp;
    e.state = 'wander';
    e.model.group.visible = true;
    e.model.group.rotation.z = 0;
    e.model.group.position.set(e.home.x, terrainHeight(e.home.x, e.home.y), e.home.y);
    e.bar.redraw(1);
    e.bar.sprite.visible = true;
  }

  function update(dt, playerPos, hurtPlayer) {
    for (const e of enemies) {
      const g = e.model.group;

      if (e.state === 'dead') {
        e.deadTimer += dt;
        // keel over, then vanish until respawn
        g.rotation.z = Math.min(1.55, g.rotation.z + dt * 5);
        if (e.deadTimer > 2 && g.visible) g.visible = false;
        if (e.deadTimer > RESPAWN_SECONDS) revive(e);
        continue;
      }

      // hit flash
      if (e.flash > 0) {
        e.flash -= dt;
        const on = e.flash > 0;
        for (const m of e.model.mats) {
          if (!m.emissive) continue; // some GLB materials have no emissive
          m.emissive.setHex(on ? 0xff3b30 : 0x000000);
          m.emissiveIntensity = on ? 0.7 : 0;
        }
      }

      const dist = g.position.distanceTo(playerPos);
      let moving = 0;

      if (e.windup > 0) {
        // mid-attack: freeze in place, land the hit when the windup ends
        e.windup -= dt;
        if (e.windup <= 0) {
          e.windup = -1;
          if (dist < e.stats.range + 0.7) hurtPlayer(e.stats.damage, g.position);
        }
      } else if (dist < e.stats.range && e.cooldown <= 0) {
        e.windup = 0.35;
        e.cooldown = e.stats.cooldown;
      } else if (dist < e.stats.aggro || (e.state === 'chase' && dist < 35)) {
        e.state = 'chase';
        if (dist > e.stats.range * 0.85) {
          moving = moveToward(e, playerPos.x, playerPos.z, e.stats.chaseSpeed, dt);
        }
      } else {
        // wander lazily around home
        e.state = 'wander';
        e.wanderTimer -= dt;
        if (e.wanderTimer <= 0) {
          e.wanderTimer = 2.5 + Math.random() * 4;
          e.wanderTarget.set(
            e.home.x + (Math.random() - 0.5) * 16,
            e.home.y + (Math.random() - 0.5) * 16
          );
        }
        const p = g.position;
        if (Math.hypot(e.wanderTarget.x - p.x, e.wanderTarget.y - p.z) > 1) {
          moving = moveToward(e, e.wanderTarget.x, e.wanderTarget.y, e.stats.walkSpeed, dt);
        }
      }

      e.cooldown -= dt;
      g.position.y = terrainHeight(g.position.x, g.position.z);
      animate(e, dt, moving);
    }
  }

  // Nearest living enemy within maxDist of a point (for targeted skills).
  function nearest(pos, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const e of enemies) {
      if (e.state === 'dead') continue;
      const d = e.model.group.position.distanceTo(pos);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best && { position: best.model.group.position, distance: bestD, type: best.type };
  }

  // Damage every living enemy inside a short cone in front of the player.
  const toEnemy = new THREE.Vector3();
  function damageCone(origin, yaw, damage, fx, onKill, range = 2.8) {
    const fwdX = Math.sin(yaw), fwdZ = Math.cos(yaw);
    let hits = 0;
    for (const e of enemies) {
      if (e.state === 'dead') continue;
      const g = e.model.group;
      toEnemy.subVectors(g.position, origin);
      toEnemy.y = 0;
      const d = toEnemy.length();
      if (d > range) continue;
      toEnemy.normalize();
      if (d > 0.6 && toEnemy.x * fwdX + toEnemy.z * fwdZ < 0.35) continue;

      e.hp -= damage;
      e.flash = 0.15;
      e.bar.redraw(Math.max(0, e.hp / e.stats.hp));
      fx.spawnNumber(g.position.clone().setY(g.position.y + e.model.barHeight), String(damage));
      // knockback
      const kx = g.position.x + toEnemy.x * 0.9;
      const kz = g.position.z + toEnemy.z * 0.9;
      if (canStand(kx, kz)) g.position.set(kx, g.position.y, kz);
      if (e.hp <= 0) {
        die(e);
        if (onKill) onKill(e.type, g.position);
      }
      hits++;
    }
    return hits;
  }

  return {
    update,
    damageCone,
    nearest,
    count: enemies.length,
    // read-only snapshot used by tests and (later) quest logic
    snapshot: () => enemies.map((e) => ({
      type: e.type, hp: e.hp, state: e.state,
      x: e.model.group.position.x, z: e.model.group.position.z,
    })),
    // debug: world bounding box of an enemy's model (test hook)
    boxOf: (i) => {
      const box = new THREE.Box3().setFromObject(enemies[i].model.group);
      return { min: box.min.toArray(), max: box.max.toArray() };
    },
  };
}
