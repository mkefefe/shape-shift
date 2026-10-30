import test from 'node:test';
import assert from 'node:assert/strict';
import {RESTORATION_KEY,RESTORATION_STEPS,normalizeRestoration,restorationSummary,applyRestorationReward,migrateRestoration,claimRestoration,restorationAccess} from './world-restoration.js';
import {STORY_RESTORATION} from './story-restoration.js';

const reward=(state,mode,xp,receipt,extra={})=>applyRestorationReward(state,{mode,xp,receipt,...extra});
const map=count=>({cleared:Array.from({length:100},(_,i)=>i<count),stars:Array(100).fill(0)});

test('the ten milestones match the existing painted world and use fixed XP targets',()=>{
 assert.equal(RESTORATION_KEY,'shape-shift-world-restoration-v1');
 assert.deepEqual(RESTORATION_STEPS.map(({percent,title})=>({percent,title})),STORY_RESTORATION.map(({percent,title})=>({percent,title})));
 assert.deepEqual(RESTORATION_STEPS.map(step=>step.threshold),[25,100,250,500,900,1500,2300,3300,4600,6200]);
 assert(Object.isFrozen(RESTORATION_STEPS));assert(RESTORATION_STEPS.every(Object.isFrozen));
});

test('an empty world exposes the first achievable goal without claiming any restoration',()=>{
 const summary=restorationSummary();
 assert.equal(summary.percent,0);assert.equal(summary.requiredXp,25);assert.deepEqual(summary.tasks.map(t=>t.mode),['adventure','endless']);assert.equal(summary.access.games.unlocked,false);assert.equal(summary.access.battle.unlocked,false);
});

test('every supported mode contributes actual earned XP to the same world',()=>{
 let state=normalizeRestoration();
 for(const mode of ['adventure','endless','rush','drop','slice','piano','battle']){
  const result=reward(state,mode,10,'run-'+mode);state=result.state;
  assert.equal(result.addedXp,10);assert.equal(state.byMode[mode],10);
 }
 assert.equal(state.totalXp,70);assert.equal(restorationSummary(state).percent,0);
 assert.equal(restorationSummary(state).currentXp,25);assert.equal(restorationSummary(state).requiredXp,25);assert.equal(restorationSummary(state).xpReady,true);
});

test('the first real Adventure win floors progress without duplicating already credited XP',()=>{
 let state=reward(undefined,'adventure',12,'run-1-xp').state;
 const win=reward(state,'adventure',0,'run-1-win',{firstAdventureWin:true});
 assert.equal(win.addedXp,13);assert.equal(win.state.totalXp,25);assert.equal(win.state.byMode.adventure,12);
 assert.equal(win.state.firstAdventureWin,true);assert.deepEqual(win.newlyRestored,[]);const ready=reward(win.state,'endless',6,'finish-first');assert.equal(ready.toPercent,0);assert.equal(claimRestoration(ready.state,'landmark-1').toPercent,100);
 const again=reward(win.state,'adventure',0,'run-2-win',{firstAdventureWin:true});assert.equal(again.addedXp,0);
 state=reward(undefined,'adventure',39,'other-run-xp').state;
 assert.equal(reward(state,'adventure',0,'other-run-win',{firstAdventureWin:true}).state.totalXp,39);
 assert.equal(reward(undefined,'battle',0,'not-adventure',{firstAdventureWin:true}).state.firstAdventureWin,false);
});

test('a first-win reward with XP adds that XP once, then applies only any missing floor',()=>{
 const result=reward(undefined,'adventure',30,'first-win',{firstAdventureWin:true});
 assert.equal(result.addedXp,30);assert.equal(result.state.byMode.adventure,30);assert.equal(result.state.totalXp,30);
});

test('large rewards cannot skip required tasks or carry them to the next landmark',()=>{
 let state=reward(undefined,'adventure',6200,'bank',{firstAdventureWin:true}).state;
 assert.equal(state.restoredCount,0);
 state=reward(state,'endless',900,'finish-first').state;
 assert.equal(state.restoredCount,0);assert(restorationSummary(state).readyToRestore);state=claimRestoration(state,'landmark-1').state;assert.equal(state.restoredCount,1);assert(restorationSummary(state).tasks.every(t=>t.current===0));
});

test('all sections stay restored while additional runs can still be attributed',()=>{
 const complete=migrateRestoration({version:1,totalXp:6200,byMode:{endless:6200},receipts:['finish']});
 const later=reward(complete,'piano',45,'encore');
 assert.equal(later.state.totalXp,6245);assert.equal(later.toPercent,100);assert.equal(later.newlyRestored.length,0);
 const summary=restorationSummary(later.state);assert.equal(summary.completed,true);assert.equal(summary.next,null);assert.equal(summary.currentXp,0);assert.equal(summary.requiredXp,0);
});

