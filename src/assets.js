// assets.js — loads real 3D models (GLB files) made in Blender, generated
// by AI, or downloaded, and prepares them for the game: shadows on, scaled
// to a target height, feet on the ground.

import * as THREE from 'three';
import { GLTFLoader } from '../vendor/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

// Loads a GLB and returns { model, materials }. The model is wrapped in a
// group whose origin sits at the feet, so `group.position.y = groundY`
// just works like the primitive models do.
export async function loadModel(url, { height = 1.4 } = {}) {
  const gltf = await loader.loadAsync(url);
  const root = gltf.scene;

  const materials = [];
  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = false;
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
