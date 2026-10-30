import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRun,matches} from './battle/combat.mjs';
import {createSliceGame} from './shape-slice-engine.js';
import {createPianoGame} from './piano-flow-engine.js';
import fs from 'node:fs';
import vm from 'node:vm';
import {createDropGame} from './shape-drop-engine.js';

test('Drop practice uses real physics to merge matching drops',()=>{
 const context={console};vm.runInNewContext(fs.readFileSync(new URL('./assets/vendor/matter-0.20.0.min.js',import.meta.url),'utf8'),context);
 let merges=0;const g=createDropGame(context.Matter,{practice:true,autoDrop:false,onClear:()=>merges++});
 g.queue.forEach(t=>Object.assign(t,{shape:0,color:1,bomb:false,obstacle:false,geometry:null}));
 g.drop();for(let i=0;i<480;i++)g.step(1/120);
 g.drop();for(let i=0;i<480;i++)g.step(1/120);
 assert.equal(merges,1);assert.equal(g.over,false);assert.equal(g.pieces.length,0);g.dispose();
});

test('Battle practice survives mistakes and attacks, and uses the real parry',()=>{
 const run=createRun(()=>.4,10,0,null,{practice:true});
 const wrong=run.state.board.findIndex(t=>!matches(t,run.state.current));
 for(let i=0;i<20;i++)run.pick(wrong);
 for(let i=0;i<2000;i++)run.tick(.25);
 assert.equal(run.state.hp,3);assert.equal(run.state.status,'fight');
 run.state.clock=.65;assert.equal(run.guard().kind,'parry');
 const good=run.state.board.findIndex(t=>matches(t,run.state.current));
 assert.equal(run.pick(good).kind,'hit');assert.ok(run.state.enemyHp<run.state.enemyMaxHp);
});
test('Slice practice holds real targets for swiping and prevents bomb damage',()=>{
 const g=createSliceGame({practice:true,autoSpawn:false});
 const p=g.spawn({x:180,y:250,r:30,shape:0,color:1});
 for(let i=0;i<2000;i++)g.step(.05);
 assert(p.y<250);assert(p.practiceSettled);const restingY=p.y;g.step(.05);assert.equal(p.y,restingY);assert.equal(g.lives,g.maxLives);
 g.beginStroke();assert.equal(g.slice({x:130,y:p.y},{x:230,y:p.y}).length,1);
 g.spawn({x:180,y:250,r:30,hazard:true});g.slice({x:130,y:250},{x:230,y:250});
 assert.equal(g.lives,g.maxLives);assert.equal(g.over,false);
});
test('Piano practice waits, ignores wrong strips, and requires a completed hold',()=>{
 const g=createPianoGame({practice:true,fullSongs:true,melodicStrips:true,stripTap:true,rhythm:true,directTouch:true});g.start();
 for(let i=0;i<1200;i++)g.step(.05);
 assert.equal(g.beat,-.25);g.pressStrip(0);assert.equal(g.lives,g.maxLives);
 assert.equal(g.pressStrip(1),true);g.release(1);g.step(.05);
 assert.equal(g.hits,1);assert.equal(g.pressStrip(2),true);
 for(let i=0;i<10;i++)g.step(.05);g.release(2);
 assert.equal(g.hits,1);for(let i=0;i<1200;i++)g.step(.05);
 assert.equal(g.lives,g.maxLives);assert.equal(g.pressStrip(2),true);
 for(let i=0;i<50;i++)g.step(.05);
 assert.equal(g.hits,2);assert.equal(g.lives,g.maxLives);
});
test('Normal Battle and Slice still deduct hearts',()=>{
 const run=createRun(()=>.4);const wrong=run.state.board.findIndex(t=>!matches(t,run.state.current));run.pick(wrong);assert.equal(run.state.hp,2);
 const g=createSliceGame({autoSpawn:false});g.spawn({x:180,y:250,r:30,hazard:true});g.beginStroke();g.slice({x:130,y:250},{x:230,y:250});assert.equal(g.lives,g.maxLives-1);
});


test('the hand positions its fingertip on the target at phone and desktop sizes',async()=>{
 const {practiceHandPosition}=await import('./mode-practice.js');
 for(const width of [320,360,600])for(const y of [250,610]){
  const bounds={left:20,top:30,width,height:640},point={x:width/2+20,y},size=56;
  const p=practiceHandPosition(point,bounds,size),down=p.rotation===0;
  assert(Math.abs(p.left+(down?.91:.87)*size-(point.x-bounds.left))<.001);
  assert(Math.abs(p.top+(down?.87:.09)*size-(point.y-bounds.top))<.001);
  assert(p.top>=0&&p.top+size<=bounds.height);
 }
});

test('revised gestures appear even when the old tutorial was marked done',async()=>{
 const {practiceKey,createModePractice}=await import('./mode-practice.js');
 for(const mode of ['battle','drop','slice','piano']){
  const values=new Map([['shape-shift-practice-'+mode+'-v2','done']]);
  const storage={getItem:k=>values.get(k)};
  assert.equal(createModePractice(mode,{storage}).active,true);
  values.set(practiceKey(mode),'done');
  assert.equal(createModePractice(mode,{storage}).active,false);
 }
});
