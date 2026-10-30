// Aim is measured in world units per second, independent of keyboard repeat rate.
export function bindDropKeyboard(dialog,{active,move,drop,host=window}){
 const held=new Set();
 const reset=()=>held.clear();
 const editable=target=>target.closest?.('input,textarea,select,[contenteditable="true"]');
 dialog.addEventListener('keydown',event=>{
  if(!['KeyA','KeyD','KeyS'].includes(event.code)||event.altKey||event.ctrlKey||event.metaKey||event.isComposing||editable(event.target)||!active())return;
  event.preventDefault();
  if(event.code==='KeyS'){if(!event.repeat)drop();}
  else if(!event.repeat)held.add(event.code);
 });
 host.addEventListener('keyup',event=>held.delete(event.code));
 host.addEventListener('blur',reset);
 host.addEventListener('shape-shift-pause',reset);
 host.addEventListener('shape-shift-input-reset',reset);
 dialog.addEventListener('focusout',reset);
 dialog.ownerDocument.addEventListener('visibilitychange',reset);
 return {reset,step(dt){
  if(!active()){reset();return;}
  const direction=Number(held.has('KeyD'))-Number(held.has('KeyA'));
  if(direction)move(direction*220*Math.min(.05,Math.max(0,dt)));
 }};
}
