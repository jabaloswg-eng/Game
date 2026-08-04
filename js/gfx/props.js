// World props: trees, rocks, buildings, lanterns… drawn depth-sorted with entities.
import { shade, mix, seededRng } from '../core/util.js';
import { drawShadow, glowColor } from './sprites.js';

const TAU = Math.PI * 2;

function glow(ctx, x, y, r, hex, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, glowColor(hex).replace('ALPHA', a));
  g.addColorStop(1, glowColor(hex).replace('ALPHA', 0));
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
}

export function drawProp(ctx, p, t, night) {
  const fns = {
    oak, birch, pine, snowpine, cactus, pillar,
    flower, bush, rock, stump, mushroom, bones, deadbush, icecrystal, crystal, candle,
    building, fountain, lantern,
  };
  const fn = fns[p.kind];
  if (fn) { ctx.save(); ctx.translate(p.x, p.y); fn(ctx, p, t, night); ctx.restore(); }
}

function sway(t, seed) { return Math.sin(t * 1.3 + seed) * 2; }

function canopy(ctx, blobs, base, hi, sw) {
  for (const [bx, by, br] of blobs) {
    const g = ctx.createRadialGradient(bx + sw - br * 0.35, by - br * 0.4, br * 0.15, bx + sw, by, br * 1.1);
    g.addColorStop(0, hi); g.addColorStop(0.65, base); g.addColorStop(1, shade(base, -0.45));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(bx + sw, by, br, 0, TAU); ctx.fill();
  }
}

function trunk(ctx, w, h, c = '#6a4a2c') {
  const g = ctx.createLinearGradient(-w, 0, w, 0);
  g.addColorStop(0, shade(c, 0.15)); g.addColorStop(0.5, c); g.addColorStop(1, shade(c, -0.4));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-w, 0); ctx.quadraticCurveTo(-w * 0.55, -h * 0.5, -w * 0.5, -h);
  ctx.lineTo(w * 0.5, -h); ctx.quadraticCurveTo(w * 0.55, -h * 0.5, w, 0);
  ctx.closePath(); ctx.fill();
}

