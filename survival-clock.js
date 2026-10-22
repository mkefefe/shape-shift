// Monotonic active-play clock. Rendering stalls do not shorten recorded survival time.
export function createSurvivalClock(now=()=>window.ShapeShiftPlatform.now()){
 let total=0,started=null;
 return {
  reset(){total=0;started=null;},
  setRunning(running){
   const at=now();
   if(running&&started===null)started=at;
   else if(!running&&started!==null){total+=Math.max(0,at-started);started=null;}
  },
  elapsed(){return total+(started===null?0:Math.max(0,now()-started));}
 };
}
export function formatSurvivalTime(milliseconds){
 const seconds=Math.floor(Math.max(0,Number.isFinite(milliseconds)?milliseconds:0)/1000);
 const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds/60)%60,rest=String(seconds%60).padStart(2,'0');
 return hours?hours+':'+String(minutes).padStart(2,'0')+':'+rest:minutes+':'+rest;
}
