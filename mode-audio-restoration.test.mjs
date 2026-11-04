import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pianoBackingPlan} from './piano-backing.js';
import {ORIGINAL_SONGS,brightenPianoSong} from './piano-songs.js';
const approved={"endless-c-v228.ogg": "7ad86b3b13c5568f2840e7dbf305667cf19b5178fa1c51ea53a420776950d328", "adventure-theme-v229.ogg": "7459d95a64413dfb83e2591a13185345a11f1f4644db7eea6e9fcf4451b88079", "shape-slice-theme-v229.ogg": "767b5cfbbcffb5ca7a3969d4ca6cd73b4b49805dce4e1857f44172b81aba768b", "shape-drop-simple-230.ogg": "bcbc64959d951f3a364751ea88d3208c5b9b131382055adbd073b1ce9836a918"};
test('shipped mode recordings are byte-identical to the final preview230 selections',()=>{
 for(const [name,expected] of Object.entries(approved)){
  const bytes=fs.readFileSync(new URL('./assets/music/'+name,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,name);
  assert.equal(bytes.subarray(0,4).toString(),'OggS');
 }
});
test('all twenty songs have distinct quiet backing that follows the melody and leaves its attack clear',()=>{
 const figures=new Set();
 for(const song of ORIGINAL_SONGS.map(brightenPianoSong)){
  const plans=song.notes.map(pianoBackingPlan);assert(plans.some(p=>p.length));
  for(let i=0;i<song.notes.length;i++)for(const e of plans[i]){
   const n=song.notes[i];assert(e.beat>0,'the lead has the attack to itself');
   assert(e.gain>0&&e.gain<=.035);assert(e.pitch>=36&&e.pitch<=60);
   assert(e.beat<Math.max(.5,n.duration));assert(n.chord.some(p=>p%12===e.pitch%12));
   assert(['bass','pluck'].includes(e.kind),'no watery sweep or simultaneous chord attack');
  }
  figures.add(JSON.stringify(plans.slice(0,8)));
 }
 assert.equal(figures.size,20);
});
