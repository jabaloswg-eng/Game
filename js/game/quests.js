// Quest runtime: availability, accept/turn-in, progress tracking, markers.
import { G, emit, on } from '../core/state.js';
import { QUESTS, questById, itemById } from '../data/db.js';
import { grantExp } from './stats.js';
import { addItem, removeItem, countItem, addGold, addPlat } from './inventory.js';
import { sfx } from '../core/audio.js';

export function questState(qid) {
  const p = G.player;
  if (p.quests.done.includes(qid)) return 'done';
  if (p.quests.active[qid]) return 'active';
  return 'locked';
}

export function questAvailableFrom(npcId) {
  // first not-yet-taken quest whose giver is this npc and prereqs are met
  const p = G.player;
  for (const q of QUESTS) {
    if (q.giver !== npcId) continue;
    if (questState(q.id) !== 'locked') continue;
    if (q.minLvl > p.level) continue;
    if (q.prereq && !p.quests.done.includes(q.prereq)) continue;
    return q;
  }
  return null;
}

export function questTurnInFor(npcId) {
  // active quest that is complete and turns in at this npc:
  // talk quests turn in at target npc, others at the giver.
  const p = G.player;
  for (const qid of Object.keys(p.quests.active)) {
    const q = questById(qid);
    if (!q) continue;
    const turnNpc = q.type === 'talk' ? q.target : q.giver;
    if (turnNpc !== npcId) continue;
    if (isQuestComplete(q)) return q;
  }
  return null;
}

export function questProgress(q) {
  const p = G.player;
  const st = p.quests.active[q.id];
  if (!st) return 0;
  if (q.type === 'kill' || q.type === 'boss') return st.n || 0;
  if (q.type === 'collect') return Math.min(countItem(q.target), q.count);
  if (q.type === 'talk') return st.n || 0;
  return 0;
}
export function isQuestComplete(q) { return questProgress(q) >= q.count; }

export function acceptQuest(qid) {
  const p = G.player;
  const q = questById(qid);
  if (!q || questState(qid) !== 'locked') return false;
  p.quests.active[qid] = { n: 0 };
  // deliver-style talk quests hand the player their parcel
  if (q.type === 'talk') {
    const parcel = deliveryItemFor(q);
    if (parcel) addItem(parcel, 1);
  }
  sfx.quest();
  emit('questAccepted', q);
  return true;
}

function deliveryItemFor(q) {
  // convention: a talk quest whose dialogue references a q_* item carries it
  const text = (q.offer || '') + ' ' + (q.name || '');
  for (const qi of ['q_maren_letter', 'q_caravan_ledger']) {
    const item = itemById(qi);
    if (item && (text.toLowerCase().includes('letter') && qi === 'q_maren_letter')) return qi;
    if (item && (text.toLowerCase().includes('ledger') && qi === 'q_caravan_ledger')) return qi;
  }
  return null;
}

export function completeQuest(qid) {
  const p = G.player;
  const q = questById(qid);
  if (!q || !p.quests.active[qid] || !isQuestComplete(q)) return false;

  if (q.type === 'collect') removeItem(q.target, q.count);
  if (q.type === 'talk') {
    const parcel = deliveryItemFor(q);
    if (parcel) removeItem(parcel, countItem(parcel));
  }
  delete p.quests.active[qid];
  p.quests.done.push(qid);
  p.counters.quests_done++;

  const r = q.rewards || {};
  if (r.exp) {
    const res = grantExp(p, r.exp);
    if (res.leveled) emit('levelUp');
  }
  if (r.gold) addGold(r.gold);
  if (r.plat) { addPlat(r.plat); emit('platGain', r.plat, q.name); }
  for (const it of r.items || []) addItem(it.id, it.qty || 1);

  sfx.quest();
  emit('questCompleted', q);
  return true;
}

export function initQuestTracking() {
  on('monsterKilled', mon => {
    const p = G.player;
    for (const qid of Object.keys(p.quests.active)) {
      const q = questById(qid);
      if (!q) continue;
      if ((q.type === 'kill' || q.type === 'boss') && q.target === mon.data.id) {
        const st = p.quests.active[qid];
        if (st.n < q.count) {
          st.n++;
          emit('questProgress', q, st.n);
        }
      }
    }
  });
  on('zoneLoaded', zoneId => {
    const p = G.player;
    // 'talk' quest to an npc in this zone is progressed by talking (dialogue.js)
    if (!p.counters.zones.includes(zoneId)) {
      p.counters.zones.push(zoneId);
      emit('zoneDiscovered', zoneId);
    }
  });
}

export function markTalked(npcId) {
  const p = G.player;
  for (const qid of Object.keys(p.quests.active)) {
    const q = questById(qid);
    if (q && q.type === 'talk' && q.target === npcId) {
      p.quests.active[qid].n = q.count;
      emit('questProgress', q, q.count);
    }
  }
}

// Marker for NPC: '!' = quest available, '?' = turn-in ready, '…' = in progress with them
export function npcMarker(npcId) {
  if (questTurnInFor(npcId)) return '?';
  if (questAvailableFrom(npcId)) return '!';
  const p = G.player;
  for (const qid of Object.keys(p.quests.active)) {
    const q = questById(qid);
    if (q && (q.giver === npcId || (q.type === 'talk' && q.target === npcId))) return '…';
  }
  return null;
}

export function activeQuestList() {
  const p = G.player;
  return Object.keys(p.quests.active).map(questById).filter(Boolean);
}
