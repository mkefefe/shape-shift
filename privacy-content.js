// Keep policy content inside the game and let the native shell open external links.
const boundRoots=new WeakSet(),pendingPolicies=new WeakMap();
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
export function loadPrivacyContent(host,{fetcher=fetch,timeout=20000}={}){
 if(host.dataset.loaded==='yes')return Promise.resolve(true);
 if(pendingPolicies.has(host))return pendingPolicies.get(host);
 host.dataset.loading='yes';host.textContent='Loading privacy policy…';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 const pending=Promise.resolve().then(async()=>{
 try{
  const response=await fetcher(new URL('./privacy.html',import.meta.url),{signal:controller.signal});if(!response.ok)throw Error();
  const page=new DOMParser().parseFromString(await response.text(),'text/html');
  const main=page.querySelector('main');if(!main)throw Error();
  host.replaceChildren(...Array.from(main.childNodes,node=>document.importNode(node,true)));
  bindSupportLinks(host);host.dataset.loaded='yes';return true;
 }catch{
  host.textContent='Privacy policy could not load. ';const retry=document.createElement('button');retry.type='button';retry.textContent='Try again';retry.onclick=()=>loadPrivacyContent(host);host.append(retry);return false;
 }finally{clearTimeout(timer);delete host.dataset.loading;pendingPolicies.delete(host);}
 });
 pendingPolicies.set(host,pending);return pending;
}
