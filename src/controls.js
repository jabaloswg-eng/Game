// controls.js — keyboard, mouse and touch input, and the third-person
// orbit camera. Touch input (from touch.js) feeds the same movement
// interface the keyboard uses.

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

  // touch state, driven by the on-screen joystick and buttons (touch.js)
  const touch = { x: 0, z: 0, jumpHeld: false, uiActive: false };

  // A quick click (no real mouse movement) is an attack; a drag with the
  // button held moves the camera. Each drag follows only the pointer that
  // started it, so a second finger (on the joystick) can't fight it.
  let dragPointer = null;
  let lastX = 0, lastY = 0;
  let downX = 0, downY = 0, downTime = 0;
  let attackQueued = false;
  let dashQueued = false;

  domElement.addEventListener('pointerdown', (e) => {
    if (dragPointer !== null) return;
    dragPointer = e.pointerId;
    lastX = downX = e.clientX;
    lastY = downY = e.clientY;
    downTime = performance.now();
    try { domElement.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
  });
  domElement.addEventListener('pointermove', (e) => {
    if (e.pointerId !== dragPointer) return;
    state.yaw -= (e.clientX - lastX) * 0.005;
    state.pitch += (e.clientY - lastY) * 0.004;
    state.pitch = Math.min(1.25, Math.max(-0.45, state.pitch));
    lastX = e.clientX;
    lastY = e.clientY;
  });
  const endDrag = (e) => {
    if (e.pointerId !== dragPointer) return;
    dragPointer = null;
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    // tap-to-attack is desktop-only: with the touch UI, attacking has its
    // own button and stray camera taps shouldn't swing the sword
    if (!touch.uiActive && moved < 6 && performance.now() - downTime < 350) {
      attackQueued = true;
    }
  };
  domElement.addEventListener('pointerup', endDrag);
  domElement.addEventListener('pointercancel', endDrag);
  domElement.addEventListener('wheel', (e) => {
    state.distance = Math.min(16, Math.max(3.5, state.distance + e.deltaY * 0.005));
  }, { passive: true });

  const up = new THREE.Vector3(0, 1, 0);

  return {
    state,
    touch,

    isDown: (code) => keys.has(code),

    // Movement direction in world space, relative to where the camera looks.
    moveVector() {
      const dir = new THREE.Vector3();
      if (keys.has('KeyW') || keys.has('ArrowUp')) dir.z -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) dir.z += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) dir.x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) dir.x += 1;
      if (dir.lengthSq() > 0) dir.normalize();

      // joystick: x = right, z = down on the pad = backward in the world
      if (Math.hypot(touch.x, touch.z) > 0.12) {
        dir.set(touch.x, 0, touch.z);
        if (dir.lengthSq() > 1) dir.normalize();
      }

      if (dir.lengthSq() === 0) return dir;
      dir.applyAxisAngle(up, state.yaw);
      return dir;
    },

    // pushing the joystick all the way sprints, like holding Shift
    wantsSprint: () =>
      keys.has('ShiftLeft') || keys.has('ShiftRight') || Math.hypot(touch.x, touch.z) > 0.93,
    wantsJump: () => keys.has('Space') || touch.jumpHeld,

    queueAttack() { attackQueued = true; },
    queueDash() { dashQueued = true; },

    // returns true once per queued click/tap ("J" works as a keyboard fallback)
    consumeAttack() {
      const a = attackQueued || keys.has('KeyJ');
      attackQueued = false;
      if (keys.has('KeyJ')) keys.delete('KeyJ');
      return a;
    },

    // dash trigger: touch button or the E key
    consumeDash() {
      const d = dashQueued || keys.has('KeyE');
      dashQueued = false;
      if (keys.has('KeyE')) keys.delete('KeyE');
      return d;
    },
  };
}
