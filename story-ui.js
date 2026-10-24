import {createBeaconController} from './beacon-controller.js?v=49456';
export {CHARGE_KEY,createBeaconController} from './beacon-controller.js?v=49456';
import {showStoryScene} from './story-scene.js?v=49456';
import {loadStoryAssets,drawStoryIsland} from './story-renderer.js?v=49456';

export function initStoryUI({document,storage,adventure,admin,adminBackup,settings,beforeScene,afterScene,sound=()=>{}}){
 const header=document.querySelector('#adventure-map .map-header');
 const button=document.createElement('button');button.id='story-map-open';button.type='button';
 button.innerHTML='<span class="story-map-label">Color Beacon</span><span class="story-map-next"></span><span class="story-map-action" aria-hidden="true">›</span>';
 header.append(button);
 const dialog=document.createElement('dialog');dialog.id='story-library';dialog.setAttribute('aria-labelledby','story-library-title');
 dialog.innerHTML='<button class="close" aria-label="Close Color Beacon"><img src="assets/close-v45.webp" alt=""></button><div class="dialog-content"><h2 id="story-library-title">Color Beacon</h2><canvas class="story-library-art" width="400" height="400" role="img" aria-label="Your island"></canvas><p class="story-library-next" aria-live="polite"></p><div class="story-library-scenes"><button class="primary" id="beacon-charge">Restore the island</button><button class="primary" id="beacon-credits" hidden>Watch credits</button></div><p class="beacon-status" role="status"></p></div>';
 document.body.append(dialog);
 let controller,art,artLoading;
 const action=dialog.querySelector('#beacon-charge'),credits=dialog.querySelector('#beacon-credits');
 function paintIsland(){
  const s=controller.summary(),canvas=dialog.querySelector('canvas');
  canvas.setAttribute('aria-label',s.complete?'Your island, fully restored to color':'Your island, waiting for color');
  if(art){drawStoryIsland(canvas.getContext('2d'),art,s.complete?100:0);return;}
  if(!artLoading)artLoading=loadStoryAssets().then(value=>{art=value;if(dialog.open)paintIsland();}).catch(()=>{artLoading=null;});
 }
 function refresh(){
  if(!controller)return;const s=controller.summary();
  const label=s.complete?'Island restored':s.ready?'Ready to restore':'Adventure finale · Level 100';
  button.querySelector('.story-map-next').textContent=label;
  button.setAttribute('aria-label','Color Beacon. '+label+'.');
  button.dataset.ready=String(Boolean(s.ready));
  action.disabled=controller.isPlaying()||!s.ready;action.hidden=!s.ready;
  credits.hidden=!s.complete;credits.disabled=controller.isPlaying();
  dialog.querySelector('.story-library-next').textContent=s.complete?'You brought color home.':s.ready?'Your adventure is complete. Bring color home.':'Complete all 100 Adventure levels to restore the island.';
  if(dialog.open)paintIsland();
 }
 const open=()=>{
  refresh();dialog.querySelector('.beacon-status').textContent='';if(!dialog.open)dialog.showModal();paintIsland();
  if(controller.summary().ready)action.focus({preventScroll:true});
 };
 controller=createBeaconController({storage,adventure,admin,adminBackup,settings,beforeScene,afterScene,changed:refresh,showScene:options=>showStoryScene({document,...options})});
 button.onclick=()=>{sound('click');open();};
 action.onclick=async()=>{
  if(action.disabled||controller.isPlaying())return;action.disabled=true;sound('click');dialog.close();
  const outcome=await controller.charge();
  if(outcome.failed){open();dialog.querySelector('.beacon-status').textContent='Could not load the finale. You can try again.';}
 };
 credits.onclick=async()=>{
  if(controller.isPlaying())return;dialog.close();const outcome=await controller.replayCredits();
  if(outcome.failed){open();dialog.querySelector('.beacon-status').textContent='Could not load the credits. Please try again.';}
 };
 dialog.querySelector('.close').onclick=()=>{sound('close');dialog.close();};
 refresh();
 return {...controller,refresh,afterResults:async()=>{if(controller.takeMilestoneNotice())open();}};
}
