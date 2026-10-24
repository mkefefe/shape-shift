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

test('early short taps retain written spacing even while the next strip stays pressed',()=>{
 const a=note(900,4,0),b=note(901,5,1),{g,events}=fixture([a,b]);
 assert(g.pressStrip(a.lane));g.release(a.lane);assert(g.pressStrip(b.lane));
 assert.equal(a.status,'queued');assert.equal(b.status,'queued');
 assert.equal(events.filter(e=>e.type==='queued').length,2);
 assert.equal(events.filter(e=>e.type==='note').length,0);assert.equal(g.hits,0);
 until(g,4.01);assert.equal(a.status,'done');assert.equal(b.status,'queued');
 assert(g.pressed.has(b.lane),'a queued onset must not steal the next finger or key');
 until(g,5.01);assert.equal(b.status,'done');assert.equal(g.hits,2);
 const sounded=events.filter(e=>e.type==='note');assert.equal(sounded.length,2);
 for(const e of sounded)assert(e.beat>=e.note.beat&&e.beat-e.note.beat<.015);
 assert(Math.abs(sounded[1].beat-sounded[0].beat-1)<.015);
});

test('early holds cancel safely and only earn finger-down time after their written onset',()=>{
 const a=note(900,4,0,1),b=note(901,6,1),{g,events}=fixture([a,b],3.7);
 assert(g.pressStrip(0));until(g,3.9);assert.equal(a.status,'queued');assert.equal(a.heldBeats||0,0);
 g.release(0);assert.equal(a.status,'waiting');assert.equal(g.lives,g.maxLives);
 assert.equal(events.filter(e=>e.type==='note').length,0);
 assert(g.pressStrip(0));until(g,4.02);assert.equal(a.status,'holding');
 assert(a.heldBeats>0&&a.heldBeats<.03);
 until(g,4.22);g.release(0);const credited=a.heldBeats;
 assert.equal(a.status,'partial');until(g,4.3);assert.equal(a.heldBeats,credited);
 assert(g.pressStrip(0));assert.equal(a.heldBeats,credited);
 until(g,5.12);assert.equal(a.status,'done');assert.equal(g.hits,1);assert.equal(g.lives,g.maxLives);
});

test('pausing retains accepted short notes, cancels queued holds and preserves active hold progress',()=>{
 const a=note(900,4,0),b=note(901,5,1,1),{g,events}=fixture([a,b]);
 assert(g.pressStrip(0));g.release(0);assert(g.pressStrip(1));
 g.pause();assert.equal(a.status,'queued');assert.equal(b.status,'waiting');
 const beat=g.beat;for(let i=0;i<100;i++)g.step(.05);assert.equal(g.beat,beat);
 g.resume();until(g,4.01);assert.equal(a.status,'done');assert.equal(g.hits,1);
 assert(g.pressStrip(1));until(g,5.2);g.pause();const held=b.heldBeats,pausedBeat=g.beat;
 g.resume();g.step(.05);assert.equal(g.beat,pausedBeat);assert.equal(b.heldBeats,held);
 assert(g.pressStrip(1));until(g,6.05);assert.equal(b.status,'done');
 assert.equal(events.filter(e=>e.type==='note'&&e.note===a).length,1);
 assert.equal(g.hits,2);assert.equal(g.lives,g.maxLives);
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

test('revive rewinds from the earliest accepted note without awarding it or bursting backing events',()=>{
 const a=note(900,4,0),b=note(901,5,1),{g,events}=fixture([a,b]);
 assert(g.pressStrip(0));g.release(0);g.hits=7;g.score=7;g.coins=7;g.lives=0;g.end();
 assert(g.revive());assert.equal(g.beat,-1);assert.equal(a.status,'waiting');
 assert.equal(g.hits,7);assert.equal(g.score,7);assert.equal(g.countdown,3);
 events.length=0;for(let i=0;i<360;i++)g.step(1/120);
 assert.equal(events.filter(e=>e.type==='note'||e.type==='accompaniment').length,0);
 g.step(.01);assert.equal(events.filter(e=>e.type==='accompaniment').length,0);
 until(g,3.5);assert(g.pressStrip(0));g.release(0);until(g,4.01);
 assert.equal(g.hits,8);assert.equal(events.filter(e=>e.type==='note'&&e.note===a).length,1);
 const pulses=events.filter(e=>e.type==='accompaniment');
 assert(pulses.every((e,i)=>i===0||e.pulse===pulses[i-1].pulse+1));
 assert.equal(g.lives,g.maxLives);
});
