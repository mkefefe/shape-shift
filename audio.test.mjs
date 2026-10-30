import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const source = fs.readFileSync(new URL('./audio.js', import.meta.url), 'utf8');

test('victory uses cached samples, ducks music and cancels all stages',async()=>{
 const {audio,state}=harness();audio.setMusic(false);await audio.start();assert(await audio.prepareVictory());
 const fetched=state.fetches.length;await audio.prepareVictory();assert.equal(state.fetches.length,fetched);
 const starts=state.starts;audio.play('victory-transform');audio.play('victory-gather');audio.play('victory-burst');audio.play('victory');audio.play('victory-spark');audio.play('victory-panel');
 assert.equal(state.starts-starts,6);assert(state.gains[3].gain.ramps.at(-1)[1]<2.7);assert.equal(state.notes.length,0,'completion cues use samples rather than a generated tune');
 const stops=state.stops.length;audio.stopVictory();assert.equal(state.stops.length-stops,6);
 audio.setSfx(false);const muted=state.starts;audio.play('victory');assert.equal(state.starts,muted);
});
test('failed victory preload can be retried',async()=>{
 let fail=true;const {audio}=harness(true,{fetch:async()=>({ok:!fail,arrayBuffer:async()=>new ArrayBuffer(8)})});
 assert.equal(await audio.prepareVictory(),false);fail=false;assert.equal(await audio.prepareVictory(),true);
});
test('rock cracks and destruction have distinct centered cues and respect mute',async()=>{
 const {audio,state}=harness();audio.setMusic(false);await audio.start();
 const signatures=[];
 for(const cue of ['rock-crack','rock-break']){
  state.notes=[];const before=state.starts;audio.play(cue);
  assert(state.starts>before);signatures.push(state.notes.map(n=>n[0]));
  assert.equal(state.gains[2].channelCount,1);
  assert.equal(state.gains[3].gain.ramps.at(-2)[0],.5);
 }
 assert.equal(signatures[0].length,2);assert.equal(signatures[1].length,6);
 audio.setSfx(false);const before=state.starts;
 audio.play('rock-crack');audio.play('rock-break');assert.equal(state.starts,before);
});
function harness(supported = true, options = {}) {
  const state = { stops: [], filters: [], notes: [], contexts: 0, starts: 0, resumes: 0, suspends: 0, timers: new Map(), gains: [], voiceStarts: [], voiceStops: [], musicStarts: [], musicStops: [], fetches: [], document: {hidden: false} };
  let timerId = 0;
  const parameter = () => ({value: 0, targets: [], ramps: [], values: [], cancelScheduledValues(){}, setValueAtTime(value,time){this.values.push([value,time]);}, linearRampToValueAtTime(value,time){this.ramps.push([value,time]);}, exponentialRampToValueAtTime(){}, setTargetAtTime(value){this.targets.push(value);}});
  const node = () => ({connect(){}, disconnect(){}, gain: parameter(), frequency: parameter(), playbackRate: parameter(), Q: parameter(), threshold: parameter(), ratio: parameter(), knee: parameter(), attack: parameter(), release: parameter(), start(){state.starts++;}, stop(time){state.stops.push(time);}});
  class AudioContext {
    constructor() { state.contexts++; state.context = this; this.currentTime = 0; this.sampleRate = 44100; this.state = 'suspended'; this.destination = {}; }
    createDynamicsCompressor() { return node(); }
    createGain() { const result = node(); state.gains.push(result); return result; }
    createOscillator() { const osc=node();osc.frequency.setValueAtTime=(frequency,time)=>state.notes.push([frequency,time]);return osc; }
    createBiquadFilter() { const filter=node();state.filters.push(filter);return filter; }
    createBufferSource() { const result=node(),start=result.start,stop=result.stop;result.start=(...args)=>{start();result.startArgs=args;if(result.buffer?.voice)state.voiceStarts.push(result);if(result.buffer?.music)state.musicStarts.push(result);};result.stop=time=>{stop(time);if(result.buffer?.voice)state.voiceStops.push(result);if(result.buffer?.music)state.musicStops.push(result);};return result; }
    async decodeAudioData(data) { if(options.decodeFailure)throw Error('Decode failed');return data.url?.includes('/music/')?{music:true,url:data.url,duration:96}:{voice:true,data,duration:1.2}; }
    createBuffer(channels, length) { return {getChannelData: () => new Float32Array(length)}; }
    async resume() { this.state = 'running'; state.resumes++; }
    async suspend() { this.state = 'suspended'; state.suspends++; }
  }
  const window = {
    ...(supported ? {AudioContext} : {}),
    setInterval(callback) { state.timers.set(++timerId, callback); return timerId; },
    clearInterval(id) { state.timers.delete(id); }
  };
  const fetch=async url=>{state.fetches.push(url);const response=options.fetch?await options.fetch(url):{ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};return {...response,arrayBuffer:async()=>{const data=await response.arrayBuffer();data.url=url;return data;}};};
  vm.runInNewContext(source, {window,fetch,document:state.document});
  return { audio: window.gameAudio, state };
}

