const KEY='bomzh:lighting:v1';
export const lightingDefaults={exposure:1.08,sunIntensity:3.2,sunColor:'#f2e4cd',azimuth:-48,elevation:52,ambientIntensity:1.5,skyColor:'#c5ccc8',groundColor:'#505347',fogColor:'#85867c',fogStart:24,fogDepth:38,shadows:true};
const ranges={exposure:[.2,2.5],sunIntensity:[0,6],azimuth:[-180,180],elevation:[5,85],ambientIntensity:[0,5],fogStart:[5,60],fogDepth:[5,80]};
export function sanitizeLighting(input,defaults=lightingDefaults){
 const result={...defaults};if(!input||typeof input!=='object')return result;
 for(const [key,[min,max]] of Object.entries(ranges))if(Number.isFinite(input[key]))result[key]=Math.max(min,Math.min(max,input[key]));
 for(const key of ['sunColor','skyColor','groundColor','fogColor'])if(typeof input[key]==='string'&&/^#[0-9a-f]{6}$/i.test(input[key]))result[key]=input[key];
 if(typeof input.shadows==='boolean')result.shadows=input.shadows;return result;
}
export const lightingPresets={
 courtyard:{...lightingDefaults},
 sunset:{...lightingDefaults,exposure:1.1,sunIntensity:3.2,sunColor:'#ffbd7a',azimuth:-105,elevation:18,ambientIntensity:1.5,skyColor:'#b5bed9',groundColor:'#665650',fogColor:'#b09583',fogStart:20},
 night:{...lightingDefaults,exposure:.85,sunIntensity:1.1,sunColor:'#b9d0ff',azimuth:35,elevation:38,ambientIntensity:.75,skyColor:'#687caa',groundColor:'#252e40',fogColor:'#263443',fogStart:16,fogDepth:30}
};
export class LightingSettings{
 constructor({scene,renderer,sun,ambient,lowQuality=false,storage}){
  Object.assign(this,{scene,renderer,sun,ambient,storage});this.defaults={...lightingDefaults,shadows:!lowQuality};this.value={...this.defaults};this.targetX=0;
  try{this.storage=storage??globalThis.localStorage;const saved=JSON.parse(this.storage.getItem(KEY));if(saved?.version===1)this.value=sanitizeLighting(saved.settings,this.defaults);}catch{}
  this.apply();
 }
 set(value){this.value=sanitizeLighting({...this.value,...value},this.defaults);this.apply();}
 reset(){this.value={...this.defaults};this.apply();}
 apply(){const v=this.value;this.renderer.toneMappingExposure=v.exposure;this.sun.intensity=v.sunIntensity;this.sun.color.set(v.sunColor);this.ambient.intensity=v.ambientIntensity;this.ambient.color.set(v.skyColor);this.ambient.groundColor.set(v.groundColor);this.scene.background.set(v.fogColor);this.scene.fog.color.set(v.fogColor);this.scene.fog.near=v.fogStart;this.scene.fog.far=v.fogStart+v.fogDepth;this.renderer.shadowMap.enabled=v.shadows;this.renderer.shadowMap.needsUpdate=true;this.follow(this.targetX);this.onChange?.(v);}
 follow(x){this.targetX=x;const a=this.value.azimuth*Math.PI/180,e=this.value.elevation*Math.PI/180,r=Math.sqrt(296);this.sun.position.set(x+r*Math.cos(e)*Math.sin(a),r*Math.sin(e),r*Math.cos(e)*Math.cos(a));this.sun.target.position.set(x,0,0);}
 export(){return {version:1,settings:{...this.value}};}
 save(){try{this.storage.setItem(KEY,JSON.stringify(this.export()));return true;}catch{return false;}}
 import(data){if(data?.version!==1||!data.settings||typeof data.settings!=='object'||Array.isArray(data.settings))throw Error('Нужен файл настроек освещения этой игры.');this.value=sanitizeLighting(data.settings,this.defaults);this.apply();}
}
