import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const source=fs.readFileSync(new URL('./audio.js',import.meta.url),'utf8');
const path=world=>'assets/music/menu-'+world+'-v49458.ogg';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const nonVictory=state=>state.fetches.filter(url=>!url.includes('/victory-'));
const response=()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
function buffer(channels,length,rate=44100){
 const data=Array.from({length:channels},()=>new Float32Array(length));
 return {numberOfChannels:channels,length,sampleRate:rate,duration:length/rate,getChannelData:channel=>data[channel]};
}
function harness(options={}){
 const state={contexts:0,oscillators:[],sources:[],gains:[],convolvers:[],fetches:[],delays:[],timers:new Map(),document:{hidden:false}};
 const parameter=()=>({value:0,values:[],ramps:[],targets:[],cancelScheduledValues(){},setValueAtTime(v,t){this.values.push([v,t]);},linearRampToValueAtTime(v,t){this.ramps.push([v,t]);},exponentialRampToValueAtTime(v,t){this.ramps.push([v,t]);},setTargetAtTime(v,t,c){this.targets.push([v,t,c]);}});
 const node=()=>({connections:[],disconnects:0,connect(target){this.connections.push(target);return target;},disconnect(){this.disconnects++;},gain:parameter(),frequency:parameter(),Q:parameter(),playbackRate:parameter(),threshold:parameter(),ratio:parameter(),knee:parameter(),attack:parameter(),release:parameter()});
 class AudioContext{
  constructor(){state.contexts++;state.context=this;this.state='suspended';this.sampleRate=44100;this.currentTime=0;this.destination={};}
  createOscillator(){const n=node();n.stops=[];n.start=time=>{n.started=time;};n.stop=time=>n.stops.push(time);state.oscillators.push(n);return n;}
  createGain(){const n=node();state.gains.push(n);return n;}
  createBiquadFilter(){return node();}
  createDynamicsCompressor(){return node();}
  createConvolver(){const n=node();state.convolvers.push(n);return n;}
  createBufferSource(){const n=node();n.stops=[];n.start=(...args)=>{n.startArgs=args;};n.stop=time=>n.stops.push(time);state.sources.push(n);return n;}
  createBuffer(channels,length,rate){return buffer(channels,length,rate);}
  async decodeAudioData(data){return options.decode?options.decode(data):{url:data.url,duration:96};}
  async resume(){if(options.resume)return options.resume();this.state='running';}
  async suspend(){this.state='suspended';}
 }
 let serial=0;const window={AudioContext,setTimeout(fn){state.delays.push(fn);return ++serial;},setInterval(fn){state.timers.set(++serial,fn);return serial;},clearInterval(id){state.timers.delete(id);}};
 window.ShapeShiftPlatform={audioAllowed:true,paused:false,setInterval:window.setInterval,clearInterval:window.clearInterval};state.platform=window.ShapeShiftPlatform;
 const fetch=async url=>{state.fetches.push(url);const r=options.fetch?await options.fetch(url):response();return {...r,arrayBuffer:async()=>{const data=await r.arrayBuffer();data.url=url;return data;}};};
 const math=Object.create(Math);math.random=options.random||Math.random;
 vm.runInNewContext(source,{window,fetch,document:state.document,Math:math});
 return {audio:window.gameAudio,state,tracks:()=>state.sources.filter(n=>n.loop&&n.startArgs)};
}

test('selecting a menu world before the first gesture loads only that theme',async()=>{
 const {audio,state,tracks}=harness();audio.setMenuWorld('moon');
 assert.equal(state.contexts,0);assert.equal(state.fetches.length,0);
 await audio.start();await flush();assert.equal(tracks().length,1);
 assert.equal(tracks()[0].buffer.url,path('moon'));assert.deepEqual(nonVictory(state),[path('moon')]);
});

test('common preload caches all three world themes and all three gameplay tracks without playing',async()=>{
 const {audio,state,tracks}=harness();assert(await audio.prepareCommon());
 const fetched=state.fetches.filter(url=>url.includes('/music/'));
 assert.equal(fetched.length,6);for(const world of ['garden','moon','sunset'])assert(fetched.includes(path(world)));
 assert.equal(tracks().length,0);const count=nonVictory(state).length;
 assert(await audio.prepareCommon());audio.setMenuWorld('sunset');await audio.start();await flush();
 assert.equal(nonVictory(state).length,count);assert.equal(tracks()[0].buffer.url,path('sunset'));
});

