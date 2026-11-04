import * as THREE from '../../vendor/three.module.js';
import {mergeGeometries} from '../../vendor/utils/BufferGeometryUtils.js';
import {propMaterials} from './prop-materials.js';
function enamelMap(){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#394a40';c.fillRect(0,0,768,256);c.strokeStyle='#b7b59b';c.lineWidth=5;c.strokeRect(14,14,740,228);c.strokeStyle='#7d8975';c.lineWidth=2;c.strokeRect(23,23,722,210);c.fillStyle='#d4d0b6';c.textAlign='center';c.font='bold 58px serif';c.fillText('ДВОР № 7',384,112);c.font='24px serif';c.fillText('ЖИЛОЙ КВАРТАЛ · ПРОХОД ВО ДВОР',384,164);
 let seed=781;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let i=0;i<450;i++){const x=random()*768,y=random()*256,edge=x<32||x>736||y<27||y>229;c.fillStyle=edge?'#796043':'#263a3335';c.fillRect(x,y,1+random()*(edge?9:2),1+random()*(edge?5:1.5));}
 for(let i=0;i<35;i++){c.strokeStyle='#c3c3a533';c.lineWidth=.7;const x=random()*768,y=random()*256;c.beginPath();c.moveTo(x,y);c.lineTo(x+random()*45,y+random()*6);c.stroke();}
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
}
export function replaceStreetSigns(root){
 if(root.getObjectByName('Weathered_street_sign'))return root.getObjectByName('Weathered_street_sign');
 root.traverse(o=>{if(/^SIGN_/i.test(o.name))o.visible=false;});root.updateMatrixWorld(true);
 const surfaces=[];root.traverse(o=>{if(o.isMesh&&o.visible&&!Array.isArray(o.material)&&o.geometry.attributes.position)surfaces.push(o);});
 const ray=new THREE.Raycaster(),width=1.4,height=.46;let anchor=null;
 // Test the entire plaque, including its frame, against visible solid masonry.
 for(const y of[.72,1.15,3.4,5.3,2.78,4.52]){for(const x of[8,11,14,17,20,5,2,23,...Array.from({length:49},(_,i)=>1+i*.5)]){let z=null,clear=true;for(const dx of[-width/2,0,width/2])for(const dy of[-height/2,0,height/2]){
  ray.set(new THREE.Vector3(x+dx,y+dy,2),new THREE.Vector3(0,0,-1));const hit=ray.intersectObjects(surfaces,false)[0];
  if(!hit||!/brick|limestone|concrete wall|dampfoundation|plain#9a9b8c|plain#9d9e8c/i.test(hit.object.material.name)||hit.face.normal.clone().transformDirection(hit.object.matrixWorld).z<.95){clear=false;break;}
  if(z!==null&&Math.abs(hit.point.z-z)>.025){clear=false;break;}z=hit.point.z;
 }if(clear&&z!==null){anchor=new THREE.Vector3(x,y,z+.055);break;}}if(anchor)break;}
 // If no unoccupied masonry is available, omit the plaque rather than covering a window.
 if(!anchor)return null;
 const group=new THREE.Group();group.name='Weathered_street_sign';group.position.copy(anchor);const {metal,trim}=propMaterials(),parts=[];
 const plate=new THREE.Mesh(new THREE.BoxGeometry(width,height,.045),metal);plate.castShadow=plate.receiveShadow=true;group.add(plate);
 const map=enamelMap(),face=new THREE.Mesh(new THREE.PlaneGeometry(width-.065,height-.055),new THREE.MeshStandardMaterial({name:'Weathered enamel courtyard plaque',map,color:map?'#ffffff':'#4b5b48',roughness:.88}));face.position.z=.026;face.receiveShadow=true;group.add(face);
 for(const dx of[-width/2+.045,width/2-.045])for(const dy of[-height/2+.045,height/2-.045]){const g=new THREE.CylinderGeometry(.014,.014,.016,8);g.rotateX(Math.PI/2);g.translate(dx,dy,.035);parts.push(g);}const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());const bolts=new THREE.Mesh(geometry,trim);group.add(bolts);root.add(group);root.updateMatrixWorld(true);return group;
}
