import {STORY_KEY,migrateStory,recordStoryClear,markStorySeen,storySummary,availableStoryScenes} from './story-progress.js?v=49439-web4';

// The controller waits for explicit completion/Skip, but it never makes a
// failed media load a prerequisite for starting a level or leaving results.
export function createStoryController({storage,adventure,admin=false,adminBackup=null,showScene,settings=()=>({}),beforeScene=()=>{},afterScene=()=>{},changed=()=>{}}){
 let saved;try{saved=JSON.parse(storage.getItem(STORY_KEY));}catch{}
 let state=migrateStory(saved,adventure,{admin,adminBackup}),pending=null,current=null,busy=false;
 const persist=()=>{try{storage.setItem(STORY_KEY,JSON.stringify(state));}catch{}changed(state);};
 persist();
 async function play(id,{replay=false}={}){
  const ids=Array.isArray(id)?id:[id];
  if(busy||!ids.length||!ids.every(key=>availableStoryScenes(state).some(scene=>scene.id===key)))return {completed:false,skipped:false};
  busy=true;let result={completed:false,skipped:false};
  try{
   beforeScene();current=showScene({scene:id,...settings()});result=await current||result;
   if(!replay&&(result.completed||result.skipped)){state=markStorySeen(state,id);persist();}
  }catch{ /* An unavailable optional story must not block the game. */ }
  finally{current=null;busy=false;try{afterScene();}catch{}}
  return result;
 }
 return {
  summary:()=>storySummary(state),scenes:()=>availableStoryScenes(state),snapshot:()=>JSON.parse(JSON.stringify(state)),isPlaying:()=>busy,
  async onFirstOpen(){if(!state.seen.includes('intro'))await play('intro');},
  async beforeAdventure(){if(!state.seen.includes('intro'))await play('intro');},
  record(entry){const result=recordStoryClear(state,entry);state=result.state;if(result.scene)pending=result.scene;if(result.added)persist();return result;},
  async afterResults(){const scene=pending;pending=null;if(scene)await play(scene);},
  replay:id=>play(id,{replay:true}),replayAll:()=>play(availableStoryScenes(state).filter(scene=>scene.id!=='credits').map(scene=>scene.id),{replay:true}),cancel:()=>current?.cancel?.()
 };
}
