import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {adventureDropSequence,adventureDropSpec} from './adventure-drop.js';
import {adventureChallenge} from './adventure-challenges.js';
import {createDropGame,DROP_LINE} from './shape-drop-engine.js';
import {DROP_MERGE_DURATION} from './drop-merge-fx.js';

const context={console};vm.runInNewContext(fs.readFileSync(new URL('./assets/vendor/matter-0.20.0.min.js',import.meta.url),'utf8'),context);const M=context.Matter;
const levels=[5,20,35,50,65,80,95];
const advance=(game,seconds)=>{for(let i=0;i<Math.ceil(seconds*120);i++)game.step(1/120);};
const setup=(level=5,options={})=>createDropGame(M,{autoDrop:false,adventure:adventureChallenge(level),...options});
const content=tile=>Object.fromEntries(['shape','color','r','angle','sizeScale','bomb','obstacle'].map(key=>[key,tile[key]]));
function removePieces(game){for(const body of game.pieces)M.Composite.remove(game.engine.world,body);game.pieces=[];}
function take(game,count=game.stageProgress.total){
 const result=[];
 for(let i=0;i<count;i++){result.push(content(game.queue[0]));game.cooldown=0;assert(game.drop());removePieces(game);}
 return result;
}

test('all seven Drop stages have explicit finite content, independently cloned for every retry',()=>{
 assert.deepEqual(levels.map(level=>adventureDropSpec(level).pieceCount),[20,26,30,36,40,46,50]);
 for(const level of levels){
  const challenge=adventureChallenge(level),first=adventureDropSequence(challenge),retry=adventureDropSequence(challenge);
  assert.deepEqual(first,retry);assert.notStrictEqual(first[0],retry[0]);assert.equal(first.length,adventureDropSpec(level).pieceCount);
  for(const tile of first){assert(Number.isInteger(tile.shape)&&tile.shape>=0&&tile.shape<4);assert(Number.isInteger(tile.color)&&tile.color>=0&&tile.color<4);assert(Number.isFinite(tile.r)&&tile.r>0);assert(Number.isFinite(tile.angle));}
  if(level>5){assert(first.some(tile=>tile.obstacle));assert(first.some(tile=>tile.bomb));}
  first[0].color=99;assert.notEqual(adventureDropSequence(level)[0].color,99);
 }
 assert.equal(adventureDropSequence(10),null);assert.equal(adventureDropSpec({level:5,mode:'piano'}),null);
});

test('emitted Adventure pieces ignore RNG, board score, frame rewards and viewport growth',()=>{
 for(const level of levels){
  const failRandom=()=>{throw Error('Adventure consulted RNG');};
  const plain=setup(level,{rng:failRandom}),equipped=setup(level,{rng:failRandom,frame:'blossom',height:1100});
  equipped.score=1000;
  assert.deepEqual(take(plain),take(equipped));assert.deepEqual(plain.stageProgress,{done:plain.drops,total:plain.drops,label:'Drops'});
  assert.equal(plain.queue.length,0);assert.equal(equipped.queue.length,0);plain.dispose();equipped.dispose();
 }
});

test('exhausted queue stays empty and input/preview remain safe while final physics drains',()=>{
 const g=setup();take(g);assert.equal(g.queue.length,0);assert.equal(g.stageComplete,false);assert.equal(g.over,false);
 const drops=g.drops;for(let i=0;i<5;i++){assert.equal(g.drop(),false);g.aimAt(20);g.rotate();assert.equal(g.landingY(),null);}
 assert.equal(g.drops,drops);advance(g,1);assert.equal(g.queue.length,0);assert(g.stageComplete);assert.equal(g.endReason,'stage-complete');g.dispose();
});

test('reaching the score target or waiting past 120 seconds does not truncate a manual stage',()=>{
 const g=setup();g.score=adventureChallenge(5).target;g.time=121;advance(g,.5);
 assert.equal(g.over,false);assert.equal(g.stageComplete,false);assert.equal(g.drops,0);assert.equal(g.queue.length,2);g.dispose();
});

test('every authored stage can finish through real gravity and matching with its score minimum',()=>{
 for(const level of levels){
  const g=setup(level);
  while(g.queue.length&&!g.over){assert(g.drop());advance(g,1.8);}
  advance(g,20);
  assert.equal(g.endReason,'stage-complete','level '+level);assert.equal(g.drops,adventureDropSpec(level).pieceCount);assert(g.score>=adventureChallenge(level).target,'reachable target in level '+level);g.dispose();
 }
});

test('authored content preserves manual aiming and the rotation of only the held tile',()=>{
 const left=setup(),right=setup(),preview=right.queue[1],initial=right.queue[0].angle;
 left.aimAt(55);right.aimAt(265);right.rotate();assert.strictEqual(right.queue[1],preview);assert.equal(right.queue[0].angle,initial+Math.PI/4);
 assert(left.drop());assert(right.drop());assert.equal(left.pieces[0].position.x,55);assert.equal(right.pieces[0].position.x,265);assert.deepEqual(content(left.queue[0]),content(right.queue[0]));left.dispose();right.dispose();
});

