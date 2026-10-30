export const practiceKey=mode=>'shape-shift-practice-'+mode+'-v4';
const art=new URL('assets/delivery-v144/ability-hand-v169.webp',import.meta.url).href;
// Coordinates describe the fingertip in the actual hand artwork, after rotation.
export function practiceHandPosition(point,bounds,size=56){
 const downward=point.y>bounds.top+bounds.height-85;
 const tip=downward?{x:.91,y:.87}:{x:.87,y:.09};
 return {left:point.x-bounds.left-tip.x*size,top:point.y-bounds.top-tip.y*size,rotation:downward?0:-90};
}
// The hand and brush trail share one moving fingertip, rather than separate animations.
export function practiceSwipeFrame(ms){
 const phase=(ms%1900)/1900,travel=Math.max(0,Math.min(1,(phase-.12)/.68));
 const progress=travel*travel*(3-2*travel);
 return {offset:-48+96*progress,length:Math.min(64,96*progress),opacity:phase<.12?0:phase>.8?Math.max(0,(1-phase)/.2):.9};
}
export function createModePractice(mode,{storage=window.ShapeShiftPlatform?.storage||window.localStorage,seen,onComplete=()=>{},sound=()=>window.gameAudio?.ui('click')}={}){
 if(seen===undefined){try{seen=storage.getItem(practiceKey(mode))==='done';}catch{}}
 let active=!seen,finished=false,root,hand,copy,target,host,raf=0,doneTime=0,last=0,gestureStart=0;
 function clear(){cancelAnimationFrame(raf);copy?.remove();root?.remove();root=null;target=null;host?.classList.remove('practice-callout');host=null;}
 function complete(){if(!active)return;active=false;try{storage.setItem(practiceKey(mode),'done');}catch{}clear();onComplete();}
 function mount(parent){
  clear();if(!active)return;finished=false;doneTime=0;last=performance.now();gestureStart=last;
  if(!document.getElementById('mode-practice-style')){const style=document.createElement('style');style.id='mode-practice-style';style.textContent=`
  .mode-practice{position:absolute;inset:0;z-index:70;pointer-events:none;text-align:center}
  .mode-practice-copy{pointer-events:none;font:900 clamp(15px,4vw,21px)/1.2 Nunito,sans-serif;color:#fff3b3;text-shadow:0 2px 3px #001b39;text-align:center;position:absolute;top:92px;left:50%;transform:translateX(-50%);width:calc(100% - 40px);max-width:440px;box-sizing:border-box;padding:0;background:none;border:0;box-shadow:none}
  #callout.practice-callout{position:relative;width:auto;height:auto;overflow:visible;clip-path:none;margin:7px 0;padding:0;flex:none;z-index:70}
  .mode-practice-copy strong{display:block}.mode-practice-copy small{display:none}
  .mode-practice-pointer{position:absolute;width:56px;height:56px;pointer-events:none;--hand-rotation:-90deg}
  .mode-practice-hand{width:100%;height:100%;object-fit:contain;transform:rotate(var(--hand-rotation));filter:drop-shadow(0 2px 2px #001a3866)}
  .mode-practice[data-gesture=tap] .mode-practice-hand{animation:practice-tap 1.15s ease-in-out infinite}
  .mode-practice[data-gesture=hold] .mode-practice-hand{animation:practice-hold 1.2s ease-in-out infinite;transform-origin:87% 9%}
  .mode-practice-trail{position:absolute;width:64px;height:10px;border-radius:10px;background:linear-gradient(90deg,#eaf0ff00,#eaf0ff99 55%,#fff);box-shadow:0 2px 4px #152b3d25;opacity:0;transform:translateY(-50%)}
  .mode-practice-copy [hidden],.mode-practice [hidden]{display:none!important}
  @keyframes practice-tap{50%{transform:translate(-4px,4px) rotate(var(--hand-rotation))}}
  @keyframes practice-swipe{0%,15%{transform:translateX(-44px)}75%,100%{transform:translateX(44px)}}
  @keyframes practice-trail{0%,15%{clip-path:inset(0 100% 0 0);opacity:0}20%{opacity:.85}75%{clip-path:inset(0);opacity:.85}100%{clip-path:inset(0);opacity:0}}
  @keyframes practice-hold{50%{filter:drop-shadow(0 0 6px #fff5aa);opacity:.85}}
  `;document.head.append(style);}
  root=document.createElement('div');root.className='mode-practice';root.innerHTML='<div class="mode-practice-copy" role="status"><strong></strong></div><i class="mode-practice-trail" aria-hidden="true"></i><span class="mode-practice-pointer"><img class="mode-practice-hand" alt=""></span>';parent.append(root);
  hand=root.querySelector('.mode-practice-pointer');hand.querySelector('img').src=art;copy=root.querySelector('.mode-practice-copy');host=mode==='battle'?parent.querySelector('#callout'):null;
  if(mode!=='battle')copy.style.fontSize='clamp(15px,3.5vw,19px)';
  if(host){host.classList.add('practice-callout');host.replaceChildren(copy);copy.style.cssText='position:relative;top:0;left:auto;transform:none;width:100%;max-width:100%;margin:auto';}
  const position=()=>{
   if(!root)return;
   const now=performance.now(),dt=Math.min(50,now-last);last=now;
   if(finished&&!document.hidden&&parent.dataset.paused!=='true'&&!parent.classList.contains('paused')){doneTime+=dt;if(doneTime>=900){complete();return;}}
   const p=parent.getBoundingClientRect(),r=target?.(),trail=root.querySelector('.mode-practice-trail');
   hand.hidden=finished||!r;trail.hidden=hand.hidden;
   if(r){
    const gesture=root.dataset.gesture,moving=gesture==='swipe'||gesture==='aim',motion=practiceSwipeFrame(now-gestureStart),tip={x:r.x+(moving?motion.offset:0),y:r.y};
    const size=Math.min(56,Math.max(42,p.width*.14)),pos=practiceHandPosition(tip,p,size);
    hand.style.width=hand.style.height=size+'px';hand.style.left=pos.left+'px';hand.style.top=pos.top+'px';hand.style.setProperty('--hand-rotation',pos.rotation+'deg');
    trail.style.left=tip.x-p.left-motion.length+'px';trail.style.top=tip.y-p.top+'px';trail.style.width=motion.length+'px';trail.style.opacity=gesture==='swipe'?motion.opacity:0;
    if(mode!=='battle'){copy.hidden=false;copy.style.top=Math.min(p.height-46,Math.max(110,r.y-p.top+68))+'px';}
   }else if(mode!=='battle')copy.hidden=!finished;
   raf=requestAnimationFrame(position);
  };position();
 }
 return {get active(){return active;},get finished(){return active&&finished;},mount,clear,
  guide(text,getTarget,gesture='tap'){target=getTarget;gestureStart=performance.now();if(root){root.dataset.gesture=gesture;copy.querySelector('strong').textContent=text;}},
  finish(){if(!active||finished)return;finished=true;doneTime=0;target=null;if(root){copy.querySelector('strong').textContent='Nice! Let’s play.';hand.hidden=true;}},
  complete
 };
}
