// main.js — starts the game: renderer, scene, hero, physics and the game loop.

import * as THREE from 'three';
import { buildWorld, terrainHeight, findSpawn, WATER_LEVEL } from './world.js';
import { createHero } from './character.js';
import { createControls } from './controls.js';
import { createEnemies } from './enemies.js';
import { createFX } from './fx.js';
import { createParticles } from './particles.js';
import { createProgression } from './progression.js';
import { createSkills } from './skills.js';
import { initTouch } from './touch.js';
import { createTalentsUI } from './talents.js';
import { createLoot } from './loot.js';
import { createBag } from './bag.js';
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js';

// --- renderer -------------------------------------------------------------

const container = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60, window.innerWidth / window.innerHeight, 0.1, 2000
);

// post-processing: render the scene, add a subtle glow to bright things
// (sun, particles, water glints), then convert colors for the screen
const composer = new EffectComposer(renderer);
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.38,  // strength — kept subtle so the scene doesn't turn into a dream sequence
  0.6,   // radius
  0.82   // threshold — only genuinely bright pixels bloom
);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// --- world and hero ---------------------------------------------------------

const world = buildWorld(scene, renderer);
const hero = createHero();
scene.add(hero.group);
hero.group.position.copy(findSpawn());

composer.addPass(new RenderPass(scene, camera));
composer.addPass(bloom);
composer.addPass(new OutputPass());

const controls = createControls(renderer.domElement);
const enemies = createEnemies(scene);
const fx = createFX(scene);
const particles = createParticles(scene);
const progression = createProgression();
const loot = createLoot(scene);

// --- player health and combat ------------------------------------------------

const XP_REWARD = { goblin: 10, wolf: 12, boar: 16 };
const SHEATHE_AFTER = 6; // seconds without fighting before the sword goes away

let hp = progression.maxHp();
let lastHurt = -100;
let sheatheTimer = 0;
let dead = false;
let elapsed = 0;

const hpFill = document.getElementById('hpfill');
const damageFlash = document.getElementById('damage-flash');
const deathOverlay = document.getElementById('death');

function refreshHpBar() {
  const max = progression.maxHp();
  hpFill.style.width = `${Math.max(0, (hp / max) * 100)}%`;
  hpFill.classList.toggle('low', hp < max * 0.35);
}

function hurtPlayer(amount, fromPos) {
  if (dead) return;
  if (progression.has('v3')) amount = Math.round(amount * 0.85); // Stoneskin
  hp -= amount;
  lastHurt = elapsed;
  refreshHpBar();
  fx.spawnNumber(
    hero.group.position.clone().setY(hero.group.position.y + 2.1),
    String(amount), '#ff6a5a'
  );
  // brief red vignette + knockback away from the attacker
  damageFlash.style.opacity = 1;
  setTimeout(() => (damageFlash.style.opacity = 0), 180);
  const away = hero.group.position.clone().sub(fromPos).setY(0).normalize();
  velocity.x += away.x * 6;
  velocity.z += away.z * 6;

  if (hp <= 0) {
    dead = true;
    deathOverlay.style.opacity = 1;
    setTimeout(() => {
      hero.group.position.copy(findSpawn());
      velocity.set(0, 0, 0);
      hp = progression.maxHp();
      refreshHpBar();
      dead = false;
      deathOverlay.style.opacity = 0;
    }, 1800);
  }
}

const talentsUI = createTalentsUI(progression, () => refreshHpBar());

const bag = createBag(progression, {
  onUsePotion() {
    if (dead || hp >= progression.maxHp() || !progression.usePotion()) return false;
    hp = Math.min(progression.maxHp(), hp + 50);
    refreshHpBar();
    particles.spawn(hero.group.position.clone().setY(hero.group.position.y + 1), {
      count: 16, color: 0x6ee06a, speed: 3, life: 0.7, spread: 0, gravity: -3,
    });
    return true;
  },
});

