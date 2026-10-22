import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceBoard,applyLoadout,abilityActive,stopAbility,frameDelta,seededRandom,createRun,matches,choose,expire,makeBoard,boardSize,duration,spendAbility,revive,elapsedBoardTime} from './engine.js';
const base=()=>({...createRun(()=>0),current:{shape:1,color:0}});
test('each valid selection earns exactly one point and adopts both attributes',()=>{
 const start=base();
 for(let shape=0;shape<4;shape++)for(let color=0;color<4;color++){
  const tile={shape,color};const result=choose(start,[tile],0);
  if(matches(start.current,tile)){assert.equal(result.score,1);assert.deepEqual(result.current,tile);}
  else {assert.equal(result.score,0);assert.equal(result.strikes,1);}
 }
 assert.equal(start.score,0);assert.equal(start.current.color,0);
});
test('three lifetime missed matches end run; correct choice preserves lost lives',()=>{
 const tile={shape:1,color:2};let state=base();
 state=expire(state,[tile]);assert.equal(state.strikes,1);assert.equal(state.over,false);
 state=expire(state,[tile]);assert.equal(state.strikes,2);
 const recovered=choose(state,[tile],0);assert.equal(recovered.strikes,2);assert.equal(recovered.score,1);
 state=expire(state,[tile]);assert.equal(state.over,true);assert.equal(state.strikes,3);
 assert.deepEqual(choose(state,[tile],0),state);
});
test('no-match boards pass without strikes or points and preserve prior strikes',()=>{
 const state={...base(),strikes:2};
 const result=expire(state,[{shape:3,color:3},{shape:0,color:2}]);
 assert.equal(result.strikes,2);assert.equal(result.over,false);assert.equal(result.score,0);
 assert.equal(result.outcome,'pass');
});
test('wrong choices cost one strike, never points, and do not transform the player',()=>{
 let state=base();const wrong=[{shape:0,color:3}];
 for(let i=1;i<=3;i++){state=choose(state,wrong,0);assert.equal(state.strikes,i);assert.equal(state.score,0);assert.deepEqual(state.current,base().current);}
 assert(state.over);assert.deepEqual(choose(base(),wrong,5),base());
});
test('boards fill every slot through sixteen with legal shapes or special items',()=>{
 let seed=143;
 const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 let passes=0,playable=0;
 for(let shape=0;shape<4;shape++)for(let color=0;color<4;color++)for(let score=0;score<60;score++){
  const state={...base(),current:{shape,color},picks:score,score};const board=makeBoard(state,rng);
  assert.equal(board.length,boardSize(state));
  
  board.forEach(t=>assert(t.special||t.shape>=0&&t.shape<4&&t.color>=0&&t.color<4));
  if(board.some(t=>matches(state.current,t)))playable++;else passes++;
 }
 assert(passes>0&&playable>0);
 assert.equal(boardSize(base()),1);assert.equal(boardSize({...base(),picks:100}),16);
 assert(duration({...base(),picks:30})<duration(base()));assert.equal(duration({...base(),picks:1000}),1800);
});
test('time and score boosts last five boards and can be charged again only when expired',()=>{
 let s=spendAbility(spendAbility(base(),'freeze'),'boost');assert.equal(spendAbility(s,'boost'),s);assert.equal(spendAbility(s,'freeze'),s);
 for(let i=0;i<5;i++){assert(s.slow);assert.equal(s.multiplier,5);s=advanceBoard(choose(s,[s.current],0));}
 assert(!s.slow);assert.equal(s.multiplier,1);assert.equal(s.boostRounds,0);s=spendAbility(s,'boost');assert.equal(s.boostRounds,5);assert.equal(s.multiplier,5);
});

test('opening grows each correct pick, then holds six for three and nine and twelve for five',()=>{assert.deepEqual([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,100].map(picks=>boardSize({...base(),picks})),[1,2,3,4,6,6,6,9,9,9,9,9,12,12,12,12,12,16,16]);});
test('shield protects exactly one mistake without awarding points or clearing existing strikes',()=>{let s=spendAbility({...base(),strikes:2},'shield');assert(s.protected);assert.equal(s.shield,0);s=expire(s,[s.current]);assert.equal(s.strikes,2);assert.equal(s.score,0);assert.equal(s.outcome,'protected');assert.equal(s.protected,false);assert(expire(s,[s.current]).over);});
test('slow time halves elapsed time; rewarded continue preserves score and works once',()=>{assert.equal(elapsedBoardTime(400,true),200);assert.equal(elapsedBoardTime(400,false),400);let s={...base(),score:28,strikes:3,over:true};s=revive(s);assert.equal(s.score,28);assert.equal(s.strikes,0);assert.equal(s.over,false);assert(s.continued);const ended={...s,over:true,strikes:3};assert.equal(revive(ended),ended);assert.equal(revive(base()).continued,false);});

