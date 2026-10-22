export function directionalChoice(items,current,code){
 const from=items[current];if(!from)return 0;
 const horizontal=code==='KeyA'||code==='KeyD',sign=code==='KeyA'||code==='KeyW'?-1:1;
 let next=current,best=Infinity;
 items.forEach((item,index)=>{if(index===current)return;const forward=(horizontal?item.x-from.x:item.y-from.y)*sign,side=Math.abs(horizontal?item.y-from.y:item.x-from.x);if(forward<=1)return;const score=forward+side*4;if(score<best){best=score;next=index;}});
 return next;
}
export function bindBoardKeyboard(root,{enabled,doc=document}){
 let index=0,using=false;
 const choices=()=>[...root.querySelectorAll('.choice:not(.collected):not(:disabled)')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
 function paint(){const items=choices();index=Math.max(0,Math.min(index,items.length-1));root.querySelectorAll('.keyboard-choice').forEach(el=>el.classList.remove('keyboard-choice'));if(using)items[index]?.classList.add('keyboard-choice');return items;}
 new MutationObserver(()=>paint()).observe(root,{childList:true});
 root.addEventListener('pointerdown',()=>{using=false;paint();});
 doc.addEventListener('keydown',event=>{
  if(!['KeyW','KeyA','KeyS','KeyD','Space'].includes(event.code)||event.ctrlKey||event.metaKey||event.altKey||event.isComposing||event.target.closest?.('input,textarea,select,[contenteditable="true"]')||!enabled())return;
  event.preventDefault();event.stopImmediatePropagation();if(event.repeat)return;
  using=true;const items=paint();if(!items.length)return;
  if(event.code==='Space'){items[index].click();return;}
  const positions=items.map(el=>{const rect=el.getBoundingClientRect();return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};});
  index=directionalChoice(positions,index,event.code);paint();items[index].focus({preventScroll:true});
 },true);
}
