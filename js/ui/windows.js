// All game windows. One window open at a time (mobile-first). Windows are
// re-rendered on open and on relevant state events.
import { G, on, emit } from '../core/state.js';
import { $, el, fmt, fmtTime } from '../core/util.js';
import { itemById, TIER_NAMES, TIER_COLORS, UPGRADABLE, EQUIP_TYPES, sellPrice,
  PLAT_ITEMS, ACHIEVEMENTS, QUESTS, LORE, questById } from '../data/db.js';
import { SKILLS_BY_CLASS, SKILL_BY_ID, MAX_RANK, val } from '../data/skills.js';
import { CLASSES, expNeed } from '../data/classes.js';
import { ZONES, ZONE_ORDER } from '../data/zones.js';
import { paintItemIcon, paintSkillIcon } from '../gfx/icons.js';
import { drawPlayerChar, drawNpcSprite } from '../gfx/sprites.js';
import { useItemAt, equipFromInv, unequip, sellItemAt, buyItem, bankDeposit,
  bankWithdraw, canEnhance, enhance, countItem } from '../game/inventory.js';
import { recompute } from '../game/stats.js';
import { buyPlatItem, hasMerchantBuff, hatchEgg } from '../game/premium.js';
import { questAvailableFrom, questTurnInFor, acceptQuest, completeQuest, markTalked,
  activeQuestList, questProgress, isQuestComplete } from '../game/quests.js';
import { refreshSkillBar, refreshIdentity, toast, log } from './hud.js';
import { sfx } from '../core/audio.js';

let openName = null;
let openCtx = null; // extra context (npc for shops etc.)
const container = () => $('#windows');

export function closeWindow() {
  openName = null; openCtx = null;
  container().innerHTML = '';
}
export function toggleWindow(name, ctx = null) {
  if (openName === name && !ctx) { closeWindow(); return; }
  openWindow(name, ctx);
}
export function openWindow(name, ctx = null) {
  openName = name; openCtx = ctx;
  render();
  sfx.open();
}
export function currentWindow() { return openName; }

function render() {
  const c = container();
  c.innerHTML = '';
  if (!openName) return;
  const fns = { inv, char: charWin, skills, quest, map, shop, forge, bank, plat, ach, settings, dialog };
  const fn = fns[openName];
  if (fn) c.appendChild(fn(openCtx));
}

function win(title, sub = '') {
  const w = el('div', 'win');
  const head = el('div', 'win-head');
  head.appendChild(el('h4', null, title));
  if (sub) head.appendChild(el('span', 'sub', sub));
  const x = el('button', 'win-x', '✕');
  x.addEventListener('click', () => { sfx.click(); closeWindow(); });
  head.appendChild(x);
  w.appendChild(head);
  const body = el('div', 'win-body');
  w.appendChild(body);
  return [w, body];
}

function cellFor(inst, opts = {}) {
  const item = inst ? itemById(inst.id) : null;
  const c = el('div', 'cell' + (item ? ' t' + item.tier : '') + (opts.locked ? ' locked' : ''));
  if (item) {
    const cv = document.createElement('canvas');
    c.appendChild(cv);
    paintItemIcon(cv, item, inst);
    if (inst.qty > 1) c.appendChild(el('span', 'qty', inst.qty));
    if (inst.plus > 0) c.appendChild(el('span', 'plus', '+' + inst.plus));
  }
  return c;
}

function itemSheet(inst, actions) {
  const item = itemById(inst.id);
  const s = el('div', null);
  s.id = 'item-sheet';
  const statsStr = item.stats ? Object.entries(item.stats)
    .map(([k, v]) => `${({ atk: 'ATK', matk: 'M.ATK', def: 'DEF', str: 'STR', dex: 'DEX', int_: 'INT', vit: 'VIT', agi: 'AGI', hp: 'HP', mp: 'MP', crit: 'CRIT%', eva: 'EVA%' })[k] || k} +${v}`)
    .join(' · ') : '';
  s.innerHTML = `
    <div class="iname t${item.tier}c">${inst.plus ? '+' + inst.plus + ' ' : ''}${item.name}
      <span style="font-size:10px;color:var(--ink-dim)"> · ${TIER_NAMES[item.tier]}${item.lvl ? ' · Lv.' + item.lvl : ''}${item.cls !== 'any' ? ' · ' + CLASSES[item.cls].name : ''}</span></div>
    <div class="idesc">${item.desc || ''}</div>
    <div class="istats">${statsStr}</div>`;
  const foot = el('div', 'win-foot');
  for (const [label, cls, fn] of actions) {
    const b = el('button', 'btn ' + cls, label);
    b.addEventListener('click', fn);
    foot.appendChild(b);
  }
  s.appendChild(foot);
  return s;
}

