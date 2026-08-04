// Combat: basic attacks, skills, damage application, death + loot + respawn.
import { G, emit } from '../core/state.js';
import { dist, rand, chance, randi, clamp, pick } from '../core/util.js';
import { SKILL_BY_ID, val, MAX_RANK } from '../data/skills.js';
import { itemById } from '../data/db.js';
import { recompute, grantExp } from './stats.js';
import { addItem, addGold } from './inventory.js';
import * as fx from '../gfx/particles.js';
import { sfx } from '../core/audio.js';

const BASIC_RANGE = { warrior: 64, archer: 290, mage: 280 };

export function playerBasicRange() { return BASIC_RANGE[G.player.cls]; }

export function tryBasicAttack() {
  const p = G.player, t = G.target;
  if (!p || p.dead || !t || t.dead || t.kind !== 'monster') return false;
  if (p.atkTimer > 0 || p.stunned > 0) return false;
  const d = dist(p.x, p.y, t.x, t.y);
  if (d > playerBasicRange()) return false;

  p.atkTimer = p.d.atkSpd;
  p.atkAnim = 1;
  p.combatTimer = 5;
  p.face = t.x < p.x ? -1 : 1;
  p.dir = Math.abs(t.x - p.x) > Math.abs(t.y - p.y) ? (t.x < p.x ? 1 : 2) : (t.y < p.y ? 3 : 0);

  if (p.cls === 'warrior') {
    sfx.swing();
    dealPlayerDamage(t, p.d.atk, { melee: true });
    fx.slashArc(t.x, t.y - 24, Math.atan2(t.y - p.y, t.x - p.x));
  } else if (p.cls === 'archer') {
    sfx.bow();
    fireProjectile(p, t, { style: 'arrow', dmg: p.d.atk, speed: 620 });
  } else {
    sfx.cast();
    fireProjectile(p, t, { style: 'spark', dmg: p.d.matk, speed: 500, color: '#8fd8ff' });
  }
  return true;
}

export function fireProjectile(from, target, opts) {
  G.projectiles.push({
    x: from.x, y: from.y - 34, target, speed: opts.speed || 500,
    style: opts.style, color: opts.color || '#ffe9c8', dmg: opts.dmg,
    onHit: opts.onHit || null, pierceDef: opts.pierceDef || 0, t: 0,
  });
}

export function updateProjectiles(dt) {
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const pr = G.projectiles[i];
    pr.t += dt;
    const t = pr.target;
    if (!t || t.dead) { G.projectiles.splice(i, 1); continue; }
    const ty = t.y - 26;
    const d = dist(pr.x, pr.y, t.x, ty);
    const step = pr.speed * dt;
    if (d <= step + 14) {
      G.projectiles.splice(i, 1);
      if (pr.onHit) pr.onHit(t);
      else dealPlayerDamage(t, pr.dmg, { pierceDef: pr.pierceDef });
      continue;
    }
    pr.x += (t.x - pr.x) / d * step;
    pr.y += (ty - pr.y) / d * step;
    if (pr.style === 'spark' || pr.style === 'fire' || pr.style === 'frost') {
      fx.spawn({ x: pr.x, y: pr.y, vx: rand(-14, 14), vy: rand(-14, 14), life: 0.28,
        size: rand(2, 4), color: pr.color, glow: true, gravity: 0 });
    }
  }
}

export function dealPlayerDamage(mon, raw, opts = {}) {
  const p = G.player;
  if (!mon || mon.dead) return 0;
  const isCrit = chance(p.d.crit / 100);
  const defEff = mon.data.def * (1 - (opts.pierceDef || 0));
  let dmg = Math.max(1, raw * rand(0.92, 1.08) - defEff);
  if (isCrit) dmg *= 1.6;
  dmg = Math.round(dmg);
  mon.hp -= dmg;
  mon.flash = 1;
  mon.hurtBy();
  p.combatTimer = 5;
  sfx.hit();
  fx.floatText(mon.x, mon.y - 46 * (mon.data.size || 1), String(dmg),
    { color: isCrit ? '#ffd77a' : '#ffffff', crit: isCrit, kind: 'dmg' });
  fx.burst(mon.x, mon.y - 24, '#ffb1a5', 6, 90, { size: 4, life: 0.4 });
  if (p.d.lifesteal > 0) {
    const heal = Math.round(dmg * p.d.lifesteal);
    p.hp = clamp(p.hp + heal, 0, p.d.hpMax);
    fx.floatText(p.x, p.y - 70, '+' + heal, { color: '#8fe08f', size: 12 });
  }
  if (mon.hp <= 0) killMonster(mon);
  emit('monsterHurt', mon, dmg);
  return dmg;
}

