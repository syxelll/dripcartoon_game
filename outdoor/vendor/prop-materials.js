import * as THREE from '../../vendor/three.module.js';
let palette;
// Small shared surface maps; objects retain individual geometry without extra materials.
export function propMaterials(){
 if(palette)return palette;
 let seed=93051;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 function material(kind,name,color,metalness=0){
  let map=null,bump=null,rough=null;
  if(typeof document!=='undefined'){
   const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');c.fillStyle=color;c.fillRect(0,0,512,512);
   if(kind==='wood'){
    for(let i=0;i<1500;i++){const y=rand()*512;c.strokeStyle=i%4?'#30291c30':'#d5c29345';c.lineWidth=.4+rand()*2;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(150,y-8+rand()*16,330,y-12+rand()*24,512,y);c.stroke();}
    for(let i=0;i<22;i++){const x=rand()*512,y=rand()*512;c.strokeStyle='#201f19a0';c.lineWidth=.6;c.beginPath();c.moveTo(x,y);c.lineTo(x+30,y+1);c.lineTo(x+60+rand()*100,y-2);c.stroke();}
    for(let i=0;i<9;i++){const x=rand()*512,y=rand()*512;c.strokeStyle='#352f2360';for(let j=0;j<4;j++){c.beginPath();c.ellipse(x,y,8+j*5,1+j*1.5,.05,0,Math.PI*2);c.stroke();}}
   }
   if(kind==='metal'){
    for(let i=0;i<180;i++){const x=rand()*512,y=rand()*512,r=1+rand()*9;c.fillStyle=i%3?'#625940':'#7c6b4d';c.beginPath();for(let j=0;j<9;j++){const a=j*Math.PI*2/9,rr=r*(.5+rand()*.5);const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;if(j)c.lineTo(px,py);else c.moveTo(px,py);}c.closePath();c.fill();c.strokeStyle='#b4ae8240';c.lineWidth=1;c.stroke();}
    for(let i=0;i<95;i++){const x=rand()*512,y=rand()*512;c.strokeStyle='#b4b19d60';c.lineWidth=.5;c.beginPath();c.moveTo(x,y);c.lineTo(x+rand()*32,y+rand()*4);c.stroke();}
   }
   if(kind==='fabric'){for(let i=0;i<512;i+=4){c.fillStyle=i%8?'#d3c5a925':'#3a3f3630';c.fillRect(i,0,1,512);c.fillRect(0,i,512,1);}for(let i=0;i<8;i++){c.fillStyle='#656b5b40';c.fillRect(i*64,0,12,512);}}
   if(kind==='soil')for(let i=0;i<1200;i++){c.fillStyle=['#2d2d21','#706b49','#4e4a32'][i%3];c.beginPath();c.ellipse(rand()*512,rand()*512,1+rand()*4,1+rand()*3,rand()*3,0,7);c.fill();}
   if(kind==='stone')for(let i=0;i<150;i++){const x=rand()*512,y=rand()*512;c.strokeStyle='#5b5c4740';c.lineWidth=.5;c.beginPath();c.moveTo(x,y);c.lineTo(x+8,y+12);c.lineTo(x+3,y+27);c.stroke();}
   for(let i=0;i<12000;i++){c.fillStyle=i%2?'#ede4bf10':'#1d241c18';c.fillRect(rand()*512,rand()*512,1+rand()*2,1+rand()*2);}
   // Dirt builds up towards the lower edge and in the corners.
   const g=c.createLinearGradient(0,280,0,512);g.addColorStop(0,'#272c2000');g.addColorStop(1,'#252b2465');c.fillStyle=g;c.fillRect(0,0,512,512);
   map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;
   const relief=document.createElement('canvas');relief.width=relief.height=256;const r=relief.getContext('2d');r.fillStyle='#bdbdbd';r.fillRect(0,0,256,256);for(let i=0;i<2500;i++){r.fillStyle=i%2?'#b2b2b2':'#dedede';r.fillRect(rand()*256,rand()*256,kind==='wood'?8+rand()*25:1,kind==='wood'?.5:1.5);}bump=new THREE.CanvasTexture(relief);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;rough=bump;
  }
  return new THREE.MeshStandardMaterial({name,color:map?'#ffffff':color,map,bumpMap:bump,bumpScale:kind==='wood'?.014:.007,roughnessMap:rough,roughness:1,metalness});
 }
 palette={wood:material('wood','Courtyard old wood','#75664b'),metal:material('metal','Prop chipped painted metal','#4d5c4b',.2),trim:material('stone','Prop worn concrete and fittings','#a6a28a'),soil:material('soil','Prop soil and dirt','#4a4932'),fabric:material('fabric','Prop faded cloth','#9b9c85')};palette.fabric.side=THREE.DoubleSide;return palette;
}
