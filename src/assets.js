// assets.js — loads real 3D models (GLB files) made in Blender, generated
// by AI, or downloaded, and prepares them for the game: shadows on, scaled
// to a target height, feet on the ground.

import * as THREE from 'three';
import { GLTFLoader } from '../vendor/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

// each GLB downloads once; every caller gets its own clone (shared
// geometry on the GPU, so extra copies are cheap)
const cache = new Map();

// Loads a GLB and returns { model, materials }. The model is wrapped in a
// group whose origin sits at the feet, so `group.position.y = groundY`
// just works like the primitive models do.
export async function loadModel(url, { height = 1.4, rotation = null } = {}) {
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url));
  const gltf = await cache.get(url);
  const root = gltf.scene.clone(true);

  // some converters (e.g. TripoSR) use a different up-axis — fix it before
  // measuring the bounding box
  if (rotation) root.rotation.set(...rotation);

  const materials = [];
  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = false;
      // AI-generated meshes carry their color per vertex, often with a
      // metallic PBR material baked in that renders nearly black — swap
      // in a clean matte material that uses the vertex colors
      if (obj.geometry.attributes.color) {
        // lit materials need normals, which unlit exports omit entirely —
        // without this the lighting math produces NaN and bloom smears
        // the whole screen black
        if (!obj.geometry.attributes.normal) obj.geometry.computeVertexNormals();
        obj.material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.9,
          metalness: 0,
        });
      }
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.push(...mats);
    }
  });

  // scale so the model is `height` units tall, then drop it to y=0
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const scale = height / (size.y || 1);
  root.scale.setScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(root);
  const center = scaledBox.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= scaledBox.min.y;

  const wrapper = new THREE.Group();
  wrapper.add(root);
  return { model: wrapper, materials };
}
