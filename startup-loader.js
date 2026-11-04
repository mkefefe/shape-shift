import {markStartup} from './experience-metrics.js';
import {FULL_STARTUP_ASSETS,BACKGROUND_ASSETS,OPENING_ASSETS} from './startup-plan.js?v=494236';
import {prepareMenuImage,awaitReady} from './menu-preload.js?v=494236';
const loaded=new Set(),pending=new Map();
const assetKey=src=>new URL(src,globalThis.document?.baseURI||import.meta.url).href;
async function loadFont(src,fetcher){
 // Fetching a font separately uses a different request mode from @font-face.
 // Ask the font set to load it instead, reusing the stylesheet/preload request.
 if(src.endsWith('/Nunito.ttf')&&globalThis.document?.fonts?.load){
  const faces=await awaitReady(document.fonts.load('900 20px Nunito'),'Game font');
  if(!faces.length)throw Error('Game font unavailable');
  return;
 }
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{const response=await fetcher(src,{signal:controller.signal});if(!response.ok)throw Error('Could not load '+src);await response.arrayBuffer();}finally{clearTimeout(timer);}
}
export async function loadStartupAssets(progress=()=>{},{fetcher=fetch,prepareImage=prepareMenuImage,assets=FULL_STARTUP_ASSETS}={}){
 let cursor=0,complete=0;
 async function worker(){while(cursor<assets.length){
  const src=assets[cursor++];
  const key=assetKey(src);
  if(!loaded.has(key)){
   if(!pending.has(key)){
    const job=Promise.resolve().then(()=>/\.(webp|png|jpe?g|svg|gif)(\?|$)/i.test(src)
     ?prepareImage(src).catch(error=>{throw new Error('Could not decode '+src+': '+error.message);})
     :loadFont(src,fetcher)).then(()=>{loaded.add(key);});
    pending.set(key,job);job.then(()=>pending.delete(key),()=>pending.delete(key));
   }
   await pending.get(key);
  }
  progress(++complete,assets.length);
 }}
 const results=await Promise.allSettled(Array.from({length:4},worker));
 const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
}

// Start only the small first-play set while the player reads welcome screens.
// Failures are retried by the awaited startup barrier; they never count as ready.
export function warmFirstPlayAssets(){return loadStartupAssets().catch(()=>false);}

// These independent prerequisites must overlap. In particular, a platform save
// request must not delay the first image or audio-script request.
export async function prepareBootstrap({initialize=()=>Promise.resolve(),loadAudio,opening=prepareOpeningScreen,warm=warmFirstPlayAssets}={}){
 await Promise.all([initialize(),loadAudio(),opening()]);
 void warm();
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
