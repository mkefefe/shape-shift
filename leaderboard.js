import {publicRankings} from './leaderboard-cache.js';
import {leaderboardAllowed} from './audience.js?v=cloud11';
// Public endpoint is enabled only after the score service is published for all players.
export const LEADERBOARD_URL='https://shape-shift-test-scores.mkplaycraftstudio.workers.dev';
const key='shape-shift-player-token';
let sessionEpoch=0;const inFlight=new Set();
function token(){let value=window.ShapeShiftPlatform.storage.getItem(key);if(!value){value=crypto.randomUUID()+crypto.randomUUID();window.ShapeShiftPlatform.storage.setItem(key,value);}return value;}
async function call(path,body,timeout=6000){
 if(!leaderboardAllowed()&&path!=='/api/delete'&&path!=='/api/leaderboard')throw Error('Online features are unavailable with these privacy settings.');
 if(!LEADERBOARD_URL)throw Error('Online leaderboard is not connected yet.');
 if(window.ShapeShiftPlatform.live)throw Error('Cloud rankings are available in the browser edition only.');const epoch=sessionEpoch,credential=body?token():null;const controller=new AbortController();inFlight.add(controller);const timer=setTimeout(()=>controller.abort(),timeout);
 try{const request=()=>{if(epoch!==sessionEpoch)throw Error('Ranking session changed.');return fetch(LEADERBOARD_URL+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','Authorization':'Bearer '+credential}:undefined,body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store',credentials:'omit'});};let r=await request();if(r.status===503&&path!=='/api/run'){await r.text();r=await request();}if(r.status===429&&path==='/api/profile'){await r.text();await new Promise(resolve=>setTimeout(resolve,1600));r=await request();}if(!r.ok){const error=Error('Leaderboard is temporarily unavailable.');error.status=r.status;throw error;}return await r.json();}finally{clearTimeout(timer);inFlight.delete(controller);}
}
// Each rules version binds the difficulty on the server before play begins.
export const RANKED_RULES=Object.freeze({easy:27,normal:28,hard:29,extreme:30});
const requestRankedRun=async(difficulty='normal')=>{const rules=RANKED_RULES[difficulty];if(!rules)throw Error('Invalid ranked difficulty');const run=await call('/api/run',{rules,protocol:2},6000);if(run.rules!==rules)throw Error('Score service update pending');return run;};
const preparedRuns=new Map();
export function prepareRankedRun(difficulty='normal'){
 const existing=preparedRuns.get(difficulty);
 if(existing&&Date.now()-existing.at<600000)return existing.promise;
 const epoch=sessionEpoch;const entry={at:Date.now(),promise:null};
 entry.promise=requestRankedRun(difficulty).then(run=>epoch===sessionEpoch?run:null).catch(()=>{if(preparedRuns.get(difficulty)===entry)preparedRuns.delete(difficulty);return null;});
 preparedRuns.set(difficulty,entry);return entry.promise;
}
export async function beginRankedRun(difficulty='normal'){
 if(!leaderboardAllowed())throw Error('Online features are unavailable with these privacy settings.');
 const pending=prepareRankedRun(difficulty);preparedRuns.delete(difficulty);
 const run=await pending;if(run?.protocol===2){saveProof(run.id,{nonce:run.nonce,count:0});return run;}return null;
}
export function resetRankedSession(){sessionEpoch++;for(const controller of inFlight)controller.abort();inFlight.clear();preparedRuns.clear();queues.clear();scheduled.clear();window.ShapeShiftPlatform.storage.removeItem('shape-shift-run-proofs-v2');}
const proofKey='shape-shift-run-proofs-v2';
const queues=new Map(),scheduled=new Map();
function proofs(){try{return JSON.parse(window.ShapeShiftPlatform.storage.getItem(proofKey)||'{}');}catch{return {};}}
function saveProof(id,proof){const all=proofs();all[id]={...proof,at:Date.now()};const entries=Object.entries(all).sort((a,b)=>b[1].at-a[1].at).slice(0,30);window.ShapeShiftPlatform.storage.setItem(proofKey,JSON.stringify(Object.fromEntries(entries)));}
export function trackRankedActions(run,actions,finish=false){
 if(!run)return Promise.resolve();
 if(!finish&&actions.length-(scheduled.get(run.id)??0)<16)return queues.get(run.id)||Promise.resolve();
 const epoch=sessionEpoch;const snapshot=actions.slice();scheduled.set(run.id,snapshot.length);
 const next=(queues.get(run.id)||Promise.resolve()).catch(()=>{}).then(async()=>{
  if(epoch!==sessionEpoch)return;
  let proof=proofs()[run.id];
  if(!proof){const e=Error('This saved run has no online verification checkpoints.');e.status=422;throw e;}
  while(snapshot.length-proof.count>=(finish?1:16)){
   const batch=snapshot.slice(proof.count,proof.count+16);
   const updated=await call('/api/checkpoint',{id:run.id,nonce:proof.nonce,offset:proof.count,actions:batch},10000);
   if(updated.count!==proof.count+batch.length||typeof updated.nonce!=='string')throw Error('Invalid verification response');
   if(epoch!==sessionEpoch)return;proof=updated;saveProof(run.id,proof);
  }
 });
 queues.set(run.id,next);next.catch(()=>{scheduled.set(run.id,proofs()[run.id]?.count||0);});return next;
}
export async function submitRankedRun(run){await trackRankedActions(run,run.actions,true);const result=await call('/api/finish',run,15000);queues.delete(run.id);return result;}
export const ownerAccess=()=>call('/api/owner',{});
export const setOwnerAdmin=enabled=>call('/api/admin',{enabled});
export const loadLeaderboard=()=>publicRankings(()=>call('/api/leaderboard',undefined,12000));

export const saveOnlineProfile=identity=>call('/api/profile',{name:identity.name,avatar:Number.isInteger(identity.avatar)?identity.avatar:0,frame:identity.frame},10000);
export const deleteOnlineProfile=()=>call('/api/delete',{},10000);

// Compact public reference only; authorization and deletion retain the full ID.
export function compactPlayerId(hash){
 if(!/^[a-f0-9]{64}$/i.test(hash))throw new Error('Invalid player ID');
 return String(100000000n+BigInt('0x'+hash)%900000000n);
}

// Match the full server ID, never the short public reference or display name.
export async function currentPlayerId(){
 const value=window.ShapeShiftPlatform.storage.getItem(key);
 if(!value)return null;
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
}
export function identifyLeaderboardEntries(entries,playerId,identity){
 return entries.map(row=>{
  const isYou=typeof playerId==='string'&&/^[a-f0-9]{64}$/.test(playerId)&&row.id===playerId;
  return {...row,isYou,...(isYou?{name:identity.name,avatar:identity.avatar,frame:identity.frame}:{} )};
 });
}
