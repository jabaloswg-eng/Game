// Procedural sprite painters. Everything is drawn vector-style at device resolution:
// soft gradients, rim light, glow — no bitmaps. Coordinates: (x, y) is the FEET point.
import { shade, mix, rgbStr, clamp } from '../core/util.js';
import { CLASSES } from '../data/classes.js';

const TAU = Math.PI * 2;

export function drawShadow(ctx, x, y, w, a = 0.3) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.4);
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, w);
  g.addColorStop(0, `rgba(8,6,14,${a})`);
  g.addColorStop(1, 'rgba(8,6,14,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, w, 0, TAU); ctx.fill();
  ctx.restore();
}

function capsule(ctx, x1, y1, x2, y2, r, fill) {
  ctx.strokeStyle = fill; ctx.lineWidth = r * 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

function glowSpot(ctx, x, y, r, color, a = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace('ALPHA', a));
  g.addColorStop(1, color.replace('ALPHA', 0));
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.restore();
}
export const glowColor = hex => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},ALPHA)`;
};

/* ============================================================
   HUMANOID — shared base for player, NPCs, bandits, knights.
   o: { dir 0down/1left/2right/3up, t, moving, pose, atk (0..1 swing), scale,
        skin, hair, outfit, trim, cls ('warrior'|'archer'|'mage'|null),
        weaponTier, plus, hood, hat, helmet, armor, cape, eyes }
   ============================================================ */
export function drawHumanoid(ctx, x, y, o) {
  const s = o.scale || 1;
  const t = o.t || 0;
  const side = o.dir === 1 ? -1 : o.dir === 2 ? 1 : 0;
  const back = o.dir === 3;
  const walk = o.moving ? Math.sin(t * 9) : 0;
  const bob = o.moving ? Math.abs(Math.sin(t * 9)) * 2.2 : Math.sin(t * 2) * 0.8;
  const skin = o.skin || '#f2c9a0';
  const hair = o.hair || '#5a3520';
  const outfit = o.outfit || '#555a70';
  const trim = o.trim || '#c9c2b0';

  ctx.save();
  ctx.translate(x, y - bob * s);
  ctx.scale(s, s);
  if (side === -1) ctx.scale(-1, 1); // draw side art facing right, mirror for left
  const S = side !== 0;

  // ---- legs ----
  const legA = walk * 7;
  ctx.save();
  const pants = shade(outfit, -0.45);
  if (S) {
    capsule(ctx, -2, -20, -2 - legA * 0.6, -2, 4.4, pants);
    capsule(ctx, 3, -20, 3 + legA * 0.6, -2, 4.4, shade(outfit, -0.6));
  } else {
    capsule(ctx, -5, -20, -5 - (back ? -legA : legA) * 0.4, -2, 4.6, pants);
    capsule(ctx, 5, -20, 5 + (back ? -legA : legA) * 0.4, -2, 4.6, pants);
  }
  ctx.restore();

  // ---- weapon behind (up-facing or off-hand) ----
  if (o.cls && (back || o.dir === 0)) drawWeaponBack(ctx, o, back);

  // cape (behind torso)
  if (o.cape) {
    ctx.fillStyle = shade(o.cape, -0.25);
    ctx.beginPath();
    ctx.moveTo(-9, -40); ctx.quadraticCurveTo(-13 - walk * 2, -20, -8 + walk, -4);
    ctx.lineTo(8 - walk, -4); ctx.quadraticCurveTo(13 + walk * 2, -20, 9, -40);
    ctx.closePath(); ctx.fill();
  }

  // ---- torso ----
  const tg = ctx.createLinearGradient(-10, -44, 8, -18);
  tg.addColorStop(0, shade(outfit, 0.22));
  tg.addColorStop(0.55, outfit);
  tg.addColorStop(1, shade(outfit, -0.42));
  ctx.fillStyle = tg;
  roundRect(ctx, -9.5, -44, 19, 26, 7); ctx.fill();
  // rim light (key light from upper-left)
  ctx.strokeStyle = 'rgba(255,244,214,0.4)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-8.5, -41); ctx.quadraticCurveTo(-10.5, -30, -8, -20); ctx.stroke();
  // belt + trim
  ctx.fillStyle = shade(trim, -0.15);
  ctx.fillRect(-9.5, -25, 19, 3.4);
  ctx.fillStyle = trim;
  ctx.fillRect(-1.6, -25.6, 4, 4.6);
  if (o.armor) { // chest plate sheen
    const pg = ctx.createLinearGradient(-8, -43, 8, -26);
    pg.addColorStop(0, 'rgba(255,255,255,0.35)'); pg.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    pg.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = pg; roundRect(ctx, -8, -43, 16, 15, 6); ctx.fill();
  }

  // pauldrons (warrior/knight)
  if (o.cls === 'warrior' || o.knight) {
    for (const px of S ? [7] : [-10, 10]) {
      const g2 = ctx.createRadialGradient(px, -42, 1, px, -42, 7);
      g2.addColorStop(0, shade(trim, 0.3)); g2.addColorStop(1, shade(trim, -0.4));
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(px, -41.5, 6.2, 0, TAU); ctx.fill();
    }
  }

  // ---- arms ----
  const armSwing = o.atk ? Math.sin(o.atk * Math.PI) : 0;
  const aY = -38;
  ctx.save();
  const armC = o.armor ? shade(outfit, -0.2) : mix(outfit, skin, o.cls === 'mage' ? 0.1 : 0.35);
  if (S) {
    capsule(ctx, 5, aY, 9 + armSwing * 8, -24 - armSwing * 14, 3.6, armC);
  } else {
    capsule(ctx, -9, aY, -12 - walk * 2, -24, 3.6, armC);
    capsule(ctx, 9, aY, 12 + walk * 2 + armSwing * 5, -24 - armSwing * 12, 3.6, armC);
  }
  ctx.restore();

  // ---- weapon front ----
  if (o.cls && !back && o.dir !== 0 || (o.cls && o.dir === 0 && o.atk)) drawWeaponFront(ctx, o, S, armSwing);

  // ---- head ----
  const hy = -56;
  const hg = ctx.createRadialGradient(-4, hy - 4, 2, 0, hy, 15);
  hg.addColorStop(0, shade(skin, 0.25));
  hg.addColorStop(0.7, skin);
  hg.addColorStop(1, shade(skin, -0.28));
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(0, hy, 13.5, 0, TAU); ctx.fill();

  // face
  if (!back) {
    const ex = S ? 5 : 0;
    const eyeC = o.eyes || '#3a6ea8';
    for (const off of S ? [ex] : [-5, 5]) {
      // eye white
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(off, hy + 2.5, 3.4, 4.4, 0, 0, TAU); ctx.fill();
      // iris
      const ig = ctx.createRadialGradient(off, hy + 2, 0.4, off, hy + 3, 3.4);
      ig.addColorStop(0, shade(eyeC, 0.5)); ig.addColorStop(0.6, eyeC); ig.addColorStop(1, shade(eyeC, -0.55));
      ctx.fillStyle = ig;
      ctx.beginPath(); ctx.ellipse(off + (S ? 0.7 : 0), hy + 3, 2.5, 3.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#141420';
      ctx.beginPath(); ctx.ellipse(off + (S ? 0.7 : 0), hy + 3.2, 1.2, 1.9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath(); ctx.arc(off - 1 + (S ? 0.7 : 0), hy + 1.4, 1.05, 0, TAU); ctx.fill();
      // lash line
      ctx.strokeStyle = 'rgba(30,22,36,0.85)'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(off, hy + 1.2, 3.5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    }
    // mouth
    ctx.strokeStyle = 'rgba(120,60,50,0.8)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(S ? 3 : 0, hy + 8.2, 2, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    // blush
    ctx.fillStyle = 'rgba(240,130,110,0.18)';
    for (const off of S ? [7] : [-8, 8]) { ctx.beginPath(); ctx.arc(off, hy + 6.5, 2.4, 0, TAU); ctx.fill(); }
  }

  // ---- hair / headwear ----
  if (o.helmet) {
    const mg = ctx.createLinearGradient(-12, hy - 14, 10, hy);
    mg.addColorStop(0, shade(trim, 0.35)); mg.addColorStop(0.6, shade(trim, -0.1)); mg.addColorStop(1, shade(trim, -0.5));
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(0, hy - 1.5, 14, Math.PI, 0); ctx.lineTo(14, hy + 3);
    ctx.quadraticCurveTo(0, hy - 2, -14, hy + 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2c1616';
    if (!back) roundRect(ctx, S ? -2 : -9, hy + 0.5, S ? 13 : 18, 3.6, 2), ctx.fill();
    if (o.plume) { ctx.strokeStyle = o.plume; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, hy - 13); ctx.quadraticCurveTo(-6, hy - 22, -12, hy - 18); ctx.stroke(); }
  } else if (o.hood) {
    const hgg = ctx.createLinearGradient(0, hy - 15, 0, hy + 8);
    hgg.addColorStop(0, shade(o.hood, 0.15)); hgg.addColorStop(1, shade(o.hood, -0.4));
    ctx.fillStyle = hgg;
    ctx.beginPath();
    ctx.arc(0, hy - 0.5, 15, Math.PI * 0.92, Math.PI * 0.08);
    ctx.quadraticCurveTo(12, hy + 9, 0, hy + 10);
    ctx.quadraticCurveTo(-12, hy + 9, -14.7, hy + 2);
    ctx.closePath(); ctx.fill();
    if (!back) { ctx.fillStyle = 'rgba(10,8,18,0.5)';
      ctx.beginPath(); ctx.ellipse(S ? 3 : 0, hy + 1, 9, 8, 0, 0, Math.PI, true); ctx.fill(); }
  } else {
    drawHair(ctx, hy, hair, o.dir, S, back);
    if (o.hat === 'wizard') {
      const wg = ctx.createLinearGradient(-14, hy - 30, 10, hy - 6);
      wg.addColorStop(0, shade(outfit, 0.25)); wg.addColorStop(1, shade(outfit, -0.35));
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.ellipse(0, hy - 8, 19, 5.5, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-10, hy - 9);
      ctx.quadraticCurveTo(-4, hy - 26, 7, hy - 30);
      ctx.quadraticCurveTo(4, hy - 20, 9, hy - 10);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = trim; ctx.beginPath(); ctx.arc(7, hy - 30, 2.6, 0, TAU); ctx.fill();
      glowSpot(ctx, 7, hy - 30, 7, glowColor(trim), 0.5);
    }
  }
  ctx.restore();
}

function drawHair(ctx, hy, hair, dir, S, back) {
  const g = ctx.createLinearGradient(-10, hy - 14, 8, hy + 4);
  g.addColorStop(0, shade(hair, 0.3)); g.addColorStop(0.55, hair); g.addColorStop(1, shade(hair, -0.4));
  ctx.fillStyle = g;
  // back mass
  ctx.beginPath(); ctx.arc(0, hy - 2, 14.4, Math.PI * 0.95, Math.PI * 0.05); ctx.closePath(); ctx.fill();
  if (back) { // full back of head + short tail
    ctx.beginPath(); ctx.arc(0, hy, 14, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-6, hy + 9); ctx.quadraticCurveTo(0, hy + 18, 6, hy + 9); ctx.closePath(); ctx.fill();
  } else {
    // bangs: jagged anime fringe
    ctx.beginPath();
    ctx.moveTo(-14, hy - 1);
    const n = 5;
    for (let i = 0; i <= n; i++) {
      const bx = -14 + (28 / n) * i;
      const drop = (i % 2 === 0 ? 6.5 : 2.5) + (S && i > 2 ? 2 : 0);
      ctx.lineTo(bx - 2, hy - 2 + drop);
      ctx.lineTo(bx, hy - 4);
    }
    ctx.lineTo(14, hy - 1);
    ctx.arc(0, hy - 2, 14.2, 0, Math.PI, true);
    ctx.closePath(); ctx.fill();
  }
  // specular streak
  ctx.strokeStyle = 'rgba(255,250,230,0.5)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, hy - 3, 10.5, Math.PI * 1.15, Math.PI * 1.55); ctx.stroke();
}

function weaponColors(tier) {
  const steel = ['#9aa4b5', '#a8b8cf', '#b8cce0', '#c8d8ea', '#ffd77a', '#ff9a6a', '#c0e8ff', '#e0c0ff'];
  return steel[clamp(tier - 1, 0, 7)];
}

function drawWeaponFront(ctx, o, S, swing) {
  const tier = o.weaponTier || 1;
  const plus = o.plus || 0;
  const hx = S ? 10 + swing * 8 : 12 + swing * 5;
  const hy2 = S ? -24 - swing * 14 : -24 - swing * 12;
  ctx.save();
  ctx.translate(hx, hy2);
  const ang = (S ? -0.5 : -0.35) - swing * 2.2;
  ctx.rotate(ang);
  drawWeaponShape(ctx, o.cls, tier, plus, o.t);
  ctx.restore();
}
function drawWeaponBack(ctx, o, back) {
  ctx.save();
  if (o.cls === 'archer') { // quiver
    ctx.translate(back ? 6 : -7, -42); ctx.rotate(0.35);
    ctx.fillStyle = '#6b4a2a'; roundRect(ctx, -3.4, 0, 6.8, 15, 3); ctx.fill();
    ctx.fillStyle = '#d8ecf2';
    for (const fx of [-2, 0.5, 2.6]) { ctx.beginPath(); ctx.arc(fx, -1, 1.6, 0, TAU); ctx.fill(); }
  } else if (back) {
    ctx.translate(o.cls === 'warrior' ? -5 : 5, -40); ctx.rotate(o.cls === 'warrior' ? 0.5 : -0.2);
    drawWeaponShape(ctx, o.cls, o.weaponTier || 1, o.plus || 0, o.t, true);
  }
  ctx.restore();
}
function drawWeaponShape(ctx, cls, tier, plus, t, dim) {
  const c = weaponColors(tier);
  const glow = plus >= 4;
  if (cls === 'warrior' || !cls) {
    const L = 26 + tier * 1.5;
    if (glow) glowSpot(ctx, 0, -L * 0.55, L * 0.8, glowColor('#ffd77a'), 0.12 + plus * 0.03);
    const bg = ctx.createLinearGradient(-2.6, 0, 2.6, 0);
    bg.addColorStop(0, shade(c, -0.35)); bg.addColorStop(0.5, shade(c, 0.45)); bg.addColorStop(1, shade(c, -0.25));
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.moveTo(-2.6, -6); ctx.lineTo(-1.8, -L); ctx.lineTo(0, -L - 5);
    ctx.lineTo(1.8, -L); ctx.lineTo(2.6, -6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, -L - 2); ctx.stroke();
    ctx.fillStyle = '#c79b47'; roundRect(ctx, -6, -6.5, 12, 3, 1.5); ctx.fill();
    ctx.fillStyle = '#6b4a2a'; roundRect(ctx, -1.6, -4, 3.2, 9, 1.6); ctx.fill();
    ctx.fillStyle = '#e8c268'; ctx.beginPath(); ctx.arc(0, 5.6, 2.2, 0, TAU); ctx.fill();
  } else if (cls === 'archer') {
    const L = 20 + tier;
    ctx.strokeStyle = shade('#8a6134', dim ? -0.2 : 0.1); ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-3, -8, L, -0.55 * Math.PI, 0.45 * Math.PI); ctx.stroke();
    ctx.strokeStyle = shade(c, 0.3); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-3, -8, L, -0.55 * Math.PI, -0.2 * Math.PI); ctx.stroke();
    const ax = -3 + Math.cos(-0.55 * Math.PI) * L, ay = -8 + Math.sin(-0.55 * Math.PI) * L;
    const bx2 = -3 + Math.cos(0.45 * Math.PI) * L, by2 = -8 + Math.sin(0.45 * Math.PI) * L;
    ctx.strokeStyle = 'rgba(240,240,255,0.7)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx2, by2); ctx.stroke();
    if (glow) glowSpot(ctx, -3, -8, L, glowColor('#cfe8a0'), 0.1 + plus * 0.02);
  } else { // staff
    const L = 34 + tier;
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, -L); ctx.stroke();
    const orb = ['#8fd8ff', '#8fd8ff', '#9f8fff', '#9f8fff', '#ffd77a', '#ff9a6a', '#a0ffd8', '#ff8fd8'][clamp(tier - 1, 0, 7)];
    const pulse = 0.8 + Math.sin((t || 0) * 4) * 0.2;
    glowSpot(ctx, 0, -L - 3, 10 * pulse + plus, glowColor(orb), 0.5);
    const og = ctx.createRadialGradient(-1, -L - 4, 0.5, 0, -L - 3, 4.5);
    og.addColorStop(0, '#ffffff'); og.addColorStop(0.4, orb); og.addColorStop(1, shade(orb, -0.4));
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(0, -L - 3, 4.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c79b47'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, -L - 3, 6, 0.3, Math.PI - 0.3); ctx.stroke();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Costume look overrides (Platinum cosmetics).
const COSTUMES = {
  cos_duelist: { outfit: '#8a1f3a', trim: '#ffd77a', cape: '#5a1028' },
  cos_scholar: { outfit: '#1f3a6a', trim: '#8fd8ff', hat: 'wizard' },
  cos_ranger: { outfit: '#2a5a3a', trim: '#cfe8a0', hood: '#1d4029' },
  cos_shadow: { outfit: '#23233a', trim: '#8a7fd8', hood: '#191926', cape: '#141420' },
};

export function drawPlayerChar(ctx, x, y, p, opts = {}) {
  const cls = CLASSES[p.cls];
  const wt = p.equip?.weapon ? Math.min(8, Math.ceil((itemLvl(p.equip.weapon) + 4) / 5)) : 1;
  const o = {
    dir: opts.dir ?? p.dir, t: opts.t ?? 0, moving: opts.moving, atk: opts.atk || 0,
    scale: opts.scale || 1, cls: p.cls,
    skin: '#f2c9a0', hair: p.hair || cls.look.hairDefault,
    outfit: cls.look.outfit, trim: cls.look.trim,
    weaponTier: wt, plus: p.equip?.weapon?.plus || 0,
    armor: !!p.equip?.chest, helmet: false,
    hat: p.cls === 'mage' ? 'wizard' : null,
    hood: p.cls === 'archer' ? shade(cls.look.outfit, -0.2) : null,
    eyes: '#3a6ea8',
  };
  if (p.equip?.costume) {
    const c = COSTUMES[p.equip.costume.id];
    if (c) { o.outfit = c.outfit; o.trim = c.trim; o.cape = c.cape || null;
      o.hood = c.hood || null; o.hat = c.hat || o.hat && null; if (!c.hat) o.hat = null; }
  }
  if (opts.cast) { o.atk = 0.35 + Math.sin((opts.t || 0) * 10) * 0.08; }
  drawHumanoid(ctx, x, y, o);
}
function itemLvl(inst) { return inst.lvl || 1; }

export function drawNpcSprite(ctx, x, y, npc, t) {
  const lk = npc.look || {};
  drawHumanoid(ctx, x, y, {
    dir: 0, t, moving: false, scale: 0.95,
    skin: lk.skin || '#f2c9a0', hair: lk.hair || '#6a5a4a',
    outfit: lk.robe || '#4a4a6a', trim: lk.accent || '#c9c2b0',
    cls: null, eyes: '#4a5a3a',
    hat: npc.id === 'magister_orin' || npc.id === 'zephyr' ? 'wizard' : null,
    hood: npc.id === 'lysander' ? '#3a3a52' : null,
  });
  if (npc.id === 'lysander') { // ghost shimmer
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25;
    glowSpot(ctx, x, y - 30, 34, glowColor('#8fd8ff'), 0.5);
    ctx.restore();
  }
}

/* ============================================================
   MONSTERS — o: {t, size, tint, flash, face(-1/1), atk(0..1), hurt, hpFrac}
   ============================================================ */
export function drawMonster(ctx, kind, x, y, o) {
  const s = (o.size || 1);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * (o.face === -1 ? -1 : 1), s);
  const t = o.t || 0, tint = o.tint || '#8a8a9a';
  const lunge = o.atk ? Math.sin(o.atk * Math.PI) * 8 : 0;
  ctx.translate(lunge, 0);
  PAINTERS[kind]?.(ctx, t, tint, o);
  if (o.flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, -22, 2, 0, -22, 34);
    g.addColorStop(0, `rgba(255,240,220,${0.55 * o.flash})`);
    g.addColorStop(1, 'rgba(255,240,220,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -22, 34, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function eyes(ctx, x1, x2, y, r, color = '#141420', glow = null) {
  for (const ex of [x1, x2]) {
    if (glow) glowSpot(ctx, ex, y, r * 3.2, glowColor(glow), 0.5);
    ctx.fillStyle = glow || '#fff';
    ctx.beginPath(); ctx.arc(ex, y, r, 0, TAU); ctx.fill();
    if (!glow) { ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(ex, y + r * 0.15, r * 0.55, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath(); ctx.arc(ex - r * 0.3, y - r * 0.35, r * 0.28, 0, TAU); ctx.fill(); }
  }
}
function bodyGrad(ctx, tint, x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.15, x, y, r * 1.15);
  g.addColorStop(0, shade(tint, 0.38));
  g.addColorStop(0.6, tint);
  g.addColorStop(1, shade(tint, -0.42));
  return g;
}

const PAINTERS = {
  slime(ctx, t, tint) {
    const sq = 1 + Math.sin(t * 5) * 0.09;
    ctx.save(); ctx.scale(1 / sq, sq);
    ctx.fillStyle = bodyGrad(ctx, tint, 0, -16, 20);
    ctx.beginPath();
    ctx.moveTo(-20, -2);
    ctx.bezierCurveTo(-22, -26, -10, -34, 0, -34);
    ctx.bezierCurveTo(10, -34, 22, -26, 20, -2);
    ctx.quadraticCurveTo(0, 4, -20, -2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(-8, -26, 5.5, 3.5, -0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = shade(tint, -0.2, 0.6);
    ctx.beginPath(); ctx.ellipse(6, -8, 6, 4, 0, 0, TAU); ctx.fill();
    eyes(ctx, -6, 6, -18, 3.4);
    ctx.strokeStyle = 'rgba(20,20,32,.7)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, -12, 4, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.restore();
  },
  boar(ctx, t, tint, o) {
    const trot = o.moving ? Math.sin(t * 11) * 3 : 0;
    ctx.fillStyle = shade(tint, -0.5);
    for (const [lx, ph] of [[-13, 0], [-5, 2], [6, 1], [13, 3]])
      capsule(ctx, lx, -12, lx + (o.moving ? Math.sin(t * 11 + ph) * 3 : 0), -1, 3, shade(tint, -0.5));
    ctx.fillStyle = bodyGrad(ctx, tint, -2, -20, 22);
    ctx.beginPath(); ctx.ellipse(-2, -18, 22, 14, 0, 0, TAU); ctx.fill();
    // mane ridge
    ctx.fillStyle = shade(tint, -0.35);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) { const mx = -18 + i * 7;
      ctx.moveTo(mx, -28); ctx.lineTo(mx + 3.5, -34 - trot * 0.3); ctx.lineTo(mx + 7, -28); }
    ctx.fill();
    // head + snout
    ctx.fillStyle = bodyGrad(ctx, tint, 16, -18, 11);
    ctx.beginPath(); ctx.ellipse(17, -16, 10.5, 9.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = shade(tint, -0.15);
    ctx.beginPath(); ctx.ellipse(25, -13, 5, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a2018';
    ctx.beginPath(); ctx.arc(24, -13.5, 1.1, 0, TAU); ctx.arc(27, -13.5, 1.1, 0, TAU); ctx.fill();
    // tusks
    ctx.strokeStyle = '#f0e8d0'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(22, -10); ctx.quadraticCurveTo(26, -6, 29, -9); ctx.stroke();
    eyes(ctx, 13, 19, -21, 2.1, '#2c1212');
    // ear
    ctx.fillStyle = shade(tint, -0.3);
    ctx.beginPath(); ctx.moveTo(10, -25); ctx.lineTo(14, -32); ctx.lineTo(18, -25); ctx.closePath(); ctx.fill();
  },
  wolf(ctx, t, tint, o) {
    const run = o.moving ? Math.sin(t * 12) : 0;
    for (const [lx, ph] of [[-14, 0], [-7, 2.4], [8, 1.2], [14, 3.4]])
      capsule(ctx, lx, -13, lx + run * Math.sin(ph) * 4, -1, 2.6, shade(tint, -0.45));
    ctx.fillStyle = bodyGrad(ctx, tint, -2, -19, 20);
    ctx.beginPath(); ctx.ellipse(-3, -18, 20, 11, 0, 0, TAU); ctx.fill();
    // tail
    ctx.strokeStyle = shade(tint, -0.2); ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-21, -20);
    ctx.quadraticCurveTo(-30, -26 + run * 2, -34, -20 + run * 3); ctx.stroke();
    // chest fluff
    ctx.fillStyle = shade(tint, 0.25);
    ctx.beginPath(); ctx.ellipse(8, -14, 7, 6, 0.3, 0, TAU); ctx.fill();
    // head
    ctx.fillStyle = bodyGrad(ctx, tint, 15, -24, 10);
    ctx.beginPath(); ctx.ellipse(15, -24, 9.5, 8, 0.1, 0, TAU); ctx.fill();
    // muzzle
    ctx.fillStyle = shade(tint, 0.1);
    ctx.beginPath(); ctx.moveTo(20, -26); ctx.lineTo(29, -21.5); ctx.lineTo(20, -18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#20140e'; ctx.beginPath(); ctx.arc(28, -21.5, 1.5, 0, TAU); ctx.fill();
    // jaw fangs when attacking
    if (o.atk) { ctx.fillStyle = '#f0ecdc';
      ctx.beginPath(); ctx.moveTo(21, -19); ctx.lineTo(23, -15.5); ctx.lineTo(25, -19); ctx.closePath(); ctx.fill(); }
    // ears
    ctx.fillStyle = shade(tint, -0.25);
    for (const [ex2, ey2] of [[10, -32], [16, -33]]) {
      ctx.beginPath(); ctx.moveTo(ex2 - 3, ey2 + 4); ctx.lineTo(ex2, ey2 - 5); ctx.lineTo(ex2 + 3.4, ey2 + 3.4);
      ctx.closePath(); ctx.fill(); }
    eyes(ctx, 12, 17.5, -26.5, 2, '#141420', o.hurt ? null : undefined);
  },
  wisp(ctx, t, tint) {
    const fl = Math.sin(t * 3) * 4;
    ctx.translate(0, -26 + fl);
    glowSpot(ctx, 0, 0, 30, glowColor(tint), 0.6);
    for (let i = 0; i < 3; i++) {
      const a = t * 2.2 + i * (TAU / 3);
      const ox = Math.cos(a) * 14, oy = Math.sin(a) * 7;
      glowSpot(ctx, ox, oy, 6, glowColor(shade(tint, 0.3).replace('rgba', 'rgba').includes('#') ? tint : tint), 0.7);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(ox, oy, 1.7, 0, TAU); ctx.fill();
    }
    const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, 12);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, shade(tint, 0.2)); g.addColorStop(1, shade(tint, -0.3, 0.15));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill();
    eyes(ctx, -4, 4, -1, 2.2, '#1a1030');
  },
  mushroom(ctx, t, tint) {
    const bob = Math.sin(t * 4) * 1.5;
    // stem body
    const sg = ctx.createLinearGradient(-8, -20, 8, 0);
    sg.addColorStop(0, '#e8dcc8'); sg.addColorStop(1, '#b8a888');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-10, -22, 0, -22);
    ctx.quadraticCurveTo(10, -22, 9, 0); ctx.closePath(); ctx.fill();
    eyes(ctx, -4.5, 4.5, -12, 2.6);
    ctx.strokeStyle = 'rgba(60,40,30,.6)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, -7, 3, 0.3, Math.PI - 0.3); ctx.stroke();
    // cap
    ctx.fillStyle = bodyGrad(ctx, tint, 0, -28 + bob, 20);
    ctx.beginPath(); ctx.ellipse(0, -24 + bob, 19, 12, 0, Math.PI, 0);
    ctx.quadraticCurveTo(19, -18 + bob, 0, -17 + bob);
    ctx.quadraticCurveTo(-19, -18 + bob, -19, -24 + bob);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,248,235,.8)';
    for (const [sx, sy, sr] of [[-9, -28, 3], [3, -32, 2.4], [10, -26, 2]]) {
      ctx.beginPath(); ctx.arc(sx, sy + bob, sr, 0, TAU); ctx.fill(); }
  },
  bandit(ctx, t, tint, o) {
    drawHumanoid(ctx, 0, 0, {
      dir: o.face === -1 ? 2 : 2, t, moving: o.moving, atk: o.atk, scale: 0.92,
      skin: '#d8a878', hair: '#3a3028', outfit: tint, trim: shade(tint, -0.3),
      cls: 'warrior', weaponTier: 1, hood: shade(tint, -0.35), eyes: '#7a3a2a',
    });
    // face mask
    ctx.fillStyle = 'rgba(30,26,40,0.85)';
    ctx.beginPath(); ctx.ellipse(3, -50, 8, 4.5, 0, 0, TAU); ctx.fill();
  },
  spider(ctx, t, tint, o) {
    const sk = o.moving ? t * 14 : t * 2;
    ctx.strokeStyle = shade(tint, -0.35); ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const ph = Math.sin(sk + i * 1.7) * 4;
      const lx = -6 + i * 4.5;
      ctx.beginPath(); ctx.moveTo(lx, -14);
      ctx.quadraticCurveTo(lx - 14, -22 + ph, lx - 20, -4 + ph * 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx + 4, -14);
      ctx.quadraticCurveTo(lx + 18, -22 - ph, lx + 24, -4 - ph * 0.5); ctx.stroke();
    }
    ctx.fillStyle = bodyGrad(ctx, tint, -6, -18, 15);
    ctx.beginPath(); ctx.ellipse(-6, -16, 15, 11.5, 0, 0, TAU); ctx.fill();
    // markings
    ctx.strokeStyle = shade(tint, 0.35); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-14, -20); ctx.quadraticCurveTo(-6, -26, 2, -20); ctx.stroke();
    ctx.fillStyle = bodyGrad(ctx, tint, 8, -13, 8);
    ctx.beginPath(); ctx.arc(9, -12, 7.5, 0, TAU); ctx.fill();
    // eye cluster
    for (const [ex2, ey2, er] of [[7, -15, 2], [12, -14.5, 2], [9.5, -11, 1.4], [13.5, -11, 1.4]]) {
      glowSpot(ctx, ex2, ey2, er * 2.4, glowColor('#ff5a4a'), 0.4);
      ctx.fillStyle = '#c03028'; ctx.beginPath(); ctx.arc(ex2, ey2, er, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(ex2 - er * 0.3, ey2 - er * 0.3, er * 0.3, 0, TAU); ctx.fill();
    }
    if (o.atk) { ctx.strokeStyle = '#f0ecdc'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(13, -8); ctx.lineTo(15, -4); ctx.moveTo(9, -7); ctx.lineTo(8, -3); ctx.stroke(); }
  },
  scorpion(ctx, t, tint, o) {
    const sk = o.moving ? Math.sin(t * 12) * 3 : 0;
    ctx.strokeStyle = shade(tint, -0.4); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-4 + i * 4, -10);
      ctx.lineTo(-10 + i * 5 + sk, -2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2 + i * 4, -10);
      ctx.lineTo(4 + i * 5 - sk, -2); ctx.stroke();
    }
    // segmented body
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = bodyGrad(ctx, tint, -8 + i * 7, -12, 9 - i);
      ctx.beginPath(); ctx.ellipse(-8 + i * 7, -11, 9 - i * 0.8, 6.5 - i * 0.5, 0, 0, TAU); ctx.fill();
    }
    // tail curling overhead
    const curl = 0.8 + (o.atk ? Math.sin(o.atk * Math.PI) * 0.5 : Math.sin(t * 3) * 0.08);
    ctx.strokeStyle = shade(tint, -0.15); ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-14, -13);
    ctx.quadraticCurveTo(-26, -22, -22, -32 * curl);
    ctx.quadraticCurveTo(-19, -38 * curl, -12, -36 * curl);
    ctx.stroke();
    ctx.fillStyle = '#3a2018';
    ctx.beginPath(); ctx.moveTo(-12, -36 * curl); ctx.lineTo(-6, -33 * curl); ctx.lineTo(-11, -31 * curl);
    ctx.closePath(); ctx.fill();
    // claws
    for (const [cy, rot] of [[-8, -0.3], [-15, 0.25]]) {
      ctx.save(); ctx.translate(9, cy); ctx.rotate(rot + (o.atk ? Math.sin(o.atk * TAU) * 0.4 : 0));
      ctx.fillStyle = bodyGrad(ctx, tint, 4, 0, 6);
      ctx.beginPath(); ctx.ellipse(5, 0, 6.5, 4.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = shade(tint, -0.3);
      ctx.beginPath(); ctx.moveTo(9, -2); ctx.quadraticCurveTo(15, -3, 16, 1); ctx.lineTo(9, 2); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    eyes(ctx, 6, 11, -16, 1.6, '#1a0e08');
  },
  golem(ctx, t, tint, o) {
    const breathe = Math.sin(t * 2) * 1.2;
    // legs
    for (const lx of [-9, 9]) {
      ctx.fillStyle = shade(tint, -0.4);
      roundRect(ctx, lx - 5.5, -14, 11, 14, 4); ctx.fill();
    }
    // torso boulder
    ctx.fillStyle = bodyGrad(ctx, tint, 0, -28, 22);
    ctx.beginPath();
    ctx.moveTo(-19, -12); ctx.lineTo(-22, -34); ctx.lineTo(-10, -44 - breathe);
    ctx.lineTo(12, -43 - breathe); ctx.lineTo(21, -30); ctx.lineTo(18, -12);
    ctx.closePath(); ctx.fill();
    // glowing core seams
    ctx.strokeStyle = 'rgba(255,150,60,0.9)'; ctx.lineWidth = 1.8;
    glowSpot(ctx, 0, -27, 15, glowColor('#ff9a4a'), 0.4);
    ctx.beginPath(); ctx.moveTo(-8, -35); ctx.lineTo(-2, -27); ctx.lineTo(-7, -18);
    ctx.moveTo(4, -34); ctx.lineTo(2, -24); ctx.stroke();
    // shoulder rocks + arms
    for (const sx of [-1, 1]) {
      ctx.save(); ctx.scale(sx, 1);
      ctx.fillStyle = bodyGrad(ctx, tint, 20, -38, 9);
      ctx.beginPath(); ctx.arc(19, -38, 9, 0, TAU); ctx.fill();
      const punch = o.atk && sx === 1 ? Math.sin(o.atk * Math.PI) * 10 : 0;
      capsule(ctx, 21, -34, 24 + punch, -10, 5.5, shade(tint, -0.25));
      ctx.fillStyle = bodyGrad(ctx, tint, 25, -8, 7);
      ctx.beginPath(); ctx.arc(24 + punch, -8, 7, 0, TAU); ctx.fill();
      ctx.restore();
    }
    eyes(ctx, -5, 6, -34, 2.4, null, '#ffb56a');
  },
  treant(ctx, t, tint, o) {
    const sway = Math.sin(t * 1.6) * 2;
    // root legs
    ctx.strokeStyle = '#4a3220'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (const [lx, dx] of [[-8, -13], [-1, -2], [7, 12]]) {
      ctx.beginPath(); ctx.moveTo(lx, -14); ctx.quadraticCurveTo(lx + dx * 0.4, -6, dx, 0); ctx.stroke();
    }
    // trunk
    const tg = ctx.createLinearGradient(-12, -46, 10, -10);
    tg.addColorStop(0, '#6a4a2c'); tg.addColorStop(0.5, '#54381e'); tg.addColorStop(1, '#38230f');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(-11, -12); ctx.quadraticCurveTo(-14, -34, -9 + sway, -50);
    ctx.lineTo(8 + sway, -50); ctx.quadraticCurveTo(13, -32, 10, -12);
    ctx.closePath(); ctx.fill();
    // bark grooves
    ctx.strokeStyle = 'rgba(20,12,4,.5)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-4, -16); ctx.quadraticCurveTo(-6, -30, -3 + sway, -46);
    ctx.moveTo(4, -14); ctx.quadraticCurveTo(6, -28, 4 + sway, -44); ctx.stroke();
    // hollow face
    ctx.fillStyle = '#1a0e06';
    ctx.beginPath(); ctx.ellipse(sway * 0.7, -36, 7.5, 9, 0, 0, TAU); ctx.fill();
    eyes(ctx, -3 + sway * 0.7, 3.4 + sway * 0.7, -38, 2, null, tint);
    // branch arms
    ctx.strokeStyle = '#54381e'; ctx.lineWidth = 4.4; ctx.lineCap = 'round';
    const reach = o.atk ? Math.sin(o.atk * Math.PI) * 8 : 0;
    ctx.beginPath(); ctx.moveTo(-10, -40); ctx.quadraticCurveTo(-22, -44 + sway, -28 - reach, -34);
    ctx.moveTo(9, -40); ctx.quadraticCurveTo(20, -46 + sway, 26 + reach, -36); ctx.stroke();
    // canopy
    for (const [cx2, cy2, cr] of [[-8, -56, 11], [4, -60, 13], [12, -53, 9]]) {
      ctx.fillStyle = bodyGrad(ctx, tint, cx2, cy2 + sway, cr);
      ctx.beginPath(); ctx.arc(cx2 + sway, cy2, cr, 0, TAU); ctx.fill();
    }
  },
  wraith(ctx, t, tint) {
    const fl = Math.sin(t * 2.4) * 4;
    ctx.translate(0, -14 + fl);
    glowSpot(ctx, 0, -18, 30, glowColor(tint), 0.35);
    // tattered robe fading to nothing
    const g = ctx.createLinearGradient(0, -40, 0, 6);
    g.addColorStop(0, shade(tint, -0.1, 0.95));
    g.addColorStop(0.7, shade(tint, -0.4, 0.55));
    g.addColorStop(1, shade(tint, -0.5, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-13, -34);
    ctx.quadraticCurveTo(-17, -12, -14, 4);
    for (let i = 0; i < 4; i++) ctx.lineTo(-14 + 7 * i + Math.sin(t * 3 + i) * 2, i % 2 ? -2 : 6);
    ctx.quadraticCurveTo(17, -12, 13, -34);
    ctx.quadraticCurveTo(0, -46, -13, -34);
    ctx.closePath(); ctx.fill();
    // hood shadow + eyes
    ctx.fillStyle = 'rgba(6,4,14,0.85)';
    ctx.beginPath(); ctx.ellipse(0, -32, 8.5, 7.5, 0, 0, TAU); ctx.fill();
    eyes(ctx, -3.4, 3.4, -33, 1.9, null, shade(tint, 0.45));
    // reaching hands
    ctx.strokeStyle = shade(tint, 0.1, 0.8); ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-12, -26); ctx.quadraticCurveTo(-20, -24, -23, -18 + fl);
    ctx.moveTo(12, -26); ctx.quadraticCurveTo(20, -24, 23, -18 - fl); ctx.stroke();
  },
  skeleton(ctx, t, tint, o) {
    const rat = o.moving ? Math.sin(t * 10) : 0;
    const bone = '#e2dcc8';
    // legs
    capsule(ctx, -4, -18, -4 - rat * 4, -1, 2.4, bone);
    capsule(ctx, 4, -18, 4 + rat * 4, -1, 2.4, bone);
    // spine + ribs
    capsule(ctx, 0, -40, 0, -18, 2.2, bone);
    ctx.strokeStyle = bone; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(0, -36 + i * 5.5, 7 - i * 0.8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -38 + i * 5.5, 7 - i * 0.8, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
    }
    // arms — one holds rusty blade
    capsule(ctx, -7, -38, -11, -24, 2, bone);
    const sw = o.atk ? Math.sin(o.atk * Math.PI) : 0;
    ctx.save(); ctx.translate(8 + sw * 6, -26 - sw * 10); ctx.rotate(-0.4 - sw * 1.8);
    capsule(ctx, -3, -6, -8, -12, 2, bone);
    ctx.fillStyle = '#7a6a52';
    ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(2, -4); ctx.lineTo(14, -22); ctx.lineTo(10, -25); ctx.closePath(); ctx.fill();
    ctx.restore();
    // skull
    const sg = ctx.createRadialGradient(-2, -48, 1, 0, -46, 9);
    sg.addColorStop(0, '#fff8ea'); sg.addColorStop(1, '#b8b09a');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(0, -47, 8.5, 0, TAU); ctx.fill();
    roundRect(ctx, -5, -42, 10, 5.5, 2); ctx.fill();
    // eye sockets
    eyes(ctx, -3.4, 3.4, -47, 2.4, null, tint);
    ctx.fillStyle = '#3a3428';
    for (const gx of [-2.4, 0, 2.4]) ctx.fillRect(gx - 0.7, -40, 1.4, 3);
  },
  yeti(ctx, t, tint, o) {
    const sway = Math.sin(t * 2.2) * 1.5;
    // legs
    for (const lx of [-9, 9]) capsule(ctx, lx, -14, lx, -2, 6, shade(tint, -0.3));
    // massive furry torso (fur = layered scallops)
    ctx.fillStyle = bodyGrad(ctx, tint, 0, -32, 26);
    ctx.beginPath(); ctx.ellipse(0, -30 + sway * 0.3, 23, 22, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = shade(tint, -0.18);
    for (let row = 0; row < 3; row++) for (let i = 0; i < 5; i++) {
      const fx = -16 + i * 8, fy = -18 - row * 9;
      ctx.beginPath(); ctx.arc(fx, fy, 5.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineTo(fx - 4, fy); ctx.fill();
    }
    // long arms
    const smash = o.atk ? Math.sin(o.atk * Math.PI) : 0;
    for (const sx of [-1, 1]) {
      ctx.save(); ctx.scale(sx, 1);
      capsule(ctx, 20, -38, 27, -8 - smash * 22, 6.5, shade(tint, -0.12));
      ctx.fillStyle = shade(tint, 0.2);
      ctx.beginPath(); ctx.arc(27, -7 - smash * 22, 7, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // face patch
    ctx.fillStyle = '#cfd8e2';
    ctx.beginPath(); ctx.ellipse(0, -40 + sway * 0.4, 10, 8.5, 0, 0, TAU); ctx.fill();
    eyes(ctx, -4, 4, -42, 2.2, '#28303c');
    ctx.fillStyle = '#28303c';
    ctx.beginPath(); ctx.arc(0, -37, 1.6, 0, TAU); ctx.fill();
    if (o.atk) { ctx.strokeStyle = '#f0ecdc'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-3, -34); ctx.lineTo(-1.4, -31); ctx.moveTo(3, -34); ctx.lineTo(1.4, -31); ctx.stroke(); }
    // small horns
    ctx.fillStyle = '#d8cdb8';
    for (const sx of [-1, 1]) { ctx.save(); ctx.scale(sx, 1);
      ctx.beginPath(); ctx.moveTo(8, -48); ctx.quadraticCurveTo(13, -54, 11, -58); ctx.lineTo(8, -52);
      ctx.closePath(); ctx.fill(); ctx.restore(); }
  },
  bat(ctx, t, tint) {
    const flap = Math.sin(t * 14) * 0.8;
    ctx.translate(0, -34 + Math.sin(t * 4) * 3);
    // wings
    for (const sx of [-1, 1]) {
      ctx.save(); ctx.scale(sx, 1); ctx.rotate(-flap * 0.45);
      const wg = ctx.createLinearGradient(0, 0, 26, 0);
      wg.addColorStop(0, shade(tint, -0.1)); wg.addColorStop(1, shade(tint, -0.45, 0.9));
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.moveTo(4, -2);
      ctx.quadraticCurveTo(16, -14, 27, -10);
      ctx.quadraticCurveTo(22, -4, 24, 2);
      ctx.quadraticCurveTo(17, 0, 15, 5);
      ctx.quadraticCurveTo(10, 2, 4, 6);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // body + ears
    ctx.fillStyle = bodyGrad(ctx, tint, 0, -2, 10);
    ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 10, 0, 0, TAU); ctx.fill();
    for (const sx of [-1, 1]) { ctx.save(); ctx.scale(sx, 1);
      ctx.fillStyle = shade(tint, -0.2);
      ctx.beginPath(); ctx.moveTo(2, -8); ctx.lineTo(6, -16); ctx.lineTo(8, -7); ctx.closePath(); ctx.fill();
      ctx.restore(); }
    eyes(ctx, -3, 3, -3, 1.8, null, '#ffcf5f');
    ctx.fillStyle = '#f0ecdc';
    ctx.beginPath(); ctx.moveTo(-2.4, 3); ctx.lineTo(-1.2, 6); ctx.lineTo(0, 3);
    ctx.moveTo(2.4, 3); ctx.lineTo(1.2, 6); ctx.lineTo(0.2, 3); ctx.fill();
  },
  drake(ctx, t, tint, o) {
    const und = Math.sin(t * 2.6) * 3;
    // tail
    ctx.strokeStyle = shade(tint, -0.2); ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-14, -20);
    ctx.quadraticCurveTo(-30, -14 + und, -40, -24 + und * 1.5); ctx.stroke();
    ctx.fillStyle = shade(tint, 0.15);
    ctx.beginPath(); ctx.moveTo(-40, -28 + und * 1.5); ctx.lineTo(-48, -24 + und * 1.5); ctx.lineTo(-40, -19 + und * 1.5);
    ctx.closePath(); ctx.fill();
    // wings
    for (const sx of [-1, 1]) {
      ctx.save(); ctx.translate(0, -30); ctx.scale(sx, 1); ctx.rotate(Math.sin(t * 3.4) * 0.25 - 0.2);
      const wg = ctx.createLinearGradient(0, 0, 34, -14);
      wg.addColorStop(0, shade(tint, -0.05, 0.95)); wg.addColorStop(1, shade(tint, 0.3, 0.65));
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.moveTo(2, 0);
      ctx.quadraticCurveTo(18, -22, 36, -18);
      ctx.quadraticCurveTo(28, -8, 30, 2);
      ctx.quadraticCurveTo(20, -2, 16, 6);
      ctx.quadraticCurveTo(8, 2, 2, 8);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shade(tint, -0.35, 0.7); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(34, -17);
      ctx.moveTo(4, 2); ctx.lineTo(29, 0); ctx.stroke();
      ctx.restore();
    }
    // body
    ctx.fillStyle = bodyGrad(ctx, tint, -2, -22, 20);
    ctx.beginPath(); ctx.ellipse(-2, -22, 19, 13, -0.1, 0, TAU); ctx.fill();
    // belly plates
    ctx.fillStyle = shade(tint, 0.4);
    ctx.beginPath(); ctx.ellipse(0, -15, 13, 6, -0.05, 0, TAU); ctx.fill();
    // legs
    for (const lx of [-10, 6]) capsule(ctx, lx, -14, lx + 2, -2, 3.4, shade(tint, -0.35));
    // neck + head
    capsule(ctx, 12, -26, 20, -38 + und * 0.5, 6, shade(tint, -0.05));
    ctx.fillStyle = bodyGrad(ctx, tint, 22, -40, 10);
    ctx.beginPath(); ctx.ellipse(23, -39 + und * 0.5, 10, 7.5, 0.15, 0, TAU); ctx.fill();
    // jaw
    const roar = o.atk ? Math.sin(o.atk * Math.PI) * 0.5 : 0;
    ctx.fillStyle = shade(tint, -0.1);
    ctx.beginPath(); ctx.moveTo(28, -38 + und * 0.5);
    ctx.lineTo(37, -35 + und * 0.5 + roar * 6); ctx.lineTo(28, -33 + und * 0.5); ctx.closePath(); ctx.fill();
    if (o.atk) glowSpot(ctx, 38, -34 + und * 0.5, 14, glowColor('#bfefff'), 0.7);
    // horns
    ctx.fillStyle = shade(tint, 0.45);
    ctx.beginPath(); ctx.moveTo(18, -45 + und * 0.5); ctx.quadraticCurveTo(13, -52, 15, -56); ctx.lineTo(20, -47);
    ctx.closePath(); ctx.fill();
    eyes(ctx, 24, 28, -42 + und * 0.5, 1.8, null, '#bfefff');
    // dorsal ridge
    ctx.fillStyle = shade(tint, 0.25);
    for (let i = 0; i < 4; i++) { const rx = -12 + i * 7;
      ctx.beginPath(); ctx.moveTo(rx, -33); ctx.lineTo(rx + 3, -40); ctx.lineTo(rx + 6, -33); ctx.closePath(); ctx.fill(); }
  },
  knight(ctx, t, tint, o) {
    drawHumanoid(ctx, 0, 0, {
      dir: 2, t, moving: o.moving, atk: o.atk, scale: 1.05,
      skin: '#1a1a26', hair: '#111', outfit: tint, trim: shade(tint, 0.4),
      cls: 'warrior', weaponTier: 6, knight: true, helmet: true, plume: '#5a2a6a',
      armor: true, eyes: '#ff5a4a', cape: shade(tint, -0.5),
    });
    // visor glow
    glowSpot(ctx, 4, -56, 9, glowColor('#ff5a4a'), 0.5);
  },
  hollowking(ctx, t, tint, o) {
    const fl = Math.sin(t * 1.8) * 3;
    ctx.translate(0, fl * 0.4);
    // void aura
    glowSpot(ctx, 0, -40, 60, glowColor('#6a3aa8'), 0.35);
    // great cape of unravelling night
    const cg = ctx.createLinearGradient(0, -70, 0, 4);
    cg.addColorStop(0, '#241436'); cg.addColorStop(1, 'rgba(20,8,40,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.moveTo(-16, -62);
    ctx.quadraticCurveTo(-30, -30, -24 + Math.sin(t * 2) * 3, 2);
    for (let i = 0; i < 5; i++) ctx.lineTo(-22 + i * 11, i % 2 ? -4 : 4);
    ctx.quadraticCurveTo(30, -30, 16, -62);
    ctx.closePath(); ctx.fill();
    // armored body
    drawHumanoid(ctx, 0, 0, {
      dir: 2, t, moving: o.moving, atk: o.atk, scale: 1.15,
      skin: '#0e0e1a', hair: '#111', outfit: '#2a1a4a', trim: '#8a6ad8',
      cls: 'warrior', weaponTier: 8, knight: true, armor: true, eyes: '#c09fff',
    });
    // crown of the Hollow King
    ctx.save(); ctx.translate(0, -81 + fl * 0.3);
    ctx.fillStyle = '#d8b45a';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const px = -12 + i * 6;
      ctx.moveTo(px, 4); ctx.lineTo(px + 3, -6 - (i === 2 ? 4 : 0)); ctx.lineTo(px + 6, 4);
    }
    ctx.fill();
    ctx.fillStyle = '#b8923e'; roundRect(ctx, -13, 2, 26, 5, 2); ctx.fill();
    glowSpot(ctx, 0, -4, 10, glowColor('#c09fff'), 0.7);
    ctx.fillStyle = '#c09fff'; ctx.beginPath(); ctx.arc(0, -3, 2.4, 0, TAU); ctx.fill();
    ctx.restore();
  },
};

/* ---------------- pets ---------------- */
export function drawPet(ctx, kind, x, y, o) {
  const t = o.t || 0;
  ctx.save(); ctx.translate(x, y);
  if (o.face === -1) ctx.scale(-1, 1);
  const bob = Math.sin(t * 6) * 1.5;
  if (kind === 'fox') {
    const tint = o.tint || '#e07838';
    capsule(ctx, -6, -8, -6, -1, 2, shade(tint, -0.3));
    capsule(ctx, 4, -8, 4, -1, 2, shade(tint, -0.3));
    ctx.fillStyle = bodyGrad(ctx, tint, 0, -10, 11);
    ctx.beginPath(); ctx.ellipse(-1, -9, 10.5, 7, 0, 0, TAU); ctx.fill();
    // flame-tipped tail
    ctx.strokeStyle = tint; ctx.lineWidth = 4.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, -10); ctx.quadraticCurveTo(-18, -16, -17, -22 + bob); ctx.stroke();
    glowSpot(ctx, -17, -23 + bob, 8, glowColor('#ffb56a'), 0.8);
    ctx.fillStyle = '#fff2d8'; ctx.beginPath(); ctx.arc(-17, -23 + bob, 2.4, 0, TAU); ctx.fill();
    // head
    ctx.fillStyle = bodyGrad(ctx, tint, 8, -13, 7);
    ctx.beginPath(); ctx.arc(8, -13, 6.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(11, -12); ctx.lineTo(16, -10); ctx.lineTo(11, -8.5); ctx.closePath(); ctx.fill();
    for (const [ex2] of [[4], [10]]) { ctx.fillStyle = shade(tint, -0.15);
      ctx.beginPath(); ctx.moveTo(ex2 - 2, -18); ctx.lineTo(ex2, -24); ctx.lineTo(ex2 + 2.4, -17.6); ctx.closePath(); ctx.fill(); }
    eyes(ctx, 6, 10.4, -14, 1.5, '#2c1a10');
  } else if (kind === 'owl') {
    const tint = o.tint || '#9ab8d8';
    ctx.translate(0, -16 + Math.sin(t * 3.4) * 3);
    for (const sx of [-1, 1]) { ctx.save(); ctx.scale(sx, 1); ctx.rotate(-Math.abs(Math.sin(t * 8)) * 0.5);
      ctx.fillStyle = shade(tint, -0.15);
      ctx.beginPath(); ctx.ellipse(9, -2, 8, 4, -0.4, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = bodyGrad(ctx, tint, 0, -2, 10);
    ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 10.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = shade(tint, 0.35);
    ctx.beginPath(); ctx.ellipse(0, 2, 5.5, 7, 0, 0, TAU); ctx.fill();
    eyes(ctx, -3.2, 3.2, -4, 2.6, '#1a1408');
    ctx.fillStyle = '#e8b84a';
    ctx.beginPath(); ctx.moveTo(-1.6, -1.5); ctx.lineTo(0, 1.5); ctx.lineTo(1.6, -1.5); ctx.closePath(); ctx.fill();
  } else { // stone pup
    const tint = o.tint || '#8a8f98';
    capsule(ctx, -6, -8, -6, -1, 2.4, shade(tint, -0.35));
    capsule(ctx, 5, -8, 5, -1, 2.4, shade(tint, -0.35));
    ctx.fillStyle = bodyGrad(ctx, tint, 0, -10, 10);
    roundRect(ctx, -10, -16, 19, 10, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,180,90,0.8)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-5, -14); ctx.lineTo(-2, -10); ctx.moveTo(2, -15); ctx.lineTo(3, -11); ctx.stroke();
    ctx.fillStyle = bodyGrad(ctx, tint, 9, -14, 6);
    roundRect(ctx, 4, -20, 11, 9, 4); ctx.fill();
    eyes(ctx, 7.4, 11.4, -16, 1.5, null, '#ffb56a');
    // stubby tail wag
    ctx.save(); ctx.translate(-10, -13); ctx.rotate(Math.sin(t * 10) * 0.5);
    ctx.fillStyle = shade(tint, -0.2); roundRect(ctx, -5, -2, 6, 4, 2); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}

/* ---------------- portal gate ---------------- */
export function drawPortal(ctx, x, y, t, locked) {
  ctx.save(); ctx.translate(x, y);
  const c = locked ? '#7a6a8a' : '#8fd8ff';
  drawShadow(ctx, 0, 2, 26, 0.25);
  // stone arch
  const sg = ctx.createLinearGradient(-24, -64, 24, 0);
  sg.addColorStop(0, '#8a8296'); sg.addColorStop(1, '#4a4456');
  ctx.strokeStyle = sg; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-20, -34);
  ctx.quadraticCurveTo(-20, -58, 0, -58);
  ctx.quadraticCurveTo(20, -58, 20, -34); ctx.lineTo(20, 0); ctx.stroke();
  // runes
  ctx.fillStyle = locked ? '#5a5468' : '#cfeaff';
  for (const [rx, ry] of [[-20, -18], [-20, -38], [0, -56], [20, -38], [20, -18]]) {
    ctx.save(); ctx.translate(rx, ry); ctx.rotate(t * 0.6 + rx);
    ctx.fillRect(-2, -2, 4, 4); ctx.restore();
  }
  // swirling energy
  if (!locked) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const ph = t * 1.4 + i * 2.1;
      const g = ctx.createRadialGradient(0, -28, 2, 0, -28, 22);
      g.addColorStop(0, `rgba(190,235,255,${0.16 + Math.sin(ph) * 0.06})`);
      g.addColorStop(1, 'rgba(120,190,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, -28, 15 + Math.sin(ph) * 2.4, 25, Math.sin(ph * 0.6) * 0.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
    glowSpot(ctx, 0, -28, 34, glowColor(c), 0.35);
  } else {
    ctx.fillStyle = 'rgba(20,16,32,0.75)';
    ctx.beginPath(); ctx.ellipse(0, -28, 14, 24, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
