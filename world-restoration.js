export const RESTORATION_KEY='shape-shift-world-restoration-v1';
export const RESTORATION_ISLANDS=Object.freeze(['Color Beacon','Crystal Falls','Blossom Bridge','Golden Oasis','Snowlight Village','Amber Orchard','Mooncap Grove','Coral Lagoon','Jade Heights','Rainbow Castle'].map((title,index)=>Object.freeze({index,title})));
export const RESTORATION_STEPS=Object.freeze([
 {threshold:25,percent:10,title:'The first trees'},
 {threshold:100,percent:25,title:'The river returns'},
 {threshold:250,percent:30,title:'The western garden'},
 {threshold:500,percent:40,title:'The eastern garden'},
 {threshold:900,percent:50,title:'Welcome home'},
 {threshold:1500,percent:60,title:'The beacon awakens'},
 {threshold:2300,percent:70,title:'A crown of color'},
 {threshold:3300,percent:80,title:'A path to the sky'},
 {threshold:4600,percent:90,title:'Almost home'},
 {threshold:6200,percent:100,title:'Color comes home'}
].map(step=>Object.freeze(step)));

const MODES=Object.freeze(['adventure','endless','rush','drop','slice','piano','battle']);
const safeXp=value=>Number.isSafeInteger(value)&&value>=0?value:0;
const addXp=(a,b)=>Math.min(Number.MAX_SAFE_INTEGER,a+b);
const validReceipt=value=>typeof value==='string'&&value.trim().length>0&&value.length<=256;
const record=value=>value&&typeof value==='object'&&!Array.isArray(value);
const firstThreshold=RESTORATION_STEPS[0].threshold;

// Legacy single-mode jobs are retained only to migrate partial v2 progress.
// New landmarks require a separate job in every unlocked mode.
const TASKS=Object.freeze([
 {mode:'adventure',type:'win',target:1,title:'Win an Adventure level'},
 {mode:'endless',type:'xp',target:18,title:'Collect 18 Color in Endless'},
 {mode:'games',type:'xp',target:20,title:'Collect 20 Color in Games'},
 {mode:'battle',type:'xp',target:18,title:'Collect 18 Color in Battle'},
 {mode:'adventure',type:'xp',target:30,title:'Collect 30 Color in Adventure'},
 {mode:'endless',type:'xp',target:30,title:'Collect 30 Color in Endless'},
 {mode:'games',type:'xp',target:40,title:'Collect 40 Color in Games'},
 {mode:'battle',type:'xp',target:30,title:'Collect 30 Color in Battle'},
 {mode:'adventure',type:'xp',target:45,title:'Collect 45 Color in Adventure'},
 {mode:'endless',type:'xp',target:45,title:'Collect 45 Color in Endless'}
].map(task=>Object.freeze(task)));
const reachedByXp=xp=>RESTORATION_STEPS.filter(step=>xp>=step.threshold).length;
const taskMode=mode=>['rush','drop','slice','piano'].includes(mode)?'games':mode;

export const MODE_UNLOCK_LEVELS=Object.freeze({games:20,battle:25});
export function restorationAccess(value={},playerLevel=1){
 const level=Number.isFinite(playerLevel)?Math.max(1,Math.floor(playerLevel)):1;
 return {adventure:{unlocked:true},endless:{unlocked:true},
  games:{unlocked:level>=MODE_UNLOCK_LEVELS.games,requirement:'Reach player level 20 to unlock Games'},
  battle:{unlocked:level>=MODE_UNLOCK_LEVELS.battle,requirement:'Reach player level 25 to unlock Battle'}};
}
function jobs(state,playerLevel=1){
 if(state.restoredCount>=RESTORATION_STEPS.length)return [];
 const n=state.restoredCount,access=restorationAccess(state,playerLevel);
 return ['adventure','endless','games','battle'].filter(mode=>access[mode].unlocked).map(mode=>{
  const win=mode==='adventure'&&n===0,target=win?1:({adventure:8,endless:6,games:8,battle:6}[mode]+n*2);
  const current=win?Number(state.firstAdventureWin):Math.min(target,safeXp(state.modeTasks?.[mode]));
  return {id:`landmark-${n+1}-${mode}`,mode,type:win?'win':'xp',target,current,complete:current>=target,
   title:win?'Win an Adventure level':`Collect ${target} Color in ${{adventure:'Adventure',endless:'Endless',games:'Games',battle:'Battle'}[mode]}`};
 });
}

