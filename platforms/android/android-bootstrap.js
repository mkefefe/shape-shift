import {startWelcomeMusic} from './welcome-audio.js?v=494241';
import {prepareBootstrap} from './startup-loader.js?v=494241';
document.documentElement.dataset.nativeAds=typeof window.ShapeShiftAds?.showRewarded==='function'?'true':'false';
// Use shared GitHub gameplay with the existing Android storage and native bridges.
import {createScheduler} from './playables-core.mjs';
import {observeDeferredImages} from './deferred-images.js';
const scheduler=createScheduler(window);
const media=new Set();
window.ShapeShiftPlatform={...scheduler,storage:localStorage,live:false,language:navigator.language||'en',
 get paused(){return scheduler.paused;},get audioAllowed(){return !scheduler.paused;},
 registerMedia(element){media.add(element);return ()=>media.delete(element);},
 ready(){document.documentElement.dataset.mobileReady='true';},flush:async()=>{},
};
function pause(){scheduler.pause();window.gameAudio?.platformAudioChanged?.();for(const m of media)m.muted=true;}
function resume(){if(document.hidden)return;scheduler.resume();window.gameAudio?.platformAudioChanged?.();for(const m of media)m.muted=false;}
window.addEventListener('androidpause',pause);
window.addEventListener('androidresume',resume);
document.addEventListener('visibilitychange',()=>document.hidden?pause():resume());
const loadScript=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.append(s);});
async function start(){
 const cover=document.getElementById('startup-ready');
 try{
  observeDeferredImages();
  // Required opening art and the audio script download together.
  await prepareBootstrap({loadAudio:()=>loadScript('audio.js?v=494241')});
  startWelcomeMusic();
  // First-install privacy prompts must remain visible before the loading gate.
  document.documentElement.classList.remove('startup-loading');cover.hidden=true;
  const {ensureTerms}=await import('./terms.js?v=494241');const {ensureAudience}=await import('./audience.js?v=494241');
  await ensureTerms();await ensureAudience();
  cover.hidden=false;document.documentElement.classList.add('startup-loading');
  await import('./game.js?ui277');
 }catch(error){
  console.error('Android game startup failed',error);
  cover.hidden=false;cover.querySelector('p').textContent='Could not load the game. Please try again.';
  const retry=cover.querySelector('button');retry.hidden=false;retry.onclick=()=>location.reload();
 }
}
start();