import test from 'node:test';import assert from 'node:assert/strict';import {normalizeAdventure,unlockedLevel,completeLevel,levelSpec,starTotal} from './world-menu.js';
test('Adventure unlocks sequentially, keeps best stars, and caps at 100',()=>{let p=normalizeAdventure();assert.equal(unlockedLevel(p),1);assert.equal(completeLevel(p,2,0),p);p=completeLevel(p,1,0);assert.equal(unlockedLevel(p),2);p=completeLevel(p,1,2);assert.equal(p.stars[0],3);for(let n=2;n<=100;n++)p=completeLevel(p,n,0);assert.equal(unlockedLevel(p),100);assert.equal(starTotal(p),300);});
test('Adventure has progressive bounded targets and board sizes',()=>{let target=0;for(let n=1;n<=100;n++){const s=levelSpec(n);assert.ok(s.target>=target);assert.ok([4,6,9,12,16].includes(s.maxChoices));assert.ok(s.timeBonus>=0);target=s.target;}assert.equal(levelSpec(1).target,8);assert.equal(levelSpec(100).maxChoices,16);});
test('Adventure save normalizes corrupt or missing data without changing other game saves',()=>{assert.equal(normalizeAdventure(null).stars.length,100);assert.deepEqual(normalizeAdventure({stars:[9,-1,'2',null]}).stars.slice(0,4),[3,0,2,0]);});

import {carouselPosition,levelObjectives,saveObjectiveStars} from './world-menu.js';
test('carousel has one card on each side at all three selections',()=>{for(let s=0;s<3;s++)assert.deepEqual([0,1,2].map(i=>carouselPosition(i,s)).sort(),[-1,0,1]);assert.equal(carouselPosition(0,2),1);assert.equal(carouselPosition(2,0),-1);});
test('optional stars are independent and zero-star wins still unlock the next level',()=>{
 const stats={won:true,elapsed:20000,wrong:0,bestStreak:5};assert.equal(levelObjectives(1,stats).filter(o=>o.done).length,3);
 assert.equal(levelObjectives(1,{...stats,wrong:3}).filter(o=>o.done).length,2);
 assert.equal(levelObjectives(1,{...stats,wrong:3,elapsed:999999,bestStreak:0}).filter(o=>o.done).length,0);
 const p=saveObjectiveStars(normalizeAdventure(),1,0);assert.equal(p.stars[0],0);assert.equal(unlockedLevel(p),2);assert.equal(unlockedLevel(normalizeAdventure(JSON.parse(JSON.stringify(p)))),2);
 assert.equal(unlockedLevel(normalizeAdventure({stars:[1,2,3]})),4);
});
import {mapNodePosition,visibleMapSections} from './world-menu.js';
test('continuous map keeps levels 1 through 100 ordered along measured tile anchors',()=>{for(const width of [320,390,480]){let last=Infinity;for(let level=1;level<=100;level++){const p=mapNodePosition(level,width);assert.ok(p.y<last);assert.ok([.654,.485].includes(p.x));last=p.y;}assert.ok(mapNodePosition(11,width).y<mapNodePosition(10,width).y);}});
test('map virtualization covers viewport, including first and last levels, with bounded tiles',()=>{for(const width of [320,480])for(let scroll=0;scroll<50*width;scroll+=137){const [a,b]=visibleMapSections(scroll,800,width);assert.ok(a>=0&&b<=49&&a<=b);assert.ok(b-a<8);const top=(49-b)*width,bottom=(50-a)*width;assert.ok(top<=Math.max(0,scroll));assert.ok(bottom>=Math.min(50*width,scroll+800));}});
import {levelTaskStatus,formatLevelTime} from './world-menu.js';
test('paused tasks separate collection progress from optional star conditions',()=>{
 assert.equal(levelRequirementStatus(1,{collections:{'0:0':2}})[0].value,'2 / 4');
 const tasks=levelTaskStatus(25,{turns:1000,elapsed:999999,wrong:9});assert(tasks.every(t=>t.state==='missed'));
});
import {levelTasks,trackLevelPick} from './world-menu.js';
test('all levels have three optional challenges, with generous turns introduced after learning levels',()=>{
 for(let n=1;n<=100;n++){const tasks=levelTasks(n);assert.equal(tasks.length,3);assert.deepEqual(tasks,levelTasks(n));assert(tasks.every(t=>!['collection','memoryCollected','score','picks'].includes(t.type)));
 const turns=tasks.find(t=>t.type==='turns');if(n<25)assert(!turns);if(turns)assert(turns.target>levelRequirements(n).reduce((sum,g)=>sum+g.target,0));}
});
test('level pick tracking counts valid changes and streaks without crediting skills or mistakes',()=>{
 let s=trackLevelPick({}, {color:0,shape:0},true,'correct');s=trackLevelPick(s,{color:0,shape:1},true,'correct');s=trackLevelPick(s,{color:2,shape:1},true,'correct');
 assert.equal(s.bestStreak,3);assert.equal(s.colorChanges,1);assert.equal(s.shapeChanges,1);
 assert.equal(trackLevelPick(s,{special:'heart'},false,'correct'),s);
 s=trackLevelPick(s,null,false,'miss');assert.equal(s.streak,0);assert.equal(s.bestStreak,3);
 s=trackLevelPick(s,{color:3,shape:1},true,'correct');assert.equal(s.streak,1);assert.equal(s.colorChanges,2);
});
test('winning does not depend on optional challenges and every required collection matters',()=>{
 for(let n=1;n<=100;n++){const goals=levelRequirements(n),stats={collections:{},memoryCollected:0,score:999999,picks:999999,wrong:99,elapsed:999999,turns:999999};assert(!levelComplete(n,stats));
 for(const g of goals)if(g.type==='collection')stats.collections[g.color+':'+g.shape]=g.target;else stats.memoryCollected=g.target;
 assert(levelComplete(n,stats));assert(levelObjectives(n,{...stats,won:true}).every(t=>!t.done));
 for(const g of goals){const partial={...stats,collections:{...stats.collections}};if(g.type==='collection')partial.collections[g.color+':'+g.shape]--;else partial.memoryCollected--;assert(!levelComplete(n,partial));}}
});
import {levelPrimaryGoal,levelComplete,adventureLayout} from './world-menu.js';
test('every Adventure level ends on collections, never score or generic picks',()=>{for(let n=1;n<=100;n++){assert(levelRequirements(n).every(g=>['collection','memoryCollected'].includes(g.type)));assert(!levelComplete(n,{score:999999,picks:999999}));}});
test('Adventure boards use complete grids without holes at every supported size',()=>{
 for(let n=1;n<=100;n++)for(const count of [1,2,3,4,6,9,12,16]){
 const layout=adventureLayout(n,count);assert.equal(layout.name,'classic');assert.equal(layout.cells.length,0);
 assert.equal(count%layout.columns,0);
 const board=createRockLayout(n,count);assert.deepEqual(board.cells,Array.from({length:count},(_,i)=>i+1));assert.deepEqual(board.rocks,[]);assert.deepEqual(board.opened,[]);
 }
});

