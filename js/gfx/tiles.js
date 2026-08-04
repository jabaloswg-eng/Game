// Terrain: each zone is generated once (seeded, deterministic) into offscreen
// chunk canvases, then blitted. Water/lava shimmer and prop canopies render live.
import { TILE, seededRng, makeNoise, fbm, mix, shade, clamp } from '../core/util.js';

const CHUNK = 8; // tiles per chunk side

export const BIOMES = {
  town: {
    base: ['#7fae59', '#74a453', '#86b465'], path: '#c9b088', pathEdge: '#a8906a',
    detail: 'grass', water: '#3f7fae', treeKinds: ['oak'], treeDensity: 0.004,
    deco: ['flower', 'bush'], decoDensity: 0.01, light: null,
  },
  meadow: {
    base: ['#82b15c', '#7aaa56', '#8ab662', '#76a452'], path: '#c9b088', pathEdge: '#b09a74',
    detail: 'grass', water: '#3f7fae', treeKinds: ['oak', 'birch'], treeDensity: 0.02,
    deco: ['flower', 'bush', 'rock', 'flower'], decoDensity: 0.04, light: null,
  },
  forest: {
    base: ['#4e7a42', '#48733d', '#548148', '#437038'], path: '#9a8264', pathEdge: '#8a7458',
    detail: 'grass', water: '#2f6488', treeKinds: ['pine', 'oak'], treeDensity: 0.045,
    deco: ['bush', 'rock', 'stump', 'mushroom'], decoDensity: 0.032, light: 'rgba(20,40,24,0.14)',
  },
  desert: {
    base: ['#d6b676', '#cfae6e', '#dcbc80', '#c9a868'], path: '#b08d58', pathEdge: '#a07f50',
    detail: 'sand', water: '#3f8fa0', treeKinds: ['cactus'], treeDensity: 0.012,
    deco: ['rock', 'bones', 'deadbush'], decoDensity: 0.024, light: 'rgba(255,180,80,0.08)',
  },
  snow: {
    base: ['#dfe8ee', '#d8e2ea', '#e4ecf2', '#d2dde6'], path: '#b0bcc8', pathEdge: '#a2aeba',
    detail: 'snow', water: '#5a90b8', treeKinds: ['snowpine'], treeDensity: 0.03,
    deco: ['rock', 'icecrystal'], decoDensity: 0.018, light: 'rgba(150,190,255,0.1)',
  },
  cave: {
    base: ['#3c3648', '#372f43', '#413b4f', '#322c3e'], path: '#57506a', pathEdge: '#4c4560',
    detail: 'crack', water: '#2a5a68', treeKinds: ['pillar'], treeDensity: 0.014,
    deco: ['rock', 'bones', 'crystal', 'candle'], decoDensity: 0.028, light: 'rgba(8,4,20,0.42)',
  },
};