/* ================= INVENTORY ================= */
function inv() {
  const p = G.player;
  const [w, body] = win('Bag', `${p.inv.filter((s, i) => s && i < p.invSize).length}/${p.invSize} · 🪙${fmt(p.gold)}`);
  const grid = el('div', 'grid');
  let selIdx = -1;
  const sheetHost = el('div');
  const renderSheet = () => {
    sheetHost.innerHTML = '';
    if (selIdx < 0 || !p.inv[selIdx]) return;
    const inst = p.inv[selIdx];
    const item = itemById(inst.id);
    const actions = [];
    if (EQUIP_TYPES.has(item.type)) actions.push(['Equip', 'gold', () => { equipFromInv(selIdx); }]);
    else if (item.type === 'egg') actions.push(['Hatch', 'gold', () => { hatchEgg(inst, selIdx); closeWindow(); }]);
    else if (item.use) actions.push(['Use', 'gold', () => { useItemAt(selIdx); }]);
    if (hasMerchantBuff() && item.type !== 'quest')
      actions.push([`Sell 🪙${sellPrice(item)}`, '', () => { sellItemAt(selIdx, 1); }]);
    if (item.type !== 'quest') actions.push(['Drop', 'danger', () => {
      const s = p.inv[selIdx]; s.qty--; if (s.qty <= 0) p.inv[selIdx] = null;
      emit('invChanged');
    }]);
    sheetHost.appendChild(itemSheet(inst, actions));
  };
  p.inv.forEach((inst, i) => {
    const c = cellFor(inst, { locked: i >= p.invSize });
    if (i < p.invSize && inst) c.addEventListener('click', () => {
      selIdx = i; sfx.click();
      grid.querySelectorAll('.sel').forEach(x => x.classList.remove('sel'));
      c.classList.add('sel');
      renderSheet();
    });
    grid.appendChild(c);
  });
  body.appendChild(grid);
  w.appendChild(sheetHost);
  return w;
}

