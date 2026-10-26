import {DROP_MERGE_BURST_AT} from './drop-merge-fx.js?v=49499';

// Follow the same active-game clock as the visuals. No delayed callbacks can
// outlive a paused, closed, or restarted run.
export function createDropMergeAudio(play){
 let pending=[],lastMerge=-Infinity,lastStep=-Infinity;
 function reset(){pending=[];lastMerge=-Infinity;lastStep=-Infinity;}
 return {
  merge(now){
   if(!Number.isFinite(now)||now<0)return false;
   if(now<lastStep||now<lastMerge)reset();
   if(now-lastMerge<.09)return false;
   lastMerge=now;pending.push(now+DROP_MERGE_BURST_AT);pending=pending.slice(-24);
   play('drop-merge-start');return true;
  },
  step(now){
   if(!Number.isFinite(now))return false;
   if(now<lastStep){reset();lastStep=now;return false;}
   lastStep=now;
   const due=pending.some(at=>at<=now&&now-at<=.2);
   pending=pending.filter(at=>at>now);
   if(due)play('drop-merge-burst');
   return due;
  },
  reset
 };
}
