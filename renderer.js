import * as THREE from './vendor/three.module.js';
import { loadCharacters } from './character.js?v=outdoor4';
import { loadOutdoorTemplates, createOutdoorWorld, createReferenceLook, OUTDOOR_LOCATIONS } from './outdoor/environment.js?v=outdoor4';

export function createArena(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(43, 1200/650, .1, 160);
  const STAGE_X = 13, STAGE_Z = .3;
  const actorLayer = new THREE.Group();
  actorLayer.position.set(STAGE_X, .015, STAGE_Z);scene.add(actorLayer);
  let world, look, stageKind = 'street';
  const environmentReady = loadOutdoorTemplates({assetBase:'./assets/outdoor/'}).then(templates => {
    look = createReferenceLook(scene, renderer, templates);
    world = createOutdoorWorld(templates, {radius:0,sectionForIndex:()=>stageKind,foreground:true,fire:true,wind:true});
    scene.add(world.root);
    world.update({x:STAGE_X,time:0,dt:0,camera});
    look.follow(STAGE_X);
    look.resize(canvas.clientWidth,canvas.clientHeight);
    canvas.dataset.environment = 'ready';
    canvas.dataset.stage = stageKind;
  });
  function setStage(kind) {
    if (!world || !OUTDOOR_LOCATIONS.some(stage=>stage.id===kind)) return;
    stageKind = kind;
    world.update({x:STAGE_X,time:0,dt:0,camera});
    canvas.dataset.stage = kind;
  }
  let models = [];
  async function setCharacters(ids) {
    const loaded = await loadCharacters(actorLayer, ids);
    for (const model of models) { model.dispose(); actorLayer.remove(model.root); }
    models = loaded;
    canvas.dataset.character = 'ready';
  }
  const ready = Promise.all([environmentReady, setCharacters(['character1', 'bomzh'])]);
  const sparkMaterial = new THREE.MeshBasicMaterial({color:'#ceff51'});
  const sparks = Array.from({length:64},()=>{const s=new THREE.Mesh(new THREE.BoxGeometry(.045,.045,.045),sparkMaterial);scene.add(s);s.visible=false;return s;});
  let width=0,height=0,lastAnimationTime=0;
  function render(fighters,particles,time,shake,floor) {
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();look?.resize(w,h);}
    const distance=Math.abs(fighters[0].x-fighters[1].x)/100;
    const center=(fighters[0].x+fighters[1].x-1200)/200;
    camera.position.set(STAGE_X+center*.45+Math.sin(time*1.2)*.045+(Math.random()-.5)*shake*.008,2.4,STAGE_Z+Math.max(6.7,distance*.72+3.1));
    camera.lookAt(STAGE_X+center*.65,1.3,STAGE_Z);
    const dt = Math.min(.05, Math.max(0, time - lastAnimationTime));
    lastAnimationTime = time;
    models.forEach((model, i) => model.update(fighters[i], dt, floor));
    sparks.forEach((s,i)=>{const p=particles[i];s.visible=!!p;if(p)s.position.set(STAGE_X+(p.x-600)/100,(floor-p.y)/100,STAGE_Z+.4);});
    if (look && world) {
      look.follow(STAGE_X+center*.65);
      world.update({x:STAGE_X+center*.65,time,dt,camera});
      const target = new THREE.Vector3(STAGE_X+center*.65,1.3,STAGE_Z);
      look.render(camera,target,dt);
    } else renderer.render(scene,camera);
  }
  return {render, ready, setCharacters, setStage, locations:OUTDOOR_LOCATIONS};
}
