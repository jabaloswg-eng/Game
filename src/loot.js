// loot.js — items monsters drop: gold coins (currency) and health
// potions. Drops bob and spin on the ground, get pulled toward the hero
// when close, and vanish into the bag on contact.

import * as THREE from 'three';
import { terrainHeight } from './world.js';

const COIN_GEO = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 14);
const COIN_MAT = new THREE.MeshStandardMaterial({
  color: 0xffd24a, metalness: 0.85, roughness: 0.25,
  emissive: 0x7a5a12, emissiveIntensity: 0.35, // catches the bloom
});

function makeCoin() {
  const m = new THREE.Mesh(COIN_GEO, COIN_MAT);
  m.rotation.x = Math.PI / 2;
  m.castShadow = true;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

const GLASS_MAT = new THREE.MeshStandardMaterial({
  color: 0xd83a3a, roughness: 0.15, metalness: 0.1,
  emissive: 0x5a0f0f, emissiveIntensity: 0.5,
});
const CORK_MAT = new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.9 });

function makePotion() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), GLASS_MAT);
  body.position.y = 0.14;
  body.scale.y = 1.15;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8), GLASS_MAT);
  neck.position.y = 0.33;
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 8), CORK_MAT);
  cork.position.y = 0.4;
  body.castShadow = true;
  g.add(body, neck, cork);
  return g;
}

const TTL = 90; // seconds a drop lies around before despawning

export function createLoot(scene) {
  const drops = [];

  function spawnDrop(pos, type, amount = 1) {
    const group = type === 'gold' ? makeCoin() : makePotion();
    const x = pos.x + (Math.random() - 0.5) * 1.4;
    const z = pos.z + (Math.random() - 0.5) * 1.4;
    group.position.set(x, terrainHeight(x, z) + 0.25, z);
    scene.add(group);
    drops.push({ type, amount, group, t: Math.random() * 6, age: 0 });
  }

  function update(dt, heroPos, onPickup) {
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.t += dt;
      d.age += dt;
      d.group.rotation.y += dt * 2.2;
      const g = d.group.position;
      const baseY = terrainHeight(g.x, g.z) + 0.25;
      g.y = baseY + Math.sin(d.t * 2.4) * 0.08 + 0.06;

      const dist = g.distanceTo(heroPos);
      if (dist < 2.6) {
        // magnet toward the hero
        const pull = Math.min(1, (8 * dt) / Math.max(dist, 0.001));
        g.lerp(new THREE.Vector3(heroPos.x, heroPos.y + 0.8, heroPos.z), pull);
      }
      if (dist < 1.1) {
        onPickup(d.type, d.amount);
        d.group.removeFromParent();
        drops.splice(i, 1);
        continue;
      }
      if (d.age > TTL) {
        d.group.removeFromParent();
        drops.splice(i, 1);
      }
    }
  }

  return { spawnDrop, update, count: () => drops.length };
}
