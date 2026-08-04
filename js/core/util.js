// Small math + helper toolbox used everywhere.
export const TILE = 64;

export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const dist2 = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; };
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const chance = p => Math.random() < p;

// Deterministic RNG (mulberry32) for stable zone layouts.
export function seededRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// 2D value noise on a seeded lattice — cheap, good enough for terrain blends.
export function makeNoise(seed) {
  const rng = seededRng(seed);
  const perm = new Uint8Array(512);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
  const grad = (h, x, y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
  const fade = t => t * t * (3 - 2 * t);
  return function noise(x, y) {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = perm[perm[xi] + yi], ab = perm[perm[xi] + yi + 1];
    const ba = perm[perm[xi + 1] + yi], bb = perm[perm[xi + 1] + yi + 1];
    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return lerp(x1, x2, v) * 0.7071 + 0.5; // → ~[0,1]
  };
}

export function fbm(noise, x, y, oct = 3) {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += noise(x * f, y * f) * amp; amp *= 0.5; f *= 2; }
  return v / (1 - Math.pow(0.5, oct));
}

// Color helpers — painters lean on these hard.
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbStr(r, g, b, a = 1) { return `rgba(${r | 0},${g | 0},${b | 0},${a})`; }
export function shade(hex, f, a = 1) { // f: -1 (black) .. 0 (same) .. 1 (white)
  const [r, g, b] = hexToRgb(hex);
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  return rgbStr(lerp(r, t, p), lerp(g, t, p), lerp(b, t, p), a);
}
export function mix(hexA, hexB, t, a = 1) {
  const A = hexToRgb(hexA), B = hexToRgb(hexB);
  return rgbStr(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t), a);
}

export function fmt(n) { // 12345 → 12,345
  return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
export function fmtTime(s) {
  s = Math.ceil(s);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

export const DIRS = { down: 0, left: 1, right: 2, up: 3 };
export function dirFrom(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 1 : 2;
  return dy < 0 ? 3 : 0;
}

export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
export const $ = sel => document.querySelector(sel);
export const $$ = sel => [...document.querySelectorAll(sel)];
