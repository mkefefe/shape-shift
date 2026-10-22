// Use the existing result actions so saving, ad waits and Adventure routing stay intact.
export function bindResultKeyboard(host=window){
 const doc=host.document,dialog=doc.getElementById('over-dialog');
 const hint=doc.createElement('p');hint.className='result-keyboard-hint';hint.textContent='Press Space, Enter or Esc to continue';
 dialog.querySelector('.result-content').append(hint);
 function keydown(event){
  if(!dialog.open||!dialog.contains(event.target))return;
  if(!['Space','Enter','Escape'].includes(event.code)||event.altKey||event.ctrlKey||event.metaKey||event.isComposing)return;
  if(event.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  event.preventDefault();event.stopImmediatePropagation();
  if(event.repeat)return;
  const next=doc.getElementById('adventure-continue');
  if(!next.hidden&&!next.disabled)next.click();else dialog.click();
 }
 doc.addEventListener('keydown',keydown,true);
 return ()=>{doc.removeEventListener('keydown',keydown,true);hint.remove();};
}