import {collectionBoard,trackLevelCollection} from './world-menu.js';
import {seededRandom,matches} from './engine.js';
test('collection requirements count exact colors and shapes',()=>{const goal=levelRequirements(1)[0];let stats=trackLevelCollection({},[{color:goal.color,shape:(goal.shape+1)%4}]);assert(!levelComplete(1,stats));for(let i=0;i<goal.target;i++)stats=trackLevelPick(stats,goal,true,'correct');assert(levelComplete(1,stats));});
test('collection spawning provides a legal target or bridge across all colors and shapes',()=>{
 for(let level=12;level<=100;level+=4)for(let seed=0;seed<16;seed++){
 const goal=levelPrimaryGoal(level);if(goal.type==='memoryCollected')continue;const rng=seededRandom(seed),original=Array.from({length:6},()=>({shape:3,color:3}));
 let state={current:{shape:seed%4,color:Math.floor(seed/4)}};
 let collected=0;
 for(let turn=0;turn<goal.target+1;turn++){
 const board=collectionBoard(level,state,original,rng);
 const target=board.find(t=>t.color===goal.color&&t.shape===goal.shape&&matches(state.current,t));
 const pick=target||board.find(t=>matches(state.current,t)&&t.color===goal.color);
 assert(pick,'Every ordinary board must offer a useful valid pick');
 if(target)collected++;state={current:pick};
 }
 assert(collected>=goal.target,'Target is reachable within one bridging pick plus the collection count');
 assert(original.every(t=>t.shape===3&&t.color===3));
 }
});
test('collection assistance preserves special slots and held or Cosmic boards',()=>{
 const state={current:{shape:0,color:0}},board=[{special:'heart'},{shape:1,color:1},{special:'reset'}];
 const result=collectionBoard(12,state,board,()=>.5);assert.deepEqual(result[0],board[0]);assert.deepEqual(result[2],board[2]);
 for(const flag of ['heldBoard','sweepBoard','sweepPending'])assert.equal(collectionBoard(12,{...state,[flag]:true},board),board);
 assert.equal(collectionBoard(1,state,board)[0].special,'heart');
 assert.deepEqual(collectionBoard(12,state,[{special:'heart'}]),[{special:'heart'}]);
});