test('equipping a world during gameplay leaves the gameplay track alone until returning to menu',async()=>{
 const {audio,state,tracks}=harness();audio.setScene('game');await audio.start();await flush();
 const game=tracks()[0];audio.setMenuWorld('sunset');await flush();
 assert.equal(tracks().length,1);assert.equal(game.stops.length,0);assert.equal(nonVictory(state).length,1);
 audio.setScene('menu');await flush();assert.equal(tracks().length,2);
 assert.equal(tracks()[1].buffer.url,path('sunset'));assert.equal(game.stops.length,1);
});

test('an uncached world keeps the current music until decoding completes and then crossfades',async()=>{
 let resolveMoon;const {audio,state,tracks}=harness({fetch:url=>url===path('moon')?new Promise(resolve=>resolveMoon=resolve):response()});
 await audio.start();await flush();const garden=tracks()[0];state.context.currentTime=5;
 audio.setMenuWorld('moon');await flush();assert.equal(garden.stops.length,0);assert.equal(tracks().length,1);
 state.context.currentTime=6;resolveMoon(response());await flush();const moon=tracks()[1];
 assert.equal(moon.buffer.url,path('moon'));assert.deepEqual(moon.startArgs,[6,0]);
 assert.deepEqual(garden.stops,[6.85]);
 assert.deepEqual(garden.connections[0].gain.targets.at(-1),[0,6,.85/4]);
 assert.deepEqual(moon.connections[0].gain.ramps.at(-1),[1,6.85]);
});

test('predecoded world changes crossfade once and repeated selection never restarts the theme',async()=>{
 const {audio,state,tracks}=harness();await audio.prepareCommon();await audio.start();await flush();
 state.context.currentTime=9;audio.setMenuWorld('moon');await flush();
 assert.equal(tracks().length,2);assert.equal(tracks()[0].stops[0],9.85);
 assert.deepEqual(tracks()[1].connections[0].gain.ramps.at(-1),[1,9.85]);
 const fetches=state.fetches.length;
 for(let i=0;i<10;i++){audio.setMenuWorld('moon');audio.setScene('menu');for(const callback of state.timers.values())callback();}
 await flush();assert.equal(tracks().length,2);assert.equal(state.fetches.length,fetches);assert.equal(state.timers.size,1);
});

test('out-of-order downloads during rapid world changes can only start the latest requested theme',async()=>{
 const pending=new Map(),{audio,state,tracks}=harness({fetch:url=>new Promise(resolve=>pending.set(url,resolve))});
 await audio.start();audio.setMenuWorld('moon');audio.setMenuWorld('sunset');
 pending.get(path('moon'))(response());await flush();assert.equal(tracks().length,0);
 pending.get(path('garden'))(response());await flush();assert.equal(tracks().length,0);
 pending.get(path('sunset'))(response());await flush();assert.equal(tracks().length,1);
 assert.equal(tracks()[0].buffer.url,path('sunset'));
 audio.setMenuWorld('moon');await flush();assert.equal(tracks().length,2);
 assert.equal(tracks()[1].buffer.url,path('moon'));assert.equal(nonVictory(state).length,3);
});

test('invalid worlds fall back to garden and cancel a pending change without interrupting garden',async()=>{
 let resolveMoon;const {audio,tracks}=harness({fetch:url=>url===path('moon')?new Promise(resolve=>resolveMoon=resolve):response()});
 audio.setMenuWorld('unknown');await audio.start();await flush();const garden=tracks()[0];
 assert.equal(garden.buffer.url,path('garden'));audio.setMenuWorld('moon');audio.setMenuWorld(null);
 resolveMoon(response());await flush();assert.equal(tracks().length,1);assert.equal(garden.stops.length,0);
});

test('each world resumes its own saved playback offset across equipment changes and pause',async()=>{
 const {audio,state,tracks}=harness();await audio.start();await flush();
 state.context.currentTime=12;audio.setMenuWorld('moon');await flush();
 state.context.currentTime=19;audio.setMenuWorld('sunset');await flush();
 state.context.currentTime=25;audio.setMenuWorld('garden');await flush();assert.equal(tracks().at(-1).startArgs[1],12);
 state.context.currentTime=28;audio.setMenuWorld('moon');await flush();assert.equal(tracks().at(-1).startArgs[1],7);
 state.context.currentTime=32;audio.pause();await audio.resume();await flush();assert.equal(tracks().at(-1).startArgs[1],11);
 audio.setMenuWorld('sunset');await flush();assert.equal(tracks().at(-1).startArgs[1],6);
});

