import {createWaterSurface} from './water-surface.js';
// Half-resolution coordinates in the actual Drop garden painting. Keep masks
// inset from rocks, banks and lily pads so only painted water refracts.
export const DROP_WATER={width:512,height:768,falls:[[44,560,55,618,19,23],[81,636,103,676,24,32],[301,548,302,558,7,8],[332,548,330,558,6,8]],pools:[
 [[263,561],[355,561],[358,575],[323,579],[286,573]],
 [[62,687],[119,683],[211,683],[230,687],[270,687],[298,692],[291,704],[324,705],[329,698],[375,704],[387,713],[424,715],[449,723],[447,741],[418,767],[131,767],[115,753],[188,746],[184,736],[168,730],[178,719],[124,714],[119,720],[110,733],[81,730],[58,741],[51,716]]
 ]};
let shared;
export function createDropWater(scenery,image){
 if(!shared){const source=document.createElement('canvas');source.width=512;source.height=768;source.getContext('2d').drawImage(image,0,0,512,768);shared=createWaterSurface(source,'garden',DROP_WATER);}
 const landscape=document.createElement('div');landscape.className='drop-landscape';const canvas=document.createElement('canvas');canvas.className='drop-water';canvas.setAttribute('aria-hidden','true');landscape.append(canvas);scenery.prepend(landscape);
 const ctx=canvas.getContext('2d');let elapsed=0,last=-1;
 return {step(dt){elapsed+=Math.max(0,Math.min(.1,dt));if(elapsed-last<1/30)return;last=elapsed;
 const w=landscape.clientWidth,h=landscape.clientHeight;if(!w||!h)return;const dpr=Math.min(devicePixelRatio||1,1.5);
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const scale=Math.max(w/512,h/768),x=(w-512*scale)/2,y=(h-768*scale)*.58,water=shared.paint(elapsed*1000);
 ctx.drawImage(water,x+shared.left*scale,y+shared.top*scale,water.width*scale,water.height*scale);
 },dispose(){landscape.remove();canvas.width=canvas.height=0;}};
}
