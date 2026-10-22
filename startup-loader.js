import {STARTUP_ASSETS} from './startup-assets.js?v=49439-web8';
import {prepareMenuImage} from './menu-preload.js?v=49439-web8';
const loaded=new Set();
export async function loadStartupAssets(progress,{fetcher=fetch,prepareImage=prepareMenuImage,assets=STARTUP_ASSETS}={}){
 let cursor=0,complete=0;
 async function worker(){while(cursor<assets.length){
  const src=assets[cursor++];
  if(!loaded.has(src)){
   if(/\.(webp|png|jpe?g|svg|gif)(\?|$)/i.test(src))await prepareImage(src);
   else{const response=await fetcher(src);if(!response.ok)throw Error('Could not load '+src);await response.arrayBuffer();}
   loaded.add(src);
  }
  progress(++complete,assets.length);
 }}
 const results=await Promise.allSettled(Array.from({length:6},worker));
 const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
}
