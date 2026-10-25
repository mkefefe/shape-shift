import {fitDropArtwork,dropShapeBox} from './shape-drop-view.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRun,applyLoadout,choose,spendAbility,advanceBoard,awardVictoryBoard,stopAbility} from './engine.js';
import {earnCoin,adventureCompletionReward} from './economy.js';
import {createSliceGame,finishSliceProgress,claimSliceReward,sliceProgress} from './shape-slice-engine.js';
import {createPianoGame,finishPianoProgress,claimPianoReward,pianoProgress} from './piano-flow-engine.js';
import {createDropGame,finishDropProgress,claimDropReward,dropProgress} from './shape-drop-engine.js';
const base=frame=>applyLoadout(createRun(()=>0),frame,'garden');
test('Blossom doubles normal, boosted, streak, pickup, bomb and victory points',()=>{
 for(const boosted of [false,true]){
  let a=base('none'),b=base('blossom');if(boosted){a=spendAbility(a,'boost');b=spendAbility(b,'boost');}
  assert.equal(choose(b,[b.current],0).earned,boosted?10:2);
  for(const special of ['heart','hourglass','crystal','reset','starburst','bomb']){
   const board=[{special},a.current,a.current];assert.equal(choose(b,board,0).earned,choose(a,board,0).earned*2);
  }
  for(let i=0;i<12;i++){a=advanceBoard(choose(a,[a.current],0));b=advanceBoard(choose(b,[b.current],0));assert.equal(b.score,a.score*2);}
  assert.equal(choose(stopAbility(b,'boost'),[b.current],0).earned,choose(stopAbility(a,'boost'),[a.current],0).earned*2);
  const end=awardVictoryBoard({...b,mode:'adventure'},[b.current,{special:'heart'}],true);
  assert.equal(end.victoryBonus,4);assert.equal(awardVictoryBoard(end,[b.current],true),end);
 }
});
test('Blossom doubles gameplay XP without multiplying coins or paying lost-level XP',()=>{
 const p={xp:10,coins:20,equipped:{frame:'blossom'}};
 assert.deepEqual(earnCoin(p,{frame:'blossom',multiplier:5}),{...p,xp:16,coins:25});
 assert.equal(adventureCompletionReward(p,true).xp,60);assert.equal(adventureCompletionReward(p,false),p);
 assert.equal(earnCoin(p,{frame:'none',multiplier:1}).xp,13);
});
test('mini-game XP bonus survives deferred claims and does not change old receipts or double-pay',()=>{
 for(const [prefix,finish,claim,normalize,result] of [
  ['shape-slice',finishSliceProgress,claimSliceReward,sliceProgress,{sliced:250}],
  ['shape-drop',finishDropProgress,claimDropReward,dropProgress,{cleared:250,matches:4,bombPoints:2}],
  ['piano-flow',finishPianoProgress,claimPianoReward,pianoProgress,{hits:250,coins:250}]
 ]){
  const id=prefix+'-12345678-1234-1234-1234-123456789abc';
  const progress=normalize(JSON.parse(JSON.stringify(finish({}, {...result,frame:'blossom'},id))));
  const entry=progress.pending[0],p={coins:0,xp:0,equipped:{frame:'none'}};
  const paid=claim(p,entry);assert.equal(paid.xp,400);assert.equal(claim(paid,entry),paid);
  const old={...entry};delete old.xpMultiplier;assert.equal(claim({...p,equipped:{frame:'blossom'}},old).xp,200);
  assert.equal(paid.coins,claim(p,old).coins);
 }
});
test('Slice and Piano score real actions twice but retain actual hit counts',()=>{
 const s=createSliceGame({frame:'blossom',autoSpawn:false});s.spawn({x:180,y:250,vx:0,vy:0,shape:0,color:1,angle:0});s.beginStroke();s.slice({x:0,y:250},{x:360,y:250});assert.equal(s.score,2);assert.equal(s.sliced,1);
 const p=createPianoGame({frame:'blossom'});p.start();while(p.beat<0)p.step(1/240);p.press(p.notes[0].lane);assert.equal(p.score,2);assert.equal(p.hits,1);assert.equal(p.coins,1);
 assert.equal(finishSliceProgress({},s,'x').best,2);assert.equal(finishPianoProgress({},p,'x').best,2);
});
test('Drop doubles matched and bomb points while retaining actual clear counts',()=>{
 const context={console};vm.runInNewContext(fs.readFileSync(new URL('./assets/vendor/matter-0.20.0.min.js',import.meta.url),'utf8'),context);
 const g=createDropGame(context.Matter,{frame:'blossom',autoDrop:false});
 g.addPiece({shape:0,color:1},140,498);g.addPiece({shape:0,color:2},180,498);
 for(let i=0;i<360;i++)g.step(1/120);assert(g.matches>0);assert.equal(g.score,g.matches*2);
 g.addPiece({shape:2,color:3},70,498);const before=g.score;const cleared=g.bombAt(70,498);assert(cleared.length);assert.equal(g.score-before,cleared.length*2);
 assert.equal(finishDropProgress({},g,'x').best,g.score);g.dispose();
});

test('Drop preview is the exact next piece and survives failed drops and rotation',()=>{
 const context={console};vm.runInNewContext(fs.readFileSync(new URL('./assets/vendor/matter-0.20.0.min.js',import.meta.url),'utf8'),context);
 const g=createDropGame(context.Matter,{autoDrop:false});assert.equal(g.queue.length,2);
 const first=g.queue[0],preview=g.queue[1];g.rotate();assert.equal(g.queue[1],preview);
 assert(g.drop());assert.equal(g.queue[0],preview);assert.equal(g.queue.length,2);assert.equal(g.pieces[0].drop.shape,first.shape);
 const next=g.queue[1];assert.equal(g.drop(),false);assert.equal(g.queue[1],next);
 for(let i=0;i<60;i++)g.step(1/120);assert(g.drop());assert.equal(g.queue[0],next);g.dispose();
});

test('Drop art occupies the physical silhouette even with wide or tall source crops',()=>{
 for(const shape of [0,1,2,3])for(const radius of [25,40,80])for(const aspect of [.8,1,531/508,580/496,1.4])assert.deepEqual(fitDropArtwork(shape,radius,aspect),dropShapeBox(shape,radius));
});
test('touching matching squares merge, but separated squares do not',()=>{
 const context={console};vm.runInNewContext(fs.readFileSync(new URL('./assets/vendor/matter-0.20.0.min.js',import.meta.url),'utf8'),context);
 let clears=0;const g=createDropGame(context.Matter,{autoDrop:false,onClear:()=>clears++});
 const a=g.addPiece({shape:2,color:0,r:40},100,400),b=g.addPiece({shape:2,color:0,r:40},170,400);
 g.step(1/120);assert.equal(clears,0);context.Matter.Body.setPosition(b,{x:166,y:a.position.y});g.step(1/120);assert.equal(clears,1);assert.equal(g.cleared,2);g.dispose();
});
