// Pause menus use their existing buttons, so resume/end/save actions keep their guards.
export function bindPauseKeyboard(doc=document){
 doc.addEventListener('focusin',event=>{doc.querySelectorAll('.keyboard-menu-selected').forEach(el=>{if(el!==event.target)el.classList.remove('keyboard-menu-selected');});});
 doc.addEventListener('keydown',event=>{
  if(!['KeyW','KeyS','Space','Enter','NumpadEnter'].includes(event.code)||event.ctrlKey||event.altKey||event.metaKey||event.isComposing||event.target.closest?.('input,textarea,select,[contenteditable]'))return;
  const dialog=doc.activeElement?.closest('dialog[open]');if(!dialog)return;
  const panel=dialog.id==='pause-dialog'?dialog:dialog.dataset.paused==='true'?dialog.querySelector('.drop-pause-panel'):null;
  if(!panel)return;
  const items=[...panel.querySelectorAll(dialog.id==='pause-dialog'?'#resume,.pause-option':'button')].filter(button=>!button.disabled&&!button.closest('[inert]')&&button.getClientRects().length);
  if(!items.length)return;
  event.preventDefault();event.stopImmediatePropagation();if(event.repeat)return;
  const index=items.indexOf(doc.activeElement);
  if(['Space','Enter','NumpadEnter'].includes(event.code)){if(index>=0)items[index].click();else items[0].focus();return;}
  const next=index<0?(event.code==='KeyW'?items.length-1:0):(index+(event.code==='KeyS'?1:-1)+items.length)%items.length;
  items[next].focus({preventScroll:true});items[next].classList.add('keyboard-menu-selected');
 },true);
}
