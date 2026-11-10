import {createCombatEffects} from './combat-effects.js?v=impact12';
import {loadKitayGorod} from './kitay-gorod.js?v=impact12';
import * as THREE from './vendor/three.module.js';
import {OUTDOOR_LOOK} from './outdoor/look-preset.js?v=impact12';
import { loadCharacters, FIGHTER_WORLD_UNITS } from './character.js?v=impact12';
import { loadOutdoorTemplates, createOutdoorWorld, createReferenceLook, OUTDOOR_LOCATIONS } from './outdoor/environment.js?v=impact12';

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
  const combatEffects=createCombatEffects(scene,{mobile});
  const camera = new THREE.PerspectiveCamera(43, 1200/650, .1, 160);
  const STAGE_X = 13, STAGE_Z = .3;
  const actorLayer = new THREE.Group();
  actorLayer.position.set(STAGE_X, .015, STAGE_Z);scene.add(actorLayer);
  let world, look, kitay, kitayLoading, stageKind = 'street';
  const requestedStage=new URLSearchParams(location.search).get('stage');
  let daylightBackground,daylightFog;
  const locations=[...OUTDOOR_LOCATIONS,{id:'kitay-gorod',name:'Китай-город · ночь'}];
  const environmentReady = loadOutdoorTemplates({assetBase:'./assets/outdoor/'}).then(async templates => {
    look = createReferenceLook(scene, renderer, templates, {shadowSize:mobile?1024:2048,samples:mobile?0:2});
    world = createOutdoorWorld(templates, {radius:0,sectionForIndex:()=>stageKind,foreground:true,fire:true,wind:true});
    scene.add(world.root);
    world.update({x:STAGE_X,time:0,dt:0,camera});
    look.follow(STAGE_X);
    look.resize(canvas.clientWidth,canvas.clientHeight);
    canvas.dataset.environment = 'ready';
    canvas.dataset.stage = stageKind;
    daylightBackground=scene.background;daylightFog=scene.fog;
    if(requestedStage==='kitay-gorod')await setStage(requestedStage);
  });
  async function setStage(kind) {
    if (!world || !locations.some(stage=>stage.id===kind)) return;
    if(kind==='kitay-gorod'){
      kitayLoading ||= loadKitayGorod({mobile,x:STAGE_X});
      kitay ||= await kitayLoading.catch(error=>{kitayLoading=null;throw error});
      if(!kitay.root.parent)scene.add(kitay.root);
    }
    stageKind=kind;
    const night=kind==='kitay-gorod';
    world.root.visible=!night;look.sun.visible=!night;look.ambient.visible=!night;
    if(kitay)kitay.root.visible=night;
    scene.background=night?new THREE.Color('#15171a'):daylightBackground;
    scene.fog=night?null:daylightFog;
    renderer.toneMappingExposure=night?1.08:OUTDOOR_LOOK.settings.exposure;
    if(!night)world.update({x:STAGE_X,time:0,dt:0,camera});
    canvas.dataset.stage=kind;
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
    const night=stageKind==='kitay-gorod';
    const focusHeight=(night?1.65:1.04)+Math.max(0,(floor-Math.min(...fighters.map(f=>f.y)))/FIGHTER_WORLD_UNITS)*.55;
    const fittingDistance=(distance*.5+.65)/(Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))*camera.aspect)*1.08;
    const cameraDistance=Math.max(night?5.1:4.8,distance*.82+1.45,fittingDistance);
    camera.position.set(STAGE_X+center*.45+Math.sin(time*1.2)*.045+(Math.random()-.5)*shake*.008,focusHeight+cameraDistance*(night ? .065 : 1.1/6.7),STAGE_Z+cameraDistance);
    camera.lookAt(STAGE_X+center*.65,focusHeight,STAGE_Z);
    const dt = Math.min(.05, Math.max(0, time - lastAnimationTime));
    lastAnimationTime = time;
    models.forEach((model, i) => {model.root.scale.setScalar(night ? .85 : 1);model.update(fighters[i], dt, floor)});
    combatEffects.update(dt,camera);
    sparks.forEach((s,i)=>{const p=particles[i];s.visible=!!p;if(p)s.position.set(STAGE_X+(p.x-600)/FIGHTER_WORLD_UNITS,(floor-p.y)/FIGHTER_WORLD_UNITS,STAGE_Z+.4);});
    if (look && world && !night) {
      look.follow(STAGE_X+center*.65);
      world.update({x:STAGE_X+center*.65,time,dt,camera});
      const target = new THREE.Vector3(STAGE_X+center*.65,focusHeight,STAGE_Z);
      look.render(camera,target,dt);
    } else renderer.render(scene,camera);
  }
  return {render, ready, setCharacters, setStage, locations,resetEffects:()=>combatEffects.reset(),hit:(x,y,options)=>combatEffects.hit(new THREE.Vector3(STAGE_X+(x-600)/FIGHTER_WORLD_UNITS,(528-y)/FIGHTER_WORLD_UNITS,STAGE_Z+.65),options)};
}
