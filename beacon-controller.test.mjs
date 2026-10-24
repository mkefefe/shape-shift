import test from 'node:test';
import assert from 'node:assert/strict';
import {STORY_KEY,STORY_MILESTONES,normalizeStory,migrateStory,recordStoryClear,storySummary,availableStoryScenes} from './story-progress.js';
import {CHARGE_KEY,createBeaconController} from './beacon-controller.js';

const levels=count=>Array.from({length:count},(_,i)=>i+1);
const map=(count=0)=>({cleared:Array.from({length:100},(_,i)=>i<count),stars:Array(100).fill(0)});
const memory=(values={})=>({getItem:key=>values[key]??null,setItem:(key,value)=>{values[key]=value;},values});
const oldSave=(count,seen=[])=>({version:1,cleared:levels(count),seen});

test('only clearing all 100 Adventure levels unlocks one restoration',async()=>{
 const played=[],controller=createBeaconController({storage:memory(),adventure:map(),showScene:async options=>{played.push(options);return {completed:true};}});
 assert.deepEqual(STORY_MILESTONES.map(m=>m.level),[100]);
 for(let level=1;level<=100;level++){
  const result=controller.record({level,mode:'adventure',won:true}),summary=controller.summary();
  assert.equal(result.added,true);assert.equal(summary.percent,level);assert.equal(summary.frontier,level);
  assert.equal(summary.availableCharges,level===100?1:0);assert.equal(summary.freeSpark,false);
  assert.equal(summary.restoredPercent,0);assert.equal(summary.complete,false);
  assert.equal(summary.adventureComplete,level===100);assert.equal(result.scene,level===100?'ending':null);
  assert.equal(controller.takeMilestoneNotice(),level===100);assert.equal(controller.takeMilestoneNotice(),false);
  if(level<100){assert.equal(summary.next.level,100);assert.equal((await controller.charge()).unavailable,true);}
 }
 assert.deepEqual(played,[]);assert.equal(controller.summary().next,null);
 await controller.charge();
 assert.deepEqual(played,[{scene:'ending',autoplay:false}]);
 assert.equal(controller.summary().complete,true);assert.equal(controller.summary().restoredPercent,100);
 assert.equal(controller.summary().availableCharges,0);assert.equal((await controller.charge()).unavailable,true);
 assert.deepEqual(controller.snapshot().seen,['ending','credits']);
});

test('startup and results hooks never launch an intro or intermediate scene',async()=>{
 for(const count of [0,9,10,24,25,49,50,74,75,99,100]){
  const played=[],controller=createBeaconController({storage:memory(),adventure:map(count),showScene:async options=>{played.push(options.scene);return {completed:true};}});
  await controller.onFirstOpen();await controller.beforeAdventure();await controller.afterResults();
  assert.deepEqual(played,[]);assert.equal(controller.summary().freeSpark,false);
 }
});

test('replays, losses, other modes, out-of-order and invalid levels cannot earn completion',()=>{
 const original=normalizeStory();
 for(const entry of [{level:1,won:false},{level:1,won:true,mode:'endless'},{level:1,won:true,mode:'rush'},{level:1,won:true,previouslyCleared:true},{level:2,won:true},{level:100,won:true},{level:101,won:true},{level:1.5,won:true},{level:0,won:true}]){
  const result=recordStoryClear(original,entry);assert.equal(result.added,false);assert.deepEqual(result.state,original);
 }
 const missingFirst=normalizeStory({cleared:levels(100).slice(1)});
 assert.equal(storySummary(missingFirst).adventureComplete,false);assert.equal(storySummary(missingFirst).frontier,0);
 const duplicate=recordStoryClear(normalizeStory({cleared:[1]}),{level:1,won:true});assert.equal(duplicate.added,false);
});

test('legacy chapter history and spent charges do not partially or fully restore the new island',()=>{
 for(const count of [10,25,50,75,100]){
  const seen=['intro','garden','river','village','sky'];
  const storage=memory({[STORY_KEY]:JSON.stringify(oldSave(count,seen)),[CHARGE_KEY]:JSON.stringify({version:1,spent:[...seen,'ending']})});
  const controller=createBeaconController({storage,adventure:map(count),showScene:async()=>({completed:true})});
  assert.equal(controller.summary().restoredPercent,0);assert.equal(controller.summary().complete,false);
  assert.equal(controller.summary().availableCharges,count===100?1:0);
  assert.deepEqual(controller.snapshot().seen,seen);assert.deepEqual(JSON.parse(storage.getItem(CHARGE_KEY)),{version:2,spent:[]});
 }
});

test('existing real 100-level clears without a story save unlock an unwatched finale',()=>{
 const progress=map(100),original=JSON.stringify(progress),state=migrateStory(null,progress);
 assert.equal(storySummary(state).adventureComplete,true);assert.equal(storySummary(state).restored,false);
 assert.deepEqual(state.seen,[]);assert.equal(JSON.stringify(progress),original);
 const controller=createBeaconController({storage:memory(),adventure:progress,showScene:async()=>({completed:true})});
 assert.equal(controller.summary().ready.id,'ending');assert.equal(controller.summary().complete,false);
 assert.deepEqual(availableStoryScenes(state).map(scene=>scene.id),['ending']);
});

