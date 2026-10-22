// Story progress is a local record of real Adventure clears, never player XP,
// optional stars, the currently unlocked level, or admin unlocks.
export const STORY_KEY='shape-shift-color-beacon-v1';
export const STORY_MILESTONES=Object.freeze([
 {level:10,id:'garden',title:'First Bloom'},
 {level:25,id:'river',title:'Let It Flow'},
 {level:50,id:'village',title:'Welcome Home'},
 {level:75,id:'sky',title:'A Sky Full of Color'},
 {level:100,id:'ending',title:'Color Comes Home'}
]);
const SCENES=new Set(['intro',...STORY_MILESTONES.map(item=>item.id),'credits']);
const validLevel=n=>Number.isInteger(n)&&n>=1&&n<=100;
const unique=values=>[...new Set(values)];
export function normalizeStory(value){
 return {version:1,cleared:unique(Array.isArray(value?.cleared)?value.cleared.filter(validLevel):[]).sort((a,b)=>a-b),seen:unique(Array.isArray(value?.seen)?value.seen.filter(id=>SCENES.has(id)):[])};
}
export function storySummary(value){
 const state=normalizeStory(value),cleared=new Set(state.cleared);
 let frontier=0;while(frontier<100&&cleared.has(frontier+1))frontier++;
 return {percent:state.cleared.length,frontier,complete:frontier===100,next:STORY_MILESTONES.find(item=>item.level>frontier)||null};
}
export function migrateStory(saved,adventure,{admin=false,adminBackup=null}={}){
 if(saved?.version===1)return normalizeStory(saved);
 // Admin's map can be artificially filled. Its pre-admin backup is the only
 // available migration source; without one, start the story record empty.
 const source=admin?adminBackup:adventure;
 const cleared=Array.from({length:100},(_,i)=>i+1).filter(level=>source?.cleared?.[level-1]===true||Number(source?.stars?.[level-1])>0);
 const state=normalizeStory({cleared}),summary=storySummary(state);
 // Established players keep progress without a queue of old cutscenes.
 state.seen=cleared.length?['intro',...STORY_MILESTONES.filter(item=>item.level<=summary.frontier).map(item=>item.id)]:[];
 if(summary.complete)state.seen.push('credits');
 return state;
}
export function recordStoryClear(value,{level,won=false,mode='adventure',admin=false,previouslyCleared=false}={}){
 const state=normalizeStory(value),summary=storySummary(state);
 if(mode!=='adventure'||!won||admin||previouslyCleared||!validLevel(level)||state.cleared.includes(level)||level>summary.frontier+1)return {state,scene:null,added:false};
 state.cleared.push(level);state.cleared.sort((a,b)=>a-b);
 const reached=STORY_MILESTONES.find(item=>item.level===level);
 return {state,scene:reached&&!state.seen.includes(reached.id)?reached.id:null,added:true};
}
export function markStorySeen(value,id){
 const state=normalizeStory(value);if(SCENES.has(id)&&!state.seen.includes(id))state.seen.push(id);
 if(id==='ending'&&!state.seen.includes('credits'))state.seen.push('credits');
 return state;
}
export function availableStoryScenes(value){
 const summary=storySummary(value);
 return [{id:'intro',title:'The Color Beacon',level:0},...STORY_MILESTONES.filter(item=>item.level<=summary.frontier),...(summary.complete?[{id:'credits',title:'Credits',level:100}]:[])];
}