/* ================= CHARACTER ================= */
function charWin() {
  const p = G.player;
  const cls = CLASSES[p.cls];
  const [w, body] = win('Character', `${cls.name} · ${cls.order}`);

  const doll = el('div');
  doll.id = 'doll';
  const left = el('div', 'dcol'), right = el('div', 'dcol');
  const preview = el('div'); preview.id = 'doll-preview';
  const pcv = document.createElement('canvas');
  pcv.width = 200; pcv.height = 260;
  preview.appendChild(pcv);
  const pctx = pcv.getContext('2d');
  pctx.translate(100, 225); pctx.scale(2.2, 2.2);
  drawPlayerChar(pctx, 0, 0, p, { dir: 0, t: 0.3 });

  const slots = [['weapon', '⚔'], ['chest', '🛡'], ['helm', '⛑'], ['boots', '🥾'],
    ['shield', '🔰'], ['ring', '💍'], ['amulet', '📿'], ['costume', '🎭']];
  slots.forEach(([slot, ico], i) => {
    const sl = el('div', 'eq-slot');
    const inst = p.equip[slot];
    if (inst) {
      const cv = document.createElement('canvas');
      sl.appendChild(cv);
      paintItemIcon(cv, itemById(inst.id), inst);
      if (inst.plus > 0) sl.appendChild(el('span', 'plus', '+' + inst.plus));
      sl.addEventListener('click', () => { sfx.click(); unequip(slot); });
    } else sl.appendChild(el('div', 'lbl', ico + '<br>' + slot));
    (i < 4 ? left : right).appendChild(sl);
  });
  doll.appendChild(left); doll.appendChild(preview); doll.appendChild(right);
  body.appendChild(doll);

  const d = p.d;
  const statRow = (label, key) => {
    const row = el('div', 'statline');
    row.innerHTML = `<span>${label}</span><b>${p.stats[key]}</b>`;
    if (p.statPoints > 0) {
      const up = el('button', 'up', '+');
      up.addEventListener('click', () => {
        p.stats[key]++; p.statSpent[key] = (p.statSpent[key] || 0) + 1; p.statPoints--;
        recompute(p); emit('statsDirty'); render(); sfx.click();
      });
      row.appendChild(up);
    }
    return row;
  };
  body.appendChild(el('div', 'cat-head', `Attributes — ${p.statPoints} points`));
  body.appendChild(statRow('Strength', 'str'));
  body.appendChild(statRow('Dexterity', 'dex'));
  body.appendChild(statRow('Intellect', 'int_'));
  body.appendChild(statRow('Vitality', 'vit'));
  body.appendChild(statRow('Agility', 'agi'));
  body.appendChild(el('div', 'cat-head', 'Derived'));
  const dv = el('div');
  dv.innerHTML = `
    <div class="statline"><span>Attack</span><b>${d.atk}</b></div>
    <div class="statline"><span>Magic Attack</span><b>${d.matk}</b></div>
    <div class="statline"><span>Defense</span><b>${d.def}</b></div>
    <div class="statline"><span>Crit / Evasion</span><b>${d.crit.toFixed(0)}% / ${d.eva.toFixed(0)}%</b></div>
    <div class="statline"><span>HP / MP</span><b>${d.hpMax} / ${d.mpMax}</b></div>
    <div class="statline"><span>EXP</span><b>${fmt(p.exp)} / ${fmt(expNeed(p.level))}</b></div>`;
  body.appendChild(dv);
  if (p.titles.length) {
    body.appendChild(el('div', 'cat-head', 'Title'));
    const trow = el('div');
    for (const t of ['— none —', ...p.titles]) {
      const b = el('button', 'btn' + ((p.title || '— none —') === t ? ' gold' : ''), t);
      b.style.margin = '3px';
      b.addEventListener('click', () => { p.title = t === '— none —' ? null : t; refreshIdentity(); render(); });
      trow.appendChild(b);
    }
    body.appendChild(trow);
  }
  return w;
}

/* ================= SKILLS ================= */
function skills() {
  const p = G.player;
  const [w, body] = win('Skill Book', `${p.skillPoints} skill points`);
  for (const sk of SKILLS_BY_CLASS[p.cls]) {
    const rank = p.skillRanks[sk.id] || 0;
    const locked = p.level < sk.lvl;
    const row = el('div', 'shop-row');
    const icon = el('div', 'icon');
    const cv = document.createElement('canvas');
    icon.appendChild(cv); paintSkillIcon(cv, sk);
    row.appendChild(icon);
    const info = el('div', 'info');
    const mpNow = Math.round(val(sk.mp, Math.max(1, rank)));
    info.innerHTML = `<div class="n">${sk.name} ${rank > 0 ? `<span style="color:var(--gold)">R${rank}</span>` : locked ? `<span style="color:var(--ink-dim)">Lv.${sk.lvl}</span>` : '<span style="color:#8fe08f">NEW</span>'}</div>
      <div class="d">${sk.desc}<br><span style="color:#7fb5ff">MP ${mpNow} · CD ${val(sk.cd, Math.max(1, rank))}s${sk.kind === 'buff' ? ' · ' + val(sk.dur, Math.max(1, rank)) + 's' : ''}</span></div>`;
    row.appendChild(info);
    const side = el('div');
    side.style.cssText = 'display:flex;flex-direction:column;gap:4px;align-items:flex-end';
    if (!locked && rank < MAX_RANK) {
      const cost = rank + 1;
      const up = el('button', 'btn gold', rank === 0 ? `Learn (${cost})` : `Rank ${rank + 1} (${cost})`);
      if (p.skillPoints < cost) up.disabled = true;
      up.addEventListener('click', () => {
        p.skillPoints -= cost;
        p.skillRanks[sk.id] = rank + 1;
        if (rank === 0) { // auto-assign to first free slot
          const free = p.skillSlots.findIndex(s => !s);
          if (free >= 0) p.skillSlots[free] = sk.id;
        }
        refreshSkillBar(); emit('skillsChanged'); render(); sfx.buff();
      });
      side.appendChild(up);
    }
    if (rank > 0) {
      const slotIdx = p.skillSlots.indexOf(sk.id);
      const asg = el('button', 'btn', slotIdx >= 0 ? `Slot ${slotIdx + 1} ✓` : 'Assign');
      asg.addEventListener('click', () => {
        if (slotIdx >= 0) p.skillSlots[slotIdx] = null;
        else {
          const free = p.skillSlots.findIndex(s => !s);
          if (free >= 0) p.skillSlots[free] = sk.id;
          else { p.skillSlots[3] = sk.id; }
        }
        refreshSkillBar(); render(); sfx.click();
      });
      side.appendChild(asg);
    }
    row.appendChild(side);
    body.appendChild(row);
  }
  return w;
}

