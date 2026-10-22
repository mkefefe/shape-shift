// Public snapshots only: no installation credentials or private run data.
const CACHE_KEY='shape-shift-public-rankings-v1';
function valid(data){return data&&Array.isArray(data.entries)&&data.entries.length<=100&&data.entries.every(row=>row&&typeof row.id==='string'&&typeof row.name==='string'&&Number.isFinite(row.score)&&row.score>=0);}
export async function publicRankings(fetchBoard,storage=globalThis.window.ShapeShiftPlatform.storage){
 try{
  const data=await fetchBoard();if(!valid(data))throw Error('Invalid leaderboard response');
  try{storage?.setItem(CACHE_KEY,JSON.stringify({entries:data.entries,players:data.players,savedAt:Date.now()}));}catch{}
  return data;
 }catch(error){
  try{const cached=JSON.parse(storage?.getItem(CACHE_KEY)||'null');if(valid(cached)&&Number.isFinite(cached.savedAt))return {...cached,cached:true};}catch{}
  throw error;
 }
}
export function rankingLoadMessage(error,hasRows=false){
 if(hasRows)return 'Could not refresh. Showing the last loaded rankings.';
 if(error?.name==='AbortError')return 'The leaderboard took too long to respond. Tap Retry.';
 if(error?.status===429)return 'The leaderboard is busy. Try again shortly.';
 return 'Could not load rankings. Check your connection and tap Retry.';
}
