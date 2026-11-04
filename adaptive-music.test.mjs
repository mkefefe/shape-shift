import test from 'node:test';import assert from 'node:assert/strict';
import {endlessMusicTempo,createEndlessMusicState,centeredPianoBuffer,createAdaptiveMusic} from './adaptive-music.js';
test('stereo piano is centered without cancelling opposite-phase channels',()=>{
 const channels=[new Float32Array([.1,-.2,.1]),new Float32Array([-.2,.4,-.2])];
 const source={numberOfChannels:2,length:3,sampleRate:44100,getChannelData:c=>channels[c]};
 const context={createBuffer:(numberOfChannels,length,sampleRate)=>{const data=new Float32Array(length);return {numberOfChannels,length,sampleRate,getChannelData:()=>data};}};
 const mono=centeredPianoBuffer(context,source);assert.equal(mono.numberOfChannels,1);
 assert.deepEqual([...mono.getChannelData(0)],[-.5,1,-.5]);
 assert.deepEqual([...source.getChannelData(1)], [...channels[1]],'original samples are retained');
});
test('tempo grows with difficulty, caps at 170 and rewind preserves run pressure',()=>{
 const music=createEndlessMusicState();assert.equal(music.update().targetBpm,120);
 const fast=music.update({intensity:.8,stage:50});assert.equal(fast.targetBpm,160);
 const rewind=music.update({intensity:.8,stage:0,rewind:true});assert.equal(rewind.baseBpm,160);assert.equal(rewind.targetBpm,142);
 assert.equal(music.update({intensity:0,stage:0}).targetBpm,142,'reset board does not reset accumulated difficulty');
 assert(music.update({intensity:.8,stage:17}).targetBpm<160);
 assert.equal(music.update({intensity:.8,stage:19}).targetBpm,160);
 assert.equal(music.update({intensity:10,stage:21}).targetBpm,170);
 assert.equal(endlessMusicTempo(-1),120);
});


function nativeHarness(){
 const state={media:null,mediaSources:0,nodes:[]};
 class Media extends EventTarget{
  constructor(url){super();state.media=this;this.src=String(url);this.readyState=4;this.currentTime=11;this.plays=0;this.playRates=[];this.pauses=0;this.loads=0;this.defaultPlaybackRate=1;}
  play(){this.plays++;this.playRates.push(this.playbackRate);return this.pending||Promise.resolve();}pause(){this.pauses++;}load(){this.loads++;this.playbackRate=this.defaultPlaybackRate;if(this.readyState<4)queueMicrotask(()=>{if(!this.loadError)this.readyState=4;this.dispatchEvent(new Event(this.loadError?'error':'canplaythrough'));});}
  removeAttribute(name){if(name==='src')this.src='';}
 }
 const node=()=>{const n={connections:[],gain:{value:0,setTargetAtTime(value){this.value=value;}},connect(next){this.connections.push(next);return next;},disconnect(){this.disconnected=true;}};state.nodes.push(n);return n;};
 const context={currentTime:0,state:'running',createGain:node,createMediaElementSource(media){assert.equal(media,state.media);state.mediaSources++;return node();}};
 return {state,Media,context,destination:node()};
}
test('native Endless retains pitch, stereo routing, calibrated gain and one source across tempo changes',async()=>{
 const previous=globalThis.Audio,h=nativeHarness();globalThis.Audio=h.Media;let player;
 try{
  const trim=10**((-20-(-15.72))/20);player=await createAdaptiveMusic(h.context,h.destination,{recordingGain:trim});
  assert(await player.prepare());assert.equal(h.state.media.plays,0);assert(h.state.media.src.endsWith('/assets/music/endless-239.ogg'));
  assert.equal(h.state.media.preservesPitch,true);assert.equal(h.state.media.playbackRate,120/140);
  await player.start();await player.start();assert.equal(h.state.media.plays,1);assert.equal(h.state.mediaSources,1);
  player.setTempo(170,true);assert.equal(h.state.media.playbackRate,170/140);player.setTempo(102,true);assert.equal(h.state.media.playbackRate,102/140);
  const gain=h.state.nodes.find(n=>n.connections.includes(h.destination));assert.equal(gain.gain.value,trim);player.setVolume(.4);assert.equal(gain.gain.value,trim*.4);
  assert.equal(gain.channelCount,undefined,'native recording must not be forced into mono');player.stop();assert.equal(player.playing,false);assert.equal(h.state.media.currentTime,11);
 }finally{player?.dispose();globalThis.Audio=previous;}
});
test('native preparation errors are retryable and a pending play cannot revive paused music',async()=>{
 const previous=globalThis.Audio,h=nativeHarness();globalThis.Audio=h.Media;let player;
 try{
  player=await createAdaptiveMusic(h.context,h.destination);h.state.media.readyState=0;h.state.media.loadError=true;
  assert.equal(await player.prepare(),false);h.state.media.loadError=false;assert.equal(await player.prepare(),true);assert.equal(h.state.media.plays,0);
  let resolve;h.state.media.pending=new Promise(done=>resolve=done);const pending=player.start();player.stop();resolve();await pending;
  assert.equal(player.playing,false);assert(h.state.media.pauses>=2);
 }finally{h.state.media.readyState=4;player?.dispose();globalThis.Audio=previous;}
});
test('native loading cannot reset the first audible Endless tempo before its gradual pressure ramp',async t=>{
 const previous=globalThis.Audio,h=nativeHarness();globalThis.Audio=h.Media;let player,tick;
 t.mock.method(globalThis,'setInterval',callback=>{tick=callback;return 1;});t.mock.method(globalThis,'clearInterval',()=>{});
 try{
  player=await createAdaptiveMusic(h.context,h.destination);h.state.media.readyState=0;
  assert(await player.prepare());assert.equal(h.state.media.playbackRate,1,'media load follows the browser default-rate reset');
  await player.start();assert.equal(h.state.media.playRates[0],120/140,'the first play already has the intended tempo');
  player.setTempo(170);tick();assert.equal(h.state.media.playbackRate,120.35/140);assert(h.state.media.playbackRate>h.state.media.playRates[0]);
  const ramped=h.state.media.playbackRate;player.stop();h.state.media.playbackRate=1;await player.start();
  assert.equal(h.state.media.playRates[1],ramped,'resuming restores the retained tempo before playback too');
 }finally{player?.dispose();globalThis.Audio=previous;}
});
