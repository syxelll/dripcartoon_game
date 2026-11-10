import * as THREE from './vendor/three.module.js';
/** Reframe the authored shelter independently of the metro and bridge the road to the skyline. */
export function resizeBusShelter(gltf,root){
 const stop=gltf.getObjectByName('Cube006')||gltf.getObjectByName('Cube.006');if(!stop)return;
 gltf.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(stop),anchor=new THREE.Vector3((bounds.min.x+bounds.max.x)/2,bounds.min.y,bounds.max.z),matrix=stop.matrixWorld.clone();
 stop.removeFromParent();matrix.decompose(stop.position,stop.quaternion,stop.scale);stop.position.sub(anchor);
 const shelter=new THREE.Group();shelter.name='BusShelter';shelter.position.set(6.1,.02,-5.8);shelter.scale.set(.65,.54,.30);shelter.add(stop);root.add(shelter);
}
export function addRoadDetails(root){
 const group=new THREE.Group();group.name='RoadTransition';root.add(group);
 const material=(color,roughness=.9,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const asphalt=material('#171c22'),concrete=material('#30363c'),rubber=material('#101216'),trim=material('#222831'),steel=material('#63717c',.5,.5),glass=material('#111d26',.28,.25);
 function box(parent,size,position,mat){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);mesh.position.set(...position);parent.add(mesh);return mesh}
 box(group,[24,.08,65],[-20,-.11,-27],asphalt);
 // A continuous roadside parapet and staggered planters hide the end of the source ground.
 box(group,[.32,.65,50],[-16,.22,-25],concrete);box(group,[.44,.08,50],[-16,.58,-25],steel);
 box(group,[10,.72,.35],[-12,.26,-43],concrete);
 const plant=material('#18221f');
 for(let i=0;i<6;i++){const z=-10-i*5;box(group,[1.05,.65,1.5],[-14.3,.26,z],concrete);box(group,[1.08,.36,1.48],[-14.3,.73,z],plant)}
 function car(color,x,z,angle=0){
  const vehicle=new THREE.Group();vehicle.name='Parked_car';vehicle.position.set(x,-.035,z);vehicle.rotation.y=angle;group.add(vehicle);const paint=material(color,.38,.42);
  const footprint=new THREE.Shape();footprint.moveTo(-.8,-2);footprint.lineTo(.8,-2);footprint.quadraticCurveTo(.94,-2,.94,-1.85);footprint.lineTo(.94,1.85);footprint.quadraticCurveTo(.94,2,.8,2);footprint.lineTo(-.8,2);footprint.quadraticCurveTo(-.94,2,-.94,1.85);footprint.lineTo(-.94,-1.85);footprint.quadraticCurveTo(-.94,-2,-.8,-2);
  const bodyGeo=new THREE.ExtrudeGeometry(footprint,{depth:.4,bevelEnabled:true,bevelSize:.045,bevelThickness:.04,bevelSegments:1,steps:1});bodyGeo.rotateX(-Math.PI/2);const body=new THREE.Mesh(bodyGeo,paint);body.position.y=.43;vehicle.add(body);
  const cabinShape=new THREE.Shape();cabinShape.moveTo(-1.05,0);cabinShape.lineTo(-.62,.66);cabinShape.lineTo(.65,.66);cabinShape.lineTo(1.1,0);cabinShape.closePath();
  const cabinGeo=new THREE.ExtrudeGeometry(cabinShape,{depth:1.48,bevelEnabled:false});cabinGeo.rotateY(Math.PI/2);cabinGeo.translate(-.74,0,0);const cabin=new THREE.Mesh(cabinGeo,glass);cabin.position.y=.86;vehicle.add(cabin);
  box(vehicle,[1.53,.09,1.3],[0,1.54,0],paint);box(vehicle,[1.85,.055,3.85],[0,.48,0],trim);
  for(const side of [-1,1]){
   box(vehicle,[.06,.67,.06],[side*.755,1.18,0],paint);
   for(const end of [-1,1]){const a=box(vehicle,[.06,.78,.07],[side*.755,1.15,end*.83],paint);a.rotation.x=-end*.56}
   for(const axle of [-1.3,1.3]){
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.2,12),rubber);tire.rotation.z=Math.PI/2;tire.position.set(side*.94,.3,axle);vehicle.add(tire);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(.155,.155,.205,10),steel);rim.rotation.z=Math.PI/2;rim.position.copy(tire.position);vehicle.add(rim);
   }
   box(vehicle,[.16,.12,.28],[side*.94,1.05,.73],paint);
  }
  box(vehicle,[1.8,.17,.15],[0,.58,2.01],trim);box(vehicle,[1.8,.17,.15],[0,.58,-2.01],trim);
  const front=new THREE.MeshBasicMaterial({color:'#909c9f',toneMapped:false}),rear=new THREE.MeshBasicMaterial({color:'#6b2425',toneMapped:false});
  for(const side of [-1,1]){box(vehicle,[.4,.14,.025],[side*.62,.76,2.095],front);box(vehicle,[.39,.14,.025],[side*.62,.76,-2.095],rear)}
  box(vehicle,[.62,.13,.026],[0,.59,2.097],steel);box(vehicle,[.62,.13,.026],[0,.59,-2.097],steel);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.2,4.5),new THREE.MeshBasicMaterial({color:'#000000',transparent:true,opacity:.35,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-.012;vehicle.add(shadow);
 }
 car('#3d4f56',-10.5,-10,.05);car('#4c4540',-11,-16.1,-.07);car('#292f3c',-10.2,-22,.04);car('#626368',-11.1,-28.2,-.03);
}
