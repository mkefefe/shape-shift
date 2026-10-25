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
 let timer;
 try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' timed out')),timeout);})]);}
 finally{clearTimeout(timer);}
}
export function decodeMenuImage(image){return awaitReady(image.decode(),'Image preparation');}
// Retain decoded art and share concurrent requests; a failed load may be retried.
const retained=new Map(),pending=new Map();
export function prepareMenuImage(src){
 if(retained.has(src))return Promise.resolve(retained.get(src));
 if(pending.has(src))return pending.get(src);
 const loading=(async()=>{const image=new Image();image.decoding='async';image.src=src;try{await decodeMenuImage(image);}catch(error){image.src='';throw error;}retained.set(src,image);return image;})();
 pending.set(src,loading);
 loading.then(()=>pending.delete(src),()=>pending.delete(src));
 return loading;
}
