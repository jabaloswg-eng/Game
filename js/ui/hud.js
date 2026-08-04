// HUD wiring: bars, buffs, minimap, log, action buttons, toasts, banners.
import { G, on, emit } from '../core/state.js';
import { $, $$, el, fmt, clamp, fmtTime, TILE } from '../core/util.js';
import { expNeed } from '../data/classes.js';
import { SKILL_BY_ID } from '../data/skills.js';
import { paintSkillIcon } from '../gfx/icons.js';
import { usePotionSlot, countItem } from '../game/inventory.js';
import { castSkill, tryBasicAttack } from '../game/combat.js';
import { drawPlayerChar } from '../gfx/sprites.js';
import { sfx } from '../core/audio.js';
import { toggleWindow } from './windows.js';

const BUFF_ICONS = { shield: '🛡', shout: '📣', blood: '🩸', rage: '🔥', eye: '👁', boots: '🌀',
  aegis: '🔮', surge: '⚡', food: '🍗', tome: '📖', coin: '💰' };

export function initHud() {
  const ui = G.ui;
  ui.hud = $('#hud');
  ui.barHp = $('#bar-hp'); ui.barMp = $('#bar-mp'); ui.barXp = $('#bar-xp');
  ui.txtHp = $('#txt-hp'); ui.txtMp = $('#txt-mp'); ui.txtXp = $('#txt-xp');
  ui.hudName = $('#hud-name'); ui.hudTitle = $('#hud-title'); ui.hudLevel = $('#hud-level');
  ui.buffs = $('#buffs');
  ui.log = $('#log');
  ui.minimap = $('#minimap'); ui.minimapCtx = ui.minimap.getContext('2d');
  ui.zoneName = $('#zone-name');
  ui.curGold = $('#cur-gold'); ui.curPlat = $('#cur-plat');
  ui.targetFrame = $('#target-frame'); ui.targetName = $('#target-name'); ui.targetHp = $('#target-hp');
  ui.portraitCv = $('#portrait-cv');

  // menu buttons
  for (const btn of $$('.mbtn')) {
    btn.addEventListener('click', () => { sfx.click(); toggleWindow(btn.dataset.win); });
  }

  // attack + auto
  $('#btn-attack').addEventListener('click', () => {
    if (!G.target || G.target.dead) autoTargetNearest();
    tryBasicAttack();
  });
  const autoBtn = $('#btn-auto');
  autoBtn.addEventListener('click', () => {
    G.player.auto = !G.player.auto;
    autoBtn.classList.toggle('on', G.player.auto);
    autoBtn.classList.toggle('off', !G.player.auto);
    sfx.click();
  });

  // skill slots
  for (const btn of $$('.skill-btn')) {
    btn.addEventListener('click', () => {
      const slot = +btn.dataset.slot;
      const skillId = G.player.skillSlots[slot];
      if (!skillId) { toggleWindow('skills'); return; }
      castSkill(skillId);
    });
  }
  // potion slots
  for (const btn of $$('.pot-btn')) {
    btn.addEventListener('click', () => usePotionSlot(+btn.dataset.pot));
  }

  refreshSkillBar();
  wireEvents();
}

export function autoTargetNearest() {
  let best = null, bd = 420;
  for (const e of G.entities) {
    if (e.kind !== 'monster' || e.dead) continue;
    const d = Math.hypot(e.x - G.player.x, e.y - G.player.y);
    if (d < bd) { bd = d; best = e; }
  }
  if (best) G.target = best;
  return best;
}

export function refreshSkillBar() {
  const p = G.player;
  if (!p) return;
  $$('.skill-btn').forEach(btn => {
    const slot = +btn.dataset.slot;
    const skillId = p.skillSlots[slot];
    const cv = btn.querySelector('canvas');
    const rankEl = btn.querySelector('.rank');
    if (skillId && SKILL_BY_ID[skillId]) {
      btn.classList.remove('empty');
      paintSkillIcon(cv, SKILL_BY_ID[skillId]);
      rankEl.textContent = 'R' + (p.skillRanks[skillId] || 1);
    } else {
      btn.classList.add('empty');
      const ctx = cv.getContext('2d');
      cv.width = 80; cv.height = 80;
      ctx.clearRect(0, 0, 80, 80);
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.font = '300 44px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+', 40, 42);
      rankEl.textContent = '';
    }
  });
}

