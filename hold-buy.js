// Hold repeats only coin purchases explicitly marked as repeatable boosts.
export function enableHoldBuying(dialog,{delay=450,interval=220}={}){
 let hold=null,timer=null,suppressClick=false;
 const stop=()=>{window.ShapeShiftPlatform.clearTimeout(timer);timer=null;hold=null;};
 const reset=()=>{stop();suppressClick=false;};
 const buttonAtPointer=()=>{
  if(!hold||!dialog.open||window.ShapeShiftPlatform.paused)return null;
  const button=document.elementFromPoint(hold.x,hold.y)?.closest('[data-repeat-buy]');
  return button&&dialog.contains(button)&&button.dataset.repeatBuy===hold.item&&!button.disabled?button:null;
 };
 const repeat=()=>{
  const button=buttonAtPointer();if(!button){stop();return;}
  suppressClick=true;
  // The purchase validates the current balance and price on every repetition.
  const bought=button.onclick?.();
  if(bought===false){stop();return;}
  timer=window.ShapeShiftPlatform.setTimeout(repeat,interval);
 };
 dialog.addEventListener('pointerdown',event=>{
  stop();suppressClick=false;
  const button=event.target.closest('[data-repeat-buy]');
  if(!button||button.disabled||event.button!==0||!event.isPrimary)return;
  hold={id:event.pointerId,item:button.dataset.repeatBuy,x:event.clientX,y:event.clientY};
  timer=window.ShapeShiftPlatform.setTimeout(repeat,delay);
 });
 document.addEventListener('pointermove',event=>{
  if(!hold||event.pointerId!==hold.id)return;
  hold.x=event.clientX;hold.y=event.clientY;if(!buttonAtPointer())stop();
 },{passive:true});
 for(const type of ['pointerup','pointercancel'])document.addEventListener(type,event=>{if(hold?.id===event.pointerId)stop();},{capture:true});
 dialog.addEventListener('click',event=>{
  if(suppressClick&&event.detail!==0){event.preventDefault();event.stopImmediatePropagation();suppressClick=false;}
 },true);
 dialog.addEventListener('contextmenu',event=>{if(event.target.closest('[data-repeat-buy]'))event.preventDefault();});
 dialog.addEventListener('close',stop);dialog.addEventListener('cancel',stop);
 dialog.addEventListener('scroll',stop,true);window.addEventListener('blur',reset);
 window.addEventListener('shape-shift-input-reset',reset);
 document.addEventListener('unused-visibilitychange',()=>{if(window.ShapeShiftPlatform.paused)stop();});
 return stop;
}
