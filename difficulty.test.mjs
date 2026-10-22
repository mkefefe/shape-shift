import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,choose,expire,boardSize,makeBoard,duration,DIFFICULTIES,spendAbility,advanceBoard,elapsedBoardTime,seededRandom,matches,specialSpawnChance,applyLoadout} from './engine.js';
const run=id=>({...createRun(()=>0),mode:'endless',difficulty:id});
test('all difficulties accelerate gradually and stop at a playable floor',()=>{for(const [id,d] of Object.entries(DIFFICULTIES)){assert.equal(duration(run(id)),d.start);assert.equal(duration({...run(id),picks:10000}),450);let previous=d.start;for(let picks=1;picks<1000;picks++){const next=duration({...run(id),picks});assert.ok(previous-next>=0&&previous-next<=d.ramp);previous=next;}}});
test('difficulty points stack with boost without multiplying correct-pick count',()=>{for(const [id,d] of Object.entries(DIFFICULTIES)){const result=choose(spendAbility(run(id),'boost'),[{shape:0,color:0}],0);assert.equal(result.score,5*d.points);assert.equal(result.picks,1);assert.equal(advanceBoard({...result,boostRounds:1}).multiplier,1);}});
test('adventure and games ignore selected endless difficulty',()=>{for(const mode of ['adventure','rush']){const state={...run('extreme'),mode};assert.equal(duration(state),2800);assert.equal(choose(state,[{shape:0,color:0}],0).score,1);}});
test('difficulty applies to starburst and cosmic tiles consistently',()=>{const state=run('hard');assert.equal(choose(state,[{special:'starburst'},{shape:0,color:0},{shape:1,color:1}],0).score,4);assert.equal(choose(state,[{shape:0,color:0,bonusTile:true}],0).score,4);});
test('slow time doubles the reaction window in every difficulty',()=>{for(const id of Object.keys(DIFFICULTIES)){const base=run(id),slowed=spendAbility(base,'freeze');assert.equal(duration(slowed),duration(base));assert.equal(elapsedBoardTime(duration(base)*2,slowed.slow),duration(base));}});

test('Hard and Extreme use complete grid sizes, with a late Hard expansion',()=>{
 const sizes=[1,2,3,4,6,9,12,16];
 for(const id of ['hard','extreme']){
  let state=run(id);
  for(let round=0;round<=105;round++){
   const expected=round<8?sizes[round]:id==='extreme'||round>=100?20:16;
   assert.equal(boardSize(state),expected,`${id} after ${round} correct rounds`);
   assert.equal(makeBoard(state,()=>.5).length,expected);
   state=advanceBoard({...state,outcome:'correct'});
  }
 }
});
test('local pickups and cosmic board picks do not grow an unchanged board; rewind restarts at one',()=>{let state={...run('extreme'),difficultyRound:16};state=advanceBoard(choose(state,[{special:'heart'}],0));assert.equal(boardSize(state),20);state=advanceBoard(choose(state,[{special:'reset'}],0));assert.equal(boardSize(state),1);state=advanceBoard(choose(state,[{shape:0,color:0}],0));assert.equal(boardSize(state),2);});
test('normal and adventure retain original board progression',()=>{assert.deepEqual([0,1,2,3,4,7,12,17].map(stage=>boardSize({...run('normal'),stage})),[1,2,3,4,6,9,12,16]);assert.equal(boardSize({...run('extreme'),mode:'adventure',stage:4}),6);});

test('missed and passed rounds do not grow Hard or Extreme',()=>{for(const id of ['hard','extreme'])for(const outcome of ['wrong','miss','pass','protected'])assert.equal(boardSize(advanceBoard({...run(id),outcome})),1);});