test('a muted or paused pending world never starts late',async()=>{
 for(const stop of [audio=>audio.setMusic(false),audio=>audio.setMusicVolume(0),audio=>audio.pause()]){
  let resolve;const {audio,tracks}=harness({fetch:()=>new Promise(done=>resolve=done)});
  audio.setMenuWorld('sunset');await audio.start();stop(audio);resolve(response());await flush();assert.equal(tracks().length,0);
 }
});

test('opposite-phase recorded keys retain the stronger channel instead of cancelling on phone speakers',async()=>{
 const original=buffer(2,4);original.getChannelData(0).set([1,-.5,.25,-.125]);original.getChannelData(1).set([-.5,.25,-.125,.0625]);
 const {audio,state}=harness({decode:data=>data.url.includes('/keys/')?original:{url:data.url,duration:1}});
 audio.setScene('piano');await audio.start();assert(await audio.preparePiano());audio.pianoNote(60);
 const played=state.sources.at(-1).buffer;assert.equal(played.numberOfChannels,1);
 assert.deepEqual([...played.getChannelData(0)],[1,-.5,.25,-.125]);
 assert.deepEqual([...original.getChannelData(1)],[-.5,.25,-.125,.0625],'decoding must not mutate the original channels');
});

test('compatible stereo keys fold to their average and a stronger right channel survives opposite phase',async()=>{
 for(const [left,right,expected] of [
  [[1,.5,-.5,0],[.5,.25,-.25,0],[.75,.375,-.375,0]],
  [[.25,-.125,.0625,0],[-1,.5,-.25,0],[-1,.5,-.25,0]]
 ]){
  const original=buffer(2,4);original.getChannelData(0).set(left);original.getChannelData(1).set(right);
  const {audio,state}=harness({decode:data=>data.url.includes('/keys/')?original:{url:data.url,duration:1}});
  audio.setScene('piano');await audio.start();await audio.preparePiano();audio.pianoNote(60);
  assert.deepEqual([...state.sources.at(-1).buffer.getChannelData(0)],expected);
 }
});

test('piano room tails share a finite stereo impulse and respect independent music and effects mutes',async()=>{
 const {audio,state}=harness();audio.setScene('piano');await audio.start();await audio.preparePiano();
 audio.pianoNote(60);audio.pianoNote(64);audio.pianoNote(48,.6,true);
 assert.equal(state.convolvers.length,2);const [lead,backing]=state.convolvers;
 assert.equal(lead.buffer,backing.buffer);assert.equal(lead.buffer.numberOfChannels,2);assert.equal(lead.normalize,false);
 assert(Math.abs(lead.buffer.duration-1.25)<.001);
 for(let channel=0;channel<2;channel++){
  const data=lead.buffer.getChannelData(channel);assert(data.every(Number.isFinite));assert(data.some(value=>Math.abs(value)>.05));
 }
 assert.equal(lead.connections[0].connections[0],state.gains[2]);
 assert.equal(backing.connections[0].connections[0],state.gains[1]);
 audio.setSfx(false);assert.equal(lead.disconnects,1);assert.equal(backing.disconnects,0);
 audio.setMusic(false);assert.equal(backing.disconnects,1);
 audio.setSfx(true);audio.pianoNote(60);assert.equal(state.convolvers.length,3);
 assert.equal(state.convolvers[2].buffer,lead.buffer);audio.pause();assert.equal(state.convolvers[2].disconnects,1);
});


test('menu clicks do not dip or interrupt the world soundtrack',async()=>{
 const {audio,state,tracks}=harness();await audio.start();await flush();
 const voice=tracks()[0],duck=state.gains[3],before=duck.gain.ramps.length;
 for(let i=0;i<12;i++)audio.play('click');
 assert.equal(voice.stops.length,0);assert.equal(duck.gain.ramps.length,before);
});
test('returning to menu keeps the current music until its theme has decoded',async()=>{
 let resolveMenu;const {audio,state,tracks}=harness({fetch:url=>url===path('garden')?new Promise(resolve=>resolveMenu=resolve):response()});
 audio.setScene('game');await audio.start();await flush();const game=tracks()[0];
 audio.setScene('menu');await flush();assert.equal(game.stops.length,0);
 resolveMenu(response());await flush();assert.equal(tracks().length,2);assert.equal(game.stops.length,1);
});


