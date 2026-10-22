import {skinArtReady,skinCrop} from './shape-skin-art.js?v=49439-web6';
export const shapeArtReady={then(resolve,reject){return skinArtReady.then(results=>results.every(Boolean)).then(resolve,reject);}};
export function paintMiniShape(ctx,p,size){const crop=skinCrop(p);if(!crop)return;const height=size*crop.h/crop.w;ctx.drawImage(crop.art,crop.x,crop.y,crop.w,crop.h,-size/2,-height/2,size,height);}
export function miniShapeIcon(shape,color){const el=document.createElement('span');el.className='mini-shape-icon';el.setAttribute('aria-hidden','true');const crop=skinCrop({shape,color});if(crop){el.style.backgroundImage=`url('${crop.art.src}')`;el.style.backgroundSize=`${crop.art.naturalWidth/crop.w*100}% ${crop.art.naturalHeight/crop.h*100}%`;el.style.backgroundPosition=`${crop.x/(crop.art.naturalWidth-crop.w)*100}% ${crop.y/(crop.art.naturalHeight-crop.h)*100}%`;}return el;}

