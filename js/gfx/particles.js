// Particle system + floating combat text + screen shake.
import { G } from '../core/state.js';
import { rand, pick } from '../core/util.js';
import { glowColor } from './sprites.js';

const TAU = Math.PI * 2;
const parts = [];
const texts = [];
let shakeAmt = 0;

export function shake(power = 6) {
  if (G.settings.shake) shakeAmt = Math.max(shakeAmt, power);
}
export function getShake() {
  if (shakeAmt <= 0.2) return [0, 0];
  return [rand(-shakeAmt, shakeAmt), rand(-shakeAmt, shakeAmt)];
}

export function spawn(opts) {
  // {x,y,vx,vy,life,size,color,glow,gravity,drag,shrink,add}
  parts.push({
    x: opts.x, y: opts.y, vx: opts.vx || 0, vy: opts.vy || 0,
    life: opts.life || 0.6, max: opts.life || 0.6,
    size: opts.size || 4, color: opts.color || '#ffffff',
    glow: opts.glow || false, gravity: opts.gravity || 0,
    drag: opts.drag ?? 0.9, shrink: opts.shrink ?? true, add: opts.add ?? true,
  });
}

export function burst(x, y, color, n = 10, speed = 120, opts = {}) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(speed * 0.3, speed);
    spawn({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.up || 0),
      life: rand(0.3, opts.life || 0.7), size: rand(2, opts.size || 5),
      color, glow: opts.glow ?? true, gravity: opts.gravity ?? 140, ...opts });
  }
}

export function slashArc(x, y, angle, color = '#ffe9c8', r = 44) {
  for (let i = 0; i < 12; i++) {
    const a = angle + rand(-0.7, 0.7);
    spawn({ x: x + Math.cos(a) * r * rand(0.5, 1), y: y + Math.sin(a) * r * rand(0.5, 1),
      vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: rand(0.15, 0.3),
      size: rand(2, 5), color, glow: true, gravity: 0 });
  }
}

export function healBurst(x, y) {
  for (let i = 0; i < 14; i++) {
    spawn({ x: x + rand(-20, 20), y: y - rand(0, 30), vx: rand(-12, 12), vy: rand(-70, -30),
      life: rand(0.5, 1), size: rand(2, 4.5), color: pick(['#a8ffb8', '#e0ffe8', '#78e890']),
      glow: true, gravity: -30 });
  }
}

export function levelUpFx(x, y) {
  for (let i = 0; i < 30; i++) {
    const a = rand(0, TAU);
    spawn({ x, y: y - 20, vx: Math.cos(a) * rand(30, 160), vy: Math.sin(a) * rand(30, 160) - 60,
      life: rand(0.6, 1.3), size: rand(2.5, 6), color: pick(['#ffd77a', '#fff2c8', '#e8c268']),
      glow: true, gravity: 60 });
  }
  ringFx(x, y - 20, '#ffd77a', 90);
}
export function ringFx(x, y, color, r = 70) {
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU;
    spawn({ x: x + Math.cos(a) * 12, y: y + Math.sin(a) * 6, vx: Math.cos(a) * r * 1.6,
      vy: Math.sin(a) * r * 0.9, life: 0.5, size: 3.4, color, glow: true, gravity: 0, drag: 0.86 });
  }
}

export function floatText(x, y, str, opts = {}) {
  if (!G.settings.showDmg && opts.kind === 'dmg') return;
  texts.push({ x: x + rand(-8, 8), y, str, life: opts.life || 1.0, max: opts.life || 1.0,
    color: opts.color || '#ffffff', size: opts.size || 15, crit: opts.crit,
    vy: opts.vy ?? -46, vx: rand(-6, 6) });
}

export function update(dt) {
  shakeAmt *= Math.pow(0.0018, dt);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.vy += p.gravity * dt;
    const dr = Math.pow(p.drag, dt * 60);
    p.vx *= dr; p.vy *= dr;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.life -= dt;
    if (t.life <= 0) { texts.splice(i, 1); continue; }
    t.y += t.vy * dt; t.x += t.vx * dt;
    t.vy *= Math.pow(0.4, dt);
  }
}

export function drawParticles(ctx) {
  for (const p of parts) {
    const a = Math.max(0, p.life / p.max);
    const size = p.shrink ? p.size * (0.3 + 0.7 * a) : p.size;
    ctx.save();
    if (p.add) ctx.globalCompositeOperation = 'lighter';
    if (p.glow) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3);
      g.addColorStop(0, glowColor(p.color).replace('ALPHA', 0.5 * a));
      g.addColorStop(1, glowColor(p.color).replace('ALPHA', 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, size * 3, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

// screen-space, called after camera transform reset
export function drawTexts(ctx, camX, camY, zoom) {
  for (const t of texts) {
    const a = Math.min(1, t.life / t.max * 2);
    const sx = (t.x - camX) * zoom, sy = (t.y - camY) * zoom;
    ctx.save();
    ctx.globalAlpha = a;
    const size = t.crit ? t.size * 1.5 : t.size;
    ctx.font = `800 ${size}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = 'rgba(8,6,14,0.85)';
    ctx.strokeText(t.str, sx, sy);
    ctx.fillStyle = t.color;
    ctx.fillText(t.str, sx, sy);
    if (t.crit) {
      ctx.font = `700 ${size * 0.5}px 'Segoe UI', system-ui, sans-serif`;
      ctx.fillStyle = '#ffd77a';
      ctx.fillText('CRIT!', sx, sy - size * 0.9);
    }
    ctx.restore();
  }
}
