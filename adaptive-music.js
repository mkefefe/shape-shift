// The selected Endless C recording changes tempo without transposing its notes.
// The other arrangement helpers are retained from the November 3 music preview.
export function centeredPianoBuffer(context,buffer){
 let best=buffer.getChannelData(0),energy=-1;
 for(let c=0;c<buffer.numberOfChannels;c++){const channel=buffer.getChannelData(c);let sum=0;for(const v of channel)sum+=v*v;if(sum>energy){energy=sum;best=channel;}}
 const mono=context.createBuffer(1,buffer.length,buffer.sampleRate),out=mono.getChannelData(0);let peak=.08;for(const v of best)peak=Math.max(peak,Math.abs(v));
 for(let i=0;i<out.length;i++)out[i]=best[i]/peak;
 return mono;
}
async function recordedEndless(context,destination){
 // Keep the approved arrangement exactly. Native media time stretching changes
 // tempo without transposing it; no replacement melody or synthesized timbre.
 const media=new Audio(new URL('./assets/music/endless-c-v228.ogg',import.meta.url));media.preload='auto';media.loop=true;media.preservesPitch=true;
 const source=context.createMediaElementSource(media),gain=context.createGain();gain.gain.value=1;source.connect(gain);gain.connect(destination);
 let bpm=120,target=120,timer=null,playing=false,starting=null,epoch=0;media.playbackRate=bpm/154;
 return {start(){if(playing)return Promise.resolve();if(starting)return starting;const token=epoch;starting=media.play().then(()=>{if(token!==epoch){media.pause();return;}playing=true;timer=setInterval(()=>{if(context.state!=='running')return;bpm+=Math.max(-.7,Math.min(.35,target-bpm));media.playbackRate=bpm/154;},50);}).finally(()=>{starting=null;});return starting;},stop(){epoch++;playing=false;clearInterval(timer);timer=null;media.pause();},setTempo(n,immediate=false){target=Math.max(102,Math.min(170,n));if(immediate){bpm=target;media.playbackRate=bpm/154;}},setVolume(n){gain.gain.setTargetAtTime(Math.max(0,Math.min(1,n)),context.currentTime,.04);},get bpm(){return bpm;},get phrase(){return Math.floor(media.currentTime/(60/154*4))%2?'B':'A';},get playing(){return playing;},dispose(){this.stop();media.removeAttribute('src');media.load();source.disconnect();gain.disconnect();}};
}
export function endlessMusicTempo(intensity=0,recovery=1){
 const base=120+50*Math.max(0,Math.min(1,Number(intensity)||0));
 return base-18*(1-Math.max(0,Math.min(1,Number(recovery)||0)));
}
export function createEndlessMusicState(){
 let highWater=0,recovery=1,lastStage=0;
 return {update({intensity=0,stage=0,rewind=false}={}){
  highWater=Math.max(highWater,Math.max(0,Math.min(1,intensity)));
  if(rewind){recovery=0;lastStage=stage;}
  else if(recovery<1){recovery=Math.min(1,recovery+Math.max(0,stage-lastStage)/19);lastStage=stage;}
  return {baseBpm:120+50*highWater,targetBpm:endlessMusicTempo(highWater,recovery),recovery};
 }};
}
export async function createAdaptiveMusic(context,destination,{mode='endless',assetRoot='assets/music/keys/'}={}){
 if(mode==='endless')return recordedEndless(context,destination);
 const keys=[36,42,48,57,60,66,69,72,78,81],samples=new Map();
 await Promise.all(keys.map(async k=>{const r=await fetch(assetRoot+k+'.ogg');if(!r.ok)throw Error('Piano sample unavailable');samples.set(k,centeredPianoBuffer(context,await context.decodeAudioData(await r.arrayBuffer())));}));
 const bus=context.createGain();bus.gain.value=.5;bus.connect(destination);
 const live=new Set();let playing=false,next=0,step=0,bpm=mode==='endless'?120:mode==='adventure'?112:94,target=bpm,timer;
 const phrases={
  endless:[[76,76,84,76,77,76,72,76],[76,79,84,88,84,81,79,72]],
  adventure:[[72,76,79,76,74,76,72,67],[72,76,79,81,79,76,74,72]],
  drop:[[67,71,74,71,69,71,67,62],[67,69,71,74,71,69,67,62]]
 };
 const progressions={endless:[[48,52,55],[45,48,52],[41,45,48],[43,47,50]],adventure:[[48,52,55],[53,57,60],[45,48,52],[55,59,62]],drop:[[43,47,50],[48,52,55],[40,43,47],[50,54,57]]};
 function voice(p,at,duration,volume,pluck=false){
  const gain=context.createGain();gain.connect(bus);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.006);gain.gain.setValueAtTime(volume,at+duration);gain.gain.exponentialRampToValueAtTime(.0001,at+duration+.16);
  let sources=[];
  if(pluck){for(const [harmonic,weight] of [[1,.8],[2,.25],[3,.13],[4,.05]]){const s=context.createOscillator(),g=context.createGain();s.frequency.value=440*2**((p-69)/12)*harmonic;g.gain.setValueAtTime(weight,at);g.gain.exponentialRampToValueAtTime(.0001,at+duration+.15);s.connect(g);g.connect(gain);s.start(at);s.stop(at+duration+.18);sources.push(s);s.onended=()=>{s.disconnect();g.disconnect();live.delete(s);};live.add(s);}}
  else{const k=keys.reduce((a,b)=>Math.abs(a-p)<=Math.abs(b-p)?a:b),s=context.createBufferSource();s.buffer=samples.get(k);s.playbackRate.value=2**((p-k)/12);s.connect(gain);s.start(at);s.stop(at+duration+.18);sources=[s];live.add(s);s.onended=()=>{s.disconnect();gain.disconnect();live.delete(s);};}
  if(pluck)sources.at(-1).addEventListener('ended',()=>gain.disconnect());
 }
 function kick(at){const o=context.createOscillator(),g=context.createGain();o.frequency.setValueAtTime(105,at);o.frequency.exponentialRampToValueAtTime(52,at+.11);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.075,at+.006);g.gain.exponentialRampToValueAtTime(.0001,at+.15);o.connect(g);g.connect(bus);o.start(at);o.stop(at+.16);live.add(o);o.onended=()=>{live.delete(o);o.disconnect();g.disconnect();};}
 function schedule(){if(!playing||context.state!=='running')return;if(next<context.currentTime-.1)next=context.currentTime+.03;
  while(next<context.currentTime+.10){
   bpm+=Math.max(-2.2,Math.min(1.1,target-bpm));const beat=60/bpm,bar=Math.floor(step/8),i=step%8,phrase=phrases[mode][Math.floor(step/16)%2],chord=progressions[mode][bar%4];
   // Eight-note questions and answers span two bars, with rests and longer
   // endings instead of firing every note at an identical spacing.
   const positions=mode==='drop'?[0,2,4,6,8,9,10,12]:[0,1,3,4,6,8,11,12];
   const noteIndex=positions.indexOf(step%16);
   if(noteIndex>=0){let p=phrase[noteIndex];if(i%4===0){const candidates=chord.flatMap(n=>[n+12,n+24,n+36]);p=candidates.reduce((a,b)=>Math.abs(a-p)<=Math.abs(b-p)?a:b);}
    const gap=((positions[noteIndex+1]??16)-positions[noteIndex])*.5;
    voice(p,next,beat*Math.min(1.3,gap*.78),.19);
   }
   if(i===0||i===4){voice((i===0?chord[0]:chord[2])-12<36?chord[0]:((i===0?chord[0]:chord[2])-12),next,beat*.8,.065);}
   if((mode==='drop'?bar%4===3&&i===0:i===0))chord.forEach((n,j)=>voice(n,next+j*.012,beat*(mode==='drop'?2:1.4),.060));
   if(mode==='endless'&&i%2===0)kick(next);
   next+=beat*.5;step++;
  }
 }
 return {start(){if(playing)return;playing=true;next=context.currentTime+.04;timer=setInterval(schedule,25);schedule();},stop(){playing=false;clearInterval(timer);for(const s of live)try{s.stop();}catch{}live.clear();},setTempo(n){target=Math.max(90,Math.min(170,n));},setVolume(n){bus.gain.setTargetAtTime(Math.max(0,Math.min(1,n)),context.currentTime,.04);},get bpm(){return bpm;},get phrase(){return Math.floor(step/8)%2?'B':'A';},get playing(){return playing;},dispose(){this.stop();bus.disconnect();}};
}