export function monsterAttackPlayer(mon) {
  const p = G.player;
  if (!p || p.dead) return;
  if (chance(p.d.eva / 100)) {
    fx.floatText(p.x, p.y - 66, 'MISS', { color: '#9fd2ff', size: 12 });
    return;
  }
  let dmg = Math.max(1, mon.data.atk * rand(0.9, 1.1) - p.d.def * 0.6);
  dmg = Math.round(dmg);
  // mana shield soaks a portion into MP
  if (p.d.manashield > 0 && p.mp > 0) {
    const soak = Math.min(Math.round(dmg * p.d.manashield), p.mp);
    p.mp -= soak; dmg -= soak;
  }
  p.hp -= dmg;
  p.combatTimer = 5;
  sfx.hurt();
  fx.shake(3 + Math.min(6, dmg / 20));
  fx.floatText(p.x, p.y - 70, String(dmg), { color: '#ff8a7a', kind: 'dmg' });
  emit('playerHurt', dmg, mon);
  if (p.hp <= 0) playerDie(mon);
}

function killMonster(mon) {
  const p = G.player;
  mon.dead = true;
  mon.deadT = 0;
  G.entities = G.entities.filter(e => e !== mon);
  if (G.target === mon) G.target = null;

  fx.burst(mon.x, mon.y - 20, mon.data.tint || '#c8c8d8', 16, 150, { life: 0.8 });
  fx.ringFx(mon.x, mon.y - 16, 'rgba(255,240,220,1)'.startsWith('#') ? '#fff' : '#fff0dc', 40);

  // EXP with level-gap falloff
  const gap = p.level - mon.data.lvl;
  const mult = gap >= 10 ? 0.1 : gap >= 6 ? 0.5 : 1;
  const res = grantExp(p, Math.round(mon.data.exp * mult));
  if (res.amount > 0) fx.floatText(mon.x, mon.y - 60, `+${res.amount} EXP`, { color: '#d9a5ff', size: 12 });

  // gold + drops fly to player
  const gold = randi(mon.data.gold[0], mon.data.gold[1]);
  G.lootFly.push({ x: mon.x + rand(-14, 14), y: mon.y - 10, kind: 'gold', amt: gold, t: 0, delay: 0.1 });
  for (const dr of mon.data.drops || []) {
    if (chance(dr.ch)) {
      G.lootFly.push({ x: mon.x + rand(-18, 18), y: mon.y - 10 + rand(-8, 8),
        kind: 'item', id: dr.id, t: 0, delay: rand(0.15, 0.45) });
    }
  }

  // respawn scheduling
  if (mon.area) {
    G.zone.respawnQueue.push({ monsterId: mon.data.id, area: mon.area, at: rand(8, 16) });
  } else if (mon.data.boss) {
    G.flags['bossDown_' + mon.data.id] = Date.now();
  }

  p.kills[mon.data.id] = (p.kills[mon.data.id] || 0) + 1;
  p.counters.total_kills++;
  if (mon.data.boss) p.counters.bosses++;
  emit('monsterKilled', mon);
  if (res.leveled) emit('levelUp');
}

export function updateLootFly(dt) {
  const p = G.player;
  for (let i = G.lootFly.length - 1; i >= 0; i--) {
    const l = G.lootFly[i];
    if (l.delay > 0) { l.delay -= dt; continue; }
    l.t += dt;
    const speed = 200 + l.t * 900;
    const d = dist(l.x, l.y, p.x, p.y - 30);
    if (d < 22) {
      G.lootFly.splice(i, 1);
      if (l.kind === 'gold') { addGold(l.amt); sfx.coin(); }
      else {
        const it = itemById(l.id);
        if (it && addItem(l.id, 1)) { sfx.loot(); emit('itemLooted', it); }
        else if (it) emit('bagFull', it);
      }
      continue;
    }
    l.x += (p.x - l.x) / d * speed * dt;
    l.y += (p.y - 30 - l.y) / d * speed * dt;
  }
}

function playerDie(mon) {
  const p = G.player;
  p.hp = 0;
  p.dead = true;
  p.counters.deaths++;
  sfx.die();
  fx.shake(10);
  emit('playerDied', mon);
}

