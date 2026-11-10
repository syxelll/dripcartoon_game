import * as THREE from './vendor/three.module.js';
/** Short, pooled bursts in world space. No external textures or persistent GPU allocations per hit. */
export function createCombatEffects(scene,{mobile=false}={}){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.16,'rgba(255,255,255,.9)');gradient.addColorStop(.45,'rgba(255,255,255,.2)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
 const texture=new THREE.CanvasTexture(canvas),ringGeo=new THREE.RingGeometry(.82,1,mobile?28:48),rayGeo=new THREE.PlaneGeometry(1,1);
 const material=()=>new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide});
 const pool=Array.from({length:8},()=>{
  const root=new THREE.Group();root.visible=false;root.renderOrder=20;scene.add(root);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,toneMapped:false}));root.add(glow);
  const ring=new THREE.Mesh(ringGeo,material());root.add(ring);
  const rays=Array.from({length:mobile?10:16},()=>{const mesh=new THREE.Mesh(rayGeo,material());root.add(mesh);return mesh});
  return {root,glow,ring,rays,age:1,duration:.3,blocked:false,finisher:false};
 });let cursor=0;
 function hit(position,{blocked=false,finisher=false,kick=false}={}){
  const effect=pool[cursor++%pool.length];effect.age=0;effect.duration=blocked?.24:finisher?.42:.30;effect.blocked=blocked;effect.finisher=finisher;effect.power=finisher?1.5:kick?1.15:1;
  effect.root.position.copy(position);effect.root.visible=true;
  const color=new THREE.Color(blocked?'#80cfff':finisher?'#ff662c':'#ffe8a3');effect.glow.material.color.copy(color);effect.ring.material.color.copy(color);
  effect.rays.forEach((ray,i)=>{ray.userData.angle=i/effect.rays.length*Math.PI*2+(Math.random()-.5)*.25;ray.userData.speed=.8+Math.random()*1.3;ray.material.color.set(i%3?'#fff2d1':color);ray.visible=!blocked||i%2===0});
 }
 function update(dt,camera){
  for(const e of pool){if(!e.root.visible)continue;e.age+=dt;const t=e.age/e.duration;if(t>=1){e.root.visible=false;continue}
   e.root.quaternion.copy(camera.quaternion);const fade=(1-t)**2,p=e.power;
   e.glow.scale.setScalar((.26+Math.sin(Math.min(1,t*3)*Math.PI)*.6)*p);e.glow.material.opacity=fade*(e.blocked?.55:.95);
   e.ring.scale.setScalar((.06+t*(e.blocked?.4:.72))*p);e.ring.material.opacity=fade*(e.blocked?.85:.55);
   for(const ray of e.rays){const a=ray.userData.angle,r=(.055+t*ray.userData.speed*.58)*p;ray.position.set(Math.cos(a)*r,Math.sin(a)*r,0);ray.rotation.z=a;ray.scale.set((.12+(1-t)*.15)*p,.009+(1-t)*.012,1);ray.material.opacity=fade}
  }
 }
 return {hit,update,reset:()=>pool.forEach(e=>{e.root.visible=false})};
}
