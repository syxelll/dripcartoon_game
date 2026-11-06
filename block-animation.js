import * as THREE from './vendor/three.module.js';
import {clone} from './vendor/utils/SkeletonUtils.js';

// Use the red fighter's Block_High timing, but solve Bomzh's own arm chain.
// A two-bone solve keeps elbows down, wrists in front of the face and arm lengths fixed.
export function createBomzhBlock(targetScene, idleClip, sourceScene, guardClip) {
  const target=clone(targetScene),source=clone(sourceScene);
  const idleMixer=new THREE.AnimationMixer(target);idleMixer.clipAction(idleClip).play();idleMixer.update(0);
  const sourceMixer=new THREE.AnimationMixer(source),action=sourceMixer.clipAction(guardClip);
  action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();sourceMixer.update(0);
  target.updateMatrixWorld(true);source.updateMatrixWorld(true);
  const bones=new Map(),reference=new Map();target.traverse(o=>{if(o.isBone)bones.set(o.name,o)});source.traverse(o=>{if(o.isBone)reference.set(o.name,o)});
  const world=b=>b.getWorldPosition(new THREE.Vector3());
  const idle=new Map([...bones].map(([name,b])=>[name,{p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone(),wp:world(b),wq:b.getWorldQuaternion(new THREE.Quaternion())}]));
  const head=world(bones.get('headx'));
  const bounds=new THREE.Box3().setFromObject(target,true),height=bounds.max.y-bounds.min.y;
  const arms=['l','r'].map(side=>{
    const names=['arm','forearm_ik','hand'].map(n=>n+side);
    if(names.some(n=>!bones.has(n)||!reference.has(n)))throw Error('Missing Bomzh arm chain');
    return {side,s:idle.get(names[0]).wp,e:idle.get(names[1]).wp,w:idle.get(names[2]).wp,sourceStart:world(reference.get(names[2]))};
  });
  sourceMixer.setTime(guardClip.duration*.5);source.updateMatrixWorld(true);
  for(const arm of arms)arm.sourceHold=world(reference.get('hand'+arm.side));
  const frames=Math.max(1,Math.round(guardClip.duration*30)),times=[];
  const samples=new Map([...bones].map(([name])=>[name,{p:[],q:[],s:[]}]));
  for(let frame=0;frame<=frames;frame++){
    const t=guardClip.duration*frame/frames;times.push(t);action.paused=false;sourceMixer.setTime(t);source.updateMatrixWorld(true);
    for(const [name,b]of bones){const base=idle.get(name);b.position.copy(base.p);b.quaternion.copy(base.q);b.scale.copy(base.s)}target.updateMatrixWorld(true);
    const desired=[];
    for(const arm of arms){
      const side=arm.side,sign=side==='l'?-1:1;
      const movement=world(reference.get('hand'+side)).distanceTo(arm.sourceStart),range=arm.sourceHold.distanceTo(arm.sourceStart);
      const progress=THREE.MathUtils.smoothstep(range>.001?THREE.MathUtils.clamp(movement/range,0,1):Math.min(t/(guardClip.duration*.35),1),0,1);
      const goal=head.clone().add(new THREE.Vector3(sign*height*.085,height*.08,height*.08));
      let wrist=arm.w.clone().lerp(goal,progress);
      const l1=arm.s.distanceTo(arm.e),l2=arm.e.distanceTo(arm.w),direction=wrist.clone().sub(arm.s);
      const d=THREE.MathUtils.clamp(direction.length(),Math.abs(l1-l2)+.001,(l1+l2)*.985);direction.normalize();wrist=arm.s.clone().addScaledVector(direction,d);
      const pole=new THREE.Vector3(sign*.14,-.32,.08).multiplyScalar(height);
      pole.addScaledVector(direction,-pole.dot(direction)).normalize();
      const idlePole=arm.e.clone().sub(arm.s);idlePole.addScaledVector(direction,-idlePole.dot(direction));
      if(idlePole.lengthSq()>.000001)pole.copy(idlePole.normalize().lerp(pole,progress).normalize());
      const along=(l1*l1+d*d-l2*l2)/(2*d),bend=Math.sqrt(Math.max(0,l1*l1-along*along));
      const elbow=arm.s.clone().addScaledVector(direction,along).addScaledVector(pole,bend);
      const upperQ=new THREE.Quaternion().setFromUnitVectors(arm.e.clone().sub(arm.s).normalize(),elbow.clone().sub(arm.s).normalize());
      const lowerQ=new THREE.Quaternion().setFromUnitVectors(arm.w.clone().sub(arm.e).normalize(),wrist.clone().sub(elbow).normalize());
      for(const [name,bone]of bones){
        if(!name.endsWith(side)||!/(arm|hand|thumb|index|middle|ring|pinky)/i.test(name))continue;
        const base=idle.get(name),isHand=/(hand|thumb|index|middle|ring|pinky)/i.test(name),isLower=/forearm/i.test(name)||isHand;
        const oldAnchor=isHand?arm.w:isLower?arm.e:arm.s,newAnchor=isHand?wrist:isLower?elbow:arm.s,q=isLower?lowerQ:upperQ;
        const position=base.wp.clone().sub(oldAnchor).applyQuaternion(q).add(newAnchor);
        const quaternion=q.clone().multiply(base.wq);let depth=0;for(let p=bone.parent;p;p=p.parent)depth++;
        desired.push({bone,position,quaternion,depth});
      }
    }
    desired.sort((a,b)=>a.depth-b.depth);
    for(const {bone,position,quaternion}of desired){bone.position.copy(bone.parent.worldToLocal(position.clone()));bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(quaternion));bone.updateMatrixWorld(true)}
    for(const [name,b]of bones){const out=samples.get(name);out.p.push(...b.position.toArray());out.q.push(...b.quaternion.toArray());out.s.push(...b.scale.toArray())}
  }
  const tracks=[];for(const [name,v]of samples){tracks.push(new THREE.VectorKeyframeTrack(name+'.position',times,v.p),new THREE.QuaternionKeyframeTrack(name+'.quaternion',times,v.q),new THREE.VectorKeyframeTrack(name+'.scale',times,v.s))}
  idleMixer.stopAllAction();sourceMixer.stopAllAction();return new THREE.AnimationClip('Bomzh_High_Block',guardClip.duration,tracks);
}
