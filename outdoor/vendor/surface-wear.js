import * as THREE from '../../vendor/three.module.js';
import {DecalGeometry} from '../../vendor/geometries/DecalGeometry.js';
import {mergeGeometries} from '../../vendor/utils/BufferGeometryUtils.js';
let sharedMaterial;
function atlasMaterial(){
 if(sharedMaterial)return sharedMaterial;if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas'),pixels=typeof location!=='undefined'&&new URLSearchParams(location.search).get('quality')==='high'?2048:1024;canvas.width=pixels;canvas.height=pixels;const ctx=canvas.getContext('2d'),density=pixels/1024;ctx.scale(density,density);let seed=7149;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let cell=0;cell<16;cell++){
  ctx.save();ctx.translate((cell%4)*256,Math.floor(cell/4)*256);ctx.beginPath();ctx.rect(5,5,246,246);ctx.clip();const damp=cell%4===1||cell%4===3;
  for(let n=0;n<55+cell%5*9;n++){const x=10+random()*236,y=15+random()*228,r=6+random()*(damp?34:20);const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,damp?'#29322450':'#3c30254a');g.addColorStop(1,'#31352100');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
  if(!damp)for(let n=0;n<20+cell%6*6;n++){const x=12+random()*232,y=18+random()*70,length=25+random()*180;const g=ctx.createLinearGradient(0,y,0,y+length);g.addColorStop(0,'#4c372370');g.addColorStop(.45,'#4d422c60');g.addColorStop(1,'#41452900');ctx.fillStyle=g;ctx.fillRect(x,y,.8+random()*4,length);}
  else for(let n=0;n<240+cell%7*18;n++){ctx.fillStyle=n%3?'#4e5c3458':'#282e2558';ctx.beginPath();ctx.ellipse(14+random()*228,14+random()*228,.5+random()*6,.5+random()*4,random()*3,0,Math.PI*2);ctx.fill();}
  for(let n=0;n<800;n++){ctx.fillStyle=n%4?'#2c302a38':'#99815a50';ctx.fillRect(8+random()*240,8+random()*240,.3+random()*1.3,.3+random()*1.8);}
  ctx.globalCompositeOperation='destination-out';for(let n=0;n<140;n++){ctx.fillStyle=`rgba(0,0,0,${.12+random()*.6})`;ctx.fillRect(8+random()*240,8+random()*240,1+random()*4,.5+random()*2);}ctx.globalCompositeOperation='destination-in';const fade=ctx.createRadialGradient(128,128,55,128,128,127);fade.addColorStop(0,'#ffffffff');fade.addColorStop(1,'#ffffff00');ctx.fillStyle=fade;ctx.fillRect(0,0,256,256);ctx.restore();
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;texture.name='Shared detailed grime atlas';sharedMaterial=new THREE.MeshStandardMaterial({map:texture,transparent:true,alphaTest:.02,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});sharedMaterial.name='Dirt damp and runoff';
 sharedMaterial.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 wearWorld;').replace('#include <project_vertex>','#include <project_vertex>\nwearWorld=(modelMatrix*vec4(transformed,1.)).xz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 wearWorld;').replace('#include <map_fragment>',`
   #ifdef USE_MAP
    float section=floor(wearWorld.x/26.);
    float rowShift=floor(fract(sin(section*73.17+19.3)*43758.5453)*4.)/4.;
    vec2 wearUV=vec2(vMapUv.x,fract(vMapUv.y+rowShift));
    diffuseColor*=texture2D(map,wearUV);
    diffuseColor.a*=.72+.28*sin(wearWorld.x*.83+wearWorld.y*1.37)*sin(wearWorld.x*.29-wearWorld.y*.77);
   #endif`);
 };sharedMaterial.customProgramCacheKey=()=> 'varied-grime-atlas-v2';return sharedMaterial;
}
const surfaceName=/Russian weathered concrete panels|brick|limestone|concrete wall|dampfoundation|entrance aged plaster|entrance chipped green|old wood|entrance doors|courtyard brick|courtyard limestone|courtyard damp foundation|courtyard old wood/i;
export function addSurfaceWear(root,location,material=atlasMaterial()){
 if(!material||root.getObjectByName('Surface_wear'))return null;root.updateMatrixWorld(true);const walls=[],floors=[];root.traverse(mesh=>{if(!mesh.isMesh||Array.isArray(mesh.material))return;if(surfaceName.test(mesh.material.name))walls.push(mesh);if(/asphalt|pavement tiles|entrance terrazzo/i.test(mesh.material.name))floors.push(mesh);});
 const ray=new THREE.Raycaster(),parts=[];let patches=0,seed=[...root.name+location].reduce((v,c)=>Math.imul(v,31)+c.charCodeAt(0)|0,771);const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const place=(x,y,w,h,cell,angle=0,ground=false)=>{
  ray.set(ground?new THREE.Vector3(x,2,y):new THREE.Vector3(x,y,3),ground?new THREE.Vector3(0,-1,0):new THREE.Vector3(0,0,-1));const hit=ray.intersectObjects(ground?floors:walls,false).find(h=>{const n=h.face.normal.clone().transformDirection(h.object.matrixWorld);return ground?n.y>.7:n.z>.7;});if(!hit)return;
  const source=hit.object,proxy=new THREE.Mesh(source.geometry,source.material);proxy.matrixWorld.copy(source.matrixWorld);if(source.isInstancedMesh){const instance=new THREE.Matrix4();source.getMatrixAt(hit.instanceId,instance);proxy.matrixWorld.multiply(instance);}
  const geometry=new DecalGeometry(proxy,hit.point,new THREE.Euler(ground?-Math.PI/2:0,0,angle),new THREE.Vector3(w,h,.045));if(!geometry.attributes.position.count){geometry.dispose();return;}
  const uv=geometry.attributes.uv,slot=((cell-8)%16+16)%16,flip=rand()>.5;for(let i=0;i<uv.count;i++)uv.setXY(i,((slot%4)+(8+(flip?1-uv.getX(i):uv.getX(i))*240)/256)/4,(3-Math.floor(slot/4)+(8+uv.getY(i)*240)/256)/4);parts.push(geometry);patches++;
 };
 const anchors=root.userData.windowAnchors??root.getObjectByName('Detailed_aged_windows')?.userData.windowAnchors??[];
 // Runoff belongs below selected windows, with different widths and lengths.
 for(const a of anchors){if(Math.abs(a.angle)>.1||rand()<.48)continue;const h=.35+rand()*1.1;place(a.x+(rand()-.5)*a.w*.6,a.y-a.h/2-h*.42,.25+rand()*a.w*.7,h,8+Math.floor(rand()*16),(rand()-.5)*.07);}
 const bays=location==='entrance'?2:1;
 for(let bay=0;bay<bays;bay++){
  const start=bay*(26/bays),width=26/bays;
  for(let i=0;i<(location==='entrance'?6:12);i++){const x=start+.4+rand()*(width-.8);place(x,.12+rand()*.24,.65+rand()*1.8,.22+rand()*.55,8+Math.floor(rand()*16),(rand()-.5)*.12);}
  for(let i=0;i<(location==='entrance'?3:5);i++){const h=.4+rand()*1.2;place(start+.7+rand()*(width-1.4),.8+rand()*2.3,.35+rand()*.9,h,8+Math.floor(rand()*16),(rand()-.5)*.1);}
 }
 for(let i=0;i<10;i++)place(.6+rand()*24.8,i%2?2.65+rand()*.5:-2.45-rand()*.6,.7+rand()*1.5,.8+rand()*1.6,8+Math.floor(rand()*16),rand()*Math.PI*2,true);
 if(!parts.length)return null;const geometry=mergeGeometries(parts);for(const g of parts)g.dispose();geometry.applyMatrix4(root.matrixWorld.clone().invert());const mesh=new THREE.Mesh(geometry,material);mesh.name='Surface_wear';mesh.userData.noShadow=true;mesh.userData.patches=patches;mesh.receiveShadow=true;mesh.castShadow=false;root.add(mesh);return mesh;
}