export function updateHud() {
  const p = G.player, ui = G.ui;
  if (!p) return;
  ui.barHp.style.width = (p.hp / p.d.hpMax * 100) + '%';
  ui.barMp.style.width = (p.mp / p.d.mpMax * 100) + '%';
  ui.txtHp.textContent = `${Math.ceil(p.hp)} / ${p.d.hpMax}`;
  ui.txtMp.textContent = `${Math.ceil(p.mp)} / ${p.d.mpMax}`;
  const need = expNeed(p.level);
  ui.barXp.style.width = clamp(p.exp / need * 100, 0, 100) + '%';
  ui.hudLevel.textContent = p.level;
  ui.curGold.textContent = fmt(p.gold);
  ui.curPlat.textContent = fmt(p.plat);

  // target frame
  const t = G.target;
  if (t && !t.dead && t.kind === 'monster') {
    ui.targetFrame.classList.remove('hidden');
    const gap = t.data.lvl - p.level;
    const col = gap >= 4 ? '#ff8a7a' : gap >= 1 ? '#ffd77a' : gap >= -4 ? '#e8e4d8' : '#9a94a8';
    ui.targetName.innerHTML = `<span style="color:${col}">Lv.${t.data.lvl}</span> ${t.data.name}${t.data.boss ? ' <em>☠</em>' : ''}`;
    ui.targetHp.style.width = clamp(t.hp / t.hpMax * 100, 0, 100) + '%';
  } else {
    ui.targetFrame.classList.add('hidden');
    if (t && t.dead) G.target = null;
  }

  // buffs
  const html = p.buffs.map(b =>
    `<div class="buff" title="${b.stat}">${BUFF_ICONS[b.icon] || '✦'}<i style="width:${clamp(b.until / 60 * 100, 4, 100)}%"></i></div>`
  ).join('');
  if (ui.buffs.__last !== html) { ui.buffs.innerHTML = html; ui.buffs.__last = html; }

  // cooldown sweeps + potion counts
  $$('.skill-btn').forEach(btn => {
    const skillId = p.skillSlots[+btn.dataset.slot];
    const cdEl = btn.querySelector('.cd');
    if (skillId && p.cooldowns[skillId] > 0) {
      const sk = SKILL_BY_ID[skillId];
      const total = typeof sk.cd === 'function' ? sk.cd(p.skillRanks[skillId] || 1) : sk.cd;
      cdEl.style.setProperty('--p', (p.cooldowns[skillId] / total * 100) + '%');
    } else cdEl.style.setProperty('--p', '0%');
  });
  const hpCount = ['p_hp_1', 'p_hp_2', 'p_hp_3', 'p_hp_4'].reduce((n, id) => n + countItem(id), 0);
  const mpCount = ['p_mp_1', 'p_mp_2', 'p_mp_3', 'p_mp_4'].reduce((n, id) => n + countItem(id), 0);
  $$('.pot-btn')[0].querySelector('.pcount').textContent = hpCount || '';
  $$('.pot-btn')[1].querySelector('.pcount').textContent = mpCount || '';
}

export function refreshIdentity() {
  const p = G.player, ui = G.ui;
  ui.hudName.childNodes[0].textContent = p.name;
  ui.hudTitle.textContent = p.title ? `«${p.title}»` : '';
  // portrait
  const cv = ui.portraitCv, ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, 96, 96);
  ctx.save(); ctx.translate(48, 118); ctx.scale(1.35, 1.35);
  drawPlayerChar(ctx, 0, 0, p, { dir: 0, t: 0.4 });
  ctx.restore();
}

