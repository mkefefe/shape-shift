import test from 'node:test';
import assert from 'node:assert/strict';
import {createPraiseDirector} from './praise-feedback.js';
test('praise text waits for its matching voice and shares its cooldown',()=>{
 let time=0;const requests=[],shown=[];
 const run=createPraiseDirector({now:()=>time,speak:(phrase,start)=>requests.push({phrase,start})}).createRun(p=>shown.push(p));
 for(let i=0;i<5;i++)run.success();
 assert.equal(requests[0].phrase,'Impressive!');assert.deepEqual(shown,[]);
 requests[0].start();assert.deepEqual(shown,['Impressive!']);
 for(let i=0;i<5;i++)run.success();
 assert.equal(requests.length,1);assert.equal(shown.length,1);
 time=30000;run.miss();for(let i=0;i<5;i++)run.success({colorChanged:true});
 assert.equal(requests[1].phrase,'Perfect!');requests[1].start();assert.deepEqual(shown,['Impressive!','Perfect!']);
});
test('a delayed praise cannot appear after a miss or new run',()=>{
 const callbacks=[],shown=[];let time=0;
 const run=createPraiseDirector({now:()=>time,speak:(_,start)=>callbacks.push(start)}).createRun(p=>shown.push(p));
 for(let i=0;i<5;i++)run.success();run.miss();callbacks[0]();assert.deepEqual(shown,[]);
 time=30000;for(let i=0;i<5;i++)run.success();run.startRun();callbacks[1]();assert.deepEqual(shown,[]);
});
import fs from 'node:fs';
import vm from 'node:vm';
test('recorded voice announces text only when playback starts',async()=>{
 const source=fs.readFileSync(new URL('./audio.js',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('async function speakPraise('),source.indexOf('  function stopVoice(',source.indexOf('async function speakPraise(')));
 let resolve;const events=[];const scope={praiseClips:{'Excellent!':'excellent'},sfx:true,sfxVolume:70,active:true,context:{state:'running'},window:{ShapeShiftPlatform:{paused:false}},voiceEpoch:0,stopVoice(){},voiceBuffer:()=>new Promise(r=>resolve=r),audioSource:()=>({connect(){},disconnect(){},start(){events.push('audio');}}),effectsBus:{},duckMusic(){}};
 vm.createContext(scope);vm.runInContext(fn,scope);
 const pending=scope.speakPraise('Excellent!',()=>events.push('text'));assert.deepEqual(events,[]);
 resolve({duration:1});await pending;assert.deepEqual(events,['audio','text']);
 scope.sfx=false;await scope.speakPraise('Excellent!',()=>events.push('muted text'));assert.equal(events.at(-1),'muted text');
});
