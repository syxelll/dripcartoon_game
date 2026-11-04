import * as THREE from './vendor/three.module.js';
import { loadCharacters } from './character.js?v=finisher3';

export function createArena(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#161629');
  scene.fog = new THREE.FogExp2('#161629', .024);
  const camera = new THREE.PerspectiveCamera(43, 1200/650, .1, 160);
  scene.add(new THREE.HemisphereLight('#c7beff', '#293525', 2));
  const key = new THREE.DirectionalLight('#e0d8ff', 3.3);
  key.position.set(-3, 9, 6); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, {left:-8,right:8,top:7,bottom:-7});
  key.shadow.bias = -.0003; scene.add(key);
  const rim = new THREE.DirectionalLight('#a77bff', 3);
  rim.position.set(3, 4, -5); scene.add(rim);
  const neon = new THREE.PointLight('#ceff51', 30, 15);
  neon.position.set(-4, 3, 1); scene.add(neon);
  const purple = new THREE.PointLight('#a67aff', 40, 15);
  purple.position.set(5, 3, -2); scene.add(purple);
  const mat = (color, roughness=.7, metalness=0) => new THREE.MeshStandardMaterial({color,roughness,metalness});
  const dark = mat('#20232f'), steel = mat('#454357',.35,.7);
  const glow = color => new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:2});
  function box(parent, size, pos, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function ball(parent,r,pos,material) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r,16,12),material);
    mesh.position.set(...pos);mesh.castShadow=true;parent.add(mesh);return mesh;
  }
  box(scene,[19,.35,10],[0,-.2,0],dark);
  const tileMat = mat('#30313c',.45,.25);
  for(let x=-9;x<=9;x++) for(let z=-4;z<=4;z++) box(scene,[.97,.025,.97],[x,.005,z],tileMat);
  box(scene,[17,.03,.045],[0,.035,1.65],glow('#ceff51'));
  box(scene,[17,.03,.045],[0,.035,-1.65],glow('#9b74ff'));
  for(const x of [-8.5,8.5]) box(scene,[.045,.03,3.3],[x,.035,0],glow('#ceff51'));
  for(let x=-9;x<=9;x+=1.5) box(scene,[.065,1.25,.065],[x,.63,-4.3],steel);
  for(const y of [.6,1.25]) box(scene,[19,.055,.055],[0,y,-4.3],steel);
  // Deterministic city geometry keeps the scene reproducible.
  const windowMat = glow('#b49dce');
  const buildings = [mat('#262637'), mat('#353047')];
  for(let n=0;n<42;n++) {
    const x=((n*37)%43)-21,h=2+((n*17)%9),z=-9-Math.floor(n/14)*6;
    box(scene,[1.2,h,1.8],[x,h/2-1,z],buildings[n%2]);
    for(let y=0;y<h-1;y+=.75) for(let wx=-.35;wx<=.35;wx+=.7) if((n+Math.round(y*4))%3) box(scene,[.13,.25,.015],[x+wx,y+.1,z+.91],windowMat);
  }
  for(const x of [-7,7]) {box(scene,[1.4,.7,1.3],[x,.35,-3],steel);for(let i=0;i<6;i++)box(scene,[.1,.02,.8],[x-.5+i*.2,.71,-3],dark);}
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.1,24,16),new THREE.MeshBasicMaterial({color:'#c9b9e2'}));moon.position.set(10,12,-28);scene.add(moon);
  const signCanvas=document.createElement('canvas');signCanvas.width=1024;signCanvas.height=256;
  const pen=signCanvas.getContext('2d');pen.fillStyle='#ceff51';pen.font='900 160px Arial';pen.textAlign='center';pen.fillText('DRIP / FIGHT',512,170);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(7,1.75),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(signCanvas),transparent:true}));sign.position.set(0,4.5,-7);scene.add(sign);

  let models = [];
  async function setCharacters(ids) {
    const loaded = await loadCharacters(scene, ids);
    for (const model of models) { model.dispose(); scene.remove(model.root); }
    models = loaded;
    canvas.dataset.character = 'ready';
  }
  const ready = setCharacters(['character1', 'bomzh']);
  const sparkMaterial = new THREE.MeshBasicMaterial({color:'#ceff51'});
  const sparks = Array.from({length:64},()=>{const s=new THREE.Mesh(new THREE.BoxGeometry(.045,.045,.045),sparkMaterial);scene.add(s);s.visible=false;return s;});
  // Batch static architecture to avoid hundreds of draw calls on mobile GPUs.
  const batches=new Map();
  for(const mesh of [...scene.children]) {
    if(!mesh.isMesh||!mesh.visible||mesh.geometry.type!=='BoxGeometry')continue;
    const {width,height,depth}=mesh.geometry.parameters;
    mesh.scale.set(width,height,depth);mesh.updateMatrix();
    if(!batches.has(mesh.material))batches.set(mesh.material,[]);
    batches.get(mesh.material).push(mesh.matrix.clone());
    scene.remove(mesh);mesh.geometry.dispose();
  }
  for(const [material,matrices] of batches) {
    const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,matrices.length);
    matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
  }
  let width=0,height=0,lastAnimationTime=0;
  function render(fighters,particles,time,shake,floor) {
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    const distance=Math.abs(fighters[0].x-fighters[1].x)/100;
    const center=(fighters[0].x+fighters[1].x-1200)/200;
    camera.position.set(center*.45+Math.sin(time*1.2)*.045+(Math.random()-.5)*shake*.008,2.4,Math.max(6.7,distance*.72+3.1));
    camera.lookAt(center*.65,1.3,0);
    const dt = Math.min(.05, Math.max(0, time - lastAnimationTime));
    lastAnimationTime = time;
    models.forEach((model, i) => model.update(fighters[i], dt, floor));
    sparks.forEach((s,i)=>{const p=particles[i];s.visible=!!p;if(p)s.position.set((p.x-600)/100,(floor-p.y)/100,.4);});
    renderer.render(scene,camera);
  }
  return {render, ready, setCharacters};
}
