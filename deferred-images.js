// Hidden menu images must not compete with the first playable board.
export function observeDeferredImages(root=document){
 const reveal=()=>{if(root.documentElement.classList.contains('startup-loading'))return;for(const image of root.querySelectorAll('img[data-src]')){
  if(!image.getClientRects().length)continue;
  image.src=image.dataset.src;delete image.dataset.src;
 }};
 let queued=false;
 const update=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;reveal();});};
 new MutationObserver(update).observe(root.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','open','class','data-screen','data-playables-ready']});
 update();return reveal;
}