function onPickup(type, amount) {
  const pos = hero.group.position.clone().setY(hero.group.position.y + 2.0);
  if (type === 'gold') {
    progression.addGold(amount);
    fx.spawnNumber(pos, `+${amount}`, '#ffd24a');
  } else {
    progression.addPotion(amount);
    fx.spawnNumber(pos, '+🧪', '#ff8a8a');
  }
  bag.refreshHud();
}

const GOLD_BY_TYPE = { goblin: [2, 4], wolf: [3, 5], boar: [4, 7] };
const POTION_DROP_CHANCE = 0.18;

function onKill(type, atPos) {
  particles.spawn(atPos.clone().setY(atPos.y + 0.8), {
    count: 10, color: 0x9fe07a, speed: 3.5, life: 0.6, spread: 0,
  });
  const [lo, hi] = GOLD_BY_TYPE[type] ?? [2, 4];
  loot.spawnDrop(atPos, 'gold', lo + Math.floor(Math.random() * (hi - lo + 1)));
  if (Math.random() < POTION_DROP_CHANCE) loot.spawnDrop(atPos, 'potion', 1);
  if (progression.gainXP(XP_REWARD[type] ?? 10)) {
    // level up: full heal + golden fountain
    hp = progression.maxHp();
    refreshHpBar();
    particles.spawn(hero.group.position.clone().setY(hero.group.position.y + 1), {
      count: 40, color: 0xffd75e, speed: 6, life: 1.1, spread: 0, gravity: -4, size: 0.22,
    });
  }
}

// --- Charge skill ------------------------------------------------------------

const CHARGE_RANGE = 25;
const CHARGE_SPEED = 35;
const CHARGE_BONUS = 1.6;

let charging = null;       // { target } while dashing
let chargeStrike = false;  // the next sword strike is the empowered one
let slashStrike = false;   // the next sword strike is a heavy Slash
let chargeEchoUntil = -1;  // Echo Charge talent: free recast window

function tryCharge() {
  if (dead || charging) return false;
  const target = enemies.nearest(hero.group.position, CHARGE_RANGE);
  if (!target || target.distance < 3) return false; // too far or already in melee
  charging = { target, timeLeft: 1.1 };
  hero.setArmed(true);
  sheatheTimer = SHEATHE_AFTER;
  // Echo Charge: the first cast opens a 15s window for one free recast
  if (progression.has('w5')) {
    chargeEchoUntil = elapsed < chargeEchoUntil ? -1 : elapsed + 15;
  }
  return true;
}

// Slash: a heavy blow that hits twice as hard as a basic attack
function trySlash() {
  if (dead || charging || !hero.startAttack()) return false;
  hero.setArmed(true);
  sheatheTimer = SHEATHE_AFTER;
  slashStrike = true;
  if (Math.hypot(velocity.x, velocity.z) < 1) {
    hero.group.rotation.y = controls.state.yaw + Math.PI;
  }
  return true;
}

const skills = createSkills([
  { id: 'charge', name: 'Charge', key: '1', icon: '⚡', unlockLevel: 1, use: tryCharge,
    cooldown: () => (progression.has('w2') ? 6 : 8),
    bypass: () => progression.has('w5') && elapsed < chargeEchoUntil },
  { id: 'slash', name: 'Slash', key: '2', icon: '🗡️', unlockLevel: 2, cooldown: 5, use: trySlash },
]);

// --- Dash (E key / touch button): a quick burst in the movement direction ---

const DASH_SPEED = 26;
const DASH_TIME = 0.16;
const DASH_COOLDOWN = 1.6;

let dashT = 0;
let dashCd = 0;
const dashDir = new THREE.Vector3();

