// Emberveil — boot, game loop, renderer, screens.
import { G, on, emit } from './core/state.js';
import { $, $$, el, clamp, lerp, dist, TILE } from './core/util.js';
import { initInput, input, keyboardMove } from './core/input.js';
import { initAudio, sfx, startMusic, stopMusic } from './core/audio.js';
import { listSlots, saveSlot, loadSlot, deleteSlot, snapshot } from './core/save.js';
import { CLASSES, HAIR_COLORS, expNeed } from './data/classes.js';
import { LORE, npcById, itemById } from './data/db.js';
import { loadZone, updateRespawns, portalNear, zoneBlurb, isBlockedPx } from './world/world.js';
import { Player } from './world/entities.js';
import { recompute } from './game/stats.js';
import { tryBasicAttack, updateProjectiles, updateLootFly, applyDotTick, castSkill } from './game/combat.js';
import { usePotionSlot, countItem, removeItem } from './game/inventory.js';
import { initQuestTracking, npcMarker } from './game/quests.js';
import { initPremium, setActivePet, checkAchievements } from './game/premium.js';
import { initHud, updateHud, drawMinimap, refreshIdentity, refreshSkillBar, autoTargetNearest, log, toast, banner } from './ui/hud.js';
import { openWindow, closeWindow, currentWindow, toggleWindow } from './ui/windows.js';
import { drawPlayerChar, drawMonster, drawNpcSprite, drawPet, drawPortal, drawShadow, glowColor } from './gfx/sprites.js';
import { drawProp } from './gfx/props.js';
import * as fx from './gfx/particles.js';
import { ZONES } from './data/zones.js';

const TAU = Math.PI * 2;

/* ================== boot ================== */
function boot() {
  G.canvas = $('#game');
  G.ctx = G.canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  initAudio();
  showTitle();
  requestAnimationFrame(frame);
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  G.dpr = dpr;
  const cssW = window.innerWidth, cssH = window.innerHeight;
  G.canvas.width = Math.round(cssW * dpr);
  G.canvas.height = Math.round(cssH * dpr);
  G.viewW = cssW; G.viewH = cssH;
  G.zoom = clamp(Math.min(cssW, cssH * 1.2) / 560, 0.68, 1.5);
  checkOrientation();
}

// Landscape-only: gate the whole game behind a rotate prompt while portrait.
function checkOrientation() {
  const portrait = window.innerHeight > window.innerWidth;
  $('#rotate-overlay').classList.toggle('hidden', !portrait);
  G.paused = portrait;
  if (portrait && G.running) emit('requestSave'); // don't lose progress mid-rotate
}
window.addEventListener('orientationchange', () => setTimeout(resize, 250));

/* ================== title & creation screens ================== */
let titleAnim = null;

