import * as THREE from '../../vendor/three.module.js';
import {mergeGeometries} from '../../vendor/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from '../../vendor/geometries/RoundedBoxGeometry.js';
import {propMaterials} from './prop-materials.js';

let shared;
function palette(){
 if(shared)return shared;
 const base=propMaterials();
 const stone=base.trim.clone();stone.name='Chipped bevelled kerbstones';stone.color.set('#96998d');stone.roughness=1;
 const iron=base.metal.clone();iron.name='Oxidised iron hardware';iron.color.set('#697066');iron.roughness=.85;iron.metalness=.45;
 const dark=new THREE.MeshStandardMaterial({name:'Recessed joints and drain openings',color:'#252b27',roughness:1});
 const grit=new THREE.MeshStandardMaterial({name:'Kerb gravel',color:'#878579',roughness:1});
 const leaves=new THREE.MeshStandardMaterial({name:'Dry leaves and weeds',color:'#777248',roughness:1,side:THREE.DoubleSide});
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const c=canvas.getContext('2d');
 for(let y=0;y<128;y++)for(let x=0;x<256;x++){
  const falloff=Math.pow(1-y/128,2.1),noise=.65+.2*Math.sin(x*.37+y*.13)+.15*Math.sin(x*.91-y*.31);
  c.fillStyle=`rgba(71,73,64,${falloff*noise*.38})`;c.fillRect(x,y,1,1);
 }
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=THREE.RepeatWrapping;
 const contact=new THREE.MeshStandardMaterial({name:'Feathered asphalt contact grime',map,roughness:1,transparent:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
 return shared={stone,iron,dark,grit,leaves,contact};
}

// Small geometry is merged by material; the extra detail adds only a few draws.
export function addCloseupDetails(root,kind='street',variant=0){
 if(root.getObjectByName('Closeup_environment_details'))return;
 const group=new THREE.Group();group.name='Closeup_environment_details';const m=palette(),batches=new Map();
 let seed=917+variant*719;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const stats={kerbs:0,drains:0,gravel:0,leaves:0,doorFittings:0,pipes:0,manholes:0};
 function add(g,material,x,y,z,rotation){if(rotation)g.applyQuaternion(rotation);g.translate(x,y,z);if(!batches.has(material))batches.set(material,[]);batches.get(material).push(g);}
 const box=(w,h,d,mat,x,y,z)=>add(new THREE.BoxGeometry(w,h,d),mat,x,y,z);
 function rod(a,b,r,mat){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);add(new THREE.CylinderGeometry(r,r,delta.length(),8),mat,...from.add(to).multiplyScalar(.5).toArray(),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));}
 const ranges=[{start:0,end:26,z:2.48,direction:-1}];
 if(kind==='street')ranges.push({start:0,end:26,z:-1.98,direction:1});
 else ranges.push({start:0,end:4.4,z:-1.98,direction:1},{start:21.6,end:26,z:-1.98,direction:1});
 // Replace the old square curb faces, rather than stacking new bevels over them.
 root.updateMatrixWorld(true);
 root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.material?.name!=='Pavement tiles')return;
  const g=mesh.geometry,p=g.attributes.position,index=g.index,keep=[];
  for(let n=0;n<(index?.count??p.count);n+=3){
   const ids=[0,1,2].map(i=>index?index.getX(n+i):n+i);
   const points=ids.map(i=>new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld));
   const curb=ranges.some(r=>points.every(v=>v.x>=r.start-.001&&v.x<=r.end+.001&&Math.abs(v.z-r.z)<.156));
   if(!curb)keep.push(...ids);
  }
  mesh.geometry=g.clone();mesh.geometry.setIndex(keep);mesh.geometry.computeBoundingSphere();
 });
 const oldDust=root.getObjectByName('Road_edge_dust');if(oldDust)oldDust.visible=false;
 for(const range of ranges){
  const {start,end,z,direction}=range;
  box(end-start,.08,.27,m.dark,(start+end)/2,-.012,z);
  for(let x=start;x<end-.05;x+=1){
   const width=Math.min(.978,end-x-.006);if(width<=0)continue;
   const kerb=new RoundedBoxGeometry(width,.132,.272,2,.016);
   // Tiny chips change the silhouette, rather than adding a painted hard line.
   const p=kerb.attributes.position;
   for(let i=0;i<p.count;i++)if(p.getY(i)>.02){const chip=Math.sin(p.getX(i)*93+x*7)*Math.cos(p.getZ(i)*61+x)*.002;p.setY(i,p.getY(i)-Math.abs(chip));}
   kerb.computeVertexNormals();add(kerb,m.stone,x+width/2,.009,z);stats.kerbs++;
  }
  const pos=[],uv=[],indices=[],steps=Math.ceil((end-start)*4);
  for(let i=0;i<=steps;i++){
   const x=start+(end-start)*i/steps,edge=z+direction*.136,width=.18+.06*Math.sin(x*4.1)+.035*Math.cos(x*9.3);
   pos.push(x,.004,edge,x,.004,edge+direction*width);uv.push(x/1.7,1,x/1.7,0);
   if(i<steps){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();add(g,m.contact,0,0,0);
  for(let i=0;i<Math.ceil((end-start)*7);i++){
   const x=start+rand()*(end-start),edge=z+direction*(.14+rand()*.23),size=.009+rand()*.022;
   const pebble=new THREE.IcosahedronGeometry(size,0);pebble.scale(1,.35,.65);add(pebble,m.grit,x,.005,edge);stats.gravel++;
   if(i%3===0){const leaf=new THREE.PlaneGeometry(.025+rand()*.045,.06+rand()*.05);leaf.rotateX(-Math.PI/2);leaf.rotateY(rand()*Math.PI);add(leaf,m.leaves,x,.006,edge+direction*.1);stats.leaves++;}
   if(i%14===0){for(let j=0;j<3;j++){const blade=new THREE.PlaneGeometry(.013,.05+rand()*.08);blade.rotateY(rand()*Math.PI);blade.rotateZ((rand()-.5)*.6);add(blade,m.leaves,x+(j-1)*.018,.05,z+direction*.14);}}
  }
  for(let x=start+2.7;x<end-.7;x+=7.1){
   const dz=z+direction*.31;box(.52,.009,.23,m.dark,x,.006,dz);
   for(const zz of [-.12,.12])box(.55,.022,.025,m.iron,x,.013,dz+zz);
   for(let j=0;j<11;j++)box(.014,.018,.22,m.iron,x-.24+j*.048,.011,dz);stats.drains++;
  }
 }
 // Ground-level circular inspection covers with rims and raised hatch grids.
 for(const [x,z]of [[10.2,1.25],[19.9,.75]]){
  add(new THREE.CylinderGeometry(.29,.29,.014,32),m.dark,x,.003,z);
  const ring=new THREE.TorusGeometry(.285,.013,5,40);ring.rotateX(Math.PI/2);add(ring,m.iron,x,.012,z);
  for(let i=-3;i<=3;i++){const v=i*.065,l=2*Math.sqrt(.25*.25-v*v);box(l,.009,.012,m.iron,x,.014,z+v);box(.012,.009,l,m.iron,x+v,.014,z);}
  stats.manholes++;
 }
 root.updateMatrixWorld(true);const surfaces=[];root.traverse(o=>{let visible=true;for(let p=o;p;p=p.parent)visible=visible&&p.visible;if(o.isMesh&&visible&&o.geometry)surfaces.push(o)});
 const ray=new THREE.Raycaster();
 function facadeZ(x,z){ray.set(new THREE.Vector3(x,1.35,1.8),new THREE.Vector3(0,0,-1));return ray.intersectObjects(surfaces,false).find(hit=>Math.abs(hit.point.z-z)<.7)?.point.z??z;}
 const setback=root.userData.housingSetback??0;
 const doors=kind==='street'?[[3.25,-3.96],[9.75,-3.96],[16.25,-3.96],[22.75,-3.96]]:[[15.15,-8.815-setback],[23.2,-3.155]];
 for(const [x,expectedZ]of doors){
  const z=facadeZ(x,expectedZ)+.02;
  // Lock plate, pull handle, hinges, closer and a detailed intercom keypad.
  box(.10,.25,.018,m.iron,x+.31,1.05,z+.02);rod([x+.31,.98,z+.06],[x+.31,1.15,z+.06],.017,m.iron);
  box(.028,.045,.023,m.dark,x+.31,.99,z+.034);
  for(const y of [.35,1,1.75])rod([x-.45,y-.045,z+.025],[x-.45,y+.045,z+.025],.018,m.iron);
  box(.25,.055,.07,m.iron,x+.12,1.94,z+.04);rod([x+.12,1.94,z+.075],[x-.22,1.94,z+.16],.01,m.iron);
  const ix=x+.64;box(.16,.27,.035,m.iron,ix,1.38,z+.015);box(.12,.22,.015,m.dark,ix,1.38,z+.04);
  for(let row=0;row<4;row++)for(let col=0;col<3;col++)box(.019,.015,.008,m.iron,ix+(col-1)*.031,1.37-row*.027,z+.052);
  for(let i=0;i<4;i++)box(.075,.004,.006,m.iron,ix,1.46+i*.012,z+.052);
  for(const dx of [-.063,.063])for(const dy of [-.117,.117])add(new THREE.SphereGeometry(.006,6,4),m.dark,ix+dx,1.38+dy,z+.04);
  stats.doorFittings++;
 }
 // Drainpipes at building breaks, with collars and projecting wall brackets.
 for(const x of kind==='street'?[.5,6.5,13,19.5,25.5]:[4.35,21.65]){
  const z=kind==='street'?facadeZ(x,-3.65)+.1:facadeZ(x,-3.445-setback)+.08;
  rod([x,.25,z],[x,5.7,z],.045,m.iron);rod([x,.25,z],[x+.13,.09,z+.13],.048,m.iron);
  for(const y of [.45,1.85,3.25,4.65]){
   const collar=new THREE.TorusGeometry(.049,.009,5,12);collar.rotateX(Math.PI/2);add(collar,m.iron,x,y,z);
   box(.13,.035,.08,m.iron,x,y,z-.055);
  }
  stats.pipes++;
 }
 for(const [mat,parts]of batches){
  const normalized=parts.map(g=>g.index?g.toNonIndexed():g);const g=mergeGeometries(normalized);for(const part of new Set([...normalized,...parts]))part.dispose();
  const mesh=new THREE.Mesh(g,mat);mesh.castShadow=mat!==m.contact&&mat!==m.leaves;mesh.receiveShadow=true;group.add(mesh);
 }
 group.userData=stats;root.add(group);return group;
}
