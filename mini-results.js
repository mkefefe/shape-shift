import {revealAdventureRewards} from './adventure-rewards.js?v=494240';
import {formatSurvivalTime} from './survival-clock.js?v=494240';
import {playerProgress} from './economy.js?v=494240';
import {startResultTally} from './countdown.js?v=494240';

// All modes share the same results DOM, artwork, buttons and XP progress track.
export function createMiniResults({host=window}={}){
 let cleanup=null;
 return {reset(){cleanup?.();cleanup=null;},show({title='RUN COMPLETE',score,best,coins,elapsed=0,xpBefore,xpAfter,stored=true,pending=false,retry,restart,finish,adventureMarkup='',nextLabel='Continue',beforeLeave=()=>true,saveError=''}){
  cleanup?.();
  const doc=host.document,d=doc.getElementById('over-dialog'),get=id=>doc.getElementById(id);
  const ids=['record','final-score','final-coins','result-progress','result-xp-label','final-best','ad-status','result-return-countdown','result-survival','adventure-result','adventure-continue','continue-ad','level-progress'];
  const nodes=ids.map(get),hint=d.querySelector('.result-home-hint'),bestLine=d.querySelector('.best-line'),watch=get('continue-ad'),next=get('adventure-continue');
  const snapshots=[...nodes,hint,bestLine].map(node=>({node,hidden:node.hidden,disabled:node.disabled}));
  const oldResultMode=d.dataset.resultMode;d.dataset.resultMode='mini';
  const oldClass=d.className,oldButton=watch.querySelector('strong').textContent,oldNext=next.textContent,oldBest=bestLine.firstChild.textContent,oldHint=hint.textContent;
  d.classList.remove('clear-results','continue-offer','adventure-results','victory-result','victory-arriving');
  get('record').textContent=title;get('adventure-result').hidden=true;get('result-survival').hidden=false;get('result-survival').textContent='Survived '+formatSurvivalTime(elapsed);get('result-return-countdown').hidden=true;
  bestLine.hidden=false;bestLine.firstChild.textContent='Best score ';get('final-best').textContent=best.toLocaleString();
  watch.hidden=true;watch.disabled=false;
  next.hidden=false;next.disabled=false;next.textContent=stored&&!saveError?'Continue':'Save results';
  if(adventureMarkup){get('adventure-result').hidden=false;get('adventure-result').classList.remove('rewards-revealed','rewards-settled');get('adventure-result').innerHTML=adventureMarkup;d.classList.add('adventure-results');}
  hint.hidden=false;hint.textContent=stored?'Tap anywhere else':'Tap Save results to save your run.';
  get('ad-status').textContent=saveError||(!stored?'Could not save this run. Free some storage and retry.':pending?'Reward saved. Wallet sync will retry.':'');
  get('result-xp-bar').classList.remove('xp-level-up');
  function update(a,b,t){get('final-score').textContent=a.toLocaleString();get('final-coins').textContent='+'+b.toLocaleString();const p=playerProgress(xpBefore+Math.floor(Math.max(0,xpAfter-xpBefore)*t));get('result-progress').textContent='Level '+p.level;get('level-progress').max=p.required||1;get('level-progress').value=p.capped?1:p.current;get('result-xp-label').textContent=p.capped?'MAX LEVEL':p.current+' / '+p.required+' XP';get('level-progress').setAttribute('aria-label','Level '+p.level+': '+get('result-xp-label').textContent);}
  let cancelStars=null;
  const cancelTally=startResultTally(score,coins,update,cue=>host.gameAudio?.ui(cue),{visible:()=>!window.ShapeShiftPlatform.paused&&d.open,reduced:doc.body.classList.contains('reduce-motion')});
  let leaving=false;
  function leave(fn){
   if(leaving)return;if(beforeLeave()===false){get('ad-status').textContent=saveError||'Adventure progress could not be saved. Free some storage and retry.';next.textContent='Save results';return;}leaving=true;next.disabled=true;host.gameAudio?.ui('click');
   const ownedCleanup=cleanup;
   const recover=()=>{leaving=false;next.disabled=false;get('ad-status').textContent='Could not open the next screen. Please try again.';if(!d.open)d.showModal();};
   const complete=ok=>{if(ok===false){recover();return;}if(cleanup===ownedCleanup){cleanup=null;ownedCleanup?.();}};
   try{const pending=fn();if(pending&&typeof pending.then==='function')pending.then(complete,recover);else complete(pending);}catch{recover();}
  }
  function click(e){e.stopImmediatePropagation();e.preventDefault();if(next.contains(e.target))leave(stored?finish:retry);else if(stored)leave(finish);}
  function leaveMode(){if(stored)leave(finish);}
  d.addEventListener('restoration:leave-mode',leaveMode);
  function cancel(e){e.stopImmediatePropagation();e.preventDefault();if(stored)leave(finish);}
  d.addEventListener('click',click,true);d.addEventListener('cancel',cancel,true);
  cleanup=()=>{d.removeEventListener('restoration:leave-mode',leaveMode);if(oldResultMode===undefined)delete d.dataset.resultMode;else d.dataset.resultMode=oldResultMode;cancelStars?.();cancelTally();d.removeEventListener('click',click,true);d.removeEventListener('cancel',cancel,true);if(d.open)d.close();d.className=oldClass;hint.textContent=oldHint;watch.querySelector('strong').textContent=oldButton;next.textContent=oldNext;bestLine.firstChild.textContent=oldBest;for(const s of snapshots){s.node.hidden=s.hidden;if(s.disabled!==undefined)s.node.disabled=s.disabled;}};
  if(!d.open)d.showModal();d.querySelector('.result-content').scrollTop=0;get('record').focus({preventScroll:true});if(adventureMarkup)cancelStars=revealAdventureRewards(get('adventure-result'),cue=>host.gameAudio?.ui(cue),()=>{});
 }};
}
