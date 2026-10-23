import {directionalChoice} from './board-keyboard.js?v=49439-web12';
// Navigate existing controls, retaining each control's original click handler.
export function bindPauseKeyboard(doc=document){
 doc.addEventListener('focusin',event=>{doc.querySelectorAll('.keyboard-menu-selected').forEach(el=>{if(el!==event.target)el.classList.remove('keyboard-menu-selected');});});
 doc.addEventListener('keydown',event=>{
  if(!['KeyW','KeyA','KeyS','KeyD','Space','Enter','NumpadEnter'].includes(event.code)||event.ctrlKey||event.altKey||event.metaKey||event.isComposing||event.target.closest?.('textarea,select,[contenteditable],input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button])'))return;
  const focused=doc.activeElement;
  const dialog=focused?.closest('dialog[open]')||[...doc.querySelectorAll('dialog[open]')].at(-1);
  const home=!dialog&&doc.querySelector('#app')?.dataset.screen==='home';
  const mini=dialog&&['shape-drop','shape-slice','piano-flow'].includes(dialog.id);
  if(mini&&dialog.dataset.paused!=='true')return;
  const pause=dialog?.id==='pause-dialog'||(mini&&dialog.dataset.paused==='true');
  const panel=mini?dialog.querySelector('.drop-pause-panel'):dialog||(home?doc.querySelector('#app'):null);
  if(!panel||doc.querySelector('#startup-ready:not([hidden])'))return;
  // The carousel owns mode switching and confirmation, even with a stale card/dot focus.
  if(home&&['KeyA','KeyD','Space','Enter','NumpadEnter'].includes(event.code)&&(!panel.contains(focused)||focused.closest('.mode-carousel,#mode-dots,.home-actions')))return;
  const selector=dialog?.id==='games-hub'?'.hub-game':dialog?.id==='pause-dialog'?'#resume,.pause-option':'button,a[href],input:not([type=hidden]),select,textarea';
  const items=[...panel.querySelectorAll(selector)].filter(el=>!el.disabled&&!el.closest('[inert],[hidden]')&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
  if(!items.length)return;
  event.preventDefault();event.stopImmediatePropagation();
  const confirm=['Space','Enter','NumpadEnter'].includes(event.code);
  if(confirm&&event.repeat)return;
  const index=items.indexOf(focused);
  if(focused?.matches('input[type=range]')&&['KeyA','KeyD'].includes(event.code)){
   if(event.code==='KeyA')focused.stepDown();else focused.stepUp();
   focused.dispatchEvent(new Event('input',{bubbles:true}));focused.dispatchEvent(new Event('change',{bubbles:true}));return;
  }
  if(confirm){if(index>=0&&!focused.matches('input[type=range]'))focused.click();else if(index<0)items[0].focus();return;}
  let next;
  if(index<0)next=0;
  else if(pause||dialog?.id==='games-hub'||(dialog?.id==='settings-dialog'&&['KeyW','KeyS'].includes(event.code)))next=(index+(['KeyW','KeyA'].includes(event.code)?-1:1)+items.length)%items.length;
  else next=directionalChoice(items.map(el=>{const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};}),index,event.code);
  items[next].focus({preventScroll:true});items[next].classList.add('keyboard-menu-selected');
  if(dialog&&!pause)items[next].scrollIntoView({block:'nearest',inline:'nearest'});
 },true);
}