import {createRockLayout,damageAdjacentRocks} from './world-menu.js';
test('rocks fill only selected holes and keep original card indices stable',()=>{
 for(let level=1;level<=100;level++)for(const count of [1,2,3,4,6,9,12,16]){
  const layout=createRockLayout(level,count);
  assert.equal(layout.cells.length,count);
  assert(layout.rocks.length<=2);
  assert(layout.rocks.every(r=>!layout.cells.includes(r.cell)));
  assert.equal(new Set([...layout.cells,...layout.rocks.map(r=>r.cell)]).size,count+layout.rocks.length);
 }
});
test('nearby picks crack rocks, diagonal picks do not, and opened spaces persist',()=>{
 const start={columns:3,name:'test',baseCount:3,cells:[1,2,4],rocks:[{cell:5,hits:2}],opened:[]};
 assert.deepEqual(damageAdjacentRocks(start,[0]),start);
 const cracked=damageAdjacentRocks(start,[1]);assert.equal(cracked.rocks[0].hits,1);
 const opened=damageAdjacentRocks(cracked,[2]);assert.equal(opened.rocks.length,0);
 assert.deepEqual(opened.cells,[1,2,4,5]);assert.deepEqual(opened.opened,[5]);
 assert.deepEqual(damageAdjacentRocks(opened,[1]),opened);assert.equal(start.rocks[0].hits,2);
});

test('collection quantities stay bounded instead of growing into point grinds',()=>{for(let n=1;n<=100;n++){const goals=levelRequirements(n);assert(goals.length>=1&&goals.length<=3);assert(goals.every(g=>g.target>=2&&g.target<=10));}});
import {adventureTimeTarget,lightningFinish} from './world-menu.js';
test('optional time challenges reflect collection workload and stay bounded',()=>{for(let n=1;n<=100;n++){const seconds=adventureTimeTarget(n);assert(seconds>=40&&seconds<=140);assert.equal(levelTasks(n).find(t=>t.type==='time').target,seconds);}});
test('Lightning Finish requires all three stars on a winning run strictly under sixty seconds',()=>{
 assert(lightningFinish(true,59999,3));for(const elapsed of [60000,61000,NaN,undefined,-1])assert(!lightningFinish(true,elapsed,3));assert(!lightningFinish(false,10000,3));for(const stars of [0,1,2,undefined])assert(!lightningFinish(true,10000,stars));assert.equal(normalizeAdventure({stars:[2],lightning:[true]}).lightning[0],false);
 const progress=normalizeAdventure({stars:[3],lightning:[true]});assert(progress.lightning[0]);assert(completeLevel(progress,2,0).lightning[0]);assert.equal(normalizeAdventure().lightning.filter(Boolean).length,0);
});



test('Starburst adjacent collection cracks once per burst and cannot destroy rocks',()=>{
 const start={columns:3,cells:[1,2,4,6],rocks:[{cell:5,hits:3},{cell:9,hits:1}],opened:[]};
 const options={hitCells:new Set(),minimumHits:1};
 assert.equal(damageAdjacentRocks(start,[0],options),start); // diagonal does not hit
 const first=damageAdjacentRocks(start,[1],options);
 assert.equal(first.rocks[0].hits,2);
 const rest=damageAdjacentRocks(first,[2,3],options);
 assert.deepEqual(rest.rocks,[{cell:5,hits:2},{cell:9,hits:1}]);
 assert.deepEqual(rest.cells,start.cells);assert.deepEqual(rest.opened,[]);
 const next=damageAdjacentRocks(rest,[1],{hitCells:new Set(),minimumHits:1});
 assert.equal(next.rocks[0].hits,1);
 const cracked=damageAdjacentRocks(next,[1,3],{hitCells:new Set(),minimumHits:1});
 assert.equal(cracked.rocks.length,2);assert(cracked.rocks.every(r=>r.hits===1));
 assert.equal(damageAdjacentRocks(cracked,[3]).rocks.length,0); // normal matches still break them
});