function showTitle() {
  $('#screen-title').classList.remove('hidden');
  $('#hud').classList.add('hidden');
  renderSlots();
  const cv = $('#title-cv');
  const paint = () => {
    cv.width = cv.clientWidth * G.dpr; cv.height = cv.clientHeight * G.dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(G.dpr, G.dpr);
    const w = cv.clientWidth, h = cv.clientHeight;
    const t = performance.now() / 1000;
    // night sky over Lumenhold
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0a0d1e'); sky.addColorStop(0.55, '#1a1430'); sky.addColorStop(1, '#3a2038');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // stars
    for (let i = 0; i < 90; i++) {
      const sx = (i * 137.5) % w, sy = ((i * 89.7) % (h * 0.6));
      const tw = 0.4 + Math.sin(t * 1.5 + i) * 0.3;
      ctx.fillStyle = `rgba(230,238,255,${tw})`;
      ctx.fillRect(sx, sy, 1.6, 1.6);
    }
    // the torn Veil aurora
    for (let b = 0; b < 3; b++) {
      const g = ctx.createLinearGradient(0, h * 0.1, 0, h * 0.5);
      g.addColorStop(0, `rgba(143,216,255,0)`);
      g.addColorStop(0.5, `rgba(${120 + b * 30},${180 - b * 20},255,${0.05 + Math.sin(t * 0.6 + b * 2) * 0.02})`);
      g.addColorStop(1, 'rgba(143,216,255,0)');
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(w / 2, h * 0.28);
      ctx.rotate(Math.sin(t * 0.14 + b) * 0.12 + (b - 1) * 0.28);
      ctx.fillRect(-w, -h * 0.16, w * 2, h * 0.32);
      ctx.restore();
    }
    // distant city silhouette + lanterns
    ctx.fillStyle = '#0b0a18';
    for (let i = 0; i < 12; i++) {
      const bw = 30 + ((i * 73) % 60), bh = 40 + ((i * 131) % 110);
      const bx = (i / 12) * w;
      ctx.fillRect(bx, h - bh - 40, bw, bh + 40);
      if (i % 2 === 0) {
        ctx.fillStyle = `rgba(255,200,120,${0.5 + Math.sin(t * 3 + i) * 0.2})`;
        ctx.fillRect(bx + bw * 0.3, h - bh - 20, 4, 6);
        ctx.fillStyle = '#0b0a18';
      }
    }
    // drifting embers
    for (let i = 0; i < 26; i++) {
      const ph = (t * 0.05 + i / 26) % 1;
      const ex = ((i * 197) % w) + Math.sin(t * 0.8 + i) * 30;
      const ey = h - ph * h;
      ctx.fillStyle = `rgba(255,${140 + (i % 3) * 30},80,${0.5 * (1 - ph)})`;
      ctx.beginPath(); ctx.arc(ex, ey, 1.6 + (i % 3), 0, TAU); ctx.fill();
    }
    titleAnim = requestAnimationFrame(paint);
  };
  cancelAnimationFrame(titleAnim);
  paint();
}

function renderSlots() {
  const slotsEl = $('#slots');
  slotsEl.innerHTML = '';
  listSlots().forEach((s, i) => {
    const b = el('button', 'slot-btn');
    if (s) {
      b.innerHTML = `<span class="sdel" data-del="${i}">🗑</span><div class="sn">${s.name}</div>
        <div class="sd">Lv.${s.level} ${CLASSES[s.cls].name} · ${ZONES[s.zone]?.name || 'Lumenhold'} · 🪙${s.gold} · 💎${s.plat}</div>`;
      b.addEventListener('click', e => {
        if (e.target.dataset.del !== undefined) {
          if (confirm(`Delete ${s.name} forever?`)) { deleteSlot(i); renderSlots(); }
          return;
        }
        startGame(i, s);
      });
    } else {
      b.innerHTML = `<div class="sn" style="color:var(--ink-dim)">✧ New Veilwalker</div><div class="sd">Begin your tale</div>`;
      b.addEventListener('click', () => showCreate(i));
    }
    slotsEl.appendChild(b);
  });
}

