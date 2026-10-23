import {STORY_KEY,STORY_MILESTONES,migrateStory,recordStoryClear,markStorySeen,storySummary} from './story-progress.js?v=49439-web12';

export const CHARGE_KEY='shape-shift-beacon-charges-v1';
export function createBeaconController({storage,adventure,admin=false,adminBackup=null,showScene,settings=()=>({}),beforeScene=()=>{},afterScene=()=>{},changed=()=>{}}){
 const read=key=>{try{return JSON.parse(storage.getItem(key));}catch{return null;}};
 let state=migrateStory(read(STORY_KEY),adventure,{admin,adminBackup});
 const saved=read(CHARGE_KEY),earned=()=>STORY_MILESTONES.filter(m=>m.level<=storySummary(state).frontier);
 // Existing players retain already-restored districts. New clears award charges.
 const previous=Array.isArray(saved?.spent)?saved.spent:state.seen;
 let spent=earned().filter(m=>previous.includes(m.id)).map(m=>m.id),busy=false,current=null,notice=false;
 function summary(){
  const progress=storySummary(state),available=earned().filter(m=>!spent.includes(m.id));
  const restored=STORY_MILESTONES.filter(m=>spent.includes(m.id));
  return {...progress,complete:spent.includes('ending'),availableCharges:available.length,ready:available[0]||null,
   restoredPercent:restored.at(-1)?.level||0,freeSpark:!state.seen.includes('intro')};
 }
 function persist(){
  try{storage.setItem(STORY_KEY,JSON.stringify(state));storage.setItem(CHARGE_KEY,JSON.stringify({version:1,spent}));}catch{}
  changed();
 }
 persist();
 async function play(id,{spend=false}={}){
  if(busy)return {completed:false,busy:true};
  busy=true;let outcome={completed:false};
  try{
   beforeScene();current=showScene({scene:id,...settings()});outcome=await current||outcome;
   if(outcome.completed){
    state=markStorySeen(state,id);
    if(spend&&!spent.includes(id))spent.push(id);
    persist();
   }
  }catch{outcome={completed:false,failed:true};}
  finally{current=null;busy=false;try{afterScene();}catch{}changed();}
  return outcome;
 }
 return {
  summary,snapshot:()=>JSON.parse(JSON.stringify(state)),isPlaying:()=>busy,
  charge(){const s=summary();return s.ready?play(s.ready.id,{spend:true}):s.freeSpark?play('intro'):Promise.resolve({completed:false,unavailable:true});},
  record(entry){const result=recordStoryClear(state,entry);state=result.state;if(result.scene)notice=true;if(result.added)persist();return result;},
  takeMilestoneNotice(){const ready=notice&&summary().availableCharges>0;notice=false;return ready;},
  beforeAdventure:async()=>{},onFirstOpen:async()=>{},afterResults:async()=>{},
  replayCredits:()=>summary().complete?play('credits'):Promise.resolve({completed:false}),
  cancel:()=>current?.cancel?.()
 };
}

import {showStoryScene} from './story-scene.js?v=49439-web12';
import {loadStoryAssets,drawStoryIsland} from './story-renderer.js?v=49439-web12';

