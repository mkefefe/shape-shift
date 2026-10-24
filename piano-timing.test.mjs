import test from 'node:test';
import assert from 'node:assert/strict';
import {createPianoGame} from './piano-flow-engine.js';
import {ORIGINAL_SONGS} from './piano-songs.js';

const options={stripTap:true,rhythm:true,melodicStrips:true,fullSongs:true,rng:()=>0};
const note=(id,beat,lane,hold=0)=>({id,beat,end:beat+hold,lane,hold,pitch:60+lane*2,shape:lane,color:0,duration:hold?hold+1.5:1,rapid:!hold,status:'waiting',awaiting:false});
function fixture(notes,beat=2){
 const events=[],g=createPianoGame({...options,onEvent:e=>events.push(e)});
 g.start();for(let i=0;i<360;i++)g.step(1/120);
 g.notes=notes;g.beat=beat;events.length=0;
 return {g,events};
}
function until(g,beat){
 for(let i=0;g.beat<beat&&i<10000;i++)g.step(1/240);
 assert(g.beat>=beat,'the active musical clock reached the requested beat');
}

test('all four strips respond and score immediately and sound on the physical strike',()=>{
 const notes=[0,1,2,3].map(lane=>note(900+lane,4+lane*.5,lane)),{g,events}=fixture(notes);
 for(const n of notes){
  assert(g.pressStrip(n.lane));assert.equal(n.status,'done');assert.equal(n.soundPending,false);
  assert.equal(g.hits,n.lane+1);assert.equal(g.coins,n.lane+1);g.release(n.lane);
 }
 assert.equal(events.filter(e=>e.type==='input').length,4);
 assert.equal(events.filter(e=>e.type==='note').length,4);
 until(g,5.51);
 const sounded=events.filter(e=>e.type==='note');assert.equal(sounded.length,4);
 sounded.forEach((e,i)=>{assert.equal(e.note,notes[i]);assert.equal(e.beat,2);});
 assert.equal(g.hits,4);assert.equal(g.coins,4);assert.equal(g.lives,g.maxLives);
});

test('all four early holds fill immediately and save finger-down progress across release',()=>{
 for(let lane=0;lane<4;lane++){
  const a=note(900,4,lane,2),{g,events}=fixture([a],3.7);
  assert(g.pressStrip(lane));assert.equal(a.status,'holding');
  until(g,3.9);assert(a.heldBeats>.19);assert(a.heldBeats<.22);
  g.release(lane);const credited=a.heldBeats;assert.equal(a.status,'partial');
  until(g,4.1);assert.equal(a.heldBeats,credited);
  assert.equal(events.filter(e=>e.type==='note').length,1,'release does not schedule a second sound at onset');
  assert(g.pressStrip(lane));assert.equal(a.heldBeats,credited);
  assert.equal(events.filter(e=>e.type==='note').length,2,'resuming after onset sounds immediately');
  until(g,6.05);assert.equal(a.status,'done');assert.equal(g.hits,1);assert.equal(g.lives,g.maxLives);
 }
});

test('a hold sounds on press and does not replay at its written beat',()=>{
 const a=note(900,4,0,1),{g,events}=fixture([a]);assert(g.pressStrip(0));
 until(g,3.1);assert.equal(a.status,'done');assert.equal(g.hits,1);assert.equal(a.soundPending,false);
 g.release(0);assert.equal(events.filter(e=>e.type==='note').length,1);
 until(g,4.1);assert.equal(events.filter(e=>e.type==='note').length,1);
 assert.equal(g.hits,1);assert.equal(g.coins,1);assert.equal(a.soundPending,false);
});

test('pausing preserves earned taps, early hold progress without extra sounds while paused',()=>{
 const a=note(900,4,0),b=note(901,5,1,1),{g,events}=fixture([a,b]);
 assert(g.pressStrip(0));g.release(0);assert(g.pressStrip(1));until(g,2.2);
 const credited=b.heldBeats;g.pause();assert.equal(a.status,'done');assert.equal(b.status,'holding');assert(b.awaiting);
 const beat=g.beat;for(let i=0;i<100;i++)g.step(.05);assert.equal(g.beat,beat);
 assert.equal(events.filter(e=>e.type==='note').length,2);
 g.resume();g.step(.05);assert.equal(g.beat,beat);assert.equal(b.heldBeats,credited);
 assert(g.pressStrip(1));assert.equal(b.heldBeats,credited);until(g,5.1);
 assert.equal(g.hits,2);assert.equal(g.lives,g.maxLives);
 assert.equal(events.filter(e=>e.type==='note'&&e.note===a).length,1);
 assert.equal(events.filter(e=>e.type==='note'&&e.note===b).length,2);
});

test('resuming an active hold after pause restarts sound without losing progress',()=>{
 const a=note(900,4,0,2),{g,events}=fixture([a],4);assert(g.pressStrip(0));until(g,4.3);
 g.pause();const credited=a.heldBeats,beat=g.beat;g.resume();g.step(.05);
 assert.equal(g.beat,beat);assert(g.pressStrip(0));assert.equal(a.heldBeats,credited);
 assert.equal(events.filter(e=>e.type==='note').length,2);
 until(g,6.05);assert.equal(a.status,'done');assert.equal(g.hits,1);
});

