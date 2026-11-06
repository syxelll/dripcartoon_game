import * as THREE from './vendor/three.module.js';
import {OUTDOOR_LOOK} from './outdoor/look-preset.js?v=mobile9';
import { loadCharacters, FIGHTER_WORLD_UNITS } from './character.js?v=mobile9';
import { loadOutdoorTemplates, createOutdoorWorld, createReferenceLook, OUTDOOR_LOCATIONS } from './outdoor/environment.js?v=mobile9';

export function createArena(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  const mobile=matchMedia('(pointer:coarse)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile?1.25:1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = OUTDOOR_LOOK.settings.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(43, 1200/650, .1, 160);
  const STAGE_X = 13, STAGE_Z = .3;
  const actorLayer = new THREE.Group();
  actorLayer.position.set(STAGE_X, .015, STAGE_Z);scene.add(actorLayer);
  let world, look, stageKind = 'street';
  const environmentReady = loadOutdoorTemplates({assetBase:'./assets/outdoor/'}).then(templates => {
    look = createReferenceLook(scene, renderer, templates, {shadowSize:mobile?1024:2048,samples:mobile?0:2});
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
    const distance=Math.abs(fighters[0].x-fighters[1].x)/FIGHTER_WORLD_UNITS;
    const center=(fighters[0].x+fighters[1].x-1200)/(2*FIGHTER_WORLD_UNITS);
    const focusHeight=1.04+Math.max(0,(floor-Math.min(...fighters.map(f=>f.y)))/FIGHTER_WORLD_UNITS)*.55;
    const fittingDistance=(distance*.5+.65)/(Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))*camera.aspect)*1.08;
    const cameraDistance=Math.max(4.8,distance*.82+1.45,fittingDistance);
    camera.position.set(STAGE_X+center*.45+Math.sin(time*1.2)*.045+(Math.random()-.5)*shake*.008,focusHeight+cameraDistance*(1.1/6.7),STAGE_Z+cameraDistance);
    camera.lookAt(STAGE_X+center*.65,focusHeight,STAGE_Z);
    const dt = Math.min(.05, Math.max(0, time - lastAnimationTime));
    lastAnimationTime = time;
    models.forEach((model, i) => model.update(fighters[i], dt, floor));
    sparks.forEach((s,i)=>{const p=particles[i];s.visible=!!p;if(p)s.position.set(STAGE_X+(p.x-600)/FIGHTER_WORLD_UNITS,(floor-p.y)/FIGHTER_WORLD_UNITS,STAGE_Z+.4);});
    if (look && world) {
      look.follow(STAGE_X+center*.65);
      world.update({x:STAGE_X+center*.65,time,dt,camera});
      const target = new THREE.Vector3(STAGE_X+center*.65,focusHeight,STAGE_Z);
      look.render(camera,target,dt);
    } else renderer.render(scene,camera);
  }
  return {render, ready, setCharacters, setStage, locations:OUTDOOR_LOCATIONS};
}