// Build the full static model of a zone: collision grid, chunks, props, water.
export function buildZoneTerrain(zoneDef) {
  const [W, H] = zoneDef.size;
  const biome = BIOMES[zoneDef.biome];
  const rng = seededRng(zoneDef.seed);
  const noise = makeNoise(zoneDef.seed * 7 + 1);
  const block = new Uint8Array(W * H); // 1 = impassable
  const waterTiles = [];

  // --- water: a few lakes hugging low-noise areas (never on POIs) ---
  const pois = collectPois(zoneDef);
  const isNearPoi = (tx, ty, r = 5) => pois.some(p => Math.abs(p[0] - tx) <= r && Math.abs(p[1] - ty) <= r);
  const waterMask = new Uint8Array(W * H);
  if (zoneDef.biome !== 'cave') {
    for (let ty = 2; ty < H - 2; ty++) for (let tx = 2; tx < W - 2; tx++) {
      if (fbm(noise, tx * 0.06, ty * 0.06, 3) < 0.3 && !isNearPoi(tx, ty, 7)) {
        waterMask[ty * W + tx] = 1; block[ty * W + tx] = 1; waterTiles.push([tx, ty]);
      }
    }
  } else { // cave: chasms instead
    for (let ty = 2; ty < H - 2; ty++) for (let tx = 2; tx < W - 2; tx++) {
      if (fbm(noise, tx * 0.05 + 40, ty * 0.05, 3) < 0.26 && !isNearPoi(tx, ty, 7)) {
        waterMask[ty * W + tx] = 2; block[ty * W + tx] = 1;
      }
    }
  }

  // --- border ring impassable ---
  for (let tx = 0; tx < W; tx++) { block[tx] = 1; block[(H - 1) * W + tx] = 1; }
  for (let ty = 0; ty < H; ty++) { block[ty * W] = 1; block[ty * W + W - 1] = 1; }
  // carve portals open
  for (const p of zoneDef.portals) {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const tx = clamp(p.at[0] + dx, 0, W - 1), ty = clamp(p.at[1] + dy, 0, H - 1);
      block[ty * W + tx] = 0; waterMask[ty * W + tx] = 0;
    }
  }

  // --- paths connecting POIs (visual + guaranteed walkable) ---
  const pathMask = new Uint8Array(W * H);
  const anchor = zoneDef.playerStart;
  for (const p of collectPois(zoneDef, true)) carvePath(pathMask, waterMask, block, anchor, p, W, H, rng);

  // --- props (trees collide, deco doesn't) ---
  const props = [];
  const occupied = new Set();
  const tryPlace = (kind, tx, ty, collides, s) => {
    const key = tx + ',' + ty;
    if (occupied.has(key) || block[ty * W + tx] || pathMask[ty * W + tx] || isNearPoi(tx, ty, 3)) return;
    occupied.add(key);
    if (collides) block[ty * W + tx] = 1;
    props.push({ kind, x: (tx + 0.5) * TILE, y: (ty + 0.9) * TILE, s: s || 0.85 + rng() * 0.45, seed: rng() * 1000 });
  };
  for (let ty = 2; ty < H - 2; ty++) for (let tx = 2; tx < W - 2; tx++) {
    const r = rng();
    if (r < biome.treeDensity) {
      tryPlace(biome.treeKinds[Math.floor(rng() * biome.treeKinds.length)], tx, ty, true);
    } else if (r < biome.treeDensity + biome.decoDensity) {
      tryPlace(biome.deco[Math.floor(rng() * biome.deco.length)], tx, ty, false, 0.6 + rng() * 0.5);
    }
  }

  // --- town extras: buildings, plaza, lanterns, fences ---
  if (zoneDef.biome === 'town') buildTown(zoneDef, block, pathMask, props, W, H);

  // --- pre-render chunks ---
  const chunksX = Math.ceil(W / CHUNK), chunksY = Math.ceil(H / CHUNK);
  const chunks = [];
  for (let cy = 0; cy < chunksY; cy++) for (let cx = 0; cx < chunksX; cx++) {
    chunks.push(renderChunk(cx, cy, W, H, biome, noise, rng, waterMask, pathMask, zoneDef));
  }

  return { W, H, block, chunks, chunksX, chunksY, props, waterTiles, pathMask, biome };
}

function collectPois(zoneDef, forPaths = false) {
  const pois = [];
  for (const p of zoneDef.portals) pois.push(p.at);
  for (const n of zoneDef.npcs) pois.push(n.at);
  if (zoneDef.boss) pois.push(zoneDef.boss.at);
  if (!forPaths) { // spawn centers keep water/props away but don't get roads
    for (const s of zoneDef.spawns) pois.push([Math.floor(s.area.x + s.area.w / 2), Math.floor(s.area.y + s.area.h / 2)]);
  }
  pois.push(zoneDef.playerStart);
  return pois;
}

