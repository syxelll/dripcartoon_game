import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { clone } from './vendor/utils/SkeletonUtils.js';

/** Two independently animated instances of the supplied Dripcartoon character. */
export async function loadCharacters(scene) {
  const gltf = await new GLTFLoader().loadAsync('./assets/bomzh.glb');
  const clips = new Map(gltf.animations.map(clip => [clip.name, clip]));
  for (const name of ['idle', 'walk', 'jab_01_combo', 'kick_combo']) {
    if (!clips.has(name)) throw new Error(`Missing character animation: ${name}`);
  }
  // Gameplay owns arena translation. Keep exported locomotion in place.
  for (const clip of clips.values()) for (const track of clip.tracks) {
    if (/^(rootx|root\.x|cpos|c_pos)\.position$/.test(track.name)) {
      for (let n = 3; n < track.values.length; n += 3) {
        track.values[n] = track.values[0]; track.values[n + 2] = track.values[2];
      }
    }
  }
  return [0, 1].map(index => {
    const root = new THREE.Group(), pivot = new THREE.Group();
    const mesh = clone(gltf.scene);
    pivot.add(mesh); root.add(pivot); scene.add(root);
    mesh.traverse(o => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; }
    });
    const mixer = new THREE.AnimationMixer(mesh);
    const actions = new Map([...clips].map(([name, clip]) => [name, mixer.clipAction(clip)]));
    actions.get('idle').play(); mixer.update(0);
    mesh.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(mesh, true);
    const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    const scale = 2.25 / size.y;
    mesh.scale.setScalar(scale);
    mesh.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    pivot.rotation.y = Math.PI / 2;
    const marker = new THREE.Mesh(new THREE.RingGeometry(.38,.43,48),new THREE.MeshBasicMaterial({color:index?'#bb8fff':'#ceff51',side:THREE.DoubleSide,transparent:true,opacity:.8}));
    marker.rotation.x = -Math.PI / 2; marker.position.y = .055; root.add(marker);
    const guard = new THREE.Mesh(new THREE.TorusGeometry(.46,.022,6,32,Math.PI),new THREE.MeshBasicMaterial({color:'#d8c4ff',transparent:true,opacity:.75}));
    guard.position.set(.45,1.45,0);guard.rotation.y=Math.PI/2;root.add(guard);
    let active = actions.get('idle'), activeAttack = null, punchIndex = 0;
    function update(f, dt, floor) {
      root.position.set((f.x - 600) / 100,(floor - f.y) / 100,0);
      root.rotation.y = f.facing === 1 ? 0 : Math.PI;
      guard.visible = f.block;marker.visible = f.y === floor;
      let name = f.moving ? 'walk' : 'idle';
      if (f.attack) {
        if (activeAttack !== f.attack) punchIndex = (punchIndex + 1) % 2;
        name = f.attack.type === 'kick' ? 'kick_combo' : punchIndex ? 'jab_01_combo' : 'jab_02_combo';
      }
      const next = actions.get(name) || actions.get('idle');
      if (next !== active || (f.attack && activeAttack !== f.attack)) {
        const old = active;
        next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1);
        next.setLoop(f.attack ? THREE.LoopOnce : THREE.LoopRepeat, f.attack ? 1 : Infinity);
        next.clampWhenFinished = !!f.attack;next.play();
        if (old !== next) old.crossFadeTo(next, f.attack ? .035 : .12, false);
        active = next;
      }
      mixer.update(dt);
      if (f.attack) {
        const duration = f.attack.type === 'kick' ? .55 : .32;
        active.time = Math.min(active.getClip().duration - .001, f.attack.time / duration * active.getClip().duration);
        mixer.update(0);
      }
      activeAttack = f.attack;
      // A short body recoil communicates damage without inventing source clips.
      pivot.rotation.z = f.stun > 0 ? -.075 : 0;
    }
    return {root, mesh, mixer, actions, update};
  });
}
