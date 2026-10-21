export const SHAPES = ['circle', 'triangle', 'square', 'star'];
export const COLORS = ['red', 'blue', 'green', 'yellow'];
export const SPECIALS = ['starburst','hourglass','crystal','reset','heart','bomb'];
export const matches = (a,b) => !b.collected && (SPECIALS.includes(b.special) || a.shape === b.shape || a.color === b.color);
export const levelFor = score => 1 + Math.floor(score / 4);
export const boardSize = state => {
 const progress=state.stage??state.picks;
 if(state.mode==='endless'&&['hard','extreme'].includes(state.difficulty)){
  const round=Math.max(0,state.difficultyRound??progress);
  const sizes=[1,2,3,4,6,9,12,16];
  if(state.difficulty==='extreme'&&round>=sizes.length)return 20;
  if(state.difficulty==='hard'&&round>=100)return 20;
  return sizes[Math.min(sizes.length-1,round)];
 }
 return progress<1?1:progress<2?2:progress<3?3:progress<4?4:progress<7?6:progress<12?9:progress<17?12:16;
};
export const ENDLESS_MIN_TIME=750;
export const BOMB_PICKUP_GAP=30;
export const DIFFICULTIES={
 easy:{name:'Easy',start:3600,floor:ENDLESS_MIN_TIME,ramp:6,pickups:.09,points:1},
 normal:{name:'Normal',start:2800,floor:ENDLESS_MIN_TIME,ramp:9,pickups:.07,points:1},
 hard:{name:'Hard',start:2400,floor:ENDLESS_MIN_TIME,ramp:15,pickups:.05,points:2},
 extreme:{name:'Extreme',start:2000,floor:ENDLESS_MIN_TIME,ramp:22,pickups:.03,points:3}
};
// Score pressure prevents large streak/boost rewards from leaving long runs at opening speed.
// Lifetime picks keep pressure rising even after Rewind resets the board size.
const endlessPressure=state=>Math.max(0,state.picks||0,(state.score||0)/2);
export const endlessIntensity=state=>{
 const d=difficultyFor(state);
 return Math.min(1,endlessPressure(state)*d.ramp/(d.start-d.floor));
};
export const difficultyFor=state=>DIFFICULTIES[state.mode==='endless'?state.difficulty:'normal']||DIFFICULTIES.normal;
export const duration = state => {
 const d=difficultyFor(state);
 const lateFloor=Math.max(450,ENDLESS_MIN_TIME/(1+Math.max(0,endlessPressure(state)-500)/1500));
 const base=state.mode==='endless'?Math.max(lateFloor,d.start-endlessPressure(state)*d.ramp):Math.max(1800,2800-state.picks*5);
 return Math.round((base+(state.map==='garden'&&state.picks<5?200:0))*(state.timeFactor||1));
};
export const randomTile = (rng=Math.random) => ({shape:Math.min(3,Math.floor(rng()*4)),color:Math.min(3,Math.floor(rng()*4))});
export const createRun = (rng=Math.random) => ({current:randomTile(rng),score:0,picks:0,chainProgress:0,chainTarget:10,difficultyRound:0,sweepPending:false,sweepBoard:null,maxLives:3,strikes:0,level:1,colorStreak:0,shapeStreak:0,lastPick:null,bonus:0,freeze:1,boost:1,shield:1,shieldEnabled:false,shieldCooldown:0,shieldJustBroken:false,protected:false,protectionHits:0,multiplier:1,slow:false,slowRounds:0,boostRounds:0,continued:false,over:false,outcome:'ready'});
export const streakBonus=n=>n===3||n===5||(n>=10&&n%5===0)?n:0;
export function seededRandom(seed){let n=seed>>>0;return ()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};}