function carvePath(pathMask, waterMask, block, from, to, W, H, rng) {
  let [x, y] = from;
  const [gx, gy] = to;
  let guard = W * H;
  while ((x !== gx || y !== gy) && guard-- > 0) {
    const dx = Math.sign(gx - x), dy = Math.sign(gy - y);
    if (dx !== 0 && (dy === 0 || rng() < 0.55)) x += dx; else if (dy !== 0) y += dy;
    // narrow path: center + orthogonal neighbors (keeps walkability, avoids broad slabs)
    for (const [ox, oy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const tx = clamp(x + ox, 1, W - 2), ty = clamp(y + oy, 1, H - 2);
      const i = ty * W + tx;
      if (ox === 0 || oy === 0) pathMask[i] = 1;
      if (waterMask[i]) { waterMask[i] = 0; block[i] = 0; } // bridge over water
      else if (block[i] && tx > 0 && tx < W - 1 && ty > 0 && ty < H - 1) block[i] = 0;
    }
  }
}

function buildTown(zoneDef, block, pathMask, props, W, H) {
  // Buildings behind each service NPC + décor. Blueprint: [w,h in tiles, roof, kind]
  const homes = {
    elder_maren: { w: 7, h: 4, roof: '#7a4a8a', kind: 'hall' },
    merchant_bella: { w: 5, h: 3, roof: '#a85838', kind: 'shop' },
    torvald: { w: 5, h: 3, roof: '#5a5a68', kind: 'forge' },
    banker_odo: { w: 5, h: 3, roof: '#4a6a9a', kind: 'bank' },
    zephyr: { w: 4, h: 3, roof: '#3a9a8a', kind: 'tent' },
    captain_aldric: { w: 4, h: 3, roof: '#8a3a32', kind: 'shop' },
    sylvie: { w: 4, h: 3, roof: '#4a7a3a', kind: 'shop' },
    magister_orin: { w: 4, h: 3, roof: '#3a4a9a', kind: 'tower' },
  };
  for (const n of zoneDef.npcs) {
    const b = homes[n.id];
    if (!b) continue;
    const bx = n.at[0] - Math.floor(b.w / 2), by = n.at[1] - b.h - 1;
    for (let ty = by; ty < by + b.h; ty++) for (let tx = bx; tx < bx + b.w; tx++) {
      if (tx >= 0 && tx < W && ty >= 0 && ty < H) block[ty * W + tx] = 1;
    }
    props.push({ kind: 'building', x: (bx + b.w / 2) * TILE, y: (by + b.h) * TILE,
      s: 1, seed: 0, bw: b.w * TILE, bh: b.h * TILE, roof: b.roof, sub: b.kind });
  }
  // plaza fountain
  const [cx, cy] = [23, 18];
  props.push({ kind: 'fountain', x: (cx + 0.5) * TILE, y: (cy + 1) * TILE, s: 1, seed: 1 });
  for (let ty = cy - 1; ty <= cy + 1; ty++) for (let tx = cx - 1; tx <= cx + 2; tx++) block[ty * W + tx] = 1;
  // lanterns along main axes
  for (const [lx, ly] of [[18, 15], [28, 15], [18, 26], [28, 26], [38, 19], [8, 21]]) {
    props.push({ kind: 'lantern', x: (lx + 0.5) * TILE, y: (ly + 0.8) * TILE, s: 1, seed: lx });
  }
}

function renderChunk(cx, cy, W, H, biome, noise, rng, waterMask, pathMask, zoneDef) {
  const px = CHUNK * TILE;
  const cv = document.createElement('canvas');
  cv.width = px; cv.height = px;
  const ctx = cv.getContext('2d');
  const x0 = cx * CHUNK, y0 = cy * CHUNK;

  for (let ty = y0; ty < Math.min(y0 + CHUNK, H); ty++) {
    for (let tx = x0; tx < Math.min(x0 + CHUNK, W); tx++) {
      const lx = (tx - x0) * TILE, ly = (ty - y0) * TILE;
      const i = ty * W + tx;
      // base ground with noise blend between palette colors
      const n = fbm(noise, tx * 0.13, ty * 0.13, 3);
      const n2 = fbm(noise, tx * 0.55 + 9, ty * 0.55, 2);
      const ci = Math.floor(n * biome.base.length) % biome.base.length;
      const cj = (ci + 1) % biome.base.length;
      ctx.fillStyle = mix(biome.base[ci], biome.base[cj], n2 * 0.7);
      ctx.fillRect(lx, ly, TILE, TILE);
      // soft luminance patching for painterly feel (radial, so tile seams stay invisible)
      if (n2 > 0.62 || n2 < 0.35) {
        const pg = ctx.createRadialGradient(lx + TILE / 2, ly + TILE / 2, 4, lx + TILE / 2, ly + TILE / 2, TILE * 0.9);
        const c = n2 > 0.62 ? '255,250,220' : '8,16,8';
        pg.addColorStop(0, `rgba(${c},${n2 > 0.62 ? 0.07 : 0.08})`);
        pg.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = pg;
        ctx.fillRect(lx - TILE / 2, ly - TILE / 2, TILE * 2, TILE * 2);
      }

      if (waterMask[i] === 1) paintWaterTile(ctx, lx, ly, biome, waterMask, W, H, tx, ty);
      else if (waterMask[i] === 2) paintChasmTile(ctx, lx, ly, waterMask, W, H, tx, ty);
      else if (pathMask[i]) paintPathTile(ctx, lx, ly, biome, pathMask, W, H, tx, ty, noise);
      else paintDetail(ctx, lx, ly, biome.detail, rng, mixSeed(tx, ty));
    }
  }
  return { cv, x: x0 * TILE, y: y0 * TILE };
}
function mixSeed(tx, ty) { return ((tx * 7349 + ty * 9151) % 1000) / 1000; }

function paintDetail(ctx, lx, ly, kind, rng, s) {
  const r = seededRng(Math.floor(s * 100000) + 7);
  if (kind === 'grass') {
    const blades = 4 + Math.floor(r() * 5);
    for (let b = 0; b < blades; b++) {
      const bx = lx + r() * TILE, by = ly + r() * TILE;
      ctx.strokeStyle = `rgba(${40 + r() * 60},${100 + r() * 70},${40 + r() * 40},0.5)`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + 2 - r() * 4, by - 5 - r() * 5, bx + 3 - r() * 6, by - 8 - r() * 5);
      ctx.stroke();
    }
  } else if (kind === 'sand') {
    ctx.strokeStyle = 'rgba(120,90,50,0.16)'; ctx.lineWidth = 2;
    const wy = ly + r() * TILE;
    ctx.beginPath(); ctx.moveTo(lx, wy);
    ctx.quadraticCurveTo(lx + TILE / 2, wy + 6 - r() * 12, lx + TILE, wy);
    ctx.stroke();
    if (r() < 0.3) { ctx.fillStyle = 'rgba(90,66,36,0.3)';
      ctx.beginPath(); ctx.arc(lx + r() * TILE, ly + r() * TILE, 1.6, 0, Math.PI * 2); ctx.fill(); }
  } else if (kind === 'snow') {
    if (r() < 0.5) {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      for (let d = 0; d < 3; d++) { ctx.beginPath();
        ctx.arc(lx + r() * TILE, ly + r() * TILE, 1 + r(), 0, Math.PI * 2); ctx.fill(); }
    }
    if (r() < 0.14) { ctx.fillStyle = 'rgba(160,190,220,0.35)';
      ctx.beginPath(); ctx.ellipse(lx + r() * TILE, ly + r() * TILE, 6 + r() * 6, 3, r(), 0, Math.PI * 2); ctx.fill(); }
  } else if (kind === 'crack') {
    if (r() < 0.35) {
      ctx.strokeStyle = 'rgba(10,6,20,0.5)'; ctx.lineWidth = 1.2;
      let px2 = lx + r() * TILE, py2 = ly + r() * TILE;
      ctx.beginPath(); ctx.moveTo(px2, py2);
      for (let sgm = 0; sgm < 3; sgm++) { px2 += 6 - r() * 12; py2 += 6 - r() * 12; ctx.lineTo(px2, py2); }
      ctx.stroke();
    }
    if (r() < 0.1) { ctx.fillStyle = 'rgba(140,170,255,0.12)';
      ctx.beginPath(); ctx.arc(lx + r() * TILE, ly + r() * TILE, 3 + r() * 3, 0, Math.PI * 2); ctx.fill(); }
  }
}

