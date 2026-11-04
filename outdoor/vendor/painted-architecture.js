import {outdoorAsset} from './assets.js';
import * as THREE from '../../vendor/three.module.js';
import {propMaterials} from './prop-materials.js';
const urls={brick:'brick-painted.jpg?v=paint1',facade:'facade-painted.jpg?v=paint1',metal:'metal-painted.jpg?v=paint1',floor:'entrance-floor-painted.jpg?v=paint1'},maps={};let ready;
export function preloadArchitecture(){if(typeof document==='undefined')return Promise.resolve();if(ready)return ready;ready=Promise.all(Object.entries(urls).map(([key,url])=>new Promise((resolve,reject)=>{const map=new THREE.TextureLoader().load(outdoorAsset(url),resolve,undefined,reject);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;maps[key]=map;}))).then(()=>{const m=propMaterials().metal;m.map=maps.metal;m.normalMap=null;m.roughnessMap=null;m.bumpMap=maps.metal;m.bumpScale=.006;m.color.set('#ffffff');m.roughness=.9;m.needsUpdate=true;});return ready;}
export function applyPaintedArchitecture(root){root.updateMatrixWorld(true);const seen=new Set();root.traverse(mesh=>{if(!mesh.isMesh||Array.isArray(mesh.material))return;const m=mesh.material,brick=/brick/i.test(m.name),concrete=/Russian weathered concrete panels|Courtyard limestone|^Concrete wall$/i.test(m.name);if(!brick&&!concrete)return;if(!seen.has(m)){seen.add(m);m.map=maps[brick?'brick':'facade']??null;m.normalMap=null;m.roughnessMap=null;m.bumpMap=null;m.roughness=1;m.color.set(brick?'#ffffff':'#b7b9b3');m.needsUpdate=true;
 m.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 architectureWorld;').replace('#include <project_vertex>','#include <project_vertex>\narchitectureWorld=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 architectureWorld;').replace('#include <map_fragment>',`#include <map_fragment>
 float broad=.5+.25*sin(architectureWorld.x*.37+architectureWorld.y*.48)+.25*sin(architectureWorld.x*.81-architectureWorld.y*.23);diffuseColor.rgb*=mix(.91,1.05,broad);`);if(!brick){shader.vertexShader=shader.vertexShader.replace('varying vec3 architectureWorld;','varying vec3 architectureWorld;varying vec2 architectureUV;').replace('architectureWorld=(modelMatrix*vec4(transformed,1.)).xyz;','architectureWorld=(modelMatrix*vec4(transformed,1.)).xyz;architectureUV=vec2(abs(normal.z)>.5?architectureWorld.x:architectureWorld.z,architectureWorld.y);');shader.fragmentShader=shader.fragmentShader.replace('varying vec3 architectureWorld;','varying vec3 architectureWorld;varying vec2 architectureUV;').replace('#include <map_pars_fragment>',`#include <map_pars_fragment>
 #ifdef USE_MAP
 vec4 facadePatch(vec2 uv,vec2 cell,vec2 dx,vec2 dy){vec3 h=fract(sin(vec3(dot(cell,vec2(127.1,311.7)),dot(cell,vec2(269.5,183.3)),dot(cell,vec2(419.2,371.9))))*43758.5453);float r=floor(h.z*4.);vec2 axis=r<1.?vec2(1.,0.):r<2.?vec2(0.,1.):r<3.?vec2(-1.,0.):vec2(0.,-1.);mat2 turn=mat2(axis,vec2(-axis.y,axis.x));return textureGrad(map,turn*uv+h.xy*13.,turn*dx,turn*dy);}
 #endif`).replace('#include <map_fragment>',`
 #ifdef USE_MAP
 vec2 uv=architectureUV*.25,cell=floor(architectureUV*.18),f=smoothstep(0.,1.,fract(architectureUV*.18)),dx=dFdx(uv),dy=dFdy(uv);diffuseColor*=mix(mix(facadePatch(uv,cell,dx,dy),facadePatch(uv,cell+vec2(1.,0.),dx,dy),f.x),mix(facadePatch(uv,cell+vec2(0.,1.),dx,dy),facadePatch(uv,cell+1.,dx,dy),f.x),f.y);
 #endif`);}};m.customProgramCacheKey=()=> brick?'painted-brick-v2':'painted-concrete-stochastic-v2';}
 mesh.geometry=mesh.geometry.clone();const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,uv=mesh.geometry.attributes.uv,v=new THREE.Vector3();if(!uv)return;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);const axis=Math.abs(n.getZ(i))>.5?v.x:v.z;uv.setXY(i,axis/(brick?1:4),v.y/(brick?.65:3));}uv.needsUpdate=true;});}

