import test from 'node:test';
import assert from 'node:assert/strict';
import {ORIGINAL_SONGS,createSongSequence,brightenPianoSong,readPianoBar} from './piano-songs.js';
import {createPianoGame,pianoSongTempo} from './piano-flow-engine.js';
const config={stripTap:true,rhythm:true,melodicStrips:true,fullSongs:true,rng:()=>0};
const advance=(g,seconds)=>{for(let i=0;i<Math.ceil(seconds*120);i++)g.step(1/120);};
const shape=notes=>notes.map(n=>[n.pitch,n.duration,n.soundBeats,n.holdBeats,n.chord]);
const measure=(song,bar)=>song.notes.filter(n=>n.bar===bar);
function performStep(g){
 if(!g.notes.some(n=>n.status==='holding')){
  for(const lane of [...g.pressed])g.release(lane);
  const n=g.notes.find(n=>['waiting','partial'].includes(n.status));
  if(n&&n.beat<=g.beat)assert(g.pressStrip(n.lane),n.song+' beat '+n.songBeat+' could not be played');
 }
 g.step(1/120);
}
test('twenty themes have distinct melodies, rhythms and written tempos',()=>{
 assert.equal(ORIGINAL_SONGS.length,20);assert.equal(new Set(ORIGINAL_SONGS.map(s=>s.id)).size,20);
 const verses=ORIGINAL_SONGS.map(s=>s.notes.filter(n=>n.section==='Verse'));
 assert.equal(new Set(verses.map(n=>JSON.stringify(shape(n)))).size,20);
 assert.equal(new Set(verses.map(ns=>JSON.stringify(ns.map(n=>[n.duration,n.soundBeats,n.holdBeats])))).size,20);
 assert(new Set(ORIGINAL_SONGS.map(s=>s.bpm)).size>=15);
 for(const s of ORIGINAL_SONGS)assert(s.bpm>=76&&s.bpm<=114);
});
test('scores have complete measures, answering cadences and returning choruses',()=>{
 for(const song of ORIGINAL_SONGS){
  assert.equal(song.beats,128);assert.equal(song.notes.reduce((sum,n)=>sum+n.duration,0),128);
  assert.deepEqual(song.sections.map(s=>[s.name,s.beat,s.bars]),[['Intro',0,2],['Verse',8,8],['Chorus',40,8],['Bridge',72,4],['Chorus',88,8],['Outro',120,2]]);
  for(let bar=0;bar<32;bar++){
   const notes=measure(song,bar);assert.equal(notes.reduce((sum,n)=>sum+n.duration,0),4);
   assert.equal(notes[0].songBeat,bar*4);assert.equal(notes.filter(n=>n.harmony.length).length,1);
   for(let i=1;i<notes.length;i++)assert.equal(notes[i].songBeat,notes[i-1].songBeat+notes[i-1].duration);
  }
  for(const start of [2,10,22]){
   for(let bar=0;bar<3;bar++)assert.deepEqual(shape(measure(song,start+bar)),shape(measure(song,start+4+bar)));
   assert.notDeepEqual(shape(measure(song,start+3)),shape(measure(song,start+7)));
   const cadence=measure(song,start+7).at(-1);assert.equal(cadence.pitch,song.tonic);assert(cadence.duration>=1);
  }
  const chorus=song.notes.filter(n=>n.section==='Chorus'),half=chorus.length/2;
  assert.deepEqual(shape(chorus.slice(0,half)),shape(chorus.slice(half)));
  assert.notDeepEqual(shape(song.notes.filter(n=>n.section==='Verse')),shape(chorus.slice(0,half)));
  assert(new Set(song.notes.map(n=>n.chord.join(','))).size>=3);
 }
});
test('phrases use consonant downbeats, singable motion, real rests and playable holds',()=>{
 for(const song of ORIGINAL_SONGS){
  const steps=song.notes.slice(1).map((n,i)=>Math.abs(n.pitch-song.notes[i].pitch));
  assert(Math.max(...steps)<=12,song.id);assert(steps.reduce((a,b)=>a+b,0)/steps.length<4,song.id);
  assert.equal(new Set(song.notes.map(n=>n.shape)).size,4);
  assert(song.notes.some(n=>n.duration===.5));assert(song.notes.some(n=>n.holdBeats>1));assert(song.notes.some(n=>n.restAfter>=.8));
  for(const n of song.notes){
   assert(n.pitch>=48&&n.pitch<=74);assert(Number.isInteger(n.shape)&&Number.isInteger(n.color));
   if(n.songBeat%4===0)assert(n.chord.some(p=>p%12===n.pitch%12),song.id+' downbeat '+n.songBeat);
   assert(n.duration>=.5);assert(n.soundBeats>0&&n.soundBeats<=n.duration);
   assert(n.holdBeats>=0&&n.holdBeats<=n.soundBeats&&n.holdBeats<=n.duration-.2);
   assert(Math.abs(n.restAfter+n.soundBeats-n.duration)<1e-9);assert(n.accent>0&&n.accent<=1);
  }
 }
});
test('introductions leave space and the ending sustains the home note',()=>{
 for(const song of ORIGINAL_SONGS){
  const intro=song.notes.filter(n=>n.section==='Intro'),chorus=song.notes.filter(n=>n.section==='Chorus');
  assert.equal(intro.length,4);assert(intro.every(n=>n.duration===2));
  assert(chorus.length/16>intro.length/2);assert(chorus[0].energy>intro[0].energy);
  const final=song.notes.at(-1);assert.equal(final.pitch,song.tonic);assert.equal(final.duration,4);assert(final.soundBeats>=3);
  assert.equal(final.songBeat+final.duration,128);
 }
});
test('brightness preserves the learned melody, minor harmony and note lengths',()=>{
 assert(ORIGINAL_SONGS.some(s=>s.notes.some(n=>n.chord[1]-n.chord[0]===3)));
 for(const song of ORIGINAL_SONGS){
  const bright=brightenPianoSong(song);assert.deepEqual(bright,song);assert.notEqual(bright.notes,song.notes);
  bright.notes[0].chord[0]=0;assert.notEqual(bright.notes[0].chord[0],song.notes[0].chord[0]);
 }
});
test('bad written measures fail before corrupting the later chart',()=>{
 assert.throws(()=>readPianoBar(['C','C4/3']),/four beats/);
 assert.throws(()=>readPianoBar(['C','C4/4:5']),/duration/);
 assert.throws(()=>readPianoBar(['C','H4/4']),/written note/);
});
test('shuffle bag covers every song once without boundary repeats or score mutations',()=>{
 let seed=42;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const next=createSongSequence(random),ids=[];
 for(let cycle=0;cycle<3;cycle++){
  const bag=[];
  for(let i=0;i<20;i++){
   const first=next(),song=ORIGINAL_SONGS.find(s=>s.id===first.song);bag.push(first.song);ids.push(first.song);
   assert.equal(first.songBeat,0);let beat=first.duration;
   for(let j=1;j<song.notes.length;j++){const n=next();assert.equal(n.song,song.id);assert.equal(n.songBeat,beat);assert.equal(n.bpm,song.bpm);beat+=n.duration;}
   assert.equal(beat,song.beats);
  }
  assert.equal(new Set(bag).size,20);
 }
 assert(ids.every((id,i)=>i===0||id!==ids[i-1]));
 const before=JSON.stringify(ORIGINAL_SONGS),n=createSongSequence(()=>0)();n.chord[0]=0;n.harmony[0]=0;assert.equal(JSON.stringify(ORIGINAL_SONGS),before);
});
test('all twenty charts are playable with one finger at their written tempo',()=>{
 for(let song=0;song<20;song++){
  const g=createPianoGame({...config,rng:()=>song/20+.001});g.start();assert.equal(g.bpm,ORIGINAL_SONGS[song].bpm);
  for(let i=0;i<120*115&&!g.over&&g.songsCompleted<1;i++)performStep(g);
  assert(!g.over,ORIGINAL_SONGS[song].id);assert.equal(g.lives,g.maxLives);assert(g.songsCompleted>=1);assert(g.hits>70);
 }
});
test('tempo stays stable during a song and changes at the next score',()=>{
 for(const bpm of [76,96,114])for(const seconds of [0,30,90,10000])assert.equal(pianoSongTempo(seconds,bpm),bpm);
 const g=createPianoGame(config);g.start();advance(g,3);let firstChange=null;
 for(let i=0;i<120*170&&!g.over&&g.songsCompleted<2;i++){performStep(g);if(g.bpm!==96&&firstChange===null)firstChange=g.beat;}
 assert(firstChange>=130&&firstChange<130.05);assert(!g.over);assert.equal(g.lives,g.maxLives);assert(g.songsCompleted>=2);
 const tempo=g.bpm,time=g.time;g.pause();advance(g,10);assert.equal(g.time,time);assert.equal(g.bpm,tempo);
});
test('countdown is stationary and unplayed notes never start backing',()=>{
 const events=[],g=createPianoGame({...config,onEvent:e=>events.push(e)});const start=g.beat;g.start();advance(g,2.5);
 assert.equal(g.beat,start);assert.equal(g.notes[0].beat-start,2);assert(!g.pressStrip(g.notes[0].lane));
 advance(g,9);assert(!events.some(e=>['note','accompaniment'].includes(e.type)));assert(g.lives<g.maxLives);
});
test('written charts respond immediately to visible notes without deferred or repeated attacks',()=>{
 const events=[],g=createPianoGame({...config,onEvent:e=>events.push(e)});g.start();advance(g,3);
 const n=g.notes[0];assert(g.beat<n.beat);assert(g.pressStrip(n.lane));assert.equal(g.hits,1);g.release(n.lane);assert.equal(n.status,'done');
 advance(g,.3);assert.equal(events.filter(e=>e.type==='note').length,1);assert.equal(g.lives,g.maxLives);
});
test('continuation retains earned progress and waits for a physical strike',()=>{
 const events=[],g=createPianoGame({...config,onEvent:e=>events.push(e)});g.start();advance(g,3);g.hits=12;g.score=12;
 g.lives=0;g.end();const next=g.notes.find(n=>n.status==='waiting');assert(g.revive());assert.equal(g.hits,12);assert.equal(g.countdown,3);assert(g.notes.includes(next));
 events.length=0;advance(g,3);g.step(.01);assert(!events.some(e=>['note','accompaniment'].includes(e.type)));
});
