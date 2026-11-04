import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pianoBackingPlan} from './piano-backing.js';
import {ORIGINAL_SONGS,brightenPianoSong} from './piano-songs.js';
const manifest=JSON.parse(fs.readFileSync(new URL('./release-content.json',import.meta.url),'utf8'));
test('all mode recordings match the packaged release manifest and each mode has its own score',()=>{
 const modes=manifest.recordings.filter(r=>!r.mode.startsWith('menu-'));
 assert.equal(modes.length,5);assert.equal(new Set(modes.map(r=>r.sha256)).size,5);
 for(const recording of manifest.recordings){
  const bytes=fs.readFileSync(new URL('./'+recording.file,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),recording.sha256,recording.mode);
  if(!recording.mode.startsWith('menu-')){
   assert.equal(bytes.subarray(0,4).toString(),'OggS');assert(recording.sourceBpm>=90&&recording.sourceBpm<=150);
   assert.equal(recording.bars,32);assert(recording.title&&recording.key);
  }
 }
});

test('all twenty songs have quiet harmonic backing on the absolute song grid',()=>{
 const figures=new Set();
 for(const song of ORIGINAL_SONGS.map(brightenPianoSong)){
  const plans=song.notes.map(pianoBackingPlan);assert(plans.some(p=>p.length));
  for(let i=0;i<song.notes.length;i++)for(const e of plans[i]){
   const n=song.notes[i];assert(e.beat>=0&&e.beat<n.duration);
   assert.equal(e.songBeat,n.songBeat+e.beat);assert(Number.isInteger(e.songBeat*2),'backing stays on the half-beat grid');
   assert(e.gain>0&&e.gain<=.047);assert(e.pitch>=33&&e.pitch<=60);
   assert(n.chord.some(p=>p%12===e.pitch%12));assert(e.duration>0&&e.songBeat+e.duration<=(n.bar+1)*4);
   assert(['bass','arp'].includes(e.kind));assert.equal(typeof e.id,'string');
  }
  const events=plans.flat();assert.equal(new Set(events.map(e=>e.id)).size,events.length);
  assert(events.some(e=>e.kind==='bass'&&e.songBeat%4===0),'the bass anchors written downbeats');
  const perBar=bar=>events.filter(e=>Math.floor(e.songBeat/4)===bar);
  assert.equal(perBar(0).length,2);assert(perBar(10).length>perBar(0).length);
  figures.add(JSON.stringify(plans.map(es=>es.map(e=>[e.songBeat,e.pitch,e.duration,e.kind]))));
 }
 assert.equal(figures.size,20);
});
