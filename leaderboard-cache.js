// Public snapshots only: no installation credentials or private run data.
const CACHE_KEY='shape-shift-public-rankings-v1';
const PERSONAL_KEY='shape-shift-personal-ranking-v1';
const playerId=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
function valid(data){return data&&Array.isArray(data.entries)&&data.entries.length<=100&&data.entries.every(row=>row&&typeof row.id==='string'&&typeof row.name==='string'&&Number.isFinite(row.score)&&row.score>=0);}
export function readPublicRankings(storage=globalThis.window.ShapeShiftPlatform.storage){try{const cached=JSON.parse(storage?.getItem(CACHE_KEY)||'null');if(valid(cached)&&Number.isFinite(cached.savedAt))return {...cached,cached:true};}catch{}return null;}
export async function publicRankings(fetchBoard,storage=globalThis.window.ShapeShiftPlatform.storage){
 try{
  const data=await fetchBoard();if(!valid(data))throw Error('Invalid leaderboard response');
  try{storage?.setItem(CACHE_KEY,JSON.stringify({entries:data.entries,players:data.players,savedAt:Date.now()}));}catch{}
  return data;
 }catch(error){
  const cached=readPublicRankings(storage);if(cached)return cached;
  throw error;
 }
}
function validPersonal(data,id){
 if(!playerId(id)||!data||!Number.isSafeInteger(data.players)||data.players<0||typeof data.ranked!=='boolean')return false;
 if(data.entry===null)return data.ranked===false;
 const e=data.entry;
 return data.ranked===true&&e?.id===id&&typeof e.name==='string'&&Number.isSafeInteger(e.score)&&e.score>=0&&Number.isSafeInteger(e.rank)&&e.rank>0&&e.rank<=data.players&&Number.isSafeInteger(e.runs)&&e.runs>=0&&Number.isFinite(e.updatedAt);
}
export function clearPersonalRanking(storage=globalThis.localStorage){try{storage?.removeItem(PERSONAL_KEY);}catch{}}
export function readPersonalRanking(id,storage=globalThis.localStorage){
 try{const cached=JSON.parse(storage?.getItem(PERSONAL_KEY)||'null');if(cached?.playerId===id&&validPersonal(cached,id)&&Number.isFinite(cached.savedAt))return {...cached,cached:true};}catch{}
 return null;
}
export async function personalRankings(fetchPersonal,id,storage=globalThis.localStorage,{isCurrent=()=>true,now=()=>Date.now()}={}){
 if(!playerId(id))throw Error('Invalid ranking identity');
 try{
  const data=await fetchPersonal();if(!isCurrent())throw Object.assign(Error('Ranking session changed.'),{code:'SESSION_CHANGED'});
  if(!validPersonal(data,id))throw Error('Invalid personal ranking response');
  const result={entry:data.entry,players:data.players,ranked:data.ranked,playerId:id,savedAt:now()};
  try{storage?.setItem(PERSONAL_KEY,JSON.stringify(result));}catch{}
  return result;
 }catch(error){
  if(!isCurrent()||error.code==='SESSION_CHANGED')throw error;
  const cached=readPersonalRanking(id,storage);if(cached)return cached;
  throw error;
 }
}
export function rankingLoadMessage(error,hasRows=false){
 if(hasRows)return 'Could not refresh. Showing the last loaded rankings.';
 if(error?.name==='AbortError')return 'The leaderboard took too long to respond. Tap Retry.';
 if(error?.status===429)return 'The leaderboard is busy. Try again shortly.';
 return 'Could not load rankings. Check your connection and tap Retry.';
}
