import * as THREE from '../../vendor/three.module.js';
function paperAtlas(){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=384;const c=canvas.getContext('2d');
 for(let style=0;style<3;style++){c.save();c.translate(style*256,0);c.fillStyle=['#d0c4a6','#b8ad91','#ddd2b5'][style];c.fillRect(0,0,256,384);c.strokeStyle='#80765b';c.lineWidth=1;c.strokeRect(9,9,238,366);c.fillStyle='#4e4c3f';c.textAlign='center';c.font='bold 24px serif';c.fillText(['РАЙОН','ОБЪЯВЛЕНИЯ','ВЕСТИ ДВОРА'][style],128,40,232);c.font='12px serif';c.fillText('ГОРОДСКАЯ ГАЗЕТА',128,58);c.fillRect(14,66,228,3);
  if(style===1){c.font='bold 30px sans-serif';c.fillText('КУПЛЮ',128,118);c.fillText('МЕТАЛЛ',128,153);for(let i=0;i<8;i++){c.fillRect(20+i*29,300,1,70);c.fillRect(24+i*29,315,18,3);}}else{c.fillStyle='#75745f';c.fillRect(15,80,105,78);c.fillStyle='#a39b81';c.beginPath();c.moveTo(20,145);c.lineTo(54,98);c.lineTo(81,131);c.lineTo(112,105);c.lineTo(112,150);c.fill();}
  c.fillStyle='#68634f';for(let col=0;col<3;col++)for(let row=0;row<24;row++){const y=style===1?175+row*5:178+row*7;if(y>288&&style===1)break;c.fillRect(15+col*78,y,47+(row*17+col*13)%23,1.5);}
  c.strokeStyle='#f1e5c380';c.lineWidth=2;c.beginPath();c.moveTo(125,0);c.lineTo(130,384);c.stroke();c.restore();
 }
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
}
export class WindPapers{
 constructor(scene,{lowQuality=false}={}){
  const count=lowQuality?4:6,geometry=new THREE.PlaneGeometry(1,1.4,3,5),styles=new Float32Array(count);for(let i=0;i<count;i++)styles[i]=i%3;geometry.setAttribute('paperStyle',new THREE.InstancedBufferAttribute(styles,1));
  this.clock={value:0};const material=new THREE.MeshStandardMaterial({name:'Windblown newspapers',map:paperAtlas(),roughness:1,side:THREE.DoubleSide});
  material.onBeforeCompile=shader=>{shader.uniforms.paperTime=this.clock;shader.vertexShader='uniform float paperTime; attribute float paperStyle;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv.x=(vMapUv.x+paperStyle)/3.0;\n#endif').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z += sin(position.y*5.0 + paperTime*5.0 + paperStyle*2.0)*0.085 + abs(position.x)*0.12;');};
  this.mesh=new THREE.InstancedMesh(geometry,material,count);this.mesh.name='Windblown leaflets and newspapers';this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.mesh.frustumCulled=false;this.mesh.userData.noShadow=true;this.mesh.visible=false;scene.add(this.mesh);
  this.items=Array.from({length:count},(_,i)=>({x:(i/count-.5)*48,speed:1.2+(i*7%11)/10,z:3.5+(i%3)*.22,phase:i*2.399,size:.14+(i*3%5)*.015}));this.dummy=new THREE.Object3D();this.center=null;
 }
 update(center,dt,outdoors=true){
  const active=outdoors;if(!active){this.mesh.visible=false;this.center=null;return;}
  if(this.center===null){for(let i=0;i<this.items.length;i++)this.items[i].x=center+(i/this.items.length-.5)*48;}
  this.center=center;this.mesh.visible=true;this.clock.value+=Math.max(0,Math.min(dt,.05));const t=this.clock.value;
  for(let i=0;i<this.items.length;i++){const item=this.items[i];item.x+=Math.max(0,Math.min(dt,.05))*item.speed*(1+.35*Math.sin(t*.8));let relative=item.x-center;if(relative>24||relative< -24){relative=((relative+24)%48+48)%48-24;item.x=center+relative;}
   const p=item.phase,fade=THREE.MathUtils.smoothstep(24-Math.abs(relative),0,5),lift=.5+(i%4)*.29;
   this.dummy.position.set(item.x,lift+.16*Math.sin(t*1.7+p)+Math.max(0,Math.sin(t*.65+p))*.65,item.z+Math.sin(t*.7+p)*.12);
   this.dummy.rotation.set(-.7+Math.sin(t*1.8+p)*.8,t*.8+p,Math.sin(t*1.2+p)*.65);this.dummy.scale.setScalar(item.size*fade);this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);
  }this.mesh.instanceMatrix.needsUpdate=true;
 }
}
