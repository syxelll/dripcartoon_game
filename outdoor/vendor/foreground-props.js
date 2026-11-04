import * as THREE from '../../vendor/three.module.js';
import {mergeGeometries} from '../../vendor/utils/BufferGeometryUtils.js';
import {propMaterials} from './prop-materials.js';
export class ForegroundProps{
 constructor(scene,{lowQuality=false}={}){this.scene=scene;this.lowQuality=lowQuality;this.chunks=new Map();this.templates=new Map();this.palette=null;this.profile=null;}
 template(kind){if(this.templates.has(kind))return this.templates.get(kind);this.palette??={...propMaterials(),rubber:new THREE.MeshStandardMaterial({name:'Foreground old tyre rubber',color:'#292d28',roughness:1}),paper:new THREE.MeshStandardMaterial({name:'Foreground dirty paper',color:'#958b6f',roughness:1})};const m=this.palette,parts=new Map(),root=new THREE.Group();root.name='Foreground_'+kind;
 const add=(g,material,x,y,z,rotate=null)=>{if(rotate)g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotate)));g.translate(x,y,z);if(!parts.has(material))parts.set(material,[]);parts.get(material).push(g);};
 const box=(w,h,d,material,x,y,z)=>add(new THREE.BoxGeometry(w,h,d),material,x,y,z);
 const ring=(radius,tube,y,material=m.metal)=>add(new THREE.TorusGeometry(radius,tube,6,28),material,0,y,0,[Math.PI/2,0,0]);
 if(kind==='crate'){
  for(const z of[-.24,.24])for(let row=0;row<3;row++)box(.64,.125,.045,m.wood,0,.09+row*.15,z);
  for(const x of[-.3,.3]){for(let row=0;row<3;row++)box(.045,.125,.48,m.wood,x,.09+row*.15,0);for(const z of[-.21,.21])box(.055,.48,.055,m.wood,x,.24,z);}
  for(let i=0;i<4;i++)box(.14,.045,.48,m.wood,-.225+i*.15,.03,0);
  for(const x of[-.27,.27])for(const y of[.10,.39])add(new THREE.CylinderGeometry(.009,.009,.012,6),m.metal,x,y,.268,[Math.PI/2,0,0]);
 }else if(kind==='tyres'){
  ring(.21,.07,.075,m.rubber);add(new THREE.TorusGeometry(.21,.07,10,32),m.rubber,.20,.28,.12,[-.25,.35,0]);
  for(let i=0;i<28;i++){const a=i*Math.PI/14,g=new THREE.BoxGeometry(.045,.012,.05);g.rotateY(-a);g.translate(Math.cos(a)*.26,.143,Math.sin(a)*.26);if(!parts.has(m.rubber))parts.set(m.rubber,[]);parts.get(m.rubber).push(g);}
 }else if(kind==='bollard'){
  add(new THREE.CylinderGeometry(.048,.06,.78,12),m.metal,0,.42,0);add(new THREE.CylinderGeometry(.105,.105,.07,12),m.metal,0,.035,0);add(new THREE.SphereGeometry(.049,12,6),m.metal,0,.81,0);add(new THREE.CylinderGeometry(.050,.053,.09,12),m.trim,0,.62,0);
 }else if(kind==='entrance_stool'){
  box(.43,.055,.38,m.wood,0,.45,0);for(const x of[-.17,.17])for(const z of[-.14,.14])box(.045,.43,.045,m.wood,x,.22,z);
  for(const z of[-.14,.14])box(.35,.035,.03,m.wood,0,.18,z);for(const x of[-.17,.17])box(.035,.035,.3,m.wood,x,.21,0);
  for(const x of[-.17,.17])box(.035,.35,.04,m.wood,x,.64,.15);box(.40,.10,.045,m.wood,0,.78,.15);
 }else if(kind==='entrance_bucket'){
  add(new THREE.CylinderGeometry(.17,.135,.32,18,1,true),m.metal,0,.18,0);add(new THREE.CylinderGeometry(.13,.13,.025,18),m.metal,0,.03,0);ring(.17,.014,.34);ring(.139,.012,.04);
  add(new THREE.TorusGeometry(.185,.009,5,20,Math.PI),m.metal,0,.33,0,[0,.25,0]);box(.11,.035,.035,m.wood,0,.515,0);
  for(let i=0;i<3;i++)box(.07,.006,.11,m.paper,-.26+i*.18,.006,.18,[0,.9*i,0]);
 }else if(kind==='entrance_radiator'){
  for(let i=0;i<6;i++){const x=-.275+i*.11;for(const z of[-.045,.045])add(new THREE.CylinderGeometry(.027,.027,.44,8),m.metal,x,.32,z);for(const y of[.10,.54])add(new THREE.TorusGeometry(.045,.027,6,10,Math.PI),m.metal,x,y,0,[Math.PI/2,0,y<.2?Math.PI:0]);}
  for(const y of[.15,.49])box(.62,.045,.045,m.metal,0,y,-.05);for(const x of[-.22,.22])box(.06,.10,.14,m.metal,x,.05,0);
 }else if(kind==='entrance_boxes'){
  box(.55,.28,.37,m.wood,-.05,.14,0);box(.36,.21,.30,m.paper,.03,.385,-.02);for(const z of[-.19,.19])for(const x of[-.25,.25])box(.035,.29,.025,m.metal,x,.15,z);
  box(.59,.025,.38,m.wood,-.05,.29,0);box(.39,.024,.32,m.wood,.03,.50,-.02);box(.16,.006,.13,m.paper,.25,.01,.26);
 }else{
  for(const y of[.06,.3,.59])ring(.17,.012,y);
  for(let i=0;i<16;i++){const a=i*Math.PI/8;add(new THREE.CylinderGeometry(.008,.008,.53,6),m.metal,Math.cos(a)*.17,.325,Math.sin(a)*.17);}
  add(new THREE.CylinderGeometry(.14,.14,.035,16),m.metal,0,.05,0);for(const x of[-.13,.13])box(.035,.10,.035,m.metal,x,.05,0);
  for(let i=0;i<4;i++){const g=new THREE.PlaneGeometry(.11,.12,2,2),p=g.attributes.position;for(let j=0;j<p.count;j++)p.setZ(j,Math.sin(j*1.7+i)*.02);g.computeVertexNormals();add(g,m.paper,Math.sin(i*2)*.07,.23+i*.045,Math.cos(i*2)*.06,[-1.1,i*.8,0]);}
 }
 for(const [material,geometries]of parts){const normalized=geometries.map(g=>g.index?g.toNonIndexed():g),geometry=mergeGeometries(normalized);geometries.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}root.updateMatrixWorld(true);root.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});this.templates.set(kind,root);return root;
 }
 update(x,location=true){const profile=location===true?'street':location;if(!['street','entrance'].includes(profile)){for(const root of this.chunks.values())root.visible=false;return;}if(profile!==this.profile){for(const root of this.chunks.values())this.scene.remove(root);this.chunks.clear();this.profile=profile;}const index=Math.floor(x/8),kinds=profile==='entrance'?['entrance_stool','entrance_bucket','entrance_radiator','entrance_boxes']:['crate','tyres','bollard','bin'];for(let i=index-2;i<=index+2;i++){
  if(!this.chunks.has(i)){const root=new THREE.Group();root.name='Foreground_'+profile+'_section_'+i;root.position.x=i*8;const n=((i%4)+4)%4,count=this.lowQuality?1:2;
   for(let j=0;j<count;j++){const prop=this.template(kinds[(n+j*2)%4]).clone(true);prop.position.set(j?6.3:1.7,0,j?3.25:3.08);prop.rotation.y=i*1.17+j*.8;prop.updateMatrix();root.add(prop);}this.scene.add(root);this.chunks.set(i,root);
  }this.chunks.get(i).visible=true;
 }for(const [i,root]of this.chunks)if(Math.abs(i-index)>2){this.scene.remove(root);this.chunks.delete(i);}
 }
}
