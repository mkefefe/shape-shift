// Battle uses the same short rising match/pluck vocabulary as the main game,
// while its isolated screen owns the soundtrack and audio lifecycle.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function cueNotes(kind,combo=0,random=Math.random){
 const lift=2**((clamp(combo,0,6)*.025+random()*.20)/12);
 const note=(frequency,delay,length,volume,end=frequency,type='sine')=>({frequency,delay,length,volume,end,type});
 switch(kind){
  case 'hit': return [note(1046*lift,0,.13,.15,1172*lift),note(1569*lift,.025,.10,.045)];
  case 'click': return [note(720,0,.065,.13,1040),note(1440,.012,.045,.025)];
  case 'start': return [note(784,0,.14,.11),note(1046,.07,.18,.085),note(1568,.15,.20,.04)];
  case 'warning': return [note(784,0,.10,.10,880,'triangle'),note(1046,.14,.13,.085)];
  case 'parry': return [note(1046,0,.10,.16,1250),note(1568,.025,.18,.10),note(2093,.075,.17,.04)];
  case 'block': return [note(880,0,.09,.13,1046,'triangle'),note(1568,.03,.19,.075)];
  case 'shield': return [note(1046,0,.22,.105),note(1568,.06,.28,.06)];
  case 'shift': return [note(988,0,.13,.09,1175),note(1480,.07,.16,.055)];
  case 'reward': return [note(784,0,.17,.095),note(1175,.065,.21,.065),note(1568,.14,.22,.035)];
  case 'win': return [note(784,0,.17,.10),note(988,.08,.19,.09),note(1175,.16,.23,.08),note(1568,.25,.26,.05)];
  case 'nova': return [note(1046,0,.18,.11),note(1318,.07,.20,.09),note(1568,.14,.24,.07),note(2093,.21,.22,.035)];
  default: return [note(740,0,.07,.08,880)];
 }
}

export function duckLevel(envelope,now){
 if(!envelope)return 1;
 const {start,from,down,hold,end,target}=envelope;
 if(now<down)return from+(target-from)*clamp((now-start)/(down-start),0,1);
 if(now<hold)return target;
 if(now<end)return target+(1-target)*(now-hold)/(end-hold);
 return 1;
}
export function duckEnvelope(previous,now,seconds,target=.62){
 // A new hit extends the hold from the current level, never jumps back to full.
 const from=duckLevel(previous,now),down=now+.08;
 const level=Math.min(target,previous&&now<previous.hold?previous.target:1);
 const hold=Math.max(down,now+seconds,previous?.hold||0);
 return {start:now,from,down,hold,end:hold+.5,target:level};
}

