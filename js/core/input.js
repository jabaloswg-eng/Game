// Touch + keyboard input: floating joystick, tap-to-target, WASD fallback.
import { G } from './state.js';
import { $, clamp } from './util.js';

export const input = {
  moveX: 0, moveY: 0,          // -1..1 movement intent
  tap: null,                    // world-space tap this frame {x,y} (consumed by main)
  keys: new Set(),
};

let joyActive = false, joyId = null, joyCX = 0, joyCY = 0;
const JOY_R = 52;

export function initInput() {
  const joyZone = $('#joy');
  const base = $('#joy-base');
  const knob = $('#joy-knob');

  joyZone.addEventListener('pointerdown', e => {
    if (joyActive) return;
    joyActive = true; joyId = e.pointerId;
    joyCX = e.clientX; joyCY = e.clientY;
    base.style.display = 'block';
    base.style.left = (joyCX - 62) + 'px';
    base.style.top = (joyCY - 62) + 'px';
    knob.style.transform = 'translate(-50%,-50%)';
    joyZone.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  joyZone.addEventListener('pointermove', e => {
    if (!joyActive || e.pointerId !== joyId) return;
    let dx = e.clientX - joyCX, dy = e.clientY - joyCY;
    const d = Math.hypot(dx, dy);
    if (d > JOY_R) { dx = dx / d * JOY_R; dy = dy / d * JOY_R; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const dead = 8;
    if (d < dead) { input.moveX = 0; input.moveY = 0; }
    else { input.moveX = clamp(dx / JOY_R, -1, 1); input.moveY = clamp(dy / JOY_R, -1, 1); }
    e.preventDefault();
  });
  const joyEnd = e => {
    if (e.pointerId !== joyId) return;
    joyActive = false; joyId = null;
    input.moveX = 0; input.moveY = 0;
    base.style.display = 'none';
  };
  joyZone.addEventListener('pointerup', joyEnd);
  joyZone.addEventListener('pointercancel', joyEnd);

  // Tap targeting on the canvas (right side / anywhere not joystick).
  G.canvas.addEventListener('pointerdown', e => {
    const wx = e.clientX / G.zoom + G.cam.x;
    const wy = e.clientY / G.zoom + G.cam.y;
    input.tap = { x: wx, y: wy };
  });

  // Keyboard (desktop testing)
  window.addEventListener('keydown', e => {
    input.keys.add(e.key.toLowerCase());
    if (e.key === ' ') e.preventDefault();
  });
  window.addEventListener('keyup', e => input.keys.delete(e.key.toLowerCase()));
}

export function keyboardMove() {
  let kx = 0, ky = 0;
  const k = input.keys;
  if (k.has('w') || k.has('arrowup')) ky -= 1;
  if (k.has('s') || k.has('arrowdown')) ky += 1;
  if (k.has('a') || k.has('arrowleft')) kx -= 1;
  if (k.has('d') || k.has('arrowright')) kx += 1;
  if (kx || ky) { const d = Math.hypot(kx, ky); return [kx / d, ky / d]; }
  return null;
}