let createCls = null, createHair = null, createSlot = 0;
function showCreate(slot) {
  createSlot = slot;
  createCls = null; createHair = HAIR_COLORS[0];
  $('#screen-title').classList.add('hidden');
  $('#screen-create').classList.remove('hidden');
  const cards = $('#class-cards');
  cards.innerHTML = '';
  for (const cid of ['warrior', 'archer', 'mage']) {
    const c = CLASSES[cid];
    const card = el('div', 'class-card');
    const cv = document.createElement('canvas');
    cv.width = 152; cv.height = 192;
    card.appendChild(cv);
    card.appendChild(el('div', 'cn', c.name));
    card.appendChild(el('div', 'cd2', c.order));
    const ctx = cv.getContext('2d');
    ctx.translate(76, 172); ctx.scale(2, 2);
    drawPlayerChar(ctx, 0, 0, { cls: cid, hair: c.look.hairDefault, equip: {} }, { dir: 0, t: 0.3 });
    card.addEventListener('click', () => {
      createCls = cid;
      $$('.class-card').forEach(x => x.classList.remove('sel'));
      card.classList.add('sel');
      $('#create-detail').innerHTML = `<b style="color:var(--gold)">${c.tag}.</b> ${c.blurb}<br>
        <span style="color:#8fd8ff">${LORE.classIntro?.[cid] || ''}</span>`;
      updateCreateBtn();
      sfx.click();
    });
    cards.appendChild(card);
  }
  const hp = $('#hair-pick');
  hp.innerHTML = '';
  HAIR_COLORS.forEach((h, i) => {
    const b = el('button', i === 0 ? 'sel' : '');
    b.style.background = h;
    b.addEventListener('click', () => {
      createHair = h;
      $$('#hair-pick button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    });
    hp.appendChild(b);
  });
  $('#create-name').value = '';
  $('#create-name').addEventListener('input', updateCreateBtn);
  $('#btn-create-back').onclick = () => {
    $('#screen-create').classList.add('hidden');
    $('#screen-title').classList.remove('hidden');
  };
  $('#btn-create').onclick = () => {
    const name = $('#create-name').value.trim() || 'Veilwalker';
    const c = CLASSES[createCls];
    const firstSkill = { warrior: 'crush', archer: 'powershot', mage: 'emberbolt' }[createCls];
    const profile = {
      name, cls: createCls, hair: createHair,
      level: 1, exp: 0, stats: { ...c.base }, statPoints: 0, skillPoints: 0,
      skillRanks: { [firstSkill]: 1 }, skillSlots: [firstSkill, null, null, null],
      gold: 40, plat: 20, hp: 9999, mp: 9999,
    };
    $('#screen-create').classList.add('hidden');
    showIntro(() => startGame(createSlot, profile, true));
  };
  updateCreateBtn();
}
function updateCreateBtn() {
  $('#btn-create').disabled = !createCls || !$('#create-name').value.trim();
}

function showIntro(done) {
  const scr = $('#screen-intro');
  scr.classList.remove('hidden');
  const t = $('#intro-text');
  t.innerHTML = '';
  (LORE.intro || ['The Veil is torn.']).forEach((p, i) => {
    const pe = el('p', null, p);
    pe.style.animationDelay = (i * 2.2) + 's';
    t.appendChild(pe);
  });
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    scr.classList.add('hidden');
    done();
  };
  $('#btn-intro-skip').onclick = finish;
  setTimeout(finish, (LORE.intro?.length || 1) * 2200 + 2600);
}

/* ================== game start ================== */
function startGame(slot, profile, isNew = false) {
  cancelAnimationFrame(titleAnim);
  G.slot = slot;
  G.flags = { ...(profile.flags || {}) };
  if (profile.settings) Object.assign(G.settings, profile.settings);

  const p = new Player(profile);
  G.player = p;
  recompute(p);
  if (isNew) {
    p.hp = p.d.hpMax; p.mp = p.d.mpMax;
    // starter kit
    const starterWeapon = { warrior: 'w_war_1', archer: 'w_arc_1', mage: 'w_mag_1' }[p.cls];
    p.equip.weapon = { id: starterWeapon, plus: 0, lvl: 1 };
    p.inv[0] = { id: 'p_hp_1', qty: 5 };
    p.inv[1] = { id: 'scroll_return', qty: 2 };
    recompute(p);
  } else {
    p.hp = Math.min(profile.hp ?? p.d.hpMax, p.d.hpMax);
    p.mp = Math.min(profile.mp ?? p.d.mpMax, p.d.mpMax);
    if (profile.pet?.id) setActivePet(profile.pet.id);
  }

  initHud();
  initInput();
  initQuestTracking();
  initPremium();
  refreshIdentity();
  refreshSkillBar();

  const zoneId = profile.zone || 'lumenhold';
  transitionZone(zoneId, isNew ? null : [profile.x, profile.y], true);

  $('#screen-title').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  G.running = true;
  if (isNew) {
    setTimeout(() => {
      banner('LUMENHOLD', 'The last free city');
      log(`Welcome, ${p.name}. Seek <b>Captain Aldric</b> by the plaza — the ! marks those who need you.`, 'l-quest');
    }, 600);
  }
  checkAchievements();
  emit('requestSave');
}

let transitionLock = 0;
function transitionZone(zoneId, pos = null, instant = false) {
  const scr = $('#screen-load');
  const doLoad = () => {
    loadZone(zoneId, pos);
    const def = ZONES[zoneId];
    G.ui.zoneName.textContent = def.name;
    transitionLock = 1.2; // ignore portals briefly
    emit('requestSave');
  };
  if (instant) { doLoad(); return; }
  $('#load-zone').textContent = ZONES[zoneId].name;
  $('#load-blurb').textContent = zoneBlurb(zoneId);
  scr.classList.remove('hidden');
  sfx.portal();
  setTimeout(() => { doLoad(); }, 250);
  setTimeout(() => scr.classList.add('hidden'), 1500);
}

on('teleport', dest => { if (G.running && !G.player.dead) transitionZone(dest); });
on('requestSave', () => { if (G.player) saveSlot(G.slot, snapshot(G)); });
on('dotTick', (mon, dot) => applyDotTick(mon, dot));
on('playerDied', () => {
  const need = expNeed(G.player.level);
  $('#dead-sub').textContent = `The Veil pulls you back… (–${Math.round(need * 0.05)} EXP unless a Phoenix Feather burns)`;
  $('#screen-dead').classList.remove('hidden');
  $('#btn-feather').classList.toggle('hidden', countItem('plat_feather') < 1);
});
/* death buttons (wired once DOM ready) */
function wireDeathButtons() {
  $('#btn-respawn').addEventListener('click', () => {
    const p = G.player;
    p.exp = Math.max(0, p.exp - Math.round(expNeed(p.level) * 0.05));
    p.dead = false;
    p.hp = p.d.hpMax; p.mp = p.d.mpMax;
    $('#screen-dead').classList.add('hidden');
    transitionZone('lumenhold');
  });
  $('#btn-feather').addEventListener('click', () => {
    const p = G.player;
    if (countItem('plat_feather') < 1) return;
    removeItem('plat_feather', 1);
    p.dead = false;
    p.hp = p.d.hpMax; p.mp = Math.round(p.d.mpMax * 0.5);
    $('#screen-dead').classList.add('hidden');
    fx.ringFx(p.x, p.y - 20, '#ffb56a', 90);
    sfx.levelup();
    toast('🔥 The feather burns — you rise!', true);
  });
}

/* ================== keyboard shortcuts ================== */
window.addEventListener('keydown', e => {
  if (!G.running || !G.player) return;
  const k = e.key.toLowerCase();
  if (k >= '1' && k <= '4') { const id = G.player.skillSlots[+k - 1]; if (id) castSkill(id); }
  else if (k === ' ' || k === 'j') { if (!G.target || G.target.dead) autoTargetNearest(); tryBasicAttack(); }
  else if (k === 'b') toggleWindow('inv');
  else if (k === 'c') toggleWindow('char');
  else if (k === 'k') toggleWindow('skills');
  else if (k === 'q') toggleWindow('quest');
  else if (k === 'm') toggleWindow('map');
  else if (k === 'escape') closeWindow();
  else if (k === 'e') interactNearby();
  else if (k === 'r') usePotionSlot(0);
  else if (k === 'f') usePotionSlot(1);
});

/* ================== interaction ================== */
let nearNpc = null;
function interactNearby() {
  if (nearNpc) { openWindow('dialog', nearNpc.data); sfx.open(); }
}
$('#btn-interact').addEventListener('click', interactNearby);

/* ================== main loop ================== */
let last = 0, saveTimer = 0, minimapTimer = 0, hudTimer = 0;

function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
  last = ts;
  if (!G.running || !G.player || !G.zone || G.paused) return;
  G.time += dt;
  update(dt);
  draw();
}

function update(dt) {
  const p = G.player;
  transitionLock = Math.max(0, transitionLock - dt);
  p.playSeconds += dt;

  // world clock: 1 real second = 1 world minute (24 min day)
  G.worldClock = (G.worldClock + dt) % 1440;

  // movement input
  const kb = keyboardMove();
  const mv = kb || (input.moveX || input.moveY ? [input.moveX, input.moveY] : null);
  p.update(dt, mv);

  // tap targeting
  if (input.tap) {
    const { x, y } = input.tap;
    input.tap = null;
    let best = null, bd = 48;
    for (const e of G.entities) {
      if (e.dead) continue;
      const r = e.kind === 'monster' ? 40 * (e.data.size || 1) : 44;
      const d = dist(x, y, e.x, e.y - 20);
      if (d < r + 8 && d < bd + r) { best = e; bd = d; }
    }
    if (best) {
      if (best.kind === 'monster') { G.target = best; sfx.click(); }
      else if (best.kind === 'npc') {
        if (dist(p.x, p.y, best.x, best.y) < 150) { nearNpc = best; interactNearby(); }
        else log(`${best.data.name} is too far away.`, 'l-sys');
      }
    }
  }

  // auto attack
  if (p.auto && !p.dead) {
    if (!G.target || G.target.dead) autoTargetNearest();
    tryBasicAttack();
  }

  // entities
  for (const e of G.entities) e.update(dt);
  if (p.petEntity) p.petEntity.update(dt);
  updateProjectiles(dt);
  updateLootFly(dt);
  updateRespawns(dt);
  fx.update(dt);

  // portals
  if (transitionLock <= 0 && !p.dead) {
    const portal = portalNear(p.x, p.y);
    if (portal) {
      if (portal.minLvl && p.level < portal.minLvl) {
        if (!portal.warned || G.time - portal.warned > 4) {
          portal.warned = G.time;
          log(`The gate resists you — reach level ${portal.minLvl} first.`, 'l-dmg');
        }
      } else {
        transitionZone(portal.to, [(portal.dest[0] + 0.5) * TILE, (portal.dest[1] + 0.5) * TILE]);
        return;
      }
    }
  }

  // near-npc talk button
  let nn = null, nd = 120;
  for (const e of G.entities) {
    if (e.kind !== 'npc') continue;
    const d = dist(p.x, p.y, e.x, e.y);
    if (d < nd) { nd = d; nn = e; }
  }
  nearNpc = nn;
  $('#btn-interact').classList.toggle('hidden', !nn || currentWindow() !== null);

  // timers
  hudTimer += dt;
  if (hudTimer > 0.12) { hudTimer = 0; updateHud(); }
  minimapTimer += dt;
  if (minimapTimer > 0.35) { minimapTimer = 0; drawMinimap(); }
  saveTimer += dt;
  if (saveTimer > 20) { saveTimer = 0; emit('requestSave'); }
}

/* ================== renderer ================== */
function ambientColor() {
  const biome = G.zone.def.biome;
  if (biome === 'cave') return [72, 64, 108, 0.55];
  const m = G.worldClock; // minutes 0..1440
  const keys = [ // [minute, r,g,b, strength]
    [0, 60, 80, 160, 0.5], [300, 60, 80, 160, 0.5], [360, 255, 190, 140, 0.25],
    [480, 255, 255, 255, 0], [900, 255, 255, 255, 0], [1110, 255, 180, 120, 0.28],
    [1230, 90, 100, 180, 0.45], [1440, 60, 80, 160, 0.5],
  ];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (m >= a[0] && m <= b[0]) {
      const t = (m - a[0]) / (b[0] - a[0] || 1);
      return [lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t), lerp(a[4], b[4], t)];
    }
  }
  return [255, 255, 255, 0];
}
export function isNight() {
  return G.zone?.def.biome === 'cave' || G.worldClock < 330 || G.worldClock > 1140;
}