test('last authored merge finishes its physics, score and presentation before stage completion',()=>{
 const events=[],g=setup(5,{onClear:event=>events.push({time:g.time,score:event.score}),onEnd:event=>events.push({time:g.time,end:event.reason})});
 while(g.stageProgress.done<g.stageProgress.total-1){assert(g.drop());advance(g,1.8);assert.equal(g.over,false);}
 assert(g.score>=adventureChallenge(5).target);const before=g.score;assert(g.drop());assert.equal(g.queue.length,0);assert.equal(g.over,false);
 for(let i=0;i<600&&g.score===before;i++)g.step(1/120);
 assert(g.score>before,'last pair must score');const finalClear=g.lastClear;assert.equal(g.over,false);
 advance(g,DROP_MERGE_DURATION-.1);assert.equal(g.over,false,'do not cut off the last merge animation');
 advance(g,.2);assert.equal(g.stageComplete,true);assert.equal(g.endReason,'stage-complete');assert(g.time-finalClear>=DROP_MERGE_DURATION);
 assert.equal(events.at(-1).end,'stage-complete');assert.equal(events.filter(event=>event.end).length,1);g.dispose();
});

test('the last unmatched piece falls and settles before a completed stage can report a low score',()=>{
 const g=setup();take(g,g.stageProgress.total-1);g.cooldown=0;assert(g.drop());const final=g.pieces[0];
 assert(final.bounds.min.y<DROP_LINE);advance(g,.4);assert.equal(g.stageComplete,false);
 for(let i=0;i<1800&&!g.over;i++)g.step(1/120);
 assert(g.stageComplete);assert.equal(g.score,0);assert(final.bounds.min.y>DROP_LINE);assert(final.isSleeping||final.speed<.05);g.dispose();
});

test('a last bomb and unsupported pieces continue resolving after queue exhaustion',()=>{
 let bombs=0;const g=setup(20,{onBomb:()=>bombs++});take(g);g.addPiece({shape:2,color:2,r:30},160,490);g.addPiece({shape:0,color:0,r:24,bomb:true},160,250);
 advance(g,.4);assert.equal(g.stageComplete,false);for(let i=0;i<600&&!g.over;i++)g.step(1/120);
 assert.equal(bombs,1);assert.equal(g.bombPoints,1);assert.equal(g.stageComplete,true);g.dispose();
});

test('overflow wins over finite-stage completion, even after the minimum score is reached',()=>{
 const g=setup();take(g);g.score=100;const stuck=g.addPiece({shape:2,color:0,r:30,obstacle:true},160,40);M.Body.setStatic(stuck,true);stuck.drop.born=-10;
 advance(g,2);assert.equal(g.endReason,'overflow');assert.equal(g.stageComplete,false);g.dispose();
});

test('first-time Adventure practice hands off to the same opening as a fresh stage',()=>{
 const challenge=adventureChallenge(35),g=createDropGame(M,{practice:true,autoDrop:false});assert(g.drop());advance(g,.5);g.score=7;g.matches=3;g.bombPoints=4;g.cleared=8;
 const engine=g.engine,tutorialBody=g.pieces[0];assert(g.completePractice(challenge));assert.equal(g.engine,engine);assert.equal(g.practice,false);assert.equal(g.pieces.length,0);assert(!M.Composite.allBodies(engine.world).includes(tutorialBody));
 for(const key of ['time','score','matches','bombPoints','cleared','drops','combo','bestCombo','danger','cooldown'])assert.equal(g[key],0,key);
 const fresh=setup(35);assert.deepEqual(take(g),take(fresh));assert.equal(g.completePractice(challenge),false);g.dispose();fresh.dispose();
});

test('standalone and its practice continuation retain an endless two-piece queue',()=>{
 let randomCalls=0;const g=createDropGame(M,{practice:true,autoDrop:false,rng:()=>{randomCalls++;return .3;}});const held=g.queue[0];assert(g.completePractice());assert.strictEqual(g.queue[0],held);assert.equal(g.stageProgress,null);
 for(let i=0;i<65;i++){g.cooldown=0;assert(g.drop());removePieces(g);assert.equal(g.queue.length,2);}assert(randomCalls>0);advance(g,2);assert.equal(g.over,false);g.dispose();
});

test('Drop UI renders and announces the empty queue without dereferencing a missing tile',()=>{
 const source=fs.readFileSync(new URL('./shape-drop.js',import.meta.url),'utf8');
 const fn=name=>{const start=source.indexOf(' function '+name+'(');const end=source.indexOf('\n function ',start+1);return source.slice(start,end);};
 const g=setup();take(g);const attributes={},gradient={addColorStop(){}};
 const ctx=new Proxy({createLinearGradient:()=>gradient},{get:(target,key)=>target[key]??(()=>{})});
 const scope={game:g,ctx,canvas:{width:320,height:520,getBoundingClientRect:()=>({width:320,height:520}),setAttribute:(key,value)=>attributes[key]=value},viewBounds:null,devicePixelRatio:1,dropLayout:()=>({scale:1,x:0,y:0}),DROP_LINE,W:320,framePatches:[],fx:[],drag:1,quiet:false,translate:x=>x,lastHud:'',hudScore:{},hudCoins:{parentElement:{setAttribute(){}}},miniGameCoins:()=>0,paused:false,practice:{finished:false},transform:null};
 vm.runInNewContext([fn('dropHint'),fn('render'),fn('update'),fn('release'),'render();update();release();result=dropHint();'].join('\n'),scope);
 assert.match(scope.result,/final matches settle/);assert.match(attributes['aria-label'],/none, waiting for final matches/);assert.equal(g.drops,g.stageProgress.total);g.dispose();
});

test('every authored Drop piece enters upright before player rotation or collisions',()=>{for(const level of levels)assert(adventureDropSequence(level).every(piece=>piece.angle===0));});
