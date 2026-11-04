import test from 'node:test';
import assert from 'node:assert/strict';
import {createPianoGame,pianoSongTempo,PIANO_HIT_SECONDS,PIANO_PERFECT_SECONDS,pianoSupportSchedule} from './piano-flow-engine.js';
import {createPianoInput} from './piano-input.js';

const options={stripTap:true,rhythm:true,melodicStrips:true,fullSongs:true,rng:()=>0};
const note=(id,beat,lane,hold=0,bpm=100)=>({id,beat,end:beat+hold,lane,hold,bpm,pitch:60+lane*2,shape:lane,color:0,duration:hold?hold+.5:1,soundBeats:hold?hold+.1:.8,rapid:!hold,status:'waiting',awaiting:false});
function fixture(notes,{beat=notes[0].beat,recoverWrongTap=false}={}){
 const events=[],g=createPianoGame({...options,recoverWrongTap,onEvent:e=>events.push(e)});
 g.start();g.countdown=0;g.notes=notes;g.beat=beat;g.bpm=notes[0].bpm;events.length=0;
 return {g,events,input:createPianoInput({getGame:()=>g})};
}
function until(g,beat){
 for(let i=0;g.beat<beat-1e-8&&i<20000&&!g.over;i++)g.step(Math.min(1/240,(beat-g.beat)*60/g.bpm));
 assert(Math.abs(g.beat-beat)<1e-6,'the active musical clock reached the requested beat');
}
function advance(g,seconds,frame=1/240){for(let left=seconds;left>1e-8;){const dt=Math.min(left,frame);g.step(dt);left-=dt;}}

test('written tempo stays stable for long songs and changes exactly at the next song boundary',()=>{
 assert.equal(pianoSongTempo(10000,104),104);assert.equal(pianoSongTempo(4,88),88);
 const a=note(900,4,0,0,90),b=note(901,6,1,0,120),{g}=fixture([a,b],{beat:5.9});
 a.status='done';g.step(.2);
 assert(Math.abs(g.beat-(6+(.2-.1*60/90)*2))<1e-8);assert.equal(g.bpm,120);
});

test('the same forgiving hit windows apply in seconds at slow and fast song tempos',()=>{
 for(const bpm of [72,100,144])for(const offset of [-.21,-.04,0,.04,.21]){
  const a=note(900,4,0,0,bpm),{g,events}=fixture([a],{beat:4+offset*bpm/60});
  assert(g.pressStrip(0));assert.equal(g.hits,1);assert.equal(g.coins,1);
  assert.equal(a.perfect,Math.abs(offset)<=PIANO_PERFECT_SECONDS);
  assert(Math.abs(a.timingErrorSeconds-offset)<1e-8);
  assert.equal(events.filter(e=>e.type==='note').length,1);
 }
 assert.equal(PIANO_HIT_SECONDS,.22);
});

test('far-early taps cannot collect visible notes, even with a tall screen input window',()=>{
 const a=note(900,4,0),b=note(901,4.5,1),{g,events}=fixture([a,b],{beat:2});g.inputWindow=500;
 assert(!g.pressStrip(0));assert(!g.pressNote(a.id));assert(!g.pressStrip(1));
 assert.equal(g.hits,0);assert.equal(g.lives,g.maxLives);assert.equal(events.filter(e=>e.type==='note').length,0);
 until(g,4);assert(g.pressStrip(0));g.release(0);assert(!g.pressStrip(1));
 until(g,4.5);assert(g.pressStrip(1));assert.equal(g.hits,2);
});

test('Perfect feedback reflects timing, while each completed note pays exactly one reward',()=>{
 const a=note(900,4,0),b=note(901,5,1),{g,events}=fixture([a,b]);
 g.pressStrip(0);g.release(0);until(g,5+.16*g.bpm/60);g.pressStrip(1);g.release(1);g.pressStrip(1);
 assert.equal(g.hits,2);assert.equal(g.score,2);assert.equal(g.coins,2);assert.equal(g.perfectHits,1);
 assert.deepEqual(events.filter(e=>e.type==='complete').map(e=>e.rating),['perfect','good']);
});

