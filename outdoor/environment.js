import * as THREE from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {configureOutdoorAssets, outdoorAsset} from './vendor/assets.js';
import {preloadArchitecture, applyPaintedArchitecture} from './vendor/painted-architecture.js';
import {preloadPaintedAsphalt, applyPaintedAsphalt} from './vendor/painted-asphalt.js';
import {preloadPaving, darkenPaving, detailPaving, addRoadEdgeDust} from './vendor/paving.js';
import {extendFrontPaving, setupStreetReflections} from './vendor/street-environment.js';
import {detailAuthoredWindows} from './vendor/aged-windows.js';
import {replaceStreetSigns} from './vendor/street-signs.js';
import {russianFacades, addRussianDetails, addPanelJoints} from './vendor/russian-neighborhood.js';
import {fixFoundation} from './vendor/foundation.js';
import {detailStreetTrash} from './vendor/trash-details.js';
import {addSurfaceWear} from './vendor/surface-wear.js';
import {prepareStreetGround} from './vendor/ground-transitions.js';
import {createCourtyard} from './vendor/courtyards.js';
import {COURTYARD_TYPES, COURTYARD_NAMES} from './vendor/route.js';
import {ForegroundProps} from './vendor/foreground-props.js';
import {FireBarrels} from './vendor/fire-barrels.js';
import {WindPapers} from './vendor/wind-papers.js';
import {LightingSettings} from './vendor/lighting.js';
import {CompositingSettings, compositingPresets} from './vendor/compositing.js';
import {DepthOfField} from './vendor/depth-of-field.js';

export const SECTION_LENGTH = 26;
export const OUTDOOR_LOCATIONS = [{id:'street', name:'Улица'},
  ...COURTYARD_TYPES.map((id, i) => ({id, name:COURTYARD_NAMES[i]}))];
let loaded;

// Same preparation order as the source game's main.js, without actors or UI.
// Load once per page; generated textures/materials are cached and shared.
export function loadOutdoorTemplates({assetBase = './models/'} = {}) {
  if (loaded) return loaded;
  configureOutdoorAssets(assetBase);
  loaded = (async () => {
    const [environment] = await Promise.all([
      new GLTFLoader().loadAsync(outdoorAsset('street.glb')),
      preloadArchitecture(), preloadPaintedAsphalt(), preloadPaving()
    ]);
    const street = environment.scene;
    street.traverse(o => {
      if (o.isMesh && (/graffiti/i.test(o.name) || /graffiti/i.test(o.material?.name ?? ''))) o.visible = false;
    });
    prepareStreetGround(street);
    applyPaintedAsphalt(street);
    darkenPaving(street);
    extendFrontPaving(street);
    detailAuthoredWindows(street);
    replaceStreetSigns(street);
    russianFacades(street);
    applyPaintedArchitecture(street);
    fixFoundation(street);
    addPanelJoints(street);
    addRussianDetails(street, 'street');
    detailStreetTrash(street);
    detailPaving(street);
    addRoadEdgeDust(street);
    addSurfaceWear(street, 'street');
    const sections = new Map([['street', street]]);
    for (let v = 0; v < COURTYARD_TYPES.length; v++) {
      const yard = createCourtyard(street, v);
      applyPaintedArchitecture(yard);
      fixFoundation(yard);
      addPanelJoints(yard);
      applyPaintedAsphalt(yard);
      darkenPaving(yard);
      addRussianDetails(yard, 'courtyard', v);
      detailPaving(yard);
      addRoadEdgeDust(yard, true);
      addSurfaceWear(yard, 'street');
      sections.set(COURTYARD_TYPES[v], yard);
    }
    for (const section of sections.values()) section.traverse(o => {
      if (o.isMesh) {o.castShadow = !o.userData.noShadow; o.receiveShadow = true;}
    });
    return {street, sections};
  })();
  return loaded;
}

