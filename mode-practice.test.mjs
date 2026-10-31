import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRun,matches} from './battle/combat.mjs';
import {createSliceGame} from './shape-slice-engine.js';
import {createPianoGame} from './piano-flow-engine.js';
import fs from 'node:fs';
import vm from 'node:vm';
import {createDropGame} from './shape-drop-engine.js';
import {continuePracticeRun} from './mode-practice.js';
import {finishSliceProgress,claimSliceReward} from './shape-slice-engine.js';
import {finishPianoProgress,claimPianoReward} from './piano-flow-engine.js';
import {freshProfile} from './economy.js';

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

test('Slice completes practice in the same engine, preserves targets and score, and resumes normal spawning and damage',()=>{
 const g=createSliceGame({practice:true,autoSpawn:false,rng:()=>.3});g.time=120;
 g.spawn({x:180,y:250,r:30,shape:0,color:1,vx:0,vy:0});g.beginStroke();g.slice({x:130,y:250},{x:230,y:250});
 const survivor=g.spawn({x:280,y:230,r:26,shape:2,color:2,vx:0,vy:0,practiceSettled:true}),pieces=g.pieces;
 const before={score:g.score,sliced:g.sliced,time:g.time,lives:g.lives,wave:g.wave,untilWave:g.untilWave};let started=0;
 assert(continuePracticeRun(g,()=>started++));assert.equal(continuePracticeRun(g,()=>started++),false);assert.equal(started,1);
 assert.strictEqual(g.pieces,pieces);assert.strictEqual(g.pieces[0],survivor);
 for(const [key,value] of Object.entries(before))assert.equal(g[key],value,key);
 for(let i=0;i<90;i++)g.step(1/120);
 assert.equal(g.wave,1);assert.equal(g.pieces.some(p=>p.hazard),false,'slow readers do not begin at late-run difficulty');
 g.spawn({x:80,y:250,r:28,hazard:true});g.beginStroke();g.slice({x:40,y:250},{x:115,y:250});assert.equal(g.lives,before.lives-1);
 const id='shape-slice-00000000-0000-4000-8000-000000000001',saved=finishSliceProgress({},g,id),paid=claimSliceReward(freshProfile(),saved.pending[0]);
 assert.equal(saved.runs,1);assert.equal(finishSliceProgress(saved,g,id).runs,1);assert.strictEqual(claimSliceReward(paid,saved.pending[0]),paid);
});

test('Piano keeps the played notes, musical position, score and held keys when practice becomes the real run',()=>{
 const events=[],g=createPianoGame({practice:true,fullSongs:true,melodicStrips:true,stripTap:true,rhythm:true,directTouch:true,onEvent:e=>events.push(e)});
 g.start();for(let i=0;i<1200;i++)g.step(.05);
 assert(g.pressStrip(1));g.release(1);assert(g.pressStrip(2));for(let i=0;i<70;i++)g.step(.05);
 assert.equal(g.hits,2);const notes=g.notes,retained=[...notes],pressed=g.pressed;
 const before={score:g.score,hits:g.hits,coins:g.coins,beat:g.beat,time:g.time,lives:g.lives,countdown:g.countdown};let started=0;
 events.length=0;assert(continuePracticeRun(g,()=>started++));assert.equal(continuePracticeRun(g,()=>started++),false);assert.equal(started,1);
 assert.strictEqual(g.notes,notes);assert.strictEqual(g.pressed,pressed);for(const n of retained)assert(g.notes.includes(n));
 for(const [key,value] of Object.entries(before))assert.equal(g[key],value,key);
 assert.equal(events.some(e=>['start','countdown','ready','note'].includes(e.type)),false);
 assert.equal(new Set(g.notes.map(n=>n.id)).size,g.notes.length);
 const next=g.notes.find(n=>n.status==='waiting');assert(next.beat>=before.beat+1.5);assert(next.id>1);
 g.release(2);g.step(.05);assert(g.beat>before.beat);assert(g.bpm<90,'practice reading time does not accelerate the normal song');
 g.beat=next.beat-.1;g.pressStrip((next.lane+1)%4);assert.equal(g.lives,before.lives-1);
 const id='piano-flow-00000000-0000-4000-8000-000000000002',saved=finishPianoProgress({},g,id),paid=claimPianoReward(freshProfile(),saved.pending[0]);
 assert.equal(saved.runs,1);assert.equal(paid.coins,g.coins);assert.strictEqual(claimPianoReward(paid,saved.pending[0]),paid);
});

test('Battle keeps the damaged enemy, exact board and current shape after the tutorial block; live attacks resume',()=>{
 const run=createRun(()=>.8,10,0,null,{practice:true});run.pick(run.state.board.findIndex(t=>matches(t,run.state.current)));
 run.state.clock=.6;assert.equal(run.guard().kind,'parry');
 const state=run.state,board=state.board,current=state.current,before=structuredClone(state);let starts=0,rewards=0;
 assert(continuePracticeRun(run,()=>{starts++;rewards++;}));assert.equal(continuePracticeRun(run,()=>{starts++;rewards++;}),false);
 assert.equal(starts,1);assert.equal(rewards,1);assert.strictEqual(run.state,state);assert.strictEqual(state.board,board);assert.strictEqual(state.current,current);
 assert.deepEqual(state,{...before,practice:false});assert(state.enemyHp<state.enemyMaxHp);
 state.clock=.1;assert.equal(run.tick(.2).kind,'hurt');assert.equal(state.hp,2);
 const wrong=state.board.findIndex(t=>!matches(t,state.current));assert.equal(run.pick(wrong).kind,'hurt');assert.equal(state.hp,1);
 state.enemyHp=1;assert.equal(run.pick(state.board.findIndex(t=>matches(t,state.current))).kind,'hit');assert.equal(state.status,'cleared');
});

test('Drop keeps the released physics body and next tile when its practice ends',()=>{
 const context={console};vm.runInNewContext(fs.readFileSync(new URL('./assets/vendor/matter-0.20.0.min.js',import.meta.url),'utf8'),context);
 const g=createDropGame(context.Matter,{practice:true,autoDrop:false});g.drop();
 const engine=g.engine,body=g.pieces[0],next=g.queue[0],before={drops:g.drops,score:g.score,time:g.time};let starts=0;
 assert(continuePracticeRun(g,()=>starts++));assert.equal(continuePracticeRun(g,()=>starts++),false);assert.equal(starts,1);
 assert.strictEqual(g.engine,engine);assert.strictEqual(g.pieces[0],body);assert.strictEqual(g.queue[0],next);
 for(const [key,value] of Object.entries(before))assert.equal(g[key],value,key);
 const y=body.position.y;g.step(.05);assert(body.position.y>y);g.dispose();
});