test('audio is gesture gated and repeated starts keep one scheduler', async () => {
  const {audio, state} = harness();
  assert.equal(state.contexts, 0);
  audio.play('correct'); assert.equal(state.starts, 0);
  await audio.start(); await audio.start(); await audio.start();
  assert.equal(state.contexts, 1); assert.equal(state.resumes, 1);
  assert.equal(state.timers.size, 1); await flushAudio();assert.ok(state.starts > 0);
});

test('every supported cue sounds and SFX mute prevents new sources', async () => {
  const {audio, state} = harness(); await audio.start();
  for (const cue of ['result-score-tick','result-coin-tick','result-tally-done','heart-fill','shield-arrive','skill-points','surface-tap','leave-result','special-starburst','special-impact','special-reset','rewind-settle','special-heart','special-crystal','special-hourglass','coin-arrive','quest-wallet','achievement-complete','menu-quests','menu-achievements','quest-complete','quest-collect','purchase', 'bonus', 'shield', 'correct', 'match', 'wrong', 'error', 'skip', 'level', 'levelup', 'over', 'gameover', 'start', 'click', 'avatar', 'randomize', 'menu-shop', 'menu-ranks', 'menu-settings', 'menu-profile', 'menu-reward', 'close', 'save', 'info', 'toggle']) {
    const before = state.starts; audio.play(cue); assert.ok(state.starts > before, cue);
  }
  audio.setSfx(false); const before = state.starts; audio.play('correct'); assert.equal(state.starts, before);
  assert.equal(state.gains[2].gain.targets.at(-1), 0);
  audio.setSfx(true); audio.play('correct'); assert.ok(state.starts > before);
});

test('Starburst point rewards have a bright varied cue and respect SFX mute',async()=>{
 const {audio,state}=harness();await audio.start();const pitches=[];
 for(let i=0;i<16;i++){const before=state.notes.length;audio.play('special-point');const notes=state.notes.slice(before);assert.equal(notes.length,2);assert(notes[0][0]>=1175);pitches.push(notes[0][0]);}
 assert(new Set(pitches).size>1);audio.setSfx(false);const before=state.starts;audio.play('special-point');assert.equal(state.starts,before);
});

test('music mute ramps its bus and suppresses scheduled music', async () => {
  const {audio, state} = harness(); await audio.start();
  audio.setMusic(false); assert.equal(state.gains[1].gain.targets.at(-1), 0);
  const before = state.starts; state.context.currentTime += 1;
  for (const callback of state.timers.values()) callback();
  assert.equal(state.starts, before);
  audio.setMusic(true); assert.equal(state.gains[1].gain.targets.at(-1), 0.14);
  for(let i=0;i<16;i++){state.context.currentTime += .16;for (const callback of state.timers.values()) callback();}
  await flushAudio();assert.ok(state.starts > before);
});

test('pause is idempotent and resume restores one scheduler', async () => {
  const {audio, state} = harness(); await audio.start();
  audio.pause(); audio.pause(); assert.equal(state.suspends, 1); assert.equal(state.timers.size, 0);
  const before = state.starts; audio.play('wrong'); assert.equal(state.starts, before);
  await audio.resume(); assert.equal(state.resumes, 2); assert.equal(state.timers.size, 1);
});

test('disabled preferences before start and unsupported browsers are safe', async () => {
  const {audio, state} = harness(); audio.setMusic(false); audio.setSfx(false); await audio.start();
  assert.equal(state.starts, 0); assert.equal(state.gains[1].gain.value, 0); assert.equal(state.gains[2].gain.value, 0);
  const unavailable = harness(false).audio;
  await unavailable.start(); unavailable.play('correct'); unavailable.setMusic(false); unavailable.setSfx(false); unavailable.pause(); await unavailable.resume();
});

test('scene changes preserve one scheduler and mute preferences', async()=>{const {audio,state}=harness();await audio.start();audio.setScene('game');audio.setScene('menu');audio.setScene('game');assert.equal(state.timers.size,1);audio.setMusic(false);state.context.currentTime+=1;const before=state.starts;for(const cb of state.timers.values())cb();assert.equal(state.starts,before);});

