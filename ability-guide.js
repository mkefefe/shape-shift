import {prepareMenuImage} from './menu-preload.js?v=49482';
export const BOOST_LESSONS={
 shield:['Shield','Blocks one mistake. Wait 5 completed turns before another shield equips automatically. Tap again to stop.'],
 freeze:['Double Time','Tap for twice as much time for 5 rounds. Combines with Time Crystal for 4x time. Uses another when it ends. Tap again to stop only this boost.'],
 boost:['5x Multiplier','Tap for 5 times the points and coins for 5 rounds. Uses another when it ends. Tap again to stop.']
};
const BOOST_SHORTCUTS={shield:'1',freeze:'2',boost:'3'};
export function guideActivationKey(event,shortcut=''){
 if(event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey||event.isComposing)return false;
 return event.key==='Enter'||event.key===' '||!!shortcut&&(event.code==='Digit'+shortcut||event.code==='Numpad'+shortcut);
}
export const SPECIAL_LESSONS={
 bomb:['Bomb','Tap to clear nearby choices and earn points.'],
 starburst:['Starburst','Tap Starburst to collect every visible shape and earn points and coins. Covered memory cards stay.'],
 reset:['Rewind','Tap to go back to one box. Keep your points.'],
 heart:['Heart Refill','Tap to fill your hearts. At full health, collect points instead.'],
 hourglass:['Time Crystal','Tap Time Crystal for twice as much time for 3 rounds. It ends automatically and cannot be toggled off. Use Double Time too for 4x time.'],
 crystal:['Shield Crystal','Tap Shield Crystal to block one mistake without losing a heart.']
};
// Only a real, uncollected lesson may pause the game loop.
export const nextSpecialLesson=(board,seen)=>board.findIndex(t=>!t.collected&&!!SPECIAL_LESSONS[t.special]&&!seen(t.special));
let open=false;
export const abilityGuideOpen=()=>open;
export function showBoardGuide(target,lesson,onTap,options={}){
 if(open||!target?.isConnected)return;open=true;
 let phase='intro',noticeTimer,advanceTimer,advancing=false,ignoreClickUntil=0;
 const previousFocus=document.activeElement;
 const focus=options.focus?.isConnected?options.focus:target;
 const layer=document.createElement('div');layer.id='board-guide';layer.dataset.phase=phase;
 const hand=document.createElement('img');hand.src='assets/ability-hand-v169.webp';hand.alt='';hand.className='board-guide-hand';
 const copy=document.createElement('div');copy.className='board-guide-copy';copy.setAttribute('role','status');
 const message=document.createElement('p');message.textContent=lesson[1]+(options.shortcut?' Shortcut: '+options.shortcut+'.':'');
 const next=document.createElement('button');next.className='primary board-guide-continue';next.textContent='Continue';
 const title=document.createElement('strong');title.className='board-guide-title';title.textContent=lesson[0];copy.append(title,message,next);layer.append(copy,hand);document.body.append(layer);focus.classList.add('live-guide-focus');
 const position=()=>{
  const active=phase==='intro'?focus:target,r=active.getBoundingClientRect();
  const meter=phase==='intro'&&focus.id==='color-change-cue';
  hand.classList.toggle('board-guide-hand-meter',meter);
  hand.style.left=Math.max(0,Math.min(innerWidth-74,r.left+r.width/2-65))+'px';
  hand.style.top=Math.max(0,r.top+r.height/2-62)+'px';
  if(meter){hand.style.left=(r.left+r.width/2-67)+'px';hand.style.top=(r.bottom+3-62)+'px';}
  if(copy.hidden)return;
  // Reserve the real card, intro focus and the hand, including its tap motion.
  // Pick a free vertical band instead of covering a fixed part of the board.
  copy.style.width='';copy.style.maxHeight='';
  const reserved=[r,target.getBoundingClientRect(),hand.getBoundingClientRect()];
  const bands=()=>{
   const panel=copy.getBoundingClientRect();let free=[[12,innerHeight-12]];
   for(const rect of reserved){
    if(rect.right+12<panel.left||rect.left-12>panel.right)continue;
    const top=rect.top-16,bottom=rect.bottom+16;
    free=free.flatMap(([a,b])=>bottom<=a||top>=b?[[a,b]]:[[a,Math.min(b,top)],[Math.max(a,bottom),b]].filter(([a,b])=>b>a));
   }
   return free.sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]));
  };
  let free=bands();
  if(free[0]&&free[0][1]-free[0][0]<copy.offsetHeight){copy.style.width='min(360px, calc(100vw - 24px))';free=bands();}
  const [top,bottom]=free[0]||[12,innerHeight-12];
  copy.style.maxHeight=Math.max(0,bottom-top)+'px';
  const y=top>=r.bottom?top:bottom<=r.top?bottom-copy.offsetHeight:top;
  copy.style.top=Math.max(top,y)+'px';
 };
 const observer=new ResizeObserver(position);observer.observe(target);observer.observe(copy);

 const cleanup=()=>{open=false;window.ShapeShiftPlatform.clearTimeout(noticeTimer);window.ShapeShiftPlatform.clearTimeout(advanceTimer);observer.disconnect();layer.remove();focus.classList.remove('live-guide-focus');target.classList.remove('live-guide-target');window.removeEventListener('resize',position);document.removeEventListener('pointerdown',pointer,true);document.removeEventListener('click',click,true);document.removeEventListener('keydown',keys,true);if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});};
 const advance=()=>{if(advancing)return;advancing=true;next.classList.add('input-pressed');window.gameAudio?.ui('click');advanceTimer=window.ShapeShiftPlatform.setTimeout(()=>{phase='practice';layer.dataset.phase=phase;copy.hidden=true;focus.classList.remove('live-guide-focus');target.classList.add('live-guide-target');position();target.focus({preventScroll:true});},120);};
 const wrong=()=>{if(phase!=='practice')return;message.textContent=options.wrong||'Tap the glowing card.';next.hidden=true;copy.hidden=false;position();window.ShapeShiftPlatform.clearTimeout(noticeTimer);noticeTimer=window.ShapeShiftPlatform.setTimeout(()=>{copy.hidden=true;},1600);};
 const activate=()=>{cleanup();onTap();};
 const handle=element=>{if(phase==='intro'){if(next.contains(element))advance();}else if(target.contains(element))activate();else wrong();};
 const pointer=e=>{e.preventDefault();e.stopImmediatePropagation();if(!e.isPrimary||e.button!==0)return;ignoreClickUntil=window.ShapeShiftPlatform.now()+600;handle(e.target);const swallow=event=>{event.preventDefault();event.stopImmediatePropagation();};document.addEventListener('click',swallow,{capture:true,once:true});window.ShapeShiftPlatform.setTimeout(()=>document.removeEventListener('click',swallow,true),500);};
 const click=e=>{e.preventDefault();e.stopImmediatePropagation();if(window.ShapeShiftPlatform.now()>=ignoreClickUntil)handle(e.target);};
 const keys=e=>{e.preventDefault();e.stopImmediatePropagation();if(guideActivationKey(e,options.shortcut)){if(phase==='intro')advance();else activate();}};
 document.addEventListener('pointerdown',pointer,true);document.addEventListener('click',click,true);document.addEventListener('keydown',keys,true);window.addEventListener('resize',position);
 next.focus({preventScroll:true});position();
}
export async function showAbilityGuide(target,lesson,onTap){
 if(open||!target||!lesson)return;open=true;
 const specialKey=Object.keys(SPECIAL_LESSONS).find(key=>SPECIAL_LESSONS[key][0]===lesson[0]);
 const boostKey=Object.keys(BOOST_LESSONS).find(key=>BOOST_LESSONS[key][0]===lesson[0]);
 const abilityImages={freeze:'browser-time-hd1.png',shield:'browser-shield-hd1.png',boost:'browser-boost-hd1.png'};
 const sheet=boostKey?[abilityImages[boostKey],1,0]:specialKey==='bomb'?['assets/slice-bomb-v239.webp',1,0]:specialKey?['assets/specials-v13.webp',5,['starburst','hourglass','crystal','reset','heart'].indexOf(specialKey)]:boostKey==='boost'?['assets/health-boost-v5.webp',2,1]:['assets/abilities-v4.webp',3,boostKey==='shield'?2:0];
 try{
 const art=await prepareMenuImage(sheet[0]);
 target.querySelectorAll('.guide-art-fallback').forEach(label=>label.remove());
 const canvas=document.createElement('canvas');canvas.className='guide-raster-icon';canvas.setAttribute('aria-hidden','true');
 const sw=art.naturalWidth/sheet[1],sh=specialKey&&specialKey!=='bomb'?sw*1.2:art.naturalHeight;canvas.width=Math.round(sw);canvas.height=Math.round(sh);
 canvas.getContext('2d').drawImage(art,sheet[2]*sw,(art.naturalHeight-sh)/2,sw,sh,0,0,canvas.width,canvas.height);
 const slot=target.querySelector('.sprite,.power-art');if(slot){const r=slot.getBoundingClientRect();slot.style.background='none';slot.classList.remove('special-art');canvas.style.cssText='position:static;width:100%;height:100%;object-fit:contain;display:block';const box=target.getBoundingClientRect(),width=r.width||Math.min(box.width*.65,box.height*.65/(sh/sw)),height=r.height||width*sh/sw;slot.style.width=width+'px';slot.style.height=height+'px';slot.replaceChildren(canvas);}
 }catch{target.setAttribute('aria-label',lesson[0]);}
 // The guide already has a visible title; never append a permanent label over its art.
 open=false;
 const shortcut=globalThis.matchMedia?.('(any-hover: hover) and (any-pointer: fine)').matches?BOOST_SHORTCUTS[boostKey]:'';
 if(target.isConnected)showBoardGuide(target,lesson,onTap,shortcut?{shortcut,wrong:'Tap the glowing ability or press '+shortcut+'.'}:{});
}

