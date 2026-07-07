// textures.js — procedural textures painted on a hidden canvas at startup,
// so the game gets surface detail without downloading any image files.

import * as THREE from 'three';

function canvasTexture(size, repeat, draw, { srgb = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Speckled detail that multiplies with the terrain's painted colors,
// so grass looks like grass instead of a flat green sheet.
export function groundTexture() {
  return canvasTexture(256, 70, (ctx, s) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 7000; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const v = 205 + Math.floor(Math.random() * 50);
      ctx.fillStyle = `rgba(${v - 25},${v},${v - 35},0.55)`;
      ctx.fillRect(x, y, 1.5, Math.random() < 0.35 ? 4 : 1.5);
    }
  });
}

// Vertical streaks for tree trunks; grayscale so the wood color comes
// from the material and the texture only adds grain.
export function barkTexture() {
  return canvasTexture(128, 2, (ctx, s) => {
    ctx.fillStyle = '#c8c0b4';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * s;
      const w = 1 + Math.random() * 3;
      const shade = 70 + Math.floor(Math.random() * 110);
      ctx.fillStyle = `rgba(${shade},${shade - 8},${shade - 16},0.45)`;
      ctx.fillRect(x, 0, w, s);
    }
  });
}

// Soft random bumps used as the water's normal map — the surface catches
// light unevenly, which reads as ripples once the map slowly drifts.
export function waterNormalTexture() {
  return canvasTexture(256, 24, (ctx, s) => {
    ctx.fillStyle = 'rgb(128,128,255)';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const r = 2 + Math.random() * 7;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const dx = 128 + Math.floor((Math.random() - 0.5) * 90);
      const dy = 128 + Math.floor((Math.random() - 0.5) * 90);
      g.addColorStop(0, `rgba(${dx},${dy},255,0.5)`);
      g.addColorStop(1, 'rgba(128,128,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }, { srgb: false });
}