/* ================= QUESTS + LORE ================= */
function quest() {
  const p = G.player;
  const [w, body] = win('Journal', `${p.quests.done.length} completed`);
  const tabs = el('div', 'tabs');
  const tQ = el('button', 'on', 'Quests');
  const tL = el('button', null, 'Chronicle');
  tabs.appendChild(tQ); tabs.appendChild(tL);
  w.insertBefore(tabs, body);
  const showQuests = () => {
    tQ.classList.add('on'); tL.classList.remove('on');
    body.innerHTML = '';
    const active = activeQuestList();
    if (!active.length) body.appendChild(el('div', 'qtext',
      '<i style="color:var(--ink-dim)">No active quests. Look for the golden “!” above someone in need.</i>'));
    for (const q of active) {
      const prog = questProgress(q);
      const doneQ = isQuestComplete(q);
      const e = el('div', 'q-entry' + (doneQ ? ' done' : ''));
      const targetName = q.type === 'collect' ? (itemById(q.target)?.name || q.target)
        : q.type === 'talk' ? 'Speak with them' : null;
      e.innerHTML = `<h5>${q.name}</h5>
        <div class="qprog">${doneQ ? 'Complete — return to turn in' : `${prog}/${q.count}${targetName ? ' · ' + targetName : ''}`} · ${ZONES[q.zone]?.name || ''}</div>
        <div class="qtext">${q.progress}</div>
        <div class="qrew">Reward: ${q.rewards.exp ? fmt(q.rewards.exp) + ' EXP' : ''}${q.rewards.gold ? ' · 🪙' + fmt(q.rewards.gold) : ''}${q.rewards.plat ? ' · 💎' + q.rewards.plat : ''}${(q.rewards.items || []).map(i => ' · ' + (itemById(i.id)?.name || i.id)).join('')}</div>`;
      body.appendChild(e);
    }
    const mainDone = p.quests.done.filter(x => x.startsWith('mq_')).length;
    body.appendChild(el('div', 'cat-head', `Story progress: chapter ${Math.min(10, mainDone + 1)} of 10`));
  };
  const showLore = () => {
    tL.classList.add('on'); tQ.classList.remove('on');
    body.innerHTML = '';
    for (const entry of LORE.chronicle || []) {
      const e = el('div', 'q-entry');
      e.innerHTML = `<h5>${entry.h}</h5><div class="qtext">${entry.body}</div>`;
      body.appendChild(e);
    }
  };
  tQ.addEventListener('click', showQuests);
  tL.addEventListener('click', showLore);
  showQuests();
  return w;
}