function shuffled(items,rng) {
  const result=items.slice();
  for(let i=result.length-1;i>0;i--){
    const j=Math.min(i,Math.floor(rng()*(i+1)));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}
export const specialsForMode = mode => mode==='adventure'?SPECIALS.filter(s=>s!=='reset'):SPECIALS;
export const specialSpawnChance = state => {
 if(state.mode!=='endless')return (state.map==='sunset'?.20:.09)*(state.mode==='adventure'?.5:1);
 return difficultyFor(state).pickups*(1-.6*endlessIntensity(state))*(state.map==='sunset'?20/9:1);
};
// Limit correct choices rather than letting larger grids become easier.
const sparseDifficulty = state => state.mode==='endless'&&['hard','extreme'].includes(state.difficulty);
function sparseMatch(state,all,rng) {
  const colorOnly=all.filter(t=>t.color===state.current.color&&t.shape!==state.current.shape);
  const shapeOnly=all.filter(t=>t.shape===state.current.shape&&t.color!==state.current.color);
  const preferColor=rng()<(state.difficulty==='extreme'?.15:.25);
  const preferred=preferColor?colorOnly:shapeOnly;
  const pool=preferred.length?preferred:(preferColor?shapeOnly:colorOnly);
  return pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))];
}
export function makeBoard(state,rng=Math.random,capacity=boardSize(state)) {
  if(state.bombRefillBoard){
    const allowed=[0,1,2,3].filter(shape=>shape!==state.excludedShape),blast=new Set(state.blastTargets);
    return state.bombRefillBoard.map((tile,i)=>blast.has(i)?{shape:allowed[Math.min(allowed.length-1,Math.floor(rng()*allowed.length))],color:Math.min(3,Math.floor(rng()*4))}:{...tile});
  }
  if(state.heldBoard){
    const allowed=[0,1,2,3].filter(s=>s!==state.excludedShape);
    let replacement;
    if(sparseDifficulty(state)){
      const all=allowed.flatMap(shape=>[0,1,2,3].map(color=>({shape,color})));
      const existing=state.heldBoard.filter((t,i)=>i!==state.replacedIndex&&!t.special&&matches(state.current,t)).length;
      const cap=state.difficulty==='extreme'?1:2;
      const invalid=all.filter(t=>!matches(state.current,t));
      replacement=existing<cap&&rng()<1/state.heldBoard.length?sparseMatch(state,all,rng):invalid[Math.min(invalid.length-1,Math.floor(rng()*invalid.length))];
    }else replacement={shape:allowed[Math.min(allowed.length-1,Math.floor(rng()*allowed.length))],color:Math.min(3,Math.floor(rng()*4))};
    return state.heldBoard.map((t,i)=>i===state.replacedIndex?replacement:{...t});
  }
  if(state.sweepBoard)return state.sweepBoard.map(tile=>({...tile}));
  if(state.sweepPending)return Array.from({length:boardSize(state)},(_,i)=>({shape:i%4,color:state.current.color,bonusTile:true}));
  const all=Array.from({length:16},(_,i)=>({shape:i%4,color:Math.floor(i/4)})).filter(t=>t.shape!==state.excludedShape);
  const valid=shuffled(all.filter(t=>matches(state.current,t)),rng);
  const invalid=shuffled(all.filter(t=>!matches(state.current,t)),rng);
  const size=capacity;
  const noMatch=rng()<0.13;
  const sparse=sparseDifficulty(state);
  const candidateCount=sparse?Math.min(size,state.difficulty==='hard'&&rng()<.25?2:1):Math.min(size,1+Math.floor(rng()*Math.min(3,Math.ceil(size/3))));
  const matchCount=noMatch?0:candidateCount;
  const correct=sparse?Array.from({length:matchCount},()=>sparseMatch(state,all,rng)):valid.slice(0,matchCount);
  const normal=shuffled([...correct,...Array.from({length:size-matchCount},(_,i)=>invalid[i%invalid.length])],rng);
  const allowedSpecials=specialsForMode(state.mode);
  const pending=(state.pendingSpecials||[]).filter(entry=>allowedSpecials.includes(entry.special)&&!entry.collected&&(entry.special!=='bomb'||state.picks>=(state.nextBombPick||0)));
  const spawnSpecials=allowedSpecials.filter(s=>s!=='bomb'||(state.picks>=Math.max(15,state.nextBombPick||0)&&!pending.some(e=>e.special==='bomb')));
  const available=Array.from({length:size},(_,i)=>i);
  const randomSlot=()=>available[Math.min(available.length-1,Math.floor(rng()*available.length))];
  const place=(slot,special)=>{normal[slot]={special};available.splice(available.indexOf(slot),1);};
  // Keep existing pickups where they spawned; reserve valid slots before relocations.
  const relocated=[];
  for(const entry of pending.slice(0,size)){
    if(Number.isInteger(entry.slot)&&available.includes(entry.slot))place(entry.slot,entry.special);
    else relocated.push(entry);
  }
  for(const entry of relocated)place(randomSlot(),entry.special);
  if(state.picks>=5&&(state.stage??state.picks)>0&&pending.length<Math.min(2,size)&&available.length&&rng()<specialSpawnChance(state)){
    let slot=randomSlot();const special=spawnSpecials[Math.min(spawnSpecials.length-1,Math.floor(rng()*spawnSpecials.length))];
    if(special==='bomb'&&slot===state.lastBombSlot&&available.length>1)slot=available[(available.indexOf(slot)+1)%available.length];
    place(slot,special);
  }
  return normal;
}
const retained=(board,remove=-1)=>board.flatMap((tile,slot)=>tile.special&&!tile.collected&&slot!==remove?[{special:tile.special,slot}]:[]);
export const ruleMatches=(state,tile)=>!tile.collected&&(!!tile.special||(!tile.memory||!tile.hidden)&&(state.mode!=='adventure'||!state.matchRule?matches(state.current,tile):state.current[state.matchRule]===tile[state.matchRule]));
// Feedback uses the same active match rule as play; covered memory cards stay secret.
export const correctChoiceIndices=(state,board)=>board.flatMap((tile,index)=>
 !tile.collected&&!(state.mode==='adventure'&&tile.special==='reset')&&
 (tile.bonusTile||ruleMatches(state,tile))?[index]:[]);
