import test from 'node:test';
import assert from 'node:assert/strict';
import {RESTORATION_CUES,RESTORATION_COLOR_SECONDS} from './restoration-film.js';
import {createRestorationEffects} from './restoration-audio.js';
function fixture(volume=1){
 const media=[];let unregistered=0;
 const player=createRestorationEffects({cues:RESTORATION_CUES,volume,registerMedia:()=>()=>unregistered++,createAudio:src=>{const a={src,plays:0,pauses:0,paused:true,ended:false,play(){this.plays++;this.paused=false;return Promise.resolve();},pause(){this.pauses++;this.paused=true;},load(){},removeAttribute(){this.src='';}};media.push(a);return a;}});
 return {player,media,get unregistered(){return unregistered;}};
}
test('original merge and travel lead into a cue for each staggered launch and landing',()=>{
 assert.deepEqual(RESTORATION_CUES.filter(c=>['merge','travel','charge'].includes(c.id)).map(c=>c.id),['merge','travel','charge']);assert.equal(RESTORATION_CUES.filter(c=>c.id.startsWith('beam-')).length,4);assert.equal(RESTORATION_CUES.filter(c=>c.id.startsWith('bloom-')).length,4);
 for(let i=1;i<RESTORATION_CUES.length;i++)assert(RESTORATION_CUES[i].at>RESTORATION_CUES[i-1].at);
 assert(RESTORATION_CUES.at(-1).at<RESTORATION_COLOR_SECONDS);
});
test('effects sound once at their visual event time, with independent SFX gain',()=>{
 const f=fixture(.4);f.player.step(RESTORATION_CUES[0].at-.01);assert(f.media.every(a=>a.plays===0));
 for(const c of RESTORATION_CUES){f.player.step(c.at);f.player.step(c.at);}
 assert(f.media.every(a=>a.plays===1));for(let i=0;i<f.media.length;i++)assert.equal(f.media[i].volume,.4*RESTORATION_CUES[i].gain);
 f.media.forEach(a=>{a.paused=true;a.ended=true;});f.player.step(25);assert(f.media.every(a=>a.plays===1));
});
test('background pause freezes cue delivery and resumes only unfinished effects',async()=>{
 const f=fixture();f.player.step(RESTORATION_CUES[0].at);await Promise.resolve();f.player.step(RESTORATION_CUES[0].at,{paused:true});assert(f.media[0].paused);f.player.step(RESTORATION_CUES[0].at);assert.equal(f.media[0].plays,2);assert(f.media.slice(1).every(a=>a.plays===0));
 f.media[0].ended=true;f.media[0].paused=true;f.player.step(RESTORATION_CUES[0].at+.1,{paused:true});f.player.step(RESTORATION_CUES[0].at+.1);assert.equal(f.media[0].plays,2);
});
test('muted effects allocate no audio and platform mute does not burst stale cues on return',()=>{
 const muted=fixture(0);muted.player.step(30);assert.equal(muted.media.length,0);
 const f=fixture();f.player.step(RESTORATION_CUES.at(-2).at,{enabled:false});f.player.step(RESTORATION_CUES.at(-2).at);assert(f.media.every(a=>a.plays===0));f.player.step(RESTORATION_CUES.at(-1).at);assert.equal(f.media.filter(a=>a.plays===1).length,1);
});
test('cleanup releases all media once and stops a pending play promise',async()=>{
 const f=fixture();f.player.step(RESTORATION_CUES[0].at);f.player.stop();f.player.stop();await Promise.resolve();assert.equal(f.unregistered,RESTORATION_CUES.length);assert(f.media.every(a=>a.paused&&!a.src));f.player.step(30);assert.equal(f.media.reduce((n,a)=>n+a.plays,0),1);
});
