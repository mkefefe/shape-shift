// Visual feedback observes input only; it never dispatches gameplay actions or blocks gestures.
export function initInputFeedback(){
 const selector='button,a[href],[role="button"],input[type="checkbox"],input[type="radio"],input[type="range"],label[for]';
 const pointers=new Map(),releases=new Map(),keys=new Map();
 const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('reduce-motion');
 const enabled=control=>control&&!control.matches(':disabled,[aria-disabled="true"]')&&(!control.matches('label[for]')||!document.getElementById(control.htmlFor)?.disabled);
 const find=target=>target instanceof Element?target.closest(selector):null;
 const layer=document.createElement('div');layer.id='tap-effects';layer.setAttribute('popover','manual');layer.setAttribute('aria-hidden','true');document.body.append(layer);
 function ring(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y))return;
  if(layer.showPopover){if(!layer.matches(':popover-open'))layer.showPopover();}
  else (document.querySelector('dialog[open]')||document.body).append(layer);
  while(layer.children.length>=8)layer.firstChild.remove();
  const mark=document.createElement('span');mark.className='tap-burst';mark.style.left=x+'px';mark.style.top=y+'px';layer.append(mark);
  const quiet=reduced(),animations=[];
  const animate=(className,frames,duration)=>{
   const part=document.createElement('i');part.className=className;mark.append(part);
   animations.push(part.animate(frames,{duration,easing:'linear',fill:'both'}).finished.catch(()=>{}));
  };
  // A hollow ripple expands from the contact point; the center stays clear.
  animate('tap-ring',quiet?[
   {opacity:.75,transform:'scale(.45)'},{opacity:0,transform:'scale(.45)'}
  ]:[
   {opacity:.95,transform:'scale(.22)'},
   {opacity:.8,transform:'scale(.65)',offset:.4},
   {opacity:0,transform:'scale(1)'}
  ],quiet?180:600);
  if(!quiet){
   const phase=Math.random()*Math.PI*2;
   for(let i=0;i<4;i++){
    const angle=phase+i*Math.PI/2+(Math.random()-.5)*.65,distance=20+Math.random()*14,dx=Math.cos(angle),dy=Math.sin(angle);
    animate('tap-spark',[
     {opacity:0,transform:`translate(${dx*5}px,${dy*5}px) scale(.4)`},
     {opacity:.9,transform:`translate(${dx*distance*.45}px,${dy*distance*.45}px) scale(1)`,offset:.22},
     {opacity:0,transform:`translate(${dx*distance}px,${dy*distance}px) scale(.2)`}
    ],520+(i%3)*50);
   }
  }
  Promise.all(animations).finally(()=>{mark.remove();if(!layer.childElementCount&&layer.hidePopover&&layer.matches(':popover-open'))layer.hidePopover();});
 }
 function press(control){
  if(!enabled(control))return null;
  window.ShapeShiftPlatform.clearTimeout(releases.get(control));releases.delete(control);control.classList.add('input-pressed');return control;
 }
 function release(control,immediate=false){
  if(!control)return;window.ShapeShiftPlatform.clearTimeout(releases.get(control));
  if(immediate){control.classList.remove('input-pressed');releases.delete(control);return;}
  releases.set(control,window.ShapeShiftPlatform.setTimeout(()=>{control.classList.remove('input-pressed');releases.delete(control);},120));
 }
 function clear(){
  for(const point of pointers.values())release(point.control,true);pointers.clear();
  for(const control of keys.values())release(control,true);keys.clear();
  for(const control of releases.keys())release(control,true);
  layer.replaceChildren();if(layer.hidePopover&&layer.matches(':popover-open'))layer.hidePopover();
 }
 document.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  const slicing=event.target instanceof Element&&event.target.closest('#shape-slice[data-view=play][data-paused=false]')&&!find(event.target)&&!event.target.closest('.drop-overlay');
  if(!slicing)ring(event.clientX,event.clientY);
  const control=press(find(event.target));pointers.set(event.pointerId,{control,x:event.clientX,y:event.clientY,repeat:control?.dataset.repeatBuy});
 },{capture:true,passive:true});
 document.addEventListener('pointermove',event=>{
  const point=pointers.get(event.pointerId);if(!point)return;
  if(Math.hypot(event.clientX-point.x,event.clientY-point.y)>12){release(point.control,true);pointers.delete(event.pointerId);}
 },{capture:true,passive:true});
 for(const type of ['pointerup','pointercancel'])document.addEventListener(type,event=>{
  const point=pointers.get(event.pointerId);if(!point)return;release(point.control,type==='pointercancel');pointers.delete(event.pointerId);
 },{capture:true,passive:true});
 document.addEventListener('keydown',event=>{
  if(!['Enter',' '].includes(event.key)||event.repeat)return;
  const control=press(find(event.target));if(!control)return;keys.set(event.key,control);
  const rect=control.getBoundingClientRect();ring(rect.x+rect.width/2,rect.y+rect.height/2);
 },{capture:true});
 document.addEventListener('keyup',event=>{release(keys.get(event.key));keys.delete(event.key);},{capture:true});
 // Shop purchases replace their buttons while held; keep the replacement visibly depressed.
 new MutationObserver(()=>{
  for(const point of pointers.values())if(point.repeat&&point.control&&!point.control.isConnected){
   release(point.control,true);const replacement=find(document.elementFromPoint(point.x,point.y));
   point.control=replacement?.dataset.repeatBuy===point.repeat?press(replacement):null;
  }
 }).observe(document.body,{childList:true,subtree:true});
 document.addEventListener('scroll',()=>{for(const point of pointers.values())release(point.control,true);pointers.clear();},{capture:true,passive:true});
 window.addEventListener('unused-blur',clear);document.addEventListener('unused-visibilitychange',()=>{if(window.ShapeShiftPlatform.paused)clear();});window.addEventListener('unused-androidpause',clear);
 return clear;
}