function draw() {
  const ctx = G.ctx, p = G.player, z = G.zone;
  const [shx, shy] = fx.getShake();
  const viewWw = G.viewW / G.zoom, viewHw = G.viewH / G.zoom;
  G.cam.x = clamp(p.x - viewWw / 2, 0, Math.max(0, z.W - viewWw)) + shx;
  G.cam.y = clamp(p.y - viewHw / 2, 0, Math.max(0, z.H - viewHw)) + shy;

  ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
  ctx.fillStyle = '#0b0e1a';
  ctx.fillRect(0, 0, G.viewW, G.viewH);
  ctx.save();
  ctx.scale(G.zoom, G.zoom);
  ctx.translate(-G.cam.x, -G.cam.y);

  // terrain chunks in view
  const t = z.terrain;
  const chunkPx = 8 * TILE;
  const cx0 = Math.floor(G.cam.x / chunkPx), cy0 = Math.floor(G.cam.y / chunkPx);
  const cx1 = Math.ceil((G.cam.x + viewWw) / chunkPx), cy1 = Math.ceil((G.cam.y + viewHw) / chunkPx);
  for (let cy = Math.max(0, cy0); cy < Math.min(t.chunksY, cy1); cy++) {
    for (let cx = Math.max(0, cx0); cx < Math.min(t.chunksX, cx1); cx++) {
      const ch = t.chunks[cy * t.chunksX + cx];
      ctx.drawImage(ch.cv, ch.x, ch.y);
    }
  }

  // water shimmer
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [tx, ty] of t.waterTiles) {
    const wx = tx * TILE, wy = ty * TILE;
    if (wx + TILE < G.cam.x || wx > G.cam.x + viewWw || wy + TILE < G.cam.y || wy > G.cam.y + viewHw) continue;
    const ph = Math.sin(G.time * 1.8 + tx * 1.3 + ty * 2.1);
    if (ph > 0.55) {
      ctx.fillStyle = `rgba(200,235,255,${(ph - 0.55) * 0.16})`;
      ctx.fillRect(wx + 8, wy + 10 + ph * 6, TILE - 16, 3);
    }
  }
  ctx.restore();

  // portals (ground layer)
  const night = isNight();
  for (const portal of z.portals) {
    const locked = portal.minLvl && p.level < portal.minLvl;
    drawPortal(ctx, portal.x, portal.y, G.time, locked);
    ctx.font = '700 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = locked ? 'rgba(160,150,180,.8)' : 'rgba(210,235,255,.95)';
    ctx.strokeStyle = 'rgba(6,8,16,.8)'; ctx.lineWidth = 3;
    const lbl = portal.label + (locked ? ` (Lv.${portal.minLvl})` : '');
    ctx.strokeText(lbl, portal.x, portal.y + 16);
    ctx.fillText(lbl, portal.x, portal.y + 16);
  }

  // target ring
  if (G.target && !G.target.dead) {
    const tg = G.target;
    ctx.save();
    ctx.translate(tg.x, tg.y); ctx.scale(1, 0.42);
    ctx.strokeStyle = 'rgba(255,120,90,.9)';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([7, 5]);
    ctx.lineDashOffset = -G.time * 26;
    ctx.beginPath(); ctx.arc(0, 0, 30 * (tg.data.size || 1), 0, TAU); ctx.stroke();
    ctx.restore();
  }

  // depth-sorted drawables
  const drawables = [];
  for (const prop of t.props) {
    if (prop.x > G.cam.x - 140 && prop.x < G.cam.x + viewWw + 140 &&
        prop.y > G.cam.y - 60 && prop.y < G.cam.y + viewHw + 200) {
      drawables.push({ y: prop.y, kind: 'prop', ref: prop });
    }
  }
  for (const e of G.entities) {
    if (e.x > G.cam.x - 120 && e.x < G.cam.x + viewWw + 120 &&
        e.y > G.cam.y - 120 && e.y < G.cam.y + viewHw + 160) {
      drawables.push({ y: e.y, kind: e.kind, ref: e });
    }
  }
  drawables.push({ y: p.y, kind: 'player', ref: p });
  if (p.petEntity) drawables.push({ y: p.petEntity.y, kind: 'pet', ref: p.petEntity });
  drawables.sort((a, b) => a.y - b.y);

  for (const d of drawables) {
    const e = d.ref;
    switch (d.kind) {
      case 'prop': drawProp(ctx, e, G.time, night); break;
      case 'monster': {
        drawShadow(ctx, e.x, e.y, 20 * (e.data.size || 1));
        drawMonster(ctx, e.data.kind, e.x, e.y, {
          t: e.animT, size: e.data.size || 1, tint: e.data.tint, flash: e.flash,
          face: e.face, atk: e.atkAnim, moving: e.moving,
        });
        drawMonsterPlate(ctx, e);
        break;
      }
      case 'npc': {
        drawShadow(ctx, e.x, e.y, 16);
        drawNpcSprite(ctx, e.x, e.y + Math.sin(e.animT * 2) * 1.2, e.data, e.animT);
        drawNpcPlate(ctx, e);
        break;
      }
      case 'pet':
        drawShadow(ctx, e.x, e.y, 11);
        drawPet(ctx, e.data.kind, e.x, e.y, { t: e.animT, face: e.face, tint: e.data.tint });
        break;
      case 'player': {
        drawShadow(ctx, p.x, p.y, 16);
        drawPlayerChar(ctx, p.x, p.y, p, {
          dir: p.dir, t: p.animT, moving: p.moving,
          atk: p.atkAnim, cast: p.castAnim > 0,
        });
        // name + title
        ctx.font = '700 11px system-ui'; ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(6,8,16,.85)'; ctx.lineWidth = 3;
        ctx.strokeText(p.name, p.x, p.y - 92);
        ctx.fillStyle = '#e8f0ff';
        ctx.fillText(p.name, p.x, p.y - 92);
        if (p.title) {
          ctx.font = '600 9px system-ui';
          ctx.strokeText('«' + p.title + '»', p.x, p.y - 104);
          ctx.fillStyle = '#e8c268';
          ctx.fillText('«' + p.title + '»', p.x, p.y - 104);
        }
        break;
      }
    }
  }

  // loot orbs
  for (const l of G.lootFly) {
    const c = l.kind === 'gold' ? '#ffd77a' : '#a8e2ff';
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, 10);
    g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(l.x, l.y, 10, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(l.x, l.y, 2.6, 0, TAU); ctx.fill();
  }

  // projectiles
  for (const pr of G.projectiles) {
    if (pr.style === 'arrow') {
      const ang = Math.atan2((pr.target.y - 26) - pr.y, pr.target.x - pr.x);
      ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(ang);
      ctx.strokeStyle = '#c8a878'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.fillStyle = '#e8e8f2';
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(5, -3.4); ctx.lineTo(5, 3.4); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(pr.x, pr.y, 1, pr.x, pr.y, 14);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, pr.color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 14, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  fx.drawParticles(ctx);

  // cloud shadows (outdoor day)
  const biome = z.def.biome;
  if (biome !== 'cave' && !night) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 3; i++) {
      const cx = ((G.time * 12 + i * 900) % (z.W + 800)) - 400;
      const cy = (i * 700) % z.H;
      const g = ctx.createRadialGradient(cx, cy, 40, cx, cy, 260);
      g.addColorStop(0, 'rgba(190,195,210,0.88)');
      g.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(cx, cy, 260, 170, 0.4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore(); // world space done

  // ambient lighting overlay (screen space)
  const [ar, ag, ab, astr] = ambientColor();
  if (astr > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(${ar | 0},${ag | 0},${ab | 0},${astr})`;
    ctx.fillRect(0, 0, G.viewW, G.viewH);
    // player light halo
    const px = (p.x - G.cam.x) * G.zoom, py = (p.y - 30 - G.cam.y) * G.zoom;
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(px, py, 10, px, py, 200 * G.zoom);
    lg.addColorStop(0, `rgba(255,200,130,${astr * 0.35})`);
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(px, py, 200 * G.zoom, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // vignette
  const vg = ctx.createRadialGradient(G.viewW / 2, G.viewH / 2, Math.min(G.viewW, G.viewH) * 0.42,
    G.viewW / 2, G.viewH / 2, Math.max(G.viewW, G.viewH) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(5,6,12,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, G.viewW, G.viewH);

  fx.drawTexts(ctx, G.cam.x, G.cam.y, G.zoom);
}

function drawMonsterPlate(ctx, e) {
  const p = G.player;
  const size = e.data.size || 1;
  const topY = e.y - 62 * size - (e.data.kind === 'wisp' || e.data.kind === 'bat' ? 16 : 0);
  const show = e.data.boss || e === G.target || e.hp < e.hpMax;
  if (!show) return;
  const gap = e.data.lvl - p.level;
  const col = gap >= 4 ? '#ff8a7a' : gap >= 1 ? '#ffd77a' : gap >= -4 ? '#e8e4d8' : '#9a94a8';
  ctx.font = `700 ${e.data.boss ? 12 : 10}px system-ui`;
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(6,8,16,.85)'; ctx.lineWidth = 3;
  const nm = `${e.data.boss ? '☠ ' : ''}Lv.${e.data.lvl} ${e.data.name}`;
  ctx.strokeText(nm, e.x, topY - 6);
  ctx.fillStyle = col;
  ctx.fillText(nm, e.x, topY - 6);
  const w = e.data.boss ? 66 : 42;
  ctx.fillStyle = 'rgba(8,6,14,.75)';
  ctx.fillRect(e.x - w / 2 - 1, topY - 1, w + 2, 5.4);
  const frac = clamp(e.hp / e.hpMax, 0, 1);
  const grad = ctx.createLinearGradient(0, topY, 0, topY + 4);
  grad.addColorStop(0, '#ff8f7d'); grad.addColorStop(1, '#a82418');
  ctx.fillStyle = grad;
  ctx.fillRect(e.x - w / 2, topY, w * frac, 3.6);
}

function drawNpcPlate(ctx, e) {
  ctx.font = '700 10.5px system-ui';
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(6,8,16,.85)'; ctx.lineWidth = 3;
  ctx.strokeText(e.data.name, e.x, e.y - 82);
  ctx.fillStyle = '#c8e8a8';
  ctx.fillText(e.data.name, e.x, e.y - 82);
  const marker = npcMarker(e.data.id);
  if (marker) {
    const bob = Math.sin(e.animT * 3) * 3;
    ctx.font = '900 20px Georgia';
    const col = marker === '?' ? '#8fe08f' : marker === '!' ? '#ffd75f' : '#9a94a8';
    ctx.strokeText(marker, e.x, e.y - 96 + bob);
    ctx.fillStyle = col;
    ctx.fillText(marker, e.x, e.y - 96 + bob);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(e.x, e.y - 102 + bob, 2, e.x, e.y - 102 + bob, 18);
    g.addColorStop(0, glowColor(col === '#9a94a8' ? '#9a94a8' : col).replace('ALPHA', 0.3));
    g.addColorStop(1, glowColor(col === '#9a94a8' ? '#9a94a8' : col).replace('ALPHA', 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(e.x, e.y - 102 + bob, 18, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

/* go */
wireDeathButtons();
boot();
