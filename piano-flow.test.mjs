import test from 'node:test';import assert from 'node:assert/strict';
import {createPianoGame,pianoTempo,claimPianoReward,finishPianoProgress,pianoProgress} from './piano-flow-engine.js';
import {maxLivesForFrame,seededRandom} from './engine.js';import {normalizeProfile} from './economy.js';
import {pianoLayout,pianoTarget,touchedPianoNote,pianoStripNote} from './piano-flow-touch.js';
const advance=(g,seconds)=>{for(let i=0;i<Math.ceil(seconds*120);i++)g.step(1/120);};
const until=(g,beat)=>{let guard=0;while(g.beat<beat&&!g.over&&guard++<100000)g.step(1/240);};
test('three-lane chart waits for play and has visible lead time and nonoverlapping holds',()=>{const g=createPianoGame();advance(g,10);assert.equal(g.beat,-4);assert.equal(g.score,0);assert(g.notes.length>3);for(let i=0;i<g.notes.length;i++){const n=g.notes[i];assert(n.lane>=0&&n.lane<3);if(i)assert(g.notes[i-1].end<=n.beat);}});
test('a timed tap sounds once and pays exactly one coin; a held input cannot auto-play notes',()=>{const events=[],g=createPianoGame({onEvent:e=>events.push(e)});g.start();until(g,0);const n=g.notes[0];assert(g.press(n.lane));assert(!g.press(n.lane));assert.equal(g.coins,1);assert.equal(g.score,1);assert.equal(events.filter(e=>e.type==='note').length,1);g.release(n.lane);assert(!g.press(n.lane));assert.equal(g.coins,1);});
test('missing and wrong-lane input cost hearts, and ending is idempotent',()=>{const events=[],g=createPianoGame({onEvent:e=>events.push(e)});g.start();until(g,0);g.press((g.notes[0].lane+1)%3);assert.equal(g.lives,2);advance(g,.4);assert.equal(g.lives,2);advance(g,15);assert(g.over);g.end();assert.equal(events.filter(e=>e.type==='end').length,1);assert.equal(g.coins,0);});
test('long notes reward only completed holds and early release fails once',()=>{for(const early of [false,true]){const g=createPianoGame();g.notes=[{id:1,lane:1,pitch:72,beat:0,end:1.5,hold:1.5,status:'waiting'}];g.start();until(g,0);g.press(1);assert.equal(g.coins,0);until(g,early?.5:1.5);g.release(1);assert.equal(g.coins,early?0:1);assert.equal(g.lives,early?2:3);g.release(1);assert.equal(g.lives,early?2:3);}});
test('pause freezes progress and a paused long note waits for a fresh hold before resuming',()=>{const g=createPianoGame();g.notes=[{id:1,lane:1,pitch:72,beat:0,end:2,hold:2,status:'waiting'}];g.start();until(g,0);g.press(1);until(g,.5);g.pause();const beat=g.beat;advance(g,5);assert.equal(g.beat,beat);g.resume();advance(g,5);assert.equal(g.beat,beat);g.press(1);until(g,2);assert.equal(g.coins,1);assert.equal(g.lives,3);});
test('endless chart stays playable and bounded across seeds while tempo rises',()=>{for(let seed=1;seed<=5;seed++){const g=createPianoGame({rng:seededRandom(seed)});g.start();let held=null;for(let i=0;i<120*180&&!g.over;i++){if(held&&held.status==='done'){g.release(held.lane);held=null;}const n=g.notes.find(n=>n.status==='waiting'&&n.beat<=g.beat);if(n){g.press(n.lane);if(n.hold)held=n;else g.release(n.lane);}g.step(1/120);}assert(!g.over);assert(g.coins>160);assert(g.notes.length<20);assert(g.bpm>140);assert.equal(g.score,g.hits);assert(g.score>160);}assert.equal(pianoTempo(10000),180);});
test('equipped frame health applies to Piano Flow',()=>{for(const frame of ['none','gold','ice'])for(let upgrade=0;upgrade<3;upgrade++)assert.equal(createPianoGame({frame,upgrade}).maxLives,maxLivesForFrame(frame,upgrade));});
test('piano receipts survive profile normalization and cannot pay twice',()=>{const id='piano-flow-12345678-1234-1234-1234-123456789abc',p=finishPianoProgress({}, {score:200,hits:12,coins:12},id);assert.equal(pianoProgress(p).best,12);assert.deepEqual(finishPianoProgress(p,{score:200,hits:12,coins:12},id),p);const original=normalizeProfile({coins:20,xp:0}),paid=normalizeProfile(claimPianoReward(original,p.pending[0]));assert.equal(paid.coins,32);assert.equal(paid.xp,12);assert.equal(claimPianoReward(paid,p.pending[0]),paid);assert.equal(claimPianoReward(original,{id,coins:-1}),original);});
test('phone input plays the touched shape anywhere visible, never an empty part of its lane',()=>{for(const [w,h] of [[320,568],[390,844],[430,932]]){const g=createPianoGame({directTouch:true});g.start();until(g,1);const l=pianoLayout(w,h),n=g.notes[0],p=pianoTarget(n,g.beat,l);assert.equal(touchedPianoNote(g.notes,g.beat,l,p.x,p.y),n);assert.equal(touchedPianoNote(g.notes,g.beat,l,p.x,p.y+100),null);assert.equal(touchedPianoNote(g.notes,g.beat,l,p.x,20),null);assert(g.pressNote(n.id));assert.equal(g.coins,1);assert(!g.pressNote(n.id));assert.equal(touchedPianoNote(g.notes,g.beat,l,p.x,p.y),null);assert.equal(g.lives,3);}});
test('direct shape holds last their own duration, including pause and regrab',()=>{const g=createPianoGame({directTouch:true});g.notes=[{id:42,shape:3,color:3,lane:0,pitch:72,beat:4,hold:1.5,end:5.5,status:'waiting'}];g.start();assert(!g.pressNote(42));until(g,0);assert(g.pressNote(42));assert.equal(g.coins,0);const end=g.notes[0].end;assert(end<2);until(g,.5);g.pause();g.resume();advance(g,3);assert(g.beat<.6);assert(g.pressNote(42));until(g,end);assert.equal(g.coins,1);assert.equal(g.lives,3);g.release(0);assert(!g.pressNote(42));});
test('held shapes stay under the finger and scale their anchors across screen sizes',()=>{const n={lane:1,beat:4,status:'holding',anchor:{x:.5,y:.4}},a=pianoTarget(n,2,pianoLayout(320,568)),b=pianoTarget(n,3,pianoLayout(430,932));assert.equal(a.x,160);assert.equal(a.y,568*.4);assert.equal(b.x,215);assert.equal(b.y,932*.4);});
test('phone melody opens with several shapes and flows at half-beat intervals without overlapping touch targets',()=>{
 for(let seed=1;seed<=20;seed++){const g=createPianoGame({directTouch:true,rng:seededRandom(seed)});g.start();until(g,2.5);
  for(const [w,h] of [[320,568],[390,844],[430,932]]){const l=pianoLayout(w,h),visible=beat=>g.notes.filter(n=>{const p=pianoTarget(n,beat,l);return p.y>=l.top&&p.y+l.size/2<=h;});assert(visible(0).length>=4);assert(visible(2.5).length>=6);
   for(let i=0;i<g.notes.length;i++)for(let j=i+1;j<g.notes.length;j++){const a=g.notes[i],b=g.notes[j];if(a.lane===b.lane)assert((b.beat-a.beat)*l.unit>l.size+14,'same-column finger targets must stay separated');}}
  for(let i=1;i<g.notes.length;i++){const a=g.notes[i-1],b=g.notes[i];assert(b.beat-a.beat>=.5&&b.beat-a.beat<=1);assert(a.end<=b.beat);}
 }
});
test('denser phone melody remains playable over a full run with bounded notes and no blocked holds',()=>{
 for(let seed=1;seed<=5;seed++){const g=createPianoGame({directTouch:true,rng:seededRandom(seed)});g.start();let held=null;
  for(let i=0;i<120*180&&!g.over;i++){if(held&&held.status==='done'){g.release(held.lane);held=null;}const n=g.notes.find(n=>n.status==='waiting'&&n.beat<=g.beat);if(n){assert(g.pressNote(n.id));if(n.hold)held=n;else g.release(n.lane);}g.step(1/120);assert(g.notes.length<28);}
  assert(!g.over);assert(g.hits>500);assert.equal(g.lives,3);
 }
});
test('rhythm strips reject early and out-of-order shapes without playing random pitches or charging hearts',()=>{
 const events=[],g=createPianoGame({directTouch:true,rhythm:true,onEvent:e=>events.push(e)});g.start();until(g,0);const [first,second,third]=g.notes;
 assert.equal(g.lanes,4);assert(!g.pressNote(third.id));assert.equal(events.filter(e=>e.type==='note').length,0);assert(g.pressNote(first.id));g.release(first.lane);assert(!g.pressNote(second.id));assert.equal(g.lives,3);until(g,.5);assert(g.pressNote(second.id));assert.deepEqual(events.filter(e=>e.type==='note').map(e=>e.note.pitch),[72,76]);
});
test('four-strip song and accompaniment share measures and every generated run has the same melody and shape positions',()=>{
 const a=createPianoGame({directTouch:true,rhythm:true,rng:seededRandom(1)}),b=createPianoGame({directTouch:true,rhythm:true,rng:seededRandom(2)});assert.deepEqual(a.notes,b.notes);assert(a.notes.every(n=>n.shape===n.lane));
 const events=[],g=createPianoGame({directTouch:true,rhythm:true,onEvent:e=>events.push({type:e.type,pitch:e.pitch,beat:e.beat,noteBeat:e.note?.beat})});g.start();let held=null;
 for(let i=0;i<120*30&&!g.over;i++){if(held?.status==='done'){g.release(held.lane);held=null;}const n=g.notes.find(n=>n.status==='waiting'&&n.beat<=g.beat);if(n){assert(g.pressNote(n.id));if(n.hold)held=n;else g.release(n.lane);}g.step(1/120);}
 assert(!g.over);const notes=events.filter(e=>e.type==='note');assert(notes.length>60);assert(notes.every(e=>Math.abs(e.beat-e.noteBeat)<.03));const downbeats=events.filter(e=>e.type==='beat'&&Math.floor(e.beat)%4===0);assert.deepEqual(downbeats.slice(0,4).map(e=>e.pitch),[48,45,41,43]);
});
test('each of four phone strips has usable separated touch targets aligned to the beat line',()=>{
 for(const [w,h] of [[320,568],[390,844],[430,932]]){const l=pianoLayout(w,h,true);assert.equal(l.lanes,4);assert(l.lane>=70);const g=createPianoGame({directTouch:true,rhythm:true});for(const n of g.notes){const p=pianoTarget(n,n.beat,l);assert.equal(p.y,l.hit);assert.equal(touchedPianoNote([n],n.beat,l,p.x,p.y),n);assert.equal(touchedPianoNote([n],n.beat,l,p.x,l.top),null);}}
});
test('strip countdown freezes shapes, tempo, rewards, and health until all three seconds finish',()=>{
 const events=[],g=createPianoGame({directTouch:true,rhythm:true,stripTap:true,onEvent:e=>events.push(e)}),l=pianoLayout(390,844,true,true),start=g.notes.map(n=>pianoTarget(n,g.beat,l));g.start();
 for(let i=0;i<360;i++){assert(!g.press(g.notes[0].lane));g.step(1/120);assert.equal(g.beat,0);assert.equal(g.time,0);assert.equal(g.coins,0);assert.equal(g.lives,3);assert.deepEqual(g.notes.map(n=>pianoTarget(n,g.beat,l)),start);}
 assert.equal(g.countdown,0);assert.deepEqual(events.filter(e=>e.type==='countdown').map(e=>e.count),[3,2,1]);assert.equal(events.filter(e=>e.type==='ready').length,1);g.step(1/120);assert(g.beat>0);assert(g.press(g.notes[0].lane));
});
test('any vertical position in a strip selects the same lowest visible shape without a timing-line requirement',()=>{
 for(const [w,h] of [[320,568],[390,844],[430,932]]){const g=createPianoGame({directTouch:true,rhythm:true,stripTap:true});g.start();advance(g,3);const l=pianoLayout(w,h,true,true),n=g.notes[0],x=l.x+(n.lane+.5)*l.lane;
  for(const y of [l.top,l.top+(h-l.top)/2,h-8])assert.equal(pianoStripNote(g.notes,g.beat,l,x,y),n);
  assert.equal(pianoStripNote(g.notes,g.beat,l,x,40),null);assert.equal(pianoStripNote(g.notes,g.beat,l,l.x-1,h-8),null);assert(g.press(n.lane));assert.equal(g.coins,1);assert.equal(g.lives,3);
 }
});
test('long notes can start and resume from anywhere on their strip, and held input never collects subsequent shapes',()=>{
 const g=createPianoGame({directTouch:true,rhythm:true,stripTap:true});g.notes=[{id:42,shape:2,color:1,lane:2,pitch:72,beat:2,duration:2,hold:1.8,end:3.8,status:'waiting'}];g.start();advance(g,3);const l=pianoLayout(390,844,true,true),x=l.x+2.5*l.lane,n=pianoStripNote(g.notes,g.beat,l,x,800);assert.equal(n.id,42);assert(g.press(n.lane));assert.equal(g.coins,0);advance(g,.3);g.pause();g.resume();const beat=g.beat;advance(g,2);assert.equal(g.beat,beat);assert.equal(pianoStripNote(g.notes,g.beat,l,x,l.top+5),n);assert(g.press(n.lane));assert(!g.press(n.lane));until(g,n.end);assert.equal(g.coins,1);assert.equal(g.lives,3);g.release(n.lane);assert(!g.press(n.lane));
});
test('gentler strip mode starts at 72 BPM with spaced notes and ramps only after thirty seconds',()=>{
 const g=createPianoGame({directTouch:true,rhythm:true,stripTap:true});assert.equal(g.bpm,72);assert(g.notes.every((n,i)=>!i||n.beat-g.notes[i-1].beat>=1));g.start();advance(g,3);let held=null;
 for(let i=0;i<120*90&&!g.over;i++){if(held?.status==='done'){g.release(held.lane);held=null;}const n=g.notes.find(n=>n.status==='waiting'&&n.beat<=g.beat+2);if(n){assert(g.press(n.lane));if(n.hold)held=n;else g.release(n.lane);}g.step(1/120);if(g.time<=30)assert.equal(g.bpm,72);}
 assert(!g.over);assert(Math.abs(g.bpm-90)<.01);assert.equal(g.lives,3);assert(g.hits>80);
});


