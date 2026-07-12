// touch.js — on-screen controls for phones and tablets: a movement
// joystick on the left, and attack / charge / dash / jump buttons on the
// right. Only activates on touch devices (or with ?touch=1 for testing).

export function initTouch({ controls, onDash, onCharge, onSlash, chargeCooldownFrac, slashCooldownFrac }) {
  const isTouchDevice =
    window.matchMedia('(pointer: coarse)').matches ||
    'ontouchstart' in window ||
    new URLSearchParams(location.search).has('touch');
  if (!isTouchDevice) return null;

  document.body.classList.add('touch');
  controls.touch.uiActive = true;

  // --- joystick -------------------------------------------------------------

  const base = document.getElementById('joystick');
  const stick = document.getElementById('joy-stick');
  const RADIUS = 46; // how far the stick can travel, in px
  let joyPointer = null;

  function setStick(dx, dy) {
    stick.style.transform = `translate(${dx}px, ${dy}px)`;
    controls.touch.x = dx / RADIUS;
    controls.touch.z = dy / RADIUS;
  }

  base.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    joyPointer = e.pointerId;
    try { base.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
  });
  base.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyPointer) return;
    const r = base.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    setStick(dx, dy);
  });
  const joyEnd = (e) => {
    if (e.pointerId !== joyPointer) return;
    joyPointer = null;
    setStick(0, 0);
  };
  base.addEventListener('pointerup', joyEnd);
  base.addEventListener('pointercancel', joyEnd);

  // --- buttons --------------------------------------------------------------

  function bind(id, onDown, onUp) {
    const el = document.getElementById(id);
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      el.classList.add('pressed');
      onDown();
    });
    const release = (e) => {
      e.stopPropagation();
      el.classList.remove('pressed');
      if (onUp) onUp();
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    return el;
  }

  bind('btn-attack', () => controls.queueAttack());
  bind('btn-jump', () => (controls.touch.jumpHeld = true), () => (controls.touch.jumpHeld = false));
  bind('btn-dash', onDash);
  const chargeCd = bind('btn-charge', onCharge).querySelector('.btn-cd');
  const slashCd = bind('btn-slash', onSlash).querySelector('.btn-cd');

  // called from the game loop: keeps the buttons' cooldown shades in sync
  function update() {
    chargeCd.style.height = `${chargeCooldownFrac() * 100}%`;
    slashCd.style.height = `${slashCooldownFrac() * 100}%`;
  }

  return { update };
}
