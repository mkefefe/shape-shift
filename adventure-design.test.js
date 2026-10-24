import test from 'node:test';
import assert from 'node:assert/strict';
import {adventureDesign,createRockLayout,damageAdjacentRocks,collectionBoard,levelSpec} from './world-menu.js?v=49439-web22';
import {matches,seededRandom} from './engine.js';
test('obstacle lessons preserve a reachable board and every block clears without powers',()=>{
 for(let level=1;level<=100;level++){
  const design=adventureDesign(level);if(!design)continue;
  assert(design.size<=levelSpec(level).maxChoices);
  let layout=createRockLayout(level,design.size);
  assert(layout.cells.length>=5);assert(layout.rocks.length<=2);
  for(let round=0;round<4&&layout.rocks.length;round++)layout=damageAdjacentRocks(layout,layout.cells.map((_,i)=>i));
  assert.equal(layout.rocks.length,0,'Level '+level);
  assert.deepEqual([...layout.cells].sort((a,b)=>a-b),Array.from({length:design.size},(_,i)=>i+1));
  assert.equal(damageAdjacentRocks(layout,[0]).rocks.length,0);
  for(let seed=0;seed<16;seed++){
   const state={current:{shape:seed%4,color:Math.floor(seed/4)}};
   const start=createRockLayout(level,design.size);
   const board=collectionBoard(level,state,start.cells.map(()=>({shape:3,color:3})),seededRandom(seed));
   assert(board.some(t=>matches(state.current,t)),'Reachable collection at '+level);
  }
 }
});
test('first blocks are gentle and new-mechanic lessons stay clear',()=>{
 assert.deepEqual(adventureDesign(4),{name:'First block',size:6,blocks:[5],hits:1});
 for(const level of [1,2,3,5,8,10,11,12,13,14,15,20,21,22,23])assert.equal(adventureDesign(level),null);
 for(const level of [9,19,24,30,100])assert.equal(adventureDesign(level).hits,2);
});
