// Keep a gesture's lifetime independent of dialogs, viewport resizes and native pauses.
export function bindMenuSwipe(surface,{enabled=()=>true,modeAt=()=>-1,width=()=>surface.clientWidth,paint=()=>{},swipe=()=>{},tap=()=>{},cancel=()=>{},now=()=>window.ShapeShiftPlatform.now()}){
 const gate=launchClickGate(surface.ownerDocument);
 let gesture=null,suppressClick=false;
 function finish(){
  const previous=gesture;gesture=null;paint(0,false);
  if(previous&&surface.hasPointerCapture?.(previous.id))surface.releasePointerCapture(previous.id);
  return previous;
 }
 function reset(){finish();suppressClick=false;cancel();}
 surface.addEventListener('pointerdown',event=>{
  if(event.isPrimary===false||event.button!==0||!enabled())return;
  // A new pointer gesture must never inherit the previous swipe's ghost-click guard.
  suppressClick=false;
  const mode=modeAt(event.target);
  // Other home controls retain their own tap/hold behavior.
  if(mode<0&&event.target.closest('button,a,input,select,textarea,dialog'))return;
  if(gesture)reset();suppressClick=false;gesture={id:event.pointerId,x:event.clientX,y:event.clientY,mode,moved:false};
  // A modal or native resize can invalidate capture; window-level completion still works.
  try{surface.setPointerCapture?.(event.pointerId);}catch{}
  paint(0,true);
 });
 surface.addEventListener('pointermove',event=>{
  if(!gesture||gesture.id!==event.pointerId)return;
  if(!enabled()){reset();return;}
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
  if(Math.hypot(dx,dy)>10)gesture.moved=true;
  paint(Math.max(-width()*.45,Math.min(width()*.45,dx)),true);
  if(event.cancelable)event.preventDefault();
 });
 const up=event=>{
  if(!gesture||gesture.id!==event.pointerId)return;
  const previous=finish();
  if(!enabled()){reset();return;}
  const dx=event.clientX-previous.x,dy=event.clientY-previous.y;
  const moved=previous.moved||Math.hypot(dx,dy)>10;
  if(moved){suppressClick=true;cancel();}
  if(Math.abs(dx)>24&&Math.abs(dx)>Math.abs(dy))swipe(dx<0?1:-1);
  else if(!moved&&previous.mode>=0){
   // Consume the synthetic click before a newly opened dialog can receive it.
   gate.blocked=true;tap(previous.mode,event.clientX,event.clientY,now());
  }
 };
 const interrupted=event=>{if(gesture?.id===event.pointerId)reset();};
 const host=surface.ownerDocument.defaultView;
 host.addEventListener('pointerup',up);
 host.addEventListener('pointercancel',interrupted);
 surface.addEventListener('lostpointercapture',interrupted);
 surface.addEventListener('dragstart',event=>event.preventDefault());
 surface.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopPropagation();suppressClick=false;}},true);
 for(const event of ['blur','resize','pagehide','androidpause','androidresume','shape-shift-input-reset'])host.addEventListener(event,reset);
 surface.ownerDocument.addEventListener('visibilitychange',reset);
 return {reset};
}

// Home pop-ups share the home banner. Only entering actual gameplay removes it.
export function menuBannerVisible(screen,openDialogs){
 return screen==='home'&&!openDialogs.some(id=>['shape-drop','shape-slice','piano-flow','story-scene'].includes(id));
}
export function syncMenuBanner(document,bridge){
 const visible=menuBannerVisible(document.getElementById('app').dataset.screen,
  Array.from(document.querySelectorAll('dialog[open]'),dialog=>dialog.id));
 bridge?.setBannerVisible?.(visible);
 return visible;
}

// Complete launch taps directly: visual press transforms or WebView click synthesis
// must not require a second gesture. Native click remains available for keyboard/AT.
const launchClickGates=new WeakMap();
function launchClickGate(doc){
 let gate=launchClickGates.get(doc);if(gate)return gate;
 gate={blocked:false};launchClickGates.set(doc,gate);
 doc.addEventListener('pointerdown',()=>{gate.blocked=false;},true);
 doc.defaultView.addEventListener('shape-shift-input-reset',()=>{gate.blocked=false;});
 doc.addEventListener('click',event=>{
  if(gate.blocked&&event.detail!==0){event.preventDefault();event.stopImmediatePropagation();}
 },true);
 return gate;
}
export function bindLaunchTap(button,action){
 const doc=button.ownerDocument,host=doc.defaultView,gate=launchClickGate(doc);let press=null,consumeClick=false;
 const available=()=>!button.disabled&&button.isConnected&&!button.closest('[inert]')&&button.getClientRects().length>0;
 const clear=()=>{
  press=null;
  host.removeEventListener('pointermove',move);host.removeEventListener('pointerup',up);
  host.removeEventListener('pointercancel',cancel);
  for(const name of ['blur','pagehide','androidpause','shape-shift-input-reset'])host.removeEventListener(name,cancel);
  doc.removeEventListener('visibilitychange',cancel);
 };
 const cancel=()=>{consumeClick=true;clear();};
 const move=event=>{if(press?.id===event.pointerId&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>12)cancel();};
 const up=event=>{
  if(press?.id!==event.pointerId)return;
  const p=press;consumeClick=true;clear();
  if(!available()||Math.hypot(event.clientX-p.x,event.clientY-p.y)>12)return;
  // The pressed visual shrinks the button; keep its edge taps valid.
  if(event.clientX<p.rect.left-8||event.clientX>p.rect.right+8||event.clientY<p.rect.top-8||event.clientY>p.rect.bottom+8)return;
  gate.blocked=true;action();
 };
 button.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.isPrimary===false||!available())return;
  clear();consumeClick=false;
  press={id:event.pointerId,x:event.clientX,y:event.clientY,rect:button.getBoundingClientRect()};
  host.addEventListener('pointermove',move);host.addEventListener('pointerup',up);
  host.addEventListener('pointercancel',cancel);
  for(const name of ['blur','pagehide','androidpause','shape-shift-input-reset'])host.addEventListener(name,cancel);
  doc.addEventListener('visibilitychange',cancel);
 });
 button.addEventListener('click',event=>{
  if(consumeClick&&event.detail!==0){event.preventDefault();event.stopImmediatePropagation();return;}
  if(available())action();
 });
}
