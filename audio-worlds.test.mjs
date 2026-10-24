import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const source=fs.readFileSync(new URL('./audio.js',import.meta.url),'utf8');
const path=world=>'assets/music/menu-'+world+'-v49452.ogg';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const response=()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
function buffer(channels,length,rate=44100){
 const data=Array.from({length:channels},()=>new Float32Array(length));
 return {numberOfChannels:channels,length,sampleRate:rate,duration:length/rate,getChannelData:channel=>data[channel]};
}
function harness(options={}){
 const state={contexts:0,sources:[],gains:[],convolvers:[],fetches:[],timers:new Map(),document:{hidden:false}};
 const parameter=()=>({value:0,values:[],ramps:[],targets:[],cancelScheduledValues(){},setValueAtTime(v,t){this.values.push([v,t]);},linearRampToValueAtTime(v,t){this.ramps.push([v,t]);},exponentialRampToValueAtTime(v,t){this.ramps.push([v,t]);},setTargetAtTime(v,t,c){this.targets.push([v,t,c]);}});
 const node=()=>({connections:[],disconnects:0,connect(target){this.connections.push(target);return target;},disconnect(){this.disconnects++;},gain:parameter(),frequency:parameter(),Q:parameter(),playbackRate:parameter(),threshold:parameter(),ratio:parameter(),knee:parameter(),attack:parameter(),release:parameter()});
 class AudioContext{
  constructor(){state.contexts++;state.context=this;this.state='suspended';this.sampleRate=44100;this.currentTime=0;this.destination={};}
  createGain(){const n=node();state.gains.push(n);return n;}
  createBiquadFilter(){return node();}
  createDynamicsCompressor(){return node();}
  createConvolver(){const n=node();state.convolvers.push(n);return n;}
  createBufferSource(){const n=node();n.stops=[];n.start=(...args)=>{n.startArgs=args;};n.stop=time=>n.stops.push(time);state.sources.push(n);return n;}
  createBuffer(channels,length,rate){return buffer(channels,length,rate);}
  async decodeAudioData(data){return options.decode?options.decode(data):{url:data.url,duration:96};}
  async resume(){this.state='running';}
  async suspend(){this.state='suspended';}
 }
 let serial=0;const window={AudioContext,setInterval(fn){state.timers.set(++serial,fn);return serial;},clearInterval(id){state.timers.delete(id);}};
 window.ShapeShiftPlatform={audioAllowed:true,paused:false,setInterval:window.setInterval,clearInterval:window.clearInterval};
 const fetch=async url=>{state.fetches.push(url);const r=options.fetch?await options.fetch(url):response();return {...r,arrayBuffer:async()=>{const data=await r.arrayBuffer();data.url=url;return data;}};};
 vm.runInNewContext(source,{window,fetch,document:state.document});
 return {audio:window.gameAudio,state,tracks:()=>state.sources.filter(n=>n.loop&&n.startArgs)};
}

test('selecting a menu world before the first gesture loads only that theme',async()=>{
 const {audio,state,tracks}=harness();audio.setMenuWorld('moon');
 assert.equal(state.contexts,0);assert.equal(state.fetches.length,0);
 await audio.start();await flush();assert.equal(tracks().length,1);
 assert.equal(tracks()[0].buffer.url,path('moon'));assert.deepEqual(state.fetches,[path('moon')]);
});

test('common preload caches all three world themes and all three gameplay tracks without playing',async()=>{
 const {audio,state,tracks}=harness();assert(await audio.prepareCommon());
 const fetched=state.fetches.filter(url=>url.includes('/music/'));
 assert.equal(fetched.length,6);for(const world of ['garden','moon','sunset'])assert(fetched.includes(path(world)));
 assert.equal(tracks().length,0);const count=state.fetches.length;
 assert(await audio.prepareCommon());audio.setMenuWorld('sunset');await audio.start();await flush();
 assert.equal(state.fetches.length,count);assert.equal(tracks()[0].buffer.url,path('sunset'));
});

test('equipping a world during gameplay leaves the gameplay track alone until returning to menu',async()=>{
 const {audio,state,tracks}=harness();audio.setScene('game');await audio.start();await flush();
 const game=tracks()[0];audio.setMenuWorld('sunset');await flush();
 assert.equal(tracks().length,1);assert.equal(game.stops.length,0);assert.equal(state.fetches.length,1);
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
 assert.equal(tracks()[1].buffer.url,path('moon'));assert.equal(state.fetches.length,3);
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
