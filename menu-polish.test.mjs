import test from 'node:test';import assert from 'node:assert/strict';
import {claimDiscovery,discoveryOrder} from './menu-polish.js';
import {sortedAchievements,MODE_ACHIEVEMENTS,claimAchievement,achievementVisible} from './achievement-catalog.js';
import {levelRequirements,levelTasks,levelObjectives,collectionBoard,trackLevelPick,levelComplete,ensureStarChoice,ensureStarPickup} from './world-menu.js';
import {seededRandom,duration} from './engine.js';
test('daily discoveries persist 30/30/40 once across all worlds and reject clock rollback',()=>{
 const today=Date.UTC(2026,9,23),p={coins:9};let next=p;
 for(const slot of [2,0,1,2,1,0])next=claimDiscovery(next,slot,today);
 assert.equal(next.coins,109);assert.equal(p.coins,9);assert.equal(next.discoveries.claimed.length,3);
 assert.equal(claimDiscovery(next,0,today-86400000),next);
 const reload=JSON.parse(JSON.stringify(next));assert.equal(claimDiscovery(reload,0,today).coins,109);
 assert.equal(claimDiscovery(reload,0,today+86400000).coins,139);
 for(const invalid of [-1,3,NaN,.5])assert.equal(claimDiscovery(next,invalid,today),next);
 assert.deepEqual(discoveryOrder('2026-10-23'),discoveryOrder('2026-10-23'));assert.notDeepEqual(discoveryOrder('2026-10-23'),discoveryOrder('2026-10-24'));
});
test('early levels offer three simple inventory-free stars; level 2 earns three on blue circles',()=>{
 for(let level=1;level<=20;level++)assert.deepEqual(levelTasks(level).map(t=>t.type),['wrong','time','streak']);
 for(let level=1;level<=3;level++)for(let seed=0;seed<16;seed++){
  let stats={},state={current:{color:seed%4,shape:Math.floor(seed/4)}},steps=0;
  const rng=seededRandom(0x53480000+level);
  while(!levelComplete(level,stats)&&steps++<25){const board=collectionBoard(level,state,Array.from({length:4},()=>({color:0,shape:0})),rng,stats);const goal=levelRequirements(level)[0];const tile=board.find(t=>(t.color===state.current.color||t.shape===state.current.shape)&&t.color===goal.color&&t.shape===goal.shape)||board.find(t=>t.color===state.current.color||t.shape===state.current.shape);assert(tile);stats=trackLevelPick(stats,tile,true,'correct');state.current=tile;}
  assert(levelComplete(level,stats));assert(levelObjectives(level,{...stats,won:true,elapsed:steps*1000,wrong:0}).every(t=>t.done),'level '+level);
 }
});
test('later star choices offer a legal change and retain guaranteed special pickups',()=>{
 for(let level=21;level<=100;level++)for(let color=0;color<4;color++)for(let shape=0;shape<4;shape++){
  const state={current:{color,shape}},stats={previous:{color,shape}};const board=Array.from({length:9},()=>({color,shape}));
  const offered=ensureStarChoice(level,stats,state,ensureStarPickup(level,stats,state,board));
  for(const task of levelTasks(level)){
   if(task.type==='pickup')assert(offered.some(t=>t.special===task.special),'pickup '+level);
   if(task.type==='colorChanges'||task.type==='shapeChanges'){
    const key=task.type==='colorChanges'?'color':'shape';
    // One pending change task at a time is enough; after it completes the next is offered.
    const first=levelTasks(level).find(t=>['colorChanges','shapeChanges'].includes(t.type));if(first.type!==task.type)continue;
    assert(offered.some(t=>!t.special&&t[key]!==state.current[key]&&(t.color===color||t.shape===shape)),'change '+level);
   }
  }
 }
});
test('achievement order puts completed first, then percentage progress, then untouched',()=>{
 const stats={endless:{picks:25,color0:90,color1:10},adventure:{highest:100}},profile={xp:100000};
 const list=sortedAchievements(stats,'endless',profile);assert.equal(list[0].stat,'picks');assert.equal(list[1].stat,'color0');
 const zero=list.findIndex(a=>!(stats.endless[a.stat]>0));assert(list.slice(zero).every(a=>!(stats.endless[a.stat]>0)));
 const fresh=sortedAchievements({},'adventure',{});assert(fresh.length>0);assert(fresh.every(a=>!/^color[0-3]|^shape[0-3]$/.test(a.stat)));assert(fresh.every(a=>a.tier===0));
 const hidden=MODE_ACHIEVEMENTS.find(a=>a.mode==='endless'&&a.tier===4);const p={coins:0};assert(!achievementVisible({endless:{[hidden.stat]:hidden.target}},hidden,p));assert.equal(claimAchievement(p,{endless:{[hidden.stat]:hidden.target}},hidden.id),p);
 assert(achievementVisible({},hidden,{achievementClaims:[hidden.id]}));assert(sortedAchievements({},'endless',{achievementClaims:[hidden.id]})[0].id===hidden.id);
});

test('learning stages allow more time without changing Endless timers',()=>{for(let n=1;n<=20;n++)assert(duration({mode:'adventure',adventureLevel:n,picks:10})>=3500);assert.equal(duration({mode:'endless',difficulty:'normal',picks:0}),2800);});