test('first menu gesture resumes audio before playing its cue and respects SFX mute',async()=>{const {audio,state}=harness();audio.setMusic(false);assert.equal(state.contexts,0);await audio.ui();assert.equal(state.contexts,1);assert.equal(state.resumes,1);assert.equal(state.starts,2);const before=state.starts;await audio.ui('start');assert.equal(state.starts,before+3);audio.setSfx(false);await audio.ui();assert.equal(state.starts,before+3);audio.setSfx(true);await audio.ui();assert.equal(state.starts,before+5);assert.equal(state.timers.size,1);});

test('quest completion and collection have distinct cues and obey SFX mute',async()=>{
 const {audio,state}=harness();audio.setMusic(false);await audio.start();
 const before=state.starts;audio.play('quest-complete');const completion=state.starts-before;const completionNotes=state.notes.slice();state.notes=[];
 const midway=state.starts;audio.play('quest-collect');const collection=state.starts-midway;
 assert(completion>0&&collection>0);assert.notDeepEqual(state.notes,completionNotes);audio.setSfx(false);const muted=state.starts;
 audio.play('quest-complete');audio.play('quest-collect');assert.equal(state.starts,muted);
});

test('repeated actions vary pitch subtly without changing their sound pattern',async()=>{
 const {audio,state}=harness();audio.setMusic(false);await audio.start();
 for(const cue of ['result-score-tick','result-coin-tick','result-tally-done','correct','click','avatar','quest-collect','special-impact','close','surface-tap']){
  let previous;
  for(let i=0;i<20;i++){state.notes=[];audio.play(cue);const frequencies=state.notes.map(n=>n[0]);assert(frequencies.length>0);
   if(previous){assert.notEqual(frequencies[0],previous[0],cue);const ratio=frequencies[0]/previous[0];assert(ratio>.90&&ratio<1.10,cue);for(let j=1;j<frequencies.length;j++)assert(Math.abs(frequencies[j]/previous[j]-ratio)<1e-9,cue);}
   previous=frequencies;
  }
 }
 audio.setSfx(false);const before=state.starts;audio.play('surface-tap');audio.play('leave-result');assert.equal(state.starts,before);
});

test('skills fade music linearly without silence, preserve mute, and recover smoothly',async()=>{
 const {audio,state}=harness();audio.setMusic(false);await audio.start();const duck=state.gains[3].gain;
 audio.play('special-hourglass');assert.deepEqual(duck.ramps.slice(-2),[[.5,.08],[1,1.8]]);assert.equal(state.gains[1].gain.value,0);assert.equal(state.suspends,0);
 state.context.currentTime=.04;audio.play('special-crystal');assert(Math.abs(duck.values.at(-2)[0]-.75)<1e-9,'overlapping cue continues current fade');
 assert(duck.ramps.every(([gain])=>gain>=.5));audio.setSfx(false);const count=duck.ramps.length;audio.play('special-heart');assert.equal(duck.ramps.length,count);
});
test('correct picks stay bright with no low octave or downward pitch variation',async()=>{
 const {audio,state}=harness();audio.setMusic(false);await audio.start();
 for(let i=0;i<50;i++){state.notes=[];audio.play('correct');assert(state.notes[0][0]>=1046&&state.notes[0][0]<1080);assert(state.notes.every(([freq])=>freq>=1046));}
});

test('ordinary effects lower music too and never shorten an active skill fade',async()=>{
 const {audio,state}=harness();await audio.start();assert.equal(state.gains[1].gain.value,.14);const duck=state.gains[3].gain;
 for(const cue of ['correct','click','menu-shop','avatar','coin-arrive','result-score-tick']){const before=duck.ramps.length;audio.play(cue);assert(duck.ramps.length>before);assert.equal(duck.ramps.at(-2)[0],.5);}
 audio.play('special-reset');const recovery=duck.ramps.at(-1)[1];state.context.currentTime=.5;audio.play('click');assert.equal(duck.ramps.at(-1)[1],recovery);assert.equal(duck.values.at(-2)[0],.5);assert.equal(state.suspends,0);
});

test('ability cues use distinct bright notes without low-pitched layers',async()=>{
 const {audio,state}=harness();audio.setMusic(false);await audio.start();const signatures=[];
 for(const cue of ['special-starburst','special-impact','special-reset','rewind-fold','rewind-settle','special-heart','heart-fill','special-crystal','shield-arrive','special-hourglass','skill-points','shield']){
  for(let i=0;i<10;i++){state.notes=[];audio.play(cue);assert(state.notes.length>0,cue);assert(state.notes.every(([f])=>f>=780&&f<3300),cue+' stays bright without bass or extreme highs');}
  signatures.push(state.notes.map(([f,t])=>[Math.round(f/state.notes[0][0]*100),t]));
 }
 assert.notDeepEqual(signatures[0],signatures[2]);assert.notDeepEqual(signatures[5],signatures[7]);assert.notDeepEqual(signatures[7],signatures[9]);
});


