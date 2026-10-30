// Use the existing result actions so saving, ad waits and Adventure routing stay intact.
export function bindResultKeyboard(host=window){
 const doc=host.document,dialog=doc.getElementById('over-dialog');
 const hint=doc.createElement('p');hint.className='result-keyboard-hint';hint.textContent='Space: Retry · Esc: Back';
 dialog.querySelector('.result-content').append(hint);
 const nextButton=doc.getElementById('adventure-continue');
 const syncHint=()=>{hint.textContent=!nextButton.hidden?'Space: '+nextButton.textContent.trim()+' · Esc: Back':'Esc: Back';};
 const observer=new MutationObserver(syncHint);observer.observe(nextButton,{attributes:true,childList:true,subtree:true});syncHint();
 function keydown(event){
  if(!dialog.open||!dialog.contains(event.target))return;
  if(!['Space','Enter','Escape'].includes(event.code)||event.altKey||event.ctrlKey||event.metaKey||event.isComposing)return;
  if(event.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  event.preventDefault();event.stopImmediatePropagation();
  if(event.repeat)return;
  const next=doc.getElementById('adventure-continue');
  if(event.code==='Escape'){dialog.click();return;}
  if(!next.hidden&&!next.disabled)next.click();else {const action=doc.getElementById('continue-ad');if(!action.hidden&&!action.disabled&&action.textContent.trim()==='Retry')action.click();else dialog.click();}
 }
 doc.addEventListener('keydown',keydown,true);
 return ()=>{observer.disconnect();doc.removeEventListener('keydown',keydown,true);hint.remove();};
}