function tryDash() {
  if (dashCd > 0 || dead || charging) return;
  const move = controls.moveVector();
  if (move.lengthSq() > 0) {
    dashDir.copy(move);
  } else {
    // standing still: dash the way the hero faces
    dashDir.set(Math.sin(hero.group.rotation.y), 0, Math.cos(hero.group.rotation.y));
  }
  dashT = DASH_TIME;
  dashCd = DASH_COOLDOWN - (progression.has('a2') ? 0.6 : 0); // Wind Step
}

const touchUI = initTouch({
  controls,
  onDash: tryDash,
  onCharge: () => skills.trigger('charge'),
  onSlash: () => skills.trigger('slash'),
  chargeCooldownFrac: () => skills.remainingFrac('charge'),
  slashCooldownFrac: () => skills.remainingFrac('slash'),
});

function updateCharge(dt) {
  if (!charging) return;
  const pos = hero.group.position;
  const t = charging.target.position;
  const dx = t.x - pos.x, dz = t.z - pos.z;
  const dist = Math.hypot(dx, dz);
  charging.timeLeft -= dt;

  if (dist < 1.7 || charging.timeLeft <= 0) {
    // arrived: face the target and unleash the empowered slash
    hero.group.rotation.y = Math.atan2(dx, dz);
    hero.startAttack();
    chargeStrike = true;
    velocity.set(0, 0, 0);
    charging = null;
    return;
  }

  const step = Math.min(CHARGE_SPEED * dt, dist);
  pos.x += (dx / dist) * step;
  pos.z += (dz / dist) * step;
  // the dash may cross water — the hero skims across the surface
  pos.y = Math.max(terrainHeight(pos.x, pos.z), WATER_LEVEL - 0.35);
  hero.group.rotation.y = Math.atan2(dx, dz);

  // blue-white motion streaks trailing the dash
  particles.spawn(pos.clone().setY(pos.y + 1), {
    count: 4, color: 0x9fd4ff, speed: 1.2, life: 0.35, size: 0.2, gravity: 0,
  });
}

function updateCombat(dt) {
  if (controls.consumeAttack() && !dead && !charging) {
    hero.setArmed(true);
    sheatheTimer = SHEATHE_AFTER;
    if (hero.startAttack()) {
      // if standing still, square up to where the camera looks
      if (Math.hypot(velocity.x, velocity.z) < 1) {
        hero.group.rotation.y = controls.state.yaw + Math.PI;
      }
    }
  }

  if (hero.consumeStrike()) {
    const wasCharge = chargeStrike;
    const wasSlash = slashStrike;
    chargeStrike = false;
    slashStrike = false;
    const chargeBonus = progression.has('w4') ? 2.2 : CHARGE_BONUS; // Devastating Charge
    const mult = wasCharge ? chargeBonus : wasSlash ? 2 : 1;
    const damage = Math.round(progression.swordDamage() * mult);
    // the charge slash reaches a bit farther, so a last-instant knockback
    // can't push the target out of reach
    const hits = enemies.damageCone(
      hero.group.position, hero.group.rotation.y, damage, fx, onKill,
      wasCharge ? 3.8 : wasSlash ? 3.2 : 2.8
    );
    if (hits > 0) {
      sheatheTimer = SHEATHE_AFTER;
      // sparks fly where the blade lands
      const impact = hero.group.position.clone();
      impact.x += Math.sin(hero.group.rotation.y) * 1.4;
      impact.z += Math.cos(hero.group.rotation.y) * 1.4;
      impact.y += 1.1;
      particles.spawn(impact, { count: 12, color: 0xffb347, speed: 6, life: 0.4 });
    }
  }

  if (sheatheTimer > 0) {
    sheatheTimer -= dt;
    if (sheatheTimer <= 0) hero.setArmed(false);
  }

  // slow regeneration once out of combat for a while
  if (!dead && hp < progression.maxHp() && elapsed - lastHurt > 6) {
    const regen = 2.5 + (progression.has('v2') ? 2.5 : 0); // Quick Mending
    hp = Math.min(progression.maxHp(), hp + regen * dt);
    refreshHpBar();
  }

  skills.update(dt, progression.level);
  if (touchUI) touchUI.update();
}

