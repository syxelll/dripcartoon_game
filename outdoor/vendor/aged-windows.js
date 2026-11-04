import * as THREE from '../../vendor/three.module.js';
import {mergeGeometries} from '../../vendor/utils/BufferGeometryUtils.js';
let palette;
function materials(){
 if(palette)return palette;let frameMap=null,paneMap=null,dripMap=null;
 if(typeof document!=='undefined'){
  let seed=4189;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const paint=document.createElement('canvas');paint.width=256;paint.height=512;const p=paint.getContext('2d');p.fillStyle='#b0ae96';p.fillRect(0,0,256,512);for(let i=0;i<1700;i++){const x=rand()*256,y=rand()*512;p.fillStyle=i%3?'#6a645341':'#e4ddbf52';p.fillRect(x,y,.5+rand()*3,2+rand()*22);}for(let i=0;i<220;i++){const x=rand()*256,y=rand()*512;p.fillStyle='#565243';p.beginPath();p.moveTo(x,y);p.lineTo(x+rand()*12,y+rand()*4);p.lineTo(x+rand()*7,y+3+rand()*18);p.lineTo(x-3,y+rand()*12);p.fill();p.strokeStyle='#d9d2b0';p.lineWidth=.7;p.stroke();}frameMap=new THREE.CanvasTexture(paint);frameMap.colorSpace=THREE.SRGBColorSpace;
  const atlas=document.createElement('canvas'),high=typeof location!=='undefined'&&new URLSearchParams(location.search).get('quality')==='high',density=high?2:1;atlas.width=1024*density;atlas.height=512*density;const c=atlas.getContext('2d');c.scale(density,density);
  for(let style=0;style<8;style++){c.save();c.translate(style%4*256,Math.floor(style/4)*256);c.beginPath();c.rect(0,0,256,256);c.clip();const room=c.createLinearGradient(0,0,0,256);room.addColorStop(0,'#161e1e');room.addColorStop(.65,['#30382e','#393a30','#303d3d','#3a3530'][style%4]);room.addColorStop(1,'#192420');c.fillStyle=room;c.fillRect(0,0,256,256);
   // Uneven cloth, folds and an occasional blind remain behind the dirty glass.
   if(style%4===2){for(let y=30;y<190;y+=12){c.fillStyle=y%24?'#7d8170':'#a4a28a';c.fillRect(4,y,248,7);}c.strokeStyle='#4a534a';c.lineWidth=2;c.beginPath();c.moveTo(54,15);c.lineTo(54,205);c.moveTo(205,15);c.lineTo(205,205);c.stroke();}
   else for(const side of[0,1]){const width=style%3===0?82:45+style*3;c.save();if(side){c.translate(256,0);c.scale(-1,1);}c.fillStyle=['#9b9c86','#a4987c','#898f83'][style%3];c.beginPath();c.moveTo(0,0);c.lineTo(width,0);c.bezierCurveTo(width-8,80,width-25,150,width+5,246);c.lineTo(0,256);c.closePath();c.fill();for(let x=6;x<width-5;x+=9){const fold=c.createLinearGradient(x,0,x+8,0);fold.addColorStop(0,'#18211d7a');fold.addColorStop(.6,'#dfdac23b');fold.addColorStop(1,'#4850442b');c.fillStyle=fold;c.fillRect(x,0,7,256);}c.restore();}
   const reflection=c.createLinearGradient(0,0,180,256);reflection.addColorStop(0,'#9caeb64a');reflection.addColorStop(.5,'#8daba916');reflection.addColorStop(1,'#111b211b');c.fillStyle=reflection;c.fillRect(0,0,256,256);c.fillStyle='#a7b5ab12';c.beginPath();c.moveTo(5,12);c.lineTo(230,12);c.lineTo(145,100);c.lineTo(5,152);c.fill();
   for(let i=0;i<80;i++){const x=rand()*256,y=rand()*140,length=20+rand()*120;const g=c.createLinearGradient(0,y,0,y+length);g.addColorStop(0,'#5f614c65');g.addColorStop(1,'#666d5500');c.fillStyle=g;c.fillRect(x,y,.5+rand()*2,length);}for(let i=0;i<1500;i++){c.fillStyle=i%3?'#c0b8951f':'#1a242025';c.fillRect(rand()*256,rand()*256,.5+rand()*1.5,.5+rand()*2);}
   const edge=c.createRadialGradient(128,118,55,128,128,180);edge.addColorStop(0,'#17201b00');edge.addColorStop(.65,'#20281f2b');edge.addColorStop(1,'#111a16d9');c.fillStyle=edge;c.fillRect(0,0,256,256);c.strokeStyle='#333d2a';c.lineWidth=9;c.strokeRect(4,4,248,248);
   if(style===3||style===7){c.strokeStyle='#bbc4b37a';c.lineWidth=.9;const x=style===3?175:65,y=style===3?83:170;for(const [dx,dy]of[[-45,-80],[75,-35],[-90,55],[25,90]]){c.beginPath();c.moveTo(x,y);c.lineTo(x+dx*.35+8,y+dy*.4);c.lineTo(x+dx,Math.max(0,Math.min(256,y+dy)));c.stroke();}}
   c.restore();
  }paneMap=new THREE.CanvasTexture(atlas);paneMap.colorSpace=THREE.SRGBColorSpace;
  const damp=document.createElement('canvas');damp.width=damp.height=256;const d=damp.getContext('2d');for(let i=0;i<70;i++){const x=10+rand()*236,y=5+rand()*25,len=45+rand()*200,g=d.createLinearGradient(0,y,0,y+len);g.addColorStop(0,'#3e41298c');g.addColorStop(.4,'#43432d48');g.addColorStop(1,'#39442f00');d.fillStyle=g;d.fillRect(x,y,1+rand()*5,len);}dripMap=new THREE.CanvasTexture(damp);dripMap.colorSpace=THREE.SRGBColorSpace;
 }
 palette={paint:new THREE.MeshStandardMaterial({name:'Aged window chipped wood',color:'#c8c6ac',map:frameMap,roughness:.94}),pane:new THREE.MeshStandardMaterial({name:'Aged window dusty glass and curtains',color:paneMap?'#ffffff':'#485448',map:paneMap,roughness:.76,metalness:.04}),recess:new THREE.MeshStandardMaterial({name:'Aged window recess and fittings',color:'#353b32',roughness:.9}),drips:new THREE.MeshStandardMaterial({name:'Aged window sill runoff',map:dripMap,transparent:true,opacity:.8,depthWrite:false,roughness:1,alphaTest:.015,polygonOffset:true,polygonOffsetFactor:-3})};return palette;
}
export function createAgedWindowSet({sills=true}={}){
 const mat=materials(),parts=new Map(),cache=new Map(),stats={count:0,parts:0,styles:new Set(),anchors:[]};
 const addPart=(geometry,material,transform)=>{if(!parts.has(material))parts.set(material,[]);parts.get(material).push(geometry.clone().applyMatrix4(transform));stats.parts++;};
 return {stats,add(x,y,z,w=1.3,h=1.5,angle=0,style=0){style=((style%8)+8)%8;stats.count++;stats.anchors.push({x,y,z,w,h,angle});stats.styles.add(style);const world=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle),new THREE.Vector3(1,1,1));
  const box=(bw,bh,bd,m,bx,by,bz)=>{const key=[bw,bh,bd].join(':');if(!cache.has(key))cache.set(key,new THREE.BoxGeometry(bw,bh,bd));addPart(cache.get(key),m,world.clone().multiply(new THREE.Matrix4().makeTranslation(bx,by,bz)));};
  const iw=w-.19,ih=h-.2;
  box(w-.04,h-.04,.025,mat.recess,0,0,.01);
  const pane=new THREE.PlaneGeometry(iw,ih),uv=pane.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(style%4+(.025+uv.getX(i)*.95))/4,(1-Math.floor(style/4)+(.025+uv.getY(i)*.95))/2);addPart(pane,mat.pane,world.clone().multiply(new THREE.Matrix4().makeTranslation(0,0,.031)));pane.dispose();
  for(const bx of[-w/2+.045,w/2-.045])box(.09,h,.14,mat.paint,bx,0,.085);for(const by of[-h/2+.045,h/2-.045])box(w-.1,.09,.14,mat.paint,0,by,.085);
  for(const bx of[-iw/2+.025,iw/2-.025])box(.04,ih,.085,mat.paint,bx,0,.085);for(const by of[-ih/2+.025,ih/2-.025])box(iw,.04,.085,mat.paint,0,by,.085);
  const split=style%3===1?.18*h:.1*h;box(iw,.055,.12,mat.paint,0,split,.11);box(.047,ih,.12,mat.paint,style%3===0?-.07:0,0,.11);
  box(.03,.105,.035,mat.recess,(style%3===0?-.07:0)+.012,-.17*h,.18);for(const by of[-.28*h,.3*h])box(.033,.075,.045,mat.recess,-w/2+.12,by,.17);
  if(sills){box(w+.2,.1,.38,mat.paint,0,-h/2-.04,.12);box(w+.1,.035,.28,mat.recess,0,-h/2-.105,.095);}
  if(mat.drips.map){const runoff=new THREE.PlaneGeometry(w+.12,.55);addPart(runoff,mat.drips,world.clone().multiply(new THREE.Matrix4().makeTranslation(0,-h/2-.34,.004)));runoff.dispose();}
 },finish(){const root=new THREE.Group();root.name='Detailed_aged_windows';for(const[material,geometries]of parts){const geometry=mergeGeometries(geometries);for(const p of geometries)p.dispose();const mesh=new THREE.Mesh(geometry,material);mesh.name=material.name;mesh.castShadow=material!==mat.drips;mesh.receiveShadow=true;if(material===mat.drips)mesh.userData.noShadow=true;root.add(mesh);}for(const g of cache.values())g.dispose();root.userData.windowAnchors=stats.anchors;root.userData.windowCount=stats.count;root.userData.windowStyles=stats.styles.size;return root;}};
}
// Find the authored glass quads, preserving the original building layout.
export function detailAuthoredWindows(root){
 const existing=root.getObjectByName('Detailed_aged_windows');if(existing)return existing;
 root.updateMatrixWorld(true);const windows=createAgedWindowSet({sills:false}),seen=new Set(),hide=[];
 root.traverse(mesh=>{if(!mesh.isMesh||Array.isArray(mesh.material))return;const name=mesh.material.name;if(/COURT_Curtains/i.test(name)){hide.push(mesh);return;}if(!/COURT_SmokyGlass/i.test(name))return;const g=mesh.geometry,p=g.attributes.position,index=g.index;
 for(let i=0;i<(index?.count??p.count);i+=3){const points=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,index?index.getX(i+k):i+k).applyMatrix4(mesh.matrixWorld));const normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();if(Math.abs(normal.z)<.98)continue;const box=new THREE.Box3().setFromPoints(points),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());if(size.x<.3||size.x>1.5||size.y<.5||size.y>2||size.z>.03)continue;const key=[center.x,center.y,center.z,size.x,size.y].map(v=>v.toFixed(2)).join(':');if(seen.has(key))continue;seen.add(key);windows.add(center.x,center.y,center.z+.02,size.x+.16,size.y+.16,0,seen.size%8);}
 hide.push(mesh);});
 if(!windows.stats.count)return null;for(const mesh of hide)mesh.visible=false;const group=windows.finish();group.applyMatrix4(root.matrixWorld.clone().invert());root.add(group);return group;
}
