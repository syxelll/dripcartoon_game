import {addCourtyardKerbs} from './paving.js';
import {roadUV,courtyardPaving} from './ground-transitions.js';
import {propMaterials} from './prop-materials.js';
import {createVegetation} from './vegetation.js';
import {COURTYARD_TYPES,COURTYARD_NAMES} from './route.js';
import {createAgedWindowSet} from './aged-windows.js';
import * as THREE from '../../vendor/three.module.js';
import {mergeGeometries} from '../../vendor/utils/BufferGeometryUtils.js';
// Reuse the street's existing texture images; each yard is one 26 m module.
export function createCourtyard(source,variant=0){
 const root=new THREE.Group();root.name=`Courtyard_${variant}`;root.userData.courtyard=true;root.userData.locationName=COURTYARD_NAMES[variant];root.userData.theme=COURTYARD_TYPES[variant];const originals=new Map();source.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])originals.set(m.name,m);});
 const serviceYard=variant===3||variant===6,setback=serviceYard?18:0;
 if(serviceYard)root.userData.housingSetback=setback;
 const copy=(pattern,name,color)=>{const original=[...originals.values()].find(m=>pattern.test(m.name));const m=original?original.clone():new THREE.MeshStandardMaterial({color,roughness:.95});m.name=name;for(const key of['map','normalMap','roughnessMap','metalnessMap'])if(m[key]){m[key]=m[key].clone();m[key].wrapS=m[key].wrapT=THREE.RepeatWrapping;m[key].needsUpdate=true;}return m;};
 const brick=copy(/brick/,'Courtyard brick','#896e55'),stone=copy(/Russian weathered concrete panels|Limestone/,'Courtyard limestone','#a49d84'),floor=copy(/Asphalt/i,'Courtyard asphalt','#64675c'),paving=copy(/Pavement tiles/,'Courtyard dark paving','#777d73'),plinth=copy(/DampFoundation/,'Courtyard damp foundation','#555e4b'),{wood,metal,trim,soil:earth,fabric}=propMaterials();
 const vegetation=createVegetation(variant),windows=createAgedWindowSet(),batches=new Map(),geometries=new Map();
 function box(name,w,h,d,material,x,y,z,rotate=0){const prop=[wood,metal,trim,earth,fabric].includes(material),round=/Clothes line posts|Exercise|Rear downpipe|Bench fasteners/.test(name),cloth=name==='Hanging laundry',key=[w,h,d,prop,round,cloth].join(':');if(!geometries.has(key)){let g;if(cloth){g=new THREE.PlaneGeometry(w,h,4,5);const p=g.attributes.position;for(let i=0;i<p.count;i++){p.setZ(i,Math.sin(p.getX(i)*25)*.025+Math.pow((h/2-p.getY(i))/h,2)*.055);if(p.getY(i)<-h*.4)p.setY(i,p.getY(i)+Math.sin(p.getX(i)*14)*.025);}g.computeVertexNormals();}else if(round){const length=Math.max(w,h,d),radius=Math.min(w,h,d)/2;g=new THREE.CylinderGeometry(radius,radius,length,8);if(w===length)g.rotateZ(Math.PI/2);else if(d===length)g.rotateX(Math.PI/2);}else g=new THREE.BoxGeometry(w,h,d);const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;if(!prop)for(let i=0;i<p.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/2,(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))/2);geometries.set(key,g);}const geometry=geometries.get(key),mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);mesh.rotation.y=rotate;mesh.updateMatrix();const groupKey=key+material.uuid;if(!batches.has(groupKey))batches.set(groupKey,{geometry,material,items:[]});batches.get(groupKey).items.push(mesh);return mesh;}
 box('Subgrade under paving',26,.16,25+setback,floor,13,-.20,1.5-setback/2);for(const [name,w,d,x,z]of[['Continuous road',26,4.54,13,.25],['Recessed yard ground',serviceYard?26:17,9+setback,13,-6.52-setback/2]]){const ground=box(name,w,.16,d,floor,x,-.08,z);roadUV(ground.geometry,ground.matrix);}
 box('Rear apartment building',17,7.2,.7,[1,4,5,7].includes(variant)?stone:brick,13,3.6,-9.5-setback);box('Rear foundation',17,.55,.78,plinth,13,.275,-9.43-setback);
 for(const x of[2.25,23.75]){box('Street-facing wing',4.5,7.8,6.1,[2,3,6].includes(variant)?stone:brick,x,3.9,-6.5-setback);box('Wing foundation',4.55,.55,6.15,plinth,x,.275,-6.48-setback);}
 for(let row=0;row<3;row++)for(const [col,x]of[6.4,9.7,12.8,16.2,19.5].entries())windows.add(col===3?17:x,1.65+row*1.9,-9.145-setback,1.3,1.5,0,row*5+col+variant*3);
 for(const side of[0,1])for(let row=0;row<3;row++)for(const [col,x]of[1.25,3.25].entries()){if(side===1&&row===0&&x===3.25)continue;windows.add(side?26-x:x,1.6+row*2,-3.445-setback,1.2,1.4,0,side*5+row*2+col+variant);}
 if(serviceYard){
  // These are single-storey service blocks, not apartment wings behind garages.
  for(const x of[2.25,23.75]){box('Service yard end block',4.5,2.5,6.1,brick,x,1.25,-6.5);box('Service block damp base',4.54,.26,6.14,plinth,x,.13,-6.5);box('Service block thin roof',4.68,.10,6.24,metal,x,2.55,-6.5);}
  for(const [x,w]of[[9.48,9.96],[18.67,5.66]]){box('Service yard perimeter wall',w,1.90,.22,stone,x,.95,-9.2);box('Perimeter wall coping',w+.04,.075,.29,plinth,x,1.925,-9.2);}
  for(const x of[14.38,15.92])box('Service yard gate pier',.22,2.02,.28,brick,x,1.01,-9.2);
  for(const x of[14.81,15.49]){box('Service yard rear gate',.64,1.76,.07,metal,x,.91,-9.10);box('Rear gate top bar',.64,.045,.09,metal,x,1.81,-9.06);}
  for(const x of[1.51,2.99]){box('Service block garage door',1.43,2.10,.09,metal,x,1.09,-3.395);box('Service block door handle',.035,.24,.065,metal,x+(x<2? .60:-.60),1.05,-3.32);}
 }
 box('Wing entrance door',1.42,2.4,.16,metal,23.2,1.2,-3.28);box('Wing entrance canopy',1.9,.1,.8,metal,23.2,2.65,-2.95);
 // Side windows face into the yard and make the gap read as real depth.
 for(const side of[-1,1])for(let row=0;row<3;row++)for(const [col,z]of[-5.2,-7.6].entries())windows.add(side<0?4.505:21.495,1.6+row*1.9,z-setback,1.2,1.4,side<0?Math.PI/2:-Math.PI/2,row*3+col+variant+(side>0?4:0));
 box('Rear facade footpath',17,.06,.85,paving,13,.02,-8.72);

 // A porch for the eventual entrance; no props occupy the combat lane.
 box('Rear porch door',1.3,2.35,.18,metal,15.15,1.175,-8.94-setback);box('Porch canopy',2.1,.12,1.1,metal,15.15,2.65,-8.5-setback);
 function door(x,z,w=1.3,h=2.35){
  for(const dx of[-w/2-.04,w/2+.04])box('Door casing',.065,h+.08,.12,metal,x+dx,h/2,z+.06);
  box('Door lintel',w+.16,.065,.12,metal,x,h+.04,z+.06);box('Door threshold',w+.25,.08,.35,stone,x,.04,z+.12);
  for(const yy of[.55,1.65]){box('Recessed door panel',w-.2,.78,.025,metal,x,yy,z+.105);for(const dx of[-w/2+.09,w/2-.09])box('Door raised edging',.025,.8,.035,metal,x+dx,yy,z+.125);}
  box('Door lock plate',.11,.28,.04,metal,x+w*.3,1.05,z+.14);box('Door handle',.15,.035,.09,metal,x+w*.27,1.1,z+.2);
  for(const yy of[.35,1.95])box('Door hinge',.055,.16,.08,metal,x-w/2+.04,yy,z+.16);
 }
 door(15.15,-8.94-setback);door(23.2,-3.28,1.42,2.4);
 const bench=(x,z)=>{for(let i=0;i<4;i++)box('Separate bench seat plank',2,.075,.115,wood,x,.48+(i===2?.006:0),z-.2+i*.135);for(let i=0;i<3;i++)box('Separate bench back plank',2,.105,.07,wood,x,.68+i*.14,z-.28);for(const dx of[-.72,.72]){box('Bench legs',.075,.48,.075,metal,x+dx,.24,z-.18);box('Bench front legs',.075,.48,.075,metal,x+dx,.24,z+.18);box('Bench foot',.18,.06,.55,metal,x+dx,.04,z);box('Seat mounting rail',.09,.08,.55,metal,x+dx,.4,z);box('Back mounting rail',.07,.65,.06,metal,x+dx,.67,z-.32);for(const yy of[.68,.82,.96])box('Bench fasteners',.035,.035,.025,trim,x+dx,yy,z-.235);}};if(![1,3,5,6].includes(variant))bench(7.6,-5.2);if(variant===0)bench(18.1,-6.3);
 function grassPatch(x,z,w,d,y){for(let row=0;row<Math.ceil(d/.32);row++)for(let col=0;col<Math.ceil(w/.32);col++){if((row*7+col*11+variant)%4!==0)vegetation.grass(x-w/2+.12+col*.32,y,z-d/2+.12+row*.32);};}
 for(const x of([3,4,5,6].includes(variant)?[]:[variant%2?6.6:19.6])){for(const dz of[-.65,.65])box('Planter long kerb',1.6,.28,.1,stone,x,.14,-5.9+dz);for(const dx of[-.75,.75])box('Planter end kerb',.1,.28,1.2,stone,x+dx,.14,-5.9);box('Planter soil',1.4,.07,1.2,earth,x,.24,-5.9);grassPatch(x,-5.9,1.3,1.1,.28);}
 function crate(x,y,z,w=.7,h=.4,d=.65){for(const dz of[-d/2,d/2])for(let row=0;row<3;row++)box('Crate side slat',w,h/3-.02,.045,wood,x,y+row*h/3+h/6,z+dz);for(const dx of[-w/2,w/2])for(let row=0;row<3;row++)box('Crate end slat',.045,h/3-.02,d,wood,x+dx,y+row*h/3+h/6,z);for(const dx of[-w/2+.04,w/2-.04])for(const dz of[-d/2+.04,d/2-.04])box('Crate corner support',.06,h,.06,wood,x+dx,y+h/2,z+dz);for(let i=0;i<4;i++)box('Crate floor plank',w/4-.015,.035,d,wood,x-w/2+(i+.5)*w/4,y+.025,z);}

 if(variant===0){for(const x of[10.8,13.1])box('Clothes line posts',.06,3,.06,metal,x,1.5,-6.3);box('Clothes line',2.3,.022,.022,metal,11.95,2.8,-6.3);for(let i=0;i<3;i++)box('Hanging laundry',.5,.75,.025,fabric,11.25+i*.65,2.4,-6.3);}
 if(variant===1){
  // A compact neighbourhood court sits behind the continuous combat lane.
  root.userData.basketballCourt=true;
  const paint=trim,rubber=earth,rim=wood;
  function shape(name,geometry,material,x,y,z,rotation){const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);if(rotation)mesh.rotation.set(...rotation);mesh.updateMatrix();batches.set(name,{geometry,material,items:[mesh]});}
  function rod(name,a,b,r,material=metal){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from),g=new THREE.CylinderGeometry(r,r,delta.length(),5);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));const c=from.add(to).multiplyScalar(.5);shape(name,g,material,c.x,c.y,c.z);}
  box('Worn court surface',12.2,.018,4.9,rubber,13,.012,-5.95);
  for(const z of[-8.25,-3.65])box('Court sideline '+z,11.6,.006,.035,paint,13,.025,z);
  for(const x of[7.2,18.8,13])box('Court line '+x,.035,.006,4.6,paint,x,.025,-5.95);
  shape('Centre circle',new THREE.RingGeometry(.74,.775,40),paint,13,.029,-5.95,[-Math.PI/2,0,0]);
  for(const side of[-1,1]){const x=13+side*5.8,inner=x-side*2.15;
   for(const z of[-6.95,-4.95])box('Key edge '+side+z,2.15,.006,.035,paint,(x+inner)/2,.027,z);
   box('Free throw line '+side,.035,.006,2,paint,inner,.027,-5.95);
   shape('Free throw arc '+side,new THREE.RingGeometry(.98,1.015,28,1,side<0?-Math.PI/2:Math.PI/2,Math.PI),paint,inner,.03,-5.95,[-Math.PI/2,0,0]);
   const post=x+side*.22,board=x-side*.18,hoop=x-side*.6;
   rod('Basket post '+side,[post,0,-5.95],[post,3.65,-5.95],.065);
   rod('Basket support '+side,[post,3.45,-5.95],[board,3.45,-5.95],.045);
   box('Aged backboard '+side,.085,1.05,1.6,trim,board,3.22,-5.95);
   const face=board-side*.05;
   for(const z of[-6.26,-5.64])box('Target vertical '+side+z,.016,.42,.025,metal,face,3.1,z);
   for(const y of[2.9,3.3])box('Target horizontal '+side+y,.016,.025,.64,metal,face,y,-5.95);
   shape('Basket rim '+side,new THREE.TorusGeometry(.24,.018,5,24),rim,hoop,2.89,-5.95,[Math.PI/2,0,0]);
   for(let i=0;i<10;i++){const t=i*Math.PI/5,n=t+Math.PI/5;rod('Net '+side+':'+i,[hoop+Math.cos(t)*.23,2.88,-5.95+Math.sin(t)*.23],[hoop+Math.cos(n)*.13,2.52,-5.95+Math.sin(n)*.13],.007,paint);}
  }
  // Open frontage: the fencing cannot obstruct the playable route.
  for(let i=0;i<=6;i++){const x=6.7+i*2.1;rod('Fence post '+i,[x,0,-8.65],[x,2.25,-8.65],.026);}
  for(const y of[.2,1.1,2.15])rod('Fence rail '+y,[6.7,y,-8.65],[19.3,y,-8.65],.014);
  for(let i=0;i<63;i++){const x=6.7+i*.2;rod('Fence wire '+i,[x,.2,-8.65],[x,2.15,-8.65],.004);}
  bench(19.4,-7.5);
 }

 if(variant===2){box('Service dumpster',1.6,.95,1.1,metal,11.6,.65,-5.8);for(const dx of[-.83,.83])box('Dumpster rim',.06,.1,1.16,metal,11.6+dx,1.16,-5.8);for(const dz of[-.58,.58])box('Dumpster rim',1.7,.1,.06,metal,11.6,1.16,-5.8+dz);for(const dx of[-.4,0,.4])box('Dumpster reinforcement ribs',.045,.74,.04,metal,11.6+dx,.65,-5.23);for(const dx of[-.65,.65])for(const dz of[-.4,.4])box('Dumpster casters',.13,.2,.16,metal,11.6+dx,.1,-5.8+dz);box('Dumpster lid',1.72,.07,1.22,metal,11.6,1.27,-5.8);box('Dumpster handle',.35,.05,.1,trim,11.6,1.28,-5.13);for(let row=0;row<4;row++){for(let i=0;i<5;i++)box('Pallet top boards',.22,.04,.9,wood,17.5+i*.25,.16+row*.15,-5.4);for(const dz of[-.33,0,.33])box('Pallet stringers',1.25,.09,.09,wood,18,.1+row*.15,-5.4+dz);}}
 // Each theme changes the silhouette and layout, while all solids stay behind z=-3.5.
 if(variant===3){
  for(let i=0;i<3;i++){const x=[7.3,11,18.7][i];box('Garage block',3.7,2.7,2.4,i%2?brick:stone,x,1.35,-7.1);box('Garage roof',3.95,.16,2.65,metal,x,2.78,-7.1);box('Steel double garage doors',3.05,2.25,.08,metal,x,1.15,-5.85);for(const dx of[-1.62,1.62])box('Garage door jamb',.12,2.5,.14,metal,x+dx,1.25,-5.77);box('Garage door handle',.26,.04,.08,metal,x,.95,-5.72);for(const dx of[-.77,.77])for(const yy of[.3,2.0])box('Garage door reinforcement',1.4,.045,.035,metal,x+dx,yy,-5.79);}
  for(let i=0;i<3;i++)crate(13.3,i*.4,-7.3,.6);
 }
 if(variant===4){
  for(let i=0;i<3;i++){const x=[7.5,11.1,18.7][i];for(const dx of[-1.3,1.3])box('Market stall posts',.07,2.4,.07,metal,x+dx,1.2,-6.5);for(let plank=0;plank<5;plank++)box('Market counter planks',2.85,.08,.205,wood,x,.9,-6.65+plank*.23);box('Market awning',3.1,.12,1.9,i%2?metal:trim,x,2.45,-6.4);for(let j=0;j<3;j++){crate(x-.85+j*.85,.99,-6.2,.7,.3,.7);}}
 }
 if(variant===5){
  for(const x of[8.8,19.0]){for(const dz of[-.62,.62])for(let row=0;row<2;row++)box('Grass bed side boards',2.2,.09,.08,wood,x,.06+row*.11,-6.55+dz);for(const dx of[-1.06,1.06])for(let row=0;row<2;row++)box('Grass bed end boards',.08,.09,1.2,wood,x+dx,.06+row*.11,-6.55);box('Grass bed soil',2,.08,1.15,earth,x,.15,-6.55);grassPatch(x,-6.55,1.8,1,.20);}
  bench(11.5,-8.05);
 }
 if(variant===6){
  // A low workshop joins a service block and the yard boundary wall.
  // Its door is a real opening, rather than a textured slab on a solid box.
  const front=-6.27,back=-9.13,roofTilt=.095;
  const tilt=(mesh,axis,angle)=>{mesh.rotation[axis]=angle;mesh.updateMatrix();return mesh;};
  const rod=(name,a,b,r=.025,material=metal)=>{const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),delta=q.clone().sub(p),g=new THREE.CylinderGeometry(r,r,delta.length(),8);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));const mesh=new THREE.Mesh(g,material);mesh.name=name;mesh.position.copy(p.add(q).multiplyScalar(.5));mesh.updateMatrix();batches.set(name,{geometry:g,material,items:[mesh]});};
  box('Workshop left masonry pier',1.78,2.34,.22,brick,5.39,1.17,front);
  box('Workshop right masonry pier',2.34,2.34,.22,brick,10.03,1.17,front);
  box('Workshop masonry lintel',2.70,.24,.22,brick,7.59,2.22,front);
  box('Workshop rear wall',6.60,2.60,.18,brick,7.80,1.30,-9.03);
  for(const x of[4.61,11.09]){box('Workshop side return',.22,2.30,2.88,brick,x,1.15,-7.70);const cap=box('Workshop sloped side infill',.22,.40,2.88,brick,x,2.50,-7.70),g=cap.geometry.clone(),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,(p.getY(i)>0?2.48-p.getZ(i)*.095:2.30)-2.50);g.computeVertexNormals();cap.geometry=g;}
  for(const [x,w]of[[5.39,1.78],[10.03,2.34]])box('Workshop damp masonry base',w,.22,.24,plinth,x,.11,front+.015);
  box('Workshop side damp base',.24,.22,2.88,plinth,11.09,.11,-7.70);
  tilt(box('Workshop pitched sheet roof',6.98,.08,3.17,metal,7.8,2.51,-7.70),'x',roofTilt);
  box('Workshop dark front fascia',6.98,.12,.065,metal,7.8,2.36,-6.13);
  box('Workshop wall flashing',6.65,.14,.06,metal,7.8,2.68,back+.03);
  for(let i=0;i<9;i++)tilt(box('Workshop standing roof seams',.025,.025,3.14,metal,4.55+i*.81,2.565,-7.70),'x',roofTilt);
  rod('Workshop gutter',[4.30,2.33,-6.08],[11.30,2.33,-6.08],.045);
  rod('Workshop gutter downpipe',[11.28,2.33,-6.08],[11.28,.18,-6.08],.038);
  rod('Workshop drain elbow',[11.28,.18,-6.08],[11.28,.11,-5.92],.038);
  box('Workshop recessed door shadow',2.57,2.12,.055,metal,7.59,1.10,front-.015);
  for(let leaf=0;leaf<2;leaf++){
   const centre=6.94+leaf*1.30;
   for(let i=0;i<6;i++){
    const plank=box('Workshop vertical door board',.205,2.08,.07,wood,centre-.54+i*.216,1.10,front+.045),g=plank.geometry.clone(),uv=g.attributes.uv;
    // The grain follows each board, with a different part of the shared map.
    for(let v=0;v<uv.count;v++){const u=uv.getX(v),w=uv.getY(v);uv.setXY(v,w*.8+(leaf*6+i)*.173,u+(leaf*6+i)*.271);}plank.geometry=g;
   }
   for(const y of[.43,1.80]){box('Workshop door strap hinge',.52,.055,.028,metal,centre+(leaf?.34:-.34),y,front+.095);box('Workshop hinge pin',.045,.17,.06,metal,centre+(leaf?.61:-.61),y,front+.105);}
   rod('Workshop door pull '+leaf,[7.44+leaf*.30,.91,front+.13],[7.44+leaf*.30,1.14,front+.13],.018);
  }
  box('Workshop door latch',.32,.045,.045,metal,7.59,.89,front+.13);box('Workshop worn threshold',2.65,.07,.32,plinth,7.59,.035,front+.04);
  // Store pipes on bearers beside the doorway instead of floating in front of it.
  for(const x of[4.91,5.91])box('Workshop pipe bearers',.13,.10,.54,wood,x,.05,-5.80);
  for(let row=0;row<2;row++)for(let i=0;i<3;i++)rod('Workshop stored pipe '+row+':'+i,[4.65,.14+row*.072,-6.0+i*.15],[6.14,.14+row*.072,-6.0+i*.15],.035);
  // The workbench belongs against the back wall, beside the lean-to.
  const bx=12.65,bz=-8.70,base=.05;
  for(let i=0;i<4;i++)box('Workshop bench top plank',2.14,.075,.15,wood,bx,base+.86,bz-.2475+i*.165);
  for(const dx of[-.87,.87])for(const dz of[-.245,.245])box('Workshop bench square leg',.085,.82,.085,wood,bx+dx,base+.41,bz+dz);
  for(const dz of[-.245,.245]){box('Workshop bench apron',1.82,.15,.06,wood,bx,base+.73,bz+dz);box('Workshop bench lower rail',1.82,.07,.065,wood,bx,base+.22,bz+dz);}
  for(const dx of[-.87,.87]){box('Workshop bench end apron',.07,.15,.55,wood,bx+dx,base+.73,bz);box('Workshop bench end stretcher',.07,.07,.55,wood,bx+dx,base+.22,bz);}
  for(let i=0;i<3;i++)box('Workshop lower shelf plank',1.8,.035,.14,wood,bx,base+.265,bz-.16+i*.16);
  box('Workshop vice base',.25,.06,.19,metal,bx-.60,base+.93,bz+.15);for(const dx of[-.075,.075])box('Workshop vice jaw',.04,.14,.15,metal,bx-.60+dx,base+1.02,bz+.15);
  rod('Workshop vice screw',[bx-.81,base+.99,bz+.15],[bx-.39,base+.99,bz+.15],.018);rod('Workshop vice handle',[bx-.82,base+.90,bz+.15],[bx-.82,base+1.10,bz+.15],.012);
  box('Workshop hammer handle',.30,.035,.035,wood,bx+.08,base+.92,bz+.02,.30);box('Workshop hammer head',.07,.065,.15,metal,bx+.22,base+.94,bz-.02,.30);
  for(let i=0;i<3;i++)box('Workshop offcuts on shelf',.48,.06,.11,wood,bx+.43,base+.32+i*.065,bz-.10+i*.04);
  box('Workshop tool board',1.48,.62,.055,wood,bx,1.40,-9.085);for(const x of[bx-.68,bx+.68])box('Workshop tool board edging',.035,.66,.065,metal,x,1.40,-9.045);
  for(let i=0;i<3;i++){const x=bx-.43+i*.38;rod('Workshop hanging tool '+i,[x,1.54,-9.025],[x,1.22,-9.025],.014);box('Workshop hanging tool head',i===1?.16:.07,.055,.04,metal,x,1.55,-9.02);}
  root.userData.workshop={attachedTo:'service-block',roofHeight:2.70,bench:[bx,base,bz]};
 }
 if(variant===7){
  for(const x of[9.5,12.8,18.5]){for(const dx of[-1.2,1.2])box('Exercise bar supports',.09,2.5,.09,metal,x+dx,1.25,-6.7);box('Exercise overhead bar',2.5,.08,.08,metal,x,2.5,-6.7);}
  for(let i=0;i<8;i++)box('Wall ladder rungs',2.4,.045,.055,wood,12.8,.3+i*.29,-6.7);
  for(const x of[10,18]){box('Training bench',1.8,.12,.55,wood,x,.5,-4.8);for(const dx of[-.65,.65])box('Training bench feet',.08,.5,.45,metal,x+dx,.25,-4.8);}
 }
 for(let i=0;i<3;i++)box('Rear downpipe' ,.09,6.8,.1,metal,5.2+i*7.5,3.4,-9.06-setback);
 const groups=new Map();let boxes=0;for(const {material,items}of batches.values()){if(!groups.has(material))groups.set(material,[]);for(const item of items){groups.get(material).push(item.geometry.clone().applyMatrix4(item.matrix));boxes++;}}
 for(const [material,parts]of groups){if(parts.some(p=>!!p.index)!==parts.every(p=>!!p.index))for(let i=0;i<parts.length;i++)if(parts[i].index){const old=parts[i];parts[i]=old.toNonIndexed();old.dispose();}const geometry=mergeGeometries(parts);for(const p of parts)p.dispose();const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=material.name;root.add(mesh);}const windowGroup=windows.finish();root.add(...windowGroup.children.slice());root.userData.windowAnchors=windows.stats.anchors;root.userData.windowCount=windows.stats.count;root.userData.windowStyles=windows.stats.styles.size;root.userData.staticBoxes=boxes+windows.stats.parts;
 root.add(vegetation.finish());const continuousPaving=courtyardPaving(source);for(const child of continuousPaving.children.slice())root.add(child);addCourtyardKerbs(root);return root;
}