/* ================= WORLD MAP ================= */
function map() {
  const [w, body] = win('World Map', 'Emberveil');
  const cv = document.createElement('canvas');
  cv.width = 440; cv.height = 320;
  cv.style.width = '100%';
  body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 320);
  g.addColorStop(0, '#1a2032'); g.addColorStop(1, '#10131f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 440, 320);
  const pos = { lumenhold: [90, 120], dawnmeadow: [190, 150], thornwood: [280, 100],
    cinderdunes: [330, 190], frostfell: [240, 250], hollowdepths: [120, 240] };
  const cols = { lumenhold: '#e8c268', dawnmeadow: '#83b25c', thornwood: '#4e7a42',
    cinderdunes: '#d8b878', frostfell: '#dfe8ee', hollowdepths: '#6a5a8a' };
  ctx.strokeStyle = 'rgba(232,194,104,.4)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
  const links = [['lumenhold', 'dawnmeadow'], ['dawnmeadow', 'thornwood'], ['thornwood', 'cinderdunes'],
    ['cinderdunes', 'frostfell'], ['frostfell', 'hollowdepths']];
  for (const [a, b] of links) {
    ctx.beginPath(); ctx.moveTo(...pos[a]); ctx.lineTo(...pos[b]); ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const zid of ZONE_ORDER) {
    const [x, y] = pos[zid];
    const visited = G.player.counters.zones.includes(zid);
    const here = G.zone?.def.id === zid;
    ctx.beginPath(); ctx.arc(x, y, here ? 17 : 13, 0, 7);
    ctx.fillStyle = visited ? cols[zid] : '#2c3044'; ctx.fill();
    if (here) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.fillStyle = visited ? '#e8e4d8' : '#57506b';
    ctx.font = '700 11px system-ui'; ctx.textAlign = 'center';
    const z = ZONES[zid];
    ctx.fillText(z.name, x, y + 30);
    if (!z.safe && visited) {
      const lvls = { dawnmeadow: '1–8', thornwood: '7–16', cinderdunes: '15–25', frostfell: '24–33', hollowdepths: '32–40' };
      ctx.fillStyle = '#9a94a8'; ctx.font = '10px system-ui';
      ctx.fillText('Lv.' + lvls[zid], x, y + 42);
    }
  }
  body.appendChild(el('div', 'qtext',
    `<i style="color:var(--ink-dim)">Zones connect through portal gates at their edges. A Sigil of Return (or the scroll) brings you back to Lumenhold from anywhere.</i>`));
  return w;
}

/* ================= MERCHANT SHOP ================= */
function shop(npc) {
  const p = G.player;
  const [w, body] = win(npc?.name || 'Merchant', 'Buy · Sell');
  const tabs = el('div', 'tabs');
  const tB = el('button', 'on', 'Buy'), tS = el('button', null, 'Sell');
  tabs.appendChild(tB); tabs.appendChild(tS);
  w.insertBefore(tabs, body);
  const showBuy = () => {
    tB.classList.add('on'); tS.classList.remove('on');
    body.innerHTML = '';
    for (const id of npc?.shop || []) {
      const item = itemById(id);
      if (!item) continue;
      const row = el('div', 'shop-row');
      const icon = el('div', 'icon');
      const cv = document.createElement('canvas');
      icon.appendChild(cv); paintItemIcon(cv, item);
      row.appendChild(icon);
      const info = el('div', 'info');
      info.innerHTML = `<div class="n t${item.tier}c">${item.name}${item.lvl ? ` <span style="color:var(--ink-dim);font-size:10px">Lv.${item.lvl}</span>` : ''}</div><div class="d">${item.desc || ''}</div>`;
      row.appendChild(info);
      const buy = el('button', 'btn gold', `🪙${fmt(item.price)}`);
      if (p.gold < item.price) buy.disabled = true;
      buy.addEventListener('click', () => { if (buyItem(id, 1)) { toast(`Bought ${item.name}`); render(); } });
      row.appendChild(buy);
      body.appendChild(row);
    }
  };
  const showSell = () => {
    tS.classList.add('on'); tB.classList.remove('on');
    body.innerHTML = '';
    let any = false;
    p.inv.forEach((inst, i) => {
      if (!inst || i >= p.invSize) return;
      const item = itemById(inst.id);
      if (!item || item.type === 'quest') return;
      any = true;
      const row = el('div', 'shop-row');
      const icon = el('div', 'icon');
      const cv = document.createElement('canvas');
      icon.appendChild(cv); paintItemIcon(cv, item, inst);
      row.appendChild(icon);
      const info = el('div', 'info');
      info.innerHTML = `<div class="n t${item.tier}c">${inst.plus ? '+' + inst.plus + ' ' : ''}${item.name}${inst.qty > 1 ? ' ×' + inst.qty : ''}</div>`;
      row.appendChild(info);
      const sell = el('button', 'btn', `Sell 🪙${sellPrice(item)}`);
      sell.addEventListener('click', () => { sellItemAt(i, 1); render(); });
      row.appendChild(sell);
      body.appendChild(row);
    });
    if (!any) body.appendChild(el('div', 'qtext', '<i style="color:var(--ink-dim)">Nothing to sell.</i>'));
  };
  tB.addEventListener('click', showBuy);
  tS.addEventListener('click', showSell);
  showBuy();
  return w;
}

