import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { createBomzhBlock } from './block-animation.js?v=detail5';
import { clone } from './vendor/utils/SkeletonUtils.js';

// Keep visual body size, movement and hit distances in the same world scale.
export const FIGHTER_HEIGHT = 1.8;
export const FIGHTER_WORLD_UNITS = 125;

export const CHARACTER_ROSTER = {
  character1: {name: 'Персонаж 1', url: './assets/character1.glb', clips: {
    idle: 'Idle_Fight', walk: 'Walk_forward', block: 'Block_High', finisher: 'Uppercut',
    punches: ['Jab', 'Cross', 'Uppercut'], kicks: ['Front_Kick', 'Low_Kick']
  }},
  bomzh: {name: 'Бомж', url: './assets/bomzh.glb', clips: {
    idle: 'idle', walk: 'walk', block: 'Bomzh_High_Block', punches: ['jab_01_combo', 'jab_02_combo'], kicks: ['kick_combo']
  }}
};
const assetCache = new Map();
async function loadAsset(id) {
  if (!CHARACTER_ROSTER[id]) throw new Error('Unknown character: ' + id);
  if (!assetCache.has(id)) {
    const url = CHARACTER_ROSTER[id].url;
    const loading = (async () => {
      const embedded = document.getElementById('embedded-' + id);
      const loader = new GLTFLoader();
      const gltf = embedded
        ? await loader.parseAsync(Uint8Array.from(atob(embedded.textContent.trim()), c => c.charCodeAt(0)).buffer, '')
        : await loader.loadAsync(url);
      const clips = new Map(gltf.animations.map(clip => [clip.name, clip]));
      const mapping = CHARACTER_ROSTER[id].clips;
      if(id==='bomzh'){
        const reference=await loadAsset('character1');
        clips.set(mapping.block,createBomzhBlock(gltf.scene,clips.get(mapping.idle),reference.gltf.scene,reference.clips.get('Block_High')));
      }
      for (const name of [mapping.idle, mapping.walk, ...mapping.punches, ...mapping.kicks, ...(mapping.block ? [mapping.block] : [])]) {
        if (!clips.has(name)) throw new Error(`Missing ${id} animation: ${name}`);
      }
      if (mapping.finisher) CHARACTER_ROSTER[id].finisherDuration = clips.get(mapping.finisher).duration;
      // Gameplay owns arena translation. Keep exported locomotion in place.
      for (const clip of clips.values()) for (const track of clip.tracks) {
        if (/^(rootx|root\.x|cpos|c_pos)\.position$/.test(track.name)) {
          for (let n = 3; n < track.values.length; n += 3) {
            track.values[n] = track.values[0]; track.values[n + 2] = track.values[2];
          }
        }
      }
      return {gltf, clips};
    })();
    assetCache.set(id, loading);
    loading.catch(() => assetCache.delete(id));
  }
  return assetCache.get(id);
}

/** Each slot owns its skeleton and animation mixer, including mirror matches. */
export async function loadCharacters(scene, ids = ['character1', 'bomzh']) {
  const assets = await Promise.all(ids.map(loadAsset));
  return ids.map((id, index) => {
    const {gltf, clips} = assets[index];
    const mapping = CHARACTER_ROSTER[id].clips;

    const root = new THREE.Group(), pivot = new THREE.Group();
    const mesh = clone(gltf.scene);
    pivot.add(mesh); root.add(pivot); scene.add(root);
    mesh.traverse(o => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; }
    });
    const mixer = new THREE.AnimationMixer(mesh);
    const actions = new Map([...clips].map(([name, clip]) => [name, mixer.clipAction(clip)]));
    actions.get(mapping.idle).play(); mixer.update(0);
    mesh.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(mesh, true);
    const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    const scale = FIGHTER_HEIGHT / size.y;
    mesh.scale.setScalar(scale);
    mesh.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    pivot.rotation.y = Math.PI / 2;
    const marker = new THREE.Mesh(new THREE.RingGeometry(.304,.344,48),new THREE.MeshBasicMaterial({color:index?'#bb8fff':'#ceff51',side:THREE.DoubleSide,transparent:true,opacity:.8}));
    marker.rotation.x = -Math.PI / 2; marker.position.y = .055; root.add(marker);
    const guard = new THREE.Mesh(new THREE.TorusGeometry(.368,.0176,6,32,Math.PI),new THREE.MeshBasicMaterial({color:'#d8c4ff',transparent:true,opacity:.75}));
    guard.position.set(.36,1.16,0);guard.rotation.y=Math.PI/2;root.add(guard);
    let active = actions.get(mapping.idle), activeAttack = null, punchIndex = -1, kickIndex = -1;
    function update(f, dt, floor) {
      root.position.set((f.x - 600) / FIGHTER_WORLD_UNITS,(floor - f.y) / FIGHTER_WORLD_UNITS,0);
      root.rotation.y = f.facing === 1 ? 0 : Math.PI;
      guard.visible = f.block && !mapping.block;marker.visible = f.y === floor;
      let name = f.block && mapping.block ? mapping.block : f.moving ? mapping.walk : mapping.idle;
      if (f.attack) {
        if (activeAttack !== f.attack) {
          if (f.attack.type === 'kick') kickIndex = (kickIndex + 1) % mapping.kicks.length;
          else punchIndex = Number.isInteger(f.attack.comboIndex) ? f.attack.comboIndex % mapping.punches.length : (punchIndex + 1) % mapping.punches.length;
        }
        name = f.attack.type === 'kick' ? mapping.kicks[kickIndex] : mapping.punches[punchIndex];
      }
      const next = actions.get(name) || actions.get(mapping.idle);
      if (next !== active || (f.attack && activeAttack !== f.attack)) {
        const old = active;
        next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1);
        next.setLoop(f.attack || f.block ? THREE.LoopOnce : THREE.LoopRepeat, f.attack || f.block ? 1 : Infinity);
        next.clampWhenFinished = !!(f.attack || f.block);next.play();
        if (old !== next) old.crossFadeTo(next, f.attack?.chained ? .055 : f.attack ? .035 : .12, false);
        active = next;
      }
      mixer.update(dt);
      if (f.attack) {
        const duration = f.attack.duration ?? (f.attack.type === 'kick' ? .55 : .32);
        // Skip the neutral lead-in on linked punches and cut their recovery.
        const start = f.attack.type === 'punch' && f.attack.chained && !f.attack.finisher ? .16 : 0;
        const end = f.attack.type === 'punch' && !f.attack.finisher ? .82 : 1;
        const phase = start + Math.min(1, f.attack.time / duration) * (end - start);
        active.time = Math.min(active.getClip().duration, phase * active.getClip().duration);
        mixer.update(0);
      }
      if (f.block && mapping.block) {
        active.time = Math.min(active.time, active.getClip().duration * .5);
        mixer.update(0);
      }
      activeAttack = f.attack;
      // A short body recoil communicates damage without inventing source clips.
      pivot.rotation.z = f.stun > 0 ? -.075 : 0;
    }
    function dispose() {
      mixer.stopAllAction(); mixer.uncacheRoot(mesh);
      mesh.traverse(o => { if (o.isSkinnedMesh) o.skeleton.dispose(); });
      for (const object of [marker, guard]) { object.geometry.dispose(); object.material.dispose(); }
    }
    return {id, root, mesh, mixer, actions, update, dispose, get activeClip() { return active.getClip().name; }};
  });
}