test('30/15fps frames preserve song time instead of slowing the music down',()=>{
 for(const frame of [.2,.5,1]){
  const a=note(900,100,0),fast=fixture([a],{beat:0}).g,slow=fixture([{...a}],{beat:0}).g;
  advance(fast,1,1/240);advance(slow,1,frame);
  assert(Math.abs(fast.time-slow.time)<1e-8);assert(Math.abs(fast.beat-slow.beat)<1e-8);
  assert.equal(slow.bpm,100);assert(Math.abs(slow.time-1)<1e-8);
 }
 const stalled=fixture([note(900,4,0)],{beat:3}).g;stalled.step(1.5);
 assert(stalled.paused);assert.equal(stalled.time,0);assert.equal(stalled.beat,3);assert.equal(stalled.lives,stalled.maxLives);
});

test('early holds do not earn sustain before onset and brief lifts preserve earned progress',()=>{
 for(let lane=0;lane<4;lane++){
  const a=note(900,4,lane,1),{g,events}=fixture([a],{beat:3.8});
  assert(g.pressStrip(lane));until(g,3.9);assert.equal(a.heldBeats,0);
  until(g,4.3);g.release(lane);const saved=a.heldBeats;
  until(g,4.4);assert.equal(a.heldBeats,saved);assert(g.pressStrip(lane));until(g,5.1);
  assert.equal(a.status,'done');assert.equal(g.hits,1);assert.equal(g.lives,g.maxLives);
  assert.equal(events.filter(e=>e.type==='note').length,2,'resume is the only additional attack');
 }
});

test('a hold must start near its onset instead of being accepted near the end of its trail',()=>{
 const a=note(900,4,0,2),{g,events}=fixture([a],{beat:4.5});
 assert(!g.pressStrip(0));g.step(.01);assert.equal(a.status,'missed');assert.equal(g.hits,0);
 assert.equal(g.lives,g.maxLives-1);assert.equal(events.filter(e=>e.type==='miss').length,1);
 advance(g,.1);assert.equal(g.lives,g.maxLives-1);
});

test('release tolerance completes a nearly finished hold without forgiving a large missing section',()=>{
 for(const gap of [.06,.14]){
  const a=note(900,4,0,1),{g}=fixture([a]);g.pressStrip(0);until(g,5-gap*g.bpm/60);g.release(0);
  assert.equal(a.status,gap<PIANO_PERFECT_SECONDS?'done':'partial');assert.equal(g.hits,gap<PIANO_PERFECT_SECONDS?1:0);
 }
});

test('one held finger never automatically starts the next long or short note on the same strip',()=>{
 for(const hold of [0,1]){
  const a=note(900,4,0,.5),b=note(901,5,0,hold),{g,events}=fixture([a,b]);
  g.pressStrip(0);until(g,5);assert.equal(a.status,'done');assert.equal(b.status,'waiting');
  assert(!g.pressStrip(0));assert.equal(g.hits,1);assert.equal(events.filter(e=>e.type==='note').length,1);
  g.release(0);assert(g.pressStrip(0));if(hold)until(g,6);assert.equal(g.hits,2);
 }
});

test('an unfinished long note cannot block an on-time recovery on the following strip',()=>{
 for(const nextLane of [0,1]){
  const a=note(900,4,0,1.8),b=note(901,6,nextLane),{g,events}=fixture([a,b]);
  g.pressStrip(0);until(g,4.5);g.release(0);until(g,5.85);
  assert(g.pressStrip(nextLane));assert.equal(a.status,'missed');assert.equal(b.status,'done');
  assert.equal(g.hits,1);assert.equal(g.lives,g.maxLives-1);assert.equal(events.filter(e=>e.type==='miss').length,1);
 }
});