// --- player physics ---------------------------------------------------------

const WALK_SPEED = 7;
const SPRINT_SPEED = 12.5;
const JUMP_VELOCITY = 8.5;
const GRAVITY = -24;
const MAX_WADE_DEPTH = 0.9; // how deep the hero may walk into the lake

const velocity = new THREE.Vector3();
let verticalVel = 0;
let grounded = true;
let prevJumpHeld = false;
let airJumps = 0;

function canStandAt(x, z) {
  return terrainHeight(x, z) > WATER_LEVEL - MAX_WADE_DEPTH;
}

function updatePlayer(dt) {
  if (charging) {
    // the dash owns all movement during Charge
    updateCharge(dt);
    hero.update(dt, { speed: CHARGE_SPEED, grounded: true });
    return;
  }

  const pos = hero.group.position;
  const move = dead ? new THREE.Vector3() : controls.moveVector();
  const speedMult = progression.has('a1') ? 1.1 : 1;                    // Fleet Foot
  const sprintMult = progression.has('a3') ? 1.12 : 1;                  // Sprinter
  const targetSpeed = controls.wantsSprint()
    ? SPRINT_SPEED * speedMult * sprintMult
    : WALK_SPEED * speedMult;

  if (!dead && controls.consumeDash()) tryDash();

  // ease horizontal velocity toward the input direction; a dash overrides
  // it completely for its brief burst
  if (dashT > 0) {
    dashT -= dt;
    velocity.x = dashDir.x * DASH_SPEED;
    velocity.z = dashDir.z * DASH_SPEED;
    particles.spawn(pos.clone().setY(pos.y + 0.9), {
      count: 3, color: 0xe8f4ff, speed: 1, life: 0.3, size: 0.16, gravity: 0,
    });
  } else {
    const target = move.multiplyScalar(targetSpeed);
    const ease = 1 - Math.exp(-10 * dt);
    velocity.x += (target.x - velocity.x) * ease;
    velocity.z += (target.z - velocity.z) * ease;
  }
  dashCd = Math.max(0, dashCd - dt);

  // try each axis separately so the hero slides along the lake shore;
  // if already in deep water somehow, always allow moving (to escape)
  const stuck = !canStandAt(pos.x, pos.z);
  const nx = pos.x + velocity.x * dt;
  const nz = pos.z + velocity.z * dt;
  if (stuck || canStandAt(nx, pos.z)) pos.x = nx; else velocity.x = 0;
  if (stuck || canStandAt(pos.x, nz)) pos.z = nz; else velocity.z = 0;

  // jumping and gravity (Sky Hop talent allows one mid-air jump)
  const jumpHeld = controls.wantsJump();
  if (jumpHeld && !prevJumpHeld) {
    if (grounded) {
      verticalVel = JUMP_VELOCITY;
      grounded = false;
      airJumps = 0;
    } else if (progression.has('a4') && airJumps < 1) {
      verticalVel = JUMP_VELOCITY * 0.95;
      airJumps++;
      particles.spawn(pos.clone().setY(pos.y + 0.2), {
        count: 8, color: 0xcfe8ff, speed: 3, life: 0.35, gravity: -2, spread: 1,
      });
    }
  }
  prevJumpHeld = jumpHeld;
  verticalVel += GRAVITY * dt;
  pos.y += verticalVel * dt;

  const groundY = terrainHeight(pos.x, pos.z);
  if (pos.y <= groundY) {
    pos.y = groundY;
    verticalVel = 0;
    grounded = true;
  }

  // face the direction of movement — but never mid-swing, so knockback
  // can't spin the hero away from what he's attacking
  const horizSpeed = Math.hypot(velocity.x, velocity.z);
  if (horizSpeed > 0.5 && !hero.isAttacking()) {
    const targetYaw = Math.atan2(velocity.x, velocity.z);
    let d = targetYaw - hero.group.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    hero.group.rotation.y += d * (1 - Math.exp(-12 * dt));
  }

  hero.update(dt, { speed: horizSpeed, grounded });
  return horizSpeed;
}

