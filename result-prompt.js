// Centre the dismissal prompt in the free space below the actual painted frame.
export function bindResultPrompt(dialog, hint, host=window){
 let frame=0;
 const update=()=>{
  frame=0;if(!dialog.open)return;
  const viewport=host.visualViewport;
  const bottom=(viewport?.offsetTop||0)+(viewport?.height||host.innerHeight);
  const rect=dialog.getBoundingClientRect();
  const scale=rect.height/(dialog.offsetHeight||rect.height)||1;
  dialog.style.setProperty('--result-prompt-gap',Math.max(0,(bottom-rect.bottom)/2/scale)+'px');
 };
 const queue=()=>{if(!frame)frame=host.requestAnimationFrame(update);};
 const resize=new host.ResizeObserver(queue);resize.observe(dialog);
 const mutation=new host.MutationObserver(queue);mutation.observe(dialog,{attributes:true,attributeFilter:['open','class'],childList:true,subtree:true});
 host.addEventListener('resize',queue);host.visualViewport?.addEventListener('resize',queue);host.visualViewport?.addEventListener('scroll',queue);
 dialog.addEventListener('animationend',queue);queue();
 return ()=>{resize.disconnect();mutation.disconnect();host.cancelAnimationFrame(frame);host.removeEventListener('resize',queue);host.visualViewport?.removeEventListener('resize',queue);host.visualViewport?.removeEventListener('scroll',queue);dialog.removeEventListener('animationend',queue);};
}