test('reward collection responds immediately with centered gentle tones and subtle pitch variation',async()=>{
 const {audio,state}=harness();audio.setMusic(false);await audio.start();
 assert.equal(state.gains[2].channelCount,1);assert.equal(state.gains[2].channelCountMode,'explicit');assert.equal(state.gains[2].channelInterpretation,'speakers');
 for(let i=0;i<20;i++){
  state.notes=[];const before=state.starts;const completion=audio.ui('quest-collect');
  assert.equal(state.starts,before+3,'tap sounds synchronously before promise completion');
  assert.equal(state.notes[0][1],state.context.currentTime,'no leading delay');
  assert(state.notes.every(([freq])=>freq>770&&freq<1190),'no bass or shrill high layer');
  assert(state.notes.at(-1)[1]-state.notes[0][1]<=.18);await completion;
 }
 audio.setSfx(false);const before=state.starts;await audio.ui('quest-collect');assert.equal(state.starts,before);
});


test('independent volume sliders apply before startup, allow louder levels and retain mute',async()=>{
 const {audio,state}=harness();audio.setMusicVolume(80);audio.setSfxVolume(35);await audio.start();
 assert.equal(state.gains[1].gain.value,.28);assert.equal(state.gains[2].gain.value,.7);
 audio.setMusicVolume(100);assert.equal(state.gains[1].gain.targets.at(-1),.35);
 audio.setSfxVolume(100);assert.equal(state.gains[2].gain.targets.at(-1),2);
 audio.setMusic(false);audio.setMusicVolume(70);assert.equal(state.gains[1].gain.targets.at(-1),0);
 audio.setMusic(true);assert.ok(Math.abs(state.gains[1].gain.targets.at(-1)-.245)<1e-10);
 audio.setSfx(false);audio.setSfxVolume(20);assert.equal(state.gains[2].gain.targets.at(-1),0);
 audio.setSfx(true);assert.equal(state.gains[2].gain.targets.at(-1),.4);
 audio.setMusicVolume(0);assert.equal(state.gains[1].gain.targets.at(-1),0);
 audio.setSfxVolume(0);assert.equal(state.gains[2].gain.targets.at(-1),0);
});
test('volume values are bounded and ducking leaves selected bus volume intact',async()=>{
 const {audio,state}=harness();await audio.start();audio.setMusicVolume(900);audio.setSfxVolume(-12);
 assert.equal(state.gains[1].gain.targets.at(-1),.35);assert.equal(state.gains[2].gain.targets.at(-1),0);
 audio.setSfxVolume(65);audio.setMusicVolume('bad');assert.equal(state.gains[1].gain.targets.at(-1),.14);
 audio.play('special-hourglass');assert.equal(state.gains[1].gain.targets.at(-1),.14);assert.equal(state.gains[3].gain.ramps.at(-1)[0],1);
});

test('recorded praise uses only the licensed phrases and caches decoded clips',async()=>{
 const {audio,state}=harness();audio.setMusic(false);await audio.start();
 for(const phrase of ['Excellent!','Impressive!','Perfect!'])await audio.speakPraise(phrase);
 assert.deepEqual(state.fetches,['excellent','impressive','perfect'].map(name=>'assets/praise/'+name+'.wav'));
 assert.equal(state.voiceStarts.length,3);assert.equal(state.voiceStops.length,2);
 await audio.speakPraise('Excellent!');assert.equal(state.fetches.length,3);assert.equal(state.voiceStarts.length,4);
 await audio.speakPraise('Nice!');await audio.speakPraise('Too easy, huh?');assert.equal(state.voiceStarts.length,4);
 const duck=state.gains[3].gain;assert.equal(duck.ramps.at(-2)[0],.5);
});

