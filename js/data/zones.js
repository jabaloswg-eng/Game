// Zone blueprints. Positions are in tiles (world px = tile * 64); world.js turns
// these into collision grids, prop fields, spawner state and portal gates.
// spawns: rect areas {x,y,w,h} in tiles with monster id + herd count.
export const ZONES = {
  lumenhold: {
    id: 'lumenhold', name: 'Lumenhold', biome: 'town', size: [46, 38], seed: 101,
    safe: true, music: 'town',
    portals: [
      { to: 'dawnmeadow', at: [44, 19], dest: [3, 20], label: 'Dawnmeadow Fields' },
    ],
    npcs: [
      { id: 'elder_maren', at: [23, 12] },
      { id: 'captain_aldric', at: [15, 17] },
      { id: 'sylvie', at: [31, 17] },
      { id: 'magister_orin', at: [23, 21] },
      { id: 'merchant_bella', at: [13, 24] },
      { id: 'torvald', at: [33, 24] },
      { id: 'banker_odo', at: [17, 29] },
      { id: 'zephyr', at: [29, 29] },
    ],
    spawns: [], boss: null,
    playerStart: [23, 26],
  },
  dawnmeadow: {
    id: 'dawnmeadow', name: 'Dawnmeadow Fields', biome: 'meadow', size: [86, 64], seed: 202,
    music: 'meadow',
    portals: [
      { to: 'lumenhold', at: [1, 20], dest: [43, 19], label: 'Lumenhold' },
      { to: 'thornwood', at: [84, 44], dest: [3, 30], label: 'The Thornwood', minLvl: 6 },
    ],
    npcs: [{ id: 'scout_finn', at: [12, 22] }],
    spawns: [
      { id: 'dew_slime', n: 9, area: { x: 8, y: 8, w: 26, h: 18 } },
      { id: 'dew_slime', n: 6, area: { x: 14, y: 34, w: 20, h: 16 } },
      { id: 'meadow_boar', n: 8, area: { x: 36, y: 12, w: 24, h: 20 } },
      { id: 'thistle_sprite', n: 7, area: { x: 40, y: 38, w: 24, h: 16 } },
      { id: 'field_wolf', n: 7, area: { x: 62, y: 20, w: 20, h: 26 } },
    ],
    boss: { id: 'bramblehide', at: [74, 10], radius: 6 },
    playerStart: [4, 20],
  },
  thornwood: {
    id: 'thornwood', name: 'The Thornwood', biome: 'forest', size: [88, 66], seed: 303,
    music: 'forest',
    portals: [
      { to: 'dawnmeadow', at: [1, 30], dest: [82, 44], label: 'Dawnmeadow Fields' },
      { to: 'cinderdunes', at: [86, 24], dest: [3, 26], label: 'The Cinderdunes', minLvl: 14 },
    ],
    npcs: [{ id: 'hermit_gale', at: [14, 14] }],
    spawns: [
      { id: 'thorn_creeper', n: 8, area: { x: 8, y: 24, w: 22, h: 20 } },
      { id: 'bandit_scout', n: 7, area: { x: 30, y: 8, w: 24, h: 16 } },
      { id: 'webweaver', n: 8, area: { x: 34, y: 30, w: 22, h: 20 } },
      { id: 'timber_wolf', n: 7, area: { x: 58, y: 12, w: 22, h: 20 } },
      { id: 'bark_treant', n: 6, area: { x: 58, y: 40, w: 24, h: 18 } },
    ],
    boss: { id: 'oakenheart', at: [20, 56], radius: 6 },
    playerStart: [4, 30],
  },
  cinderdunes: {
    id: 'cinderdunes', name: 'The Cinderdunes', biome: 'desert', size: [90, 64], seed: 404,
    music: 'desert',
    portals: [
      { to: 'thornwood', at: [1, 26], dest: [84, 24], label: 'The Thornwood' },
      { to: 'frostfell', at: [88, 40], dest: [3, 32], label: 'Frostfell Pass', minLvl: 23 },
    ],
    npcs: [{ id: 'caravaneer_rasha', at: [12, 30] }],
    spawns: [
      { id: 'ash_scorpion', n: 9, area: { x: 10, y: 8, w: 26, h: 20 } },
      { id: 'dune_marauder', n: 7, area: { x: 34, y: 26, w: 22, h: 18 } },
      { id: 'cinder_wisp', n: 8, area: { x: 40, y: 6, w: 26, h: 16 } },
      { id: 'sand_golem', n: 6, area: { x: 62, y: 26, w: 24, h: 22 } },
    ],
    boss: { id: 'sirocco', at: [76, 8], radius: 6 },
    playerStart: [4, 26],
  },
  frostfell: {
    id: 'frostfell', name: 'Frostfell Pass', biome: 'snow', size: [88, 66], seed: 505,
    music: 'snow',
    portals: [
      { to: 'cinderdunes', at: [1, 32], dest: [86, 40], label: 'The Cinderdunes' },
      { to: 'hollowdepths', at: [86, 12], dest: [3, 34], label: 'The Hollow Depths', minLvl: 31 },
    ],
    npcs: [{ id: 'ranger_eydis', at: [12, 26] }],
    spawns: [
      { id: 'frost_bat', n: 9, area: { x: 8, y: 8, w: 24, h: 20 } },
      { id: 'snow_wolf', n: 8, area: { x: 30, y: 30, w: 24, h: 20 } },
      { id: 'ice_wraith', n: 7, area: { x: 44, y: 8, w: 24, h: 18 } },
      { id: 'frost_yeti', n: 6, area: { x: 62, y: 32, w: 22, h: 20 } },
    ],
    boss: { id: 'borealis', at: [76, 54], radius: 6 },
    playerStart: [4, 32],
  },
  hollowdepths: {
    id: 'hollowdepths', name: 'The Hollow Depths', biome: 'cave', size: [84, 62], seed: 606,
    music: 'cave',
    portals: [
      { to: 'frostfell', at: [1, 34], dest: [84, 12], label: 'Frostfell Pass' },
    ],
    npcs: [{ id: 'lysander', at: [10, 28] }],
    spawns: [
      { id: 'hollow_skeleton', n: 9, area: { x: 8, y: 8, w: 24, h: 20 } },
      { id: 'gloom_spider', n: 8, area: { x: 30, y: 28, w: 22, h: 20 } },
      { id: 'umbral_knight', n: 7, area: { x: 52, y: 8, w: 22, h: 18 } },
      { id: 'void_wraith', n: 7, area: { x: 52, y: 34, w: 22, h: 18 } },
    ],
    boss: { id: 'hollow_king', at: [74, 52], radius: 7, lair: true },
    playerStart: [4, 34],
  },
};

export const ZONE_ORDER = ['lumenhold', 'dawnmeadow', 'thornwood', 'cinderdunes', 'frostfell', 'hollowdepths'];
