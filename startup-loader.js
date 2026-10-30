import {markStartup} from './experience-metrics.js';
import {FULL_STARTUP_ASSETS,BACKGROUND_ASSETS,OPENING_ASSETS} from './startup-plan.js?v=494200';
import {prepareMenuImage} from './menu-preload.js?v=494200';
const loaded=new Set();
export async function loadStartupAssets(progress,{fetcher=fetch,prepareImage=prepareMenuImage,assets=FULL_STARTUP_ASSETS}={}){
 let cursor=0,complete=0;
 async function worker(){while(cursor<assets.length){
  const src=assets[cursor++];
  if(!loaded.has(src)){
   if(/\.(webp|png|jpe?g|svg|gif)(\?|$)/i.test(src))await prepareImage(src).catch(error=>{throw new Error('Could not decode '+src+': '+error.message);});
   else{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{const response=await fetcher(src,{signal:controller.signal});if(!response.ok)throw Error('Could not load '+src);await response.arrayBuffer();}finally{clearTimeout(timer);}}
   loaded.add(src);
  }
  progress(++complete,assets.length);
 }}
 const results=await Promise.allSettled(Array.from({length:4},worker));
 const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
}

// Sequential low-priority cache warming: no image decoding and no startup dependency.
export function loadBackgroundAssets({assets=BACKGROUND_ASSETS,fetcher=fetch,
 schedule=fn=>setTimeout(fn,150),paused=()=>globalThis.document?.hidden===true,
 onError=()=>{},timeout=15000}={}){
 let index=0,stopped=false,controller;
 const pump=async()=>{
  if(stopped||index>=assets.length)return;
  if(paused()){schedule(pump);return;}
  const src=assets[index++];controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
  try{const response=await fetcher(src,{signal:controller.signal,priority:'low'});if(!response.ok)throw Error('Could not load '+src);await response.arrayBuffer();}
  catch(error){onError(src,error);}finally{clearTimeout(timer);controller=null;}
  if(!stopped)schedule(pump);
 };
 schedule(pump);return {stop(){stopped=true;controller?.abort();}};
}

// Finish opening resources before presenting first-run setup.
export async function prepareOpeningScreen(){
 const cover=document.getElementById('startup-ready');
 if(!cover)return;
 cover.hidden=false;
 cover.querySelector('p').textContent='Loading game...';
 const bar=cover.querySelector('progress'),label=cover.querySelector('.startup-percent');
 await loadStartupAssets((done,total)=>{const value=Math.floor(done/total*100);if(bar)bar.value=value;if(label)label.textContent=value+'%';},{assets:OPENING_ASSETS});
 await document.fonts.ready;markStartup('opening_ready');
}