test('shield is single-use; correct picks never restore shield or lives',()=>{
 let s=spendAbility(base(),'shield');const wrong=[{shape:0,color:3}];s=choose(s,wrong,0);assert(!s.protected);assert.equal(s.strikes,0);
 s=choose(s,[s.current],0);assert(!s.protected);assert.equal(s.shield,0);
 for(let i=0;i<2;i++){s=choose(s,wrong,0);assert(!s.over);s=choose(s,[s.current],0);assert.equal(s.strikes,i+1);}s=choose(s,wrong,0);assert(s.over);
});
test('five-point scoring does not skip board progression and misses earn no bonus',()=>{
 let s=spendAbility(base(),'boost');s=choose(s,[s.current],0);assert.equal(s.score,5);assert.equal(s.picks,1);assert.equal(boardSize(s),2);
 const missed=expire(s,[s.current]);assert.equal(missed.score,5);assert.equal(missed.picks,1);
 assert.equal(duration(s),2795);assert.equal(elapsedBoardTime(duration(s)*2,true),duration(s));
});

test('waiting for one color cannot erase missed playable boards, with or without shield',()=>{for(const shield of [false,true]){let s=createRun(()=>0);if(shield)s=spendAbility(s,'shield');let misses=0;while(!s.over&&misses<10){s=expire(s,[{shape:s.current.shape,color:1}]);misses++;if(!s.over){const lost=s.strikes;s=choose(s,[{shape:s.current.shape,color:0}],0);assert.equal(s.strikes,lost);}}assert.equal(misses,shield?4:3);assert(s.over);}});

test('starburst scores only ordinary tiles, preserves other specials and consumes itself',()=>{
 const board=[{special:'starburst'},{special:'heart'},{shape:0,color:3},{shape:1,color:1}];
 for(const multiplier of [1,5]){const s=choose({...base(),multiplier},board,0);assert.equal(s.score,2*multiplier);assert.equal(s.picks,1);assert.deepEqual(s.pendingSpecials.map(t=>t.special),['heart']);assert.deepEqual(s.current,base().current);}
 assert.equal(choose(base(),[{special:'starburst'},{special:'heart'}],0).score,0);
});
test('rewind removes every special and restarts at one ordinary tile',()=>{
 let s=choose({...base(),picks:30,stage:11},[{special:'reset'},{special:'heart'},{special:'crystal'}],0);
 assert.equal(boardSize(s),1);assert.deepEqual(s.pendingSpecials,[]);s=advanceBoard(s);const board=makeBoard(s,()=>0);assert.equal(board.length,1);assert(!board[0].special);assert.equal(s.picks,31);
 s=choose(s,[s.current],0);assert.equal(boardSize(s),2);s=choose(s,[s.current],0);assert.equal(boardSize(s),3);
});
test('uncollected specials persist through correct picks, mistakes and timeout',()=>{
 const board=[{special:'heart'},base().current,{shape:3,color:3}];
 for(const s of [choose(base(),board,1),choose(base(),board,2),expire(base(),board)]){const next=makeBoard(advanceBoard({...s,stage:8}),()=>.5);assert.equal(next[0].special,'heart');}
});
test('heart restores health, crystal blocks one hit, hourglass slows next three boards',()=>{
 let s=choose({...base(),strikes:2},[{special:'heart'}],0);assert.equal(s.strikes,0);assert.equal(s.score,1);
 s=choose({...base(),strikes:2},[{special:'crystal'}],0);assert(s.protected);s=expire(s,[s.current]);assert.equal(s.strikes,2);assert(!s.protected);
 s=advanceBoard(choose(base(),[{special:'hourglass'}],0));for(let i=3;i>0;i--){assert.equal(s.pickupSlowRounds,i);assert.equal(s.slowRounds,0);assert(s.slow);s=advanceBoard(choose(s,[s.current],0));}assert(!s.slow);
});

