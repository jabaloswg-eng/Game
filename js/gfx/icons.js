// Item + skill icons, painted into small canvases (crisp at any DPR).
import { shade } from '../core/util.js';
import { TIER_COLORS } from '../data/db.js';

const TAU = Math.PI * 2;

export function paintItemIcon(canvas, item, inst = null) {
  const S = 80;
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.translate(S / 2, S / 2);
  const tier = item.tier || 0;
  if (tier >= 3) { // epic+ inner glow
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, S / 2);
    g.addColorStop(0, TIER_COLORS[tier] + '44');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(-S / 2, -S / 2, S, S);
  }
  const fns = {
    weapon: item.cls === 'archer' ? bowIcon : item.cls === 'mage' ? staffIcon : swordIcon,
    chest: chestIcon, helm: helmIcon, boots: bootsIcon, shield: shieldIcon,
    ring: ringIcon, amulet: amuletIcon, potion: potionIcon, food: foodIcon,
    scroll: scrollIcon, material: materialIcon, quest: questIcon,
    costume: costumeIcon, egg: eggIcon,
  };
  (fns[item.type] || materialIcon)(ctx, item);
  ctx.restore();
}

function metalGrad(ctx, tier, x1, y1, x2, y2) {
  const base = ['#a8b2c2', '#a8c2a8', '#9ab8dd', '#c0a2e2', '#e8c268', '#e88a6a'][Math.min(tier, 5)];
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, shade(base, 0.4)); g.addColorStop(0.5, base); g.addColorStop(1, shade(base, -0.35));
  return g;
}

