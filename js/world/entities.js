// Entities: Player, Monster (AI), Npc, Pet. Combat math lives in combat.js —
// entities only handle movement, timers, and presentation state.
import { G, emit } from '../core/state.js';
import { TILE, dist, dirFrom, rand, clamp } from '../core/util.js';
import { moveWithCollision } from './world.js';
import { monsterAttackPlayer } from '../game/combat.js';

export class Entity {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.dir = 0; this.face = 1;
    this.animT = Math.random() * 10;
    this.moving = false;
    this.dead = false;
  }
}

export class Player extends Entity {
  constructor(profile) {
    super(0, 0);
    Object.assign(this, {
      name: profile.name, cls: profile.cls, hair: profile.hair,
      level: profile.level ?? 1, exp: profile.exp ?? 0,
      stats: { ...profile.stats },
      autoGain: { ...(profile.autoGain || {}) },
      statSpent: { str: 0, dex: 0, int_: 0, vit: 0, agi: 0, ...(profile.statSpent || {}) },
      statPoints: profile.statPoints ?? 0,
      skillPoints: profile.skillPoints ?? 0,
      skillRanks: { ...(profile.skillRanks || {}) },
      skillSlots: profile.skillSlots ? [...profile.skillSlots] : [null, null, null, null],
      gold: profile.gold ?? 0, plat: profile.plat ?? 0,
      inv: profile.inv ? profile.inv.map(i => i ? { ...i } : null) : new Array(24).fill(null),
      invSize: profile.invSize ?? 24,
      equip: { weapon: null, chest: null, helm: null, boots: null, shield: null,
        ring: null, amulet: null, costume: null,
        ...(profile.equip ? Object.fromEntries(Object.entries(profile.equip)
          .map(([k, v]) => [k, v ? { ...v } : null])) : {}) },
      bank: profile.bank ? profile.bank.map(i => i ? { ...i } : null) : new Array(24).fill(null),
      bankSize: profile.bankSize ?? 24,
      quests: profile.quests ? JSON.parse(JSON.stringify(profile.quests)) : { active: {}, done: [] },
      kills: { ...(profile.kills || {}) },
      counters: { total_kills: 0, bosses: 0, gold_earned: 0, plat_spent: 0,
        enhance_best: 0, zones: ['lumenhold'], quests_done: 0, deaths: 0,
        ...(profile.counters || {}) },
      achievements: [...(profile.achievements || [])],
      titles: [...(profile.titles || [])],
      title: profile.title || null,
      buffs: (profile.buffs || []).map(b => ({ ...b })),
      pet: null, petEntity: null,
      hp: profile.hp ?? 1, mp: profile.mp ?? 1,
      playSeconds: profile.playSeconds || 0,
    });
    this.atkTimer = 0;       // time until next basic attack allowed
    this.atkAnim = 0;        // 0..1 swing animation
    this.castAnim = 0;
    this.cooldowns = {};     // skillId -> seconds left
    this.auto = false;       // auto-attack toggle
    this.regenTick = 0;
    this.combatTimer = 0;    // >0 means "in combat"
    this.stunned = 0;
  }

  update(dt, moveVec) {
    this.animT += dt;
    this.atkTimer = Math.max(0, this.atkTimer - dt);
    this.atkAnim = Math.max(0, this.atkAnim - dt * 2.6);
    this.castAnim = Math.max(0, this.castAnim - dt * 2);
    this.combatTimer = Math.max(0, this.combatTimer - dt);
    this.stunned = Math.max(0, this.stunned - dt);
    for (const k of Object.keys(this.cooldowns)) {
      this.cooldowns[k] -= dt;
      if (this.cooldowns[k] <= 0) delete this.cooldowns[k];
    }
    // buffs expire
    const before = this.buffs.length;
    this.buffs = this.buffs.filter(b => (b.until -= dt) > 0);
    if (this.buffs.length !== before) emit('statsDirty');

    this.moving = false;
    if (moveVec && this.stunned <= 0 && !this.dead) {
      const [mx, my] = moveVec;
      if (mx || my) {
        const sp = this.d.speed * dt;
        moveWithCollision(G.zone, this, mx * sp, my * sp);
        this.dir = dirFrom(mx, my);
        this.face = mx < 0 ? -1 : 1;
        this.moving = true;
      }
    }

    // out-of-combat regen (+food regen buff always)
    this.regenTick += dt;
    if (this.regenTick >= 1) {
      this.regenTick -= 1;
      let hpGain = 0, mpGain = 0;
      if (this.combatTimer <= 0 && !this.dead) {
        hpGain += Math.max(1, this.d.hpMax * 0.02);
        mpGain += Math.max(1, this.d.mpMax * 0.03);
      }
      hpGain += this.d.regen || 0;
      if (hpGain && this.hp < this.d.hpMax) this.hp = clamp(this.hp + hpGain, 0, this.d.hpMax);
      if (mpGain && this.mp < this.d.mpMax) this.mp = clamp(this.mp + mpGain, 0, this.d.mpMax);
    }
  }
}

const AI = { IDLE: 0, WANDER: 1, CHASE: 2, ATTACK: 3, RETURN: 4 };

export class Monster extends Entity {
  constructor(data, x, y, area) {
    super(x, y);
    this.kind = 'monster';
    this.data = data;
    this.area = area;
    this.homeX = x; this.homeY = y;
    this.hp = data.hp; this.hpMax = data.hp;
    this.state = AI.IDLE;
    this.stateT = rand(0.5, 2.5);
    this.wanderDir = [0, 0];
    this.atkTimer = 0;
    this.atkAnim = 0;
    this.flash = 0;
    this.slowUntil = 0; this.slowPct = 0;
    this.stunned = 0;
    this.dots = []; // {dmg, tick, ticksLeft, t, from}
    this.aggroOn = false;
  }

