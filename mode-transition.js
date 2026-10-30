// Use the image load event as the drawable barrier. Some Android WebViews reject
// Image.decode() even after an image is successfully loaded and drawable.
let gateImage;
export function loadGateImage(ImageClass=Image){
 if(gateImage)return gateImage;
 gateImage=new Promise((resolve,reject)=>{
  const image=new ImageClass();let finished=false;
  const timer=setTimeout(()=>finish(Error('Door artwork timed out')),20000);
  function finish(error){if(finished)return;finished=true;clearTimeout(timer);image.onload=image.onerror=null;if(error)reject(error);else resolve(image);}
  image.onload=()=>image.naturalWidth>0?finish():finish(Error('Door artwork is empty'));
  image.onerror=()=>finish(Error('Door artwork could not load'));
  image.src=new URL('assets/transition-gate-v115.png',import.meta.url).href;
  if(image.complete&&image.naturalWidth>0)finish();
 });
 gateImage.catch(()=>{gateImage=null;});return gateImage;
}
export function prepareGateVisual(load=loadGateImage,audio=()=>window.gameAudio?.prepareGate?.()){
 Promise.resolve().then(audio).catch(error=>console.warn('Door audio unavailable',error));
 return load();
}
export const GATE_TIMING=Object.freeze({close:400,impact:360,turn:650,turnDuration:750,settle:100,openDuration:650});
export const GATE_ZOOM_FRAMES=Object.freeze([{transform:'scale(1)',offset:0},{transform:'scale(1.035)',offset:.65},{transform:'scale(1)',offset:1}].map(Object.freeze));
export let transitioning=false;
const clamp=n=>Math.min(1,Math.max(0,n)),ease=n=>{n=clamp(n);return n*n*(3-2*n);};
export function gateFrame(ms,releaseAt=Infinity){
 const turnAt=Math.max(GATE_TIMING.turn,releaseAt),openAt=turnAt+GATE_TIMING.turnDuration+GATE_TIMING.settle;
 return {enter:ease(ms/GATE_TIMING.close),rotation:ease((ms-turnAt)/GATE_TIMING.turnDuration)*Math.PI/2,opening:ease((ms-openAt)/GATE_TIMING.openDuration),zoom:1+.06*ease((ms-openAt)/GATE_TIMING.openDuration),done:ms>=openAt+GATE_TIMING.openDuration,turnAt,openAt};
}
export function beginModeTransition(title,{preparingStartup=false}={}){
 if(preparingStartup)return {covered:Promise.resolve(),reveal:async(paint)=>{await paint?.();},dispose(){}};
 const host=document.createElement('div'),shadow=host.attachShadow({mode:'open'});
 const style=document.createElement('style');style.textContent='dialog{position:fixed;inset:0;margin:0;width:100vw;height:100dvh;max-width:none;max-height:none;border:0;padding:0;background:#10233b;color:#fff;display:grid;place-items:center;font:700 20px system-ui}dialog::backdrop{background:#10233b}';
 const cover=document.createElement('dialog');cover.textContent='Loading…';cover.setAttribute('aria-label','Loading '+title);shadow.append(style,cover);document.body.append(host);cover.showModal();transitioning=true;
 let disposed=false;
 const observer=new MutationObserver(()=>{if(!disposed){cover.close();cover.showModal();}});
 observer.observe(document.getElementById('app')||document.body,{subtree:true,attributes:true,attributeFilter:['open']});
 function dispose(){if(disposed)return;disposed=true;observer.disconnect();cover.close();host.remove();transitioning=false;}
 cover.oncancel=e=>e.preventDefault();
 return {covered:Promise.resolve(),dispose,async reveal(paint){try{await paint?.();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}finally{dispose();}}};
}
