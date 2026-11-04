import test from 'node:test';
import assert from 'node:assert/strict';
import {createSliceGame,sliceHits,slicePathsConflict,sliceProgress,finishSliceProgress,claimSliceReward} from './shape-slice-engine.js';
import {adventureSliceSpec,adventureSlicePiece,sliceStageFeedbackSettled} from './adventure-slice.js';
import {sliceViewport} from './slice-viewport.js';
import {cutShape,stepFragments} from './slice-fragments.js';
import {readFileSync} from 'node:fs';
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

const sliceStage=(level,extra={})=>createSliceGame({adventure:{mode:'slice',level},...extra});
function playStage(game,bounds,{onCut=()=>{}}={}){
 for(let tick=0;tick<120*80&&!game.over;tick++){
  game.step(1/120);
  for(const piece of [...game.pieces])if(!piece.hazard&&piece.y+piece.r<bounds.bottom&&piece.y-piece.r>bounds.top){
   game.beginStroke();game.slice({x:piece.x-2,y:piece.y},{x:piece.x+2,y:piece.y});game.endStroke();onCut(piece);
  }
 }
 return game;
}

test('Adventure Slice retries reproduce all authored waves without reading an RNG or depending on loadout',()=>{
 for(const level of [10,25,40,55,70,85]){
  const traces=[];
  for(const frame of ['none','blossom']){
   const trace=[];let game;
   const bounds=sliceViewport(390,844).bounds;
   game=sliceStage(level,{frame,bounds,rng:()=>{throw Error('An authored stage must not consume randomness');},onEvent:event=>{
    if(event.type==='launch')trace.push({at:event.time,formation:event.formation,pieces:game.pieces.map(piece=>({...piece}))});
   }});
   playStage(game,bounds);assert(game.stageComplete);assert.equal(game.sliced,adventureSliceSpec(level).targetCount);traces.push(trace);
  }
  assert.deepEqual(traces[0],traces[1]);assert.equal(traces[0].length,adventureSliceSpec(level).waveCount);
 }
});

test('every Slice level is beatable with ordinary single cuts and ends only after its final pieces and bonus window',()=>{
 for(const [index,level] of [10,25,40,55,70,85].entries()){
  const bounds=sliceViewport(360,560).bounds,events=[],game=sliceStage(level,{bounds,onEvent:event=>events.push(event)}),target=16+index*3;
  let targetReached=false,lastCutAt=-1;
  playStage(game,bounds,{onCut(){lastCutAt=game.time;if(!targetReached&&game.score>=target){targetReached=true;assert(!game.over);assert(!game.stageComplete);assert(game.pieces.some(piece=>!piece.hazard),'The remaining authored targets must still be playable');}}});
  assert(targetReached);assert(game.over);assert(game.stageComplete);assert.equal(game.endReason,'stage-complete');
  assert.equal(game.score,target+2);assert.equal(game.lives,game.maxLives);assert.equal(game.pieces.length,0);
  assert.deepEqual(game.stageProgress,{done:adventureSliceSpec(level).waveCount,total:adventureSliceSpec(level).waveCount,label:'Waves'});
  assert(game.time-lastCutAt>=3);assert.equal(events.filter(event=>event.type==='end').length,1);
  const count=events.filter(event=>event.type==='launch').length,time=game.time;advance(game,30);assert.equal(game.time,time);assert.equal(events.filter(event=>event.type==='launch').length,count);
 }
});

test('authored Slice hazards keep safe lanes and fixed flight duration on portrait and landscape boards',()=>{
 for(const [width,height] of [[360,560],[390,844],[1280,720],[280,1000]]){
  const bounds=sliceViewport(width,height).bounds;
  for(const level of [10,25,40,55,70,85])for(const wave of adventureSliceSpec(level).waves){
   const pieces=wave.pieces.map(piece=>adventureSlicePiece(piece,bounds));
   for(const piece of pieces){
    assert(piece.y-piece.r*1.5>bounds.bottom);assert(piece.vy<0);assert(!slicePathsConflict(piece,pieces.filter(other=>other!==piece),bounds));
    const atReturn=piece.y+piece.vy*piece.flight+.5*piece.gravity*piece.flight**2;assert(Math.abs(atReturn-piece.y)<1e-7);
   }
  }
 }
});