test('star rewards use the recorded victory family through the centered effects bus',async()=>{
 const {audio,state}=harness();await audio.start();const warming=audio.prepareVictory();
 for(let i=0;i<14;i++){state.delays.shift()();await flush();}await warming;
 for(const [cue,name] of [['objective-fill','fill'],['star-flight','flight'],['star-land-1','land1'],['star-land-2','land2'],['star-land-3','land3']]){
  audio.play(cue);const voice=state.sources.at(-1);
  assert.equal(voice.buffer.url,'assets/audio/victory-reward-'+name+'-v49459.ogg');
  assert.equal(voice.connections[0].connections[0],state.gains[2]);
 }
 assert.equal(state.gains[2].channelCount,1);const count=state.sources.length;
 audio.setSfx(false);audio.play('star-land-1');assert.equal(state.sources.length,count);
});


test('starting a run does not wait for an uncached optional backing track',async()=>{
 let resolveTrack;const track='assets/music/groove-game-v49431.ogg';
 const {audio,state,tracks}=harness({fetch:url=>url===track?new Promise(resolve=>resolveTrack=resolve):response()});
 assert.equal(await audio.prepareGameStart('game'),true);
 audio.setScene('game');await flush();assert.equal(tracks().filter(n=>n.buffer.url===track).length,0);
 resolveTrack(response());await flush();assert.equal(tracks().at(-1).buffer.url,track);
 assert.equal(state.fetches.filter(url=>url===track).length,1);
});

test('an unavailable optional backing does not block gameplay and can retry later',async()=>{
 let fail=true;const track='assets/music/groove-slice-v49431.ogg';
 const {audio,state,tracks}=harness({fetch:url=>url===track&&fail?{ok:false}:response()});
 assert.equal(await audio.prepareGameStart('slice'),true);audio.setScene('slice');await flush();
 assert.equal(tracks().filter(n=>n.buffer.url===track).length,0);
 fail=false;state.context.currentTime=6;for(const callback of state.timers.values())callback();await flush();
 assert.equal(tracks().at(-1).buffer.url,track);
});

test('piano prepares only its own samples and retries a failed key without reloading the rest',async()=>{
 let fail=true;const key='assets/music/keys/60.ogg';
 const {audio,state}=harness({fetch:url=>url===key&&fail?{ok:false}:response()});
 assert.equal(await audio.preparePiano(),false);assert.equal(state.fetches.length,13);
 assert(state.fetches.every(url=>url.includes('/keys/')||url.includes('/pop-')));
 fail=false;assert.equal(await audio.preparePiano(),true);assert.equal(state.fetches.length,14);
 assert.equal(state.fetches.filter(url=>url===key).length,2);
});


test('a pending browser audio permission does not hold up starting a run',async()=>{
 const {audio}=harness({resume:()=>new Promise(()=>{})});
 assert.equal(await audio.prepareGameStart('game'),true);
});


test('victory warming yields between samples, never blocks play, and retries failures',async()=>{
 const pending=new Map();let defer=true;
 const {audio,state}=harness({fetch:url=>url.includes('/victory-')&&defer?new Promise(resolve=>pending.set(url,resolve)):response()});
 await audio.start();assert.equal(pending.size,0);assert.equal(state.context.state,'running');
 for(let index=0;index<14;index++){
  assert.equal(state.delays.length,1);state.delays.shift()();await flush();
  assert.equal(pending.size,1,'only one optional download may compete with gameplay');
  await audio.start();assert.equal(state.delays.length,0,'repeated starts share the active warmup');
  [...pending.values()][0](index===0?{ok:false}:response());pending.clear();await flush();
 }
 const before=state.fetches.filter(url=>url.includes('/victory-')).length;defer=false;
 await audio.start();state.delays.shift()();await flush();assert.equal(state.fetches.filter(url=>url.includes('/victory-')).length,before+1);
});


