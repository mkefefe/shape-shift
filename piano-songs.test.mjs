import test from 'node:test';import assert from 'node:assert/strict';
import {ORIGINAL_SONGS,createSongSequence} from './piano-songs.js';
import {createPianoGame} from './piano-flow-engine.js';
const config={stripTap:true,rhythm:true,melodicStrips:true,fullSongs:true,rng:()=>0};
const advance=(g,seconds)=>{for(let i=0;i<seconds*120;i++)g.step(1/120);};
test('original songs have complete forms and identical returning choruses',()=>{assert.equal(ORIGINAL_SONGS.length,10);for(const song of ORIGINAL_SONGS){assert.equal(song.beats,176);assert.equal(song.notes.reduce((s,n)=>s+n.duration,0),176);assert(song.notes.every(n=>n.pitch>=48&&n.pitch<=74));const chorus=song.notes.filter(n=>n.section==='Chorus');const half=chorus.length/2;assert.deepEqual(chorus.slice(0,half).map(n=>[n.pitch,n.duration,n.chord]),chorus.slice(half).map(n=>[n.pitch,n.duration,n.chord]));}});
test('distinct browser songs rotate with bounded tempo progression',()=>{const next=createSongSequence(()=>0);let last;for(let round=0;round<4;round++){const song=ORIGINAL_SONGS[round%ORIGINAL_SONGS.length];for(let beats=0;beats<song.beats;){const n=next();assert.equal(n.songBeat,beats);beats+=n.duration;assert(beats<=song.beats);assert.equal(n.song,song.id);assert.equal(n.bpm,Math.min(132,song.bpm+Math.floor(round/2)*8));last=n;}}assert.equal(last.round,3);});
test('missed tiles do not play melody while accompaniment continues',()=>{const events=[],g=createPianoGame({...config,onEvent:e=>events.push(e)});g.start();advance(g,10);assert(events.some(e=>e.type==='accompaniment'));assert(!events.some(e=>e.type==='note'));assert(g.lives<g.maxLives);});
test('full songs are playable one-handed through song boundaries without life loss',()=>{const g=createPianoGame(config);g.start();advance(g,3);for(let i=0;i<120*265&&!g.over;i++){if(!g.notes.some(n=>['holding','queued'].includes(n.status))){const n=g.notes.find(n=>['waiting','partial'].includes(n.status));if(n&&n.beat-g.beat<.15){for(const lane of g.pressed)g.release(lane);g.pressStrip(n.lane);}}g.step(1/120);}assert(!g.over);assert.equal(g.lives,g.maxLives);assert(g.songsCompleted>=2);assert(g.hits>0);});

test('rewarded continuation retains the song chart and score with no backing burst',()=>{const events=[],g=createPianoGame({...config,onEvent:e=>events.push(e)});g.start();advance(g,3);g.beat=8;g.step(.001);g.hits=12;g.score=12;for(const n of g.notes)if(n.beat<8)n.status='missed';g.lives=0;g.end();const next=g.notes.find(n=>n.status==='waiting');assert(g.revive());assert.equal(g.hits,12);assert.equal(g.countdown,3);assert(g.notes.includes(next));advance(g,3);events.length=0;g.step(.01);assert(events.filter(e=>e.type==='accompaniment').length<=1);});

test('song starts above the strips and stays still during countdown',()=>{const g=createPianoGame(config);const start=g.beat;assert(g.notes.every(n=>n.beat-start>=5));g.start();advance(g,2.5);assert.equal(g.beat,start);assert.equal(g.hits,0);assert(!g.pressStrip(g.notes[0].lane));});
test('several early taps can play immediately in song order without locking out the next strip',()=>{const g=createPianoGame(config);g.start();advance(g,3);const taps=g.notes.slice(0,2).map((n,i)=>({...n,hold:0,beat:4+i,end:4+i}));g.notes=taps;assert(taps.length>=2);g.beat=2;const [a,b]=taps;assert(g.pressStrip(a.lane));g.release(a.lane);assert(g.pressStrip(b.lane));g.release(b.lane);assert.equal(a.status,'done');assert.equal(b.status,'done');advance(g,2.2);assert.equal(a.status,'done');assert.equal(b.status,'done');assert.equal(g.lives,g.maxLives);});
test('empty strips before the first shape arrives do not cost lives',()=>{const g=createPianoGame(config);g.start();advance(g,3);for(let lane=0;lane<4;lane++)assert(!g.pressStrip(lane));assert.equal(g.lives,g.maxLives);});
test('early holds sound immediately and preserve progress on release',()=>{const events=[],g=createPianoGame({...config,rng:()=>.31,onEvent:e=>events.push(e)});g.start();advance(g,3);const n=g.notes.find(n=>n.hold);for(const earlier of g.notes){if(earlier===n)break;earlier.status='done';}g.beat=n.beat-2;assert(g.pressStrip(n.lane));assert.equal(n.status,'holding');assert(events.some(e=>e.type==='note'&&e.note===n));advance(g,.1);g.release(n.lane);const progress=n.heldBeats;assert(progress>0);assert.equal(n.status,'partial');assert.equal(g.lives,g.maxLives);assert(g.pressStrip(n.lane));assert.equal(n.heldBeats,progress);g.pause();const beat=g.beat;advance(g,2);assert.equal(g.beat,beat);g.resume();assert.equal(g.pressed.size,0);});


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

test('every tune repeats four exact opening motifs, raises the phrase, and returns to it',()=>{
 const shape=notes=>notes.map(n=>[n.pitch,n.duration,n.chord]);
 const bar=(song,n)=>song.notes.filter(note=>Math.floor(note.songBeat/4)===n);
 for(const song of ORIGINAL_SONGS){
  for(let i=1;i<4;i++)assert.deepEqual(shape(bar(song,i)),shape(bar(song,0)));
  for(let i=5;i<8;i++)assert.deepEqual(shape(bar(song,i)),shape(bar(song,4)));
  assert(bar(song,4).every((n,i)=>n.pitch>bar(song,0)[i].pitch));
  assert.deepEqual(bar(song,4).map(n=>n.duration),bar(song,0).map(n=>n.duration));
  for(const i of [8,9,10,11,28,29,30,31,40,43])assert.deepEqual(shape(bar(song,i)),shape(bar(song,0)));
  for(let i=13;i<16;i++)assert.deepEqual(shape(bar(song,i)),shape(bar(song,12)));
  for(let i=0;i<44;i++){const notes=bar(song,i);assert.equal(notes.reduce((s,n)=>s+n.duration,0),4);assert.equal(notes.filter(n=>n.harmony.length).length,1);}
 }
 assert.equal(new Set(ORIGINAL_SONGS.map(s=>JSON.stringify(shape(bar(s,0))))).size,10);
});
test('browser arrangements retain repeating motifs, higher answers and returns across ten songs',()=>{
 const next=createSongSequence(()=>0),again=createSongSequence(()=>0);
 for(let round=0;round<11;round++){
  const bars=Array.from({length:44},()=>[]);let beats=0;
  while(beats<176){const n=next();assert.deepEqual(n,again());assert.equal(n.round,round);assert.equal(n.songBeat,beats);bars[Math.floor(beats/4)].push(n);beats+=n.duration;}
  const shape=bar=>bar.map(n=>[n.pitch,n.duration]);
  for(const start of [0,4,8,12,16,20,24,28,32,36,40])for(let i=1;i<4;i++)assert.deepEqual(shape(bars[start]),shape(bars[start+i]));
  assert.deepEqual(shape(bars[0]),shape(bars[8]));assert(bars[4][0].pitch>bars[0][0].pitch);
 }
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