/* ================= FORGE ================= */
function forge() {
  const p = G.player;
  const [w, body] = win('Forge', 'Torvald’s anvil');
  body.appendChild(el('div', 'qtext',
    `<i style="color:var(--ink-dim)">Enhance weapons and armor to +10. From +5 a failure lowers the plus; from +8 it can <b style="color:#ff8a7a">shatter</b> the item — unless a Guardian Rune protects it.</i>`));
  const candidates = [];
  for (const slot of Object.keys(p.equip)) {
    const inst = p.equip[slot];
    if (inst && UPGRADABLE.has(itemById(inst.id).type)) candidates.push({ where: 'equip', key: slot, inst });
  }
  p.inv.forEach((inst, i) => {
    if (inst && i < p.invSize && UPGRADABLE.has(itemById(inst.id)?.type || '')) candidates.push({ where: 'inv', key: i, inst });
  });
  if (!candidates.length) {
    body.appendChild(el('div', 'qtext', '<br><i>No upgradable gear. Equip or carry a weapon or armor piece.</i>'));
    return w;
  }
  let sel = 0;
  const grid = el('div', 'grid');
  const detail = el('div');
  const renderDetail = () => {
    detail.innerHTML = '';
    const cd = candidates[sel];
    const item = itemById(cd.inst.id);
    const info = canEnhance(cd.inst);
    if (!info) {
      detail.appendChild(el('div', 'qtext', `<b class="t${item.tier}c">+${cd.inst.plus} ${item.name}</b> — already at maximum.`));
      return;
    }
    const stone = itemById(info.stoneId);
    const haveStone = countItem(info.stoneId);
    const haveB = countItem('plat_bwstone');
    const haveR = countItem('plat_grune');
    let useBlessed = false, useRune = false;
    const head = el('div', 'qtext');
    const upd = () => {
      const ch = Math.min(0.95, info.chance + (useBlessed ? 0.15 : 0));
      head.innerHTML = `<b class="t${item.tier}c">+${cd.inst.plus || 0} ${item.name}</b> → <b style="color:var(--gold)">+${info.target}</b><br>
        Success: <b style="color:${ch >= 0.6 ? '#8fe08f' : ch >= 0.35 ? '#ffd77a' : '#ff8a7a'}">${Math.round(ch * 100)}%</b>
        · Cost 🪙${fmt(info.gold)} · ${useBlessed ? 'Blessed Whetstone' : stone.name} ×1 (have ${useBlessed ? haveB : haveStone})
        ${info.riskShatter && !useRune ? '<br><b style="color:#ff8a7a">⚠ can shatter</b>' : info.riskDrop ? '<br><span style="color:#ffd77a">⚠ can lose a plus</span>' : ''}`;
    };
    upd();
    detail.appendChild(head);
    const foot = el('div', 'win-foot');
    if (haveB > 0) {
      const b = el('button', 'btn', '✨ Blessed (+15%)');
      b.addEventListener('click', () => { useBlessed = !useBlessed; b.classList.toggle('plat', useBlessed); upd(); });
      foot.appendChild(b);
    }
    if (haveR > 0 && info.riskShatter) {
      const b = el('button', 'btn', '🛡 Guardian Rune');
      b.addEventListener('click', () => { useRune = !useRune; b.classList.toggle('plat', useRune); upd(); });
      foot.appendChild(b);
    }
    const go = el('button', 'btn gold', '🔨 Enhance');
    if ((useBlessed ? haveB : haveStone) < 1 || p.gold < info.gold) go.disabled = true;
    go.addEventListener('click', () => {
      const r = enhance(cd.where, cd.key, useBlessed, useRune);
      if (r.ok) render();
    });
    foot.appendChild(go);
    detail.appendChild(foot);
    if (haveStone < 1 && !useBlessed) detail.appendChild(el('div', 'qtext',
      `<i style="color:var(--ink-dim)">You need a ${stone.name} — dropped by monsters around level ${item.lvl}, or buy the tier-1 kind here.</i>`));
  };
  candidates.forEach((cd, i) => {
    const c = cellFor(cd.inst);
    if (cd.where === 'equip') c.style.outline = '1px dashed rgba(232,194,104,.5)';
    c.addEventListener('click', () => {
      sel = i; sfx.click();
      grid.querySelectorAll('.sel').forEach(x => x.classList.remove('sel'));
      c.classList.add('sel');
      renderDetail();
    });
    grid.appendChild(c);
  });
  body.appendChild(grid);
  body.appendChild(el('div', null, '<br>'));
  body.appendChild(detail);
  renderDetail();
  return w;
}