let lockNotice;
export function showAbilityLock(level){
 lockNotice?.remove();const notice=document.createElement('div');lockNotice=notice;notice.className='ability-lock-notice';notice.setAttribute('role','status');notice.textContent='Finish Adventure level '+level+' to unlock this ability.';document.body.append(notice);window.ShapeShiftPlatform.setTimeout(()=>notice.remove(),2200);
}

export function showAdventurePractice(kind,draw,cue,done){
 if(open)return;open=true;
 const dialog=document.createElement('dialog');dialog.id='adventure-practice';dialog.setAttribute('aria-label','Adventure practice');
 const title=document.createElement('h2'),copy=document.createElement('p'),current=document.createElement('div'),choices=document.createElement('div'),note=document.createElement('p'),next=document.createElement('button');
 current.className='practice-current';choices.className='practice-choices';next.className='primary';next.textContent='Play';next.hidden=true;note.setAttribute('role','status');
 const names={shape:'Shape only',color:'Color only',memory:'Memory cards',wheel:'Changing color'};
 title.textContent=names[kind];copy.textContent=kind==='memory'?'Tap once to look. Remember it. Your next tap is a guess.':kind==='wheel'?'Every 3 matches, your shape flips to a new color. Look at the top before picking.':kind==='shape'?'Only the same shape counts. Matching just the color does nothing.':'Only the same color counts. Matching just the shape does nothing.';
 const make=(tile)=>{const art=document.createElement('span');art.className='sprite';draw(art,tile);return art;};
 current.append(make({shape:2,color:1}));const caption=document.createElement('strong');caption.textContent='You are a blue square';current.append(caption);
 const finish=()=>{cue('correct');note.textContent='You got it! Practice does not use lives.';next.hidden=false;[...choices.children].forEach(b=>b.disabled=true);};
 const button=(tile,action)=>{const b=document.createElement('button');b.className='choice';b.append(make(tile));b.onclick=action;b.setAttribute('aria-label',['Red','Blue','Green','Yellow'][tile.color]+' '+['circle','triangle','square','star'][tile.shape]);choices.append(b);return b;};
 if(kind==='shape'||kind==='color'){
 const blocked=kind==='shape'?{shape:0,color:1}:{shape:2,color:0},valid=kind==='shape'?{shape:2,color:0}:{shape:0,color:1};
 button(blocked,()=>{cue('click');note.textContent='No life lost. Try the same '+kind+'.';});button(valid,finish);note.textContent='Tap the same '+kind+'.';
 }else if(kind==='memory'){
 let seen=false,busy=false;const b=button({shape:2,color:1},()=>{if(busy)return;if(!seen){seen=true;busy=true;cue('click');b.classList.add('memory-open');note.textContent='Blue square. Remember it.';window.ShapeShiftPlatform.setTimeout(()=>{b.classList.remove('memory-open');b.classList.add('memory-used');b.setAttribute('aria-label','Remembered card. Tap to guess');note.textContent='It stays here between boards. Tap it again to match your blue square.';busy=false;},1500);}else{b.classList.add('memory-open');finish();}});b.classList.add('memory-card');b.setAttribute('aria-label','Covered card. Tap to look');note.textContent='Wrong guesses cost a heart. Covered cards never cause a timeout penalty.';
 }else{
 const turn=document.createElement('button');turn.className='practice-wheel';turn.setAttribute('aria-label','Try changing color');turn.textContent='Try it';choices.append(turn);note.textContent='Tap Try it. Watch your shape above.';
 turn.onclick=async()=>{turn.disabled=true;cue('click');await current.firstChild.animate([{transform:'rotateY(0deg)'},{transform:'rotateY(90deg)'}],{duration:350}).finished;current.firstChild.remove();current.prepend(make({shape:2,color:2}));current.firstChild.animate([{transform:'rotateY(-90deg)'},{transform:'rotateY(0deg)'}],{duration:350});caption.textContent='You are now a green square';turn.disabled=true;button({shape:0,color:2},finish);note.textContent='Now tap the green circle.';};
 }
 dialog.append(title,copy,current,choices,note,next);document.body.append(dialog);dialog.addEventListener('cancel',e=>e.preventDefault());next.onclick=()=>{open=false;dialog.close();dialog.remove();done();};dialog.showModal();
}

// Resolved guesses consume only the chosen memory slot, never its neighbours.
export function settleMemoryGuess(memories,index,tile,outcome){
 if(!tile?.memory||!['correct','wrong','protected'].includes(outcome))return false;
 if(outcome==='correct')memories.delete(index);
 return outcome!=='correct';
}

// Driven by the gameplay clock so pausing cannot skip the reveal.
export function createMemoryMissReveal(button,label){
 const duration=1200,flip=240,holdEnd=850;
 button.setAttribute('aria-label',label+'. Wrong guess.');
 return {duration,draw(elapsed){
  const t=Math.max(0,Math.min(duration,elapsed));
  const closing=Math.max(0,Math.min(1,(t-holdEnd)/(duration-holdEnd)));
  button.classList.toggle('memory-open',t>=flip/2&&closing<.5);
  const angle=t<flip?(t<flip/2?90*(t/(flip/2)):-90*(1-(t-flip/2)/(flip/2))):closing>0?(closing<.5?closing*180:(closing-1)*180):0;
  button.style.transform='perspective(600px) rotateY('+angle+'deg)';
  button.style.opacity='1';
 },clear(){button.style.removeProperty('transform');button.style.removeProperty('opacity');}};
}
