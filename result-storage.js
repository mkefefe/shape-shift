// This module intentionally has no mode/asset imports: startup can discover
// unfinished reward recovery without downloading every game engine.
export const RESULT_KEYS=Object.freeze({drop:'shape-shift-drop-v1',slice:'shape-shift-slice-v1',piano:'shape-shift-piano-v1'});
export function pendingResultModes(storage){
 return Object.entries(RESULT_KEYS).filter(([,key])=>{
  try{return !!storage.getItem(key+'-continue-result')||JSON.parse(storage.getItem(key)||'null')?.pending?.length>0;}catch{return false;}
 }).map(([mode])=>mode);
}

export async function flushResultStorage(platform=globalThis.window?.ShapeShiftPlatform){
 try{await platform?.flush?.();return true;}catch{return false;}
}

// A journal remains recoverable until its result is committed. Failure blocks a
// new run from replacing that journal. Completed IDs prevent replaying quests
// or rewards if a process stops between the commit and journal removal.
export function recoverJournaledResult({journal,progress,finish,persist,onRecovered=()=>{}}){
 const row=journal.read();if(!row)return true;
 const completed=(progress.completedRuns||[]).includes(row.id)||(progress.pending||[]).some(e=>e.id===row.id);
 const next=finish(progress,row.result,row.id);
 if(!persist(next))return false;
 const cleared=journal.clear();
 if(!completed)onRecovered(row.result);
 return cleared!==false;
}