test('recorded praise obeys mute, zero volume, foreground, pause and scene changes',async()=>{
 const {audio,state}=harness();audio.setMusic(false);await audio.start();
 await audio.speakPraise('Excellent!');audio.setSfx(false);assert.equal(state.voiceStops.length,1);
 await audio.speakPraise('Perfect!');assert.equal(state.voiceStarts.length,1);
 audio.setSfx(true);await audio.speakPraise('Perfect!');audio.setSfxVolume(0);
 assert.equal(state.voiceStops.length,2);await audio.speakPraise('Impressive!');assert.equal(state.voiceStarts.length,2);
 audio.setSfxVolume(65);state.document.hidden=true;await audio.speakPraise('Excellent!');assert.equal(state.voiceStarts.length,2);
 state.document.hidden=false;await audio.speakPraise('Excellent!');audio.pause();assert.equal(state.voiceStops.length,3);
 await audio.speakPraise('Impressive!');assert.equal(state.voiceStarts.length,3);
 await audio.resume();await audio.speakPraise('Impressive!');audio.setScene('game');assert.equal(state.voiceStops.length,4);
});

test('late voice downloads cannot play after pause or replace a newer praise',async()=>{
 const pending=new Map();
 const {audio,state}=harness(true,{fetch:url=>new Promise(resolve=>pending.set(url,resolve))});
 audio.setMusic(false);await audio.start();
 const first=audio.speakPraise('Excellent!'),second=audio.speakPraise('Perfect!');
 pending.get('assets/praise/perfect.wav')({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});await second;
 pending.get('assets/praise/excellent.wav')({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});await first;
 assert.equal(state.voiceStarts.length,1,'older delayed clip does not interrupt the latest praise');
 const late=audio.speakPraise('Impressive!');audio.pause();
 pending.get('assets/praise/impressive.wav')({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});await late;
 assert.equal(state.voiceStarts.length,1,'backgrounded request never starts after download');
});

test('failed voice downloads stay silent and retry at the next praise',async()=>{
 let available=false;const {audio,state}=harness(true,{fetch:async()=>({ok:available,arrayBuffer:async()=>new ArrayBuffer(8)})});
 audio.setMusic(false);await audio.start();await audio.speakPraise('Excellent!');assert.equal(state.voiceStarts.length,0);
 available=true;await audio.speakPraise('Excellent!');assert.equal(state.fetches.length,2);assert.equal(state.voiceStarts.length,1);
});

test('bundled praise recordings are short mono PCM clips with headroom and source attribution',()=>{
 for(const name of ['excellent','impressive','perfect']){
  const data=fs.readFileSync(new URL('./assets/praise/'+name+'.wav',import.meta.url));
  assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WAVE');
  let format=null,pcm=null;
  for(let at=12;at+8<=data.length;){const id=data.toString('ascii',at,at+4),length=data.readUInt32LE(at+4);if(id==='fmt ')format=data.subarray(at+8,at+8+length);if(id==='data')pcm=data.subarray(at+8,at+8+length);at+=8+length+(length%2);}
  assert(format&&pcm);assert.equal(format.readUInt16LE(0),1);assert.equal(format.readUInt16LE(2),1);assert.equal(format.readUInt32LE(4),22050);assert.equal(format.readUInt16LE(14),16);
  const duration=pcm.length/(22050*2);assert(duration>.5&&duration<1.5);
  let peak=0;for(let at=0;at<pcm.length;at+=2)peak=Math.max(peak,Math.abs(pcm.readInt16LE(at)));
  assert(peak>16000&&peak<24000,'consistent headroom without clipping');
 }
 const license=fs.readFileSync(new URL('./assets/praise/LICENSE.txt',import.meta.url),'utf8');
 assert.match(license,/BLACK LODGE GAMES/);assert.match(license,/Licensed under CC0/);
 assert(fs.existsSync(new URL('./assets/praise/CREDITS.txt',import.meta.url)));
});

test('minigames have distinct audible cues, rapid-cut limiting and shared mute/volume controls',async()=>{
 const {audio,state}=harness();audio.setMusic(false);
 const cues=['drop-block','drop-release','drop-pop','drop-chain','slice-launch','slice-fall','slice-swish','slice-cut','slice-chip','slice-bomb','slice-miss'],signatures=[];
 await audio.ui('drop-release');assert.equal(state.resumes,1);assert(state.starts>0);
 for(const cue of cues){state.context.currentTime+=.2;state.notes=[];const before=state.starts;audio.play(cue);assert(state.starts>before,cue);signatures.push(state.notes.map(n=>Math.round(n[0])).join(','));const count=state.starts;audio.play(cue);assert.equal(state.starts,count,'rapid repeated cue is limited');}
 assert.equal(new Set(signatures).size,cues.length);
 audio.setSfxVolume(35);assert.equal(state.gains[2].gain.targets.at(-1),.7);
 audio.setSfx(false);state.context.currentTime+=1;const before=state.starts;for(const cue of cues)audio.play(cue);assert.equal(state.starts,before);
});