// --- camera -----------------------------------------------------------------

const camTarget = new THREE.Vector3();

// the camera's field of view widens during a Charge for a sense of speed
function updateFov(dt) {
  const targetFov = charging ? 72 : dashT > 0 ? 66 : 60;
  camera.fov += (targetFov - camera.fov) * Math.min(1, 8 * dt);
  camera.updateProjectionMatrix();
}

function updateCamera() {
  const { yaw, pitch, distance } = controls.state;
  camTarget.copy(hero.group.position).add(new THREE.Vector3(0, 1.7, 0));

  const offset = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch)
  ).multiplyScalar(distance);

  camera.position.copy(camTarget).add(offset);

  // keep the camera above the ground
  const minY = terrainHeight(camera.position.x, camera.position.z) + 0.6;
  if (camera.position.y < minY) camera.position.y = minY;

  camera.lookAt(camTarget);
}

// the sun and its shadow area follow the hero around the map
function updateSun() {
  const p = hero.group.position;
  world.sun.position.set(p.x + 60, p.y + 95, p.z + 45);
  world.sun.target.position.copy(p);
}

// --- game loop ----------------------------------------------------------------

const clock = new THREE.Clock();
let firstFrame = true;

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  updatePlayer(dt);
  updateCombat(dt);
  enemies.update(dt, hero.group.position, hurtPlayer);
  loot.update(dt, hero.group.position, onPickup);
  fx.update(dt);
  particles.update(dt);
  updateFov(dt);
  updateCamera();
  updateSun();
  world.update(dt);

  composer.render();

  if (firstFrame) {
    firstFrame = false;
    document.getElementById('loading').classList.add('hidden');
  }
}

loop();

// small handle for automated testing — not used by the game itself
window.__scene = scene;
window.__game = {
  get hp() { return hp; },
  get level() { return progression.level; },
  get xp() { return progression.xp; },
  get charging() { return !!charging; },
  enemyCount: enemies.count,
  enemies: () => enemies.snapshot(),
  setPos(x, z) { hero.group.position.set(x, terrainHeight(x, z), z); },
  heroPos() { const p = hero.group.position; return { x: p.x, y: p.y, z: p.z }; },
  groundAt(x, z) { return terrainHeight(x, z); },
  setYaw(y) { hero.group.rotation.y = y; },
  useSkill(id) { skills.trigger(id); },
  dash() { tryDash(); },
  get dashing() { return dashT > 0; },
  get talents() { return progression.talents; },
  get talentPoints() { return progression.availablePoints(); },
  get gold() { return progression.gold; },
  get potions() { return progression.potions; },
  get lootCount() { return loot.count(); },
  learn(id) { return progression.learn(id); },
  openTalents() { talentsUI.toggle(true); },
  boxOf(i) { return enemies.boxOf(i); },
  // debug: report all large meshes in the scene (test hook)
  sceneReport() {
    const out = [];
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    scene.traverse((o) => {
      if (!o.isMesh && !o.isPoints && !o.isSprite) return;
      box.setFromObject(o);
      box.getSize(size);
      if (Math.max(size.x, size.y, size.z) > 50) {
        out.push({
          name: o.name || o.type,
          geo: o.geometry?.type,
          mat: Array.isArray(o.material) ? o.material.map(m => m.type).join() : o.material?.type,
          size: [Math.round(size.x), Math.round(size.y), Math.round(size.z)],
          pos: o.getWorldPosition(new THREE.Vector3()).toArray().map(v => Math.round(v)),
        });
      }
    });
    return out;
  },
};