test('every phone strip entry point saves a quick tap and only penalizes crossing the tail deadline',()=>{
 for(const melodicStrips of [false,true])for(const entry of ['press','pressStrip','pressNote']){
  const events=[],g=createPianoGame({directTouch:true,rhythm:true,stripTap:true,melodicStrips,onEvent:e=>events.push(e)});
  const n={id:100,lane:1,shape:1,color:1,pitch:72,beat:2,hold:1.75,end:3.75,status:'waiting'};g.notes=[n];g.start();advance(g,3);
  const press=()=>g[entry](entry==='pressNote'?n.id:n.lane);
  assert(press());g.release(n.lane);g.release(n.lane);assert.equal(n.status,'partial');assert.equal(g.lives,3);assert.equal(g.coins,0);
  advance(g,.2);assert(press());advance(g,.25);g.release(n.lane);const saved=n.heldBeats;assert(saved>0);advance(g,.2);assert.equal(n.heldBeats,saved);
  assert(press());advance(g,.2);g.release(n.lane);assert(n.heldBeats>saved);assert.equal(g.lives,3);assert.equal(g.coins,0);
  const l=pianoLayout(390,844,true,true,true);g.beat=n.end-.01;assert(pianoTarget(n,g.beat,l).y-n.hold*l.unit<l.missLine);assert.equal(g.lives,3);
  g.step(.02);assert.equal(g.lives,2);assert.equal(n.status,'missed');g.release(n.lane);advance(g,.1);assert.equal(g.lives,2);assert.equal(events.filter(e=>e.type==='miss').length,1);
 }
});


