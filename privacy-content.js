// Keep policy content inside the game and let the native shell open external links.
const boundRoots=new WeakSet();
export function openSupportLink(value,host=window){
 const url=new URL(value,host.location.href);
 if(!['https:','mailto:'].includes(url.protocol))return false;
 if(host.ShapeShiftLinks){host.ShapeShiftLinks.open(url.href);return true;}
 if(url.protocol==='mailto:'){host.location.href=url.href;return true;}
 host.open(url.href,'_blank','noopener,noreferrer');return true;
}
export function bindSupportLinks(root){
 if(boundRoots.has(root))return;
 boundRoots.add(root);
 root.addEventListener('click',event=>{
  if(event.defaultPrevented)return;
  const link=event.target.closest('a[href]');if(!link||!root.contains(link))return;
  const url=new URL(link.href,location.href);
  if(!['https:','mailto:'].includes(url.protocol)){event.preventDefault();return;}
  if(window.ShapeShiftLinks){event.preventDefault();openSupportLink(url.href);}
  else if(url.protocol==='https:'){link.target='_blank';link.rel='noopener noreferrer';}
 });
}
export async function loadPrivacyContent(host){
 if(host.dataset.loaded==='yes')return true;
 if(host.dataset.loading==='yes')return false;
 host.dataset.loading='yes';host.textContent='Loading privacy policy…';
 try{
  const response=await fetch(new URL('./privacy.html',import.meta.url));if(!response.ok)throw Error();
  const page=new DOMParser().parseFromString(await response.text(),'text/html');
  const main=page.querySelector('main');if(!main)throw Error();
  host.replaceChildren(...Array.from(main.childNodes,node=>document.importNode(node,true)));
  bindSupportLinks(host);host.dataset.loaded='yes';return true;
 }catch{
  host.textContent='Privacy policy could not load. ';const retry=document.createElement('button');retry.type='button';retry.textContent='Try again';retry.onclick=()=>loadPrivacyContent(host);host.append(retry);return false;
 }finally{delete host.dataset.loading;}
}
