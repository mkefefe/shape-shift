import test from 'node:test';import assert from 'node:assert/strict';
import {STAR_PLAN} from './adventure-star-tasks.js';
import {levelTasks,levelObjectives,levelTaskStatus,trackLevelAbility,trackLevelPick,ensureStarPickup,levelRequirements,levelComplete} from './world-menu.js';
import {BOOST_UNLOCK_LEVELS} from './economy.js';
test('100 distinct plans, three optional stars, and no boost tasks before unlock',()=>{
 assert.equal(STAR_PLAN.length,100);assert.equal(new Set(STAR_PLAN.map(r=>[...r].sort().join(' '))).size,100);
 for(let level=1;level<=100;level++){const tasks=levelTasks(level);assert.equal(tasks.length,3);for(const t of tasks)if(t.type==='ability')for(const name of t.ability==='all'?['shield','freeze','boost']:[t.ability])assert(level>BOOST_UNLOCK_LEVELS[name]);
  const stats={won:true,elapsed:0,wrong:0,bestStreak:99,colorChanges:99,shapeChanges:99,pickups:{crystal:1,starburst:1,bomb:1},abilities:{shield:true,freeze:true,boost:true},frame:tasks.find(t=>t.type==='frame')?.frame};
  assert(levelObjectives(level,stats).every(o=>o.done));assert(levelObjectives(level,{...stats,won:false}).every(o=>!o.done));
 }
});
test('frame earns one optional star only on a win and collections still unlock completion',()=>{
 const tasks=levelTasks(40),index=tasks.findIndex(t=>t.type==='frame');assert.equal(tasks[index].frame,'ice');
 assert(!levelObjectives(40,{won:true,frame:'none'})[index].done);assert(levelObjectives(40,{won:true,frame:'ice'})[index].done);
 assert.equal(levelTaskStatus(40,{frame:'ice'})[index].value,'Equipped');
 const stats={collections:{},memoryCollected:0};for(const goal of levelRequirements(40))if(goal.type==='collection')stats.collections[goal.color+':'+goal.shape]=goal.target;else stats.memoryCollected=goal.target;
 assert(levelComplete(40,stats));
});
test('all three boosts means three distinct successful activations in this run',()=>{
 let s={};for(let i=0;i<3;i++)s=trackLevelAbility(s,'shield');const at=levelTasks(28).findIndex(t=>t.type==='ability');assert.equal(levelTaskStatus(28,s)[at].value,'1 / 3');assert(!levelObjectives(28,{...s,won:true})[at].done);
 s=trackLevelAbility(s,'freeze');s=trackLevelAbility(s,'boost');assert(levelObjectives(28,{...s,won:true})[at].done);assert(!levelObjectives(28,{won:true})[at].done);
});
test('pickup stars require clicking the pickup and offer it without displacing memory or the last ordinary choices',()=>{
 const board=[{shape:0,color:0},{shape:1,color:1},{shape:2,color:2},{memory:true,shape:3,color:3}];
 for(let level=1;level<=100;level++){const task=levelTasks(level).find(t=>t.type==='pickup');if(!task)continue;const offered=ensureStarPickup(level,{}, {},board);assert(offered.some(t=>t.special===task.special));assert.equal(offered[3],board[3]);assert.equal(offered.filter(t=>!t.special&&!t.memory).length,2);
 assert.equal(ensureStarPickup(level,{}, {},offered),offered);assert.equal(ensureStarPickup(level,{}, {heldBoard:board},board),board);assert.deepEqual(ensureStarPickup(level,{}, {},board.slice(0,2)),board.slice(0,2));
 }
});

test('only collected pickups satisfy pickup stars and fresh runs start empty',()=>{
 const index=levelTasks(22).findIndex(t=>t.type==='pickup');
 for(const outcome of ['wrong','miss','protected','ready'])assert(!levelObjectives(22,{...trackLevelPick({}, {special:'crystal'},false,outcome),won:true})[index].done);
 const stats=trackLevelPick({}, {special:'crystal'},false,'correct');assert(levelObjectives(22,{...stats,won:true})[index].done);assert(!levelObjectives(22,{won:true})[index].done);
 const board=[{shape:0,color:0},{shape:1,color:1},{shape:2,color:2}];assert.equal(ensureStarPickup(22,stats,{},board),board);
});
