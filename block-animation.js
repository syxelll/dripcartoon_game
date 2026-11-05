import * as THREE from './vendor/three.module.js';
import {clone} from './vendor/utils/SkeletonUtils.js';

// Fit the supplied fighter's guard to Bomzh's own bind pose and arm lengths.
// Generated keyframes leave his body, head and legs in his original idle pose.
export function createBomzhBlock(targetScene, idleClip, sourceScene, guardClip) {
  const target=clone(targetScene), source=clone(sourceScene);
  const idleMixer=new THREE.AnimationMixer(target);idleMixer.clipAction(idleClip).play();idleMixer.update(0);
  const sourceMixer=new THREE.AnimationMixer(source);sourceMixer.clipAction(guardClip).play();sourceMixer.update(guardClip.duration*.5);
  target.updateMatrixWorld(true);source.updateMatrixWorld(true);
  const targetBones=new Map(),sourceBones=new Map();let targetSkin,sourceSkin;
  target.traverse(o=>{if(o.isBone)targetBones.set(o.name,o);if(o.isSkinnedMesh&&!targetSkin)targetSkin=o;});
  source.traverse(o=>{if(o.isBone)sourceBones.set(o.name,o);if(o.isSkinnedMesh&&!sourceSkin)sourceSkin=o;});
  const idle=new Map([...targetBones].map(([name,b])=>[name,{p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}]));
  const inverseMap=skin=>new Map(skin.skeleton.bones.map((b,i)=>[b.name,skin.skeleton.boneInverses[i]]));
  const targetBind=inverseMap(targetSkin),sourceBind=inverseMap(sourceSkin);
  const desired=[];
  for(const side of ['l','r']){
    const names=['arm_stretch','forearm_stretch','hand'].map(n=>n+side);
    const tb=names.map(n=>targetBones.get(n)),sb=names.map(n=>sourceBones.get(n));
    if([...tb,...sb].some(b=>!b))throw new Error('Missing arm bones for Bomzh guard');
    const tp=tb.map(b=>b.getWorldPosition(new THREE.Vector3())),sp=sb.map(b=>b.getWorldPosition(new THREE.Vector3()));
    const scale=(tp[0].distanceTo(tp[1])+tp[1].distanceTo(tp[2]))/(sp[0].distanceTo(sp[1])+sp[1].distanceTo(sp[2]));
    for(const [name,bone] of targetBones){
      if(!name.endsWith(side)||!/(arm|hand|thumb|index|middle|ring|pinky)/i.test(name))continue;
      const reference=sourceBones.get(name);if(!reference||!sourceBind.has(name)||!targetBind.has(name))continue;
      const position=reference.getWorldPosition(new THREE.Vector3()).sub(sp[0]).multiplyScalar(scale).add(tp[0]);
      const bindQ=inverse=>{const q=new THREE.Quaternion();inverse.clone().invert().decompose(new THREE.Vector3(),q,new THREE.Vector3());return q;};
      const quaternion=reference.getWorldQuaternion(new THREE.Quaternion()).multiply(bindQ(sourceBind.get(name)).invert()).multiply(bindQ(targetBind.get(name)));
      let depth=0;for(let p=bone.parent;p;p=p.parent)depth++;
      desired.push({bone,position,quaternion,depth});
    }
  }
  desired.sort((a,b)=>a.depth-b.depth);
  for(const {bone,position,quaternion} of desired){
    bone.position.copy(bone.parent.worldToLocal(position.clone()));
    bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(quaternion));
    bone.updateMatrixWorld(true);
  }
  const tracks=[],times=[0,.18,.6];
  for(const [name,bone] of targetBones){
    const base=idle.get(name);
    tracks.push(new THREE.VectorKeyframeTrack(name+'.position',times,[...base.p.toArray(),...bone.position.toArray(),...bone.position.toArray()]));
    tracks.push(new THREE.QuaternionKeyframeTrack(name+'.quaternion',times,[...base.q.toArray(),...bone.quaternion.toArray(),...bone.quaternion.toArray()]));
    tracks.push(new THREE.VectorKeyframeTrack(name+'.scale',times,[...base.s.toArray(),...base.s.toArray(),...base.s.toArray()]));
  }
  idleMixer.stopAllAction();sourceMixer.stopAllAction();
  return new THREE.AnimationClip('Bomzh_High_Block',.6,tracks);
}