// Keep the parent at world origin, scale 1, with no rotation: several original
// effects and material shaders use world coordinates. Place modules along X.
export function cloneOutdoorSection(templates, kind = 'street', index = 0) {
  const template = templates.sections.get(kind);
  if (!template) throw new Error(`Unknown outdoor section: ${kind}`);
  const group = new THREE.Group();
  group.name = `Outdoor_${kind}_${index}`;
  group.position.x = index * SECTION_LENGTH;
  const scenery = template.clone(true);
  scenery.traverse(o => { o.updateMatrix(); o.matrixAutoUpdate = false; });
  group.add(scenery);
  return group;
}

export function createOutdoorWorld(templates, {
  sectionForIndex = () => 'street', radius = 1, lowQuality = false,
  foreground = true, fire = true, wind = true
} = {}) {
  const root = new THREE.Group();
  root.name = 'Outdoor_environment';
  const chunks = new Map();
  const props = foreground ? new ForegroundProps(root, {lowQuality}) : null;
  const barrels = fire ? new FireBarrels(root) : null;
  const papers = wind ? new WindPapers(root, {lowQuality}) : null;
  const removeChunk = chunk => {
    root.remove(chunk);
    // Three.js instance buffers belong to the clone; geometry/materials stay shared.
    chunk.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
  };
  return {
    root, chunks,
    update({x = 13, time = 0, dt = 0, camera} = {}) {
      const center = Math.floor(x / SECTION_LENGTH);
      for (let i = center - radius; i <= center + radius; i++) {
        const kind = sectionForIndex(i);
        if (chunks.get(i)?.userData.sectionKind !== kind) {
          if (chunks.has(i)) removeChunk(chunks.get(i));
          const chunk = cloneOutdoorSection(templates, kind, i);
          chunk.userData.sectionKind = kind;
          root.add(chunk);
          chunks.set(i, chunk);
        }
      }
      for (const [i, chunk] of chunks) if (Math.abs(i - center) > radius) {
        removeChunk(chunk);
        chunks.delete(i);
      }
      props?.update(x, 'street');
      barrels?.update(x, time, camera);
      papers?.update(x, dt, true);
    },
    detach() {
      for (const chunk of chunks.values()) removeChunk(chunk);
      chunks.clear();
      root.removeFromParent();
      // Templates and the cached effect resources live for the page lifetime.
    }
  };
}

// Optional reference look. A host game with its own lighting/postprocessing can
// use the imported settings instead of replacing its renderer configuration.
export function createReferenceLook(scene, renderer, templates, {lowQuality = false} = {}) {
  scene.background = new THREE.Color('#85867c');
  scene.fog = new THREE.Fog('#85867c', 24, 62);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = !lowQuality;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const ambient = new THREE.HemisphereLight();
  const sun = new THREE.DirectionalLight();
  sun.castShadow = !lowQuality;
  sun.shadow.mapSize.set(lowQuality ? 1024 : 2048, lowQuality ? 1024 : 2048);
  Object.assign(sun.shadow.camera, {left:-18, right:18, top:14, bottom:-14, far:45});
  sun.shadow.bias = -.001;
  sun.shadow.normalBias = .025;
  sun.shadow.radius = 3;
  scene.add(ambient, sun, sun.target);
  const storage = {getItem:() => null};
  const lighting = new LightingSettings({scene, renderer, sun, ambient, lowQuality, storage});
  setupStreetReflections(templates.street, renderer, lighting,
    [...templates.sections.values()].filter(root => root !== templates.street));
  const grading = new CompositingSettings(storage, {defaults:compositingPresets.street});
  const post = new DepthOfField(renderer, {grading, enabled:false, lowQuality, samples:2});
  return {lighting, grading, ambient, sun, post,
    follow:x => lighting.follow(x),
    resize:(width, height) => post.resize(width, height),
    render:(camera, target, dt) => post.render(scene, camera, target, dt)};
}