test('speed changes gently and stays capped for arbitrarily long runs',()=>{let previous=duration({picks:0});assert.equal(previous,2800);for(let picks=1;picks<=1000;picks++){const next=duration({picks});assert(next<=previous);assert(previous-next<=5);assert(next>=1800);previous=next;}assert.equal(duration({picks:200}),1800);assert.equal(duration({picks:1000000}),1800);});
test('lag spikes cannot consume a whole board in a single rendered frame',()=>{assert.equal(frameDelta(1016,1000),16);assert.equal(frameDelta(6000,1000),100);assert.equal(frameDelta(900,1000),0);assert.equal(elapsedBoardTime(frameDelta(6000,1000),true),50);});

test('turning off each boost clears it immediately without restoring health or refunding charges',()=>{for(const name of ['shield','freeze','boost']){let s=spendAbility({...base(),strikes:1},name);assert(abilityActive(s,name));s=stopAbility(s,name);assert(!abilityActive(s,name));assert.equal(s.strikes,1);assert.equal(s[name],0);assert.equal(stopAbility(s,name),s);}});
test('gold frame grants four total hearts and heart potion restores that capacity',()=>{let s=applyLoadout(base(),'gold','garden');for(let i=1;i<=3;i++){s=expire(s,[s.current]);assert.equal(s.strikes,i);assert(!s.over);}s=choose(s,[{special:'heart'}],0);assert.equal(s.strikes,0);assert.equal(s.maxLives,4);for(let i=0;i<4;i++)s=expire(s,[s.current]);assert(s.over);});
test('frame and map time perks stack and opening garden bonus ends after five picks',()=>{const s=base();assert.equal(duration(applyLoadout(s,'none','garden')),3000);assert.equal(duration(applyLoadout({...s,picks:5},'none','garden')),2775);assert.equal(duration(applyLoadout(s,'ice','moon')),3388);});
test('blossom, cosmic and sunset perks apply only to their intended events',()=>{let s=choose(applyLoadout({...base(),strikes:2},'blossom','garden'),[{special:'heart'}],0);assert.equal(s.protected,false);assert.equal(s.strikes,0);s=choose(applyLoadout(base(),'cosmic','garden'),[{special:'starburst'},base().current],0);assert.equal(s.earned,1);let a=applyLoadout(base(),'none','sunset'),b=base();for(let i=0;i<3;i++){a=choose(a,[a.current],0);b=choose(b,[b.current],0);}assert.equal(a.score,b.score);assert.throws(()=>applyLoadout(base(),'invalid','garden'));});

test('color rush repeats every ten correct picks and keeps uncollected tiles in place',()=>{
 let s=applyLoadout(base(),'cosmic','garden');for(let i=0;i<10;i++)s=choose(s,[s.current],0);
 assert.equal(s.sweepPending,true);assert.equal(s.chainTarget,10);
 let b=makeBoard(s);assert(b.every(t=>t.bonusTile&&t.color===s.current.color&&t.shape===s.current.shape));const size=b.length;
 for(let i=0;i<size;i++){s=choose(s,b,i);assert.equal(s.chainProgress,0);s=advanceBoard(s);if(i<size-1){b=makeBoard(s);assert.equal(b.length,size);assert(b[i].collected);assert.equal(choose(s,b,i),s);}}
 assert.equal(s.sweepBoard,null);assert.equal(s.sweepPending,false);
 for(let i=0;i<9;i++)s=choose(s,[s.current],0);assert.equal(s.sweepPending,false);s=choose(s,[s.current],0);assert.equal(s.sweepPending,true);assert.equal(s.chainTarget,10);
});
test('misses reset qualifying streak and bonus-board timeout ends the bonus without losing a life',()=>{
 let s=applyLoadout(base(),'cosmic','garden');for(let i=0;i<9;i++)s=choose(s,[s.current],0);s=expire(s,[s.current]);assert.equal(s.chainProgress,0);
 for(let i=0;i<10;i++)s=choose(s,[s.current],0);const b=makeBoard(s);const strikes=s.strikes;s=expire(s,b);assert.equal(s.sweepBoard,null);assert.equal(s.sweepPending,false);assert.equal(s.strikes,strikes);assert.ok(makeBoard(s).every(t=>!t.bonusTile));assert.equal(s.chainProgress,0);
});
test('Moonlit Forest grants 10 percent and Sunset has more special spawns',()=>{
 assert.equal(duration(applyLoadout(base(),'none','moon')),3080);
 let counts={garden:0,sunset:0};for(const map of Object.keys(counts)){const rng=seededRandom(777);for(let i=0;i<5000;i++){const s=applyLoadout({...base(),picks:20},'none',map);if(makeBoard(s,rng).some(t=>t.special))counts[map]++;}}
 assert(counts.sunset>800&&counts.sunset<1200);assert(counts.garden>300&&counts.garden<600);
});

