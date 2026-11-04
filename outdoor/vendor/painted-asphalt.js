import {outdoorAsset} from './assets.js';
import * as THREE from '../../vendor/three.module.js';
let shared,mapReady;
export function preloadPaintedAsphalt(){paintedAsphalt();return mapReady??Promise.resolve();}
export function paintedAsphalt(){
 if(shared)return shared;let map=null;
 if(typeof document!=='undefined'){
  mapReady=new Promise((resolve,reject)=>{map=new THREE.TextureLoader().load(outdoorAsset('asphalt-painted.jpg?v=gray1'),resolve,undefined,reject);});
  map.name='Painted charcoal asphalt reference texture';map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;
 }
 shared=new THREE.MeshStandardMaterial({name:'Painted asphalt',map,roughness:1,metalness:0,color:map?'#ffffff':'#414244',envMapIntensity:.1});
 shared.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 asphaltWorld;').replace('#include <project_vertex>',`#include <project_vertex>
   vec4 asphaltPoint=vec4(transformed,1.);
   #ifdef USE_INSTANCING
    asphaltPoint=instanceMatrix*asphaltPoint;
   #endif
   asphaltWorld=(modelMatrix*asphaltPoint).xz;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec2 asphaltWorld;
   float asphaltHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   vec4 asphaltHash4(vec2 p){return fract(sin(vec4(1.+dot(p,vec2(127.1,311.7)),2.+dot(p,vec2(269.5,183.3)),3.+dot(p,vec2(419.2,371.9)),4.+dot(p,vec2(371.4,159.1))))*43758.5453);}
   float asphaltNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(asphaltHash(i),asphaltHash(i+vec2(1.,0.)),f.x),mix(asphaltHash(i+vec2(0.,1.)),asphaltHash(i+1.),f.x),f.y);}`)
   .replace('#include <map_pars_fragment>',`#include <map_pars_fragment>
    #ifdef USE_MAP
    vec4 asphaltPatch(vec2 uv,vec2 cell,vec2 dx,vec2 dy){vec4 h=asphaltHash4(cell);float r=floor(h.z*4.);vec2 axis=r<1.?vec2(1.,0.):r<2.?vec2(0.,1.):r<3.?vec2(-1.,0.):vec2(0.,-1.);mat2 turn=mat2(axis,vec2(-axis.y,axis.x));float scale=.85+h.w*.3;return textureGrad(map,turn*uv*scale+h.xy*17.,turn*dx*scale,turn*dy*scale);}
    #endif`)
   .replace('#include <map_fragment>',`
    #ifdef USE_MAP
     vec2 uv=asphaltWorld*.25,cell=floor(asphaltWorld*.18),f=smoothstep(.0,1.,fract(asphaltWorld*.18)),dx=dFdx(uv),dy=dFdy(uv);
     vec4 a=asphaltPatch(uv,cell,dx,dy),b=asphaltPatch(uv,cell+vec2(1.,0.),dx,dy),c=asphaltPatch(uv,cell+vec2(0.,1.),dx,dy),d=asphaltPatch(uv,cell+1.,dx,dy);
     vec4 paint=mix(mix(a,b,f.x),mix(c,d,f.x),f.y);float gray=dot(paint.rgb,vec3(.2126,.7152,.0722));diffuseColor*=vec4(vec3(gray)*vec3(.96,1.,1.04),paint.a);
    #endif
    float broad=asphaltNoise(asphaltWorld*.13)*.7+asphaltNoise(asphaltWorld*.37+17.3)*.3;
    diffuseColor.rgb*=mix(.82,1.14,broad);
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.96,.99,1.02),asphaltNoise(asphaltWorld*.21+43.));`);
 };shared.customProgramCacheKey=()=> 'painted-asphalt-stochastic-gray-v2';return shared;
}
export function applyPaintedAsphalt(root){const material=paintedAsphalt();root.traverse(mesh=>{if(mesh.isMesh&&!Array.isArray(mesh.material)&&/asphalt/i.test(mesh.material.name)){mesh.material=material;mesh.userData.paintedAsphalt=true;}});return material;}
