import {STARTUP_ASSETS} from './startup-assets.js?v=49439-web3';
import {prepareMenuImage} from './menu-preload.js?v=49439-web3';
const loaded=new Set();
export async function loadStartupAssets(progress,{fetcher=fetch}={}){
 let cursor=0,complete=0;
 async function worker(){while(cursor<STARTUP_ASSETS.length){const src=STARTUP_ASSETS[cursor++];if(!loaded.has(src)){const response=await fetcher(src);if(!response.ok)throw Error('Could not load '+src);await response.arrayBuffer();loaded.add(src);}progress(++complete,STARTUP_ASSETS.length);await new Promise(r=>window.ShapeShiftPlatform.setTimeout(r,0));}}
 const results=await Promise.allSettled(Array.from({length:3},worker));
 const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
 // Keep common menu art decoded, but avoid retaining every large skin atlas in RAM.
 for(const src of ['assets/home-world-v101.webp','assets/menu-panel-v240.webp','assets/menu-icons-v8.webp','assets/action-v45.webp','assets/close-v45.webp','assets/quests-v33.webp','assets/achievements-v59.webp','assets/frames-v12.webp','assets/avatars-v7.webp','assets/mode-cards-v101.webp','assets/adventure-map-v101.webp','assets/adventure-sky-v148.webp','assets/map-route-v102.webp','assets/map-buttons-v106.webp','assets/stars-v101.webp','assets/shapes-v2.webp','browser-time-hd1.png','browser-shield-hd1.png','browser-boost-hd1.png'])await prepareMenuImage(src);
}
