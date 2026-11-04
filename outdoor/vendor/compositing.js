import * as THREE from '../../vendor/three.module.js';
const KEY='bomzh:compositing:v1';
export const compositingDefaults={enabled:true,brightness:0,contrast:1,saturation:1,gamma:1,temperature:0,tint:0,shadows:0,highlights:0,vignette:0,splitStrength:0,shadowColor:'#53677f',highlightColor:'#d9b87a'};
export const compositingRanges={brightness:[-.5,.5,.01],contrast:[.5,1.8,.01],saturation:[0,2,.01],gamma:[.5,1.5,.01],temperature:[-1,1,.01],tint:[-1,1,.01],shadows:[-.4,.4,.01],highlights:[-.4,.4,.01],vignette:[0,.6,.01],splitStrength:[0,.5,.01]};
export const compositingPresets={street:{...compositingDefaults,brightness:-.005,contrast:1.08,saturation:.88,gamma:1.03,temperature:-.09,tint:.025,shadows:.025,highlights:-.045,vignette:.085,splitStrength:.055,shadowColor:'#5b6c80',highlightColor:'#cfb387'},neutral:{...compositingDefaults},warm:{...compositingDefaults,contrast:1.08,saturation:.88,temperature:.18,shadows:.04,splitStrength:.09,vignette:.12},cold:{...compositingDefaults,contrast:1.12,saturation:.75,temperature:-.2,tint:.025,vignette:.13},faded:{...compositingDefaults,contrast:.88,saturation:.8,shadows:.07,temperature:.06}};
export function sanitizeCompositing(input){const value={...compositingDefaults};for(const[key,[min,max]]of Object.entries(compositingRanges))if(Number.isFinite(input?.[key]))value[key]=THREE.MathUtils.clamp(input[key],min,max);for(const key of['shadowColor','highlightColor'])if(/^#[0-9a-f]{6}$/i.test(input?.[key]??''))value[key]=input[key];if(typeof input?.enabled==='boolean')value.enabled=input.enabled;return value;}
export class CompositingSettings{
 constructor(storage,{defaults=compositingDefaults}={}){this.defaults=sanitizeCompositing(defaults);this.value={...this.defaults};try{this.storage=storage??globalThis.localStorage;const p=JSON.parse(this.storage.getItem(KEY));if(p?.version===1)this.value=sanitizeCompositing(p.settings);}catch{}this.uniforms={gradeOn:{value:0},gradeA:{value:new THREE.Vector4()},gradeB:{value:new THREE.Vector4()},gradeC:{value:new THREE.Vector3()},gradeShadow:{value:new THREE.Vector3()},gradeHighlight:{value:new THREE.Vector3()}};this.apply();}
 get active(){const v=this.value;return v.enabled&&(Object.keys(compositingRanges).some(k=>Math.abs(v[k]-compositingDefaults[k])>1e-6));}
 apply(){const v=this.value,u=this.uniforms;u.gradeOn.value=this.active?1:0;u.gradeA.value.set(v.brightness,v.contrast,v.saturation,v.gamma);u.gradeB.value.set(v.temperature,v.tint,v.shadows,v.highlights);u.gradeC.value.set(v.vignette,v.splitStrength,0);for(const[key,target]of[['shadowColor','gradeShadow'],['highlightColor','gradeHighlight']]){const color=new THREE.Color(v[key]);color.convertLinearToSRGB();u[target].value.set(color.r,color.g,color.b);}this.onChange?.();}
 set(v){this.value=sanitizeCompositing({...this.value,...v});this.apply();}reset(){this.value={...this.defaults};this.apply();}
 save(){try{this.storage.setItem(KEY,JSON.stringify(this.export()));return true;}catch{return false;}}
 export(){return {version:1,settings:{...this.value}};}
 import(p){if(p?.version!==1||!p.settings||typeof p.settings!=='object'||Array.isArray(p.settings))throw Error('Нужен файл настроек композитинга.');this.value=sanitizeCompositing(p.settings);this.apply();}
}
export const compositingShader=`
 uniform float gradeOn;
 uniform vec4 gradeA,gradeB;
 uniform vec3 gradeC,gradeShadow,gradeHighlight;
 vec3 outdoorSRGBToLinear(vec3 c){
  return mix(pow(c*.9478672986+vec3(.0521327014),vec3(2.4)),c*.0773993808,vec3(lessThanEqual(c,vec3(.04045))));
 }
 vec3 applyGrade(vec3 linearColor,vec2 uv){
  if(gradeOn<.5)return linearColor;
  vec3 c=sRGBTransferOETF(vec4(max(linearColor,vec3(0.)),1.)).rgb;
  float l=dot(c,vec3(.2126,.7152,.0722));
  c+=gradeB.z*(1.-smoothstep(.05,.65,l))+gradeB.w*smoothstep(.35,.95,l);
  c*=vec3(1.+gradeB.x*.18+gradeB.y*.06,1.-gradeB.y*.12,1.-gradeB.x*.18+gradeB.y*.06);
  c+=gradeA.x;c=(c-.5)*gradeA.y+.5;
  c=pow(max(c,vec3(0.)),vec3(1./gradeA.w));
  float lum=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(lum),c,gradeA.z);
  vec3 tone=mix(gradeShadow,gradeHighlight,smoothstep(.15,.85,lum));c=mix(c,c*tone*2.,gradeC.y);
  float edge=smoothstep(.15,.7,length((uv-.5)*vec2(1.,.8)));c*=1.-gradeC.x*edge;
  return outdoorSRGBToLinear(clamp(c,0.,1.));
 }
`;
