// fx.js — floating damage numbers that pop up when something gets hit.

import * as THREE from 'three';

export function createFX(scene) {
  const active = [];

  function spawnNumber(position, text, color = '#ffd34d') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 44px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(20,20,30,0.9)';
    ctx.strokeText(text, 64, 32);
    ctx.fillStyle = color;
    ctx.fillText(text, 64, 32);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.5, 0.75, 1);
    sprite.position.copy(position);
    sprite.position.x += (Math.random() - 0.5) * 0.6;
    sprite.position.y += 0.3;
    scene.add(sprite);
    active.push({ sprite, life: 0.9, t: 0 });
  }

  function update(dt) {
    for (let i = active.length - 1; i >= 0; i--) {
      const n = active[i];
      n.t += dt;
      n.sprite.position.y += dt * 1.6;
      n.sprite.material.opacity = 1 - (n.t / n.life) ** 2;
      if (n.t >= n.life) {
        n.sprite.material.map.dispose();
        n.sprite.material.dispose();
        n.sprite.removeFromParent();
        active.splice(i, 1);
      }
    }
  }

  return { spawnNumber, update };
}