export const hasMatch = (state,board) => board.some(tile=>ruleMatches(state,tile));
function mistake(state,outcome) {
  state={...state,chainProgress:0,colorStreak:0,shapeStreak:0,lastPick:null,bonus:0};
  if(state.protected){const protectionHits=Math.max(0,(state.protectionHits||1)-1);return {...state,protectionHits,protected:protectionHits>0,shieldCooldown:protectionHits?state.shieldCooldown:5,shieldJustBroken:protectionHits?state.shieldJustBroken:true,outcome:'protected'};}
  const strikes=Math.min(state.maxLives||3,state.strikes+1);
  return {...state,strikes,over:strikes===(state.maxLives||3),outcome};
}
export function bombTargets(board,index,columns=board.length===3?3:Math.ceil(Math.sqrt(board.length)),cells){
 const position=i=>(cells?.[i]??i+1)-1,origin=position(index),row=Math.floor(origin/columns),col=origin%columns;
 return board.flatMap((tile,i)=>!tile.collected&&Math.abs(Math.floor(position(i)/columns)-row)<=1&&Math.abs(position(i)%columns-col)<=1?[i]:[]);
}
export function choose(state,board,index) {
  if(state.over || !Number.isInteger(index) || index<0 || index>=board.length) return state;
  const tile=board[index];
  if(tile.collected||(state.mode==='adventure'&&tile.special==='reset'))return state;
  if(state.mode==='adventure'&&state.matchRule&&!tile.special&&!tile.bonusTile&&matches(state.current,tile)&&state.current[state.matchRule]!==tile[state.matchRule])return state;
  if(tile.special==='bomb'){
   const blast=bombTargets(board,index,state.boardColumns,state.boardCells),remaining=board.map((t,i)=>({...t,collected:t.collected||blast.includes(i)}));
   const earned=blast.length*state.multiplier*difficultyFor(state).points;
   return {...state,score:state.score+earned,picks:state.picks+1,earned,bonus:0,specialEffect:'bomb',nextBombPick:state.picks+1+BOMB_PICKUP_GAP,lastBombSlot:index,blastTargets:blast,heldBoard:null,replacedIndex:null,bombBoard:true,bombRefillBoard:board.map(t=>({...t})),sweepBoard:null,pendingSpecials:retained(remaining).filter(e=>!blast.includes(e.slot)),outcome:'correct'};
  }
  if(tile.bonusTile){
    const remaining=board.map((t,i)=>({...t,collected:t.collected||i===index}));
    return {...state,current:{shape:tile.shape,color:tile.color},score:state.score+2*state.multiplier*difficultyFor(state).points,picks:state.picks+1,stage:state.stage??state.picks,earned:2*state.multiplier*difficultyFor(state).points,bonus:0,specialEffect:null,sweepPending:false,sweepBoard:remaining.some(t=>!t.collected)?remaining:null,sweepStarted:false,outcome:'correct'};
  }
  if(state.bombBoard)state={...state,bombBoard:false,bombRefillBoard:null,sweepBoard:null};
  const progress=(state.chainProgress||0)+1,target=state.chainTarget||10;
  const chain={chainProgress:progress>=target?0:progress,chainTarget:progress>=target?target+10:target,sweepPending:state.sweepPending||(state.frame==='cosmic'&&progress>=target),sweepStarted:state.frame==='cosmic'&&progress>=target};
  state={...state,heldBoard:null,replacedIndex:null,pendingSpecials:[...retained(board,index),...(state.pendingSpecials||[]).slice(board.length)],specialEffect:null,earned:0};
  if(tile.special){
    const local=['heart','hourglass','crystal'].includes(tile.special);
    const earned=(tile.special==='starburst'?board.filter(t=>!t.special&&!t.collected&&!t.memory).length:1)*state.multiplier*difficultyFor(state).points;
    return {...state,...chain,score:state.score+earned,picks:state.picks+1,stage:tile.special==='reset'?0:(state.stage??state.picks)+(local?0:1),heldBoard:null,replacedIndex:null,earned,specialEffect:tile.special,bonus:0,colorStreak:0,shapeStreak:0,lastPick:null,outcome:'correct',
      pendingSpecials:tile.special==='reset'?[]:state.pendingSpecials,
      strikes:tile.special==='heart'?0:state.strikes,protected:tile.special==='crystal'||state.protected,protectionHits:tile.special==='crystal'?Math.max(state.protectionHits||0,1):state.protectionHits,shieldEnabled:tile.special==='crystal'||state.shieldEnabled,
      slow:tile.special==='hourglass'||state.slow,slowRounds:tile.special==='hourglass'?Math.max(3,state.slowRounds):state.slowRounds};
  }
  if(!(state.mode==='adventure'&&state.matchRule?state.current[state.matchRule]===tile[state.matchRule]:matches(state.current,tile))) return mistake(state,'wrong');
  const colorStreak=state.lastPick?.color===tile.color?state.colorStreak+1:1;
  const shapeStreak=state.lastPick?.shape===tile.shape?state.shapeStreak+1:1;
  const streak=streakBonus(colorStreak)+streakBonus(shapeStreak);const bonus=streak;
  const score=state.score+(state.multiplier+bonus)*difficultyFor(state).points;
  const picks=state.picks+1;
  return {...state,...chain,current:{...tile},lastPick:{...tile},colorStreak,shapeStreak,bonus,score,picks,stage:(state.stage??state.picks)+1,earned:score-state.score,strikes:state.strikes,level:levelFor(picks),protected:state.protected,outcome:'correct'};
}
export function expire(state,board) {
  if(state.over) return state;
  if(state.bombBoard)state={...state,bombBoard:false,bombRefillBoard:null,sweepBoard:null};
  if(board.some(t=>t.bonusTile))return {...state,sweepPending:false,sweepStarted:false,sweepBoard:null,specialEffect:null,earned:0,bonus:0,outcome:'pass'};
  state={...state,heldBoard:null,replacedIndex:null,pendingSpecials:[...retained(board),...(state.pendingSpecials||[]).slice(board.length)],specialEffect:null,earned:0};
  return board.some(tile=>!tile.special&&ruleMatches(state,tile))?mistake(state,'miss'):{...state,bonus:0,outcome:'pass'};
}
export function spendAbility(state,ability) {
 if(state.over||!['freeze','boost','shield'].includes(ability)||(ability==='shield'?(state.protected||(state.shieldCooldown||0)>0):ability==='freeze'?state.slowRounds>0:state.boostRounds>0))return state;
 return {...state,[ability]:Math.max(0,state[ability]-1),protected:ability==='shield'||state.protected,protectionHits:ability==='shield'?1:state.protectionHits,shieldEnabled:ability==='shield'||state.shieldEnabled,slow:ability==='freeze'||state.slow,slowRounds:ability==='freeze'?5:state.slowRounds,boostRounds:ability==='boost'?5:state.boostRounds,multiplier:ability==='boost'?5:state.multiplier};
}
export function advanceBoard(state){
 if(state.bombRefillBoard||state.heldBoard||state.sweepBoard||['heart','hourglass','crystal'].includes(state.specialEffect))return {...state,outcome:'ready'};
 if(!['correct','wrong','miss','protected','pass'].includes(state.outcome))return state;
 const slowRounds=Math.max(0,(state.slowRounds||0)-1),boostRounds=Math.max(0,(state.boostRounds||0)-1);
 const difficultyRound=state.specialEffect==='reset'?0:(state.difficultyRound??state.stage??state.picks)+(state.sweepBoard||state.outcome!=='correct'?0:1);
 const shieldCooldown=state.shieldJustBroken?(state.shieldCooldown||0):Math.max(0,(state.shieldCooldown||0)-1);
 return {...state,shieldCooldown,shieldJustBroken:false,difficultyRound,slowRounds,boostRounds,slow:slowRounds>0,multiplier:boostRounds>0?5:1,outcome:'ready'};
}