test('Slice laser reuses its air and octave voices and stops on release or mute',async()=>{
 const {audio,state}=harness();audio.setScene('slice');await audio.start();await flush();
 const before=state.sources.length,tones=state.oscillators.length,duck=state.gains[3],duckEvents=duck.gain.ramps.length;
 audio.sliceMotion(.6);const voice=state.sources.at(-1);
 assert.equal(state.sources.length,before+1);assert.equal(voice.loop,true);
 for(let i=0;i<120;i++){state.context.currentTime+=1/60;audio.sliceMotion((i%30)/30);}
 assert.equal(state.sources.length,before+1,'pointer moves must not create overlapping voices');
 assert.equal(state.oscillators.length,tones+2,'laser shimmer must reuse its two octave voices');
 assert.equal(duck.gain.ramps.length,duckEvents,'continuous slicing must not pump the music');
 audio.stopSlice();assert.equal(voice.stops.length,1);
 for(const osc of state.oscillators.slice(tones))assert.equal(osc.stops.length,1,'release stops laser tones');
 audio.sliceMotion(.7);const next=state.sources.at(-1);assert.notEqual(next,voice);
 audio.setSfx(false);assert.equal(next.stops.length,1);const count=state.sources.length;
 audio.sliceMotion(1);assert.equal(state.sources.length,count);
});

test('Slice cut and chip cues finish promptly without repeated music dips',async()=>{
 const {audio,state}=harness();audio.setScene('slice');await audio.start();await flush();
 const duck=state.gains[3],before=duck.gain.ramps.length;
 for(const cue of ['slice-launch','slice-fall','slice-swish','slice-cut','slice-chip']){
  state.context.currentTime+=1;const start=state.sources.length;
  audio.play(cue);
  for(const source of state.sources.slice(start))assert(source.stops[0]-state.context.currentTime<=.25);
 }
 assert.equal(duck.gain.ramps.length,before);
});


const dropCues=['drop-release','drop-land','drop-touch','drop-block','drop-merge-start','drop-merge-burst','drop-pop','drop-chain'];
test('Drop cues use centered short musical voices, stay rate-limited, and do not duck music',async()=>{
 const {audio,state}=harness();audio.setScene('drop');await audio.start();await flush();
 const duck=state.gains[3],before=duck.gain.ramps.length;
 for(const cue of dropCues){
  state.context.currentTime+=1;const sources=state.sources.length,tones=state.oscillators.length;
  audio.play(cue);const added=state.oscillators.slice(tones);
  assert(added.length>0&&added.length<=4);assert.equal(state.sources.length,sources,'Drop must not reintroduce noise sweeps');
  const count=state.oscillators.length;audio.play(cue);
  assert.equal(state.oscillators.length,count,'simultaneous contacts must not pile up identical cues');
  for(const voice of added){assert(['sine','triangle'].includes(voice.type));assert(voice.stops[0]-state.context.currentTime<.36);assert.equal(voice.connections[0].connections[0],state.gains[2]);}
 }
 assert.equal(state.gains[2].channelCount,1);assert.equal(duck.gain.ramps.length,before);
});

test('all Drop cues respect effects mute, zero volume, pause and host audio restriction',async()=>{
 for(const block of [a=>a.audio.setSfx(false),a=>a.audio.setSfxVolume(0),a=>a.audio.pause(),a=>a.state.platform.paused=true,a=>a.state.platform.audioAllowed=false]){
  const h=harness();h.audio.setScene('drop');await h.audio.start();await flush();block(h);
  const count=h.state.sources.length+h.state.oscillators.length;
  for(const cue of dropCues)h.audio.play(cue);
  assert.equal(h.state.sources.length+h.state.oscillators.length,count);
 }
});