export function drawMinimap() {
  const ui = G.ui, z = G.zone, p = G.player;
  if (!z || !p) return;
  const ctx = ui.minimapCtx;
  const S = ui.minimap.width;
  ctx.clearRect(0, 0, S, S);
  const sx = S / z.W, sy = S / z.H;
  // terrain blocks (coarse)
  ctx.fillStyle = '#1a2030';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#2c3a28';
  ctx.fillRect(2, 2, S - 4, S - 4);
  const t = z.terrain;
  ctx.fillStyle = '#141a26';
  const step = 2;
  for (let ty = 0; ty < t.H; ty += step) for (let tx = 0; tx < t.W; tx += step) {
    if (t.block[ty * t.W + tx]) ctx.fillRect(tx * TILE * sx, ty * TILE * sy, TILE * sx * step, TILE * sy * step);
  }
  // portals
  ctx.fillStyle = '#8fd8ff';
  for (const pt of z.portals) { ctx.beginPath(); ctx.arc(pt.x * sx, pt.y * sy, 3, 0, 7); ctx.fill(); }
  // npcs
  ctx.fillStyle = '#ffe9a8';
  for (const e of G.entities) if (e.kind === 'npc') { ctx.fillRect(e.x * sx - 1.7, e.y * sy - 1.7, 3.4, 3.4); }
  // monsters
  ctx.fillStyle = '#ff7a6b';
  for (const e of G.entities) if (e.kind === 'monster' && !e.dead) {
    ctx.beginPath(); ctx.arc(e.x * sx, e.y * sy, e.data.boss ? 2.6 : 1.5, 0, 7); ctx.fill();
  }
  // player
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(p.x * sx, p.y * sy, 3, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(p.x * sx, p.y * sy, 5, 0, 7); ctx.stroke();
}

/* ---------- log, toasts, banner ---------- */
export function log(msg, cls = 'l-sys') {
  const line = el('div', cls, msg);
  G.ui.log.appendChild(line);
  while (G.ui.log.children.length > 7) G.ui.log.firstChild.remove();
  setTimeout(() => line.remove(), 9500);
}
export function toast(msg, plat = false) {
  const t = el('div', 'toast' + (plat ? ' plat' : ''), msg);
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
export function banner(title, sub = '') {
  const b = $('#banner');
  b.classList.remove('hidden');
  b.innerHTML = `${title}${sub ? `<small>${sub}</small>` : ''}`;
  b.style.animation = 'none';
  void b.offsetWidth;
  b.style.animation = '';
  setTimeout(() => b.classList.add('hidden'), 3000);
}

function wireEvents() {
  on('zoneLoaded', () => { G.ui.zoneName.textContent = G.zone.def.name; });
  on('itemLooted', item => log(`Picked up <b>${item.name}</b>`, 'l-get'));
  on('bagFull', item => { log(`Bag is full! Lost ${item ? item.name : 'an item'}…`, 'l-dmg'); });
  on('goldChanged', () => {});
  on('platGain', (n, why) => { toast(`+${n} 💎 Platinum — ${why}`, true); log(`+${n} Platinum (${why})`, 'l-sys'); });
  on('questAccepted', q => { log(`Quest accepted: <b>${q.name}</b>`, 'l-quest'); toast(`📜 ${q.name}`); });
  on('questProgress', (q, n) => log(`${q.name}: ${n}/${q.count}`, 'l-quest'));
  on('questCompleted', q => { log(`Quest complete: <b>${q.name}</b>`, 'l-quest'); banner('QUEST COMPLETE', q.name); });
  on('levelUp', () => {
    const p = G.player;
    banner('LEVEL UP!', `You are now level ${p.level}`);
    log(`You reached level <b>${p.level}</b>!`, 'l-sys');
    sfx.levelup();
    p.hp = p.d.hpMax; p.mp = p.d.mpMax;
  });
  on('achievement', a => {
    toast(`🏆 ${a.name}${a.rewardPlat ? ` · +${a.rewardPlat}💎` : ''}`, true);
    log(`Achievement: <b>${a.name}</b>`, 'l-sys');
  });
  on('noMana', () => log('Not enough mana!', 'l-dmg'));
  on('noTarget', () => log('No target — tap a monster first.', 'l-sys'));
  on('outOfRange', () => log('Target is out of range.', 'l-sys'));
  on('noGold', () => log('Not enough gold.', 'l-dmg'));
  on('noPotion', which => log(which === 0 ? 'No health potions left!' : 'No mana potions left!', 'l-dmg'));
  on('wrongClass', item => log(`${item.name} is not for your Order.`, 'l-dmg'));
  on('lowLevel', item => log(`Requires level ${item.lvl}.`, 'l-dmg'));
  on('cantSell', () => log('You cannot sell that.', 'l-dmg'));
  on('bankFull', () => log('Bank is full.', 'l-dmg'));
  on('petHatched', pet => { banner('A COMPANION!', `${pet.name} joins you`); log(`${pet.name} hatched!`, 'l-get'); });
  on('enhanced', r => {
    if (r.success) { log(`Forge success! Now <b>+${r.plus}</b>`, 'l-get'); }
    else if (r.shattered) { log('The item <b>shattered</b>…', 'l-dmg'); banner('SHATTERED', 'The forge takes its price'); }
    else if (r.dropped) log(`Forge failed — dropped to +${r.plus}`, 'l-dmg');
    else log('Forge failed.', 'l-dmg');
  });
}