test('a held slice reuses one continuous voice and smoothly follows movement',async()=>{
 const {audio,state}=harness();audio.setMusic(false);await audio.start();audio.sliceMotion(0);assert.equal(state.starts,0);
 audio.sliceMotion(.2);const count=state.starts;assert.equal(count,3);
 const gain=state.gains[5].gain;
 for(let i=0;i<120;i++){state.context.currentTime+=1/60;audio.sliceMotion((i%30)/30);}
 assert.equal(state.starts,count,'movement does not retrigger audio sources');assert(gain.targets.length>100);assert(gain.targets.every(v=>v>=0&&v<=1));
 audio.sliceMotion(0);assert.equal(gain.targets.at(-1),0);audio.stopSlice();assert.equal(state.stops.length,3);
 audio.stopSlice();assert.equal(state.stops.length,3,'stopping twice is safe');
 audio.sliceMotion(.5);assert.equal(state.starts,count+3,'a new gesture starts a fresh voice');
});
test('continuous slice audio stops on mute, zero volume, scene exit, pause and hidden page',async()=>{
 for(const stop of [(a,s)=>a.setSfx(false),(a,s)=>a.setSfxVolume(0),(a,s)=>a.setScene('menu'),(a,s)=>a.pause(),(a,s)=>{s.document.hidden=true;a.sliceMotion(.5);}]){
  const {audio,state}=harness();audio.setMusic(false);await audio.start();audio.setScene('game');audio.sliceMotion(.5);assert.equal(state.starts,3);
  stop(audio,state);assert.equal(state.stops.length,3);audio.stopSlice();assert.equal(state.stops.length,3);
 }
 const missing=harness(false).audio;missing.sliceMotion(.5);missing.stopSlice();
});


test('slice bomb uses a rounded bass impact and long low-pass debris tail, respecting mute',async()=>{
 const {audio,state}=harness();audio.setMusic(false);await audio.start();
 audio.play('slice-bomb');
 const filters=state.filters.filter(f=>f.type==='lowpass');assert.equal(filters.length,2);
 assert(filters.every(f=>f.Q.value<1));assert(state.stops.some(t=>t>=.8));
 assert.equal(state.notes.length,1);assert(state.notes[0][0]>65&&state.notes[0][0]<85);
 audio.setSfx(false);const starts=state.starts;audio.play('slice-bomb');assert.equal(state.starts,starts);
});


test('swipes have an audible midrange body with smooth speed response and no idle drone',async()=>{
 const {audio,state}=harness();audio.setMusic(false);await audio.start();audio.sliceMotion(.1);
 const filter=state.filters.find(f=>f.type==='bandpass'),air=state.gains[4],envelope=state.gains[5];
 assert(air.gain.value>=.3);assert(filter.frequency.targets.at(-1)>=1000);
 const slow=envelope.gain.targets.at(-1);audio.sliceMotion(1);const fast=envelope.gain.targets.at(-1);
 assert(slow>.45&&fast>slow&&fast<=1);assert.equal(state.starts,3);
 audio.sliceMotion(0);assert.equal(envelope.gain.targets.at(-1),0);
 audio.setSfxVolume(25);assert.equal(state.gains[2].gain.targets.at(-1),.5);
 audio.stopSlice();assert.equal(state.stops.length,3);
});

test('cut and recut cues use smooth filtered air and musical tones instead of sharp noise clicks',async()=>{
 const {audio,state}=harness();audio.setMusic(false);await audio.start();
 audio.play('slice-cut');assert.equal(state.notes.length,2);
 assert(state.filters.some(f=>f.type==='bandpass'));assert(state.stops.some(t=>t>=.2));
 state.context.currentTime=1;state.notes=[];const before=state.filters.length;
 audio.play('slice-chip');assert.equal(state.notes.length,1);
 assert(state.filters.slice(before).every(f=>f.type==='bandpass'));
});


const flushAudio=()=>new Promise(resolve=>setImmediate(resolve));
test('background uses cached recorded piano loops, not oscillators, and resumes at its saved position',async()=>{
 const {audio,state}=harness();await audio.start();await flushAudio();
 assert.equal(state.musicStarts.length,1);assert.equal(state.notes.length,0);
 const first=state.musicStarts[0];assert(first.loop);assert.equal(first.loopEnd,96);assert.match(first.buffer.url,/piano-menu/);
 state.context.currentTime=12;audio.pause();assert.equal(state.musicStops.length,1);
 await audio.resume();await flushAudio();assert.equal(state.musicStarts.length,2);
 assert.equal(state.musicStarts[1].startArgs[1],12);assert.equal(state.fetches.length,1);
 audio.setSfx(false);assert.equal(state.musicStops.length,1,'SFX mute leaves the music alone');
 audio.setMusicVolume(0);assert.equal(state.musicStops.length,2);
 audio.setMusicVolume(40);await flushAudio();assert.equal(state.musicStarts.length,3);
});