export function normalizeRestoration(value){
 const source=record(value)?value:{};
 const byMode=Object.fromEntries(MODES.map(mode=>[mode,safeXp(source.byMode?.[mode])]));
 // Preserve the latest occurrence of each receipt while keeping storage bounded.
 const receipts=[],seen=new Set();
 for(const receipt of (Array.isArray(source.receipts)?source.receipts:[]).slice().reverse()){
  if(!validReceipt(receipt))continue;
  const id=receipt.trim();if(seen.has(id))continue;
  seen.add(id);receipts.unshift(id);if(receipts.length===256)break;
 }
 const firstAdventureWin=source.firstAdventureWin===true;
 const attributed=Object.values(byMode).reduce(addXp,0);
 const totalXp=Math.max(safeXp(source.totalXp),attributed,firstAdventureWin?firstThreshold:0);
 // Existing v1 worlds retain every landmark they already revealed. New saves
 // and subsequent landmarks use requirements; historical mode XP is not a job.
 const legacy=record(value)&&![2,3,4].includes(source.version);
 const restoredCount=legacy?reachedByXp(totalXp):Math.min(RESTORATION_STEPS.length,safeXp(source.restoredCount));
 const activeTask=TASKS[restoredCount];
 const taskProgress=!activeTask?0:legacy?0:activeTask.type==='win'?Number(firstAdventureWin):Math.min(activeTask.target,safeXp(source.taskProgress));
 const modeTasks=Object.fromEntries(['adventure','endless','games','battle'].map(mode=>[mode,[3,4].includes(source.version)?safeXp(source.modeTasks?.[mode]):0]));
 if(source.version===2&&activeTask?.type==='xp')modeTasks[activeTask.mode]=taskProgress;
 const unlockedModes=Object.entries(restorationAccess({restoredCount,byMode,unlockedModes:source.unlockedModes})).filter(([,a])=>a.unlocked).map(([mode])=>mode);
 return {version:4,totalXp,firstAdventureWin,byMode,receipts,restoredCount,taskProgress,modeTasks,unlockedModes};
}

export function restorationSummary(value,{playerLevel=1}={}){
 const state=normalizeRestoration(value);
 const previous=RESTORATION_STEPS[state.restoredCount-1],next=RESTORATION_STEPS[state.restoredCount]||null;
 const tasks=jobs(state,playerLevel),task=tasks.find(t=>!t.complete)||tasks[0]||null;
 const island=RESTORATION_ISLANDS[Math.min(state.restoredCount,RESTORATION_ISLANDS.length-1)];
 return {totalXp:state.totalXp,percent:next?0:100,island:{...island},restoredIslands:state.restoredCount,islandCount:RESTORATION_ISLANDS.length,next:next?{...next,title:island.title}:null,
  currentXp:next?Math.min(next.threshold-(previous?.threshold||0),Math.max(0,state.totalXp-(previous?.threshold||0))):0,
  requiredXp:next?next.threshold-(previous?.threshold||0):0,
  completed:!next,firstAdventureWin:state.firstAdventureWin,modes:{...state.byMode},task,tasks,access:restorationAccess(state,playerLevel),
  taskPercent:tasks.length?tasks.reduce((sum,t)=>sum+Math.min(1,t.current/t.target),0)/tasks.length*100:100,
  claimId:next?`landmark-${state.restoredCount+1}`:null,readyToRestore:!!next&&tasks.every(t=>t.complete),
  tasksComplete:tasks.every(t=>t.complete),xpReady:!next||state.totalXp>=next.threshold,requiredMode:task?.mode||null};
}

