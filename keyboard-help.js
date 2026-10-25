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

export function keyboardHelpFor({screen='home',dialog='',paused=false,loading=false}={}){
 if(loading)return null;
 if(dialog==='over-dialog')return {title:'Results',rows:[['Space','Continue'],['Esc','Continue']]};
 if(dialog&&(!['piano-flow','shape-drop','shape-slice'].includes(dialog)||paused))return {title:paused?'Paused':'Menus',rows:[['W A S D','Choose'],['Space','Confirm'],['Esc','Back']]};
 if(dialog==='piano-flow')return {title:'Piano Flow',rows:[['A S D F','Play notes'],['Hold','Long notes'],['Esc','Pause']]};
 if(dialog==='shape-drop')return {title:'Shape Drop',rows:[['A / D','Move'],['S','Drop'],['Esc','Pause']]};
 if(dialog==='shape-slice')return {title:'Shape Slice',rows:[['Drag','Slice shapes'],['Esc','Pause']]};
 if(screen==='game')return {title:'Play',rows:[['W A S D','Move'],['Space','Pick'],['Esc','Pause']]};
 if(screen==='map')return {title:'Adventure map',rows:[['W','Next level'],['S','Previous level'],['Space','Select'],['Esc','Back']]};
 return {title:'Main menu',rows:[['A / D','Switch modes'],['Space','Play'],['W / S','Menu buttons']]};
}
