// Keep optional destination failures local and let the player return immediately.
export function loadDestination(title,prepare){
 const dialog=document.createElement('dialog'),content=document.createElement('div');
 content.className='dialog-content';const heading=document.createElement('h2'),message=document.createElement('p'),retry=document.createElement('button'),back=document.createElement('button');
 heading.textContent=title;message.setAttribute('role','status');retry.className='primary';retry.textContent='Try again';back.className='secondary';back.textContent='Back';content.append(heading,message,retry,back);dialog.append(content);document.body.append(dialog);dialog.showModal();
 return new Promise(resolve=>{let closed=false;
  const finish=value=>{if(closed)return;closed=true;dialog.close();dialog.remove();resolve(value);};
  const run=async()=>{retry.hidden=true;message.textContent='Loading…';try{await prepare();finish(true);}catch{if(!closed){message.textContent='Could not load this screen. Please try again.';retry.hidden=false;}}};
  back.onclick=()=>finish(false);dialog.oncancel=e=>{e.preventDefault();finish(false);};retry.onclick=run;run();
 });
}