test('wrong-tap recovery freezes the clock, rewinds once, and requires a fresh on-time replay',()=>{
 const a=note(900,4,0),{g,events,input}=fixture([a],{beat:3.9,recoverWrongTap:true});
 input.press(1,'bad');const time=g.time;assert.equal(g.lives,g.maxLives-1);assert.equal(g.recoverySeconds,1);
 advance(g,.5);assert(g.beat<3.9);assert.equal(g.time,time);g.pause();const frozen=g.recoverySeconds;
 advance(g,.5);assert.equal(g.recoverySeconds,frozen);g.resume();advance(g,.6);
 assert.equal(g.recoverySeconds,0);assert(!g.pressStrip(0),'rewind does not make an early retry perfect');
 until(g,4);input.release('bad');input.press(0,'good');assert.equal(g.hits,1);
 assert.equal(events.filter(e=>e.type==='recover').length,1);assert.equal(events.filter(e=>e.type==='note').length,1);
});

test('pause freezes a held note and its music until the player resumes the physical hold',()=>{
 const a=note(900,4,0,1),{g,events}=fixture([a]);g.pressStrip(0);until(g,4.3);
 g.pause();const beat=g.beat,credited=a.heldBeats;advance(g,1);g.resume();advance(g,.5);
 assert.equal(g.beat,beat);assert.equal(a.heldBeats,credited);assert.equal(events.filter(e=>e.type==='note').length,1);
 assert(g.pressStrip(0));until(g,5);assert.equal(g.hits,1);assert.equal(events.filter(e=>e.type==='note').length,2);
});

test('revive retains earned notes and points but never auto-plays them or the unfinished sustain',()=>{
 const a=note(900,4,0),b=note(901,5,1,1),{g,events}=fixture([a,b]);
 g.pressStrip(0);g.release(0);until(g,5);g.pressStrip(1);until(g,5.2);g.release(1);
 g.lives=0;g.end();assert(g.revive());assert.equal(a.status,'done');assert.equal(b.status,'waiting');assert.equal(b.heldBeats,0);
 assert.equal(g.hits,1);assert.equal(g.score,1);events.length=0;advance(g,3);
 assert.equal(events.filter(e=>e.type==='note').length,0);until(g,5);assert(g.pressStrip(1));until(g,6);
 assert.equal(g.hits,2);assert.equal(g.coins,2);assert.equal(events.filter(e=>e.type==='note').length,1);
});

test('a stale early physical press is not retried by frame flushing',()=>{
 const a=note(900,4,0),{g,input,events}=fixture([a],{beat:3});input.press(0,'finger');
 until(g,4);for(let i=0;i<10;i++)input.flush();assert.equal(g.hits,0);
 input.release('finger');input.press(0,'fresh');assert.equal(g.hits,1);assert.equal(events.filter(e=>e.type==='note').length,1);
});

test('late-note audio reports the written sustain remaining and actual strike error',()=>{
 const a=note(900,4,0,1),{g,events}=fixture([a],{beat:4.2});g.pressStrip(0);
 const sound=events.find(e=>e.type==='note');assert(Math.abs(sound.remainingSound-.9)<1e-8);
 assert(Math.abs(sound.timingErrorSeconds-.12)<1e-8);until(g,4.5);g.release(0);until(g,4.6);g.pressStrip(0);
 assert(Math.abs(events.filter(e=>e.type==='note').at(-1).remainingSound-.5)<1e-8);
});


test('backing stays on the written grid and resumed holds cannot duplicate scheduled attacks',()=>{
 const events=[{id:'bass',beat:0,duration:1},{id:'arp1',beat:.5,duration:.3},{id:'arp2',beat:1.5,duration:.3}],played=new Map();
 const first=pianoSupportSchedule(events,{bpm:100,timingErrorSeconds:-.1,beat:3.833333,played});
 assert.deepEqual(first.map(e=>e.id),['bass','arp1','arp2']);
 assert(first.every(e=>Math.abs(e.delay-(e.beat*.6+.1))<1e-8));
 assert.deepEqual(pianoSupportSchedule(events,{bpm:100,timingErrorSeconds:.2,beat:4.333333,played}),[]);
 // Pausing cancels scheduled audio; clear its ownership so future beats can return.
 played.clear();const resumed=pianoSupportSchedule(events,{bpm:100,timingErrorSeconds:.4,beat:4.666667,played});
 assert.deepEqual(resumed.map(e=>e.id),['arp2']);assert(Math.abs(resumed[0].delay-.5)<1e-8);
 pianoSupportSchedule([],{beat:50,played});assert.equal(played.size,0);
});