test('receipts survive serialization and prevent a replay from crediting twice',()=>{
 const first=reward(undefined,'slice',50,'  receipt-1  ');
 const repeated=reward(JSON.parse(JSON.stringify(first.state)),'slice',50,'receipt-1');
 assert.equal(repeated.addedXp,0);assert.deepEqual(repeated.state,first.state);assert.deepEqual(repeated.newlyRestored,[]);
});

test('the receipt ledger keeps the latest 256 unique valid entries',()=>{
 let state=normalizeRestoration();for(let n=0;n<300;n++)state=reward(state,'drop',1,'receipt-'+n).state;
 assert.equal(state.receipts.length,256);assert.equal(state.receipts[0],'receipt-44');assert.equal(state.receipts.at(-1),'receipt-299');
 assert.equal(reward(state,'drop',99,'receipt-299').addedXp,0);
 assert.deepEqual(normalizeRestoration({receipts:['a','b','a',null,'','  ']}).receipts,['b','a']);
});

test('invalid rewards and admin play cannot manufacture progress',()=>{
 const state=reward(undefined,'adventure',70,'real').state;
 for(const patch of [{xp:NaN},{xp:Infinity},{xp:-1},{xp:1.5},{xp:'50'},{xp:Number.MAX_SAFE_INTEGER+1},{mode:'ad'},{mode:'__proto__'},{receipt:null},{receipt:''},{receipt:' '.repeat(4)},{receipt:'a'.repeat(257)},{admin:true}]){
  const result=applyRestorationReward(state,{mode:'endless',xp:25,receipt:'new',...patch});
  assert.deepEqual(result.state,state);assert.equal(result.addedXp,0);assert.equal(result.toPercent,result.fromPercent);
 }
});

test('normalization rejects malformed amounts and recovers valid contributions without decreasing them',()=>{
 const value={totalXp:NaN,byMode:{adventure:25,endless:Infinity,rush:-2,drop:'30',slice:2.2,piano:80,battle:0,ad:500},firstAdventureWin:false,receipts:[7]};
 const state=normalizeRestoration(value);assert.equal(state.totalXp,105);assert.equal(state.byMode.adventure,25);assert.equal(state.byMode.piano,80);
 assert.equal(Object.keys(state.byMode).length,7);assert.deepEqual(state.receipts,[]);
 assert.equal(normalizeRestoration({firstAdventureWin:true}).totalXp,25);
});

test('safe-integer saturation never produces infinity or an attribution overflow',()=>{
 const start=normalizeRestoration({totalXp:Number.MAX_SAFE_INTEGER-2,byMode:{battle:Number.MAX_SAFE_INTEGER-2}});
 const result=reward(start,'piano',10,'last');
 assert.equal(result.state.totalXp,Number.MAX_SAFE_INTEGER);assert.equal(result.state.byMode.piano,2);assert.equal(result.addedXp,2);
 assert.equal(restorationSummary(result.state).percent,100);
});

test('legacy actual Adventure clears earn only the first restoration, regardless of historical level',()=>{
 for(const adventure of [map(1),map(75),map(100),{stars:[0,2]}]){
  const original=JSON.stringify(adventure),state=migrateRestoration(null,{adventure});
  assert.equal(state.totalXp,25);assert.equal(state.firstAdventureWin,true);assert.equal(state.byMode.adventure,0);assert.equal(JSON.stringify(adventure),original);
 }
 assert.equal(migrateRestoration(null,{story:{cleared:[1]}}).totalXp,25);
});

test('a recorded completed old ending retains the entire restored world',()=>{
 const story={version:2,cleared:Array.from({length:100},(_,i)=>i+1),seen:['ending','credits']},snapshot=JSON.stringify(story);
 const state=migrateRestoration(null,{adventure:map(100),story});
 assert.equal(state.totalXp,6200);assert.equal(restorationSummary(state).completed,true);assert.equal(JSON.stringify(story),snapshot);
});

test('unlocked map metadata, XP, credits alone and malformed clears are not historical wins',()=>{
 for(const options of [{adventure:{level:100,unlocked:100,adventureCompleted:100,xp:90000}},{adventure:{cleared:['true',1],stars:['3',NaN,4]}},{story:{seen:['credits'],cleared:['1',0,101,1.5]}},{}])assert.equal(migrateRestoration(null,options).totalXp,0);
});

