import {trackQuests} from './quests.js?v=494237';
import {creditRestoration} from './world-rewards.js?v=494237';
import {flushResultStorage} from './result-storage.js?v=494237';

const valid=s=>s&&typeof s.id==='string'&&s.id.length<=100&&['endless','adventure','rush'].includes(s.mode)&&Number.isSafeInteger(s.score)&&s.score>=0;
const entry=s=>({id:s.id,mode:s.mode,difficulty:s.difficulty,ranked:!!s.ranked,score:s.score,picks:s.picks,date:s.date});
const history=(p,s)=>[entry(s),...(p.runs||[]).filter(r=>r.id!==s.id)].slice(0,30);
// The profile write containing this journal also contains every already-earned
// coin and XP. An ad offer is never the only place that remembers the result.
export function checkpointRunResult(profile,snapshot){
 if(!valid(snapshot))return profile;
 return {...profile,runs:history(profile,snapshot),pendingRunResult:structuredClone(snapshot)};
}
export function finalizeRunResult(profile,snapshot){
 if(!valid(snapshot))return profile;
 if((profile.finishedRunIds||[]).includes(snapshot.id)){
  if(profile.pendingRunResult?.id!==snapshot.id)return profile;
  const next={...profile};delete next.pendingRunResult;return next;
 }
 let next=trackQuests(profile,snapshot.questEvent||{type:'finish',mode:snapshot.mode,score:snapshot.score});
 if(snapshot.restoration)next=creditRestoration(next,snapshot.restoration).profile;
 next={...next,runs:history(next,snapshot),finishedRunIds:[...(next.finishedRunIds||[]),snapshot.id].slice(-100)};
 if(snapshot.ranked)next.pending=[structuredClone(snapshot.ranked),...(next.pending||[]).filter(r=>r.id!==snapshot.ranked.id)].slice(0,20);
 if(next.pendingRunResult?.id===snapshot.id)delete next.pendingRunResult;
 return next;
}
export function recoverRunResult(profile){return valid(profile.pendingRunResult)?finalizeRunResult(profile,profile.pendingRunResult):profile;}

// Mini-games store only the numeric result needed by their existing reward
// ledger, never the physics engine or canvas. Rewards remain deferred while a
// continue is possible, and are recovered through the normal idempotent ledger.
export function createResultJournal(storage,key,{flush=flushResultStorage}={}){
 return {
  read(){try{const row=JSON.parse(storage.getItem(key)||'null');return row&&typeof row.id==='string'&&row.result&&typeof row.result==='object'?row:null;}catch{return null;}},
  write(id,result){const snapshot={};for(const k of ['score','cleared','matches','bombPoints','bestCombo','sliced','bonusScore','hits','coins','time','frame'])if(typeof result[k]==='string'||Number.isFinite(result[k]))snapshot[k]=result[k];try{storage.setItem(key,JSON.stringify({id,result:snapshot}));void flush();return true;}catch{return false;}},
  clear(){try{storage.removeItem(key);void flush();return true;}catch{return false;}}
 };
}
