let base;
const embeddedURLs=new Map();
export function configureOutdoorAssets(value = './models/') {
  if(document.getElementById('outdoor-street.glb')) return;
  const path = value.endsWith('/') ? value : value + '/';
  base = new URL(path, document.baseURI).href;
}
export function outdoorAsset(file) {
  const filename=file.split('?')[0];
  const embedded=document.getElementById('outdoor-'+filename);
  if(embedded){
    if(!embeddedURLs.has(file)){
      const data=Uint8Array.from(atob(embedded.textContent.trim()),c=>c.charCodeAt(0));
      embeddedURLs.set(file,URL.createObjectURL(new Blob([data],{type:file.endsWith('.glb')?'model/gltf-binary':'image/jpeg'})));
    }
    return embeddedURLs.get(file);
  }
  if (!base) configureOutdoorAssets();
  return new URL(file, base).href;
}
