// Quiet, written accompaniment on the song's beat grid. Notes triggered early
// or late do not squeeze an arpeggio into a new rhythm or restart its sustain.
const GROOVES={
 indie:{bass:[0,2.5],arp:[.5,1.5,3]},pulse:{bass:[0,2],arp:[.5,1.5,2.5,3.5]},
 rolling:{bass:[0,2],arp:[1,1.5,3]},nocturne:{bass:[0],arp:[1.5,3]},
 folk:{bass:[0,2],arp:[1,3]},anthem:{bass:[0,2.5],arp:[1,3.5]},
 lofi:{bass:[0,2.5],arp:[1.5,3.5]},soul:{bass:[0,2],arp:[1.5,2.5,3.5]},
 sparkle:{bass:[0,2],arp:[.5,1.5,3,3.5]},velvet:{bass:[0],arp:[1,2.5,3.5]},
 breeze:{bass:[0,2.5],arp:[1,1.5,3.5]},lantern:{bass:[0,2],arp:[1.5,3]},
 coast:{bass:[0,2.5],arp:[.5,2,3.5]},clockwork:{bass:[0,2],arp:[.5,1,2.5,3]},
 floating:{bass:[0],arp:[1,2.5]},ambient:{bass:[0],arp:[2,3.5]},
 skip:{bass:[0,2.5],arp:[.5,1.5,3]},snow:{bass:[0],arp:[1.5,2.5]},
 parade:{bass:[0,2],arp:[1,2.5,3]},nightdrive:{bass:[0,2.5],arp:[.5,1.5,3.5]}
};
const register=(pitch,low,high)=>{while(pitch>high)pitch-=12;while(pitch<low)pitch+=12;return pitch;};
export function pianoBackingPlan(note){
 if(!Array.isArray(note.chord)||note.chord.length<3)return [];
 const start=Number(note.songBeat)||0,span=Math.max(.25,Number(note.duration)||1),end=start+span;
 const groove=GROOVES[note.style]||GROOVES.indie,events=[],soft=['Intro','Outro','Bridge'].includes(note.section);
 const energy=Math.max(.25,Math.min(1,note.energy??.65));
 const high=Math.max(52,Math.min(60,note.pitch-5)),tones=note.chord.map(p=>register(p,40,high));
 for(let bar=Math.floor(start/4);bar*4<end-1e-8;bar++){
  const add=(kind,at,pitch,duration,gain,index)=>{
   if(at<start-1e-8||at>=end-1e-8)return;
   // Harmony never crosses the next written bar. A small release tail is handled
   // by the sampler, while the next melody strike leaves existing voices intact.
   events.push({kind,pitch,beat:at-start,songBeat:at,duration:Math.min(duration,(bar+1)*4-at),gain:gain*(.65+energy*.35),
    id:`${note.song||'piano'}:${note.round||0}:${bar}:${kind}:${index}:${pitch}`});
  };
  const bass=soft?[0]:groove.bass;
  bass.forEach((position,i)=>add('bass',bar*4+position,register(note.chord[i===0?0:2],33,45),soft?1.6:1.15,.047,i));
  const arp=soft?[groove.arp[0]]:groove.arp;
  arp.forEach((position,i)=>{
   const index=(i+(bar%4===2?1:0))%tones.length;
   add('arp',bar*4+position,tones[index],soft?.9:.55,soft?.022:.029,i);
  });
 }
 return events.sort((a,b)=>a.beat-b.beat||a.pitch-b.pitch);
}

export function createPianoBacking(context,destination,{buffers}={}){
 const voices=new Set(),played=new Map();let lastPhrase=null;
 const fadeVoice=(voice,now)=>{
  try{
   if(voice.g.gain.cancelAndHoldAtTime)voice.g.gain.cancelAndHoldAtTime(now);
   else{voice.g.gain.cancelScheduledValues(now);voice.g.gain.setValueAtTime(voice.at>now?0:voice.level,now);}
   voice.g.gain.linearRampToValueAtTime(0,now+.025);voice.s.stop(now+.03);
  }catch{}
 };
 function stop(){const now=context.currentTime;for(const voice of voices)fadeVoice(voice,now);voices.clear();played.clear();lastPhrase=null;}
 function tone(event,at,beatSeconds){
  if(!buffers?.size)return; // The prepared piano samples are also the backing instrument.
  const keys=[...buffers.keys()],key=keys.reduce((a,b)=>Math.abs(a-event.pitch)<=Math.abs(b-event.pitch)?a:b);
  const source=context.createBufferSource(),gain=context.createGain(),duration=Math.max(.09,event.duration*beatSeconds);
  source.buffer=buffers.get(key);source.playbackRate.value=2**((event.pitch-key)/12);
  const level=event.gain,release=event.kind==='bass'?.22:.32;
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.012);
  gain.gain.setValueAtTime(level*.7,at+duration);gain.gain.exponentialRampToValueAtTime(.0001,at+duration+release);
  source.connect(gain);gain.connect(destination);const voice={s:source,g:gain,at,level};voices.add(voice);
  source.onended=()=>{voices.delete(voice);source.disconnect();gain.disconnect();};source.start(at);source.stop(at+duration+release+.02);
  // Keep release tails bounded even when test input or recovery arrives rapidly.
  while(voices.size>16){const oldest=voices.values().next().value;fadeVoice(oldest,context.currentTime);voices.delete(oldest);}
 }
 return {play(note,bpm=note.bpm||96,timingErrorSeconds=0){
  const phrase=`${note.song||'piano'}:${note.round||0}`;
  if(lastPhrase!==null&&phrase!==lastPhrase)stop();lastPhrase=phrase;
  const now=context.currentTime,beatSeconds=60/Math.max(60,Math.min(180,bpm));
  const error=Number.isFinite(timingErrorSeconds)?timingErrorSeconds:0,origin=now-error;
  for(const [id,time] of played)if(time<now-16)played.delete(id);
  for(const event of pianoBackingPlan(note)){
   const at=origin+event.beat*beatSeconds;if(at<now-.035||played.has(event.id))continue;
   played.set(event.id,at);tone(event,Math.max(now+.004,at),beatSeconds);
  }
 },stop,dispose:stop};
}
