import * as THREE from '../../vendor/three.module.js';
export function roadUV(geometry,matrix){const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv,point=new THREE.Vector3();if(!uv)return;for(let i=0;i<p.count;i++){if(n&&Math.abs(n.getY(i))<.8)continue;point.fromBufferAttribute(p,i).applyMatrix4(matrix);uv.setXY(i,point.x/2,point.z/2);}uv.needsUpdate=true;}
export function prepareStreetGround(root){root.updateMatrixWorld(true);root.traverse(mesh=>{if(!mesh.isMesh||!/asphalt/i.test(mesh.material?.name??''))return;roadUV(mesh.geometry,mesh.matrixWorld);for(const key of['map','normalMap','roughnessMap','metalnessMap']){const t=mesh.material[key];if(t){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,1);t.offset.set(0,0);t.rotation=0;t.needsUpdate=true;}}});}
// Keep the authored pavement profile and its UVs on both sides of each modular join.
export function courtyardPaving(source){source.updateMatrixWorld(true);const batches=new Map();
 function clip(points,distance){const out=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],da=distance(a.p),db=distance(b.p);if(da>=-1e-6)out.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);out.push({p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize(),uv:a.uv.clone().lerp(b.uv,t)});}}return out;}
 source.traverse(mesh=>{if(!mesh.isMesh||mesh.material?.name!=='Pavement tiles')return;const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,index=g.index;if(!uv)return;const normal=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);if(!batches.has(mesh.material))batches.set(mesh.material,{p:[],n:[],uv:[]});const out=batches.get(mesh.material);
  for(let i=0;i<(index?.count??p.count);i+=3){const triangle=[0,1,2].map(j=>{const k=index?index.getX(i+j):i+j;return {p:new THREE.Vector3().fromBufferAttribute(p,k).applyMatrix4(mesh.matrixWorld),n:new THREE.Vector3().fromBufferAttribute(n,k).applyMatrix3(normal).normalize(),uv:new THREE.Vector2().fromBufferAttribute(uv,k)};});
   for(const region of['front','left','right']){let poly=clip(triangle,point=>region==='front'?point.z-2.35:-1.8-point.z);if(region!=='front')poly=clip(poly,point=>region==='left'?4.5-point.x:point.x-21.5);
    for(let j=1;j<poly.length-1;j++)for(const v of[poly[0],poly[j],poly[j+1]]){out.p.push(...v.p.toArray());out.n.push(...v.n.toArray());out.uv.push(...v.uv.toArray());}
   }
  }
 });
 const root=new THREE.Group();root.name='Continuous_courtyard_paving';for(const [material,data]of batches){if(!data.p.length)continue;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(data.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=mesh.castShadow=true;root.add(mesh);}return root;
}