const pitchOf=voice=>69+12*Math.log2(voice.frequency.values[0][0]/440);
function assertChord(voices,classes){
 assert(voices.length>0);
 for(const voice of voices){const pitch=pitchOf(voice);assert(Math.abs(pitch-Math.round(pitch))<.00001,'Drop uses exact musical pitches without random detuning');assert(classes.includes(Math.round(pitch)%12),`pitch ${pitch} must follow current backing chord`);}
}
test('Drop tones follow the actual backing chords, loop position, and resumed playback offset',async()=>{
 const {audio,state}=harness({random:()=>.5});audio.setScene('drop');await audio.start();await flush();
 for(const [time,chord] of [[.2,[0,4,7]],[4.7,[0,4,7]],[4.8,[0,4,9]],[9.5,[0,4,9]],[9.6,[2,7,11]],[14.3,[2,7,11]],[14.4,[0,5,9]],[19.1,[0,5,9]],[19.2,[0,4,7]],[96.2,[0,4,7]]]){
  state.context.currentTime=time;
  for(const cue of dropCues){const start=state.oscillators.length;audio.play(cue);assertChord(state.oscillators.slice(start),chord);}
 }
 state.context.currentTime=101.2;audio.pause();state.context.currentTime=200;await audio.resume();await flush();
 assert(Math.abs(state.sources.at(-1).startArgs[1]-5.2)<.00001);
 let start=state.oscillators.length;audio.play('drop-merge-burst');assertChord(state.oscillators.slice(start),[0,4,9]);
 audio.setMusic(false);state.context.currentTime=240;start=state.oscillators.length;audio.play('drop-release');assertChord(state.oscillators.slice(start),[0,4,9]);
});

test('Drop cues are immediate with unavailable music and vary within a bounded consonant palette',async()=>{
 const {audio,state}=harness({fetch:()=>({ok:false}),random:()=>.5});audio.setScene('drop');await audio.start();await flush();
 const frequencies=[];
 for(let i=0;i<12;i++){
  state.context.currentTime=30+i*.1;const start=state.oscillators.length;audio.play('drop-release');const added=state.oscillators.slice(start);assertChord(added,[0,4,7]);
  frequencies.push(added[0].frequency.values[0][0]);
  const volume=added[0].connections[0].gain.ramps[0][0];assert(volume>=.115*.94*1.4-1e-9&&volume<=.115*1.04*1.4+1e-9);
 }
 assert(new Set(frequencies).size>1);for(let i=1;i<frequencies.length;i++)assert.notEqual(frequencies[i],frequencies[i-1]);
 assert(Math.max(...frequencies)/Math.min(...frequencies)<1.51);
});

test('shared pluck, match and phrase helpers preserve the original game cue defaults',async()=>{
 const {audio,state}=harness({random:()=>.5});await audio.start();await flush();
 audio.play('surface-tap');let voices=state.oscillators.slice(-1);
 assert.deepEqual(voices[0].frequency.values,[[560,0]]);assert.deepEqual(voices[0].frequency.ramps,[[680,.065]]);
 assert.deepEqual(voices[0].connections[0].gain.ramps,[[.075,.012],[.0001,.065]]);
 audio.play('correct');voices=state.oscillators.slice(-2);const originalPitch=2**(.24/12);
 assert.equal(voices[0].frequency.values[0][0],1046*originalPitch);assert.equal(voices[1].frequency.values[0][0],1046*1.5*originalPitch);
 assert.deepEqual(voices.map(v=>Math.round(v.stops[0]*1000)),[145,140]);assert.deepEqual(voices.map(v=>v.connections[0].gain.ramps[0][0]),[.12,.035]);
 audio.play('bonus');voices=state.oscillators.slice(-5);assert.deepEqual(voices.map(pitchOf),[72,76,79,84,88]);assert.deepEqual(voices.map(v=>v.started),[0,.055,.11,.165,.22]);
});

 test('merge anticipation rises brightly and impact has a short centered sparkle',async()=>{
 const {audio,state}=harness({random:()=>0});audio.setScene('drop');await audio.start();await flush();
 let start=state.oscillators.length;audio.play('drop-merge-start');const rise=state.oscillators.slice(start);
 assert.equal(rise.length,3);assert(rise.every(v=>v.frequency.values[0][0]>=980));
 assert(rise[0].frequency.values[0][0]<rise[1].frequency.values[0][0]);assert(rise[1].frequency.values[0][0]<rise[2].frequency.values[0][0]);assert(rise.every(v=>v.stops[0]<.58));
 state.context.currentTime=.58;start=state.oscillators.length;audio.play('drop-merge-burst');const burst=state.oscillators.slice(start);
 assert.equal(burst.length,4);assert.equal(burst[0].started,.58);assert.equal(burst[0].type,'triangle');
 assert(burst.every(v=>v.frequency.values[0][0]>=980&&v.frequency.values[0][0]<=2100));assert(burst.every(v=>v.stops[0]<1));
 assert.equal(state.gains[2].channelCount,1);
 });
