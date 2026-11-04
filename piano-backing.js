// Per-song backing figures. Four input lanes do not limit the score's pitches.
// Every figure follows a performed melody note and ends within its written span.
const profiles={
 'sunlit-steps':[0,.5,.75], 'neon-horizon':[0,.375,.75], 'ripple-road':[0,.5],
 'moonlight-echo':[0,.25,.625], 'copper-strings':[0,.333,.667], 'homeward-sparks':[0,.25,.75],
 'rainy-window':[0,.625], 'golden-hour':[0,.375,.625], 'little-comet':[0,.25,.5,.75],
 'velvet-stairs':[0,.333], 'paper-kites':[0,.5,.875], 'lantern-walk':[0,.25,.5],
 'seashell-postcard':[0,.375], 'clockwork-garden':[0,.25,.625,.875], 'cloud-carousel':[0,.333,.833],
 'amber-path':[0,.5,.667], 'sugar-skip':[0,.125,.5,.75], 'snowglobe-wish':[0,.4,.8],
 'pebble-parade':[0,.25,.667], 'starlight-station':[0,.375,.5,.875]
};
export function pianoBackingPlan(note){
 const pattern=profiles[note.song]||profiles['sunlit-steps'],chord=note.chord;
 if(!Array.isArray(chord)||chord.length<3)return [];
 const span=Math.max(.5,Math.min(2,note.duration)),bar=note.bar??0,events=[];
 const strong=(note.songBeat??0)%4===0;
 // The player's note has the attack to itself. Support stays below its register.
 if(strong)events.push({kind:'bass',pitch:Math.max(36,chord[0]-12),beat:.16*span,duration:Math.min(.6,span*.45),gain:.035});
 pattern.slice(1).forEach((fraction,i)=>{
  const pitch=chord[(i+bar)%3];
  events.push({kind:'pluck',pitch:Math.min(60,pitch>60?pitch-12:pitch),beat:Math.max(.28,fraction)*span,duration:Math.min(.28,span*(1-fraction)),gain:.025});
 });
 return events;
}
export function createPianoBacking(context,destination,{buffers}={}){
 const voices=new Set();
 function stop(){const now=context.currentTime;for(const v of voices){if(v.g.gain.cancelAndHoldAtTime)v.g.gain.cancelAndHoldAtTime(now);else{v.g.gain.cancelScheduledValues(now);v.g.gain.setValueAtTime(v.at>now?0:v.g.gain.value||0,now);}v.g.gain.linearRampToValueAtTime(0,now+.025);try{v.s.stop(now+.03);}catch{}}voices.clear();}
 function tone(event,origin,beatSeconds){
  const at=origin+event.beat*beatSeconds,duration=event.kind==='kick'?.16:Math.max(.08,event.duration*beatSeconds);
  if(buffers?.size){
   const keys=[...buffers.keys()],key=keys.reduce((a,b)=>Math.abs(a-event.pitch)<=Math.abs(b-event.pitch)?a:b),s=context.createBufferSource(),g=context.createGain();
   s.buffer=buffers.get(key);s.playbackRate.value=2**((event.pitch-key)/12);
   g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(event.gain,at+.01);g.gain.setValueAtTime(event.gain*.85,at+duration);g.gain.exponentialRampToValueAtTime(.0001,at+duration+.2);
   s.connect(g);g.connect(destination);const v={s,g,at};voices.add(v);s.onended=()=>{voices.delete(v);s.disconnect();g.disconnect();};s.start(at);s.stop(at+duration+.22);return;
  }
  const harmonics=event.kind==='kick'?[[1,1]]:event.kind==='bass'?[[1,1],[2,.12]]:[[1,1],[2,.24],[3,.10],[4,.035]];
  for(const [h,level] of harmonics){const s=context.createOscillator(),g=context.createGain();s.type='sine';
   if(event.kind==='kick'){s.frequency.setValueAtTime(95,at);s.frequency.exponentialRampToValueAtTime(48,at+.12);}else s.frequency.value=440*2**((event.pitch-69)/12)*h;
   g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(event.gain*level,at+.006);g.gain.exponentialRampToValueAtTime(.0001,at+duration+.10);
   s.connect(g);g.connect(destination);const voice={s,g,at};voices.add(voice);s.onended=()=>{voices.delete(voice);s.disconnect();g.disconnect();};s.start(at);s.stop(at+duration+.12);
  }
 }
 return {play(note,bpm=100){stop();const origin=context.currentTime+.005,beat=60/Math.max(60,Math.min(180,bpm));for(const e of pianoBackingPlan(note))tone(e,origin,beat);},stop,dispose:stop};
}