test('late piano loads never start after muting, pausing or backgrounding',async()=>{
 for(const stop of [(a,s)=>a.setMusic(false),(a,s)=>a.setMusicVolume(0),(a,s)=>a.pause(),(a,s)=>{s.document.hidden=true;}]){
  let resolve;const {audio,state}=harness(true,{fetch:()=>new Promise(r=>resolve=r)});await audio.start();stop(audio,state);
  resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});await flushAudio();assert.equal(state.musicStarts.length,0);
 }
});

test('quick scene changes select only the latest piano track and avoid overlapping duplicate loops',async()=>{
 const pending=new Map(),{audio,state}=harness(true,{fetch:url=>new Promise(r=>pending.set(url,r))});
 await audio.start();audio.setScene('game');
 pending.get('assets/music/piano-menu-v322.ogg')({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});await flushAudio();assert.equal(state.musicStarts.length,0);
 pending.get('assets/music/piano-game-v322.ogg')({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});await flushAudio();assert.equal(state.musicStarts.length,1);
 assert.match(state.musicStarts[0].buffer.url,/piano-game/);
 for(let i=0;i<10;i++){await audio.start();audio.setScene('game');for(const cb of state.timers.values())cb();}
 await flushAudio();assert.equal(state.musicStarts.length,1);assert.equal(state.timers.size,1);
 audio.setScene('menu');await flushAudio();assert.equal(state.musicStops.length,1);assert.equal(state.musicStarts.length,2);assert.match(state.musicStarts[1].buffer.url,/piano-menu/);
});

test('unavailable piano retries with backoff and never falls back to the old synthesized music',async()=>{
 let available=false;const {audio,state}=harness(true,{fetch:async()=>({ok:available,arrayBuffer:async()=>new ArrayBuffer(8)})});
 await audio.start();await flushAudio();assert.equal(state.starts,0);assert.equal(state.notes.length,0);
 for(let i=0;i<20;i++)for(const cb of state.timers.values())cb();assert.equal(state.fetches.length,1);
 available=true;state.context.currentTime=6;for(const cb of state.timers.values())cb();await flushAudio();assert.equal(state.musicStarts.length,1);assert.equal(state.fetches.length,2);
});

test('bundled piano loops include recording attribution and fit the offline music budget',()=>{
 const credits=fs.readFileSync(new URL('./assets/music/CREDITS.txt',import.meta.url),'utf8');
 assert.match(credits,/Alexander Holm/);assert.match(credits,/Salamander Grand Piano/);assert.match(credits,/creativecommons.org\/licenses\/by\/3.0/);
 for(const name of ['menu','game']){const data=fs.readFileSync(new URL(`./assets/music/piano-${name}-v322.ogg`,import.meta.url));assert.equal(data.subarray(0,4).toString(),'OggS');assert(data.length>500000&&data.length<2500000);}
});


test('Piano Flow loads recorded keys once and plays taps without starting the background loop',async()=>{
 const {audio,state}=harness();audio.setScene('piano');await audio.start();assert(await audio.preparePiano());
 assert.equal(state.fetches.length,13);assert.equal(state.starts,0);assert(await audio.preparePiano());assert.equal(state.fetches.length,13);
 const release=audio.pianoNote(76,1);assert.equal(state.starts,1);assert.equal(state.notes.length,0);release();
 audio.setSfx(false);const count=state.starts;audio.pianoNote(72);assert.equal(state.starts,count);
 audio.pianoNote(48,.6,true);assert.equal(state.starts,count+1);audio.setMusic(false);audio.pianoNote(48,.6,true);assert.equal(state.starts,count+1);
});
test('Piano Flow can retry missing keys and stops interactive voices on pause or scene exit',async()=>{
 let available=false;const {audio,state}=harness(true,{fetch:async()=>({ok:available,arrayBuffer:async()=>new ArrayBuffer(8)})});audio.setScene('piano');await audio.start();assert.equal(await audio.preparePiano(),false);available=true;assert(await audio.preparePiano());
 audio.pianoNote(72,3);const stops=state.stops.length;audio.pause();assert(state.stops.length>stops);await audio.resume();audio.pianoNote(74,3);const again=state.stops.length;audio.setScene('menu');assert(state.stops.length>again);
});