test('Color Rush belongs only to Cosmic Crown and works on every map',()=>{
 for(const map of ['garden','moon','sunset'])for(const frame of ['none','gold','ice','blossom','cosmic']){
 let s=applyLoadout(base(),frame,map);for(let i=0;i<10;i++)s=choose(s,[s.current],0);
 assert.equal(s.sweepPending,frame==='cosmic');
 }
});

test('Blossom remains equipped and retains all four shapes and colors',()=>{
 for(let seed=1;seed<=120;seed++){
  const rng=seededRandom(seed*7919),state=applyLoadout({...createRun(rng),excludedShape:2},'blossom','garden',rng);
  assert.equal(state.frame,'blossom');assert.equal(state.excludedShape,null);
  const shapes=new Set(),colors=new Set();
  for(let i=0;i<30;i++)for(const tile of makeBoard({...state,picks:30,stage:20},rng))if(!tile.special){shapes.add(tile.shape);colors.add(tile.color);}
  assert.equal(shapes.size,4);assert.equal(colors.size,4);
 }
});
test('Blossom Wrath doubles points without changing pickup effects',()=>{
 let s=applyLoadout(base(),'blossom','sunset',()=>0);assert.equal(choose(s,[{special:'starburst'},s.current],0).earned,2);
 s=advanceBoard(choose(s,[{special:'hourglass'}],0));assert.equal(s.pickupSlowRounds,3);
 s=choose(s,[{special:'crystal'}],0);assert.equal(s.protectionHits,1);s=expire(s,[s.current]);assert.equal(s.protected,false);
 s=choose({...s,strikes:2},[{special:'heart'}],0);assert.equal(s.strikes,0);assert.equal(s.maxLives,3);assert.equal(s.protected,false);
});
test('all frames retain four shape types, including Blossom after continue',()=>{
 for(const frame of ['none','gold','ice','cosmic'])assert.equal(applyLoadout(base(),frame,'garden').excludedShape,null);
 let s=applyLoadout(base(),'blossom','moon',()=>.6);const excluded=s.excludedShape;s=revive({...s,over:true,strikes:3});assert.equal(s.excludedShape,excluded);
});

test('upgraded frames grant five hearts or 15 and 20 percent time and reject excess tiers',()=>{
 let s=applyLoadout(base(),'gold','garden',Math.random,1);assert.equal(s.maxLives,5);s=choose({...s,strikes:4},[{special:'heart'}],0);assert.equal(s.strikes,0);assert.equal(s.maxLives,5);
 assert.equal(duration(applyLoadout(base(),'ice','sunset',Math.random,1)),3220);
 assert.equal(duration(applyLoadout(base(),'ice','sunset',Math.random,2)),3360);
 assert.equal(duration(applyLoadout(base(),'ice','moon',Math.random,2)),3696);
 assert.throws(()=>applyLoadout(base(),'gold','garden',Math.random,2));assert.throws(()=>applyLoadout(base(),'ice','garden',Math.random,3));assert.throws(()=>applyLoadout(base(),'none','garden',Math.random,1));
});


test('new special items cover every board slot without a front-row bias',()=>{
 for(const stage of [7,12,17]){
  const state={...base(),picks:20,stage,map:'sunset'},size=boardSize(state),counts=Array(size).fill(0),rng=seededRandom(90421);
  for(let i=0;i<20000;i++){const board=makeBoard(state,rng);board.forEach((tile,slot)=>{if(tile.special)counts[slot]++;});}
  const average=counts.reduce((a,b)=>a+b,0)/size;
  assert(counts.every(count=>count>average*.7&&count<average*1.3),JSON.stringify(counts));
 }
});
test('retained pickups keep late-board positions after picks and timeout',()=>{
 const state={...base(),picks:25,stage:25},board=Array.from({length:16},()=>({...state.current}));
 board[11]={special:'heart'};board[15]={special:'hourglass'};
 for(const next of [choose(state,board,0),expire(state,board)]){
  const refreshed=makeBoard(advanceBoard(next),seededRandom(88));
  assert.equal(refreshed[11].special,'heart');assert.equal(refreshed[15].special,'hourglass');assert.equal(refreshed.filter(t=>t.special).length,2);
 }
});
test('relocated pickups cannot overwrite reserved pickups or each other',()=>{
 const state={...base(),picks:20,stage:3,pendingSpecials:[{special:'heart',slot:15},{special:'crystal',slot:2},{special:'hourglass',slot:2}]};
 const board=makeBoard(state,seededRandom(42));assert.equal(board[2].special,'crystal');
 assert.deepEqual(board.filter(t=>t.special).map(t=>t.special).sort(),['crystal','heart','hourglass']);
 assert.deepEqual(board,makeBoard(state,seededRandom(42)));
});


