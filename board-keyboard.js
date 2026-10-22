export function directionalChoice(items,current,code){
 const from=items[current];if(!from)return 0;
 const horizontal=code==='KeyA'||code==='KeyD',sign=code==='KeyA'||code==='KeyW'?-1:1;
 let next=current,best=Infinity;
 items.forEach((item,index)=>{if(index===current)return;const forward=(horizontal?item.x-from.x:item.y-from.y)*sign,side=Math.abs(horizontal?item.y-from.y:item.x-from.x);if(forward<=1)return;const score=forward+side*4;if(score<best){best=score;next=index;}});
 if(next===current){
  const edge=Math.min(...items.map(item=>sign*(horizontal?item.x:item.y)));
  items.forEach((item,i)=>{if(i===current||Math.abs(sign*(horizontal?item.x:item.y)-edge)>1)return;const side=Math.abs(horizontal?item.y-from.y:item.x-from.x);if(side<best){best=side;next=i;}});
 }
 return next;
}
export function bindBoardKeyboard(root,{enabled,suspended=()=>false,doc=document}){
 let index=0,using=false,held=null,repeatFrame=0,nextMove=0;
 const host=doc.defaultView;
 const stop=()=>{held=null;host.cancelAnimationFrame(repeatFrame);repeatFrame=0;};
 function repeat(now){if(!held||suspended()){stop();return;}if(enabled()&&now>=nextMove){move(held);nextMove=now+75;}repeatFrame=host.requestAnimationFrame(repeat);}
 function move(code){using=true;const items=paint();if(!items.length)return;const positions=items.map(el=>{return {x:el.offsetLeft+el.offsetWidth/2,y:el.offsetTop+el.offsetHeight/2};});index=directionalChoice(positions,index,code);paint();items[index].focus({preventScroll:true});}
 host.addEventListener('keyup',event=>{if(event.code===held)stop();});
 host.addEventListener('blur',stop);
 host.addEventListener('shape-shift-pause',stop);
 doc.addEventListener('visibilitychange',stop);
 doc.addEventListener('focusin',event=>{if(!root.contains(event.target))stop();});
 const choices=()=>[...root.querySelectorAll('.choice:not(.collected):not(:disabled)')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
 function paint(){const items=choices();if(items.length)index=Math.max(0,Math.min(index,items.length-1));root.querySelectorAll('.keyboard-choice').forEach(el=>el.classList.remove('keyboard-choice'));if(using)items[index]?.classList.add('keyboard-choice');return items;}
 new MutationObserver(()=>{const items=paint();if(using&&enabled()&&(doc.activeElement===doc.body||root.contains(doc.activeElement)))items[index]?.focus({preventScroll:true});}).observe(root,{childList:true});
 root.addEventListener('pointerdown',()=>{stop();using=false;paint();});
 doc.addEventListener('keydown',event=>{
  if(!['KeyW','KeyA','KeyS','KeyD','Space'].includes(event.code)||event.ctrlKey||event.metaKey||event.altKey||event.isComposing||event.target.closest?.('input,textarea,select,[contenteditable="true"]')||suspended())return;
  event.preventDefault();event.stopImmediatePropagation();if(event.repeat){if(event.code!=='Space'&&!held){held=event.code;nextMove=0;repeatFrame=host.requestAnimationFrame(repeat);}return;}
  using=true;const items=paint();
  if(event.code==='Space'){if(enabled())items[index]?.click();return;}
  if(enabled())move(event.code);stop();held=event.code;nextMove=host.performance.now()+140;repeatFrame=host.requestAnimationFrame(repeat);
 },true);
}
