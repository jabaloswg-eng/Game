// world.js — builds the valley: terrain, lake, trees, rocks, flowers, sky and light.

import * as THREE from 'three';
import { groundTexture, barkTexture, waterNormalTexture } from './textures.js';

export const WATER_LEVEL = -1.4;
export const WORLD_SIZE = 440;

// ---------------------------------------------------------------------------
// Deterministic noise — the same coordinates always give the same height, so
// the world looks identical on every visit without storing any data.
// ---------------------------------------------------------------------------

function hash(ix, iz) {
  let n = (ix * 374761393 + iz * 668265263) | 0;
  n = ((n ^ (n >> 13)) * 1274126177) | 0;
  n = n ^ (n >> 16);
  return (n & 0x7fffffff) / 0x7fffffff;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function valueNoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = smooth(x - ix), fz = smooth(z - iz);
  const a = hash(ix, iz), b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

// Fractal noise: several layers of valueNoise at different scales, in [-1, 1].
function fbm(x, z) {
  let sum = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < 4; i++) {
    sum += (valueNoise(x * freq, z * freq) * 2 - 1) * amp;
    freq *= 2.1;
    amp *= 0.5;
  }
  return sum;
}

function smoothstep(a, b, t) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

// ---------------------------------------------------------------------------
// Terrain shape: rolling hills, a lake basin, and a ring of mountains that
// encloses the valley.
// ---------------------------------------------------------------------------

const LAKE = { x: -45, z: 35, radius: 26 };

export function terrainHeight(x, z) {
  const r = Math.hypot(x, z);
  let h = 2.5 + fbm(x * 0.018, z * 0.018) * 5.5;
  h += fbm(x * 0.06 + 40, z * 0.06 - 17) * 1.1;

  const ring = smoothstep(150, 200, r);
  h += ring * (30 + fbm(x * 0.01 + 90, z * 0.01 + 90) * 14 + 18 * smoothstep(170, 215, r));

  const dLake = (x - LAKE.x) ** 2 + (z - LAKE.z) ** 2;
  h -= Math.exp(-dLake / (2 * LAKE.radius * LAKE.radius)) * 11;

  return h;
}

// ---------------------------------------------------------------------------
// Terrain mesh with painted vertex colors (sand → grass → rock → snow).
// ---------------------------------------------------------------------------

const SAND = new THREE.Color(0xd9c58a);
const GRASS_LOW = new THREE.Color(0x58a844);
const GRASS_HIGH = new THREE.Color(0x3c7f34);
const ROCK = new THREE.Color(0xa3a3ae);
const SNOW = new THREE.Color(0xf2f5f9);