test('Adventure halves special spawn chance without changing other modes',()=>{
 for(const [map,rate] of [['garden',.09],['sunset',.20]]){
  const state={...base(),picks:20,stage:20,map};
  const specials=(mode,roll)=>makeBoard({...state,mode},()=>roll).filter(t=>t.special).length;
  assert.equal(specials('adventure',rate*.49),1);
  assert.equal(specials('adventure',rate*.51),0);
  for(const mode of [undefined,'endless','rush','games']){
   assert.equal(specials(mode,rate*.51),1);
   assert.equal(specials(mode,rate*1.01),0);
  }
 }
});
test('Adventure preserves unused specials even when no new special spawns',()=>{
 const state={...base(),mode:'adventure',picks:20,stage:20,pendingSpecials:[{special:'heart',slot:12}]};
 const board=makeBoard(state,()=>.5);
 assert.deepEqual(board[12],{special:'heart'});
 assert.equal(board.filter(t=>t.special).length,1);
 const picked=choose(state,board,board.findIndex(t=>!t.special&&matches(state.current,t)));
 assert.equal(picked.mode,'adventure');
});

test('expanded Adventure boards keep specials in newly opened slots',()=>{
 const state={...base(),mode:'adventure',picks:20,pendingSpecials:[{special:'heart',slot:10}]};
 const board=makeBoard(state,()=>.5,11);assert.equal(board.length,11);assert.deepEqual(board[10],{special:'heart'});
 assert(board.slice(0,10).every(t=>Number.isInteger(t.shape)&&Number.isInteger(t.color)));
});


test('Adventure never spawns Rewind and removes pending Rewind pickups',()=>{
 const seen=new Set();
 for(let seed=0;seed<3000;seed++){
  const state={...base(),mode:'adventure',picks:25,stage:25,pendingSpecials:[{special:'reset',slot:3}]};
  const board=makeBoard(state,seededRandom(seed));
  assert.equal(board.length,16);assert(!board.some(t=>t.special==='reset'));
  board.filter(t=>t.special).forEach(t=>seen.add(t.special));
 }
 assert.deepEqual([...seen].sort(),['bomb','crystal','heart','hourglass','starburst']);
});
test('Rewind cannot reset Adventure but remains usable in Endless and Games',()=>{
 const state={...base(),mode:'adventure',stage:17,picks:25};const board=[{special:'reset'},{shape:1,color:0}];
 assert.equal(choose(state,board,0),state);
 for(const mode of ['endless','rush']){
  const next=choose({...state,mode},board,0);assert.equal(next.stage,0);assert.equal(next.specialEffect,'reset');
  assert.equal(makeBoard({...state,mode,pendingSpecials:[{special:'reset',slot:3}]},()=>.5)[3].special,'reset');
 }
});


test('Crown bonus doubles points, prevents recollection, and spends boosts only once per board',()=>{
 let s={...base(),mode:'endless',difficulty:'extreme',multiplier:5,boostRounds:5,slowRounds:5,sweepPending:true,stage:8,difficultyRound:8};
 let b=makeBoard(s),total=b.length;
 for(let i=0;i<total;i++){
  s=choose(s,b,i);assert.equal(s.earned,30);assert.equal(s.score,30*(i+1));
  if(i<total-1){b=s.sweepBoard;assert.equal(choose(s,b,i),s);s=advanceBoard(s);assert.equal(s.boostRounds,5);assert.equal(s.slowRounds,5);assert.equal(s.difficultyRound,8);}
 }
 s=advanceBoard(s);assert.equal(s.boostRounds,4);assert.equal(s.slowRounds,4);assert.equal(s.sweepBoard,null);assert.equal(s.difficultyRound,9);
});
