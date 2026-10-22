// Shared main-game damage tint and sound, with a short real-time recovery.
export const HIT_RECOVERY_SECONDS=.65;
export const hitTimeScale=remaining=>{
 const t=1-Math.min(1,Math.max(0,remaining/HIT_RECOVERY_SECONDS));
 return .22+.78*t*t*(3-2*t);
};
export function createHitFeedback(host,{sound=()=>{},reducedMotion=()=>false,hearts=()=>null}={}){
 let remaining=0,layer=null;
 return {
  get active(){return remaining>0;},
  hit(){
   remaining=HIT_RECOVERY_SECONDS;sound('wrong');
   if(reducedMotion())return;
   if(!layer||layer.parentNode!==host){layer=host.ownerDocument.createElement('div');layer.className='mini-damage-layer';layer.setAttribute('aria-hidden','true');host.append(layer);}
   layer.classList.remove('damage-flash');void layer.offsetWidth;layer.classList.add('damage-flash');
   const hud=hearts();if(hud){hud.classList.remove('feedback-pop');void hud.offsetWidth;hud.classList.add('feedback-pop');}
  },
  step(dt){const real=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0)),scaled=real*hitTimeScale(remaining);remaining=Math.max(0,remaining-real);return scaled;},
  reset(){remaining=0;layer?.remove();layer=null;}
 };
}