function buildTerrain() {
  const segments = 220;
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, segments, segments);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);

    const jitter = (hash(Math.round(x * 3), Math.round(z * 3)) - 0.5) * 0.12;
    if (h < WATER_LEVEL + 0.7) {
      c.copy(SAND);
    } else if (h < 16) {
      c.lerpColors(GRASS_LOW, GRASS_HIGH, smoothstep(0, 16, h) + jitter);
    } else if (h < 34) {
      c.lerpColors(GRASS_HIGH, ROCK, smoothstep(16, 34, h) + jitter);
    } else {
      c.lerpColors(ROCK, SNOW, smoothstep(38, 52, h));
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: groundTexture(),
    roughness: 0.95,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

// ---------------------------------------------------------------------------
// Scatter helpers — instanced meshes keep hundreds of props fast to draw.
// ---------------------------------------------------------------------------

// Finds spots on open grassland (not underwater, not on the mountains,
// and never right on top of the player's spawn point at the center).
function grassSpots(count, seed, minH = WATER_LEVEL + 1.2, maxH = 18, maxR = 160, minR = 12) {
  const spots = [];
  let i = 0;
  while (spots.length < count && i < count * 30) {
    i++;
    const x = (hash(seed + i, 17) - 0.5) * 2 * maxR;
    const z = (hash(seed + i, 91) - 0.5) * 2 * maxR;
    const r = Math.hypot(x, z);
    if (r > maxR || r < minR) continue;
    const h = terrainHeight(x, z);
    if (h < minH || h > maxH) continue;
    spots.push({ x, z, h, r: hash(seed + i, 53) });
  }
  return spots;
}

function buildTrees(scene) {
  const spots = grassSpots(190, 1000);
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 2.2, 7);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x8a6240,
    map: barkTexture(),
    roughness: 0.9,
  });
  // two stacked leaf cones give the canopy a fuller, layered silhouette
  const leafGeo1 = new THREE.ConeGeometry(1.85, 2.7, 7);
  const leafGeo2 = new THREE.ConeGeometry(1.25, 2.1, 7);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length);
  const leaves1 = new THREE.InstancedMesh(leafGeo1, leafMat, spots.length);
  const leaves2 = new THREE.InstancedMesh(leafGeo2, leafMat, spots.length);
  trunks.castShadow = leaves1.castShadow = leaves2.castShadow = true;
  leaves1.receiveShadow = leaves2.receiveShadow = true;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const leafColor = new THREE.Color();

  spots.forEach((s, i) => {
    const scale = 0.75 + s.r * 0.9;
    const sv = new THREE.Vector3(scale, scale, scale);
    q.setFromAxisAngle(up, s.r * Math.PI * 2);
    m.compose(new THREE.Vector3(s.x, s.h + 1.0 * scale, s.z), q, sv);
    trunks.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(s.x, s.h + 3.1 * scale, s.z), q, sv);
    leaves1.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(s.x, s.h + 4.6 * scale, s.z), q, sv);
    leaves2.setMatrixAt(i, m);
    leafColor.setHSL(0.31 + s.r * 0.06, 0.55, 0.3 + s.r * 0.12);
    leaves1.setColorAt(i, leafColor);
    leaves2.setColorAt(i, leafColor);
  });

  scene.add(trunks, leaves1, leaves2);
}

// small grass blades scattered across the meadows for ground-level detail
function buildGrassTufts(scene) {
  const spots = grassSpots(750, 4000, WATER_LEVEL + 1.0, 15, 155, 4);
  const geo = new THREE.ConeGeometry(0.07, 0.4, 4);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const tufts = new THREE.InstancedMesh(geo, mat, spots.length);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const color = new THREE.Color();
  spots.forEach((s, i) => {
    const scale = 0.7 + s.r * 1.1;
    e.set((s.r - 0.5) * 0.5, s.r * Math.PI * 2, (s.r - 0.5) * 0.5);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(s.x, s.h + 0.16 * scale, s.z), q, new THREE.Vector3(scale, scale, scale));
    tufts.setMatrixAt(i, m);
    color.setHSL(0.29 + s.r * 0.07, 0.5, 0.28 + s.r * 0.14);
    tufts.setColorAt(i, color);
  });
  scene.add(tufts);
}

function buildRocks(scene) {
  const spots = grassSpots(90, 2000, WATER_LEVEL + 0.4, 30, 175);
  const geo = new THREE.DodecahedronGeometry(0.9, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x9a9aa4, roughness: 0.95, flatShading: true });
  const rocks = new THREE.InstancedMesh(geo, mat, spots.length);
  rocks.castShadow = rocks.receiveShadow = true;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  spots.forEach((s, i) => {
    const scale = 0.4 + s.r * 1.6;
    q.setFromEuler(new THREE.Euler(s.r * 2, s.r * 9, s.r * 5));
    m.compose(
      new THREE.Vector3(s.x, s.h + 0.15 * scale, s.z),
      q,
      new THREE.Vector3(scale, scale * (0.55 + s.r * 0.4), scale)
    );
    rocks.setMatrixAt(i, m);
  });
  scene.add(rocks);
}

function buildFlowers(scene) {
  const spots = grassSpots(320, 3000, WATER_LEVEL + 1.4, 14, 150);
  const geo = new THREE.SphereGeometry(0.13, 6, 5);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const flowers = new THREE.InstancedMesh(geo, mat, spots.length);

  const palette = [0xff7eb6, 0xffd166, 0xf4f1ec, 0xb388ff, 0xff9c66];
  const m = new THREE.Matrix4();
  const color = new THREE.Color();
  spots.forEach((s, i) => {
    m.makeTranslation(s.x, s.h + 0.08, s.z);
    flowers.setMatrixAt(i, m);
    color.set(palette[Math.floor(s.r * palette.length) % palette.length]);
    flowers.setColorAt(i, color);
  });
  scene.add(flowers);
}

