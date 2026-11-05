import {prepareMenuImage} from './menu-preload.js?v=494241';
export const BOOST_LESSONS={
 shield:['Shield','Shield blocks one mistake. Tap it to turn protection on or off.'],
 freeze:['Double Time','Double Time gives you twice the time for 5 rounds. Tap to turn it on or off.'],
 boost:['5x Multiplier','5x Multiplier boosts points and coins for 5 rounds. Tap to turn it on or off.']
};
const BOOST_SHORTCUTS={shield:'1',freeze:'2',boost:'3'};
export function guideActivationKey(event,shortcut=''){
 if(event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey||event.isComposing)return false;
 return event.key==='Enter'||event.key===' '||!!shortcut&&(event.code==='Digit'+shortcut||event.code==='Numpad'+shortcut);
}
export const SPECIAL_LESSONS={
 bomb:['Bomb','Bomb clears nearby shapes. Tap it to collect them.'],
 starburst:['Starburst','Starburst collects visible shapes. Covered memory cards stay.'],
 reset:['Rewind','Rewind returns you to one box. You keep your points.'],
 heart:['Heart Refill','Heart Refill restores your hearts. At full health, it gives points.'],
 hourglass:['Time Crystal','Time Crystal gives you twice the time for 3 rounds.'],
 crystal:['Shield Crystal','Shield Crystal blocks one mistake without losing a heart.']
};
// Only a real, uncollected lesson may pause the game loop.
export const nextSpecialLesson=(board,seen)=>board.findIndex(t=>!t.collected&&!!SPECIAL_LESSONS[t.special]&&!seen(t.special));
// Early Adventure stays focused on matching, even when replayed with a veteran save.
export const adventureAbilitiesAvailable=level=>Number(level)>5;
export function adventurePickupBoard(level,board,fallback){return adventureAbilitiesAvailable(level)?board:board.map(tile=>tile.special?{...fallback}:tile);}
let open=false,blocking=false;
export const abilityGuideOpen=()=>blocking;
export const abilityGuideVisible=()=>open;
export function showBoardGuide(target,lesson,onTap,options={}){
 if(open||!target?.isConnected)return;open=true;blocking=!options.optional;
 if(!options.optional)window.dispatchEvent(new Event('shape-shift-guide-start'));
 const layer=document.createElement('div');layer.id='board-guide';layer.dataset.phase='practice';layer.dataset.optional=String(!!options.optional);
 const hand=document.createElement('img');hand.src='assets/delivery-v144/ability-hand-v169.webp';hand.alt='';hand.className='board-guide-hand';
 const copy=document.createElement('div');copy.className='board-guide-copy';copy.setAttribute('role','status');copy.textContent=lesson[1];layer.append(copy,hand);document.body.append(layer);target.classList.add('live-guide-target');
 let frame,elapsed=0,last=performance.now(),closed=false;
 const cleanup=(learned=false)=>{if(closed)return;closed=true;cancelAnimationFrame(frame);open=false;blocking=false;layer.remove();target.classList.remove('live-guide-target');document.removeEventListener('pointerdown',pointer,true);window.removeEventListener('keydown',keys,true);if(!options.optional)window.dispatchEvent(new Event('shape-shift-guide-end'));if(learned)onTap();};
 const pointer=e=>{
  if(!e.isPrimary||e.button!==0)return;
  // Optional ability tips never consume input or require spending a charge.
  if(options.optional){cleanup(true);return;}
  if(e.target.closest?.('#pause,dialog,button[data-close]')){cleanup(false);return;}
  e.preventDefault();e.stopImmediatePropagation();
  if(target.contains(e.target)){const swallow=event=>{event.preventDefault();event.stopImmediatePropagation();};document.addEventListener('click',swallow,{capture:true,once:true});window.ShapeShiftPlatform.setTimeout(()=>document.removeEventListener('click',swallow,true),500);cleanup(true);}
  else copy.textContent=options.wrong||lesson[1];
 };
 const keys=e=>{if(options.optional){cleanup(true);return;}if(e.code==='Escape'){cleanup(false);return;}if(guideActivationKey(e,options.shortcut)){e.preventDefault();e.stopImmediatePropagation();cleanup(true);}};
 function position(now){
  if(closed)return;if(!target.isConnected){cleanup(false);return;}
  const hidden=!!document.querySelector('dialog[open]')||document.getElementById('app')?.dataset.screen!=='game';layer.hidden=hidden;
  const delta=Math.min(80,Math.max(0,now-last));last=now;if(!hidden&&!document.hidden)elapsed+=delta;
  if(options.optional&&elapsed>=8000){cleanup(true);return;}
  const field=document.getElementById('game').getBoundingClientRect(),header=document.getElementById('current-sprite').parentElement.getBoundingClientRect(),r=target.getBoundingClientRect();
  const goals=document.getElementById('mode-hud'),goalsBottom=goals?.getClientRects().length?goals.getBoundingClientRect().bottom:0;
  copy.style.left=(field.left+field.width/2)+'px';copy.style.top=(Math.max(header.bottom,goalsBottom)+10)+'px';copy.style.width=Math.max(0,field.width-32)+'px';
  const icon=target.querySelector('.sprite,.power-art'),anchor=icon?.getClientRects().length?icon.getBoundingClientRect():r;
  hand.style.left=(anchor.left+anchor.width/2-56*.87)+'px';hand.style.top=(anchor.top+anchor.height/2-56*.09)+'px';
  frame=requestAnimationFrame(position);
 }
 document.addEventListener('pointerdown',pointer,true);window.addEventListener('keydown',keys,true);position(last);
 return ()=>cleanup(false);
}
export async function showAbilityGuide(target,lesson,onTap,options={}){
 if(open||!target||!lesson)return;open=true;blocking=!options.optional;
 const specialKey=Object.keys(SPECIAL_LESSONS).find(key=>SPECIAL_LESSONS[key][0]===lesson[0]);
 const boostKey=Object.keys(BOOST_LESSONS).find(key=>BOOST_LESSONS[key][0]===lesson[0]);
 const abilityImages={freeze:'assets/delivery-v144/browser-time-hd1.webp',shield:'assets/delivery-v144/browser-shield-hd1.webp',boost:'assets/delivery-v144/browser-boost-hd1.webp'};
 const sheet=boostKey?[abilityImages[boostKey],1,0]:specialKey==='bomb'?['assets/slice-bomb-v239.webp',1,0]:specialKey?['assets/delivery-v144/specials-v13.webp',5,['starburst','hourglass','crystal','reset','heart'].indexOf(specialKey)]:boostKey==='boost'?['assets/delivery-v144/health-boost-v5.webp',2,1]:['assets/delivery-v144/abilities-v4.webp',3,boostKey==='shield'?2:0];
 try{
 const art=await prepareMenuImage(sheet[0]);
 target.querySelectorAll('.guide-art-fallback').forEach(label=>label.remove());
 const canvas=document.createElement('canvas');canvas.className='guide-raster-icon';canvas.setAttribute('aria-hidden','true');
 const sw=art.naturalWidth/sheet[1],sh=specialKey&&specialKey!=='bomb'?sw*1.2:art.naturalHeight;canvas.width=Math.round(sw);canvas.height=Math.round(sh);
 canvas.getContext('2d').drawImage(art,sheet[2]*sw,(art.naturalHeight-sh)/2,sw,sh,0,0,canvas.width,canvas.height);
 const slot=target.querySelector('.sprite,.power-art');if(slot){const r=slot.getBoundingClientRect();slot.style.background='none';slot.classList.remove('special-art');canvas.style.cssText='position:static;width:100%;height:100%;object-fit:contain;display:block';const box=target.getBoundingClientRect(),width=r.width||Math.min(box.width*.65,box.height*.65/(sh/sw)),height=r.height||width*sh/sw;slot.style.width=width+'px';slot.style.height=height+'px';slot.replaceChildren(canvas);}
 }catch{target.setAttribute('aria-label',lesson[0]);}
 // Keep ability artwork free of permanent labels; the HUD explains its use.
 open=false;blocking=false;
 const shortcut=globalThis.matchMedia?.('(any-hover: hover) and (any-pointer: fine)').matches?BOOST_SHORTCUTS[boostKey]:'';
 if(target.isConnected)showBoardGuide(target,lesson,onTap,{...options,shortcut,wrong:lesson[1]});
}

let lockNotice;
export function showAbilityLock(level){
 lockNotice?.remove();const notice=document.createElement('div');lockNotice=notice;notice.className='ability-lock-notice';notice.setAttribute('role','status');notice.textContent='Finish Adventure level '+level+' to unlock this ability.';document.body.append(notice);window.ShapeShiftPlatform.setTimeout(()=>notice.remove(),2200);
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
