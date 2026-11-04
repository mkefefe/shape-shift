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

test('all twenty songs keep harmonic piano and percussion on the absolute song grid',()=>{
 const figures=new Set();
 for(const song of ORIGINAL_SONGS.map(brightenPianoSong)){
  const plans=song.notes.map(pianoBackingPlan);assert(plans.some(p=>p.length));
  for(let i=0;i<song.notes.length;i++)for(const e of plans[i]){
   const n=song.notes[i];assert(e.beat>=0&&e.beat<n.duration);
   assert.equal(e.songBeat,n.songBeat+e.beat);assert(Number.isInteger(e.songBeat*2),'backing stays on the half-beat grid');
   assert(e.duration>0&&e.songBeat+e.duration<=(n.bar+1)*4);
   if(['bass','arp'].includes(e.kind)){
    assert(e.gain>0&&e.gain<=.074);assert(e.pitch>=33&&e.pitch<=60);
    assert(n.chord.some(p=>p%12===e.pitch%12));
   }else{
    assert(['kick','snare','hat'].includes(e.kind));assert.equal(e.pitch,undefined);
    assert(e.gain>0&&e.gain<=({kick:.60,snare:.32,hat:.12}[e.kind]));
   }
   assert.equal(typeof e.id,'string');
  }
  const events=plans.flat();assert.equal(new Set(events.map(e=>e.id)).size,events.length);
  assert(events.some(e=>e.kind==='bass'&&e.songBeat%4===0),'the bass anchors written downbeats');
  const perBar=bar=>events.filter(e=>Math.floor(e.songBeat/4)===bar);
  assert.equal(perBar(0).filter(e=>['bass','arp'].includes(e.kind)).length,2);assert(perBar(10).length>perBar(0).length);
  figures.add(JSON.stringify(plans.map(es=>es.map(e=>[e.songBeat,e.pitch,e.duration,e.kind]))));
 }
 assert.equal(figures.size,20);
});

test('authored drums add a stronger pulse, lift choruses and leave the final piano to ring',()=>{
 const patterns=new Set(),drums=events=>events.filter(e=>['kick','snare','hat'].includes(e.kind));
 for(const song of ORIGINAL_SONGS){
  const all=song.notes.flatMap(pianoBackingPlan),bar=n=>all.filter(e=>Math.floor(e.songBeat/4)===n);
  const verse=bar(2),chorus=bar(10),bridge=bar(18);
  for(const events of [verse,chorus]){
   for(const beat of [0,2]){
    assert(events.some(e=>e.kind==='kick'&&e.songBeat%4===beat),song.id+' kick pulse');
    assert(events.some(e=>e.kind==='bass'&&e.songBeat%4===beat),song.id+' bass pulse');
   }
   assert(events.some(e=>e.kind==='snare'&&e.songBeat%4===3));
   assert(events.filter(e=>e.kind==='snare').every(e=>[1,3].includes(e.songBeat%4)));
   assert(events.some(e=>e.kind==='hat'&&e.songBeat%1===.5));
  }
  assert(drums(chorus).length>drums(verse).length,song.id+' chorus lift');
  assert(drums(bridge).length<drums(chorus).length);
  assert(drums(bar(0)).length<drums(verse).length);assert.equal(drums(bar(31)).length,0);
  assert(chorus.find(e=>e.kind==='bass').gain>verse.find(e=>e.kind==='bass').gain);
  assert(verse.find(e=>e.kind==='kick').gain>=.45);assert(chorus.find(e=>e.kind==='kick').gain>=.55);
  assert(all.every(e=>Number.isFinite(e.duration)&&Number.isFinite(e.gain)));
  for(let n=0;n<32;n++)assert(bar(n).length<=24,'percussion density stays bounded');
  patterns.add(JSON.stringify([verse,chorus].map(events=>drums(events).map(e=>[e.kind,e.songBeat%4,e.gain]))));
 }
 assert.equal(patterns.size,20,'all twenty songs retain distinct rhythmic backing');
});


test('the recorded Piano rhythm kit is present and matches release hashes',()=>{
 const kit=manifest.piano.rhythmSamples;assert.equal(kit.length,3);
 for(const kind of ['kick','snare','hat']){
  const entry=kit.find(x=>x.file.includes('flow-'+kind+'-'));assert(entry,kind);
  const bytes=fs.readFileSync(new URL('./'+entry.file,import.meta.url));
  assert.equal(bytes.subarray(0,4).toString(),'OggS');assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
 }
});
