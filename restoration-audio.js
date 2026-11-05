// Effect times use film seconds, so visual speed changes cannot desynchronize them.
export function createRestorationEffects({cues,volume=1,createAudio=src=>new Audio(src),registerMedia=()=>()=>{}}){
 const level=Math.max(0,Math.min(1,Number(volume)||0));
 const effects=level?cues.map(cue=>{const audio=createAudio(new URL('./assets/audio/'+cue.file,import.meta.url).href);audio.volume=level*(cue.gain??1);audio.preload='auto';const off=registerMedia(audio);audio.load();return {...cue,audio,off,fired:false,started:false};}):[];
 let stopped=false,suspended=false;
 const play=cue=>{cue.started=true;Promise.resolve(cue.audio.play()).then(()=>{if(stopped||suspended)cue.audio.pause();}).catch(()=>{cue.started=false;});};
 return {
  step(seconds,{paused=false,enabled=true}={}){
   if(stopped)return;suspended=paused||!enabled;
   for(const cue of effects){
    if(paused||!enabled){if(!enabled&&seconds>=cue.at)cue.fired=true;if(!cue.audio.paused)cue.audio.pause();continue;}
    if(!cue.fired&&seconds>=cue.at){cue.fired=true;play(cue);}
    else if(cue.started&&cue.audio.paused&&!cue.audio.ended)play(cue);
   }
  },
  stop(){if(stopped)return;stopped=true;for(const cue of effects){cue.audio.pause();cue.audio.removeAttribute('src');cue.audio.load();cue.off?.();}}
 };
}
