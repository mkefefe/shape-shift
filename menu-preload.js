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
const retained=new Map();
export async function prepareMenuImage(src){
 if(retained.has(src))return;
 const image=new Image();image.decoding='async';image.src=src;await image.decode();retained.set(src,image);
}