export function applyPaintedEntrance(root){const seen=new Set();root.traverse(mesh=>{if(!mesh.isMesh||Array.isArray(mesh.material))return;const m=mesh.material;if(seen.has(m))return;seen.add(m);const floor=m.name==='Entrance terrazzo',palette={
 'Entrance aged plaster':['facade','#d0c9b6'],
 'Entrance chipped green paint':['facade','#8e9d88'],
 'Entrance concrete stairs':['facade','#b1b2a8'],
 'Entrance doors':['metal','#b6a283'],
 'Entrance painted steel':['metal','#9aa18f'],
 'Entrance rusty cast iron radiator':['metal','#a09070'],
 'Entrance terrazzo':['floor','#a3a391']
 };const setting=palette[m.name];if(!setting)return;m.map=maps[setting[0]]??null;m.color.set(setting[1]);m.normalMap=null;m.roughnessMap=null;m.bumpMap=null;m.roughness=1;m.metalness=.0;m.needsUpdate=true;
 m.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 entranceUV;').replace('#include <project_vertex>',`#include <project_vertex>
 vec4 interiorPoint=vec4(transformed,1.);
 #ifdef USE_INSTANCING
  interiorPoint=instanceMatrix*interiorPoint;
 #endif
 vec3 worldInterior=(modelMatrix*interiorPoint).xyz;
 entranceUV=${floor?'worldInterior.xz/1.6':'vec2(abs(normal.z)>.5?worldInterior.x:worldInterior.z,worldInterior.y)/vec2(3.,2.5)'};`);shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 entranceUV;').replace('#include <map_fragment>',`
 #ifdef USE_MAP
  diffuseColor*=texture2D(map,entranceUV);
 #endif`);};m.customProgramCacheKey=()=>floor?'painted-entrance-floor-v1':'painted-entrance-wall-v1';});}

export function applyPaintedMetro(root){const seen=new Set();root.traverse(mesh=>{if(!mesh.isMesh||Array.isArray(mesh.material))return;const m=mesh.material;if(seen.has(m))return;seen.add(m);const palette={
 'Metro aged ivory enamel':['facade','#b9b7a1'],
 'Metro faded teal enamel':['facade','#769284'],
 'Metro worn steel':['metal','#bac4b3'],
 'Metro cracked brown vinyl':['facade','#8d6e50'],
 'Metro worn rubber floor':['facade','#6f776c'],
 };const setting=palette[m.name];if(!setting)return;const floor=m.name==='Metro worn rubber floor';m.map=maps[setting[0]]??null;m.color.set(setting[1]);m.roughness=floor?1:m.name.includes('vinyl')?.84:.9;m.bumpMap=null;m.normalMap=null;m.needsUpdate=true;
 m.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 metroSurfaceUV;').replace('#include <project_vertex>',`#include <project_vertex>
 vec3 metroSurface=(modelMatrix*vec4(transformed,1.)).xyz;
 metroSurfaceUV=${floor?'metroSurface.xz/vec2(3.8,2.6)':'vec2(abs(normal.z)>.45?metroSurface.x:metroSurface.z,metroSurface.y)/vec2(3.,2.)'};`);shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 metroSurfaceUV;').replace('#include <map_fragment>',`#ifdef USE_MAP
 vec4 paintedMetro=texture2D(map,metroSurfaceUV);
 ${floor?'paintedMetro.rgb=vec3(dot(paintedMetro.rgb,vec3(.299,.587,.114)));':''}
 diffuseColor*=paintedMetro;
 #endif`);};m.customProgramCacheKey=()=>floor?'painted-metro-rubber-v1':'painted-metro-surface-v1';});}