/* ================= BANK ================= */
function bank() {
  const p = G.player;
  const [w, body] = win('Vault', `Bank of Lumenhold · ${p.bank.filter((s, i) => s && i < p.bankSize).length}/${p.bankSize}`);
  body.appendChild(el('div', 'cat-head', 'Vault — tap to withdraw'));
  const bgrid = el('div', 'grid');
  p.bank.forEach((inst, i) => {
    const c = cellFor(inst, { locked: i >= p.bankSize });
    if (inst && i < p.bankSize) c.addEventListener('click', () => { bankWithdraw(i); render(); sfx.click(); });
    bgrid.appendChild(c);
  });
  body.appendChild(bgrid);
  body.appendChild(el('div', 'cat-head', 'Bag — tap to deposit'));
  const igrid = el('div', 'grid');
  p.inv.forEach((inst, i) => {
    const c = cellFor(inst, { locked: i >= p.invSize });
    if (inst && i < p.invSize) c.addEventListener('click', () => { bankDeposit(i); render(); sfx.click(); });
    igrid.appendChild(c);
  });
  body.appendChild(igrid);
  return w;
}

/* ================= PLATINUM SHOP ================= */
function plat() {
  const p = G.player;
  const [w, body] = win('Platinum Emporium', `💎 ${fmt(p.plat)}`);
  body.appendChild(el('div', 'qtext',
    `<i style="color:var(--plat)">Zephyr’s wares, paid in Platinum. Earn 💎 from achievements, level milestones, boss first-kills, story chapters, and the daily gift.</i>`));
  const cats = [['growth', '🌱 Growth'], ['convenience', '🧭 Convenience'], ['enhance', '⚒ Enhancement'],
    ['cosmetic', '🎭 Cosmetics'], ['pet', '🐾 Companions']];
  for (const [cat, label] of cats) {
    const items = PLAT_ITEMS.filter(x => x.cat === cat);
    if (!items.length) continue;
    body.appendChild(el('div', 'cat-head', label));
    for (const pi of items) {
      const row = el('div', 'shop-row');
      const icon = el('div', 'icon');
      const gi = pi.give?.itemId ? itemById(pi.give.itemId) : null;
      if (gi) { const cv = document.createElement('canvas'); icon.appendChild(cv); paintItemIcon(cv, gi); }
      else icon.innerHTML = `<div style="font-size:24px;text-align:center;line-height:44px">${({ growth: '📖', convenience: '🧭', enhance: '⚒', cosmetic: '🎭', pet: '🥚' })[cat]}</div>`;
      row.appendChild(icon);
      const info = el('div', 'info');
      info.innerHTML = `<div class="n">${pi.name}</div><div class="d">${pi.desc || ''}</div>`;
      row.appendChild(info);
      const b = el('button', 'btn plat', `💎${pi.plat}`);
      if (p.plat < pi.plat) b.disabled = true;
      b.addEventListener('click', () => {
        const r = buyPlatItem(pi.id);
        if (r.ok) { toast(`💎 ${pi.name}`, true); render(); }
        else if (r.reason === 'bag') log('Bag is full.', 'l-dmg');
        else if (r.reason === 'max') log('Already at maximum.', 'l-dmg');
      });
      row.appendChild(b);
      body.appendChild(row);
    }
  }
  return w;
}

/* ================= ACHIEVEMENTS ================= */
function ach() {
  const p = G.player;
  const [w, body] = win('Deeds', `${p.achievements.length}/${ACHIEVEMENTS.length}`);
  for (const a of ACHIEVEMENTS) {
    const done = p.achievements.includes(a.id);
    const row = el('div', 'ach-row' + (done ? ' done' : ''));
    row.innerHTML = `<div class="medal">🏆</div>
      <div class="t"><div class="n">${a.name}${a.title ? ` <span style="color:var(--gold)">«${a.title}»</span>` : ''}</div>
      <div class="d">${a.desc}</div></div>
      <div class="r">${a.rewardPlat ? '💎' + a.rewardPlat : ''}</div>`;
    body.appendChild(row);
  }
  return w;
}

