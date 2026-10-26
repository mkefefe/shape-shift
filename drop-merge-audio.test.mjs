import test from 'node:test';
import assert from 'node:assert/strict';
import {createDropMergeAudio} from './drop-merge-audio.js';
import {DROP_MERGE_BURST_AT} from './drop-merge-fx.js';

test('joining and particle release have distinct cues on the visual clock',()=>{
 const sounds=[],feedback=createDropMergeAudio(name=>sounds.push(name));
 feedback.merge(4);assert.deepEqual(sounds,['drop-merge-start']);
 feedback.step(4+DROP_MERGE_BURST_AT-.001);assert.equal(sounds.length,1);
 feedback.step(4+DROP_MERGE_BURST_AT);assert.deepEqual(sounds,['drop-merge-start','drop-merge-burst']);
 feedback.step(5);assert.equal(sounds.length,2);
});
test('a frozen pause clock keeps the burst pending until play resumes',()=>{
 const sounds=[],feedback=createDropMergeAudio(name=>sounds.push(name));feedback.merge(10);
 for(let i=0;i<100;i++)feedback.step(10.3);
 assert.deepEqual(sounds,['drop-merge-start']);feedback.step(10+DROP_MERGE_BURST_AT);
 assert.deepEqual(sounds,['drop-merge-start','drop-merge-burst']);
});
test('closing or restarting clears old merge sounds',()=>{
 const sounds=[],feedback=createDropMergeAudio(name=>sounds.push(name));feedback.merge(20);feedback.reset();feedback.step(21);
 assert.deepEqual(sounds,['drop-merge-start']);assert.equal(feedback.merge(0),true);feedback.step(DROP_MERGE_BURST_AT);
 assert.deepEqual(sounds,['drop-merge-start','drop-merge-start','drop-merge-burst']);
});
test('simultaneous merge groups share cues without losing later merges',()=>{
 const sounds=[],feedback=createDropMergeAudio(name=>sounds.push(name));
 assert.equal(feedback.merge(1),true);assert.equal(feedback.merge(1),false);assert.equal(feedback.merge(1.04),false);
 feedback.step(1+DROP_MERGE_BURST_AT);assert.equal(feedback.merge(2),true);feedback.step(2+DROP_MERGE_BURST_AT);
 assert.deepEqual(sounds,['drop-merge-start','drop-merge-burst','drop-merge-start','drop-merge-burst']);
});
test('invalid clocks and stale bursts cannot produce delayed sound spam',()=>{
 const sounds=[],feedback=createDropMergeAudio(name=>sounds.push(name));
 for(const value of [NaN,Infinity,-1])assert.equal(feedback.merge(value),false);
 feedback.merge(1);feedback.step(NaN);feedback.step(5);assert.deepEqual(sounds,['drop-merge-start']);
 feedback.merge(6);feedback.step(0);feedback.step(7);assert.deepEqual(sounds,['drop-merge-start','drop-merge-start']);
});
