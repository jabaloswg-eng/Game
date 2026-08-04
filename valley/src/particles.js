// particles.js — small bursts of glowing points: sword-hit sparks, the
// level-up fountain, and the motion streaks behind a charging hero.

import * as THREE from 'three';

export function createParticles(scene) {
  const bursts = [];

  function spawn(position, {
    count = 14,
    color = 0xffc24d,
    speed = 5,
    life = 0.5,
    size = 0.16,
    gravity = -9,
    spread = 1,     // 1 = sphere, 0 = mostly upward
  } = {}) {
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      const theta = Math.random() * Math.PI * 2;
      const up = 1 - spread * Math.random() * 2;
      const r = Math.sqrt(Math.max(0, 1 - up * up));
      const s = speed * (0.4 + Math.random() * 0.8);
      velocities.push(new THREE.Vector3(
        Math.cos(theta) * r * s,
        Math.abs(up) * s * (spread < 1 ? 1 : Math.sign(up)),
        Math.sin(theta) * r * s
      ));
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending, // bright — the bloom pass makes these glow
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    bursts.push({ points, velocities, life, t: 0, gravity });
  }

  function update(dt) {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.t += dt;
      const pos = b.points.geometry.attributes.position;
      for (let j = 0; j < b.velocities.length; j++) {
        const v = b.velocities[j];
        v.y += b.gravity * dt;
        pos.setXYZ(j,
          pos.getX(j) + v.x * dt,
          pos.getY(j) + v.y * dt,
          pos.getZ(j) + v.z * dt
        );
      }
      pos.needsUpdate = true;
      b.points.material.opacity = 1 - b.t / b.life;
      if (b.t >= b.life) {
        b.points.geometry.dispose();
        b.points.material.dispose();
        b.points.removeFromParent();
        bursts.splice(i, 1);
      }
    }
  }

  return { spawn, update };
}
