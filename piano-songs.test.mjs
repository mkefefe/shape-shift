import test from 'node:test';import assert from 'node:assert/strict';
import {ORIGINAL_SONGS,createSongSequence} from './piano-songs.js';
import {createPianoGame} from './piano-flow-engine.js';
const config={stripTap:true,rhythm:true,melodicStrips:true,fullSongs:true,rng:()=>0};
const advance=(g,seconds)=>{for(let i=0;i<seconds*120;i++)g.step(1/120);};
test('original songs have complete forms and identical returning choruses',()=>{assert.equal(ORIGINAL_SONGS.length,10);for(const song of ORIGINAL_SONGS){assert.equal(song.beats,176);assert.equal(song.notes.reduce((s,n)=>s+n.duration,0),176);assert(song.notes.every(n=>n.pitch>=48&&n.pitch<=74));const chorus=song.notes.filter(n=>n.section==='Chorus');const half=chorus.length/2;assert.deepEqual(chorus.slice(0,half).map(n=>[n.pitch,n.duration,n.chord]),chorus.slice(half).map(n=>[n.pitch,n.duration,n.chord]));}});
test('distinct songs rotate with their fixed written metadata',()=>{const next=createSongSequence(()=>0);let last;for(let round=0;round<4;round++){const song=ORIGINAL_SONGS[round%ORIGINAL_SONGS.length];for(let beats=0;beats<song.beats;){const n=next();assert.equal(n.songBeat,beats);beats+=n.duration;assert(beats<=song.beats);assert.equal(n.song,song.id);assert.equal(n.bpm,song.bpm);last=n;}}assert.equal(last.round,3);});
test('missed tiles do not play melody while accompaniment continues',()=>{const events=[],g=createPianoGame({...config,onEvent:e=>events.push(e)});g.start();advance(g,10);assert(events.some(e=>e.type==='accompaniment'));assert(!events.some(e=>e.type==='note'));assert(g.lives<g.maxLives);});
test('full songs are playable one-handed through song boundaries without life loss',()=>{const g=createPianoGame(config);g.start();advance(g,3);for(let i=0;i<120*265&&!g.over;i++){if(!g.notes.some(n=>['holding','queued'].includes(n.status))){const n=g.notes.find(n=>['waiting','partial'].includes(n.status));if(n&&n.beat-g.beat<.15){for(const lane of g.pressed)g.release(lane);g.pressStrip(n.lane);}}g.step(1/120);}assert(!g.over);assert.equal(g.lives,g.maxLives);assert(g.songsCompleted>=2);assert(g.hits>0);});

test('rewarded continuation retains the song chart and score with no backing burst',()=>{const events=[],g=createPianoGame({...config,onEvent:e=>events.push(e)});g.start();advance(g,3);g.beat=8;g.step(.001);g.hits=12;g.score=12;for(const n of g.notes)if(n.beat<8)n.status='missed';g.lives=0;g.end();const next=g.notes.find(n=>n.status==='waiting');assert(g.revive());assert.equal(g.hits,12);assert.equal(g.countdown,3);assert(g.notes.includes(next));advance(g,3);events.length=0;g.step(.01);assert(events.filter(e=>e.type==='accompaniment').length<=1);});