test('cleared cells wait below rocks and fill top-to-bottom when the upper blocker breaks',async()=>{
 const {rockFillPlan}=await import('./world-menu.js');
 const initial={columns:3,cells:[1,2,3,4,6,7,9],rocks:[{cell:5,hits:1},{cell:8,hits:1}],opened:[]};
 const lower=damageAdjacentRocks(initial,[5]);
 assert.deepEqual(lower.opened,[8]);assert.ok(!lower.cells.includes(8));assert.deepEqual(lower.newlyOpened,[]);assert.equal(lower.rocks[0].cell,5);
 const upper=damageAdjacentRocks(lower,[1]);
 assert.deepEqual(upper.newlyOpened,[5,8]);assert.ok(upper.cells.includes(5)&&upper.cells.includes(8));
 const plan=rockFillPlan(upper);
 assert.deepEqual(plan.map(p=>[p.cell,p.sourceCell,p.delay]),[[5,2,0],[8,5,380]]);
 assert.ok(plan[1].delay>=plan[0].duration);
});
test('rock fill columns run independently and untouched holes stay absent',async()=>{
 const {rockFillPlan}=await import('./world-menu.js');
 const layout={columns:3,cells:[1,3,4,6,7,9],newlyOpened:[9,4,7,6]};
 const plan=rockFillPlan(layout);
 assert.equal(plan.find(p=>p.cell===4).delay,0);assert.equal(plan.find(p=>p.cell===6).delay,0);
 assert.equal(plan.find(p=>p.cell===7).delay,380);assert.equal(plan.find(p=>p.cell===9).delay,380);
 assert.ok(plan.every(p=>![2,5,8].includes(p.cell)));
});

import {memoryLevelGoals,adventureMechanics,collectionCounters} from './world-menu.js';
test('every memory level requires all collections, regardless of ordinary points',()=>{
 for(let level=1;level<=100;level++){
  const goals=memoryLevelGoals(level);assert.equal(goals.length>0,adventureMechanics(level).memory>0);if(!goals.length)continue;
  assert(goals.length===2||goals.length===3);
  const stats={score:999999,picks:999999,collections:{},memoryCollected:goals[0].target};
  for(const g of goals.slice(1))stats.collections[g.color+':'+g.shape]=g.target;
  assert(levelComplete(level,stats));
  assert(!levelComplete(level,{...stats,memoryCollected:0}));
  for(const g of goals.slice(1))assert(!levelComplete(level,{...stats,collections:{...stats.collections,[g.color+':'+g.shape]:g.target-1}}));
  assert(levelRequirementStatus(level,stats).slice(0,goals.length).every(t=>t.state==='complete'));
 }
});
test('only successfully matched memory cards advance the required memory count',()=>{
 const card={shape:2,color:0,memory:true,peeked:true};let stats={};
 stats=trackLevelPick(stats,card,false,'wrong');assert.equal(stats.memoryCollected||0,0);
 stats=trackLevelCollection(stats,[{shape:2,color:0}]);assert.equal(stats.memoryCollected||0,0);
 stats=trackLevelPick(stats,card,true,'correct');assert.equal(stats.memoryCollected,1);
 const counters=collectionCounters(levelRequirements(10),{...stats.collections,memory:stats.memoryCollected});
 assert.equal(counters[0].key,'memory');assert.equal(counters[0].remaining,1);assert.equal(counters.length,2);
});
test('memory collection assistance preserves cards and offers a bridge to a remembered target',()=>{
 for(let color=0;color<4;color++)for(let shape=0;shape<4;shape++){
  const memory={memory:true,peeked:true,color,shape};const board=[memory,{color:0,shape:0},{color:1,shape:1}];
  const goals=memoryLevelGoals(10),g=goals[1],stats={collections:{[g.color+':'+g.shape]:g.target}};
  const state={current:{color:(color+1)%4,shape:(shape+1)%4}};
  const result=collectionBoard(10,state,board,()=>0,stats);
  assert.deepEqual(result[0],memory);
  assert(result.some(t=>!t.memory&&matches(state.current,t)&&matches(t,memory)));
 }
});

import {levelRequirements,levelRequirementStatus} from './world-menu.js';

import {gamesUnlocked,GAMES_UNLOCK_LEVEL} from './world-menu.js';
import {playerLevel,xpForLevel} from './economy.js';
test('Games unlocks at player level 20, including the exact XP boundary',()=>{
 assert.equal(GAMES_UNLOCK_LEVEL,20);
 for(const level of [undefined,NaN,1,18,19])assert.equal(gamesUnlocked(level),false);
 for(const level of [20,21,25,100])assert.equal(gamesUnlocked(level),true);
 assert.equal(gamesUnlocked(playerLevel({xp:xpForLevel(20)-1})),false);
 assert.equal(gamesUnlocked(playerLevel({xp:xpForLevel(20)})),true);
});

import {createModeCardTap} from './world-menu.js';
test('center-card double taps start once and ignore slow or interrupted pairs',()=>{
 const taps=createModeCardTap();assert.equal(taps.tap(0,100),false);assert.equal(taps.tap(0,300),true);assert.equal(taps.tap(0,350),false);
 taps.reset();assert.equal(taps.tap(0,500),false);assert.equal(taps.tap(0,900),false);assert.equal(taps.tap(2,950),false);assert.equal(taps.tap(2,1000),true);
 taps.tap(1,1200);taps.reset();assert.equal(taps.tap(1,1250),false);
});