test('already watched endings remain complete, and credits can be replayed without granting another restoration',async()=>{
 const storage=memory({[STORY_KEY]:JSON.stringify(oldSave(100,['intro','garden','ending','credits']))}),played=[];
 const controller=createBeaconController({storage,adventure:map(100),showScene:async options=>{played.push(options);return {completed:true};}});
 assert.equal(controller.summary().complete,true);assert.equal(controller.summary().availableCharges,0);
 await controller.charge();await controller.replayCredits();
 assert.deepEqual(played,[{scene:'credits',autoplay:true}]);
 assert.deepEqual(JSON.parse(storage.getItem(CHARGE_KEY)),{version:2,spent:['ending']});
 assert.deepEqual(availableStoryScenes(controller.snapshot()).map(scene=>scene.id),['ending','credits']);
});

test('credits alone and an ending marker without all 100 clears cannot manufacture completion',()=>{
 for(const [count,seen] of [[100,['credits']],[99,['ending','credits']]]){
  const controller=createBeaconController({storage:memory({[STORY_KEY]:JSON.stringify(oldSave(count,seen))}),adventure:map(count),showScene:async()=>({completed:true})});
  assert.equal(controller.summary().complete,false);assert.equal(controller.summary().restoredPercent,0);
 }
});

test('admin maps and admin wins cannot unlock the finale; pre-admin wins remain intact',()=>{
 assert.equal(storySummary(migrateStory(null,map(100),{admin:true})).percent,0);
 assert.equal(storySummary(migrateStory(null,map(100),{admin:true,adminBackup:map(75)})).percent,75);
 const saved=oldSave(50,['garden']);
 assert.deepEqual(migrateStory(saved,map(100),{admin:true}),normalizeStory(saved));
 const controller=createBeaconController({storage:memory(),adventure:map(100),admin:true,adminBackup:map(99),showScene:async()=>({completed:true})});
 assert.equal(controller.record({level:100,won:true,admin:false}).added,false);assert.equal(controller.summary().availableCharges,0);
 const normal=createBeaconController({storage:memory(),adventure:map(99),showScene:async()=>({completed:true})});
 assert.equal(normal.record({level:100,won:true,admin:true}).added,false);
 assert.equal(normal.record({level:100,won:true,admin:false}).added,true);
});

test('legacy stars migrate real clears, while XP and merely unlocked levels do not',()=>{
 assert.equal(storySummary(migrateStory(null,{stars:[3,1,2],level:100,unlocked:100})).percent,3);
 assert.equal(storySummary(migrateStory(null,{level:100,unlocked:100,xp:999999,adventureCompleted:100})).percent,0);
 const malformed=normalizeStory({cleared:[-1,0,1,1,'2',2.5,101,NaN,2],seen:['unknown','intro','intro']});
 assert.deepEqual(malformed.cleared,[1,2]);assert.deepEqual(malformed.seen,['intro']);
});

test('failed loading and cancelled playback stay eligible for a later successful retry',async()=>{
 const outcomes=[new Error('offline'),{completed:false,failed:true},{completed:false,skipped:true},{completed:true}],events=[];
 const controller=createBeaconController({storage:memory(),adventure:map(100),beforeScene:()=>events.push('pause'),afterScene:()=>events.push('resume'),showScene:async()=>{const outcome=outcomes.shift();if(outcome instanceof Error)throw outcome;return outcome;}});
 for(let attempt=0;attempt<3;attempt++){
  const result=await controller.charge();assert.equal(result.completed,false);assert.equal(controller.summary().availableCharges,1);
  assert.equal(controller.isPlaying(),false);assert(!controller.snapshot().seen.includes('ending'));
 }
 await controller.charge();assert.equal(controller.summary().complete,true);
 assert.deepEqual(events,Array.from({length:4},()=>['pause','resume']).flat());
});

test('rapid taps never duplicate playback and cancellation returns the one pending restoration',async()=>{
 let resolve,calls=0,cancelled=false;
 const controller=createBeaconController({storage:memory(),adventure:map(100),showScene:()=>{calls++;const promise=new Promise(done=>{resolve=done;});promise.cancel=()=>{cancelled=true;resolve({completed:false,skipped:true});};return promise;}});
 const first=controller.charge();assert.equal(controller.isPlaying(),true);
 assert.equal((await controller.charge()).busy,true);assert.equal(calls,1);
 controller.cancel();await first;assert.equal(cancelled,true);assert.equal(controller.isPlaying(),false);
 assert.equal(controller.summary().availableCharges,1);
 const second=controller.charge();resolve({completed:true});await second;
 assert.equal(calls,2);assert.equal(controller.summary().complete,true);
});

test('successful restoration persists across reloads without touching game progression or wallet saves',async()=>{
 const original=JSON.stringify(map(100)),storage=memory({'shape-shift-adventure-v1':original,'shape-shift-profile-v1':'wallet-untouched'});
 const controller=createBeaconController({storage,adventure:map(100),showScene:async()=>({completed:true})});
 await controller.charge();
 const reopened=createBeaconController({storage,adventure:map(100),showScene:async()=>{throw Error('Unexpected duplicate');}});
 assert.equal(reopened.summary().complete,true);assert.equal((await reopened.charge()).unavailable,true);
 assert.equal(storage.getItem('shape-shift-adventure-v1'),original);assert.equal(storage.getItem('shape-shift-profile-v1'),'wallet-untouched');
 assert.equal(JSON.parse(storage.getItem(STORY_KEY)).version,2);
});
