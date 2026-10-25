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
// Retain decoded art and share concurrent requests; a failed load may be retried.
const retained=new Map(),pending=new Map();
export function prepareMenuImage(src){
 if(retained.has(src))return Promise.resolve(retained.get(src));
 if(pending.has(src))return pending.get(src);
 const loading=(async()=>{const image=new Image();image.decoding='async';image.src=src;let timer;try{await Promise.race([image.decode(),new Promise((_,reject)=>{timer=setTimeout(()=>{image.src='';reject(Error('Image load timed out: '+src));},20000);})]);}finally{clearTimeout(timer);}retained.set(src,image);return image;})();
 pending.set(src,loading);
 loading.then(()=>pending.delete(src),()=>pending.delete(src));
 return loading;
}
