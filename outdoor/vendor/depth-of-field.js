import {compositingShader} from './compositing.js?v=detail5';
import * as THREE from '../../vendor/three.module.js';
import {FullScreenQuad} from '../../vendor/postprocessing/Pass.js';
export function focusDepth(camera,point){camera.updateMatrixWorld(true);return Math.max(camera.near,-point.clone().applyMatrix4(camera.matrixWorldInverse).z);}
export class DepthOfField{
 constructor(renderer,{lowQuality=false,enabled=true,samples=2,grading=null}={}){
  this.renderer=renderer;this.grading=grading;this.enabled=enabled;this.width=1;this.height=1;this.focus=null;this.maxBlur=lowQuality?1.8:2.5;this.band=1.2;
  const colorType=renderer.extensions?.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType;
  this.target=new THREE.WebGLRenderTarget(1,1,{type:colorType,depthBuffer:true,stencilBuffer:false});this.target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);this.target.samples=lowQuality?0:Math.min(samples,renderer.capabilities.maxSamples);
  this.material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{...(grading?.uniforms??{gradeOn:{value:0},gradeA:{value:new THREE.Vector4(0,1,1,1)},gradeB:{value:new THREE.Vector4()},gradeC:{value:new THREE.Vector3()},gradeShadow:{value:new THREE.Vector3()},gradeHighlight:{value:new THREE.Vector3()}}),dofOn:{value:enabled?1:0},colorTexture:{value:this.target.texture},depthTexture:{value:this.target.depthTexture},pixel:{value:new THREE.Vector2()},near:{value:.1},far:{value:100},focus:{value:6},band:{value:this.band},radius:{value:this.maxBlur}},defines:{DOF_SAMPLES:lowQuality?8:12},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`
   #include <common>
   #include <packing>
   ${compositingShader}
   uniform float dofOn;
   varying vec2 vUv;
   uniform sampler2D colorTexture,depthTexture;
   uniform vec2 pixel;
   uniform float near,far,focus,band,radius;
   float depthAt(vec2 uv){return -perspectiveDepthToViewZ(texture2D(depthTexture,uv).x,near,far);}
   void main(){
    float depth=dofOn>.5?depthAt(vUv):focus;
    float coc=dofOn*smoothstep(band,band+5.,abs(depth-focus));
    vec3 color=texture2D(colorTexture,vUv).rgb;
    if(coc>.001){
     vec3 sum=color;float weight=1.;
     for(int i=0;i<DOF_SAMPLES;i++){
      float f=float(i)+.5,angle=f*2.39996323;
      vec2 uv=clamp(vUv+vec2(cos(angle),sin(angle))*sqrt(f/float(DOF_SAMPLES))*radius*coc*pixel,vec2(0.),vec2(1.));
      float sampleDepth=depthAt(uv);
      // Do not smear a sharp foreground silhouette into the blurred background.
      float w=smoothstep(depth-1.2,depth-.1,sampleDepth);
      sum+=texture2D(colorTexture,uv).rgb*w;weight+=w;
     }
     color=sum/weight;
    }
    gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    gl_FragColor.rgb=applyGrade(gl_FragColor.rgb,vUv);
    #include <colorspace_fragment>
   }`});
  this.quad=new FullScreenQuad(this.material);
 }
 resize(width,height){this.width=width;this.height=height;if(!this.enabled&&!this.grading?.active){if(this.target.width!==1||this.target.height!==1)this.target.setSize(1,1);return;}const ratio=this.renderer.getPixelRatio(),w=Math.max(1,Math.floor(width*ratio)),h=Math.max(1,Math.floor(height*ratio));this.target.setSize(w,h);this.material.uniforms.pixel.value.set(1/w,1/h);this.material.uniforms.radius.value=this.maxBlur*ratio;}
 render(scene,camera,point,dt){
  const desired=focusDepth(camera,point);this.focus=this.focus===null?desired:THREE.MathUtils.lerp(this.focus,desired,1-Math.exp(-Math.max(0,dt)*8));
  if(!this.enabled&&!this.grading?.active){this.renderer.render(scene,camera);return;}
  const ratio=this.renderer.getPixelRatio();if(this.target.width!==Math.max(1,Math.floor(this.width*ratio))||this.target.height!==Math.max(1,Math.floor(this.height*ratio)))this.resize(this.width,this.height);
  const u=this.material.uniforms;u.dofOn.value=this.enabled?1:0;u.near.value=camera.near;u.far.value=camera.far;u.focus.value=this.focus;
  this.renderer.setRenderTarget(this.target);this.renderer.render(scene,camera);this.renderer.setRenderTarget(null);this.quad.render(this.renderer);
 }
 renderCustom(draw){
  if(!this.grading?.active){draw();return;}this.resize(this.width,this.height);this.renderer.setRenderTarget(this.target);try{draw();}finally{this.renderer.setRenderTarget(null);}this.material.uniforms.dofOn.value=0;this.quad.render(this.renderer);
 }
 dispose(){this.target.dispose();this.material.dispose();this.quad.dispose();}
}
