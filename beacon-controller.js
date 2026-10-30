import {STORY_KEY,STORY_MILESTONES,migrateStory,recordStoryClear,markStorySeen,storySummary} from './story-progress.js?v=494198';

export const CHARGE_KEY='shape-shift-beacon-charges-v1';

// A single restoration is earned by clearing Adventure. Older charge balances
// are deliberately ignored: only a recorded completed ending restores the island.
export function createBeaconController({storage,adventure,admin=false,adminBackup=null,showScene,settings=()=>({}),beforeScene=()=>{},afterScene=()=>{},changed=()=>{}}){
 const read=key=>{try{return JSON.parse(storage.getItem(key));}catch{return null;}};
 let state=migrateStory(read(STORY_KEY),adventure,{admin,adminBackup});
 let busy=false,current=null,notice=false;
 function summary(){
  const progress=storySummary(state),complete=progress.restored;
  const ready=progress.adventureComplete&&!complete?STORY_MILESTONES[0]:null;
  return {...progress,complete,ready,availableCharges:ready?1:0,restoredPercent:complete?100:0,freeSpark:false};
 }
 function notify(){try{changed();}catch{}}
 function persist(){
  try{
   storage.setItem(STORY_KEY,JSON.stringify(state));
   storage.setItem(CHARGE_KEY,JSON.stringify({version:2,spent:summary().complete?['ending']:[]}));
  }catch{}
  notify();
 }
 async function play(id){
  if(busy)return {completed:false,busy:true};
  busy=true;notify();let outcome={completed:false};
  try{
   beforeScene();current=showScene({...settings(),scene:id,autoplay:id==='credits'});outcome=await current||outcome;
   if(outcome.completed===true&&!outcome.failed&&!outcome.skipped&&!outcome.cancelled){
    state=markStorySeen(state,id);persist();
   }
  }catch{outcome={completed:false,failed:true};}
  finally{current=null;busy=false;try{afterScene();}catch{}notify();}
  return outcome;
 }
 persist();
 return {
  summary,snapshot:()=>JSON.parse(JSON.stringify(state)),isPlaying:()=>busy,
  charge:()=>summary().ready?play('ending'):Promise.resolve({completed:false,unavailable:true}),
  record(entry){
   const result=recordStoryClear(state,{...entry,admin:admin||entry?.admin===true});state=result.state;
   if(result.scene)notice=true;if(result.added)persist();return result;
  },
  takeMilestoneNotice(){const ready=notice&&!!summary().ready;notice=false;return ready;},
  beforeAdventure:async()=>{},onFirstOpen:async()=>{},afterResults:async()=>{},
  replayCredits:()=>summary().complete?play('credits'):Promise.resolve({completed:false,unavailable:true}),
  cancel:()=>current?.cancel?.()
 };
}
