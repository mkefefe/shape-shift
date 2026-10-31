export const PRAISE_PHRASES=Object.freeze(['Excellent!','Impressive!','Perfect!']);
// Earned milestones, called only for ordinary correct Adventure/Endless guesses.
export const PRAISE_VOICE_GAP_MS=30000;
export function createPraiseDirector({speak=(text,onStart)=>globalThis.gameAudio?.speakPraise(text,onStart),now=()=>performance.now()}={}){
 // Shared across runs: retrying or missing must not restart the announcer cooldown.
 let lastSpokenAt=-Infinity;
 return {createRun(onPraise=()=>{}){
  let correct=0,colorChanges=0,epoch=0;
  const reset=()=>{correct=0;colorChanges=0;epoch++;};
  return {
   startRun:reset,miss:reset,
   success({colorChanged=false}={}){
    correct++;colorChanges=colorChanged?colorChanges+1:0;
    // Color milestones take priority when both qualify, avoiding overlapping voices.
    const phrase=colorChanges>0&&colorChanges%5===0?'Perfect!':correct===10?'Excellent!':correct===5?'Impressive!':null;
    if(phrase){
     const time=now();
     if(time-lastSpokenAt>=PRAISE_VOICE_GAP_MS){
      lastSpokenAt=time;const requestedEpoch=epoch;
      speak(phrase,()=>{if(epoch===requestedEpoch)onPraise(phrase);});
     }
    }return phrase;
   }
  };
 }};
}
export const praiseDirector=createPraiseDirector();
