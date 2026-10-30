import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattleAudio,cueNotes,duckLevel,duckEnvelope} from './audio.mjs';

class Param{
 constructor(value=1){this.value=value;this.events=[];}
 setValueAtTime(value,time){this.events.push(['set',value,time]);this.value=value;}
 setTargetAtTime(value,time,constant){this.events.push(['target',value,time,constant]);this.value=value;}
 linearRampToValueAtTime(value,time){this.events.push(['linear',value,time]);this.value=value;}
 exponentialRampToValueAtTime(value,time){this.events.push(['exponential',value,time]);this.value=value;}
 cancelScheduledValues(time){this.events.push(['cancel',time]);}
}
class Node{
 constructor(kind){this.kind=kind;this.gain=new Param();this.frequency=new Param();this.Q=new Param();this.connections=[];}
 connect(next){this.connections.push(next);return next;} disconnect(){} start(){this.started=true;}stop(){this.stopped=true;}
}
function harness(){
 let context;class Context{
  constructor(){context=this;this.currentTime=10;this.state='running';this.sampleRate=1000;this.nodes=[];this.destination=new Node('destination');}
  node(kind){const n=new Node(kind);this.nodes.push(n);return n;}
  createGain(){return this.node('gain');}createOscillator(){return this.node('osc');}createBufferSource(){return this.node('noise');}createBiquadFilter(){return this.node('filter');}
  createMediaElementSource(){this.mediaCount=(this.mediaCount||0)+1;return this.node('media');}
  createDynamicsCompressor(){const n=this.node('compressor');for(const k of ['threshold','ratio','knee','attack','release'])n[k]=new Param();return n;}
  createBuffer(channels,length){return {getChannelData:()=>new Float32Array(length)};}
  resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}
 }
 const settings={muted:false,effectsAllowed:true,effectsVolume:.25,musicVolume:.2};
 const music={volume:.2,currentTime:17,plays:0,pauses:0,play(){this.plays++;return Promise.resolve();},pause(){this.pauses++;}};
 const audio=createBattleAudio(music,()=>settings,{AudioContext:Context,hidden:()=>false});
 return {audio,settings,music,get context(){return context;}};
}
test('all effects respect zero, disabled, and muted settings before creating sources',()=>{
 for(const mode of ['zero','disabled','muted']){
  const h=harness();if(mode==='zero')h.settings.effectsVolume=0;if(mode==='disabled')h.settings.effectsAllowed=false;if(mode==='muted')h.settings.muted=true;
  h.audio.cue('hit');h.audio.cue('parry');h.audio.physical('bomb');h.audio.damage();assert.equal(h.context,undefined);
 }
});
test('all sources route through one centered effects volume bus and compressor',()=>{
 const h=harness();h.audio.cue('hit');h.audio.physical('bomb');h.audio.damage();
 const nodes=h.context.nodes,bus=nodes.find(n=>n.channelCountMode==='explicit');
 assert.equal(bus.channelCount,1);assert.equal(bus.gain.value,.25*1.25);
 for(const source of nodes.filter(n=>['osc','noise'].includes(n.kind))){let node=source;while(node.connections[0]&&node!==bus)node=node.connections[0];assert.equal(node,bus);}
 assert.equal(bus.connections[0].kind,'compressor');
 h.settings.effectsVolume=.8;h.audio.cue('warning');assert.equal(bus.gain.value,1);
});
test('successful hits use bright rising chimes and distinct action voices',()=>{
 for(let i=0;i<6;i++){const notes=cueNotes('hit',i,()=>.5);assert.ok(notes[0].frequency>=1046);assert.ok(notes[0].end>notes[0].frequency);assert.ok(notes[0].length<=.15);}
 const kinds=['click','start','warning','parry','block','shield','shift','reward','win','nova'];
 assert.equal(new Set(kinds.map(k=>JSON.stringify(cueNotes(k,0,()=>.5)))).size,kinds.length);
});
test('ducking eases down and recovers without jumping or muting during rapid volleys',()=>{
 let envelope=duckEnvelope(null,0,.18,.82);
 assert.equal(duckLevel(envelope,0),1);assert.ok(duckLevel(envelope,.04)<1);assert.equal(duckLevel(envelope,.08),.82);
 for(const now of [.1,.25,.4,.55,.7]){const previous=duckLevel(envelope,now);envelope=duckEnvelope(envelope,now,.18,.82);assert.equal(duckLevel(envelope,now),previous);assert.ok(envelope.target>=.5);}
 assert.equal(duckLevel(envelope,envelope.end),1);
});
test('repeated impact effects leave the music playing at its existing position',()=>{
 const h=harness();h.audio.playMusic();for(let i=0;i<6;i++){h.context.currentTime+=.35;h.audio.cue('hit',i);}
 assert.equal(h.music.plays,1);assert.equal(h.music.pauses,0);assert.equal(h.music.currentTime,17);assert.equal(h.context.mediaCount,1);
 const duck=h.context.nodes.filter(n=>n.kind==='gain')[2];assert.ok(duck.gain.events.some(e=>e[0]==='linear'));assert.ok(!duck.gain.events.some(e=>e[1]===0));
});
test('background suspension stops short effects so their tails cannot replay on return',()=>{
 const h=harness();h.audio.cue('hit');h.audio.suspend();assert.equal(h.context.state,'suspended');
 assert.ok(h.context.nodes.filter(n=>n.kind==='osc').every(n=>n.stopped));assert.equal(h.music.pauses,1);
});
