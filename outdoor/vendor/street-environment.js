import * as THREE from '../../vendor/three.module.js';
// Extend the front paving beyond the mobile camera, preserving its authored UV field.
export function extendFrontPaving(root){
 root.updateMatrixWorld(true);let sample=null;
 root.traverse(mesh=>{if(sample||!mesh.isMesh||mesh.material.name!=='Pavement tiles')return;const g=mesh.geometry,p=g.attributes.position,uv=g.attributes.uv,index=g.index;if(!uv)return;
  for(let i=0;i<(index?.count??p.count);i+=3){const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j),points=ids.map(k=>new THREE.Vector3().fromBufferAttribute(p,k).applyMatrix4(mesh.matrixWorld));if(points.some(v=>v.z<2.5)||Math.max(...points.map(v=>v.y))-Math.min(...points.map(v=>v.y))>.001)continue;const normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));if(normal.y<=0)continue;sample={points,uv:ids.map(k=>new THREE.Vector2().fromBufferAttribute(uv,k)),material:mesh.material};break;}
 });
 if(!sample)throw Error('Authored front paving surface not found');
 const bounds=new THREE.Box3().setFromObject(root),front=bounds.max.z;if(front>=13)return;const [a,b,c]=sample.points,ab=b.clone().sub(a),ac=c.clone().sub(a),det=ab.x*ac.z-ab.z*ac.x;
 const points=[[0,a.y-.002,front-.01],[26,a.y-.002,front-.01],[0,a.y-.002,14],[26,a.y-.002,14]],uv=[];
 for(const [x,,z] of points){const s=((x-a.x)*ac.z-(z-a.z)*ac.x)/det,t=(ab.x*(z-a.z)-ab.z*(x-a.x))/det;uv.push(sample.uv[0].x+s*(sample.uv[1].x-sample.uv[0].x)+t*(sample.uv[2].x-sample.uv[0].x),sample.uv[0].y+s*(sample.uv[1].y-sample.uv[0].y)+t*(sample.uv[2].y-sample.uv[0].y));}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex([0,2,1,1,2,3]);g.computeVertexNormals();const mesh=new THREE.Mesh(g,sample.material);mesh.name='Camera_front_paving';root.add(mesh);
}
// Metals need sky reflections: hemisphere lights alone only illuminate diffuse paint.
// Limit the reflection map to street materials so character rendering stays consistent.
export function setupStreetReflections(root,renderer,lighting,extraRoots=[]){
 const materials=new Set();for(const source of[root,...extraRoots])source.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});
 const anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 for(const m of materials)for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])if(m[key]){m[key].anisotropy=anisotropy;m[key].needsUpdate=true;}
 const scene=new THREE.Scene(),geometry=new THREE.SphereGeometry(10,24,12),colors=new Float32Array(geometry.attributes.position.count*3),material=new THREE.MeshBasicMaterial({side:THREE.BackSide,vertexColors:true});geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));scene.add(new THREE.Mesh(geometry,material));
 const pmrem=new THREE.PMREMGenerator(renderer);let target=null,key='';
 lighting.onChange=value=>{
  const next=value.skyColor+value.groundColor;
  if(next!==key){const sky=new THREE.Color(value.skyColor),ground=new THREE.Color(value.groundColor),color=new THREE.Color();for(let i=0;i<geometry.attributes.position.count;i++){const y=geometry.attributes.position.getY(i)/10,t=THREE.MathUtils.smoothstep(y,-.2,.3);color.copy(ground).lerp(sky,t);color.toArray(colors,i*3);}geometry.attributes.color.needsUpdate=true;const old=target;target=pmrem.fromScene(scene,.05);for(const m of materials){m.envMap=target.texture;m.needsUpdate=true;}old?.dispose();key=next;}
  for(const m of materials)m.envMapIntensity=value.ambientIntensity/2.6;
 };lighting.onChange(lighting.value);
}