function neighborMask(mask, W, H, tx, ty, val) {
  const at = (x, y) => x < 0 || y < 0 || x >= W || y >= H ? val : mask[y * W + x];
  return { n: at(tx, ty - 1) === val, s: at(tx, ty + 1) === val, w: at(tx - 1, ty) === val, e: at(tx + 1, ty) === val };
}

function paintWaterTile(ctx, lx, ly, biome, mask, W, H, tx, ty) {
  const g = ctx.createLinearGradient(lx, ly, lx, ly + TILE);
  g.addColorStop(0, shade(biome.water, 0.12));
  g.addColorStop(1, shade(biome.water, -0.25));
  ctx.fillStyle = g; ctx.fillRect(lx, ly, TILE, TILE);
  const nb = neighborMask(mask, W, H, tx, ty, 1);
  ctx.strokeStyle = 'rgba(235,246,255,0.65)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  if (!nb.n) { ctx.beginPath(); ctx.moveTo(lx + 4, ly + 2.4); ctx.lineTo(lx + TILE - 4, ly + 2.4); ctx.stroke(); }
  if (!nb.s) { ctx.beginPath(); ctx.moveTo(lx + 4, ly + TILE - 2.4); ctx.lineTo(lx + TILE - 4, ly + TILE - 2.4); ctx.stroke(); }
  if (!nb.w) { ctx.beginPath(); ctx.moveTo(lx + 2.4, ly + 4); ctx.lineTo(lx + 2.4, ly + TILE - 4); ctx.stroke(); }
  if (!nb.e) { ctx.beginPath(); ctx.moveTo(lx + TILE - 2.4, ly + 4); ctx.lineTo(lx + TILE - 2.4, ly + TILE - 4); ctx.stroke(); }
}

