// One background job at a time; yield between jobs and stop scheduling during play.
export function createMenuPreloader({idle, schedule=fn=>window.ShapeShiftPlatform.setTimeout(fn,80)}={}){
 const jobs=[],keys=new Set();let running=false;
 async function pump(){
  if(!jobs.length){running=false;return;}
  if(!idle()){window.ShapeShiftPlatform.setTimeout(()=>schedule(pump),500);return;}
  const job=jobs.shift();try{await job();}catch{}schedule(pump);
 }
 return {add(key,job){if(keys.has(key))return;keys.add(key);jobs.push(job);if(!running){running=true;schedule(pump);}}};
}
export async function awaitReady(promise,label='Game assets',timeout=20000){
 const doc=globalThis.document;let timer,remaining=timeout,started;
 let visibility;
 try{return await Promise.race([promise,new Promise((_,reject)=>{
  const arm=()=>{started=performance.now();timer=setTimeout(()=>reject(Error(label+' timed out')),remaining);};
  visibility=()=>{clearTimeout(timer);if(started!==undefined){remaining=Math.max(0,remaining-(performance.now()-started));started=undefined;}if(!doc?.hidden)arm();};
  doc?.addEventListener?.('visibilitychange',visibility);
  if(!doc?.hidden)arm();
 })]);}finally{clearTimeout(timer);doc?.removeEventListener?.('visibilitychange',visibility);}
}
export function createPreparationQueue(limit=4){
 const queue=[];let active=0;
 const pump=()=>{while(active<limit&&queue.length){const {run,resolve,reject}=queue.shift();active++;
  Promise.resolve().then(run).then(resolve,reject).finally(()=>{active--;pump();});
 }};
 return run=>new Promise((resolve,reject)=>{queue.push({run,resolve,reject});pump();});
}
const prepareArt=createPreparationQueue(4),decoding=new WeakMap();
export function decodeMenuImage(image){
 if(!decoding.has(image)){
  const pending=prepareArt(()=>awaitReady(image.decode(),'Image preparation'));
  decoding.set(image,pending);pending.then(()=>decoding.delete(image),()=>decoding.delete(image));
 }
 return decoding.get(image);
}
// Retain decoded art and share concurrent requests; a failed load may be retried.
const retained=new Map(),pending=new Map();
export function prepareMenuImage(src){
 const key=new URL(src,globalThis.document?.baseURI||import.meta.url).href;
 if(retained.has(key))return Promise.resolve(retained.get(key));
 if(pending.has(key))return pending.get(key);
 const loading=prepareArt(async()=>{const image=new Image();image.decoding='async';image.src=src;try{await awaitReady(image.decode(),'Image preparation');}catch(error){image.src='';throw error;}retained.set(key,image);return image;});
 pending.set(key,loading);
 loading.then(()=>pending.delete(key),()=>pending.delete(key));
 return loading;
}