function oak(ctx, p, t) {
  const s = p.s; ctx.scale(s, s);
  drawShadow(ctx, 0, 0, 30, 0.28);
  trunk(ctx, 7, 34);
  const sw = sway(t, p.seed);
  canopy(ctx, [[-14, -46, 17], [12, -48, 16], [0, -60, 19], [-2, -40, 14]], '#4e8a3c', '#7ab55c', sw);
}
function birch(ctx, p, t) {
  const s = p.s * 0.9; ctx.scale(s, s);
  drawShadow(ctx, 0, 0, 24, 0.24);
  trunk(ctx, 5, 40, '#d8d4c8');
  ctx.fillStyle = 'rgba(40,36,30,0.8)';
  for (const [mx, my] of [[-2, -12], [2, -24], [-1, -33]]) { ctx.beginPath();
    ctx.ellipse(mx, my, 2.6, 1.2, 0.3, 0, TAU); ctx.fill(); }
  const sw = sway(t, p.seed);
  canopy(ctx, [[-10, -52, 13], [10, -54, 12], [0, -63, 14]], '#8ab84e', '#b8d878', sw);
}
function pine(ctx, p, t) {
  const s = p.s; ctx.scale(s, s);
  drawShadow(ctx, 0, 0, 26, 0.3);
  trunk(ctx, 5.5, 22, '#54381e');
  const sw = sway(t, p.seed) * 0.5;
  for (let i = 0; i < 3; i++) {
    const w = 26 - i * 6.5, y = -20 - i * 16;
    const g = ctx.createLinearGradient(-w, y, w, y);
    g.addColorStop(0, '#2c5a30'); g.addColorStop(0.45, '#3f7a44'); g.addColorStop(1, '#1e4022');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-w + sw * i * 0.3, y);
    ctx.lineTo(sw * (i + 1) * 0.5, y - 26); ctx.lineTo(w + sw * i * 0.3, y);
    ctx.closePath(); ctx.fill();
  }
}
function snowpine(ctx, p, t) {
  pine(ctx, p, t);
  const s = 1;
  for (let i = 0; i < 3; i++) {
    const w = 24 - i * 6.5, y = -22 - i * 16;
    ctx.fillStyle = 'rgba(240,248,255,0.85)';
    ctx.beginPath(); ctx.moveTo(-w * 0.8, y - 2);
    ctx.quadraticCurveTo(0, y - 10 - i * 2, w * 0.8, y - 2);
    ctx.quadraticCurveTo(0, y - 5, -w * 0.8, y - 2);
    ctx.closePath(); ctx.fill();
  }
}
function cactus(ctx, p) {
  const s = p.s; ctx.scale(s, s);
  drawShadow(ctx, 0, 0, 18, 0.24);
  const c = '#4f8a52';
  const g = ctx.createLinearGradient(-8, 0, 8, 0);
  g.addColorStop(0, shade(c, 0.2)); g.addColorStop(0.6, c); g.addColorStop(1, shade(c, -0.35));
  ctx.strokeStyle = g; ctx.lineWidth = 13; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -44); ctx.stroke();
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(-2, -26); ctx.quadraticCurveTo(-16, -28, -16, -42); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, -18); ctx.quadraticCurveTo(15, -20, 15, -32); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,240,0.5)'; ctx.lineWidth = 1;
  for (const lx of [-3, 0, 3]) { ctx.beginPath(); ctx.moveTo(lx, -6); ctx.lineTo(lx, -40); ctx.stroke(); }
}
function pillar(ctx, p) {
  const s = p.s; ctx.scale(s, s);
  drawShadow(ctx, 0, 0, 22, 0.35);
  const g = ctx.createLinearGradient(-10, 0, 10, 0);
  g.addColorStop(0, '#6a6280'); g.addColorStop(0.5, '#544c68'); g.addColorStop(1, '#38324a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-10, 0); ctx.lineTo(-7, -52); ctx.lineTo(7, -55) ; ctx.lineTo(10, 0);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6a6280';
  ctx.beginPath(); ctx.ellipse(0, -53, 9, 4, -0.06, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(10,6,20,0.5)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(-3, -46); ctx.moveTo(4, -10); ctx.lineTo(3, -44); ctx.stroke();
}

function flower(ctx, p, t) {
  const r = seededRng(Math.floor(p.seed * 999) + 3);
  for (let i = 0; i < 3; i++) {
    const fx = -10 + r() * 20, fy = -r() * 6;
    const hue = ['#e8788a', '#e8c84a', '#9a7ae8', '#f0f0e8'][Math.floor(r() * 4)];
    ctx.strokeStyle = '#3f7a38'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + 1, fy - 5, fx, fy - 9); ctx.stroke();
    for (let pt = 0; pt < 5; pt++) {
      const a = (pt / 5) * TAU + t * 0.3;
      ctx.fillStyle = hue;
      ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * 3, fy - 9 + Math.sin(a) * 3, 2.4, 1.4, a, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#e8a84a'; ctx.beginPath(); ctx.arc(fx, fy - 9, 1.8, 0, TAU); ctx.fill();
  }
}
function bush(ctx, p, t) {
  const s = p.s; ctx.scale(s, s);
  drawShadow(ctx, 0, 0, 16, 0.2);
  canopy(ctx, [[-7, -8, 9], [7, -8, 8], [0, -13, 9]], '#4e8a3c', '#78b055', sway(t, p.seed) * 0.4);
}
function rock(ctx, p) {
  const s = p.s; ctx.scale(s, s);
  drawShadow(ctx, 0, 0, 16, 0.25);
  const g = ctx.createLinearGradient(-12, -16, 10, 0);
  g.addColorStop(0, '#a8a4b0'); g.addColorStop(0.6, '#7c7888'); g.addColorStop(1, '#524e5e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-13, 0); ctx.lineTo(-10, -10); ctx.lineTo(-2, -15); ctx.lineTo(9, -11); ctx.lineTo(13, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-9, -9); ctx.lineTo(-2, -13); ctx.stroke();
}
function stump(ctx, p) {
  const s = p.s; ctx.scale(s, s);
  drawShadow(ctx, 0, 0, 13, 0.22);
  trunk(ctx, 8, 12);
  ctx.fillStyle = '#c8a878';
  ctx.beginPath(); ctx.ellipse(0, -12, 7.4, 3.4, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(90,60,30,0.7)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, -12, 4.4, 2, 0, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -12, 2, 0.9, 0, 0, TAU); ctx.stroke();
}
function mushroom(ctx, p) {
  const s = p.s * 0.7; ctx.scale(s, s);
  for (const [mx, cap] of [[-6, '#c85a4a'], [5, '#d8a04a']]) {
    ctx.fillStyle = '#e8dcc8'; ctx.fillRect(mx - 2, -8, 4, 8);
    ctx.fillStyle = cap;
    ctx.beginPath(); ctx.ellipse(mx, -8, 7, 4.4, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,248,235,.8)';
    ctx.beginPath(); ctx.arc(mx - 2, -10, 1.3, 0, TAU); ctx.fill();
  }
}
function bones(ctx, p) {
  const s = p.s * 0.8; ctx.scale(s, s); ctx.rotate(p.seed % 1 - 0.5);
  ctx.strokeStyle = '#ded6c0'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(8, -8); ctx.stroke();
  for (const e of [[-10, -4], [8, -8]]) {
    ctx.fillStyle = '#ded6c0';
    ctx.beginPath(); ctx.arc(e[0] - 2, e[1] - 2, 2.6, 0, TAU); ctx.arc(e[0] + 2, e[1] + 2, 2.6, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#cfc7b0';
  ctx.beginPath(); ctx.arc(4, -2, 5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2c2418';
  ctx.beginPath(); ctx.arc(2.6, -3, 1.4, 0, TAU); ctx.arc(6.4, -3, 1.4, 0, TAU); ctx.fill();
}
function deadbush(ctx, p) {
  const s = p.s; ctx.scale(s, s);
  ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  const r = seededRng(Math.floor(p.seed * 999) + 5);
  for (let b = 0; b < 5; b++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 1.6;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(Math.cos(a) * 8, Math.sin(a) * 10, Math.cos(a) * 14, Math.sin(a) * 16);
    ctx.stroke();
  }
}
function icecrystal(ctx, p, t) {
  const s = p.s; ctx.scale(s, s);
  drawShadow(ctx, 0, 0, 12, 0.2);
  glow(ctx, 0, -12, 22, '#a8e0ff', 0.3);
  for (const [ox, h, w] of [[-6, 16, 5], [3, 24, 6], [9, 12, 4]]) {
    const g = ctx.createLinearGradient(ox - w, 0, ox + w, 0);
    g.addColorStop(0, 'rgba(220,242,255,0.95)'); g.addColorStop(0.5, 'rgba(150,205,240,0.9)');
    g.addColorStop(1, 'rgba(100,160,210,0.85)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(ox - w, 0); ctx.lineTo(ox, -h); ctx.lineTo(ox + w, 0);
    ctx.closePath(); ctx.fill();
  }
}
function crystal(ctx, p, t) {
  const s = p.s; ctx.scale(s, s);
  glow(ctx, 0, -12, 26, '#b08fff', 0.4 + Math.sin(t * 2 + p.seed) * 0.1);
  for (const [ox, h, w] of [[-5, 18, 5], [4, 26, 6], [10, 13, 4]]) {
    const g = ctx.createLinearGradient(ox - w, 0, ox + w, 0);
    g.addColorStop(0, 'rgba(220,190,255,0.95)'); g.addColorStop(0.5, 'rgba(160,120,240,0.9)');
    g.addColorStop(1, 'rgba(110,70,190,0.85)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(ox - w, 0); ctx.lineTo(ox, -h); ctx.lineTo(ox + w, 0);
    ctx.closePath(); ctx.fill();
  }
}
function candle(ctx, p, t) {
  ctx.fillStyle = '#e8e0c8';
  ctx.fillRect(-2.4, -10, 4.8, 10);
  const fl = 0.8 + Math.sin(t * 9 + p.seed * 6) * 0.25;
  glow(ctx, 0, -13, 16 * fl, '#ffb56a', 0.6);
  ctx.fillStyle = '#ffd88a';
  ctx.beginPath(); ctx.ellipse(0, -12.5, 1.8, 3.4 * fl, 0, 0, TAU); ctx.fill();
}

function building(ctx, p, t, night) {
  const w = p.bw, h = p.bh, roof = p.roof || '#a85838';
  drawShadow(ctx, 0, 2, w * 0.55, 0.3);
  // walls
  const wallH = h * 0.62;
  const wg = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  wg.addColorStop(0, '#d8cdb4'); wg.addColorStop(0.5, '#c4b89e'); wg.addColorStop(1, '#a89c84');
  ctx.fillStyle = wg;
  ctx.fillRect(-w / 2, -wallH, w, wallH);
  // timber frame
  ctx.strokeStyle = '#6a4a2c'; ctx.lineWidth = 4;
  ctx.strokeRect(-w / 2 + 2, -wallH + 2, w - 4, wallH - 4);
  ctx.beginPath();
  ctx.moveTo(-w / 4, -wallH); ctx.lineTo(-w / 4, 0);
  ctx.moveTo(w / 4, -wallH); ctx.lineTo(w / 4, 0);
  ctx.stroke();
  // door
  ctx.fillStyle = '#54381e';
  const dw = 26, dh = 38;
  ctx.beginPath();
  ctx.moveTo(-dw / 2, 0); ctx.lineTo(-dw / 2, -dh + 10);
  ctx.quadraticCurveTo(0, -dh - 8, dw / 2, -dh + 10); ctx.lineTo(dw / 2, 0);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e8c268'; ctx.beginPath(); ctx.arc(dw / 2 - 7, -16, 2.2, 0, TAU); ctx.fill();
  // windows (lit at night)
  for (const sx of [-1, 1]) {
    const wx = sx * w * 0.34;
    ctx.fillStyle = night ? '#ffd88a' : '#4a5a78';
    ctx.fillRect(wx - 9, -wallH + 12, 18, 16);
    if (night) glow(ctx, wx, -wallH + 20, 26, '#ffb56a', 0.35);
    ctx.strokeStyle = '#6a4a2c'; ctx.lineWidth = 2.4;
    ctx.strokeRect(wx - 9, -wallH + 12, 18, 16);
    ctx.beginPath(); ctx.moveTo(wx, -wallH + 12); ctx.lineTo(wx, -wallH + 28); ctx.stroke();
  }
  // roof
  const rg = ctx.createLinearGradient(0, -wallH - h * 0.55, 0, -wallH);
  rg.addColorStop(0, shade(roof, 0.25)); rg.addColorStop(1, shade(roof, -0.3));
  ctx.fillStyle = rg;
  if (p.sub === 'tower') {
    ctx.fillRect(-w / 2 - 4, -wallH - 8, w + 8, 8);
    ctx.beginPath(); ctx.moveTo(-w / 2 - 2, -wallH - 8);
    ctx.lineTo(0, -wallH - h * 0.9); ctx.lineTo(w / 2 + 2, -wallH - 8);
    ctx.closePath(); ctx.fill();
  } else if (p.sub === 'tent') {
    ctx.beginPath(); ctx.moveTo(-w / 2 - 8, 0); ctx.quadraticCurveTo(-w / 2, -wallH - 14, 0, -wallH - h * 0.5);
    ctx.quadraticCurveTo(w / 2, -wallH - 14, w / 2 + 8, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade(roof, 0.4); ctx.lineWidth = 2.4;
    for (const sx of [-0.5, 0, 0.5]) { ctx.beginPath();
      ctx.moveTo(sx * w, 0); ctx.quadraticCurveTo(sx * w * 0.7, -wallH, 0, -wallH - h * 0.5); ctx.stroke(); }
  } else {
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 10, -wallH + 4);
    ctx.lineTo(0, -wallH - h * 0.55);
    ctx.lineTo(w / 2 + 10, -wallH + 4);
    ctx.lineTo(w / 2 - 2, -wallH - 2);
    ctx.lineTo(0, -wallH - h * 0.42);
    ctx.lineTo(-w / 2 + 2, -wallH - 2);
    ctx.closePath(); ctx.fill();
    // ridge highlight
    ctx.strokeStyle = 'rgba(255,244,214,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-w / 2 - 8, -wallH + 3); ctx.lineTo(0, -wallH - h * 0.53); ctx.stroke();
  }
  if (p.sub === 'forge') { // chimney smoke
    ctx.fillStyle = '#54506a'; ctx.fillRect(w * 0.22, -wallH - h * 0.5, 14, h * 0.3);
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.5 + i * 0.33) % 1;
      ctx.fillStyle = `rgba(200,200,210,${0.25 * (1 - ph)})`;
      ctx.beginPath(); ctx.arc(w * 0.22 + 7 + Math.sin(ph * 5) * 5, -wallH - h * 0.5 - ph * 34, 6 + ph * 8, 0, TAU);
      ctx.fill();
    }
  }
}
function fountain(ctx, p, t) {
  drawShadow(ctx, 0, 2, 44, 0.25);
  ctx.fillStyle = '#8a8296';
  ctx.beginPath(); ctx.ellipse(0, 0, 44, 20, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#6a6280';
  ctx.beginPath(); ctx.ellipse(0, -4, 38, 16, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#3f7fae';
  ctx.beginPath(); ctx.ellipse(0, -4, 33, 13, 0, 0, TAU); ctx.fill();
  // shimmer
  ctx.strokeStyle = 'rgba(235,246,255,0.6)'; ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    const a = t * 1.2 + i * 2.1;
    ctx.beginPath(); ctx.ellipse(Math.sin(a) * 12, -4 + Math.cos(a) * 4, 6, 2.4, 0, 0, TAU); ctx.stroke();
  }
  // center spire + spray
  ctx.fillStyle = '#8a8296';
  ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-3, -34); ctx.lineTo(3, -34); ctx.lineTo(6, -4); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.9 + i / 6) % 1;
    const a = i * (TAU / 6);
    ctx.fillStyle = `rgba(180,225,255,${0.7 * (1 - ph)})`;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * ph * 22, -34 + ph * 26 - Math.sin(ph * Math.PI) * 18, 2.4, 0, TAU);
    ctx.fill();
  }
  glow(ctx, 0, -20, 30, '#a8d8ff', 0.15);
}
function lantern(ctx, p, t, night) {
  drawShadow(ctx, 0, 0, 8, 0.2);
  ctx.strokeStyle = '#3a3444'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -46); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -46); ctx.quadraticCurveTo(10, -46, 12, -40); ctx.stroke();
  // lamp box
  ctx.fillStyle = '#2c2836';
  ctx.fillRect(8, -42, 9, 12);
  const on = night === undefined ? true : night;
  ctx.fillStyle = on ? '#ffd88a' : '#8a95a8';
  ctx.fillRect(9.5, -40.5, 6, 9);
  if (on) glow(ctx, 12.5, -36, 34, '#ffb56a', 0.5 + Math.sin(t * 5 + p.seed) * 0.06);
}