  get speed() {
    let s = this.data.speed;
    if (this.slowUntil > 0) s *= (1 - this.slowPct);
    return s;
  }

  hurtBy() { // called on taking damage: aggro even if passive
    this.aggroOn = true;
    if (this.state === AI.IDLE || this.state === AI.WANDER) this.state = AI.CHASE;
  }

  update(dt) {
    if (this.dead) return;
    this.animT += dt;
    this.flash = Math.max(0, this.flash - dt * 5);
    this.atkAnim = Math.max(0, this.atkAnim - dt * 2.2);
    this.atkTimer = Math.max(0, this.atkTimer - dt);
    this.stunned = Math.max(0, this.stunned - dt);
    this.slowUntil = Math.max(0, this.slowUntil - dt);

    // DoT ticks
    for (let i = this.dots.length - 1; i >= 0; i--) {
      const d = this.dots[i];
      d.t -= dt;
      if (d.t <= 0) {
        d.t += d.tick; d.ticksLeft--;
        emit('dotTick', this, d);
        if (d.ticksLeft <= 0) this.dots.splice(i, 1);
      }
    }
    if (this.stunned > 0) return;

    const p = G.player;
    const dp = p && !p.dead ? dist(this.x, this.y, p.x, p.y) : Infinity;
    const leash = TILE * 14;

    switch (this.state) {
      case AI.IDLE:
        this.moving = false;
        this.stateT -= dt;
        if (this.stateT <= 0) {
          this.state = AI.WANDER; this.stateT = rand(0.8, 2);
          const a = rand(0, Math.PI * 2);
          this.wanderDir = [Math.cos(a), Math.sin(a)];
        }
        this.checkAggro(dp);
        break;
      case AI.WANDER: {
        this.stateT -= dt;
        const sp = this.speed * 0.5 * dt;
        const moved = moveWithCollision(G.zone, this, this.wanderDir[0] * sp, this.wanderDir[1] * sp);
        this.face = this.wanderDir[0] < 0 ? -1 : 1;
        this.moving = true;
        // stay near home area
        if (dist(this.x, this.y, this.homeX, this.homeY) > TILE * 8) {
          this.wanderDir = norm(this.homeX - this.x, this.homeY - this.y);
        }
        if (this.stateT <= 0 || !moved) { this.state = AI.IDLE; this.stateT = rand(1, 3); }
        this.checkAggro(dp);
        break;
      }
      case AI.CHASE: {
        if (!p || p.dead || dp > leash || dist(this.x, this.y, this.homeX, this.homeY) > leash) {
          this.state = AI.RETURN; this.aggroOn = false; break;
        }
        if (dp <= this.data.range) { this.state = AI.ATTACK; break; }
        const dirV = norm(p.x - this.x, p.y - this.y);
        const sp = this.speed * dt;
        moveWithCollision(G.zone, this, dirV[0] * sp, dirV[1] * sp);
        this.face = dirV[0] < 0 ? -1 : 1;
        this.moving = true;
        break;
      }
      case AI.ATTACK: {
        this.moving = false;
        if (!p || p.dead) { this.state = AI.RETURN; break; }
        if (dp > this.data.range * 1.25) { this.state = AI.CHASE; break; }
        this.face = p.x < this.x ? -1 : 1;
        if (this.atkTimer <= 0) {
          this.atkTimer = this.data.atkSpd;
          this.atkAnim = 1;
          monsterAttackPlayer(this);
        }
        break;
      }
      case AI.RETURN: {
        const d = dist(this.x, this.y, this.homeX, this.homeY);
        if (d < 8) { this.state = AI.IDLE; this.stateT = rand(1, 2);
          this.hp = Math.min(this.hpMax, this.hp + this.hpMax * 0.02); break; }
        const dirV = norm(this.homeX - this.x, this.homeY - this.y);
        const sp = this.speed * 1.2 * dt;
        moveWithCollision(G.zone, this, dirV[0] * sp, dirV[1] * sp);
        this.face = dirV[0] < 0 ? -1 : 1;
        this.moving = true;
        // heal fast while returning
        this.hp = Math.min(this.hpMax, this.hp + this.hpMax * dt * 0.3);
        break;
      }
    }
  }

  checkAggro(dp) {
    if (this.aggroOn || (this.data.aggro > 0 && dp < this.data.aggro)) {
      if (G.player && !G.player.dead) this.state = AI.CHASE;
    }
  }
}

function norm(dx, dy) { const d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; }

export class Npc extends Entity {
  constructor(data, x, y) {
    super(x, y);
    this.kind = 'npc';
    this.data = data;
  }
  update(dt) { this.animT += dt; }
}

export class Pet extends Entity {
  constructor(petData, owner) {
    super(owner.x - 40, owner.y);
    this.kind = 'pet';
    this.data = petData;
    this.owner = owner;
  }
  update(dt) {
    this.animT += dt;
    const o = this.owner;
    const d = dist(this.x, this.y, o.x, o.y);
    const want = 46;
    if (d > want) {
      const sp = Math.min(o.d.speed * 1.25, (d - want) * 4) * dt;
      const dirV = norm(o.x - this.x, o.y - this.y);
      this.x += dirV[0] * sp; this.y += dirV[1] * sp;
      this.face = dirV[0] < 0 ? -1 : 1;
      this.moving = true;
    } else this.moving = false;
  }
}
