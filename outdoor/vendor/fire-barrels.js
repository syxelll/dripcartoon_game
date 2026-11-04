import {propMaterials} from './prop-materials.js';
import * as THREE from '../../vendor/three.module.js';
// Shared geometry/materials and an emissive flame shader; no extra shadow passes.
export class FireBarrels{
 constructor(scene){this.scene=scene;this.visible=true;this.chunks=new Map();this.body=new THREE.CylinderGeometry(.29,.27,.72,24,6,true);this.band=new THREE.TorusGeometry(.286,.018,4,12);this.floor=new THREE.CircleGeometry(.27,12);this.steel=new THREE.MeshStandardMaterial({color:0xa89a79,roughness:.97,metalness:.12,side:THREE.DoubleSide});const p=this.body.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),a=Math.atan2(p.getZ(i),p.getX(i)),dent=1-.028*Math.sin(a*3+y*9)-.018*Math.sin(a*7-y*11);p.setX(i,p.getX(i)*dent);p.setZ(i,p.getZ(i)*dent);}this.body.computeVertexNormals();this.steel.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float barrelHeight;').replace('#include <project_vertex>','#include <project_vertex>\nbarrelHeight=(position.y+.36)/.72;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float barrelHeight;').replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb*=mix(.6,1.,smoothstep(0.,.18,barrelHeight))*mix(1.,.22,smoothstep(.68,1.,barrelHeight));');};this.steel.customProgramCacheKey=()=> 'sooty-painted-barrel-v1';this.rim=new THREE.MeshStandardMaterial({color:0x343b31,roughness:.8,metalness:.6});this.coals=new THREE.MeshBasicMaterial({color:0xeb641b,side:THREE.DoubleSide});this.flameGeometry=new THREE.PlaneGeometry(.82,1.35);this.fire=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.NormalBlending,uniforms:{time:{value:0}},vertexShader:'varying vec2 vUv; varying float seed; void main(){vUv=uv;seed=modelMatrix[3].x;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;varying float seed;uniform float time;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
 float fbm(vec2 p){return noise(p)*.57+noise(p*2.13+7.7)*.28+noise(p*4.37+19.1)*.15;}
 void main(){vec2 p=vec2((vUv.x-.5)*2.,vUv.y);float y=p.y;
 vec2 flow=vec2(p.x*3.8+seed*.37,y*5.8-time*2.6);
 float turbulence=fbm(flow),curl=fbm(vec2(p.x*2.7+seed,y*4.6-time*1.8))-.5;
 float width=max(.04,.58*(1.-y)),x=p.x+curl*(.12+y*.43)+sin(y*9.-time*3.+seed)*y*.07;
 float density=1.-abs(x)/width-y*.62+(turbulence-.5)*1.35;
 float flame=smoothstep(.02,.36,density)*(1.-smoothstep(.64,.88,y))*smoothstep(0.,.045,y);
 float heat=clamp(density*.42+(1.-y)*.62,0.,1.);
 vec3 color=mix(vec3(.55,.028,.003),vec3(1.,.22,.008),smoothstep(.12,.55,heat));
 color=mix(color,vec3(1.,.67,.13),smoothstep(.55,.86,heat));
 color=mix(color,vec3(1.,.88,.49),smoothstep(.88,1.,heat)*.48);
 float alpha=flame*(.38+.55*turbulence);
 // Thin rising smoke remains soft and only appears above the hottest portion.
 float smokeField=fbm(vec2(p.x*3.1+seed,y*4.-time*.8));
 float smoke=(1.-smoothstep(.12,.52,abs(p.x+curl*.25)))*smoothstep(.5,.75,y)*(1.-smoothstep(.78,1.,y))*smokeField*.15;
 color=mix(color,vec3(.16,.17,.16),smoke/max(alpha+smoke,.001));alpha+=smoke;
 if(alpha<.006)discard;gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});this.glow=new THREE.MeshBasicMaterial({color:0xee7a25,transparent:true,opacity:.13,depthWrite:false,blending:THREE.AdditiveBlending});this.glowGeometry=new THREE.CircleGeometry(.9,20);
 this.emberGeometry=new THREE.PlaneGeometry(.025,.055);this.emberGeometry.setAttribute('emberIndex',new THREE.InstancedBufferAttribute(Float32Array.from({length:8},(_,i)=>i),1));this.embers=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:this.fire.uniforms,vertexShader:`attribute float emberIndex;uniform float time;varying vec2 eUv;varying float eAlpha;void main(){eUv=uv;float t=fract(time*.42+emberIndex*.137+modelMatrix[3].x*.01);vec3 p=vec3(sin(emberIndex*13.7+t*5.)*(.08+t*.18),.76+t*1.2,cos(emberIndex*7.3)*.12);eAlpha=sin(t*3.14159);vec4 center=modelViewMatrix*vec4(p,1.);center.xy+=position.xy*(1.-t*.65);gl_Position=projectionMatrix*center;}`,fragmentShader:`varying vec2 eUv;varying float eAlpha;void main(){vec2 p=abs(eUv*2.-1.);float alpha=(1.-smoothstep(.35,1.,p.x+p.y*.35))*eAlpha*.75;gl_FragColor=vec4(1.,.49,.055,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});}
 makeSmoke(){
  this.smokeGeometry??=new THREE.PlaneGeometry(1,1);
  if(!this.smokeGeometry.getAttribute('smokeIndex'))this.smokeGeometry.setAttribute('smokeIndex',new THREE.InstancedBufferAttribute(Float32Array.from({length:12},(_,i)=>i),1));
  this.smokeMaterial??=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:this.fire.uniforms,vertexShader:`attribute float smokeIndex;uniform float time;varying vec2 sUv;varying float sAge,sSeed;
   void main(){sUv=uv;sSeed=smokeIndex*7.319+modelMatrix[3].x*.13;float t=fract(time*.24+smokeIndex/12.+modelMatrix[3].x*.031);sAge=t;vec3 p=vec3(sin(sSeed+t*4.)*(.035+t*.18)+t*t*.40,1.25+t*2.4,cos(sSeed+t*3.)*(.03+t*.10));vec4 center=modelViewMatrix*vec4(p,1.);float size=.18+pow(t,.7)*1.10;float a=sSeed+t*.7;mat2 turn=mat2(cos(a),-sin(a),sin(a),cos(a));center.xy+=turn*position.xy*size;gl_Position=projectionMatrix*center;}`,
   fragmentShader:`varying vec2 sUv;varying float sAge,sSeed;uniform float time;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
    void main(){vec2 p=sUv*2.-1.,q=p*3.+vec2(sSeed,time*.1);float n=noise(q)*.65+noise(q*2.13)*.35;float edge=1.-smoothstep(.35,1.,length(p)+(n-.5)*.25);float life=smoothstep(0.,.12,sAge)*(1.-smoothstep(.5,1.,sAge));float alpha=edge*(.4+n*.6)*life*.42;if(alpha<.003)discard;vec3 color=mix(vec3(.055,.065,.07),vec3(.14,.15,.145),n);gl_FragColor=vec4(color,alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
  const mesh=new THREE.InstancedMesh(this.smokeGeometry,this.smokeMaterial,12);mesh.name='Barrel_smoke';mesh.frustumCulled=false;const identity=new THREE.Matrix4();for(let i=0;i<12;i++)mesh.setMatrixAt(i,identity);return mesh;
 }

 make(index){const root=new THREE.Group();root.visible=this.visible;root.position.set(index*26+22.5,0,-2.95);const body=new THREE.Mesh(this.body,this.steel);body.position.y=.38;body.castShadow=true;root.add(body);for(const y of [.08,.3,.57,.74]){const band=new THREE.Mesh(this.band,this.rim);band.rotation.x=Math.PI/2;band.position.y=y;root.add(band);}const coals=new THREE.Mesh(this.floor,this.coals);coals.rotation.x=-Math.PI/2;coals.position.y=.68;root.add(coals);for(const angle of [0]){const flame=new THREE.Mesh(this.flameGeometry,this.fire);flame.name='Barrel_flame';flame.position.y=1.33;flame.rotation.y=angle;root.add(flame);}const sparks=new THREE.InstancedMesh(this.emberGeometry,this.embers,8);sparks.frustumCulled=false;const identity=new THREE.Matrix4();for(let i=0;i<8;i++)sparks.setMatrixAt(i,identity);root.add(sparks);root.add(this.makeSmoke());const glow=new THREE.Mesh(this.glowGeometry,this.glow);glow.rotation.x=-Math.PI/2;glow.position.y=.015;root.add(glow);this.scene.add(root);return root;}
 setVisible(value){this.visible=value;for(const root of this.chunks.values())root.visible=value;}
 update(x,time,camera){const map=propMaterials().metal.map;if(this.steel.map!==map){this.steel.map=map;this.steel.bumpMap=map;this.steel.bumpScale=.006;this.steel.needsUpdate=true;}this.fire.uniforms.time.value=time;const index=Math.floor(x/26);for(let i=index-1;i<=index+2;i++)if(!this.chunks.has(i))this.chunks.set(i,this.make(i));for(const [i,root]of this.chunks)if(Math.abs(i-index)>2){this.scene.remove(root);this.chunks.delete(i);}if(camera)for(const root of this.chunks.values()){const flame=root.getObjectByName('Barrel_flame');if(flame)flame.rotation.y=Math.atan2(camera.position.x-root.position.x,camera.position.z-root.position.z);}}
}
