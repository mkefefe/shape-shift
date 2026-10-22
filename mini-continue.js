import {requestReward} from './rewarded.js?v=49439-web8';
import {startResultCountdown} from './countdown.js?v=49439-web8';

// Borrow the actual Endless/Adventure dialog, never a second mini-game panel.
export function showSharedContinue({host,description,onWatch,onFinish}){
 const doc=host.document,dialog=doc.getElementById('over-dialog');
 const watch=doc.getElementById('continue-ad'),status=doc.getElementById('ad-status');
 const title=doc.getElementById('record'),hint=dialog.querySelector('.result-home-hint');
 const countdown=doc.getElementById('result-return-countdown'),next=doc.getElementById('adventure-continue');
 const oldClass=dialog.className;
 const snapshots=[watch,status,title,hint,countdown,next].map(node=>({node,text:node===watch?null:node.textContent,hidden:node.hidden,disabled:node.disabled}));
 let busy=false,ready=false,closed=false;
 dialog.classList.remove('adventure-results','victory-result','victory-arriving');dialog.classList.add('continue-offer');
 title.textContent='KEEP GOING?';watch.hidden=false;watch.disabled=!host.ShapeShiftAds;next.hidden=true;
 status.textContent=host.ShapeShiftAds?description:'Continue is available in the Android app.';
 hint.textContent='';countdown.hidden=false;
 const cancelTimer=startResultCountdown(n=>countdown.textContent=String(n),()=>{ready=true;countdown.hidden=true;hint.textContent='Tap anywhere else to finish your run.';},{visible:()=>!window.ShapeShiftPlatform.paused&&dialog.open&&!busy});
 function click(e){e.stopImmediatePropagation();e.preventDefault();if(busy)return;if(watch.contains(e.target)){if(!watch.disabled){host.gameAudio?.ui('click');onWatch();}}else if(ready){host.gameAudio?.ui('click');onFinish();}}
 function cancel(e){e.stopImmediatePropagation();e.preventDefault();if(ready&&!busy)onFinish();}
 dialog.addEventListener('click',click,true);dialog.addEventListener('cancel',cancel,true);
 if(!dialog.open)dialog.showModal();title.focus({preventScroll:true});host.gameAudio?.ui('over');
 return {pending(){busy=true;watch.disabled=true;status.textContent='Loading rewarded ad…';host.gameAudio?.pause();},
 failed(outcome){busy=false;ready=true;countdown.hidden=true;watch.disabled=!host.ShapeShiftAds;hint.textContent='Tap anywhere else to finish your run.';status.textContent=outcome==='unsupported'?'Open the Android app to watch a rewarded ad.':outcome==='dismissed'?'Ad closed before the reward. Your score is safe.':'No ad available right now. Try again shortly.';host.gameAudio?.resume?.();},
 close(){if(closed)return;closed=true;cancelTimer();dialog.removeEventListener('click',click,true);dialog.removeEventListener('cancel',cancel,true);if(dialog.open)dialog.close();dialog.className=oldClass;for(const s of snapshots){s.node.hidden=s.hidden;if(s.text!==null)s.node.textContent=s.text;if(s.disabled!==undefined)s.node.disabled=s.disabled;}host.gameAudio?.resume?.();}};
}

// One earned continue per run. Stale native callbacks cannot revive a new game.
export function createMiniContinue({host=window,request=()=>requestReward(host,120000,'continue'),show=showSharedContinue}={}){
 let used=false,offered=false,busy=false,generation=0,view=null;
 return {reset(){generation++;view?.close();view=null;used=false;offered=false;busy=false;},
 offer({description,resume,finish}){
  if(!host.ShapeShiftPlatform.live)return false;if(used)return false;if(offered)return true;offered=true;const token=generation;
  view=show({host,description,onWatch:async()=>{
   if(busy||token!==generation)return;busy=true;view.pending();
   let outcome;try{outcome=await request();}catch{outcome='failed';}
   if(token!==generation)return;busy=false;
   if(outcome==='rewarded'){used=true;offered=false;view.close();view=null;resume();return;}
   view.failed(outcome);
  },onFinish:()=>{if(busy||token!==generation)return;used=true;offered=false;view.close();view=null;finish();}});
  return true;
 }};
}