function paintChasmTile(ctx, lx, ly, mask, W, H, tx, ty) {
  const g = ctx.createLinearGradient(lx, ly, lx, ly + TILE);
  g.addColorStop(0, '#0c0a16'); g.addColorStop(1, '#05040c');
  ctx.fillStyle = g; ctx.fillRect(lx, ly, TILE, TILE);
  const nb = neighborMask(mask, W, H, tx, ty, 2);
  if (!nb.n) { const eg = ctx.createLinearGradient(lx, ly, lx, ly + 10);
    eg.addColorStop(0, 'rgba(120,110,150,0.55)'); eg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = eg; ctx.fillRect(lx, ly, TILE, 10); }
}

function paintPathTile(ctx, lx, ly, biome, mask, W, H, tx, ty, noise) {
  const n = fbm(noise, tx * 0.12 + 33, ty * 0.12, 2); // broad scale → no per-tile checkering
  ctx.fillStyle = mix(biome.path, biome.pathEdge, n * 0.6);
  const nb = neighborMask(mask, W, H, tx, ty, 1);
  const r = 12;
  // rounded joins: fill center, then edges only toward path neighbors
  ctx.beginPath();
  ctx.moveTo(lx + r, ly + (nb.n ? 0 : 3));
  ctx.arcTo(lx + TILE, ly, lx + TILE, ly + TILE, nb.n || nb.e ? 3 : r);
  ctx.arcTo(lx + TILE, ly + TILE, lx, ly + TILE, nb.s || nb.e ? 3 : r);
  ctx.arcTo(lx, ly + TILE, lx, ly, nb.s || nb.w ? 3 : r);
  ctx.arcTo(lx, ly, lx + TILE, ly, nb.n || nb.w ? 3 : r);
  ctx.closePath(); ctx.fill();
  // pebbles
  const rr = seededRng(tx * 31 + ty * 57);
  for (let p = 0; p < 3; p++) {
    if (rr() < 0.5) { ctx.fillStyle = `rgba(255,250,240,${0.1 + rr() * 0.12})`;
      ctx.beginPath(); ctx.arc(lx + rr() * TILE, ly + rr() * TILE, 1.6 + rr() * 1.6, 0, Math.PI * 2); ctx.fill(); }
  }
}
