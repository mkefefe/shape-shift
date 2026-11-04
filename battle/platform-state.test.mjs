import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattlePlatformState} from './platform-state.mjs';

function harness(){
 const events=[];let playing=true;
 const state=createBattlePlatformState({suspendAudio:()=>events.push('suspend'),pauseGame:()=>{playing=false;events.push('pause');},playMusic:()=>events.push('music'),isPlaying:()=>playing});
 return {state,events,play:()=>{playing=true;}};
}
test('visible portal pause suspends audio and requires the player to resume the fight',()=>{
 const h=harness();h.state.update({paused:true,audioAllowed:false});
 assert.equal(h.state.paused,true);assert.equal(h.state.audioAllowed,false);assert.deepEqual(h.events,['suspend','pause']);
 h.state.update({paused:false,audioAllowed:true});
 assert.equal(h.state.paused,false);assert.equal(h.state.audioAllowed,true);
 assert.deepEqual(h.events,['suspend','pause'],'focus return must not restart music or gameplay behind Pause');
});
test('host audio mute does not pause gameplay and resumes only an ongoing run',()=>{
 const h=harness();h.state.update({audioAllowed:false});
 assert.equal(h.state.paused,false);assert.equal(h.state.audioAllowed,false);assert.deepEqual(h.events,['suspend']);
 h.state.update({audioAllowed:true});assert.deepEqual(h.events,['suspend','music']);
});
test('host audio enabling cannot override an independent host pause',()=>{
 const h=harness();h.state.update({paused:true});h.state.update({audioAllowed:true});
 assert.equal(h.state.paused,true);assert.equal(h.state.audioAllowed,false);assert.ok(!h.events.includes('music'));
});
test('initial paused state is retained through loading and repeated notifications',()=>{
 const h=harness();h.state.update({paused:true,audioAllowed:false});h.play();h.state.update({paused:true});
 assert.equal(h.state.paused,true);assert.equal(h.events.filter(x=>x==='pause').length,2);
 h.state.update({paused:false});assert.equal(h.state.audioAllowed,false);
});