test('an existing ledger stays authoritative and admin migration grants nothing',()=>{
 const existing=reward(undefined,'piano',250,'real').state;
 assert.deepEqual(migrateRestoration(existing,{adventure:map(100),story:{seen:['ending']}}),existing);
 assert.deepEqual(migrateRestoration(existing,{admin:true,adventure:map(100)}),existing);
 assert.equal(migrateRestoration(null,{admin:true,adventure:map(100),story:{seen:['ending']}}).totalXp,0);
 assert.equal(migrateRestoration(normalizeRestoration(),{adventure:map(100)}).totalXp,0);
});

test('reducers and summaries are pure and do not expose mutable state or milestone objects',()=>{
 const input=reward(undefined,'adventure',30,'first',{firstAdventureWin:true}).state,snapshot=JSON.stringify(input);
 const summary=restorationSummary(input);summary.modes.adventure=999;summary.next.title='Changed';
 const result=reward(input,'endless',80,'second');result.state.byMode.adventure=999;result.state.receipts.push('mutated');const claimed=claimRestoration(result.state,'landmark-1');claimed.state.modeTasks.endless=999;
 assert.equal(JSON.stringify(input),snapshot);assert.equal(RESTORATION_STEPS[1].title,'The river returns');
});

test('v1 migration keeps every revealed landmark and starts the next job without lifetime XP credit',()=>{
 const old={version:1,totalXp:500,firstAdventureWin:true,byMode:{adventure:100,endless:120,slice:180,battle:100},receipts:['old-1','old-2']};
 const before=JSON.stringify(old),state=migrateRestoration(old),summary=restorationSummary(state);
 assert.equal(state.version,4);assert.equal(state.totalXp,500);assert.equal(state.restoredCount,4);assert.equal(summary.percent,0);assert.equal(summary.requiredMode,'adventure');assert.equal(summary.task.current,0);assert.equal(state.byMode.slice,180);assert.deepEqual(state.receipts,old.receipts);assert.equal(JSON.stringify(old),before);
 assert.deepEqual(migrateRestoration(JSON.parse(JSON.stringify(state))),state);
});

test('each unlocked mode has its own task and games pool all three minigames',()=>{
 let state=normalizeRestoration({version:3,restoredCount:2,totalXp:250,firstAdventureWin:true});
 assert.deepEqual(restorationSummary(state,{playerLevel:20}).tasks.map(t=>t.mode),['adventure','endless','games']);
 state=reward(state,'drop',4,'drop',{playerLevel:20}).state;state=reward(state,'slice',3,'slice',{playerLevel:20}).state;state=reward(state,'piano',2,'piano',{playerLevel:20}).state;
 assert.equal(state.modeTasks.games,9);assert.equal(state.modeTasks.adventure,0);assert.equal(state.restoredCount,2);
});
test('every landmark requires all tasks, unlocks modes at boundaries, and never caps daily play',()=>{
 let state=reward(undefined,'adventure',6200,'bank',{firstAdventureWin:true}).state,n=0;
 for(let i=0;i<10;i++){
  const playerLevel=i<2?19:i<3?20:25;const tasks=restorationSummary(state,{playerLevel}).tasks;
  assert.equal(tasks.length,i<2?2:i<3?3:4);
  for(const [index,t]of tasks.entries()){
   if(t.complete)continue;
   const r=reward(state,t.mode==='games'?'drop':t.mode,t.target,'job-'+n++,{firstAdventureWin:true,playerLevel});
   assert.equal(r.state.restoredCount,i);state=r.state;
  }
  assert(restorationSummary(state,{playerLevel}).readyToRestore);state=claimRestoration(state,`landmark-${i+1}`,{playerLevel}).state;assert.equal(state.restoredCount,i+1);
  assert(restorationSummary(state).tasks.every(t=>t.current===0));
 }
 assert.equal(restorationSummary(state).percent,100);
 assert.equal(reward(state,'endless',10,'extra').addedXp,10);
});
test('all finished tasks can be claimed without a second Color requirement',()=>{
 let state=normalizeRestoration({version:3,restoredCount:1,totalXp:25,firstAdventureWin:true});
 state=reward(state,'adventure',10,'adv').state;state=reward(state,'endless',8,'end').state;
 assert(restorationSummary(state).tasksComplete);assert.equal(state.restoredCount,1);
 assert(restorationSummary(state).readyToRestore);assert.equal(restorationSummary(state).taskPercent,100);state=claimRestoration(state,'landmark-2').state;assert.equal(state.restoredCount,2);assert.equal(normalizeRestoration(JSON.parse(JSON.stringify(state))).restoredCount,2);
});
test('v2 saves keep restored areas and partial progress but respect player-level locks',()=>{
 const old={version:2,restoredCount:1,totalXp:99,taskProgress:7,firstAdventureWin:true,byMode:{battle:1}};
 const state=normalizeRestoration(old);
 assert.equal(state.restoredCount,1);assert.equal(state.modeTasks.endless,7);assert.equal(restorationSummary(state).access.battle.unlocked,false);
 assert.deepEqual(normalizeRestoration(JSON.parse(JSON.stringify(state))),state);
});
test('invalid or duplicate awards cannot advance any mode task',()=>{
 const s=reward(undefined,'endless',3,'pick').state;
 for(const patch of [{receipt:'pick'},{admin:true},{xp:-1}])assert.deepEqual(applyRestorationReward(s,{mode:'endless',xp:3,receipt:'new',...patch}).state,s);
});