test('large Hard and Extreme boards have bounded matches, favor shape over color, and distribute positions',()=>{
 for(const id of ['hard','extreme'])for(const size of [1,2,3,4,6,9,12,16,20]){
  const rng=seededRandom(729),state=run(id),slots=new Set();let color=0,shape=0,empty=0,total=0;
  for(let n=0;n<4000;n++){
   const board=makeBoard(state,rng,size),valid=board.filter(t=>matches(state.current,t));
   assert.equal(board.length,size);
   assert.ok(valid.length<=(id==='extreme'?1:2));
   if(!valid.length)empty++;
   board.forEach((t,i)=>{if(matches(state.current,t))slots.add(i);});
   for(const t of valid){assert.notEqual(t.color===state.current.color,t.shape===state.current.shape);color+=t.color===state.current.color;shape+=t.shape===state.current.shape;total++;}
  }
  assert.equal(slots.size,size);
  assert.ok(empty>350&&empty<700,'existing no-match rounds remain available');
  const expected=id==='extreme'?.15:.25;
  assert.ok(Math.abs(color/total-expected)<.035);
  assert.ok(shape>color);
 }
});
test('sparse boards respect Blossom, preserve pickups, and leave Cosmic reward intact',()=>{
 for(const difficulty of ['hard','extreme']){
  const state={...run(difficulty),excludedShape:2,pendingSpecials:[{slot:17,special:'heart'}]};
  for(let seed=0;seed<100;seed++){
   const board=makeBoard(state,seededRandom(seed),20);
   assert.equal(board[17].special,'heart');assert.ok(board.every(t=>t.shape!==2));
  }
  const sweep=makeBoard({...state,sweepPending:true,difficultyRound:8},seededRandom(1));
  assert.ok(sweep.every(t=>t.bonusTile&&t.color===state.current.color));
 }
});
test('local special replacement does not add an extra match to Extreme or change other tiles',()=>{
 const heldBoard=[{shape:0,color:1},{special:'heart'},{shape:2,color:2}];
 for(let seed=0;seed<100;seed++){
  const board=makeBoard({...run('extreme'),heldBoard,replacedIndex:1},seededRandom(seed));
  assert.deepEqual(board[0],heldBoard[0]);assert.deepEqual(board[2],heldBoard[2]);
  assert.equal(board.filter(t=>matches(run('extreme').current,t)).length,1);
 }
});


test('all Endless modes converge at high scores, with ordered difficulty curves',()=>{
 for(const score of [0,10,50,100,250,500,1000,1200,10000]){
  const times=Object.keys(DIFFICULTIES).map(id=>duration({...run(id),score,picks:20}));
  assert.ok(times.every((t,i)=>i===0||t<=times[i-1]));
  if(score>=1000)assert.ok(times.every(t=>t===times[0]));
 }
 for(const id of Object.keys(DIFFICULTIES)){
  const high={...run(id),score:1200,picks:20};
  assert.ok(duration(advanceBoard(choose(high,[{special:'reset'}],0)))<=duration(high));
  assert.equal(duration({...high,continued:true}),duration(high));
  assert.equal(duration(applyLoadout(high,'ice','moon',()=>0,2)),928);
 }
});
test('Endless pickup rates taper with pressure and retain equipped background benefits',()=>{
 for(const id of Object.keys(DIFFICULTIES)){
  const start=run(id),late={...start,score:1200,picks:20};
  assert.ok(specialSpawnChance(late)<specialSpawnChance(start));
  assert.ok(specialSpawnChance(late)>0);
  assert.ok(Math.abs(specialSpawnChance({...late,map:'sunset'})/specialSpawnChance(late)-20/9)<1e-12);
  const pending=makeBoard({...late,pendingSpecials:[{special:'heart',slot:0}]},seededRandom(9));
  assert.equal(pending[0].special,'heart');
 }
 for(const score of [0,200,1200]){
  const rates=Object.keys(DIFFICULTIES).map(id=>specialSpawnChance({...run(id),score}));
  assert.ok(rates.every((rate,i)=>i===0||rate<rates[i-1]));
 }
 assert.equal(specialSpawnChance({...run('extreme'),mode:'adventure',score:1200}),.045);
 assert.equal(duration({...run('extreme'),mode:'adventure',picks:1000,score:1200}),1800);
});

test('Endless continues accelerating past 1,000 and 2,000 points without a zero timer',()=>{
 const times=[1000,2000,4000,10000].map(score=>duration({...run('normal'),score,picks:20}));
 assert.deepEqual(times,[750,563,450,450]);
});
