import {playerProgress} from './economy.js?v=49439-web8';
// Presentation only: saved stars, currency and XP are awarded by the game.
export function rewardMarkup(objectives,lightning=false){return '<div class="reward-star-slots" aria-label="Level stars">'+[0,1,2].map(()=>'<span class="reward-star" aria-label="Empty star"></span>').join('')+'</div><ul class="reward-objectives">'+objectives.map(o=>'<li data-earned="'+!!o.done+'"><i></i><span>'+o.label+'</span></li>').join('')+'</ul>';}
export function rewardSteps(completed){let time=120,slot=0;return completed.map((earned,row)=>{const step={row,earned,slot:earned?slot++:null,start:time,flight:time+350,land:time+750,end:time+(earned?900:420)};time=step.end;return step;});}
export function revealAdventureRewards(root,cue,done,{visible=()=>!window.ShapeShiftPlatform.paused,raf=window.ShapeShiftPlatform.requestAnimationFrame,caf=window.ShapeShiftPlatform.cancelAnimationFrame,now=()=>window.ShapeShiftPlatform.now()}={}){
 const rows=[...root.querySelectorAll('li')],slots=[...root.querySelectorAll('.reward-star')],steps=rewardSteps(rows.map(r=>r.dataset.earned==='true'));let elapsed=0,last=now(),frame,stopped=false,flying=null,settled=false;
 const finish=steps.at(-1)?.end??120;
 const panel=root.closest?.('dialog')||root;
 function detach(){panel.removeEventListener?.('click',skip,true);panel.removeEventListener?.('keydown',key,true);}
 function settle(){if(stopped)return;stopped=true;caf(frame);flying?.remove();detach();root.classList.add('rewards-revealed','rewards-settled');for(const step of steps){if(step.earned){slots[step.slot].classList.add('earned');slots[step.slot].setAttribute('aria-label','Earned star');}rows[step.row].classList.add(step.earned?'reward-converted':'reward-failed');}done();}
 function skip(e){if(stopped)return;e.preventDefault();e.stopImmediatePropagation();settle();}
 function key(e){if(e.key==='Enter'||e.key===' ')skip(e);}
 panel.addEventListener?.('click',skip,true);panel.addEventListener?.('keydown',key,true);
 function tick(t){if(stopped)return;const delta=Math.min(80,Math.max(0,t-last));last=t;if(visible())elapsed+=delta;
  for(const step of steps){const row=rows[step.row],slot=slots[step.slot];
   if(!step.earned){if(elapsed>=step.start&&!step.started){step.started=true;row.classList?.add('reward-failed');}continue;}
   if(elapsed>=step.start&&!step.started){step.started=true;row.classList.add('reward-charging');cue('objective-fill');}
   if(step.started&&!step.launched){const p=Math.min(1,(elapsed-step.start)/300);row.style.setProperty('--fill',p);row.style.setProperty('--shine',Math.max(-100,Math.min(220,(elapsed-step.start-200)*1.2))+'%');}
   if(elapsed>=step.flight&&!step.launched){step.launched=true;cue('star-flight');row.classList.add('reward-converted');flying=document.createElement('span');flying.className='reward-star earned flying-reward-star';root.append(flying);const a=row.getBoundingClientRect(),b=slot.getBoundingClientRect(),r=root.getBoundingClientRect();step.from={x:a.left+a.width/2-r.left-30,y:a.top+a.height/2-r.top-30};step.to={x:b.left-r.left,y:b.top-r.top};}
   if(step.launched&&!step.landed){const p=Math.min(1,(elapsed-step.flight)/400),e=1-(1-p)**2,x=step.from.x+(step.to.x-step.from.x)*e,y=step.from.y+(step.to.y-step.from.y)*e-Math.sin(p*Math.PI)*32;flying.style.transform=`translate(${x}px,${y}px) scale(${.55+Math.sin(p*Math.PI)*.65+p*.45}) rotate(${Math.sin(p*Math.PI)*12}deg)`;flying.style.opacity=Math.min(1,p*8);}
   if(elapsed>=step.land&&!step.landed){step.landed=true;flying?.remove();flying=null;slot.classList.add('earned','star-landed');slot.setAttribute('aria-label','Earned star');cue('star-land-'+(step.slot+1));}
  }
  if(elapsed>=finish&&!settled){settled=true;root.classList.add("rewards-revealed");}
  if(elapsed>=finish+220){settle();return;}frame=raf(tick);
 }
 frame=raf(tick);return ()=>{stopped=true;caf(frame);flying?.remove();detach();};
}

export function resultXpState(start,end,progress){
 const gained=Math.round(Math.max(0,end-start)*Math.max(0,Math.min(1,progress)));
 const total=start+gained;
 const {level,current,required}=playerProgress(total);
 return {gained,level,current,required};
}