test('equal task shares, explicit claims, reloads and double taps are safe',()=>{
 let s=normalizeRestoration({version:3,restoredCount:5,totalXp:900,firstAdventureWin:true,unlockedModes:['games','battle']});
 const tasks=restorationSummary(s,{playerLevel:25}).tasks;assert.equal(tasks.length,4);
 assert.equal(claimRestoration(s,'landmark-6',{playerLevel:25}).claimed,false);
 for(const [i,t] of tasks.entries()){
  s=reward(s,t.mode==='games'?'drop':t.mode,t.target,'share-'+i,{playerLevel:25}).state;
  assert.equal(restorationSummary(s,{playerLevel:25}).taskPercent,(i+1)*25);assert.equal(restorationSummary(s,{playerLevel:25}).percent,0);
 }
 s=normalizeRestoration(JSON.parse(JSON.stringify(s)));assert(restorationSummary(s,{playerLevel:25}).readyToRestore);
 assert.equal(claimRestoration(s,'landmark-5').claimed,false);
 const claimed=claimRestoration(s,'landmark-6',{playerLevel:25});assert(claimed.claimed);assert.equal(claimed.toPercent,100);
 assert.equal(claimRestoration(claimed.state,'landmark-6').claimed,false);
 assert.equal(restorationSummary(claimed.state).taskPercent,0);
});

test('player levels 20 and 25 alone control mode access regardless of old unlocks',()=>{
 const old={restoredCount:10,byMode:{battle:900,drop:900},unlockedModes:['games','battle']};
 for(const [level,games,battle]of [[1,false,false],[19,false,false],[20,true,false],[24,true,false],[25,true,true],[30,true,true]]){
  const access=restorationAccess(old,level);assert.equal(access.games.unlocked,games);assert.equal(access.battle.unlocked,battle);
  const summary=restorationSummary(normalizeRestoration(),{playerLevel:level});assert.deepEqual(summary.tasks.map(t=>t.mode),['adventure','endless',...(games?['games']:[]),...(battle?['battle']:[])]);
 }
 assert.match(restorationAccess({},19).games.requirement,/player level 20/);
 assert.match(restorationAccess({},24).battle.requirement,/player level 25/);
});
test('reaching an unlock level adds its required task before restoration can be claimed',()=>{
 let state=reward(undefined,'adventure',25,'win',{firstAdventureWin:true}).state;
 state=reward(state,'endless',6,'end').state;
 assert(restorationSummary(state,{playerLevel:19}).readyToRestore);
 assert.equal(claimRestoration(state,'landmark-1',{playerLevel:20}).claimed,false);
 state=reward(state,'piano',8,'games',{playerLevel:20}).state;
 assert(claimRestoration(state,'landmark-1',{playerLevel:20}).claimed);
 assert.equal(claimRestoration(state,'landmark-1',{playerLevel:25}).claimed,false);
});


test('a claim colors the whole island and the next distinct island starts gray',()=>{
 let state=normalizeRestoration({version:4,firstAdventureWin:true,modeTasks:{endless:6}});
 const ready=restorationSummary(state);assert.equal(ready.percent,0);assert.equal(ready.taskPercent,100);
 const result=claimRestoration(state,ready.claimId);assert.equal(result.toPercent,100);assert.equal(result.island.title,'Color Beacon');
 const next=restorationSummary(JSON.parse(JSON.stringify(result.state)));assert.equal(next.island.title,'Crystal Falls');assert.equal(next.percent,0);assert.equal(next.restoredIslands,1);assert.equal(next.taskPercent,0);
 assert.equal(claimRestoration(result.state,ready.claimId).claimed,false);
});
