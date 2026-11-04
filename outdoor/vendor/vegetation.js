import * as THREE from '../../vendor/three.module.js';
let foliageMaterial;
function materials(){
 if(foliageMaterial)return;
 let map=null;
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;const c=canvas.getContext('2d');
  const shade=c.createLinearGradient(0,0,128,0);shade.addColorStop(0,'#93978b');shade.addColorStop(.48,'#ececdb');shade.addColorStop(.52,'#c8cbb9');shade.addColorStop(1,'#818a77');c.fillStyle=shade;c.fillRect(0,0,128,256);
  c.strokeStyle='#e0e2c28c';c.lineWidth=1.5;
  for(let y=25;y<256;y+=27)for(const side of[-1,1]){c.beginPath();c.moveTo(64,y);c.quadraticCurveTo(64+side*20,y-15,64+side*60,y-37);c.stroke();}
  c.strokeStyle='#e9e5bb';c.lineWidth=2;c.beginPath();c.moveTo(64,256);c.lineTo(64,0);c.stroke();
  map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
 }
 foliageMaterial=new THREE.MeshStandardMaterial({name:'Vegetation leaves',map,vertexColors:true,side:THREE.DoubleSide,roughness:.94});
}
// Tapered, bent grass blades are combined into one mesh per yard.
export function createVegetation(seed=1){
 materials();const root=new THREE.Group();root.name='Detailed_vegetation';const positions=[],colors=[],uvs=[],indices=[];let leaves=0;
 let state=(seed+1)*73856093;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 function grass(x,y,z){for(let i=0;i<15;i++){
  const angle=random()*Math.PI*2,height=.12+random()*.22,width=.005+random()*.006,bend=.025+random()*.09,px=x+(random()-.5)*.2,pz=z+(random()-.5)*.2,offset=positions.length/3;
  const color=new THREE.Color().setHSL(random()<.2?.12:.23+random()*.035,.25+random()*.18,.14+random()*.12);
  for(let row=0;row<3;row++){const t=row/2,w=width*(1-t);for(const side of[-1,1]){positions.push(px+Math.cos(angle)*bend*t*t+Math.cos(angle+Math.PI/2)*w*side,y+height*t,pz+Math.sin(angle)*bend*t*t+Math.sin(angle+Math.PI/2)*w*side);const shade=color.clone().multiplyScalar(.65+t*.45);colors.push(shade.r,shade.g,shade.b);uvs.push(side<0?0:1,t);}}
  indices.push(offset,offset+2,offset+1,offset+1,offset+2,offset+3,offset+2,offset+4,offset+3);leaves++;
 }}

 function finish(){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();const foliage=new THREE.Mesh(g,foliageMaterial);foliage.name='Tapered grass blades';foliage.castShadow=foliage.receiveShadow=true;root.add(foliage);

  root.userData.leafCount=leaves;return root;
 }
 return {grass,finish};
}
