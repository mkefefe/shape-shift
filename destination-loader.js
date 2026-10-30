// Keep optional destination failures local and let the player return immediately.
export function loadDestination(title,prepare,{signal}={}){
 if(signal?.aborted)return Promise.resolve(false);
 const dialog=document.createElement('dialog'),content=document.createElement('div');
 content.className='dialog-content';const heading=document.createElement('h2'),message=document.createElement('p'),retry=document.createElement('button'),back=document.createElement('button');
 heading.textContent=title;heading.hidden=true;dialog.setAttribute('style','border:1px solid #b0ecff55;border-image:none;border-radius:20px;background:#073953ee;color:white;width:min(280px,85vw);height:auto;min-height:0;padding:18px;text-align:center;box-shadow:0 8px 30px #001b3766');message.setAttribute('role','status');retry.className='primary';retry.textContent='Try again';back.className='secondary';back.textContent='Back';content.append(heading,message,retry,back);dialog.append(content);document.body.append(dialog);
 return new Promise(resolve=>{let closed=false;const nativeClose=dialog.close.bind(dialog);const show=()=>{if(!closed&&!dialog.open)dialog.showModal();};const pending=setTimeout(show,900);
  const abort=()=>finish(false);
  const finish=value=>{if(closed)return;closed=true;clearTimeout(pending);signal?.removeEventListener('abort',abort);nativeClose();dialog.remove();resolve(value);};
  dialog.close=()=>finish(false);
  const run=async()=>{retry.hidden=true;message.textContent='Getting ready…';try{await prepare();finish(true);}catch{if(!closed){show();message.textContent='Could not load this screen. Please try again.';retry.hidden=false;}}};
  signal?.addEventListener('abort',abort,{once:true});dialog.addEventListener('close',abort,{once:true});back.onclick=abort;dialog.oncancel=e=>{e.preventDefault();finish(false);};retry.onclick=run;run();
 });
}