export function initStoryUI({document,storage,adventure,admin,adminBackup,settings,beforeScene,afterScene,sound=()=>{}}){
 const header=document.querySelector('#adventure-map .map-header');
 const button=document.createElement('button');button.id='story-map-open';button.type='button';
 button.innerHTML='<span class="story-map-label">Color Beacon <strong></strong></span><span class="story-map-next"></span><span class="story-map-action">Charge</span>';
 header.append(button);
 const dialog=document.createElement('dialog');dialog.id='story-library';dialog.setAttribute('aria-labelledby','story-library-title');
 dialog.innerHTML='<button class="close" aria-label="Close Color Beacon"><img src="assets/close-v45.webp" alt=""></button><div class="dialog-content"><h2 id="story-library-title">Color Beacon</h2><canvas class="story-library-art" width="400" height="400" role="img" aria-label="Your restored island"></canvas><p class="beacon-charge-count" aria-live="polite"></p><div class="story-library-scenes"><button class="primary" id="beacon-charge">Charge the Beacon</button><button class="primary" id="beacon-credits" hidden>Watch credits</button></div><p class="story-library-next"></p><p class="beacon-status" role="status"></p></div>';
 document.body.append(dialog);
 let controller,art,artLoading;
 const action=dialog.querySelector('#beacon-charge'),credits=dialog.querySelector('#beacon-credits');
 function paintIsland(){
  const s=controller.summary(),canvas=dialog.querySelector('canvas');canvas.setAttribute('aria-label',s.restoredPercent+'% of your island restored');
  if(art){drawStoryIsland(canvas.getContext('2d'),art,s.restoredPercent);return;}
  if(!artLoading)artLoading=loadStoryAssets().then(value=>{art=value;if(dialog.open)paintIsland();}).catch(()=>{artLoading=null;});
 }
 function refresh(){
  if(!controller)return;const s=controller.summary();
  button.querySelector('strong').textContent=s.percent+'%';
  button.querySelector('.story-map-action').textContent=s.complete?'Full':'Charge';
  button.querySelector('.story-map-next').textContent=s.ready?s.availableCharges+' charge'+(s.availableCharges===1?'':'s')+' ready · '+s.ready.title:s.complete?'Your island is full of color':'Next charge · Level '+s.next.level;
  button.setAttribute('aria-label','Color Beacon '+s.percent+' percent. '+button.querySelector('.story-map-next').textContent+'. Open charging.');
  dialog.querySelector('.beacon-charge-count').textContent=s.availableCharges+' charge'+(s.availableCharges===1?'':'s')+' available · '+s.restoredPercent+'% restored';
  action.disabled=controller.isPlaying();action.setAttribute('aria-disabled',String(!s.ready&&!s.freeSpark));action.hidden=s.complete;
  action.textContent='Charge the Beacon';credits.hidden=!s.complete;
  dialog.querySelector('.story-library-next').textContent=s.ready?'Use 1 charge to restore color':s.complete?'Island fully restored':s.freeSpark?'Free spark available':'Next charge: Level '+s.next.level;
  if(dialog.open)paintIsland();
 }
 const open=()=>{refresh();dialog.querySelector('.beacon-status').textContent='';if(!dialog.open)dialog.showModal();paintIsland();};
 controller=createBeaconController({storage,adventure,admin,adminBackup,settings,beforeScene,afterScene,changed:refresh,showScene:options=>showStoryScene({document,...options})});
 button.onclick=()=>{sound('click');open();};
 action.onclick=async()=>{
  if(action.disabled||controller.isPlaying())return;
  sound('click');const current=controller.summary();
  if(!current.ready&&!current.freeSpark){
   const message=current.next?'Locked — complete Level '+current.next.level+' to charge the Beacon.':'The Beacon is fully charged.';
   dialog.querySelector('.ability-lock-notice')?.remove();
   const notice=document.createElement('p');notice.className='ability-lock-notice';notice.setAttribute('role','status');notice.textContent=message;dialog.append(notice);
   notice.addEventListener('animationend',()=>notice.remove(),{once:true});
   return;
  }
  action.disabled=true;dialog.close();
  const outcome=await controller.charge();
  if(outcome.failed){open();dialog.querySelector('.beacon-status').textContent='Could not load. Charge saved—try again.';}
 };
 credits.onclick=async()=>{dialog.close();await controller.replayCredits();};
 dialog.addEventListener('close',()=>dialog.querySelector('.ability-lock-notice')?.remove());
 dialog.querySelector('.close').onclick=()=>{sound('close');dialog.close();};
 refresh();
 return {...controller,refresh,afterResults:async()=>{if(controller.takeMilestoneNotice())open();}};
}