export function applyRestorationReward(value,{mode,xp=0,receipt,firstAdventureWin=false,admin=false,playerLevel=1}={}){
 const before=normalizeRestoration(value),fromPercent=restorationSummary(before).percent;
 const unchanged=()=>({state:before,addedXp:0,fromPercent,toPercent:fromPercent,newlyRestored:[]});
 if(admin||!MODES.includes(mode)||!Number.isSafeInteger(xp)||xp<0||!validReceipt(receipt))return unchanged();
 const id=receipt.trim();if(before.receipts.includes(id))return unchanged();
 const state={...before,modeTasks:{...before.modeTasks},byMode:{...before.byMode},receipts:[...before.receipts,id].slice(-256)};
 const creditedXp=Math.min(xp,Number.MAX_SAFE_INTEGER-state.totalXp);
 state.totalXp+=creditedXp;state.byMode[mode]=addXp(state.byMode[mode],creditedXp);
 if(mode==='adventure'&&firstAdventureWin===true){
  state.firstAdventureWin=true;
  // This is a minimum first-win reveal, not an extra copy of run XP. Attribution
  // records actual earned XP only; the visual floor and legacy migration do not.
  state.totalXp=Math.max(state.totalXp,firstThreshold);
 }
 const modeId=taskMode(mode),task=jobs(before,playerLevel).find(t=>t.mode===modeId),next=RESTORATION_STEPS[before.restoredCount];
 if(task?.type==='xp')state.modeTasks[modeId]=Math.min(task.target,addXp(state.modeTasks[modeId],creditedXp));
 // Completed jobs wait for an explicit restoration claim. Extra play cannot
 // spill task credit into a landmark the player has not claimed yet.
 state.taskProgress=jobs(state,playerLevel)[0]?.current||0;
 state.unlockedModes=Object.entries(restorationAccess(state)).filter(([,a])=>a.unlocked).map(([id])=>id);
 const toPercent=restorationSummary(state).percent;
 return {state,addedXp:state.totalXp-before.totalXp,fromPercent,toPercent,
  newlyRestored:RESTORATION_STEPS.filter(step=>step.percent>fromPercent&&step.percent<=toPercent).map(step=>({...step}))};
}

export function migrateRestoration(saved,{adventure,story,admin=false}={}){
 // An existing ledger is authoritative. Never re-import a historical map after
 // each reload, and never write to the old map, story, XP or wallet saves.
 if(record(saved))return normalizeRestoration(saved);
 const state=normalizeRestoration();if(admin)return state;
 const ending=Array.isArray(story?.seen)&&story.seen.includes('ending');
 const realClear=(Array.isArray(adventure?.cleared)&&adventure.cleared.some(value=>value===true))||
  (Array.isArray(adventure?.stars)&&adventure.stars.some(value=>Number.isInteger(value)&&value>=1&&value<=3))||
  (Array.isArray(story?.cleared)&&story.cleared.some(value=>Number.isInteger(value)&&value>=1&&value<=100));
 if(ending||realClear){state.totalXp=ending?RESTORATION_STEPS.at(-1).threshold:firstThreshold;state.firstAdventureWin=true;state.restoredCount=ending?RESTORATION_STEPS.length:1;}
 return state;
}

// Claim IDs prevent a double tap or a delayed request from restoring the next area.
export function claimRestoration(value,claimId,{playerLevel=1}={}){
 const before=normalizeRestoration(value),summary=restorationSummary(before,{playerLevel});
 const unchanged={state:before,claimed:false,fromPercent:summary.percent,toPercent:summary.percent};
 if(!summary.readyToRestore||claimId!==summary.claimId)return unchanged;
 const state={...before,restoredCount:before.restoredCount+1,taskProgress:0,modeTasks:{adventure:0,endless:0,games:0,battle:0}};
 state.unlockedModes=Object.entries(restorationAccess(state)).filter(([,a])=>a.unlocked).map(([mode])=>mode);
 return {state,claimed:true,island:summary.island,fromPercent:0,toPercent:100};
}
