import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const source=fs.readFileSync(new URL('./audio.js',import.meta.url),'utf8');
const path=world=>'assets/music/'+({garden:'indie-game-soundtrack-251864.mp3',moon:'game-background-359782.mp3',sunset:'game-music-loop-4-144341.mp3'})[world];
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const nonVictory=state=>state.fetches.filter(url=>!url.includes('/victory-')&&!url.includes('piano-bridge-'));
const response=()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
function buffer(channels,length,rate=44100){
 const data=Array.from({length:channels},()=>new Float32Array(length));
 return {numberOfChannels:channels,length,sampleRate:rate,duration:length/rate,getChannelData:channel=>data[channel]};
}
function harness(options={}){
 const state={contexts:0,oscillators:[],sources:[],gains:[],filters:[],convolvers:[],fetches:[],delays:[],timers:new Map(),document:{hidden:false}};
 const parameter=()=>({value:0,values:[],ramps:[],targets:[],cancelScheduledValues(){},setValueAtTime(v,t){this.values.push([v,t]);},linearRampToValueAtTime(v,t){this.ramps.push([v,t]);},exponentialRampToValueAtTime(v,t){this.ramps.push([v,t]);},setTargetAtTime(v,t,c){this.targets.push([v,t,c]);}});
 const node=()=>({connections:[],disconnects:0,connect(target){this.connections.push(target);return target;},disconnect(){this.disconnects++;},gain:parameter(),frequency:parameter(),Q:parameter(),playbackRate:parameter(),threshold:parameter(),ratio:parameter(),knee:parameter(),attack:parameter(),release:parameter()});
 class AudioContext{
  constructor(){state.contexts++;state.context=this;this.state='suspended';this.sampleRate=44100;this.currentTime=0;this.destination={};}
  createOscillator(){const n=node();n.stops=[];n.start=time=>{n.started=time;};n.stop=time=>n.stops.push(time);state.oscillators.push(n);return n;}
  createGain(){const n=node();state.gains.push(n);return n;}
  createBiquadFilter(){const n=node();state.filters.push(n);return n;}
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

test('common preload caches every distinct gameplay score and the three menu themes',async()=>{
 const {audio,state,tracks}=harness();assert(await audio.prepareCommon());
 const fetched=state.fetches.filter(url=>url.includes('/music/'));
 assert.equal(fetched.length,7);for(const world of ['garden','moon','sunset'])assert(fetched.includes(path(world)));
 assert.equal(tracks().length,0);const count=nonVictory(state).length;
 assert(await audio.prepareCommon());audio.setMenuWorld('sunset');await audio.start();await flush();
 assert.equal(nonVictory(state).length,count);assert.equal(tracks()[0].buffer.url,path('sunset'));
});

test('equipping a world during gameplay leaves the gameplay track alone until returning to menu',async()=>{
 const {audio,state,tracks}=harness();audio.setScene('game');await audio.start();await flush();
 const game=tracks()[0];audio.setMenuWorld('sunset');await flush();
 assert.equal(tracks().length,1);assert.equal(game.stops.length,0);assert.equal(nonVictory(state).length,1);
 audio.setScene('menu');await flush();assert.equal(tracks().length,2);
 assert.equal(tracks()[1].buffer.url,path('sunset'));state.context.currentTime=4;for(const tick of state.timers.values())tick();assert.equal(game.stops.length,1);
});

test('an uncached world keeps the current music until decoding completes and then crossfades',async()=>{
 let resolveMoon;const {audio,state,tracks}=harness({fetch:url=>url===path('moon')?new Promise(resolve=>resolveMoon=resolve):response()});
 await audio.start();await flush();const garden=tracks()[0];state.context.currentTime=5;
 audio.setMenuWorld('moon');await flush();assert.equal(garden.stops.length,0);assert.equal(tracks().length,1);
 state.context.currentTime=6;resolveMoon(response());await flush();const moon=tracks()[1];
 assert.equal(moon.buffer.url,path('moon'));assert.equal(moon.startArgs[0],6);assert.equal(moon.startArgs[1],0);
 assert.equal(garden.stops.length,0);assert.deepEqual(garden.connections[0].gain.ramps.at(-1),[0,moon.startArgs[0]+.85]);
 assert.deepEqual(moon.connections[0].gain.ramps.at(-1),[1,moon.startArgs[0]+.85]);
 state.context.currentTime=8;for(const tick of state.timers.values())tick();assert.equal(garden.stops.length,1);
});

test('predecoded world changes crossfade once and repeated selection never restarts the theme',async()=>{
 const {audio,state,tracks}=harness();await audio.prepareCommon();await audio.start();await flush();
 state.context.currentTime=9;audio.setMenuWorld('moon');await flush();
 assert.equal(tracks().length,2);assert.equal(tracks()[0].stops.length,0);assert.equal(tracks()[1].startArgs[0],9);
 assert.deepEqual(tracks()[1].connections[0].gain.ramps.at(-1),[1,tracks()[1].startArgs[0]+.85]);
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
 state.context.currentTime=32;const continuing=tracks().at(-1);audio.pause();await audio.resume();await flush();assert.equal(tracks().at(-1),continuing);assert.equal(continuing.stops.length,0);
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
 let resolveMenu;const {audio,state,tracks}=harness({fetch:url=>url===path('sunset')?new Promise(resolve=>resolveMenu=resolve):response()});
 audio.setScene('game');await audio.start();await flush();const game=tracks()[0];
 audio.setMenuWorld('sunset');audio.setScene('menu');await flush();assert.equal(game.stops.length,0);
 resolveMenu(response());await flush();assert.equal(tracks().length,2);assert.equal(game.stops.length,0);assert.equal(tracks()[1].startArgs[0],state.context.currentTime);
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
 let resolveTrack;const track='assets/music/endless-c-v228.ogg';
 const {audio,state,tracks}=harness({fetch:url=>url===track?new Promise(resolve=>resolveTrack=resolve):response()});
 assert.equal(await audio.prepareGameStart('game'),true);
 audio.setScene('game');await flush();assert.equal(tracks().filter(n=>n.buffer.url===track).length,0);
 resolveTrack(response());await flush();assert.equal(tracks().at(-1).buffer.url,track);
 assert.equal(state.fetches.filter(url=>url===track).length,1);
});

test('an unavailable optional backing does not block gameplay and can retry later',async()=>{
 let fail=true;const track='assets/music/shape-slice-theme-v229.ogg';
 const {audio,state,tracks}=harness({fetch:url=>url===track&&fail?{ok:false}:response()});
 assert.equal(await audio.prepareGameStart('slice'),true);audio.setScene('slice');await flush();
 assert.equal(tracks().filter(n=>n.buffer.url===track).length,0);
 fail=false;state.context.currentTime=6;for(const callback of state.timers.values())callback();await flush();
 assert.equal(tracks().at(-1).buffer.url,track);
});

test('piano prepares only its own samples and retries a failed key without reloading the rest',async()=>{
 let fail=true;const key='assets/music/keys/60.ogg';
 const {audio,state}=harness({fetch:url=>url===key&&fail?{ok:false}:response()});
 assert.equal(await audio.preparePiano(),false);assert.equal(state.fetches.length,11);
 assert(state.fetches.every(url=>url.includes('/keys/')||url.includes('/pop-')));
 fail=false;assert.equal(await audio.preparePiano(),true);assert.equal(state.fetches.length,12);
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
test('Drop uses short centered tactile effects with rate limiting and steady music',async()=>{
 const {audio,state}=harness();audio.setScene('drop');await audio.start();await flush();const duck=state.gains[3],before=duck.gain.ramps.length;
 for(const cue of dropCues){state.context.currentTime+=1;const first=state.oscillators.length;audio.play(cue);const added=state.oscillators.slice(first);assert(added.length>0&&added.length<=3);const count=state.oscillators.length;audio.play(cue);assert.equal(state.oscillators.length,count);for(const v of added){assert(['sine','triangle'].includes(v.type));assert(v.stops[0]-state.context.currentTime<.3);assert.equal(v.connections[0].connections[0],state.gains[2]);}}
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

test('Drop release and merge share the main game voice with only subtle upward variation',async()=>{
 const {audio,state}=harness({random:()=>0});audio.setScene('drop');await audio.start();await flush();
 for(const [cue,frequencies] of [['drop-release',[560]],['drop-merge-start',[1046,1569]],['drop-merge-burst',[1175,1762.5,2093]]]){
 const first=state.oscillators.length;audio.play(cue);assert.deepEqual(state.oscillators.slice(first).map(v=>v.frequency.values[0][0]),frequencies);}
 for(let i=0;i<12;i++){state.context.currentTime+=.2;const first=state.oscillators.length;audio.play('drop-merge-start');const f=state.oscillators[first].frequency.values[0][0];assert(f>=1046&&f<1075);}
});

const pitchOf=voice=>69+12*Math.log2(voice.frequency.values[0][0]/440);
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

test('merge pop starts at the visual impact and finishes without a low bass tail',async()=>{
 const {audio,state}=harness({random:()=>0});audio.setScene('drop');await audio.start();await flush();state.context.currentTime=.58;const start=state.oscillators.length;audio.play('drop-merge-burst');const burst=state.oscillators.slice(start);assert.equal(burst[0].started,.58);assert(burst.every(v=>v.frequency.values[0][0]>=1175&&v.stops[0]<.85));assert.equal(state.gains[2].channelCount,1);
});


test('temporary context interruptions and late scheduler ticks do not restart music',async()=>{
 const {audio,state,tracks}=harness();await audio.start();await flush();const voice=tracks()[0];
 state.context.currentTime=8;state.context.state='suspended';for(const tick of state.timers.values())tick();
 assert.equal(voice.stops.length,0);state.context.state='running';state.context.currentTime=15;
 for(const tick of state.timers.values())tick();await flush();assert.equal(tracks().length,1);
});
test('pause fades output and cancels effects while resume retains the music voice',async()=>{
 const {audio,state,tracks}=harness();await audio.start();await flush();state.context.currentTime=10;audio.play('click');
 const voice=tracks()[0],effect=state.oscillators.at(-1);audio.pause();
 assert.deepEqual(state.gains[0].gain.ramps.at(-1),[0,10.06]);assert.equal(voice.stops.length,0);assert.equal(effect.stops.at(-1),10.065);
 await audio.resume();await flush();assert.equal(tracks().length,1);assert.deepEqual(state.gains[0].gain.ramps.at(-1),[.52,10.16]);
 // A delayed old pause must not suspend playback after the game has resumed.
 for(const callback of [...state.delays])callback();await flush();assert.equal(state.context.state,'running');
});
test('a resume promise cannot reactivate audio after a newer pause',async()=>{
 let resolve;const {audio,state,tracks}=harness({resume:()=>new Promise(done=>resolve=done)});
 const starting=audio.start();audio.pause();state.platform.audioAllowed=false;state.context.state='running';resolve();await starting;await flush();
 assert.equal(tracks().length,0);assert.equal(state.timers.size,0);
});

test('Piano backing has no clap or shaker samples and keeps only the quiet low pulse',async()=>{
 const {audio,state}=harness();audio.setScene('piano');await audio.start();await audio.preparePiano();
 assert(!state.fetches.some(url=>/pop-(clap|shaker)/.test(url)));
 const start=state.sources.length;for(let i=0;i<8;i++)audio.pianoBeat(i);
 const backing=state.sources.slice(start);assert.equal(backing.length,2);assert(backing.every(s=>s.buffer.url.includes('pop-kick')));
});

test('each world hands off to the final dedicated Slice and Drop recordings',async()=>{
 for(const world of ['garden','moon','sunset']){
  const {audio,state,tracks}=harness();audio.setMenuWorld(world);await audio.start();await flush();
  for(const mode of ['slice','drop','menu']){
   state.context.currentTime+=5;audio.setScene(mode);await flush();
   assert.equal(tracks().at(-1).buffer.url,mode==='menu'?path(world):'assets/music/'+({slice:'shape-slice-theme-v229.ogg',drop:'shape-drop-simple-230.ogg'})[mode]);
   assert.equal(tracks().at(-1).startArgs[0],state.context.currentTime);
  }
 }
});

test('Piano chord changes retain room tails but exiting stops them',async()=>{
 const {audio,state}=harness();audio.setScene('piano');await audio.start();await audio.preparePiano();
 audio.pianoNote(48,1,true);const room=state.convolvers.at(-1);
 audio.stopPiano(true,true);assert.equal(room.disconnects,0);
 audio.pianoNote(53,1,true);assert.equal(state.convolvers.at(-1),room);
 audio.setScene('menu');assert(room.disconnects>0);
});
test('Piano Flow uses only piano accompaniment without adding percussion at high energy',()=>{
 const flow=fs.readFileSync(new URL('./piano-flow.js',import.meta.url),'utf8');
 assert(!flow.includes('.pianoBeat('));
});

test('entering gameplay switches recordings without added synthetic bridge notes',async()=>{
 const {audio,state,tracks}=harness();await audio.start();await flush();state.context.currentTime=1.137;
 const voices=state.oscillators.length;audio.setScene('slice');await flush();
 assert.equal(tracks().at(-1).buffer.url,'assets/music/shape-slice-theme-v229.ogg');
 assert.equal(tracks().at(-1).startArgs[0],1.137);assert.equal(state.oscillators.length,voices);
});

test('new worlds start crossfading at selection time without waiting for a bar',async()=>{
 const {audio,state,tracks}=harness();await audio.prepareCommon();await audio.start();await flush();
 for(const time of [.1,1.137,3.9]){
  state.context.currentTime=time;audio.setMenuWorld(time===1.137?'sunset':'moon');await flush();
  assert.equal(tracks().at(-1).startArgs[0],time);
  assert.deepEqual(tracks().at(-1).connections[0].gain.ramps.at(-1),[1,time+.85]);
 }
});
test('rapid world reversal starts the selected track immediately and fades the interrupted tail',async()=>{
 const {audio,state,tracks}=harness();await audio.start();await flush();state.context.currentTime=4;
 audio.setMenuWorld('moon');await flush();state.context.currentTime=4.2;audio.setMenuWorld('garden');await flush();
 assert.equal(tracks().at(-1).buffer.url,path('garden'));assert.equal(tracks().at(-1).startArgs[0],4.2);
 assert.equal(tracks()[0].stops[0],4.32);
});
test('pause or mute never leaves a pending late-starting recording',async()=>{
 for(const stop of [a=>a.pause(),a=>a.setMusic(false)]){
  const {audio,state,tracks}=harness();await audio.start();await flush();state.context.currentTime=4;
  audio.setMenuWorld('moon');await flush();const incoming=tracks()[1];stop(audio);
  assert.equal(incoming.startArgs[0],4);
  state.context.currentTime=10;for(const tick of state.timers.values())tick();await flush();assert.equal(tracks().length,2);
 }
});
test('Piano Flow does not render song names or section captions',()=>{
 const flow=fs.readFileSync(new URL('./piano-flow.js',import.meta.url),'utf8');
 assert(!flow.includes('songLabel'));assert(!flow.includes("el('p','piano-song')"));
});

test('Endless restores the selected C recording with no tone processing in every world',async()=>{
 for(const world of ['garden','moon','sunset']){
  const {audio,state,tracks}=harness();audio.setMenuWorld(world);audio.setScene('game');await audio.start();await flush();
  const original=tracks()[0];assert.equal(original.buffer.url,'assets/music/endless-c-v228.ogg');
  assert.equal(state.gains[1].connections.at(-1),state.gains[3],'music routes directly to ducking, bypassing the new tone filters');
  state.context.currentTime=8;audio.pause();await audio.resume();await flush();assert.equal(tracks()[0],original);assert.equal(original.stops.length,0);
  audio.setScene('menu');await flush();state.context.currentTime=12;for(const tick of state.timers.values())tick();
  audio.setScene('game');await flush();assert.equal(tracks().at(-1).buffer.url,'assets/music/endless-c-v228.ogg');
 }
});

test('Adventure uses its authored 110 BPM score instead of any menu world song',async()=>{
 for(const world of ['garden','moon','sunset']){
  const {audio,state,tracks}=harness();audio.setMenuWorld(world);await audio.start();await flush();
  state.context.currentTime=8;audio.setScene('adventure');await flush();
  assert.equal(tracks().at(-1).buffer.url,'assets/music/adventure-theme-v229.ogg');
  assert.equal(tracks().at(-1).startArgs[0],8);
 }
});

test('all menu themes use gentle melody presence without the muffling low-pass filter',async()=>{
 for(const world of ['garden','moon','sunset']){
  const {audio,state,tracks}=harness();audio.setMenuWorld(world);await audio.start();await flush();
  const presence=state.filters[2];assert.equal(presence.type,'peaking');assert.equal(presence.frequency.value,1800);assert.equal(presence.gain.value,1.8);
  assert.equal(state.gains[1].connections.at(-1),presence);assert.equal(presence.connections[0],state.gains[3]);assert.equal(tracks()[0].buffer.url,path(world));
  assert.equal(state.gains[2].connections[0],state.gains[0],'sound effects are not processed through menu EQ');
 }
});


test('gameplay lowers only backing music and restores menu volume without restarting the shared track',async()=>{
 const {audio,state,tracks}=harness();await audio.start();await flush();
 const original=tracks()[0],effects=state.gains[2].gain.value;
 for(const mode of ['adventure','drop','slice','game','piano']){
  audio.setScene(mode);await flush();
  assert.equal(state.gains[1].gain.targets.at(-1)[0],(mode==='piano'?.60:.28)*.4);
  assert.equal(state.gains[2].gain.value,effects);
 }
 audio.setMusicVolume(70);assert.equal(state.gains[1].gain.targets.at(-1)[0],.60*.7);
 audio.setScene('menu');assert.equal(state.gains[1].gain.targets.at(-1)[0],.55*.7);
});

test('changing worlds mid-crossfade responds immediately without cutting off the old tail',async()=>{
 const {audio,state,tracks}=harness();await audio.start();await flush();state.context.currentTime=4;
 audio.setMenuWorld('moon');await flush();state.context.currentTime=4.3;audio.setMenuWorld('sunset');await flush();
 assert.equal(tracks().length,3);assert.equal(tracks()[2].startArgs[0],4.3);
 assert.equal(tracks()[2].buffer.url,path('sunset'));assert.equal(tracks()[0].stops[0],4.42);
 assert.deepEqual(tracks()[0].connections[0].gain.ramps.at(-1),[0,4.42]);
});


test('delayed piano backing starts after the lead and is cancelled by music mute or pause',async()=>{
 for(const stop of [a=>a.stopPiano(true,true),a=>a.setMusic(false),a=>a.pause()]){
  const {audio,state}=harness();audio.setScene('piano');await audio.start();await audio.preparePiano();
  state.context.currentTime=10;const before=state.sources.length;
  audio.pianoNote(72,.3,false,.9);audio.pianoNote(48,.2,true,.5,.25);
  const voices=state.sources.slice(before);assert.equal(voices.length,2);
  assert.equal(voices[0].startArgs[0],10);assert.equal(voices[1].startArgs[0],10.25);
  stop(audio);assert(voices[1].stops.length>1,'queued support must be cancelled with the current figure');if(stop.toString().includes('stopPiano')||stop.toString().includes('setMusic'))assert(voices[1].stops.at(-1)<=voices[1].startArgs[0],'cancel before a queued note can start');
 }
});


test('final229 performance uses normalized strongest-channel keys and dry preview envelopes',async()=>{
 const original=buffer(2,3);original.getChannelData(0).set([.1,-.2,.1]);original.getChannelData(1).set([-.2,.4,-.2]);
 const {audio,state}=harness({decode:data=>data.url.includes('/keys/')?original:{url:data.url,duration:1}});
 audio.setScene('piano');await audio.start();await audio.preparePiano();state.context.currentTime=10;
 const filters=state.filters.length,rooms=state.convolvers.length;
 audio.pianoPerformance(72,.3,false,.9);const lead=state.sources.at(-1),leadGain=lead.connections[0];
 audio.pianoPerformance(48,.2,true,.035,.25);const support=state.sources.at(-1),supportGain=support.connections[0];
 assert.deepEqual([...lead.buffer.getChannelData(0)],[-.5,1,-.5]);assert.equal(lead.buffer.numberOfChannels,1);
 assert.equal(state.filters.length,filters,'no per-note low pass');assert.equal(state.convolvers.length,rooms,'no added reverb');
 assert.equal(leadGain.connections[0],state.gains[2]);assert.equal(supportGain.connections[0],state.gains[1]);
 assert.equal(state.gains[1].connections.at(-1),state.gains[3],'Piano backing bypasses music coloration');
 const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
 near(leadGain.gain.ramps[0][0],.30*.9);near(leadGain.gain.ramps[0][1],10.008);near(leadGain.gain.ramps[1][1],10+.3+.22);near(lead.stops[0],10+.3+.24);
 near(support.startArgs[0],10.25);near(supportGain.gain.ramps[0][1],10.26);near(supportGain.gain.ramps[1][1],10.25+.2+.20);near(support.stops[0],10.25+.2+.22);
 near(supportGain.gain.values[1][0],supportGain.gain.ramps[0][0]*.85);
 const leadMix=leadGain.gain.ramps[0][0]*state.gains[2].gain.value,supportMix=supportGain.gain.ramps[0][0]*state.gains[1].gain.value;
 near(supportMix/leadMix,.035/(.30*.9));
});

test('final229 performance keeps independent lead and accompaniment preferences and cancels queued support',async()=>{
 const {audio,state}=harness();audio.setScene('piano');await audio.start();await audio.preparePiano();
 audio.pianoPerformance(72,.3,false,.9);const lead=state.sources.at(-1);
 audio.pianoPerformance(48,.2,true,.035,.25);const support=state.sources.at(-1);const count=state.sources.length;
 audio.setMusic(false);assert.equal(support.stops.at(-1),0);assert.equal(lead.stops.length,1);
 audio.pianoPerformance(48,.2,true,.035);assert.equal(state.sources.length,count);
 audio.setSfx(false);assert.equal(lead.stops.at(-1),.03);audio.pianoPerformance(72,.3);assert.equal(state.sources.length,count);
 audio.setMusic(true);audio.pianoPerformance(48,.2,true,.035);assert.equal(state.sources.length,count+1,'backing remains available when lead muted');
 audio.setMusicVolume(0);audio.pianoPerformance(48,.2,true,.035);assert.equal(state.sources.length,count+1);
 audio.setSfx(true);audio.setSfxVolume(0);audio.pianoPerformance(72,.3);assert.equal(state.sources.length,count+1);
});

test('final229 pending notes cannot escape pause, scene exit, or host audio restriction',async()=>{
 for(const stop of [(a,s)=>a.pause(),(a,s)=>a.setScene('menu'),(a,s)=>{s.platform.audioAllowed=false;a.platformAudioChanged();}]){
  const {audio,state}=harness();audio.setScene('piano');await audio.start();await audio.preparePiano();
  audio.pianoPerformance(48,.2,true,.035,1);const support=state.sources.at(-1);stop(audio,state);
  assert(support.stops.length>1);assert(support.stops.at(-1)<support.startArgs[0]);
  const count=state.sources.length;audio.pianoPerformance(72,.3);assert.equal(state.sources.length,count);
 }
});