test('song starts above the strips and stays still during countdown',()=>{const g=createPianoGame(config);const start=g.beat;assert(g.notes.every(n=>n.beat-start>=5));g.start();advance(g,2.5);assert.equal(g.beat,start);assert.equal(g.hits,0);assert(!g.pressStrip(g.notes[0].lane));});
test('early taps retain the written rhythm when queued and released',()=>{
 const events=[],g=createPianoGame({...config,onEvent:e=>events.push(e)});g.start();advance(g,3);
 const taps=g.notes.slice(0,2).map((n,i)=>({...n,hold:0,beat:4+i,end:4+i}));
 g.notes=taps;g.beat=2;const [a,b]=taps;events.length=0;
 assert(g.pressStrip(a.lane));g.release(a.lane);assert(g.pressStrip(b.lane));g.release(b.lane);
 assert.equal(a.status,'queued');assert.equal(b.status,'queued');assert.equal(g.hits,0);
 assert.equal(events.filter(e=>e.type==='note').length,0);
 advance(g,2.2);
 assert.equal(a.status,'done');assert.equal(b.status,'done');assert.equal(g.lives,g.maxLives);
 const played=events.filter(e=>e.type==='note');assert.equal(played.length,2);
 played.forEach((e,i)=>assert(Math.abs(e.beat-taps[i].beat)<.025));
});
test('empty strips before the first shape arrives do not cost lives',()=>{const g=createPianoGame(config);g.start();advance(g,3);for(let lane=0;lane<4;lane++)assert(!g.pressStrip(lane));assert.equal(g.lives,g.maxLives);});
test('early holds wait for the melody and retain earned progress on release',()=>{
 const events=[],g=createPianoGame({...config,rng:()=>.31,onEvent:e=>events.push(e)});g.start();advance(g,3);
 const n=g.notes.find(n=>n.hold);for(const earlier of g.notes){if(earlier===n)break;earlier.status='done';}
 g.beat=n.beat-2;events.length=0;assert(g.pressStrip(n.lane));assert.equal(n.status,'queued');
 assert(!events.some(e=>e.type==='note'));g.release(n.lane);assert.equal(n.status,'waiting');
 assert(g.pressStrip(n.lane));advance(g,1.4);assert.equal(n.status,'holding');
 assert(events.some(e=>e.type==='note'&&e.note===n));
 g.release(n.lane);const progress=n.heldBeats;assert(progress>0);assert.equal(n.status,'partial');
 assert.equal(g.lives,g.maxLives);assert(g.pressStrip(n.lane));assert.equal(n.heldBeats,progress);
 g.pause();const beat=g.beat;advance(g,2);assert.equal(g.beat,beat);g.resume();assert.equal(g.pressed.size,0);
});


import {pianoSongTempo} from './piano-flow-engine.js';
test('full-song speed rises early, continuously, and never jumps at song changes',()=>{
 assert.equal(pianoSongTempo(0),88);assert.equal(pianoSongTempo(8),88);
 assert(pianoSongTempo(30)>95);assert(pianoSongTempo(60)>106);assert.equal(pianoSongTempo(10000),144);
 const g=createPianoGame(config);g.start();advance(g,3);let previous=g.bpm,changes=0,round=0;
 for(let i=0;i<120*240&&!g.over;i++){
  if(!g.notes.some(n=>['holding','queued'].includes(n.status))){const n=g.notes.find(n=>['waiting','partial'].includes(n.status));if(n&&n.beat-g.beat<.15){for(const lane of g.pressed)g.release(lane);g.pressStrip(n.lane);}}
  g.step(1/120);assert(g.bpm>=previous);assert(g.bpm-previous<.004);previous=g.bpm;
  if(g.songsCompleted!==round){changes++;round=g.songsCompleted;}
 }
 assert(changes>=2);assert.equal(g.lives,g.maxLives);assert(!g.over);
 const tempo=g.bpm,time=g.time;g.pause();advance(g,10);assert.equal(g.time,time);assert.equal(g.bpm,tempo);
});

test('repeated quick notes require release and another tap on the same strip',()=>{
 const g=createPianoGame(config);g.start();advance(g,3);g.beat=8;
 const first={...g.notes[0],id:900,lane:0,beat:8,end:8,hold:0,rapid:true,status:'waiting'},second={...first,id:901,beat:8.5,end:8.5};g.notes=[first,second];
 assert(g.pressStrip(0));advance(g,.35);assert.equal(first.status,'done');assert.equal(second.status,'waiting');assert(!g.pressStrip(0));g.release(0);assert(g.pressStrip(0));assert.equal(second.status,'done');
});

