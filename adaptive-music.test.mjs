import test from 'node:test';import assert from 'node:assert/strict';
import {endlessMusicTempo,createEndlessMusicState,centeredPianoBuffer} from './adaptive-music.js';
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
