import {formatSurvivalTime} from './survival-clock.js?v=49439-web7';
import {playerProgress} from './economy.js?v=49439-web7';
import {startResultTally} from './countdown.js?v=49439-web7';

// All modes share the same results DOM, artwork, buttons and XP progress track.
export function createMiniResults({host=window}={}){
 let cleanup=null;
 return {reset(){cleanup?.();cleanup=null;},show({title='RUN COMPLETE',score,best,coins,elapsed=0,xpBefore,xpAfter,stored=true,pending=false,retry,finish}){
  cleanup?.();
  const doc=host.document,d=doc.getElementById('over-dialog'),get=id=>doc.getElementById(id);
  const ids=['record','final-score','final-coins','result-progress','result-xp-label','final-best','ad-status','result-return-countdown','result-survival','adventure-result','adventure-continue','continue-ad','level-progress'];
  const nodes=ids.map(get),hint=d.querySelector('.result-home-hint'),bestLine=d.querySelector('.best-line'),watch=get('continue-ad'),next=get('adventure-continue');
  const snapshots=[...nodes,hint,bestLine].map(node=>({node,hidden:node.hidden,disabled:node.disabled}));
  const oldClass=d.className,oldButton=watch.querySelector('strong').textContent,oldNext=next.textContent,oldBest=bestLine.firstChild.textContent,oldHint=hint.textContent;
  d.classList.remove('continue-offer','adventure-results','victory-result','victory-arriving');
  get('record').textContent=title;get('adventure-result').hidden=true;get('result-survival').hidden=false;get('result-survival').textContent='Survived '+formatSurvivalTime(elapsed);get('result-return-countdown').hidden=true;
  bestLine.hidden=false;bestLine.firstChild.textContent='Best score ';get('final-best').textContent=best.toLocaleString();
  watch.hidden=false;watch.disabled=false;watch.querySelector('strong').textContent=stored?'Continue':'Retry saving';
  next.hidden=true;next.disabled=false;
  hint.hidden=false;hint.textContent=stored?'Tap anywhere to continue':'Tap Retry saving to save your run.';
  get('ad-status').textContent=!stored?'Could not save this run. Free some storage and retry.':pending?'Reward saved. Wallet sync will retry.':'';
  get('result-xp-bar').classList.remove('xp-level-up');
  function update(a,b,t){get('final-score').textContent=a.toLocaleString();get('final-coins').textContent='+'+b.toLocaleString();const p=playerProgress(xpBefore+Math.floor(Math.max(0,xpAfter-xpBefore)*t));get('result-progress').textContent='Level '+p.level;get('level-progress').max=p.required||1;get('level-progress').value=p.capped?1:p.current;get('result-xp-label').textContent=p.capped?'MAX LEVEL':p.current+' / '+p.required+' XP';get('level-progress').setAttribute('aria-label','Level '+p.level+': '+get('result-xp-label').textContent);}
  const cancelTally=startResultTally(score,coins,update,cue=>host.gameAudio?.ui(cue),{visible:()=>!window.ShapeShiftPlatform.paused&&d.open,reduced:doc.body.classList.contains('reduce-motion')});
  function leave(fn){cleanup?.();cleanup=null;host.gameAudio?.ui('click');fn();}
  function click(e){e.stopImmediatePropagation();e.preventDefault();if(watch.contains(e.target))leave(stored?finish:retry);else if(stored)leave(finish);}
  function cancel(e){e.stopImmediatePropagation();e.preventDefault();if(stored)leave(finish);}
  d.addEventListener('click',click,true);d.addEventListener('cancel',cancel,true);
  cleanup=()=>{cancelTally();d.removeEventListener('click',click,true);d.removeEventListener('cancel',cancel,true);if(d.open)d.close();d.className=oldClass;hint.textContent=oldHint;watch.querySelector('strong').textContent=oldButton;next.textContent=oldNext;bestLine.firstChild.textContent=oldBest;for(const s of snapshots){s.node.hidden=s.hidden;if(s.disabled!==undefined)s.node.disabled=s.disabled;}};
  if(!d.open)d.showModal();d.querySelector('.result-content').scrollTop=0;get('record').focus({preventScroll:true});
 }};
}