function swordIcon(ctx, item) {
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = metalGrad(ctx, item.tier, -4, 0, 4, 0);
  ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(-3, -22); ctx.lineTo(0, -29);
  ctx.lineTo(3, -22); ctx.lineTo(4, 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, -26); ctx.stroke();
  ctx.fillStyle = '#c79b47'; ctx.fillRect(-10, 8, 20, 4);
  ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-2.6, 12, 5.2, 12);
  ctx.fillStyle = '#e8c268'; ctx.beginPath(); ctx.arc(0, 26, 3.4, 0, TAU); ctx.fill();
}
function bowIcon(ctx, item) {
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = '#8a6134'; ctx.lineWidth = 4.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-6, 0, 24, -Math.PI / 2 + 0.2, Math.PI / 2 - 0.2); ctx.stroke();
  ctx.strokeStyle = metalGrad(ctx, item.tier, -6, -20, -6, 20); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(-6, 0, 24, -Math.PI / 2 + 0.2, -0.2); ctx.stroke();
  ctx.strokeStyle = '#e8e8f2'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-6 + 24 * Math.cos(-Math.PI / 2 + 0.2), 24 * Math.sin(-Math.PI / 2 + 0.2));
  ctx.lineTo(-6 + 24 * Math.cos(Math.PI / 2 - 0.2), 24 * Math.sin(Math.PI / 2 - 0.2)); ctx.stroke();
  // arrow
  ctx.strokeStyle = '#c8a878'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(14, 0); ctx.stroke();
  ctx.fillStyle = '#d8d8e2';
  ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(8, -4); ctx.lineTo(8, 4); ctx.closePath(); ctx.fill();
}
function staffIcon(ctx, item) {
  ctx.rotate(Math.PI / 5);
  ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 4.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 28); ctx.lineTo(0, -14); ctx.stroke();
  const orb = ['#8fd8ff', '#8fd8ff', '#9f8fff', '#c0a2e2', '#ffd77a', '#ff9a6a'][Math.min(item.tier, 5)];
  const g = ctx.createRadialGradient(-2, -22, 1, 0, -20, 9);
  g.addColorStop(0, '#fff'); g.addColorStop(0.5, orb); g.addColorStop(1, shade(orb, -0.4));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, -20, 8, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#c79b47'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, -20, 11, 0.4, Math.PI - 0.4); ctx.stroke();
}
function chestIcon(ctx, item) {
  ctx.fillStyle = metalGrad(ctx, item.tier, -18, -16, 18, 20);
  ctx.beginPath();
  ctx.moveTo(-18, -14); ctx.lineTo(-8, -20); ctx.lineTo(8, -20); ctx.lineTo(18, -14);
  ctx.lineTo(14, 2); ctx.lineTo(10, 20); ctx.lineTo(-10, 20); ctx.lineTo(-14, 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 20); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.4)';
  ctx.beginPath(); ctx.moveTo(-13, -12); ctx.lineTo(-10, 8); ctx.stroke();
}
function helmIcon(ctx, item) {
  ctx.fillStyle = metalGrad(ctx, item.tier, -16, -16, 14, 12);
  ctx.beginPath(); ctx.arc(0, -2, 17, Math.PI, 0);
  ctx.lineTo(17, 10); ctx.lineTo(10, 14); ctx.lineTo(10, 4);
  ctx.lineTo(-10, 4); ctx.lineTo(-10, 14); ctx.lineTo(-17, 10);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(20,16,28,.8)'; ctx.fillRect(-10, 2, 20, 5);
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, -2, 13, Math.PI * 1.15, Math.PI * 1.6); ctx.stroke();
}
function bootsIcon(ctx, item) {
  ctx.fillStyle = metalGrad(ctx, item.tier, -12, -16, 12, 18);
  ctx.beginPath();
  ctx.moveTo(-12, -18); ctx.lineTo(-2, -18); ctx.lineTo(-1, 6); ctx.lineTo(14, 10);
  ctx.lineTo(14, 18); ctx.lineTo(-12, 18); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-12, 12, 26, 6);
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-9, -14); ctx.lineTo(-8, 4); ctx.stroke();
}
function shieldIcon(ctx, item) {
  ctx.fillStyle = metalGrad(ctx, item.tier, -16, -18, 14, 20);
  ctx.beginPath();
  ctx.moveTo(0, -22); ctx.quadraticCurveTo(16, -18, 18, -10);
  ctx.quadraticCurveTo(18, 10, 0, 22);
  ctx.quadraticCurveTo(-18, 10, -18, -10);
  ctx.quadraticCurveTo(-16, -18, 0, -22);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#c79b47'; ctx.lineWidth = 2.6; ctx.stroke();
  ctx.fillStyle = '#c79b47'; ctx.beginPath(); ctx.arc(0, -2, 4.4, 0, TAU); ctx.fill();
}
function ringIcon(ctx, item) {
  ctx.strokeStyle = metalGrad(ctx, Math.max(2, item.tier), -12, 0, 12, 0);
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(0, 4, 13, 0, TAU); ctx.stroke();
  const gem = TIER_COLORS[item.tier] || '#7fb5ff';
  const g = ctx.createRadialGradient(-2, -12, 1, 0, -10, 7);
  g.addColorStop(0, '#fff'); g.addColorStop(0.5, gem); g.addColorStop(1, shade(gem, -0.4));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-7, -10); ctx.lineTo(0, -17); ctx.lineTo(7, -10); ctx.lineTo(0, -3);
  ctx.closePath(); ctx.fill();
}
function amuletIcon(ctx, item) {
  ctx.strokeStyle = '#c79b47'; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.arc(0, -8, 14, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke();
  const gem = TIER_COLORS[item.tier] || '#d09fff';
  const g = ctx.createRadialGradient(-2, 6, 1, 0, 8, 10);
  g.addColorStop(0, '#fff'); g.addColorStop(0.45, gem); g.addColorStop(1, shade(gem, -0.45));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(9, 8); ctx.lineTo(0, 20); ctx.lineTo(-9, 8);
  ctx.closePath(); ctx.fill();
}
function potionIcon(ctx, item) {
  const isHp = item.id.includes('hp');
  const liquid = isHp ? '#e04a3a' : '#3a6de0';
  ctx.fillStyle = 'rgba(220,235,245,.5)';
  ctx.beginPath(); ctx.arc(0, 6, 14, 0, TAU); ctx.fill();
  ctx.fillStyle = liquid;
  ctx.beginPath(); ctx.arc(0, 6, 14, Math.PI * 0.9, Math.PI * 0.1, true);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.beginPath(); ctx.ellipse(-5, 0, 3.4, 5, -0.5, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(220,235,245,.6)'; ctx.fillRect(-4, -16, 8, 8);
  ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-5, -20, 10, 5);
}
function foodIcon(ctx) {
  ctx.fillStyle = '#d89a4a';
  ctx.beginPath(); ctx.ellipse(0, 2, 16, 12, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#f2d8a8';
  ctx.beginPath(); ctx.ellipse(0, -2, 14, 9, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c8763a';
  for (const [px, py] of [[-6, -3], [2, -5], [7, -1]]) { ctx.beginPath(); ctx.arc(px, py, 2.4, 0, TAU); ctx.fill(); }
}
function scrollIcon(ctx, item) {
  const stone = item.id.includes('stone') || item.id.includes('rune');
  if (stone) {
    const c = item.id.includes('grune') ? '#8fd8ff' : item.id.includes('bw') ? '#a8e2ff' : '#e8c268';
    ctx.fillStyle = metalGrad(ctx, 2, -12, -12, 12, 12);
    ctx.beginPath();
    ctx.moveTo(-13, 6); ctx.lineTo(-8, -12); ctx.lineTo(6, -15); ctx.lineTo(14, -2); ctx.lineTo(8, 14); ctx.lineTo(-6, 14);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(4, -2); ctx.lineTo(-2, 6); ctx.stroke();
    return;
  }
  ctx.fillStyle = '#e8dcc0';
  ctx.fillRect(-13, -16, 26, 32);
  ctx.fillStyle = '#c8b890';
  ctx.fillRect(-15, -18, 30, 5); ctx.fillRect(-15, 13, 30, 5);
  ctx.strokeStyle = '#8a6a9a'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, -1, 6, 0, TAU); ctx.moveTo(0, 5); ctx.lineTo(0, 9); ctx.stroke();
}
function materialIcon(ctx, item) {
  const c = ({ gel: '#8fd86a', tusk: '#e8e0c8', pelt: '#a87848', cap: '#c85a4a', strand: '#e8e8f2',
    insignia: '#c79b47', stinger: '#d8a04a', core: '#ff9a4a', ember: '#ffb56a', wing: '#7a6a8a',
    essence: '#b49fff', fur: '#d8e2ea', shard: '#e0dcc8', plate: '#5a5470', scale: '#7ac8e2',
    bloom: '#a8e0ff' })[Object.keys({ gel: 1, tusk: 1, pelt: 1, cap: 1, strand: 1, insignia: 1, stinger: 1,
    core: 1, ember: 1, wing: 1, essence: 1, fur: 1, shard: 1, plate: 1, scale: 1, bloom: 1 })
    .find(k => item.id.includes(k))] || '#c8b890';
  const g = ctx.createRadialGradient(-4, -6, 2, 0, 0, 16);
  g.addColorStop(0, shade(c, 0.35)); g.addColorStop(0.7, c); g.addColorStop(1, shade(c, -0.35));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-14, 2); ctx.quadraticCurveTo(-12, -14, 0, -14);
  ctx.quadraticCurveTo(14, -12, 13, 2); ctx.quadraticCurveTo(10, 14, 0, 14);
  ctx.quadraticCurveTo(-12, 12, -14, 2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.beginPath(); ctx.ellipse(-4, -6, 4, 2.6, -0.4, 0, TAU); ctx.fill();
}
function questIcon(ctx) {
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill();
  ctx.fillStyle = '#8a6a2a';
  ctx.font = '900 22px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('!', 0, 1);
  ctx.strokeStyle = '#c79b47'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.stroke();
}
function costumeIcon(ctx, item) {
  const c = ({ cos_duelist: '#8a1f3a', cos_scholar: '#1f3a6a', cos_ranger: '#2a5a3a', cos_shadow: '#23233a' })[item.id] || '#555';
  ctx.fillStyle = shade(c, 0.1);
  ctx.beginPath();
  ctx.moveTo(-16, -10); ctx.lineTo(-6, -16); ctx.lineTo(6, -16); ctx.lineTo(16, -10);
  ctx.lineTo(11, 0) ; ctx.lineTo(9, 18); ctx.lineTo(-9, 18); ctx.lineTo(-11, 0);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade(c, 0.45);
  ctx.beginPath(); ctx.moveTo(-6, -16); ctx.lineTo(0, -8); ctx.lineTo(6, -16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-8, 12); ctx.stroke();
  ctx.fillStyle = '#ffd77a'; ctx.beginPath(); ctx.arc(0, 2, 2, 0, TAU); ctx.fill();
}
function eggIcon(ctx, item) {
  const c = ({ egg_emberfox: '#ff9a5a', egg_frostowl: '#9ad8ff', egg_stonepup: '#b0a8a0' })[item.id] || '#e8dcc0';
  const g = ctx.createRadialGradient(-4, -8, 2, 0, 0, 18);
  g.addColorStop(0, shade(c, 0.4)); g.addColorStop(0.7, c); g.addColorStop(1, shade(c, -0.3));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 2, 13, 17, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  for (const [px, py] of [[-4, -6], [5, 0], [-2, 8]]) { ctx.beginPath(); ctx.arc(px, py, 2.2, 0, TAU); ctx.fill(); }
}

/* ---------- skill icons ---------- */
export function paintSkillIcon(canvas, skill) {
  const S = 80;
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, S, S);
  ctx.save(); ctx.translate(S / 2, S / 2);
  const bg = { warrior: ['#5a2a22', '#2e1410'], archer: ['#25482a', '#101f12'], mage: ['#22305a', '#0e1428'] }[skill.cls];
  const g = ctx.createRadialGradient(-8, -10, 4, 0, 0, S * 0.7);
  g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
  ctx.fillStyle = g; ctx.fillRect(-S / 2, -S / 2, S, S);
  (SKILL_GLYPHS[skill.icon] || SKILL_GLYPHS.sword)(ctx);
  ctx.restore();
}

const SKILL_GLYPHS = {
  sword(ctx) { ctx.rotate(-0.7); grad(ctx, '#e8ecf2');
    ctx.beginPath(); ctx.moveTo(-3.4, 12); ctx.lineTo(-2.4, -18); ctx.lineTo(0, -24);
    ctx.lineTo(2.4, -18); ctx.lineTo(3.4, 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8c268'; ctx.fillRect(-9, 12, 18, 3.4); ctx.fillRect(-2, 15, 4, 9); },
  shield(ctx) { grad(ctx, '#c8d2e2');
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.quadraticCurveTo(15, -16, 16, -8);
    ctx.quadraticCurveTo(16, 10, 0, 20); ctx.quadraticCurveTo(-16, 10, -16, -8);
    ctx.quadraticCurveTo(-15, -16, 0, -20); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e8c268'; ctx.lineWidth = 2.4; ctx.stroke(); },
  cleave(ctx) { for (const a of [-0.9, -0.2, 0.5]) { ctx.save(); ctx.rotate(a); grad(ctx, '#ffd7a8');
    ctx.beginPath(); ctx.arc(0, 4, 18, -0.5, 0.6); ctx.lineWidth = 4; ctx.strokeStyle = ctx.fillStyle; ctx.stroke();
    ctx.restore(); } },
  shout(ctx) { grad(ctx, '#ffb56a');
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-4, 0, 8 + i * 7, -0.8, 0.8);
      ctx.lineWidth = 3.4 - i * 0.6; ctx.strokeStyle = ctx.fillStyle; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(-8, 0, 5, 0, TAU); ctx.fill(); },
  bash(ctx) { grad(ctx, '#c8d2e2');
    ctx.beginPath(); ctx.moveTo(-14, -6); ctx.quadraticCurveTo(0, -18, 12, -8);
    ctx.quadraticCurveTo(14, 6, 0, 16); ctx.quadraticCurveTo(-14, 8, -14, -6); ctx.closePath(); ctx.fill();
    star(ctx, 12, -12, 6, '#ffe9a8'); star(ctx, -12, 12, 4, '#ffe9a8'); },
  blood(ctx) { grad(ctx, '#ff6a5a');
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.quadraticCurveTo(14, 2, 0, 18);
    ctx.quadraticCurveTo(-14, 2, 0, -18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(-4, -4, 3, 6, -0.4, 0, TAU); ctx.fill(); },
  rage(ctx) { flame(ctx, '#ff8a4a', 0, 2, 18); flame(ctx, '#ffd77a', 0, 6, 10); },
  quake(ctx) { grad(ctx, '#d8b45a');
    ctx.beginPath(); ctx.moveTo(-18, 10); ctx.lineTo(-6, 8); ctx.lineTo(-2, -14); ctx.lineTo(4, 6);
    ctx.lineTo(10, 2); ctx.lineTo(18, 12); ctx.lineTo(-18, 14); ctx.closePath(); ctx.fill();
    star(ctx, 0, -16, 7, '#ffe9a8'); },
  arrow(ctx) { ctx.rotate(0.78); grad(ctx, '#e8ecf2');
    ctx.fillRect(-1.7, -8, 3.4, 26);
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(-6, -8); ctx.lineTo(6, -8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#cfe8a0';
    ctx.beginPath(); ctx.moveTo(-5, 16); ctx.lineTo(-1.7, 12); ctx.lineTo(-1.7, 18); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(5, 16); ctx.lineTo(1.7, 12); ctx.lineTo(1.7, 18); ctx.closePath(); ctx.fill(); },
  eye(ctx) { grad(ctx, '#cfe8a0');
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.quadraticCurveTo(0, -16, 18, 0);
    ctx.quadraticCurveTo(0, 16, -18, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#22305a'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-2.4, -2.4, 2.4, 0, TAU); ctx.fill(); },
  multi(ctx) { for (const a of [-0.45, 0, 0.45]) { ctx.save(); ctx.rotate(a + 0.78); grad(ctx, '#e8ecf2');
    ctx.fillRect(-1.2, -6, 2.4, 20);
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(-4.4, -7); ctx.lineTo(4.4, -7); ctx.closePath(); ctx.fill();
    ctx.restore(); } },
  poison(ctx) { grad(ctx, '#9fe06a');
    ctx.beginPath(); ctx.moveTo(0, -16); ctx.quadraticCurveTo(13, 2, 0, 16);
    ctx.quadraticCurveTo(-13, 2, 0, -16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2c4a1a'; ctx.beginPath(); ctx.arc(0, 2, 4, 0, TAU); ctx.fill(); },
  boots(ctx) { grad(ctx, '#a8e8c8');
    ctx.beginPath(); ctx.moveTo(-10, -16); ctx.lineTo(-1, -16); ctx.lineTo(0, 2); ctx.lineTo(13, 6);
    ctx.lineTo(13, 13) ; ctx.lineTo(-10, 13); ctx.closePath(); ctx.fill();
    for (const [wx, wy] of [[8, -12], [14, -6], [10, -1]]) { ctx.strokeStyle = '#cfe8ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + 7, wy - 2); ctx.stroke(); } },
  pierce(ctx) { ctx.rotate(0.78); grad(ctx, '#cfe8ff');
    ctx.fillRect(-1.7, -12, 3.4, 30);
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(-6, -12); ctx.lineTo(6, -12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8fd8ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.stroke(); },
  rain(ctx) { for (const [ax, ay] of [[-10, -4], [0, -10], [10, -2]]) { ctx.save(); ctx.translate(ax, ay);
    grad(ctx, '#e8ecf2'); ctx.fillRect(-1.2, -8, 2.4, 14);
    ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(-4, 2); ctx.lineTo(4, 2); ctx.closePath(); ctx.fill();
    ctx.restore(); }
    ctx.strokeStyle = '#cfe8a0'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(0, 22, 14, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); },
  phantom(ctx) { for (let i = 0; i < 3; i++) { ctx.save(); ctx.globalAlpha = 1 - i * 0.3;
    ctx.translate(i * 5 - 5, i * 3 - 3); ctx.rotate(0.78);
    grad(ctx, i === 0 ? '#e8ecf2' : '#8fa8d8'); ctx.fillRect(-1.4, -8, 2.8, 22);
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-5, -8); ctx.lineTo(5, -8); ctx.closePath(); ctx.fill();
    ctx.restore(); } },
  fire(ctx) { flame(ctx, '#ff9a4a', 0, 2, 18); flame(ctx, '#ffe9a8', 0, 7, 9); },
  aegis(ctx) { grad(ctx, '#b49fff');
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU); ctx.lineWidth = 3.4; ctx.strokeStyle = ctx.fillStyle; ctx.stroke();
    ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    star(ctx, 0, 0, 7, '#e8e0ff'); },
  frost(ctx) { grad(ctx, '#a8e0ff'); ctx.lineWidth = 3; ctx.strokeStyle = ctx.fillStyle; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { ctx.save(); ctx.rotate(i * Math.PI / 3);
      ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 18);
      ctx.moveTo(-4, -12); ctx.lineTo(0, -8); ctx.lineTo(4, -12);
      ctx.moveTo(-4, 12); ctx.lineTo(0, 8); ctx.lineTo(4, 12); ctx.stroke(); ctx.restore(); } },
  surge(ctx) { grad(ctx, '#8fd8ff');
    ctx.beginPath(); ctx.moveTo(4, -20); ctx.lineTo(-8, 2); ctx.lineTo(-1, 2); ctx.lineTo(-4, 20);
    ctx.lineTo(9, -4); ctx.lineTo(2, -4); ctx.closePath(); ctx.fill(); },
  nova(ctx) { flame(ctx, '#ff9a4a', -10, 4, 11); flame(ctx, '#ff9a4a', 10, 4, 11); flame(ctx, '#ffd77a', 0, 0, 15); },
  heal(ctx) { grad(ctx, '#a8ffb8');
    ctx.fillRect(-5, -16, 10, 32); ctx.fillRect(-16, -5, 32, 10);
    ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(0, 0, 19, 0, TAU);
    ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2; ctx.stroke(); },
  storm(ctx) { grad(ctx, '#d8c8ff');
    ctx.beginPath(); ctx.moveTo(6, -22); ctx.lineTo(-10, 2); ctx.lineTo(-2, 2); ctx.lineTo(-6, 22);
    ctx.lineTo(11, -4); ctx.lineTo(3, -4); ctx.closePath(); ctx.fill();
    star(ctx, -12, -12, 4, '#fff'); star(ctx, 12, 10, 4, '#fff'); },
  meteor(ctx) { grad(ctx, '#ff9a4a');
    ctx.beginPath(); ctx.arc(4, 6, 10, 0, TAU); ctx.fill();
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = `rgba(255,200,120,${0.8 - i * 0.25})`; ctx.lineWidth = 3 - i * 0.7;
      ctx.beginPath(); ctx.moveTo(4 - i * 5, 6 - i * 3); ctx.lineTo(-16 - i * 2, -16 - i * 2); ctx.stroke(); }
    star(ctx, -14, 12, 4, '#ffe9a8'); },
  food(ctx) { grad(ctx, '#f2d8a8'); ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, 0, 0, TAU); ctx.fill(); },
  tome(ctx) { grad(ctx, '#d9a5ff'); ctx.fillRect(-13, -16, 26, 32);
    ctx.fillStyle = '#fff'; ctx.font = '900 18px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✦', 0, 0); },
  coin(ctx) { grad(ctx, '#ffd77a'); ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.stroke(); },
};
function grad(ctx, c) {
  const g = ctx.createLinearGradient(-14, -14, 14, 16);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, c); g.addColorStop(1, shade(c, -0.35));
  ctx.fillStyle = g;
}
function star(ctx, x, y, r, c) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = c;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, rr = i % 2 === 0 ? r : r * 0.4;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function flame(ctx, c, x, y, r) {
  ctx.save(); ctx.translate(x, y);
  const g = ctx.createLinearGradient(0, -r * 1.6, 0, r);
  g.addColorStop(0, shade(c, 0.3)); g.addColorStop(1, shade(c, -0.2));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.7);
  ctx.quadraticCurveTo(r * 0.9, -r * 0.5, r * 0.7, r * 0.25);
  ctx.quadraticCurveTo(r * 0.5, r, 0, r);
  ctx.quadraticCurveTo(-r * 0.5, r, -r * 0.7, r * 0.25);
  ctx.quadraticCurveTo(-r * 0.9, -r * 0.5, 0, -r * 1.7);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