test('every authored Slice finale supports the three-shape combo objective',()=>{
 const bounds=sliceViewport(390,844).bounds;
 for(const level of [10,25,40,55,70,85]){
  const spec=adventureSliceSpec(level),game=sliceStage(level,{bounds});
  for(let tick=0;tick<120*80&&!game.over;tick++){
   game.step(1/120);
   if(game.wave===spec.waveCount){
    const pieces=game.pieces.filter(piece=>!piece.hazard);
    if(pieces.length===3&&pieces.every(piece=>piece.y+piece.r<bounds.bottom)){
     game.beginStroke();const y=pieces[0].y;game.slice({x:pieces[0].x-40,y},{x:pieces.at(-1).x+40,y});game.endStroke();
    }
   }else for(const piece of [...game.pieces])if(!piece.hazard&&piece.y+piece.r<bounds.bottom){game.beginStroke();game.slice({x:piece.x-2,y:piece.y},{x:piece.x+2,y:piece.y});game.endStroke();}
  }
  assert(game.stageComplete);assert.equal(game.bestCombo,3);assert.equal(game.lives,game.maxLives);
 }
});

test('missing authored waves remains a loss and reaching a target cannot turn a life-loss exit into completion',()=>{
 const game=sliceStage(10);game.score=100;advance(game,20);assert(game.over);assert.equal(game.lives,0);assert(!game.stageComplete);assert(game.wave<adventureSliceSpec(10).waveCount);
});

test('the first Slice tutorial hands off to the exact authored opening without tutorial points or elapsed time',()=>{
 const adventure={mode:'slice',level:25},game=createSliceGame({practice:true,autoSpawn:false,adventure});
 const piece=target(game);game.beginStroke();game.slice({x:piece.x-20,y:piece.y},{x:piece.x+20,y:piece.y});game.endStroke();advance(game,8);
 assert(game.score>0);assert(game.practice);assert.equal(game.stageProgress,null);
 assert(game.completePractice());assert(!game.practice);assert.equal(game.score,0);assert.equal(game.time,0);assert.equal(game.pieces.length,0);assert.equal(game.stageProgress.total,7);
 const fresh=sliceStage(25);advance(game,1);advance(fresh,1);assert.deepEqual(game.pieces,fresh.pieces);assert.equal(game.completePractice(),false);
});

test('the final Slice cut keeps its recut bonus available and the result waits for actual visual fragments',()=>{
 const bounds=sliceViewport(390,844).bounds,game=sliceStage(10,{bounds});let lastPiece,atCut;
 playStage(game,bounds,{onCut(piece){lastPiece={...piece};atCut=game.time;if(game.sliced===18){game.beginStroke();assert.equal(game.recut(piece.id),1);game.endStroke();assert(!game.over);}}});
 assert(game.stageComplete);assert(game.time-atCut>=3);
 let fragments=cutShape(lastPiece,{x:lastPiece.x-40,y:lastPiece.y},{x:lastPiece.x+40,y:lastPiece.y},1);
 assert(fragments.length);assert(!sliceStageFeedbackSettled({fragments}));
 for(let frame=0;frame<120*10&&fragments.length;frame++)fragments=stepFragments(fragments,1/120,bounds);
 assert.equal(fragments.length,0);assert(sliceStageFeedbackSettled({fragments}));
 assert(!sliceStageFeedbackSettled({labels:[{text:'+1'}]}));assert(!sliceStageFeedbackSettled({effects:{sparks:[{}],flashes:[]}}));
 // Exercise the live view's actual gate; both RAF and pointer paths use it.
 const view=readFileSync(new URL('./shape-slice.js',import.meta.url),'utf8');
 const body=view.match(/function resultReady\(\)\{return ([^;]+);\}/)[1];
 const ready=Function('game','hitFeedback','lifeLossTime','bombImpactPending','impacts','sliceStageFeedbackSettled','fragments','labels','effects','return '+body);
 const evaluate=(pieces=[],labels=[])=>ready(game,{active:false},0,()=>false,[],sliceStageFeedbackSettled,pieces,labels,{sparks:[],flashes:[]});
 assert.equal(evaluate([{}]),false);assert.equal(evaluate([],['+1']),false);assert.equal(evaluate(),true);
 assert.equal((view.match(/if\(resultReady\(\)\)/g)||[]).length,2);
});
