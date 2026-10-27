import test from 'node:test';
import assert from 'node:assert/strict';
import {createSliceGame,sliceHits,sliceProgress,finishSliceProgress,claimSliceReward} from './shape-slice-engine.js';
import {advanceModeStats,claimAllAchievements} from './achievement-catalog.js';
const advance=(game,seconds)=>{for(let i=0;i<seconds*120;i++)game.step(1/120);};
const target=(g,x=180,extra={})=>g.spawn({x,y:250,vx:0,vy:0,shape:0,color:1,angle:0,...extra});
test('swipes use swept segments and real shape outlines, including rotated shapes',()=>{
 for(const shape of [0,1,2,3]){const p={x:180,y:250,r:27,shape,angle:.7};assert(sliceHits(p,{x:60,y:250},{x:300,y:250}));assert(!sliceHits(p,{x:60,y:300},{x:300,y:300}));}
 const square={x:0,y:0,r:27,shape:2,angle:0};assert(!sliceHits(square,{x:25,y:22},{x:26,y:23}));assert(!sliceHits(square,{x:NaN,y:0},{x:0,y:0}));
});
test('a stationary touch does not cut, and a fast swipe cannot skip or double-score a target',()=>{
 const g=createSliceGame({autoSpawn:false});target(g);g.beginStroke();assert.equal(g.slice({x:180,y:250},{x:180,y:250}).length,0);assert.equal(g.slice({x:0,y:250},{x:360,y:250}).length,1);assert.equal(g.score,1);assert.equal(g.sliced,1);g.slice({x:360,y:250},{x:0,y:250});assert.equal(g.score,1);g.endStroke();target(g);g.slice({x:0,y:250},{x:360,y:250});assert.equal(g.score,1);
});
test('three shapes in one swipe earn six points including combo bonuses',()=>{
 const g=createSliceGame({autoSpawn:false});for(const x of [80,180,280])target(g,x);g.beginStroke();g.slice({x:0,y:250},{x:360,y:250});assert.equal(g.score,6);assert.equal(g.bestCombo,3);assert.equal(g.sliced,3);g.endStroke();target(g);g.beginStroke();g.slice({x:0,y:250},{x:360,y:250});assert.equal(g.score,7);
});
test('holding a gesture across later waves cannot accumulate a perpetual combo',()=>{
 const g=createSliceGame({autoSpawn:false});g.beginStroke();target(g);g.slice({x:0,y:250},{x:360,y:250});advance(g,.5);target(g);g.slice({x:0,y:250},{x:360,y:250});assert.equal(g.bestCombo,1);
});
test('hazards cost one chance and suppress the same swipe combo; escaped hazards are harmless',()=>{
 const g=createSliceGame({autoSpawn:false});target(g,180,{hazard:true});for(const x of [80,130,270])target(g,x);g.beginStroke();g.slice({x:0,y:250},{x:360,y:250});assert.equal(g.lives,2);assert.equal(g.score,3);assert.equal(g.bestCombo,1);assert.equal(g.hazards,1);g.spawn({hazard:true,y:600,vy:100});advance(g,.1);assert.equal(g.lives,2);
});
test('missed shapes and hazards share exactly three chances, and game over stops future scoring',()=>{
 const g=createSliceGame({autoSpawn:false});g.spawn({y:600,vy:100,entered:true});advance(g,.1);assert.equal(g.lives,2);for(let i=0;i<2;i++){target(g,180,{hazard:true});g.beginStroke();g.slice({x:0,y:250},{x:360,y:250});}assert(g.over);assert.equal(g.lives,0);target(g);g.beginStroke();g.slice({x:0,y:250},{x:360,y:250});assert.equal(g.score,0);const time=g.time;advance(g,2);assert.equal(g.time,time);
});
test('shapes launch from below, rise into view and fall under gravity; missed targets leave the world',()=>{
 const g=createSliceGame({autoSpawn:false,rng:()=>.5});const p=g.spawn();assert(p.y>560);assert(p.vy<0);advance(g,1);assert(p.y<300);assert(p.entered);advance(g,2);assert.equal(g.pieces.length,0);assert.equal(g.missed,1);
});
test('waves accelerate without spawning hazards in the opening seconds; stalled frames are bounded',()=>{
 const events=[],g=createSliceGame({rng:()=>0,onEvent:e=>events.push(e)});g.step(1000);assert(g.time<=.051);advance(g,6);assert(!g.pieces.some(p=>p.hazard));assert(g.wave>=2);
});
test('slice events retain the original shape, motion and cut direction for two-piece rendering',()=>{
 let cut;const g=createSliceGame({autoSpawn:false,onEvent:e=>{if(e.type==='slice')cut=e;}});target(g,180,{shape:3,color:2,angle:.7,vx:30});g.beginStroke();g.slice({x:180,y:100},{x:180,y:400});assert.equal(cut.angle,Math.PI/2);assert.equal(cut.piece.color,2);assert.equal(cut.piece.shape,3);assert.equal(cut.piece.vx,30);assert.equal(cut.piece.angle,.7);
});
test('run totals and wallet receipts survive retries without altering Shape Drop progress',()=>{
 const id='shape-slice-12345678-1234-1234-1234-123456789abc';let p=finishSliceProgress(null,{score:135,sliced:12,bestCombo:3},id);p=sliceProgress(JSON.parse(JSON.stringify(p)));assert.equal(p.best,12);assert.equal(p.sliced,12);assert.deepEqual(finishSliceProgress(p,{score:135,sliced:12,bestCombo:3},id),p);const wallet={coins:8,xp:30,dropRewards:['saved-drop'],achievementClaims:['games_dropBest_100']};const next=claimSliceReward(wallet,p.pending[0]);assert.equal(next.coins,20);assert.equal(next.xp,42);assert.deepEqual(next.dropRewards,wallet.dropRewards);assert.equal(claimSliceReward(next,p.pending[0]),next);assert.equal(claimSliceReward(wallet,{id,sliced:-1}),wallet);
});
test('slice achievements stay in Games and coexist with Drop; collect all remains tab-specific',()=>{
 let stats=advanceModeStats({}, {mode:'games',type:'dropHistory',best:250,cleared:50,bestCombo:3});stats=advanceModeStats(stats,{mode:'games',type:'sliceHistory',best:500,sliced:150,bestCombo:4});assert.equal(stats.games.dropBest,250);assert.equal(stats.games.sliceBest,500);assert.equal(stats.endless.best,0);const profile={coins:0,achievementClaims:[]},next=claimAllAchievements(profile,stats,'games');assert(next.achievementClaims.some(id=>id.startsWith('games_slice')));assert(next.achievementClaims.some(id=>id.startsWith('games_drop')));assert(next.achievementClaims.every(id=>id.startsWith('games_')));assert.deepEqual(claimAllAchievements(next,stats,'games'),next);
});

test('default launches start fully below the floor and emit one falling cue at the apex',()=>{
 for(const random of [0,.5,.999]){
  const events=[],g=createSliceGame({autoSpawn:false,rng:()=>random,onEvent:e=>events.push(e)}),p=g.spawn();
  assert(p.y-p.r*1.5>560);assert(p.vy<0);advance(g,1.6);
  const falls=events.filter(e=>e.type==='fall');assert.equal(falls.length,1);assert.equal(falls[0].piece.id,p.id);
  advance(g,2);assert.equal(events.filter(e=>e.type==='fall').length,1);
 }
});
