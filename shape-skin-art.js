import {SHAPE_SKINS} from './shape-skins.js?v=49439-web11';
import {ARTWORK_CROPS} from './artwork-crops.js?v=49439-web11';
const atlases=new Map(),loads=new Map();let active='classic';
const atlasKey=(id,chained)=>chained?id+':wrapped':id;
export function ensureSkinArt(id=active,chained=false){
 const key=atlasKey(id,chained);
 if(loads.has(key))return loads.get(key);
 const skin=SHAPE_SKINS.find(s=>s.id===id);if(!skin)return Promise.resolve(false);
 const source=chained?skin.chainedArt:skin.art;
 const loading=(async()=>{try{const art=new Image();art.decoding='async';art.src=source;await art.decode();const cropKey=source.split('/').pop().replace(/\.(png|webp)$/,'');const crops=ARTWORK_CROPS[cropKey];if(!crops)throw Error('Missing skin crops');atlases.set(key,crops.map(c=>({...c,art})));return true;}catch{loads.delete(key);return false;}})();loads.set(key,loading);return loading;
}
// Resolve only Classic and the selected skin when a game actually requests art.
export const skinArtReady={then(resolve,reject){return Promise.all([...new Set(['classic',active])].map(id=>ensureSkinArt(id))).then(resolve,reject);}};
export function setActiveSkin(id){active=SHAPE_SKINS.some(s=>s.id===id)?id:'classic';ensureSkinArt(active);}
export function activeSkin(){return active;}
export function skinCrop(tile,id=active,chained=false){return (atlases.get(atlasKey(id,chained))||atlases.get(id)||atlases.get('classic'))?.[tile.color*4+tile.shape];}
export function skinIsReady(id,chained=false){return atlases.has(atlasKey(id,chained));}
export function skinCanvas(tile,id=active,{chained=false}={}){
 const canvas=document.createElement('canvas');canvas.className='skin-sprite';canvas.width=canvas.height=320;canvas.setAttribute('aria-hidden','true');
 const paint=()=>{const crop=skinCrop(tile,id,chained);if(!crop)return;const scale=304/Math.max(crop.w,crop.h),w=crop.w*scale,h=crop.h*scale;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,320,320);ctx.imageSmoothingQuality='high';ctx.drawImage(crop.art,crop.x,crop.y,crop.w,crop.h,(320-w)/2,(320-h)/2,w,h);};
 paint();if(!skinIsReady(id,chained))ensureSkinArt(id,chained).then(paint);return canvas;
}
