// Written piano, bass and percussion on the song's beat grid. Notes triggered early
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
// These are written grooves, not random fills. The slower pieces keep a
// half-time backbeat while the brighter songs use a clear two-and-four pulse.
const RHYTHMS={
 indie:{kick:[0,2,2.5],snare:[1,3],hat:[.5,1.5,2.5,3.5],pickup:3.5},
 pulse:{kick:[0,1.5,2],snare:[1,3],hat:[0,.5,1,1.5,2,2.5,3,3.5],pickup:3.5},
 rolling:{kick:[0,2],snare:[1,3],hat:[.5,1,1.5,2.5,3.5],pickup:3.5},
 nocturne:{kick:[0,2],snare:[3],hat:[1.5,3.5],pickup:2.5},
 folk:{kick:[0,2],snare:[1,3],hat:[.5,1.5,3.5],pickup:2.5},
 anthem:{kick:[0,2,3.5],snare:[1,3],hat:[.5,1.5,2.5,3.5],pickup:1.5},
 lofi:{kick:[0,2,2.5],snare:[3],hat:[.5,1.5,3.5],pickup:3.5},
 soul:{kick:[0,1.5,2],snare:[1,3],hat:[.5,2.5,3.5],pickup:3.5},
 sparkle:{kick:[0,2,3.5],snare:[1,3],hat:[.5,1,1.5,2.5,3,3.5],pickup:1.5},
 velvet:{kick:[0,2],snare:[3],hat:[.5,2.5,3.5],pickup:1.5},
 breeze:{kick:[0,2,2.5],snare:[1,3],hat:[.5,1.5,3.5],pickup:3.5},
 lantern:{kick:[0,2],snare:[3],hat:[.5,1.5,2.5],pickup:3.5},
 coast:{kick:[0,2,3.5],snare:[1,3],hat:[.5,1.5,2.5],pickup:1.5},
 clockwork:{kick:[0,1.5,2],snare:[1,3],hat:[.5,1,1.5,2,2.5,3.5],pickup:3.5},
 floating:{kick:[0,2],snare:[3],hat:[.5,1.5,3.5],pickup:2.5},
 ambient:{kick:[0,2],snare:[3],hat:[.5,2.5],pickup:3.5},
 skip:{kick:[0,2,2.5],snare:[1,3],hat:[.5,1.5,2.5,3.5],pickup:1.5},
 snow:{kick:[0,2],snare:[3],hat:[1.5,2.5,3.5],pickup:1.5},
 parade:{kick:[0,2],snare:[1,3],hat:[0,1.5,2,3.5],pickup:2.5},
 nightdrive:{kick:[0,2,2.5],snare:[1,3],hat:[.5,1.5,2,2.5,3.5],pickup:3.5}
};
const register=(pitch,low,high)=>{while(pitch>high)pitch-=12;while(pitch<low)pitch+=12;return pitch;};
export function pianoBackingPlan(note){
 if(!Array.isArray(note.chord)||note.chord.length<3)return [];
 const start=Number(note.songBeat)||0,span=Math.max(.25,Number(note.duration)||1),end=start+span;
 const groove=GROOVES[note.style]||GROOVES.indie,events=[],soft=['Intro','Outro','Bridge'].includes(note.section);
 const rhythm=RHYTHMS[note.style]||RHYTHMS.indie,chorus=note.section==='Chorus';
 const energy=Math.max(.25,Math.min(1,note.energy??.65));
 const high=Math.max(52,Math.min(60,note.pitch-5)),tones=note.chord.map(p=>register(p,40,high));
 for(let bar=Math.floor(start/4);bar*4<end-1e-8;bar++){
  const add=(kind,at,pitch,duration,gain,index)=>{
   if(at<start-1e-8||at>=end-1e-8)return;
   // Harmony never crosses the next written bar. A small release tail is handled
   // by the sampler, while the next melody strike leaves existing voices intact.
   events.push({kind,...(Number.isFinite(pitch)?{pitch}:{}),beat:at-start,songBeat:at,duration:Math.min(duration,(bar+1)*4-at),gain:gain*(.65+energy*.35),
    id:`${note.song||'piano'}:${note.round||0}:${bar}:${kind}:${index}:${pitch??'kit'}`});
  };
  // Root and fifth mark the half-bar pulse, with the written groove's pickup.
  const bass=soft?[0]:[...new Set([0,2,...groove.bass])].sort((a,b)=>a-b);
  bass.forEach((position,i)=>add('bass',bar*4+position,register(note.chord[i%2===0?0:2],33,45),soft?1.6:Math.min(.95,(bass[i+1]??4)-position-.08),soft?.05:chorus?.074:.066,i));
  const arp=soft?[groove.arp[0]]:groove.arp;
  arp.forEach((position,i)=>{
   // A repeated hook keeps its accompaniment voicing too. Absolute bar numbers
   // must not change the arpeggio on the second statement of the same motif.
   const alternate=Number.isInteger(note.motifBar)?note.motifBar===1:bar%4===2;
   const index=(i+(alternate?1:0))%tones.length;
   add('arp',bar*4+position,tones[index],soft?.9:.55,soft?.022:.029,i);
  });
  let kicks=rhythm.kick,snares=rhythm.snare,hats=rhythm.hat,drumLevel=1;
  if(chorus){
   kicks=[...new Set([...kicks,rhythm.pickup])].sort((a,b)=>a-b);
   hats=[...new Set([...hats,0,2])].sort((a,b)=>a-b);
  }
  if(note.section==='Intro'){kicks=[0];snares=[];hats=bar%2?[1.5,3.5]:[];drumLevel=.7;}
  else if(note.section==='Bridge'){kicks=[0,2];snares=[3];hats=[1.5,3.5];drumLevel=.72;}
  else if(note.section==='Outro'){
   // The closing sustained tonic has no drum attacks, leaving its decay intact.
   const closing=note.duration>=4;kicks=closing?[]:[0];snares=[];hats=closing?[]:[1.5];drumLevel=.6;
  }
  kicks.forEach((position,i)=>add('kick',bar*4+position,undefined,.35,(chorus?.60:.54)*drumLevel*(position%2===0?1:.86),i));
  snares.forEach((position,i)=>add('snare',bar*4+position,undefined,.35,(chorus?.32:.28)*drumLevel,i));
  hats.forEach((position,i)=>add('hat',bar*4+position,undefined,.15,(chorus?.12:.10)*drumLevel*(position%1===0?.72:1),i));
 }
 const order={kick:0,bass:1,snare:2,arp:3,hat:4};
 return events.sort((a,b)=>a.beat-b.beat||order[a.kind]-order[b.kind]||(a.pitch??0)-(b.pitch??0));
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
  const pitched=Number.isFinite(event.pitch),keys=[...buffers.keys()].filter(Number.isFinite);
  if(pitched&&!keys.length)return;
  const key=pitched?keys.reduce((a,b)=>Math.abs(a-event.pitch)<=Math.abs(b-event.pitch)?a:b):'flow-'+event.kind;
  if(!buffers.has(key))return;
  const source=context.createBufferSource(),gain=context.createGain(),duration=pitched?Math.max(.09,event.duration*beatSeconds):buffers.get(key).duration;
  source.buffer=buffers.get(key);source.playbackRate.value=pitched?2**((event.pitch-key)/12):1;
  const level=event.gain,release=pitched?(event.kind==='bass'?.22:.32):0;
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+(pitched?.012:.003));
  if(pitched){gain.gain.setValueAtTime(level*.7,at+duration);gain.gain.exponentialRampToValueAtTime(.0001,at+duration+release);}
  else{gain.gain.setValueAtTime(level,at+Math.max(.004,duration-.015));gain.gain.linearRampToValueAtTime(0,at+duration);}
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
