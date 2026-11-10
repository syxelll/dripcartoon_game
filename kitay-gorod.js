import {resizeBusShelter,addRoadDetails} from './kitay-street-details.js?v=actions14';
import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
const urls=new Map();
function asset(name){
 const embedded=document.getElementById('kitay-'+name);
 if(!embedded)return new URL('./assets/kitay-gorod/'+name+'?v=actions14',document.baseURI).href;
 if(!urls.has(name)){const bytes=Uint8Array.from(atob(embedded.textContent.trim()),c=>c.charCodeAt(0));urls.set(name,URL.createObjectURL(new Blob([bytes],{type:name.endsWith('.glb')?'model/gltf-binary':'image/jpeg'})))}
 return urls.get(name);
}
/** Authored, baked metro geometry; distant skyline replaces the source city's heavy trees. */
export async function loadKitayGorod({mobile=false,x=13}={}){
 const [gltf,sky]=await Promise.all([new GLTFLoader().loadAsync(asset('metro.glb')),new THREE.TextureLoader().loadAsync(asset('skyline-quiet.jpg'))]);
 const root=new THREE.Group();root.name='KitayGorodArena';root.position.x=x;
 gltf.scene.traverse(o=>{if(o.isMesh){
  o.castShadow=false;o.receiveShadow=false;
  const convert=m=>{
   if(m.name==='BusStop_Glass'){
    m.dispose();return new THREE.MeshPhysicalMaterial({name:'BusStop_Glass',color:'#b7d1da',roughness:.12,metalness:0,ior:1.46,thickness:.012,transmission:mobile?0:.65,transparent:true,opacity:mobile ? .2 : .65,depthWrite:false,side:THREE.DoubleSide,clearcoat:1,clearcoatRoughness:.08});
   }
   const map=m.emissiveMap||m.map;
   if(map){
    if(mobile&&map.image&&Math.max(map.image.width,map.image.height)>2048){
     const image=map.image,ratio=2048/Math.max(image.width,image.height),canvas=document.createElement('canvas');
     canvas.width=Math.round(image.width*ratio);canvas.height=Math.round(image.height*ratio);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);map.image=canvas;image.close?.();map.needsUpdate=true;
    }
    map.anisotropy=mobile?2:4;map.colorSpace=THREE.SRGBColorSpace;
   }
   const baked=m.name.startsWith('Albedo_')
    ?new THREE.MeshStandardMaterial({map,roughness:.92,metalness:0,side:THREE.DoubleSide,emissive:'#8094a8',emissiveIntensity:.06})
    :new THREE.MeshBasicMaterial({map,color:map?0xffffff:m.emissive,side:THREE.DoubleSide,toneMapped:false,fog:false,transparent:m.transparent,alphaTest:m.transparent ? .025 : 0,opacity:m.opacity});
   m.dispose();return baked;
  };
  o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
 }});gltf.scene.scale.setScalar(1.28);gltf.scene.position.z=-2.3;resizeBusShelter(gltf.scene,root);root.add(gltf.scene);addRoadDetails(root);
 sky.colorSpace=THREE.SRGBColorSpace;
 sky.wrapS=THREE.MirroredRepeatWrapping;sky.repeat.x=400/180;sky.offset.x=-(400-180)/(2*180);
 const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(400,42),new THREE.MeshBasicMaterial({map:sky,color:'#72808e',toneMapped:false,fog:false}));backdrop.position.set(20,14,-85);
 backdrop.material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <tonemapping_fragment>',`float cityGray=dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722));
 gl_FragColor.rgb=mix(vec3(cityGray),gl_FragColor.rgb,.25);
 float cityFade=smoothstep(.12,.55,vMapUv.y);
 gl_FragColor.rgb=mix(vec3(.0075,.0085,.0105),gl_FragColor.rgb,.65*cityFade);
 #include <tonemapping_fragment>`)};
 root.add(backdrop);
 const ambient=new THREE.HemisphereLight('#b6d6f5','#272736',.8);root.add(ambient);
 const key=new THREE.DirectionalLight('#c5e5ff',2.5);key.position.set(-3,7,5);key.target.position.set(0,0,0);root.add(key,key.target);key.castShadow=true;
 key.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.5,far:24});key.shadow.normalBias=.025;key.shadow.bias=-.0003;key.shadow.radius=3;
 const entranceLight=new THREE.PointLight('#ffd298',14,11,2);entranceLight.position.set(0,1.2,-6.7);root.add(entranceLight);
 const redLight=new THREE.PointLight('#ff251b',3,7,2);redLight.position.set(0,4.2,-5.9);root.add(redLight);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(28,7),new THREE.ShadowMaterial({opacity:.46}));shadow.rotation.x=-Math.PI/2;shadow.position.set(0,.035,0);shadow.receiveShadow=true;root.add(shadow);
 return {root};
}