const shape=notes=>notes.map(n=>[n.pitch,n.duration,n.chord]);
const measure=(song,n)=>song.notes.filter(note=>Math.floor(note.songBeat/4)===n);
test('four-bar themes repeat with resolving answers and distinct choruses',()=>{
 for(const song of ORIGINAL_SONGS){
  for(const start of [4,16,24,32]){
   for(let offset=0;offset<3;offset++)assert.deepEqual(shape(measure(song,start+offset)),shape(measure(song,start+4+offset)));
   assert.notDeepEqual(shape(measure(song,start+3)),shape(measure(song,start+7)));
   const ending=measure(song,start+7).at(-1);assert.equal(ending.pitch,song.tonic);assert(ending.duration>=2);
  }
  assert.notDeepEqual(shape(song.notes.filter(n=>n.songBeat>=16&&n.songBeat<32)),shape(song.notes.filter(n=>n.songBeat>=64&&n.songBeat<80)));
  assert(new Set(song.notes.map(n=>n.chord.join(','))).size>=3);
  for(let i=0;i<44;i++){
   const notes=measure(song,i);assert.equal(notes.reduce((s,n)=>s+n.duration,0),4);
   assert.equal(notes.filter(n=>n.harmony.length).length,1);assert(notes[0].harmony.length);
   assert(notes.every(n=>n.bar===i&&n.phraseBar===i%4));
  }
 }
 assert.equal(new Set(ORIGINAL_SONGS.map(s=>JSON.stringify(shape(s.notes.filter(n=>n.section==='Verse'))))).size,10);
});
test('strong beats follow the current harmony and melodies move in singable steps',()=>{
 for(const song of ORIGINAL_SONGS){
  for(const n of song.notes){
   if(n.songBeat%2===0)assert(n.chord.some(p=>p%12===n.pitch%12),song.id+' at beat '+n.songBeat);
   assert(n.duration>=.5);assert(n.accent>0&&n.accent<=1);assert(n.gate>0&&n.gate<1);
  }
  const steps=song.notes.slice(1).map((n,i)=>Math.abs(n.pitch-song.notes[i].pitch));
  assert(Math.max(...steps)<=9);assert(steps.reduce((a,b)=>a+b,0)/steps.length<3);
  assert(steps.filter(n=>n<=4).length/steps.length>.75);
 }
});
test('arrangements introduce the theme gently and finish on a sustained tonic',()=>{
 for(const song of ORIGINAL_SONGS){
  const intro=song.notes.filter(n=>n.section==='Intro'),chorus=song.notes.filter(n=>n.section==='Chorus');
  assert.equal(intro.length,8);assert(intro.every(n=>n.duration===2));
  assert(chorus.length/16>intro.length/4);assert(chorus[0].energy>intro[0].energy);
  const final=song.notes.at(-1);assert.equal(final.pitch,song.tonic);assert.equal(final.duration,4);
  assert.equal(final.songBeat+final.duration,176);
 }
});
test('randomness chooses only the first song and callers cannot mutate the score',()=>{
 let calls=0;const next=createSongSequence(()=>{calls++;return .35;});
 for(let i=0;i<ORIGINAL_SONGS[3].notes.length+2;i++)next();assert.equal(calls,1);
 const before=JSON.stringify(ORIGINAL_SONGS),note=createSongSequence(()=>0)();
 note.chord[0]=0;note.harmony[0]=0;assert.equal(JSON.stringify(ORIGINAL_SONGS),before);
});
test('a full ten-song rotation retains written notes regardless of score',()=>{
 const next=createSongSequence(()=>0,{score:()=>999}),again=createSongSequence(()=>0,{score:()=>0});
 for(let round=0;round<11;round++)for(const expected of ORIGINAL_SONGS[round%10].notes){const actual=next();assert.deepEqual(actual,again());assert.equal(actual.pitch,expected.pitch);assert.equal(actual.duration,expected.duration);assert.equal(actual.round,round);}
});
test('all ten arrangements remain playable with individual taps and held notes',()=>{
 for(let song=0;song<10;song++){
  const g=createPianoGame({...config,rng:()=>song/10+.001});g.start();
  for(let i=0;i<120*150&&!g.over;i++){
   if(!g.notes.some(n=>n.status==='holding')){const n=g.notes.find(n=>['waiting','partial'].includes(n.status));if(n&&n.beat-g.beat<-.05){for(const lane of g.pressed)g.release(lane);assert(g.pressStrip(n.lane));}}
   g.step(1/120);
  }
  assert(!g.over);assert.equal(g.lives,g.maxLives);assert(g.songsCompleted>=1);
 }
});
