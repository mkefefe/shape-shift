import test from 'node:test';
import assert from 'node:assert/strict';
import {ORIGINAL_SONGS} from './piano-songs.js';
import {pianoBackingPlan} from './piano-backing.js';

const notesAt=(song,start,bars)=>song.notes.filter(n=>n.songBeat>=start&&n.songBeat<start+bars*4);
const written=(song,start,bars)=>notesAt(song,start,bars).map(n=>({
 beat:n.songBeat-start,pitch:n.pitch,chord:n.chord,duration:n.duration,
 soundBeats:n.soundBeats,holdBeats:n.holdBeats,restAfter:n.restAfter,accent:n.accent
}));
const backing=(song,start,bars)=>notesAt(song,start,bars).flatMap(pianoBackingPlan).map(e=>({
 beat:e.songBeat-start,kind:e.kind,pitch:e.pitch,duration:e.duration,gain:e.gain
}));

test('every verse and chorus states its actual melody and chord loop three times before answering',()=>{
 for(const song of ORIGINAL_SONGS)for(const section of song.sections.filter(s=>['Verse','Chorus'].includes(s.name))){
  const first=written(song,section.beat,2);
  assert(first.length>=4,song.id+' has a complete playable hook');
  assert.deepEqual(written(song,section.beat+8,2),first,song.id+' second statement');
  assert.deepEqual(written(song,section.beat+16,2),first,song.id+' third statement');
  assert.notDeepEqual(written(song,section.beat+24,2),first,song.id+' answer follows, rather than interrupting the hook');
  const ending=notesAt(song,section.beat+28,1).at(-1);
  assert.equal(ending.pitch,song.tonic,song.id+' resolves its answer home');
 }
});

test('repeated hooks repeat their actual bass, arpeggio voicing and beat pattern too',()=>{
 for(const song of ORIGINAL_SONGS)for(const section of song.sections.filter(s=>['Verse','Chorus'].includes(s.name))){
  const first=backing(song,section.beat,2);
  for(const kind of ['bass','arp','kick','snare','hat'])assert(first.some(e=>e.kind===kind),song.id+' '+kind);
  assert.deepEqual(backing(song,section.beat+8,2),first,song.id+' second accompaniment');
  assert.deepEqual(backing(song,section.beat+16,2),first,song.id+' third accompaniment');
  const attacks=notesAt(song,section.beat,6).flatMap(pianoBackingPlan);
  assert.equal(new Set(attacks.map(e=>e.id)).size,attacks.length,'repetitions keep unique playback ownership');
 }
});

test('the opening and contrasting bridge repeat twice while the full song still returns and closes',()=>{
 for(const song of ORIGINAL_SONGS){
  assert.deepEqual(written(song,0,1),written(song,4,1),song.id+' opening');
  const bridge=song.sections.find(s=>s.name==='Bridge');
  assert.deepEqual(written(song,bridge.beat,2),written(song,bridge.beat+8,2),song.id+' bridge');
  const choruses=song.sections.filter(s=>s.name==='Chorus');
  assert.deepEqual(written(song,choruses[0].beat,8),written(song,choruses[1].beat,8),song.id+' returning hook');
  assert.equal(song.beats,128);assert.equal(song.notes.at(-1).pitch,song.tonic);
 }
});
