import test from 'node:test';
import assert from 'node:assert/strict';
import {createPianoGame,pianoSongTempo,createPianoPerformedSupport} from './piano-flow-engine.js';
import {createPianoInput} from './piano-input.js';
import {pianoLayout,pianoTarget} from './piano-flow-touch.js';
const options={stripTap:true,rhythm:true,melodicStrips:true,fullSongs:true,rng:()=>0};
const note=(id,beat,lane,hold=0,bpm=100)=>({id,beat,end:beat+hold,lane,hold,bpm,pitch:60+lane*2,shape:lane,color:0,duration:hold?hold+.5:1,soundBeats:hold?hold+.1:.8,rapid:!hold,status:'waiting',awaiting:false});
function fixture(notes,{beat=notes[0].beat,recoverWrongTap=false}={}){const events=[],g=createPianoGame({...options,recoverWrongTap,onEvent:e=>events.push(e)});g.start();g.countdown=0;g.notes=notes;g.beat=beat;g.bpm=notes[0].bpm;events.length=0;return {g,events,input:createPianoInput({getGame:()=>g})};}
function advance(g,seconds,frame=1/240){for(let left=seconds;left>1e-8;){const dt=Math.min(left,frame);g.step(dt);left-=dt;}}

test('every visible lane plays immediately from the upper screen, at every song tempo',()=>{
 for(const bpm of [72,100,144])for(let lane=0;lane<4;lane++){
  const a=note(900,4,lane,0,bpm),{g,events}=fixture([a],{beat:0});
  assert(g.pressStrip(lane));assert.equal(g.hits,1);assert.equal(g.score,1);assert.equal(g.coins,1);
  assert.equal(a.status,'done');assert.equal(events.filter(e=>e.type==='note').length,1);
  assert.equal(events.find(e=>e.type==='complete').rating,'hit');
  g.release(lane);advance(g,.2);assert.equal(events.filter(e=>e.type==='note').length,1,'no deferred attack');
 }
});
test('visible notes in different lanes can be played in any order, with independent simultaneous holds',()=>{
 const a=note(900,2,0,2),b=note(901,3,1,2),c=note(902,4,2),d=note(903,4.2,3),{g,events}=fixture([a,b,c,d],{beat:0});
 for(const lane of [3,1,2,0])assert(g.pressStrip(lane));
 assert.equal(g.hits,4);assert.equal(g.lives,g.maxLives);assert.equal(g.pressed.size,4);
 assert.deepEqual(events.filter(e=>e.type==='note').map(e=>e.note.id),[903,901,902,900]);
 g.release(0);assert.equal(a.status,'done');assert.equal(b.status,'holding');assert(g.pressed.has(1));
 g.release(1);assert.equal(g.hits,4);assert.equal(g.coins,4);
});
test('each fresh press selects the earliest visible unplayed note only within its own lane',()=>{
 const notes=[note(900,2,0),note(901,3,1),note(902,3.5,1),note(903,9,2)],{g,input}=fixture(notes,{beat:0});
 assert(!g.pressNote(902));input.press(1,'finger');assert.equal(notes[1].status,'done');assert.equal(notes[0].status,'waiting');
 input.press(1,'finger');input.flush();assert.equal(g.hits,1);
 input.release('finger');input.press(1,'finger');assert.equal(notes[2].status,'done');assert.equal(g.hits,2);
 assert(!g.pressNote(903));assert.equal(notes[3].status,'waiting');
});
test('a long visible note awards its point on attack and lifting it cannot remove or duplicate that point',()=>{
 for(const length of [0,.03,.4,1.5]){
  const a=note(900,4,0,2),{g,events}=fixture([a],{beat:0});assert(g.pressStrip(0));
  assert.equal(g.hits,1);assert.equal(g.coins,1);assert.equal(a.status,'holding');
  advance(g,length);g.release(0);assert.equal(a.status,'done');assert.equal(g.lives,g.maxLives);
  assert(!g.pressStrip(0));assert.equal(g.hits,1);assert.equal(events.filter(e=>e.type==='complete').length,1);
 }
});
test('short notes and the visible tail of long notes remain playable until they exit the viewport',()=>{
 for(const [w,h] of [[320,568],[390,844],[1200,800]])for(const hold of [0,2]){
  const layout=pianoLayout(w,h,true,true,true),window=4+(layout.size/2+12)/layout.unit,late=(h-layout.hit+layout.size/2)/layout.unit;
  for(const position of ['top','bottom']){
   const a=note(900,4,0,hold),beat=position==='top'?4-window+.01:4+hold+late-.01,{g}=fixture([a],{beat});g.inputWindow=window;g.lateWindow=late;
   const p=pianoTarget(a,g.beat,layout);assert(p.y+p.size/2>=layout.top-12);assert(p.y-hold*layout.unit-p.size/2<h);
   assert(g.pressStrip(0),`${w}x${h} ${position} hold ${hold}`);assert.equal(g.hits,1);
  }
  const a=note(900,4,0,hold),{g}=fixture([a],{beat:4+hold+late+.01});g.lateWindow=late;assert(!g.pressNote(a.id));g.step(.01);
  assert.equal(a.status,'missed');assert.equal(g.lives,g.maxLives-1);
 }
});
test('a held key never collects the next note, and a press made before visibility is never buffered',()=>{
 const a=note(900,4,0,.5),b=note(901,5,0),{g,input,events}=fixture([a,b],{beat:-1});
 input.press(0,'key');g.beat=0;input.flush();assert.equal(g.hits,0);
 input.release('key');input.press(0,'key');assert.equal(g.hits,1);advance(g,1);g.beat=5;
 input.press(0,'key');input.flush();assert.equal(b.status,'waiting');assert.equal(g.hits,1);
 input.release('key');input.press(0,'key');assert.equal(g.hits,2);assert.equal(events.filter(e=>e.type==='note').length,2);
});
test('wrong-lane recovery freezes and rewinds once, then an early visible retry works immediately',()=>{
 const a=note(900,4,0),{g,events,input}=fixture([a],{beat:3.9,recoverWrongTap:true});input.press(1,'bad');
 const time=g.time;assert.equal(g.lives,g.maxLives-1);assert.equal(g.recoverySeconds,1);advance(g,.5);assert(g.beat<3.9);assert.equal(g.time,time);
 g.pause();const frozen=g.recoverySeconds;advance(g,.5);assert.equal(g.recoverySeconds,frozen);g.resume();advance(g,.6);
 input.release('bad');input.press(0,'good');assert.equal(g.hits,1);assert.equal(events.filter(e=>e.type==='recover').length,1);assert.equal(events.filter(e=>e.type==='note').length,1);
});
test('pause ends optional sustain, retains its point and resumes the clock without demanding another hold',()=>{
 const a=note(900,4,0,2),b=note(901,5,1),{g,events}=fixture([a,b],{beat:2});g.pressStrip(0);advance(g,.1);g.pause();
 const beat=g.beat;advance(g,.5);assert.equal(g.beat,beat);assert.equal(g.hits,1);assert.equal(a.status,'done');
 g.resume();advance(g,.1);assert(g.beat>beat);assert(g.pressStrip(1));assert.equal(g.hits,2);assert.equal(events.filter(e=>e.type==='note').length,2);
});
test('revive preserves all earned taps and optional holds without replaying or rescoring them',()=>{
 const a=note(900,4,0),b=note(901,5,1,2),c=note(902,7,2),{g,events}=fixture([a,b,c]);
 g.pressStrip(0);g.release(0);g.pressStrip(1);g.lives=0;g.end();assert(g.revive());
 assert.equal(a.status,'done');assert.equal(b.status,'done');assert.equal(g.hits,2);events.length=0;advance(g,3);
 assert.equal(events.filter(e=>e.type==='note').length,0);assert.equal(g.hits,2);g.beat=4;assert(g.pressStrip(2));assert.equal(g.hits,3);
});
test('written tempo stays stable and changes exactly at the next score boundary',()=>{
 assert.equal(pianoSongTempo(10000,104),104);const a=note(900,4,0,0,90),b=note(901,6,1,0,120),{g}=fixture([a,b],{beat:5.9});a.status='done';g.step(.2);
 assert(Math.abs(g.beat-(6+(.2-.1*60/90)*2))<1e-8);assert.equal(g.bpm,120);
});
test('slow frames retain musical time, while a long stall pauses without surprise damage',()=>{
 for(const frame of [.2,.5,1]){const fast=fixture([note(900,100,0)],{beat:0}).g,slow=fixture([note(900,100,0)],{beat:0}).g;advance(fast,1);advance(slow,1,frame);assert(Math.abs(fast.beat-slow.beat)<1e-8);assert(Math.abs(slow.time-1)<1e-8);}
 const stalled=fixture([note(900,4,0)],{beat:3}).g;stalled.step(1.5);assert(stalled.paused);assert.equal(stalled.beat,3);assert.equal(stalled.lives,stalled.maxLives);
});
test('lead attacks get their full authored articulation immediately, even before or after nominal onset',()=>{
 for(const beat of [0,4.5]){const a=note(900,4,0,2),{g,events}=fixture([a],{beat});g.pressStrip(0);const sound=events.find(e=>e.type==='note');assert.equal(sound.remainingSound,a.soundBeats);assert.equal(sound.time,0);assert.equal(g.hits,1);}
});
test('performed support sounds on the press and cancels stale future figures when the player moves on',()=>{
 let now=0;const calls=[],cancelled=[];const support=createPianoPerformedSupport({now:()=>now,play:event=>{calls.push(event);return ()=>cancelled.push(event.id);}});
 support.schedule([{id:'bass',beat:0,duration:1},{id:'arp',beat:.5,duration:.3}],{bpm:100,beat:0});
 assert.deepEqual(calls.map(e=>e.delay),[0,.3]);now=.1;
 support.schedule([{id:'next-bass',beat:0,duration:1},{id:'next-arp',beat:.5,duration:.3}],{bpm:120,beat:0});
 assert.deepEqual(cancelled,['arp']);assert.equal(calls[2].delay,0);assert.equal(calls[3].delay,.25);
 support.clear();assert.deepEqual(cancelled,['arp','next-bass','next-arp']);
 support.schedule([{id:'next-bass',beat:0,duration:1}],{bpm:120,beat:0});assert.equal(calls.length,5,'pause clears cancelled support ownership');
});

test('wrong-strip recovery releases optional sustains without removing their earned point',()=>{
 const a=note(900,2,0,3),b=note(901,3,1),{g,events}=fixture([a,b],{beat:0,recoverWrongTap:true});
 g.pressStrip(0);assert.equal(g.hits,1);assert.equal(a.status,'holding');g.pressStrip(3);
 assert.equal(a.status,'done');assert.equal(g.pressed.size,0);assert.equal(g.hits,1);assert.equal(g.recoverySeconds,1);
 assert.equal(events.filter(e=>e.type==='release'&&e.note===a).length,1);advance(g,1.1);g.pressStrip(1);assert.equal(g.hits,2);
});