// ---------------------------------------------------------------------------
// Sky, clouds, water and lighting.
// ---------------------------------------------------------------------------

function buildSky(scene) {
  const geo = new THREE.SphereGeometry(900, 24, 12);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x3f7fd6) },
      horizon: { value: new THREE.Color(0xcfe8f7) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 top;
      uniform vec3 horizon;
      varying vec3 vPos;
      void main() {
        float t = clamp(normalize(vPos).y * 1.6 + 0.12, 0.0, 1.0);
        gl_FragColor = vec4(mix(horizon, top, t), 1.0);
      }
    `,
  });
  scene.add(new THREE.Mesh(geo, mat));
}

function buildClouds(scene) {
  const count = 14;
  const geo = new THREE.IcosahedronGeometry(7, 1);
  // unlit material so clouds stay bright white instead of turning gray
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
  });
  const clouds = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4();
  const drift = [];
  for (let i = 0; i < count; i++) {
    const x = (hash(i, 7) - 0.5) * 600;
    const y = 95 + hash(i, 13) * 45;
    const z = (hash(i, 29) - 0.5) * 600;
    const s = 0.8 + hash(i, 41) * 1.6;
    drift.push({ x, y, z, s, speed: 1.2 + hash(i, 59) * 1.8 });
    m.makeScale(s * 1.7, s * 0.5, s);
    m.setPosition(x, y, z);
    clouds.setMatrixAt(i, m);
  }
  scene.add(clouds);

  return (dt) => {
    for (let i = 0; i < count; i++) {
      const d = drift[i];
      d.x += d.speed * dt;
      if (d.x > 350) d.x = -350;
      m.makeScale(d.s * 1.7, d.s * 0.5, d.s);
      m.setPosition(d.x, d.y, d.z);
      clouds.setMatrixAt(i, m);
    }
    clouds.instanceMatrix.needsUpdate = true;
  };
}

function buildWater(scene) {
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE);
  geo.rotateX(-Math.PI / 2);
  const normalMap = waterNormalTexture();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x3f86c9,
    transparent: true,
    opacity: 0.78,
    roughness: 0.18,
    metalness: 0.15,
    normalMap,
    normalScale: new THREE.Vector2(0.45, 0.45),
  });
  const water = new THREE.Mesh(geo, mat);
  water.position.y = WATER_LEVEL;
  scene.add(water);

  let t = 0;
  return (dt) => {
    t += dt;
    water.position.y = WATER_LEVEL + Math.sin(t * 0.8) * 0.07;
    normalMap.offset.set(t * 0.012, t * 0.009); // drifting ripples
  };
}

function buildLights(scene) {
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x4c7a3a, 1.45);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 260;
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);

  // soft fill from the opposite side so shadowed mountains aren't pitch dark
  const fill = new THREE.DirectionalLight(0xa8c4e0, 0.95);
  fill.position.set(-60, 50, -45);
  scene.add(fill);

  return sun;
}

// ---------------------------------------------------------------------------
// Public entry point: builds everything and returns what the game loop needs.
// ---------------------------------------------------------------------------

export function buildWorld(scene) {
  scene.fog = new THREE.Fog(0xcfe8f7, 110, 440);

  scene.add(buildTerrain());
  buildTrees(scene);
  buildGrassTufts(scene);
  buildRocks(scene);
  buildFlowers(scene);
  buildSky(scene);
  const updateClouds = buildClouds(scene);
  const updateWater = buildWater(scene);
  const sun = buildLights(scene);

  return {
    sun,
    update(dt) {
      updateClouds(dt);
      updateWater(dt);
    },
  };
}

// A guaranteed dry spawn point: scans outward from the center until it finds
// gentle grassland above the waterline.
export function findSpawn() {
  for (let r = 0; r < 60; r += 4) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const h = terrainHeight(x, z);
      if (h > WATER_LEVEL + 1.5 && h < 10) return new THREE.Vector3(x, h, z);
    }
  }
  return new THREE.Vector3(0, terrainHeight(0, 0), 0);
}