test('partial holds remain resumable throughout their visible grace period but not after the deadline',()=>{
 const a=note(900,4,0,1),{g}=fixture([a],4.3);assert(g.pressStrip(0));until(g,5.01);
 g.release(0);const credited=a.heldBeats;until(g,5.05);
 assert(g.pressStrip(0));assert.equal(a.heldBeats,credited);until(g,5.4);
 assert.equal(a.status,'done');assert.equal(g.lives,g.maxLives);
 const b=note(901,4,1,1),expired=fixture([b],4.3).g;
 assert(expired.pressStrip(1));until(expired,4.5);expired.release(1);expired.beat=5.66;
 assert(!expired.pressNote(b.id));expired.step(.01);assert.equal(b.status,'missed');
});

test('an abandoned partial hold plays only its initial strike and stays silent when missed',()=>{
 const a=note(900,4,0,1),{g,events}=fixture([a],3.7);assert(g.pressStrip(0));until(g,3.9);g.release(0);
 until(g,5.7);assert.equal(a.status,'missed');assert.equal(a.soundPending,false);
 assert.equal(events.filter(e=>e.type==='note'&&e.note===a).length,1);assert.equal(g.hits,0);
});

test('late taps remain forgiving and a held key cannot collect the next short note',()=>{
 const a=note(900,4,0),b=note(901,4.5,0),{g,events}=fixture([a,b],4.3);
 a.rapid=false;b.rapid=false;
 assert(g.pressStrip(0));assert.equal(a.status,'done');assert.equal(events.filter(e=>e.type==='note').length,1);
 until(g,4.6);assert.equal(b.status,'waiting');assert.equal(g.hits,1);
 assert(!g.pressStrip(0));g.release(0);assert(g.pressStrip(0));assert.equal(b.status,'done');
 assert.equal(g.hits,2);assert.equal(g.lives,g.maxLives);
});

test('the backing starts on the first written downbeat and follows each bar chord',()=>{
 const events=[],g=createPianoGame({...options,onEvent:e=>events.push(e)});g.start();
 for(let i=0;i<360;i++)g.step(1/120);
 until(g,1.99);assert.equal(events.filter(e=>e.type==='accompaniment').length,0);
 for(let i=0;g.beat<6.01&&i<3000;i++){
  if(!g.notes.some(n=>n.status==='holding'||n.status==='queued'&&n.hold)){
   const next=g.notes.find(n=>n.status==='waiting'||n.status==='partial');
   if(next&&next.beat-g.beat<=.12){for(const lane of [...g.pressed])g.release(lane);g.pressStrip(next.lane);}
  }
  g.step(1/240);
 }
 const backing=events.filter(e=>e.type==='accompaniment');assert.equal(backing.length,9);
 for(const [i,e] of backing.entries()){
  assert.equal(e.pulse,i);assert.equal(e.musicalBeat,2+i*.5);
  assert.equal(e.pitches.length,1);assert(e.velocity>0&&e.velocity<.7);
 }
 const root=chord=>chord[0]>=48?chord[0]-12:chord[0];
 assert.equal(backing[0].pitch,root(ORIGINAL_SONGS[0].notes[0].chord));
 assert.equal(backing[8].pitch,root(ORIGINAL_SONGS[0].notes.find(n=>n.songBeat===4).chord));
 assert.equal(g.lives,g.maxLives);
});


test('revive retains already earned points without replaying completed notes on revive',()=>{
 const a=note(900,4,0),b=note(901,5,1,1),{g,events}=fixture([a,b]);
 assert(g.pressStrip(0));g.release(0);assert(g.pressStrip(1));until(g,2.2);g.release(1);
 g.lives=0;g.end();assert(g.revive());assert.equal(g.beat,0);
 assert.equal(a.status,'done');assert.equal(a.soundPending,false);assert.equal(b.status,'waiting');assert.equal(b.heldBeats,0);
 assert.equal(g.hits,1);assert.equal(g.score,1);assert.equal(g.countdown,3);
 events.length=0;for(let i=0;i<360;i++)g.step(1/120);
 assert.equal(events.filter(e=>e.type==='note'||e.type==='accompaniment').length,0);
 g.step(.01);assert.equal(events.filter(e=>e.type==='accompaniment').length,0);
 until(g,3.5);assert(g.pressStrip(1));until(g,5.1);
 assert.equal(g.hits,2);assert.equal(g.coins,2);
 assert.equal(events.filter(e=>e.type==='note'&&e.note===a).length,0);
 assert.equal(events.filter(e=>e.type==='note'&&e.note===b).length,1);
 const pulses=events.filter(e=>e.type==='accompaniment');
 assert(pulses.every((e,i)=>i===0||e.pulse===pulses[i-1].pulse+1));
 assert.equal(g.lives,g.maxLives);
});


test('short screens allow striking the visible edge of a note immediately',()=>{
 const a=note(900,7,0),{g,events}=fixture([a]);g.inputWindow=5.2;
 assert(g.pressStrip(0));assert.equal(a.status,'done');assert.equal(events.filter(e=>e.type==='note').length,1);
});
