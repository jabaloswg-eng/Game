// main.js — starts the game: renderer, scene, hero, physics and the game loop.

import * as THREE from 'three';
import { buildWorld, terrainHeight, findSpawn, WATER_LEVEL } from './world.js';
import { createHero } from './character.js';
import { createControls } from './controls.js';
import { createEnemies } from './enemies.js';
import { createFX } from './fx.js';

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

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- world and hero ---------------------------------------------------------

const world = buildWorld(scene);
const hero = createHero();
scene.add(hero.group);
hero.group.position.copy(findSpawn());

const controls = createControls(renderer.domElement);
const enemies = createEnemies(scene);
const fx = createFX(scene);

// --- player health and combat ------------------------------------------------

const MAX_HP = 100;
const SWORD_DAMAGE = 25;
const SHEATHE_AFTER = 6; // seconds without fighting before the sword goes away

let hp = MAX_HP;
let lastHurt = -100;
let sheatheTimer = 0;
let dead = false;
let elapsed = 0;

const hpFill = document.getElementById('hpfill');
const damageFlash = document.getElementById('damage-flash');
const deathOverlay = document.getElementById('death');

function refreshHpBar() {
  hpFill.style.width = `${Math.max(0, (hp / MAX_HP) * 100)}%`;
  hpFill.classList.toggle('low', hp < MAX_HP * 0.35);
}

function hurtPlayer(amount, fromPos) {
  if (dead) return;
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
      hp = MAX_HP;
      refreshHpBar();
      dead = false;
      deathOverlay.style.opacity = 0;
    }, 1800);
  }
}

function updateCombat(dt) {
  if (controls.consumeAttack() && !dead) {
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
    const hits = enemies.damageCone(hero.group.position, hero.group.rotation.y, SWORD_DAMAGE, fx);
    if (hits > 0) sheatheTimer = SHEATHE_AFTER;
  }

  if (sheatheTimer > 0) {
    sheatheTimer -= dt;
    if (sheatheTimer <= 0) hero.setArmed(false);
  }

  // slow regeneration once out of combat for a while
  if (!dead && hp < MAX_HP && elapsed - lastHurt > 6) {
    hp = Math.min(MAX_HP, hp + 2.5 * dt);
    refreshHpBar();
  }
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

function canStandAt(x, z) {
  return terrainHeight(x, z) > WATER_LEVEL - MAX_WADE_DEPTH;
}

function updatePlayer(dt) {
  const pos = hero.group.position;
  const move = dead ? new THREE.Vector3() : controls.moveVector();
  const targetSpeed = controls.wantsSprint() ? SPRINT_SPEED : WALK_SPEED;

  // ease horizontal velocity toward the input direction
  const target = move.multiplyScalar(targetSpeed);
  const ease = 1 - Math.exp(-10 * dt);
  velocity.x += (target.x - velocity.x) * ease;
  velocity.z += (target.z - velocity.z) * ease;

  // try each axis separately so the hero slides along the lake shore
  const nx = pos.x + velocity.x * dt;
  const nz = pos.z + velocity.z * dt;
  if (canStandAt(nx, pos.z)) pos.x = nx; else velocity.x = 0;
  if (canStandAt(pos.x, nz)) pos.z = nz; else velocity.z = 0;

  // jumping and gravity
  if (grounded && controls.wantsJump()) {
    verticalVel = JUMP_VELOCITY;
    grounded = false;
  }
  verticalVel += GRAVITY * dt;
  pos.y += verticalVel * dt;

  const groundY = terrainHeight(pos.x, pos.z);
  if (pos.y <= groundY) {
    pos.y = groundY;
    verticalVel = 0;
    grounded = true;
  }

  // face the direction of movement
  const horizSpeed = Math.hypot(velocity.x, velocity.z);
  if (horizSpeed > 0.5) {
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
  fx.update(dt);
  updateCamera();
  updateSun();
  world.update(dt);

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    document.getElementById('loading').classList.add('hidden');
  }
}

loop();

// small handle for automated testing — not used by the game itself
window.__game = {
  get hp() { return hp; },
  enemyCount: enemies.count,
  enemies: () => enemies.snapshot(),
  setPos(x, z) { hero.group.position.set(x, terrainHeight(x, z), z); },
  setYaw(y) { hero.group.rotation.y = y; },
};
