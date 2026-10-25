export const ABILITY_KEYS=Object.freeze({Digit1:'shield',Numpad1:'shield',Digit2:'freeze',Numpad2:'freeze',Digit3:'boost',Numpad3:'boost'});

// Escape uses the same back stack as the visible pause and close controls.
export function bindBackKeyboard({doc=document,ready,back}){
 const listener=event=>{
  if(!['Escape','KeyZ'].includes(event.code)||event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.isComposing||!ready())return;
  const editing=event.target.closest?.('textarea,select,[contenteditable],input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button])');
  if(event.code==='KeyZ'&&editing&&event.target.dataset.menuEditing!=='false')return;
  if(!back())return;
  event.preventDefault();event.stopImmediatePropagation();
 };
 doc.addEventListener('keydown',listener,{capture:true});
 return ()=>doc.removeEventListener('keydown',listener,{capture:true});
}

export function keyboardHelpFor({loading=false}={}){
 if(loading)return null;
 return {title:'Quick controls',rows:[['W A S D','Move / choose'],['Space','Select / confirm'],['Z','Back'],['Esc','Pause / back'],['1 2 3','Abilities']]};
}