/* ---------------- skills ---------------- */
export function castSkill(skillId) {
  const p = G.player, t = G.target;
  const sk = SKILL_BY_ID[skillId];
  if (!sk || p.dead || p.stunned > 0) return false;
  const rank = p.skillRanks[skillId] || 0;
  if (rank <= 0) return false;
  if (p.cooldowns[skillId] > 0) return false;
  const mpCost = Math.round(val(sk.mp, rank));
  if (p.mp < mpCost) { emit('noMana'); return false; }

  const needsTarget = sk.kind === 'strike' || sk.kind === 'dot' || (sk.kind === 'aoe' && sk.range > 0);
  let tgt = t && t.kind === 'monster' && !t.dead ? t : null;
  if (needsTarget) {
    if (!tgt) { emit('noTarget'); return false; }
    const maxR = sk.range + (sk.kind === 'aoe' ? 0 : 6);
    if (dist(p.x, p.y, tgt.x, tgt.y) > maxR) { emit('outOfRange'); return false; }
  }

  p.mp -= mpCost;
  p.cooldowns[skillId] = val(sk.cd, rank);
  p.combatTimer = 5;
  p.castAnim = 1; p.atkAnim = 1;
  if (tgt) { p.face = tgt.x < p.x ? -1 : 1; }

  const power = sk.power ? val(sk.power, rank) : 0;
  const base = p.cls === 'mage' ? p.d.matk : p.d.atk;

  switch (sk.kind) {
    case 'strike': castStrike(sk, rank, tgt, base * power); break;
    case 'aoe': castAoe(sk, rank, tgt, base * power); break;
    case 'dot': castDot(sk, rank, tgt, base * power); break;
    case 'buff': castBuff(sk, rank); break;
    case 'heal': {
      const heal = Math.round(p.d.matk * val(sk.heal, rank));
      p.hp = clamp(p.hp + heal, 0, p.d.hpMax);
      fx.healBurst(p.x, p.y);
      fx.floatText(p.x, p.y - 70, '+' + heal, { color: '#8fe08f' });
      sfx.heal();
      break;
    }
  }
  emit('skillCast', sk);
  return true;
}

function castStrike(sk, rank, tgt, dmg) {
  const p = G.player;
  const hitOnce = (target, mult = 1, delay = 0) => {
    if (p.cls === 'warrior') {
      dealPlayerDamage(target, dmg * mult, { pierceDef: sk.pierceDef ? val(sk.pierceDef, rank) : 0 });
      fx.slashArc(target.x, target.y - 24, Math.atan2(target.y - p.y, target.x - p.x), '#ffd77a', 52);
      sfx.hit();
    } else {
      fireProjectile(p, target, {
        style: sk.fx.startsWith('arrow') ? 'arrow' : sk.fx.includes('frost') ? 'frost' : 'fire',
        color: sk.fx.includes('frost') ? '#a8e0ff' : sk.fx.includes('chain') ? '#c8b4ff' : sk.fx.startsWith('arrow') ? '#ffe9c8' : '#ffb56a',
        speed: 560, dmg: 0,
        onHit: target2 => {
          dealPlayerDamage(target2, dmg * mult, { pierceDef: sk.pierceDef ? val(sk.pierceDef, rank) : 0 });
          if (sk.slow) { target2.slowUntil = val(sk.slow.dur, rank); target2.slowPct = sk.slow.pct; sfx.frost(); }
          if (sk.chains && mult > 0.4) chainTo(sk, rank, target2, dmg * (sk.chainFalloff || 0.7));
        },
      });
      if (p.cls === 'archer') sfx.bow(); else sfx.cast();
    }
    if (sk.stun) { tgt.stunned = Math.max(tgt.stunned, val(sk.stun, rank)); sfx.stun();
      fx.floatText(tgt.x, tgt.y - 64, '✦ STUN', { color: '#ffe9a8', size: 12 }); }
  };
  const hits = sk.hits || 1;
  for (let h = 0; h < hits; h++) {
    setTimeout(() => { if (tgt && !tgt.dead) hitOnce(tgt, 1); }, h * 130);
  }
}

function chainTo(sk, rank, from, dmg) {
  let n = sk.chains - 1;
  let src = from;
  const seen = new Set([from]);
  while (n-- > 0) {
    const next = nearestMonster(src.x, src.y, 150, seen);
    if (!next) break;
    seen.add(next);
    fx.spawn({ x: (src.x + next.x) / 2, y: (src.y + next.y) / 2 - 26, life: 0.2, size: 6, color: '#c8b4ff', glow: true });
    zapLine(src, next);
    dealPlayerDamage(next, dmg);
    dmg *= sk.chainFalloff || 0.7;
    src = next;
  }
  sfx.thunder();
}
function zapLine(a, b) {
  const steps = 7;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    fx.spawn({ x: a.x + (b.x - a.x) * t + rand(-8, 8), y: a.y - 26 + (b.y - a.y) * t + rand(-8, 8),
      life: 0.22, size: 3.4, color: '#d8c8ff', glow: true, gravity: 0 });
  }
}

