export const BATTLE_REWARDS_KEY='shape-shift-battle-rewards-v1';

// The child reports gameplay events, never currency amounts. The host decides
// the award and owns the wallet transaction. Receipts survive message retries.
export function createBattleRewards({storage,onReward=()=>false,enabled=()=>true,createId=()=>crypto.randomUUID()}){
 let runId=null,lastSeq=0;
 const cleared=new Set();
 try{const saved=JSON.parse(storage.getItem(BATTLE_REWARDS_KEY));for(const id of saved?.cleared||[])if(Number.isInteger(id)&&id>=1&&id<=30)cleared.add(id);}catch{}
 function save(){try{storage.setItem(BATTLE_REWARDS_KEY,JSON.stringify({version:1,cleared:[...cleared].sort((a,b)=>a-b)}));return true;}catch{return false;}}
 function begin(){runId=createId();lastSeq=0;return runId;}
 function end(){runId=null;lastSeq=0;}
 function accept(event){
  if(!runId||!event||event.runId!==runId||!Number.isSafeInteger(event.seq)||event.seq<1||!['match','clear'].includes(event.kind)||!Number.isInteger(event.encounter)||event.encounter<1||event.encounter>30)return null;
  if(event.seq<=lastSeq)return {accepted:true,duplicate:true};
  // postMessage is ordered, and the child keeps one event in flight at a time.
  if(event.seq!==lastSeq+1)return null;
  if(!enabled()){lastSeq=event.seq;return {accepted:true,excluded:true};}
  if(event.kind==='clear'&&cleared.has(event.encounter)){lastSeq=event.seq;save();return {accepted:true,duplicate:true};}
  const boss=event.kind==='clear'&&event.encounter%5===0;
  const award={mode:'battle',coins:event.kind==='match'?1:boss?15:5,xp:event.kind==='match'?3:boss?25:10,receipt:event.kind==='match'?`battle:match:${runId}:${event.seq}`:`battle:clear:${event.encounter}`,kind:event.kind,encounter:event.encounter};
  let credited;
  try{credited=onReward(award);}catch{return {accepted:false};}
  // A synchronous host transaction is required; do not acknowledge an unpaid
  // event or race another event while an asynchronous callback is still saving.
  if(credited===false||credited?.then)return {accepted:false};
  lastSeq=event.seq;
  if(event.kind==='clear'){cleared.add(event.encounter);save();}
  return {accepted:true,award};
 }
 return {begin,end,accept};
}