export function createBattleAudio(music,getSettings,environment={}){
 const AudioContext=environment.AudioContext||globalThis.AudioContext||globalThis.webkitAudioContext;
 const hidden=environment.hidden||(()=>globalThis.document?.hidden===true);
 let context,effectsBus,musicBus,musicDuck,envelope,noiseBuffer,suspending;
 const sources=new Set();
 function setup(){
  if(context)return context;
  if(!AudioContext)return null;
  context=new AudioContext({latencyHint:'interactive'});
  const compressor=context.createDynamicsCompressor();
  compressor.threshold.value=-12;compressor.ratio.value=8;compressor.knee.value=9;
  compressor.attack.value=.001;compressor.release.value=.18;
  effectsBus=context.createGain();effectsBus.channelCount=1;effectsBus.channelCountMode='explicit';effectsBus.channelInterpretation='speakers';
  musicBus=context.createGain();musicDuck=context.createGain();musicDuck.gain.value=1;
  context.createMediaElementSource(music).connect(musicBus);musicBus.connect(musicDuck).connect(compressor);
  effectsBus.connect(compressor);compressor.connect(context.destination);music.volume=1;
  return context;
 }
 function sync(){
  const s=getSettings(),now=context.currentTime;
  effectsBus.gain.setTargetAtTime(s.muted||!s.effectsAllowed?0:clamp(s.effectsVolume,0,1)*1.25,now,.015);
  musicBus.gain.setTargetAtTime(s.muted?0:clamp(s.musicVolume,0,.35),now,.05);
 }
 function resume(){
  if(!setup())return;
  sync();
  if(suspending)suspending.finally(()=>context.resume().catch(()=>{}));
  else if(context.state!=='running')void context.resume().catch(()=>{});
 }
 function available(){
  const s=getSettings();if(hidden()||s.muted||!s.effectsAllowed||s.effectsVolume<=0)return false;
  resume();return Boolean(context);
 }
 function track(source,nodes=[]){
  sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();nodes.forEach(n=>n.disconnect());};
 }
 function tone(note,time){
  const source=context.createOscillator(),gain=context.createGain(),at=time+note.delay;
  source.type=note.type;source.frequency.setValueAtTime(note.frequency,at);
  if(note.end!==note.frequency)source.frequency.exponentialRampToValueAtTime(note.end,at+note.length);
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(note.volume,at+.01);gain.gain.exponentialRampToValueAtTime(.0001,at+note.length);
  source.connect(gain).connect(effectsBus);track(source,[gain]);source.start(at);source.stop(at+note.length+.015);
 }
 function noise(time,length,volume,from,to,type='lowpass'){
  if(!noiseBuffer){noiseBuffer=context.createBuffer(1,context.sampleRate,context.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
  const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=noiseBuffer;
  filter.type=type;filter.Q.value=.6;filter.frequency.setValueAtTime(from,time);filter.frequency.exponentialRampToValueAtTime(to,time+length);
  gain.gain.setValueAtTime(.0001,time);gain.gain.linearRampToValueAtTime(volume,time+Math.min(.02,length*.25));gain.gain.exponentialRampToValueAtTime(.0001,time+length);
  source.connect(filter).connect(gain).connect(effectsBus);track(source,[filter,gain]);source.start(time);source.stop(time+length+.01);
 }
 function duck(seconds,target){
  const now=context.currentTime;envelope=duckEnvelope(envelope,now,seconds,target);
  const p=musicDuck.gain;p.cancelScheduledValues(now);p.setValueAtTime(envelope.from,now);
  p.linearRampToValueAtTime(envelope.target,envelope.down);p.setValueAtTime(envelope.target,envelope.hold);p.linearRampToValueAtTime(1,envelope.end);
 }
 function cue(kind,combo=0){
  if(!available())return;
  const now=context.currentTime;for(const note of cueNotes(kind,combo))tone(note,now);
  if(kind==='parry'||kind==='block')noise(now,.06,.055,1900,850,'bandpass');
  const duration={warning:.35,parry:.35,block:.25,shield:.4,shift:.25,reward:.4,win:.65,nova:.55};
  // Contacts use only a shallow dip; important warnings/specials remain clear.
  duck(duration[kind]??.18,kind==='hit'||kind==='click'?.82:.62);
 }
 function physical(kind){
  if(!available())return;
  const now=context.currentTime;
  if(kind==='bomb'){
   noise(now,.6,.23,2400,160);
   tone({frequency:135,end:45,delay:0,length:.45,volume:.22,type:'sine'},now);duck(.7,.58);
  }else{noise(now,.25,.065,1450,500,'bandpass');duck(.22,.78);}
 }
 function damage(){
  if(!available())return;const now=context.currentTime;
  // Preserve Adventure's unmistakable life-loss voice.
  tone({frequency:220,end:85,delay:0,length:.18,volume:.3,type:'sawtooth'},now);
  tone({frequency:165,end:55,delay:.11,length:.22,volume:.24,type:'square'},now);
  noise(now,.1,.13,550,550,'highpass');duck(.4,.6);
 }
 function playMusic(){
  if(hidden()||getSettings().muted)return;
  resume();void music.play().catch(()=>{});
 }
 function suspend(){
  music.pause();if(!context)return;
  for(const source of sources)try{source.stop();}catch{}
  envelope=null;musicDuck.gain.cancelScheduledValues(context.currentTime);musicDuck.gain.setValueAtTime(1,context.currentTime);
  suspending=context.suspend().catch(()=>{});suspending.finally(()=>{suspending=null;});
 }
 return {cue,physical,damage,playMusic,suspend};
}
