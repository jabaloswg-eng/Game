// character.js — the hero: a stylized low-poly adventurer with a sword on
// their back, built entirely from simple shapes and animated in code.

import * as THREE from 'three';

const SKIN = 0xf0c8a2;
const HAIR = 0x9fb7c9;
const TUNIC = 0x3e6db0;
const TUNIC_DARK = 0x30558c;
const PANTS = 0x2b3a4a;
const BOOTS = 0x54402c;
const BELT = 0xc9a94b;
const BLADE = 0xdde6ee;
const GRIP = 0x503a28;

function box(w, h, d, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
  );
  mesh.castShadow = true;
  return mesh;
}

function sphere(r, color, wSeg = 12, hSeg = 10) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, wSeg, hSeg),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
  );
  mesh.castShadow = true;
  return mesh;
}

function buildSword() {
  const sword = new THREE.Group();

  const blade = box(0.07, 1.05, 0.02, BLADE);
  blade.material.metalness = 0.7;
  blade.material.roughness = 0.3;
  blade.position.y = 0.62;

  const guard = box(0.24, 0.05, 0.05, BELT);
  guard.position.y = 0.08;

  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.033, 0.033, 0.24, 6),
    new THREE.MeshStandardMaterial({ color: GRIP, roughness: 0.9 })
  );
  grip.castShadow = true;
  grip.position.y = -0.06;

  const pommel = sphere(0.05, BELT, 8, 6);
  pommel.position.y = -0.2;

  sword.add(blade, guard, grip, pommel);
  return sword;
}

export function createHero() {
  const group = new THREE.Group();

  // body — everything that bobs while running hangs off this
  const body = new THREE.Group();
  group.add(body);

  const torso = box(0.55, 0.68, 0.32, TUNIC);
  torso.position.y = 1.06;

  const belt = box(0.57, 0.09, 0.34, BELT);
  belt.position.y = 0.74;

  const hips = box(0.5, 0.18, 0.3, PANTS);
  hips.position.y = 0.64;

  const head = sphere(0.27, SKIN);
  head.position.y = 1.66;

  // sits high and slightly back so the face stays visible
  const hair = sphere(0.28, HAIR);
  hair.position.set(0, 1.74, -0.09);
  hair.scale.set(1.05, 0.9, 1.05);

  const eyeL = sphere(0.035, 0x22303e, 6, 5);
  const eyeR = sphere(0.035, 0x22303e, 6, 5);
  eyeL.position.set(-0.1, 1.68, 0.24);
  eyeR.position.set(0.1, 1.68, 0.24);

  body.add(torso, belt, hips, head, hair, eyeL, eyeR);

  // arms pivot at the shoulders
  const armL = new THREE.Group();
  const armR = new THREE.Group();
  armL.position.set(-0.36, 1.32, 0);
  armR.position.set(0.36, 1.32, 0);
  for (const [arm, side] of [[armL, -1], [armR, 1]]) {
    const upper = box(0.15, 0.34, 0.16, TUNIC_DARK);
    upper.position.y = -0.16;
    const lower = box(0.13, 0.3, 0.14, SKIN);
    lower.position.y = -0.46;
    const shoulder = sphere(0.11, TUNIC_DARK, 8, 6);
    shoulder.position.x = side * 0.02;
    arm.add(shoulder, upper, lower);
    body.add(arm);
  }

  // legs pivot at the hips
  const legL = new THREE.Group();
  const legR = new THREE.Group();
  legL.position.set(-0.15, 0.62, 0);
  legR.position.set(0.15, 0.62, 0);
  for (const leg of [legL, legR]) {
    const thigh = box(0.18, 0.34, 0.2, PANTS);
    thigh.position.y = -0.16;
    const shin = box(0.16, 0.28, 0.18, BOOTS);
    shin.position.y = -0.46;
    const foot = box(0.17, 0.1, 0.28, BOOTS);
    foot.position.set(0, -0.62, 0.05);
    leg.add(thigh, shin, foot);
    body.add(leg);
  }

  // sword slung across the back
  const sword = buildSword();
  sword.position.set(0.05, 1.1, -0.24);
  sword.rotation.z = 2.55;
  body.add(sword);

  // ------------------------------------------------------------------
  // Procedural animation: pose targets are computed from the movement
  // state and the limbs ease toward them, so transitions look smooth.
  // ------------------------------------------------------------------
  let phase = 0;
  let idleT = 0;

  function update(dt, { speed, grounded }) {
    const run = Math.min(speed / 7, 1.4); // 0 = standing, 1 = full run
    phase += dt * (4 + speed * 1.35);
    idleT += dt;

    let armLx, armRx, legLx, legRx, bob, lean;
    if (!grounded) {
      // airborne: legs split, arms swept back
      armLx = -2.4; armRx = -2.4;
      legLx = 0.55; legRx = -0.4;
      bob = 0; lean = 0.12;
    } else if (run > 0.05) {
      const swing = Math.sin(phase);
      armLx = swing * 0.85 * run;
      armRx = -swing * 0.85 * run;
      legLx = -swing * 0.95 * run;
      legRx = swing * 0.95 * run;
      bob = Math.abs(Math.cos(phase)) * 0.07 * run;
      lean = 0.14 * run;
    } else {
      // idle: gentle breathing sway
      const s = Math.sin(idleT * 1.8);
      armLx = 0.06 + s * 0.04;
      armRx = 0.06 - s * 0.04;
      legLx = 0; legRx = 0;
      bob = s * 0.012;
      lean = 0;
    }

    const ease = 1 - Math.exp(-14 * dt);
    armL.rotation.x += (armLx - armL.rotation.x) * ease;
    armR.rotation.x += (armRx - armR.rotation.x) * ease;
    legL.rotation.x += (legLx - legL.rotation.x) * ease;
    legR.rotation.x += (legRx - legR.rotation.x) * ease;
    body.position.y += (bob - body.position.y) * ease;
    body.rotation.x += (lean - body.rotation.x) * ease;
  }

  return { group, update };
}
