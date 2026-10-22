export function shouldOfferContinue(mode,state,finalize=false){
 return (mode==='endless'||mode==='adventure')&&state?.over===true&&!state.continued&&!finalize;
}
// A foreground-only countdown; background/ad transitions cannot skip its steps.
export const CONTINUE_STEP_MS=700;
export function countdownNumber(elapsed){return Math.max(0,3-Math.floor(elapsed/CONTINUE_STEP_MS));}
export function runContinueCountdown(onStep,{cancelled=()=>false,visible=()=>!window.ShapeShiftPlatform.paused,raf=window.ShapeShiftPlatform.requestAnimationFrame,now=window.ShapeShiftPlatform.now.bind(performance)}={}){
 return new Promise(resolve=>{let elapsed=0,last=now(),number=3;onStep(number);
  function tick(time){if(cancelled()){resolve(false);return;}const delta=Math.min(100,Math.max(0,time-last));last=time;if(visible())elapsed+=delta;
   const next=countdownNumber(elapsed);if(next!==number){number=next;if(number)onStep(number);}
   if(!number){resolve(true);return;}raf(tick);
  }raf(tick);
 });
}

export function startResultCountdown(onStep,onDone,{visible=()=>!window.ShapeShiftPlatform.paused,now=()=>window.ShapeShiftPlatform.now(),schedule=fn=>window.ShapeShiftPlatform.setInterval(fn,100),unschedule=id=>window.ShapeShiftPlatform.clearInterval(id)}={}){
 let elapsed=0,last=now(),number=5,stopped=false,id;onStep(number);
 const cancel=()=>{stopped=true;if(id!==undefined)unschedule(id);};
 id=schedule(()=>{if(stopped)return;const time=now(),delta=Math.min(250,Math.max(0,time-last));last=time;if(visible())elapsed+=delta;const next=Math.max(0,Math.ceil((5000-elapsed)/1000));if(next!==number){number=next;onStep(number);}if(!number){cancel();onDone();}});
 return cancel;
}

// Display-only tally: never awards currency or changes the saved run.
export function startResultTally(score,coins,onUpdate,onCue,{visible=()=>!window.ShapeShiftPlatform.paused,now=()=>window.ShapeShiftPlatform.now(),schedule=fn=>window.ShapeShiftPlatform.setInterval(fn,40),unschedule=id=>window.ShapeShiftPlatform.clearInterval(id),reduced=false}={}){
 let elapsed=0,last=now(),stopped=false,id,previousScore=0,previousCoins=0,lastCue=-200;
 const length=reduced?320:1700;onUpdate(0,0,0);
 const cancel=()=>{stopped=true;if(id!==undefined)unschedule(id);};
 id=schedule(()=>{if(stopped)return;const time=now(),delta=Math.min(100,Math.max(0,time-last));last=time;if(!visible())return;elapsed+=delta;
 const t=Math.min(1,elapsed/length),ease=1-(1-t)**3;
 const a=Math.floor(score*ease),b=Math.floor(coins*ease);onUpdate(a,b,ease);
 if(elapsed-lastCue>=110&&(a!==previousScore||b!==previousCoins)){onCue(b!==previousCoins?'result-coin-tick':'result-score-tick');lastCue=elapsed;}
 previousScore=a;previousCoins=b;
 if(t===1){cancel();onUpdate(score,coins,1);if(score||coins)onCue('result-tally-done');}
 });return cancel;
}