function castAoe(sk, rank, tgt, dmg) {
  const p = G.player;
  const cx = sk.range === 0 ? p.x : tgt.x;
  const cy = sk.range === 0 ? p.y : tgt.y;
  const radius = sk.radius;
  const apply = () => {
    for (const e of monstersIn(cx, cy, radius)) dealPlayerDamage(e, dmg);
  };
  if (sk.fx === 'quake') {
    fx.shake(9); sfx.thunder();
    fx.ringFx(cx, cy, '#d8b45a', radius);
    fx.burst(cx, cy, '#a8906a', 22, 200, { gravity: 300, size: 6 });
    apply();
  } else if (sk.fx === 'nova_fire') {
    sfx.fire(); fx.ringFx(cx, cy - 10, '#ffb56a', radius);
    fx.burst(cx, cy - 16, '#ff9a4a', 26, 240, { life: 0.7 });
    apply();
  } else if (sk.fx === 'meteor') {
    sfx.cast();
    for (let i = 0; i < 3; i++) {
      const mx = cx + rand(-radius * 0.5, radius * 0.5), my = cy + rand(-radius * 0.4, radius * 0.4);
      setTimeout(() => {
        fx.burst(mx, my - 10, '#ff9a4a', 20, 220, { life: 0.8 });
        fx.ringFx(mx, my, '#ffb56a', 60);
        fx.shake(6); sfx.fire();
        for (const e of monstersIn(mx, my, 80)) dealPlayerDamage(e, dmg * 0.6);
      }, 220 + i * 260);
    }
  } else if (sk.fx === 'arrow_rain') {
    sfx.bow();
    for (let i = 0; i < 8; i++) {
      const mx = cx + rand(-radius, radius) * 0.8, my = cy + rand(-radius, radius) * 0.6;
      setTimeout(() => {
        fx.spawn({ x: mx, y: my - 60, vx: 0, vy: 500, life: 0.14, size: 4, color: '#ffe9c8', glow: true });
        fx.burst(mx, my, '#cfe8a0', 4, 80, { life: 0.3, size: 3 });
        for (const e of monstersIn(mx, my, 40)) dealPlayerDamage(e, dmg * 0.55);
      }, 150 + i * 90);
    }
  } else { // cleave / multi
    if (p.cls === 'warrior') { sfx.swing(); fx.slashArc(p.x + p.face * 40, p.y - 24, p.face === 1 ? 0 : Math.PI, '#ffd77a', 70); }
    else sfx.bow();
    apply();
  }
}

function castDot(sk, rank, tgt, dmg) {
  const p = G.player;
  fireProjectile(p, tgt, {
    style: 'arrow', color: '#9fe06a', speed: 560, dmg: 0,
    onHit: t2 => {
      dealPlayerDamage(t2, dmg);
      const total = (p.cls === 'mage' ? p.d.matk : p.d.atk) * val(sk.dot.pct, rank);
      const ticks = Math.floor(sk.dot.dur / sk.dot.tick);
      t2.dots.push({ dmg: Math.max(1, Math.round(total / ticks)), tick: sk.dot.tick, ticksLeft: ticks, t: sk.dot.tick });
      fx.floatText(t2.x, t2.y - 58, '☠', { color: '#9fe06a', size: 14 });
    },
  });
  sfx.bow();
}

export function applyDotTick(mon, dot) {
  if (mon.dead) return;
  mon.hp -= dot.dmg;
  mon.flash = 0.5;
  fx.floatText(mon.x, mon.y - 44, String(dot.dmg), { color: '#9fe06a', size: 12, kind: 'dmg' });
  if (mon.hp <= 0) killMonster(mon);
}

function castBuff(sk, rank) {
  const p = G.player;
  const b = sk.buff;
  const buff = { id: sk.id, stat: b.stat, until: val(sk.dur, rank), icon: sk.icon };
  if (b.pct !== undefined) buff.pct = val(b.pct, rank);
  if (b.add !== undefined) buff.add = val(b.add, rank);
  if (b.atkPct !== undefined) buff.atkPct = val(b.atkPct, rank);
  if (b.defPct !== undefined) buff.defPct = val(b.defPct, rank);
  if (b.evaAdd !== undefined) buff.evaAdd = val(b.evaAdd, rank);
  p.buffs = p.buffs.filter(x => x.id !== sk.id);
  p.buffs.push(buff);
  recompute(p);
  sfx.buff();
  const col = { buff_earth: '#c8a868', buff_fire: '#ff9a6a', buff_wind: '#a8e8c8',
    buff_arcane: '#b49fff', buff_blood: '#ff7a6b', buff_rage: '#ff8a4a' }[sk.fx] || '#ffe9c8';
  fx.ringFx(p.x, p.y - 20, col, 60);
  emit('statsDirty');
}

export function monstersIn(x, y, r, exclude = null) {
  const out = [];
  for (const e of G.entities) {
    if (e.kind !== 'monster' || e.dead || e === exclude) continue;
    if (dist(x, y, e.x, e.y) <= r + 18 * (e.data.size || 1)) out.push(e);
  }
  return out;
}
export function nearestMonster(x, y, r, excludeSet = null) {
  let best = null, bd = r;
  for (const e of G.entities) {
    if (e.kind !== 'monster' || e.dead || (excludeSet && excludeSet.has(e))) continue;
    const d = dist(x, y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