/* ================= SETTINGS ================= */
function settings() {
  const [w, body] = win('Settings', 'Emberveil v1.0');
  const rows = [['Sound effects', 'sfx'], ['Music', 'music'], ['Screen shake', 'shake'], ['Damage numbers', 'showDmg']];
  for (const [label, key] of rows) {
    const row = el('div', 'set-row');
    row.appendChild(el('span', null, label));
    const t = el('button', 'tgl' + (G.settings[key] ? ' on' : ''));
    t.addEventListener('click', () => {
      G.settings[key] = !G.settings[key];
      t.classList.toggle('on', G.settings[key]);
      sfx.click();
    });
    row.appendChild(t);
    body.appendChild(row);
  }
  const foot = el('div', 'win-foot');
  const save = el('button', 'btn gold', '💾 Save game');
  save.addEventListener('click', () => { emit('requestSave'); toast('Game saved'); });
  const quit = el('button', 'btn danger', 'Save & exit to title');
  quit.addEventListener('click', () => { emit('requestSave'); location.reload(); });
  foot.appendChild(save); foot.appendChild(quit);
  w.appendChild(foot);
  return w;
}

/* ================= NPC DIALOGUE ================= */
function dialog(npc) {
  const [w, body] = win(npc.name, npc.title || '');
  w.id = 'win-dialog';
  const port = el('div'); port.id = 'dlg-portrait';
  const cv = document.createElement('canvas');
  cv.width = 120; cv.height = 120;
  port.appendChild(cv);
  const ctx = cv.getContext('2d');
  ctx.translate(60, 140); ctx.scale(1.6, 1.6);
  drawNpcSprite(ctx, 0, 0, npc, 0.4);
  const txt = el('div'); txt.id = 'dlg-text';
  body.appendChild(port); body.appendChild(txt);

  const foot = el('div', 'win-foot');
  w.appendChild(foot);
  const say = (html) => { txt.innerHTML = `<div class="dname">${npc.name}</div>${html}`; };
  const btn = (label, cls, fn) => {
    const b = el('button', 'btn ' + cls, label);
    b.addEventListener('click', fn);
    foot.appendChild(b);
    return b;
  };

  markTalked(npc.id);
  const turnIn = questTurnInFor(npc.id);
  const avail = questAvailableFrom(npc.id);

  if (turnIn) {
    say(`<p>${turnIn.complete}</p>`);
    btn('✔ Complete quest', 'gold', () => {
      completeQuest(turnIn.id);
      closeWindow();
    });
  } else if (avail) {
    say(`<p>${avail.offer}</p>`);
    btn('📜 Accept', 'gold', () => { acceptQuest(avail.id); render(); });
    btn('Later', 'ghost', () => closeWindow());
  } else {
    // in-progress quest hint or idle chatter
    const activeHere = activeQuestList().find(q => q.giver === npc.id);
    if (activeHere) say(`<p>${activeHere.progress}</p>`);
    else say(`<p>${npc.lines[Math.floor(Math.random() * npc.lines.length)]}</p>`);
  }

  // role services
  if (npc.role === 'merchant' || (npc.role === 'blacksmith' && npc.shop)) btn('🛒 Shop', '', () => openWindow('shop', npc));
  if (npc.role === 'blacksmith') btn('🔨 Forge', '', () => openWindow('forge'));
  if (npc.role === 'banker') btn('🏦 Vault', '', () => openWindow('bank'));
  if (npc.role === 'platinum') btn('💎 Emporium', 'plat', () => openWindow('plat'));
  if (npc.role === 'trainer') {
    if (G.player.cls === npc.cls) btn('✨ Skills', '', () => openWindow('skills'));
  }
  return w;
}

/* re-render open windows when state changes */
for (const ev of ['invChanged', 'equipChanged', 'goldChanged', 'platChanged', 'statsDirty', 'skillsChanged']) {
  on(ev, () => { if (openName && openName !== 'dialog') render(); });
}