export function revive(state){
 if(!state.over||state.continued)return state;
 return {...state,strikes:0,over:false,continued:true,protected:state.protected,heldBoard:null,replacedIndex:null,outcome:"revived"};
}
export const elapsedBoardTime=(delta,slow)=>Math.max(0,delta)*(slow?0.5:1);

// A stalled rendering frame must not consume an unseen board in one update.
export const frameDelta=(now,last)=>Math.min(100,Math.max(0,now-last));

// Shared by every mode that uses hearts. Only the equipped frame grants its bonus.
export const maxLivesForFrame=(frame='none',upgrade=0)=>frame==='gold'?4+(upgrade===1?1:0):3;

export function applyLoadout(state,frame='none',map='garden',rng=Math.random,upgrade=0){
 if(!['none','gold','ice','blossom','cosmic'].includes(frame)||!['garden','moon','sunset'].includes(map))throw Error('Invalid loadout');
 if(!Number.isInteger(upgrade)||upgrade<0||upgrade>(frame==='gold'?1:frame==='ice'?2:0))throw Error('Invalid frame upgrade');
 const excludedShape=frame==='blossom'?Math.min(3,Math.floor(rng()*4)):null;
 const allowed=[0,1,2,3].filter(shape=>shape!==excludedShape);
 const current=state.current.shape===excludedShape?{...state.current,shape:allowed[Math.min(2,Math.floor(rng()*3))]}:state.current;
 return {...state,current,excludedShape,frame,map,upgrade,maxLives:maxLivesForFrame(frame,upgrade),timeFactor:(frame==='ice'?1.1+upgrade*.05:1)*(map==='moon'?1.1:1)};
}
export const abilityActive=(state,name)=>name==='shield'?state.protected:name==='freeze'?state.slowRounds>0:name==='boost'?state.boostRounds>0:false;
export function stopAbility(state,name){
 if(!abilityActive(state,name))return state;
 if(name==='shield')return {...state,protected:false,protectionHits:0,shieldCooldown:Math.max(5,state.shieldCooldown||0),shieldJustBroken:false};
 if(name==='freeze')return {...state,slow:false,slowRounds:0};
 return {...state,multiplier:1,boostRounds:0};
}

// Settle the visible victory board once, before recording the run or showing results.
export function awardVictoryBoard(state,board,won){
 if(state.mode!=='adventure'||!won||state.over||state.victoryBoardAwarded)return state;
 const value=state.multiplier*difficultyFor(state).points;
 const victoryPoints=board.map(tile=>tile&&!tile.collected?value:0);
 const victoryBonus=victoryPoints.reduce((sum,n)=>sum+n,0);
 return {...state,score:state.score+victoryBonus,victoryBoardAwarded:true,victoryBonus,victoryPoints};
}
