import {prepareMenuImage} from './menu-preload.js?v=494115';
export const GATE_TIMING=Object.freeze({close:720,impact:650,turn:2120,turnDuration:1800,settle:200,openDuration:1300});
export let transitioning=false;
const clamp=n=>Math.min(1,Math.max(0,n)),ease=n=>{n=clamp(n);return n*n*(3-2*n);};
export function gateFrame(ms,releaseAt=Infinity){
 const turnAt=Math.max(GATE_TIMING.turn,releaseAt),openAt=turnAt+GATE_TIMING.turnDuration+GATE_TIMING.settle;
 return {enter:ease(ms/720),rotation:ease((ms-turnAt)/1800)*Math.PI/2,opening:ease((ms-openAt)/1100),zoom:1+.06*ease((ms-openAt)/1300),done:ms>=openAt+1300,turnAt,openAt};
}
export function beginModeTransition(title){
 // Startup prepares the first board below its own cover; its gate is launched
 // explicitly once setup is complete, before the tutorial is released.
 if(document.documentElement.classList.contains('startup-loading'))return {covered:Promise.resolve(),reveal:async(paint)=>{await paint?.();},dispose(){}};
 const cover=document.createElement('dialog');cover.className='mode-curtain';cover.setAttribute('aria-label','Loading '+title);
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');cover.append(canvas);
 cover.oncancel=e=>e.preventDefault();document.body.append(cover);cover.showModal();transitioning=true;
 const ctx=canvas.getContext('2d');let disposed=false,ms=0,last=null,raf,releaseAt=Infinity,requested=false,finish,markCovered;
 const covered=new Promise(resolve=>markCovered=resolve);
 const finished=new Promise(resolve=>finish=resolve),sounds=new Map(),cues=new Set();let zoomTarget,zoomAnimation;
 // Destination modes use modal dialogs. Keep the gate above them while they prepare.
 const observer=new MutationObserver(records=>{if(disposed)return;if(records.some(r=>r.target!==cover&&r.target.open&&r.target.tagName==='DIALOG')){cover.close();cover.showModal();}});
 observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',visibility);for(const stop of sounds.values())stop?.();zoomAnimation?.cancel();cover.close();cover.remove();transitioning=false;markCovered();finish();}
 function visibility(){last=null;if(document.hidden)for(const stop of sounds.values())stop?.();}
 document.addEventListener('visibilitychange',visibility);
 function sound(name){if(cues.has(name))return;cues.add(name);sounds.set(name,window.gameAudio?.playGate?.(name));}
 const art=Promise.all([prepareMenuImage('assets/transition-gate-v115.png'),window.gameAudio?.prepareGate?.()]).then(([image])=>{
  if(disposed)return;
  function tick(now){
   if(disposed)return;
   if(document.hidden){last=null;raf=requestAnimationFrame(tick);return;}
   if(last!==null)ms+=Math.min(50,now-last);last=now;
   if(requested&&releaseAt===Infinity)releaseAt=Math.max(ms,GATE_TIMING.turn);
   const f=gateFrame(ms,releaseAt),w=cover.clientWidth,h=cover.clientHeight,d=Math.hypot(w,h)+24,dpr=Math.min(devicePixelRatio||1,2);
   if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(w/2,h/2);ctx.rotate(f.rotation);
   const travel=(1-f.enter)*d*.6+f.opening*d*.64;
   for(let half=0;half<2;half++){ctx.save();ctx.translate(0,(half?1:-1)*travel);ctx.drawImage(image,0,half*image.height/2,image.width,image.height/2,-d/2,half?0:-d/2,d,d/2+.5);ctx.restore();}ctx.restore();
   if(f.enter===1)markCovered();sound('enter');if(ms>=650)sound('impact');if(ms>=f.turnAt)sound('turn');
   if(ms>=f.openAt&&!cues.has('open')){
    sound('open');
    zoomTarget=[...document.querySelectorAll('dialog[open]:not(.mode-curtain)')].at(-1)||document.getElementById('app');
    // A gentle forward move during opening, then settle imperceptibly to layout.
    zoomAnimation=zoomTarget?.animate?.([{transform:'scale(.944)'},{transform:'scale(1)'}],{duration:1300,easing:'ease-in-out'});
   }
   cover.dataset.phase=ms<720?'closing':ms<f.turnAt?'waiting':ms<f.openAt?'rotating':'opening';
   if(f.done){dispose();return;}raf=requestAnimationFrame(tick);
  }
  raf=requestAnimationFrame(tick);
 }).catch(error=>{console.warn('Door transition unavailable',error);dispose();});
 return {covered,dispose,async reveal(paint){await art;await covered;if(disposed)return;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));await paint?.();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));requested=true;await finished;}};
}