test('Piano Flow pop beat uses cached samples, music controls, and stops with the run',async()=>{
 const {audio,state}=harness();audio.setScene('piano');await audio.start();await audio.preparePiano();
 const start=state.starts;for(let pulse=0;pulse<8;pulse++)audio.pianoBeat(pulse);
 assert.equal(state.starts-start,12);assert.equal(state.notes.length,0);
 const sounds=state.musicStarts.map(n=>n.buffer.url);
 assert.equal(sounds.filter(n=>n.includes('pop-kick')).length,2);
 assert.equal(sounds.filter(n=>n.includes('pop-clap')).length,2);
 assert.equal(sounds.filter(n=>n.includes('pop-shaker')).length,8);
 audio.setSfx(false);const before=state.starts;audio.pianoBeat(0);assert.equal(state.starts,before+2);
 const stopped=state.stops.length;audio.stopPiano();assert(state.stops.length>stopped);
 for(const stop of [()=>audio.setMusic(false),()=>audio.setMusicVolume(0),()=>audio.pause(),()=>audio.setScene('menu')]){
  audio.setScene('piano');audio.setMusic(true);audio.setMusicVolume(40);await audio.resume();stop();
  const count=state.starts;audio.pianoBeat(0);assert.equal(state.starts,count);
 }
});


test('maximum-volume effects have foreground headroom and a muted effect cannot duck music',async()=>{
 const {audio,state}=harness();audio.setMusicVolume(100);audio.setSfxVolume(100);await audio.start();
 assert.equal(state.gains[1].gain.value,.35);assert.equal(state.gains[2].gain.value,2);
 const duck=state.gains[3].gain;audio.setSfxVolume(0);const ramps=duck.ramps.length,starts=state.starts;audio.play('slice-cut');assert.equal(duck.ramps.length,ramps);assert.equal(state.starts,starts);
});
test('continuous slicing ducks music at a bounded rate and stops extending the duck when idle',async()=>{
 const {audio,state}=harness();await audio.start();audio.setScene('game');const duck=state.gains[3].gain;
 for(let i=0;i<60;i++){state.context.currentTime=i/60;audio.sliceMotion(.7);}
 assert(duck.ramps.length>=10&&duck.ramps.length<=18);const count=duck.ramps.length;state.context.currentTime=2;audio.sliceMotion(0);assert.equal(duck.ramps.length,count);assert(duck.ramps.at(-1)[1]<2);
});

test('victory stage cues emit sound and respect SFX mute',async()=>{
 const {audio,state}=harness();audio.setMusic(false);await audio.start();
 await audio.prepareVictory();
 for(const cue of ['victory-transform','victory-gather','victory-burst','victory-spark']){
  const before=state.starts;audio.play(cue);assert(state.starts>before,cue);
 }
 audio.setSfx(false);const before=state.starts;
 for(const cue of ['victory-transform','victory-gather','victory-burst','victory-spark'])audio.play(cue);
 assert.equal(state.starts,before);
});

test('winning result transition preserves the final praise but ordinary navigation stops it',async()=>{
 const {audio,state}=harness();audio.setMusic(false);await audio.start();audio.setScene('game');await audio.speakPraise('Perfect!');
 const stops=state.voiceStops.length;audio.setScene('menu',{preservePraise:true});assert.equal(state.voiceStops.length,stops);
 audio.setScene('game');assert.equal(state.voiceStops.length,stops+1);
});

test('Piano backing has its own audible level, follows music slider and resets on exit',async()=>{
 const {audio,state}=harness();await audio.start();audio.setMusicVolume(100);audio.setScene('piano');
 assert.equal(state.gains[1].gain.targets.at(-1),1.1);
 audio.setMusicVolume(50);assert.equal(state.gains[1].gain.targets.at(-1),.55);
 audio.setMusic(false);assert.equal(state.gains[1].gain.targets.at(-1),0);
 audio.setMusic(true);assert.equal(state.gains[1].gain.targets.at(-1),.55);
 audio.setScene('game');assert.equal(state.gains[1].gain.targets.at(-1),.175);
});
test('ordinary Piano taps do not duck the song, but missed-note feedback still does',async()=>{
 const {audio,state}=harness();await audio.start();audio.setScene('piano');const duck=state.gains[3].gain;
 const before=duck.ramps.length;
 for(let i=0;i<20;i++)audio.play('surface-tap');assert.equal(duck.ramps.length,before);
 audio.play('piano-miss');assert(duck.ramps.length>before);
 audio.setScene('menu');assert.equal(duck.targets.at(-1),1);
});
