// controls.js — keyboard input and the third-person orbit camera.

import * as THREE from 'three';

export function createControls(domElement) {
  const keys = new Set();
  const state = {
    yaw: Math.PI,      // horizontal camera angle around the hero
    pitch: 0.35,       // vertical camera angle
    distance: 7.5,     // camera distance, changed by scrolling
  };

  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Space') e.preventDefault(); // stop the page from scrolling
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  let dragging = false;
  let lastX = 0, lastY = 0;
  domElement.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    domElement.setPointerCapture(e.pointerId);
  });
  domElement.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    state.yaw -= (e.clientX - lastX) * 0.005;
    state.pitch += (e.clientY - lastY) * 0.004;
    state.pitch = Math.min(1.25, Math.max(-0.05, state.pitch));
    lastX = e.clientX;
    lastY = e.clientY;
  });
  domElement.addEventListener('pointerup', () => (dragging = false));
  domElement.addEventListener('wheel', (e) => {
    state.distance = Math.min(16, Math.max(3.5, state.distance + e.deltaY * 0.005));
  }, { passive: true });

  return {
    state,

    isDown: (code) => keys.has(code),

    // Movement direction in world space, relative to where the camera looks.
    moveVector() {
      const dir = new THREE.Vector3();
      if (keys.has('KeyW') || keys.has('ArrowUp')) dir.z -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) dir.z += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) dir.x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) dir.x += 1;
      if (dir.lengthSq() === 0) return dir;
      dir.normalize();
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
      return dir;
    },

    wantsSprint: () => keys.has('ShiftLeft') || keys.has('ShiftRight'),
    wantsJump: () => keys.has('Space'),
  };
}
