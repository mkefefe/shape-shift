/* Shape Shift — recorded-piano music and procedural game sound effects. */
(() => {
  'use strict';
  let context, master, musicBus, musicDuck, effectsBus, timer;
  let music = true, sfx = true, active = false;
  let scene = 'menu',menuWorld='garden';
  let musicVolume=40,sfxVolume=65;
  // Slider percentages scale the mix: effects sit in front of the recorded bed.
  const MUSIC_LEVEL=.55,PIANO_MUSIC_LEVEL=1.5,SFX_LEVEL=2;
  const musicLevel=()=>scene==='piano'?PIANO_MUSIC_LEVEL:MUSIC_LEVEL;
  const volumeValue=(value,fallback)=>Number.isFinite(Number(value))?Math.max(0,Math.min(100,Number(value))):fallback;
  let effectPitch=1,effectGain=1;const previousPitch=new Map();
  const midi = n => 440 * 2 ** ((n - 69) / 12);

  // Optional recordings load on demand; a stalled request must be retryable.
  async function audioData(url){
    const controller=typeof AbortController==='function'?new AbortController():null;
    const timeout=controller?window.setTimeout?.(()=>controller.abort(),12000):null;
    try{const response=await fetch(url,controller?{signal:controller.signal}:undefined);if(!response.ok)throw Error('Audio unavailable');return await response.arrayBuffer();}
    finally{if(timeout!==null)window.clearTimeout?.(timeout);}
  }

  function setup() {
    if (context) return true;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    context = new AudioContext({latencyHint:'interactive'});
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.ratio.value = 8;
    compressor.knee.value=9;compressor.attack.value=.001;compressor.release.value=.18;
    master = context.createGain(); master.gain.value = window.ShapeShiftPlatform.audioAllowed ? 0.52 : 0;
    musicBus = context.createGain(); musicBus.gain.value = music ? musicLevel()*musicVolume/100 : 0;
    effectsBus = context.createGain(); effectsBus.gain.value = sfx ? SFX_LEVEL*sfxVolume/100 : 0;
    // A centered mono effects bus feeds both output speakers equally.
    effectsBus.channelCount=1;effectsBus.channelCountMode='explicit';effectsBus.channelInterpretation='speakers';
    musicDuck=context.createGain();musicDuck.gain.value=1;musicBus.connect(musicDuck);musicDuck.connect(master); effectsBus.connect(master); master.connect(compressor); compressor.connect(context.destination);
    return true;
  }

  function tone(freq, time, length, volume, type = 'sine', bus = musicBus, endFreq) {
    if(bus===effectsBus){volume*=effectGain;freq*=effectPitch;if(endFreq)endFreq*=effectPitch;}
    const osc = context.createOscillator(), envelope = context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, time);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, time + length);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), time + Math.min(0.012, length / 4));
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + length);
    osc.connect(envelope); envelope.connect(bus);
    osc.start(time); osc.stop(time + length + 0.015);
    osc.onended = () => { osc.disconnect(); envelope.disconnect(); };
  }

  let noiseBuffer;
  function noise(time, length, volume, cutoff, bus = musicBus) {
    if(bus===effectsBus)volume*=effectGain;
    if (!noiseBuffer) {
      noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      // Reproducible noise texture; no external samples.
      let seed = 43121;
      for (let i = 0; i < data.length; i++) { seed = (seed * 16807) % 2147483647; data[i] = seed / 1073741824 - 1; }
    }
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = noiseBuffer; filter.type = 'highpass'; filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(volume, time); gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    source.connect(filter); filter.connect(gain); gain.connect(bus); source.start(time); source.stop(time + length);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  let victorySources=[];
  function stopVictory(){
    for(const source of victorySources){try{source.stop();}catch{}}
    victorySources=[];
  }
  const victoryBuffers=new Map(),victoryLoads=new Map();let victorySpark=0,victoryWarm;
  function prepareVictory(){
    if(!setup())return Promise.resolve(false);
    if(victoryWarm)return victoryWarm;
    // Avoid fourteen simultaneous audio decodes during the first playable frame.
    victoryWarm=(async()=>{let ready=true;
      for(const name of ['transform','gather','burst','spark0','spark1','spark2','spark3','resolve','panel','reward-fill','reward-flight','reward-land1','reward-land2','reward-land3']){
        if(victoryBuffers.has(name))continue;
        await new Promise(resolve=>window.setTimeout(resolve,120));
        if(!victoryLoads.has(name))victoryLoads.set(name,audioData('assets/audio/victory-'+name+(name.startsWith('reward-')?'-v49459.ogg':['burst','spark0','spark1','spark2','spark3'].includes(name)?'-v49436.ogg':'-v4947.ogg')).then(data=>context.decodeAudioData(data)).then(buffer=>{victoryBuffers.set(name,buffer);return true;}).catch(()=>{victoryLoads.delete(name);return false;}));
        if(!await victoryLoads.get(name))ready=false;
      }return ready;
    })().finally(()=>{victoryWarm=null;});return victoryWarm;
  }
  // Piano and firework impacts share one recording and one playback clock.
  function victoryCue(name,time){
    if(name==='transform'){stopVictory();victorySpark=0;}
    if(name==='spark'){name='spark'+(victorySpark++%4);}
    const buffer=victoryBuffers.get(name);if(!buffer)return;
    const source=context.createBufferSource();source.buffer=buffer;
    const gain=context.createGain();gain.connect(effectsBus);source.connect(gain);
    // Keep the logo docking swish brief and fade its tail without a click.
    const length=name==='panel'?Math.min(.22,buffer.duration):buffer.duration;
    if(name==='resolve')gain.gain.setValueAtTime(.2,time);
    if(name==='panel'){gain.gain.setValueAtTime(1,time);gain.gain.setValueAtTime(1,time+Math.max(0,length-.06));gain.gain.linearRampToValueAtTime(0,time+length);}
    victorySources.push(source);source.onended=()=>{source.disconnect();gain.disconnect();victorySources=victorySources.filter(item=>item!==source);};
    source.start(time);if(name==='panel')source.stop(time+length);
  }

  function softSweep(time,length,from,to,volume=.07){
    volume*=effectGain;
    // Smooth band-limited air rather than a buzzy oscillator or sharp hiss.
    if(!noiseBuffer){noise(time,.001,.0001,1000,effectsBus);}
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=noiseBuffer;
    from*=effectPitch;to*=effectPitch;filter.type='bandpass';filter.Q.value=.65;filter.frequency.setValueAtTime(from,time);filter.frequency.exponentialRampToValueAtTime(to,time+length);
    gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+length*.35);gain.gain.exponentialRampToValueAtTime(.0001,time+length);
    source.connect(filter);filter.connect(gain);gain.connect(effectsBus);source.start(time);source.stop(time+length);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }

  // Rounded low impact with a filtered, falling debris tail; no sharp hiss/beep.
  function sliceBomb(time){
    if(!noiseBuffer)noise(time,.001,.0001,1000,effectsBus);
    const layers=[
      {delay:0,length:.42,from:780,to:95,volume:.44,attack:.018},
      {delay:.055,length:.75,from:1800,to:240,volume:.15,attack:.075}
    ];
    for(const layer of layers){
      const start=time+layer.delay,source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
      source.buffer=noiseBuffer;filter.type='lowpass';filter.Q.value=.55;
      filter.frequency.setValueAtTime(layer.from*effectPitch,start);filter.frequency.exponentialRampToValueAtTime(layer.to*effectPitch,start+layer.length);
      gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(layer.volume*effectGain,start+layer.attack);gain.gain.exponentialRampToValueAtTime(.0001,start+layer.length);
      source.connect(filter);filter.connect(gain);gain.connect(effectsBus);source.start(start);source.stop(start+layer.length);
      source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
    }
    tone(74,time,.46,.24,'sine',effectsBus,42);
  }

  // A quiet, unpitched air texture follows the blade. No sustained musical
  // tones: the separate short cut sound supplies impact when a shape splits.
  let sliceVoice=null,sliceAirBuffer=null;
  function sliceMotion(value){
    const speed=Math.max(0,Math.min(1,Number(value)||0));
    if(!context||!active||!sfx||sfxVolume<=0||context.state!=='running'||window.ShapeShiftPlatform.paused){stopSlice();return;}
    if(!sliceVoice&&speed<.005)return;
    const now=context.currentTime;
    if(!sliceVoice){
      if(!sliceAirBuffer){
        const length=context.sampleRate*2,fade=Math.min(1024,Math.floor(context.sampleRate*.02));
        sliceAirBuffer=context.createBuffer(1,length,context.sampleRate);
        const data=sliceAirBuffer.getChannelData(0),raw=new Float32Array(length+fade);let seed=81917;
        for(let i=0;i<raw.length;i++){seed=(seed*16807)%2147483647;raw[i]=seed/1073741824-1;}
        for(let i=0;i<length;i++){const blend=i<fade?(1-Math.cos(Math.PI*i/fade))/2:1;data[i]=i<fade?raw[length+i]*(1-blend)+raw[i]*blend:raw[i];}
      }
      const air=context.createBufferSource(),filter=context.createBiquadFilter(),warmth=context.createBiquadFilter(),airGain=context.createGain(),gain=context.createGain();
      air.buffer=sliceAirBuffer;air.loop=true;filter.type='bandpass';filter.Q.value=.45;filter.frequency.value=850;warmth.type='lowpass';warmth.Q.value=.5;warmth.frequency.value=3200;airGain.gain.value=.22;gain.gain.value=0;
      air.connect(filter);filter.connect(warmth);warmth.connect(airGain);airGain.connect(gain);gain.connect(effectsBus);
      const sources=[air],nodes=[air,filter,warmth,airGain,gain];
      sliceVoice={sources,nodes,filter,gain};air.start(now);
    }
    sliceVoice.gain.gain.setTargetAtTime(speed<.005?0:Math.sqrt(speed)*.44,now,.035);
    sliceVoice.filter.frequency.setTargetAtTime(750+speed*1050,now,.07);
  }
  function stopSlice(){
    if(!sliceVoice)return;const voice=sliceVoice;sliceVoice=null;const now=context.currentTime;
    voice.gain.gain.setTargetAtTime(0,now,.025);
    voice.sources[0].onended=()=>{for(const node of voice.nodes)node.disconnect();};
    for(const source of voice.sources)source.stop(now+.16);
  }

  const pianoKeys=[36,42,48,57,60,66,69,72,78,81],pianoBuffers=new Map(),pianoLoads=new Map(),pianoVoices=new Set();
  // Some recorded keys have opposite stereo phases. Folding those to mono
  // cancels their body on phone speakers, so keep the stronger original channel.
  function pianoMono(buffer){
    if(!buffer.getChannelData||buffer.numberOfChannels<2)return buffer;
    const left=buffer.getChannelData(0),right=buffer.getChannelData(1);let ll=0,rr=0,lr=0;
    for(let i=0;i<left.length;i++){ll+=left[i]*left[i];rr+=right[i]*right[i];lr+=left[i]*right[i];}
    const out=context.createBuffer(1,buffer.length,buffer.sampleRate),data=out.getChannelData(0);
    if(lr<0)data.set(ll>=rr?left:right);else for(let i=0;i<data.length;i++)data[i]=(left[i]+right[i])*.5;
    return out;
  }
  const pianoRooms=new Map();let pianoImpulse;
  function pianoRoom(accompaniment){
    if(!context.createConvolver)return null;
    if(pianoRooms.has(accompaniment))return pianoRooms.get(accompaniment).convolver;
    if(!pianoImpulse){
      const rate=context.sampleRate,length=Math.floor(rate*1.25);pianoImpulse=context.createBuffer(2,length,rate);
      for(let channel=0;channel<2;channel++){
        const data=pianoImpulse.getChannelData(channel);let seed=7319+channel*1237;
        for(let i=Math.floor(rate*.018);i<length;i++){seed=(seed*16807)%2147483647;const t=i/rate;data[i]=(seed/1073741824-1)*.018*Math.exp(-t*6)*Math.min(1,t/.06);}
        for(const [delay,level] of [[.027,.18],[.047,.12],[.081,.07]])data[Math.floor((delay+channel*.004)*rate)]+=level;
      }
    }
    const convolver=context.createConvolver(),wet=context.createGain();convolver.normalize=false;convolver.buffer=pianoImpulse;wet.gain.value=accompaniment?.16:.22;
    convolver.connect(wet);wet.connect(accompaniment?musicBus:effectsBus);pianoRooms.set(accompaniment,{convolver,wet});return convolver;
  }
  async function preparePiano(){
    if(!setup())return false;
    const ready=await Promise.all([...pianoKeys,'kick','clap','shaker'].map(key=>{
      if(pianoBuffers.has(key))return true;
      const url=typeof key==='number'?'assets/music/keys/'+key+'.ogg':'assets/music/pop-'+key+'-v322.ogg';
      if(!pianoLoads.has(key))pianoLoads.set(key,audioData(url).then(data=>context.decodeAudioData(data)).then(buffer=>{pianoBuffers.set(key,typeof key==='number'?pianoMono(buffer):buffer);return true;}).catch(()=>{pianoLoads.delete(key);return false;}));
      return pianoLoads.get(key);
    }));return ready.every(Boolean);
  }
  function stopPiano(accompaniment){
    for(const voice of [...pianoVoices])if(accompaniment===undefined||voice.accompaniment===accompaniment)voice.release();
    for(const [kind,room] of pianoRooms)if(accompaniment===undefined||kind===accompaniment){room.convolver.disconnect();room.wet.disconnect();pianoRooms.delete(kind);}
  }
  function pianoNote(note,duration=.35,accompaniment=false,velocity=1){
    if(!context||!active||scene!=='piano'||context.state!=='running'||window.ShapeShiftPlatform.paused||!Number.isFinite(note)||note<36||note>96||!(accompaniment?music&&musicVolume>0:sfx&&sfxVolume>0))return ()=>{};
    const key=pianoKeys.reduce((a,b)=>Math.abs(a-note)<=Math.abs(b-note)?a:b),buffer=pianoBuffers.get(key);if(!buffer)return ()=>{};
    if(pianoVoices.size>=32)pianoVoices.values().next().value.release();
    const source=context.createBufferSource(),gain=context.createGain(),warmth=context.createBiquadFilter(),now=context.currentTime,hold=Math.max(.08,Math.min(5,Number(duration)||.35)),volume=(accompaniment?.72:.9)*volumeValue(velocity*100,100)/100;
    source.buffer=buffer;source.playbackRate.value=2**((note-key)/12);gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(volume,now+.008);gain.gain.setValueAtTime(volume,now+hold);gain.gain.exponentialRampToValueAtTime(.0001,now+hold+.48);
    warmth.type='lowpass';warmth.frequency.value=accompaniment?2900:4200;warmth.Q.value=.55;
    source.connect(warmth);warmth.connect(gain);gain.connect(accompaniment?musicBus:effectsBus);const room=pianoRoom(accompaniment);if(room)gain.connect(room);
    let released=false;const voice={accompaniment,release(){if(released)return;released=true;pianoVoices.delete(voice);const t=context.currentTime;gain.gain.cancelScheduledValues(t);gain.gain.setTargetAtTime(0,t,.09);try{source.stop(t+.36);}catch{}}};
    pianoVoices.add(voice);source.onended=()=>{pianoVoices.delete(voice);source.disconnect();warmth.disconnect();gain.disconnect();};source.start(now);source.stop(now+hold+.5);return voice.release;
  }

  function pianoBeat(pulse,energy=1){
    if(!context||!active||scene!=='piano'||context.state!=='running'||window.ShapeShiftPlatform.paused||!music||musicVolume<=0||!Number.isInteger(pulse)||pulse<0)return;
    const step=pulse%8,bar=Math.floor(pulse/8);
    const hits=[];
    // A restrained pulse leaves the player's melody in front. Sparse intros
    // gain a little percussion in the chorus rather than sounding equally loud.
    if(energy>.6||step%2===0)hits.push(['shaker',step%2?.065:.095]);
    if(step===0||step===4&&energy>.6)hits.push(['kick',step===0?.46:.34]);
    if((step===2||step===6)&&energy>.6)hits.push(['clap',.19]);
    if(bar%8===7&&step===7&&energy>.85)hits.push(['shaker',.045]);
    for(const [key,volume] of hits){
      const buffer=pianoBuffers.get(key);if(!buffer)continue;
      const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=volume*Math.max(0,Math.min(1,energy));source.connect(gain);gain.connect(musicBus);
      let released=false;const voice={accompaniment:true,release(){if(released)return;released=true;pianoVoices.delete(voice);gain.gain.setTargetAtTime(0,context.currentTime,.01);try{source.stop(context.currentTime+.04);}catch{}}};
      pianoVoices.add(voice);source.onended=()=>{pianoVoices.delete(voice);source.disconnect();gain.disconnect();};source.start(context.currentTime);source.stop(context.currentTime+Math.min(.4,buffer.duration));
    }
  }

  const musicTracks={'menu-garden':'assets/music/menu-garden-v49458.ogg','menu-moon':'assets/music/menu-moon-v49458.ogg','menu-sunset':'assets/music/menu-sunset-v49458.ogg',game:'assets/music/groove-game-v49431.ogg',slice:'assets/music/groove-slice-v49431.ogg',drop:'assets/music/groove-drop-v49431.ogg'};
  const musicTrack=()=>scene==='menu'?'menu-'+menuWorld:scene;
  const musicBuffers=new Map(),musicRetry=new Map(),musicPositions=Object.fromEntries(Object.keys(musicTracks).map(key=>[key,0]));
  let musicVoice=null,musicEpoch=0,musicPending=null;
  function musicBuffer(name){
    if(!musicBuffers.has(name)){
      const request=audioData(musicTracks[name])
        .then(data=>context.decodeAudioData(data)).catch(()=>{musicBuffers.delete(name);musicRetry.set(name,context.currentTime+5);return null;});
      musicBuffers.set(name,request);
    }
    return musicBuffers.get(name);
  }
  function stopMusicTrack(fade=.12){
    musicEpoch++;musicPending=null;
    if(!musicVoice)return;
    const voice=musicVoice;musicVoice=null;const now=context.currentTime;
    musicPositions[voice.name]=(voice.offset+Math.max(0,now-voice.startedAt))%voice.source.buffer.duration;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(Math.min(1,Math.max(0,(now-voice.startedAt)/voice.fadeIn)),now);
    if(fade){voice.gain.gain.setTargetAtTime(0,now,fade/4);voice.source.stop(now+fade);}
    else voice.source.stop(now);
  }
  function schedule(){
    if(!active||context.state!=='running'||!music||musicVolume<=0||window.ShapeShiftPlatform.paused){
      if(musicVoice||musicPending)stopMusicTrack();return;
    }
    if(scene==='piano')return;
    const name=musicTrack();
    if(musicVoice?.name===name||musicPending===name||context.currentTime<(musicRetry.get(name)||0))return;
    const epoch=musicEpoch;musicPending=name;
    musicBuffer(name).then(buffer=>{
      if(epoch!==musicEpoch)return;musicPending=null;
      if(!buffer||!active||!music||musicVolume<=0||window.ShapeShiftPlatform.paused||context.state!=='running'||musicTrack()!==name)return;
      // Keep the current world's music alive while the next one decodes,
      // then blend between themes. Stale pending loads cannot start a wrong song.
      if(musicVoice)stopMusicTrack(.85);
      const source=context.createBufferSource(),gain=context.createGain(),now=context.currentTime,fadeIn=scene==='menu'?.85:.3;
      const offset=musicPositions[name]%buffer.duration;
      source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=buffer.duration;
      gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+fadeIn);
      source.connect(gain);gain.connect(musicBus);
      const voice={name,source,gain,offset,startedAt:now,fadeIn};musicVoice=voice;
      source.onended=()=>{source.disconnect();gain.disconnect();if(musicVoice===voice)musicVoice=null;};
      source.start(now,offset);
    });
  }

  async function start() {
    if (!window.ShapeShiftPlatform.audioAllowed) return;
    if (!setup()) return;
    try { if (context.state !== 'running') await context.resume(); } catch (_) { return; }
    // Warm celebration samples after the first gesture without delaying play.
    // Calling start again retries only failed recordings.
    void prepareVictory();
    if (active) return;
    active = true;
    schedule(); timer = window.ShapeShiftPlatform.setInterval(schedule, 100);
  }

  function setMenuWorld(value){
    const next=['garden','moon','sunset'].includes(value)?value:'garden';if(menuWorld===next)return;menuWorld=next;
    if(scene==='menu'&&context){musicEpoch++;musicPending=null;schedule();}
  }
  function setScene(value,{preservePraise=false}={}) {
    const target=['menu','game','slice','drop','piano'].includes(value)?value:'menu';
    if(target===scene)return;if(!preservePraise)stopVoice();stopSlice();stopPiano();
    if(target==='piano')stopMusicTrack(.2);scene=target;if(context){
      musicBus.gain.setTargetAtTime(music?musicLevel()*musicVolume/100:0,context.currentTime,.08);
      duckEnvelope=null;musicDuck.gain.cancelScheduledValues(context.currentTime);musicDuck.gain.setTargetAtTime(1,context.currentTime,.08);schedule();
    }
  }
  function setMusic(value) {
    music = Boolean(value);if(!music||musicVolume<=0)stopPiano(true);
    if (musicBus) musicBus.gain.setTargetAtTime(music ? musicLevel()*musicVolume/100 : 0, context.currentTime, 0.08);
    if(context){if(!music||musicVolume<=0)stopMusicTrack();else schedule();}
  }
  function setSfx(value) {
    sfx = Boolean(value);if(!sfx||sfxVolume<=0){stopVoice();stopSlice();stopPiano(false);stopVictory();}
    if (effectsBus) effectsBus.gain.setTargetAtTime(sfx ? SFX_LEVEL*sfxVolume/100 : 0, context.currentTime, 0.015);
  }
  function setMusicVolume(value){musicVolume=volumeValue(value,40);setMusic(music);}
  function setSfxVolume(value){sfxVolume=volumeValue(value,65);setSfx(sfx);}
  let duckEnvelope=null;
  function duckLevel(now){
    if(!duckEnvelope)return 1;const {start,from,down,hold,end}=duckEnvelope;
    if(now<down)return from+(.5-from)*Math.max(0,(now-start)/(down-start));
    if(now<hold)return .5;
    if(now<end)return .5+.5*(now-hold)/(end-hold);
    return 1;
  }
  function duckMusic(seconds){
    if(!musicDuck)return;const now=context.currentTime,current=duckLevel(now);
    const down=duckEnvelope&&now<duckEnvelope.down?duckEnvelope.down:now+.08;
    const hold=Math.max(down,now+seconds,duckEnvelope?.hold||0),end=hold+.55;
    musicDuck.gain.cancelScheduledValues(now);
    musicDuck.gain.setValueAtTime(current,now);
    musicDuck.gain.linearRampToValueAtTime(.5,down);
    musicDuck.gain.setValueAtTime(.5,hold);
    musicDuck.gain.linearRampToValueAtTime(1,end);
    duckEnvelope={start:now,from:current,down,hold,end};
  }
  const lastMiniCue=new Map();
  function play(name) {
    if (!context || !sfx || sfxVolume<=0 || context.state !== 'running') return;
    if(/^(drop-|slice-)/.test(name)){const last=lastMiniCue.get(name)??-100;if(context.currentTime-last<(name==='slice-fall'?.22:.065))return;lastMiniCue.set(name,context.currentTime);}
    // Correct picks vary slightly upward only; other cues retain subtle variation.
    let variant=Math.floor(Math.random()*9);if(variant===previousPitch.get(name))variant=(variant+1+Math.floor(Math.random()*8))%9;previousPitch.set(name,variant);effectPitch=2**(((name==='correct'||name==='match'||/^(special-|rewind-|heart-fill|shield-arrive|skill-points|shield$)/.test(name))?variant*.06:(variant-4)*.2)/12);
    if(['quest-complete','quest-collect','quest-wallet','coin-arrive'].includes(name))effectPitch=2**((variant-4)*.045/12);
    effectGain=/^(special-|rewind-|heart-fill|shield-arrive|skill-points)/.test(name)?1.7:1;
    const now = context.currentTime;
    const duckLengths={'victory':.3,'victory-panel':.22,'victory-transform':.18,'victory-gather':.3,'victory-burst':.9,'victory-spark':.7,'rock-crack':.28,'rock-break':.6,'streak-praise':.45,'lightning-finish':.65,'special-starburst':4.0,'special-reset':3.6,'special-heart':2.2,'special-crystal':1.15,'special-hourglass':1.25,'skill-points':.9,'quest-complete':.65,'quest-collect':.8,'quest-wallet':.65,'achievement-complete':.8,'colorstreak':.7,'bonus':.65,'over':.85,'gameover':.85,'level':.65,'levelup':.65,'start':.5,'wrong':.4,'error':.4,'purchase':.4,'shield':.6,'shield-hit':.65};
    // Routine Slice swipes and Piano Flow taps leave their backing music steady.
    if(scene!=='menu'&&!/^slice-(launch|fall|swish|cut|chip)$/.test(name)&&(scene!=='piano'||['piano-miss','wrong','error','over','gameover'].includes(name)))duckMusic(duckLengths[name]??.22);
    const notes = (list, spacing, length, volume = 0.2) => list.forEach((n, i) => tone(midi(n), now + i * spacing, length, volume, 'sine', effectsBus));
    switch (name) {
      case 'victory-transform': victoryCue('transform',now);break;
      case 'victory-gather': victoryCue('gather',now);break;
      case 'victory-burst': victoryCue('burst',now);break;
      case 'victory-spark': victoryCue('spark',now);break;
      case 'victory': victoryCue('resolve',now);break;
      case 'victory-panel': victoryCue('panel',now);break;
      case 'piano-miss': tone(196,now,.2,.08,'sine',effectsBus,130);break;
      case 'jumper-hop': tone(480,now,.13,.075,'sine',effectsBus,850);tone(960,now+.025,.08,.025,'triangle',effectsBus);break;
      case 'jumper-morph': notes([76,83],.045,.16,.07);softSweep(now,.14,500,1400,.035);break;
      case 'jumper-coin': notes([88,95],.045,.15,.065);break;
      case 'jumper-fall': tone(360,now,.3,.11,'sine',effectsBus,100);softSweep(now,.25,900,170,.05);break;
      case 'drop-block': tone(150,now,.18,.15,'triangle',effectsBus,65);noise(now,.07,.06,600,effectsBus);break;
      case 'drop-release': tone(500,now,.13,.13,'sine',effectsBus,210);softSweep(now,.10,900,350,.045);break;
      case 'drop-pop': tone(360,now,.09,.17,'sine',effectsBus,950);tone(1397,now+.035,.18,.065,'sine',effectsBus);break;
      case 'drop-chain': notes([79,86,91],.045,.17,.09);break;
      case 'slice-launch': softSweep(now,.19,340,1100,.105);break;
      case 'slice-fall': softSweep(now,.17,850,300,.06);break;
      case 'slice-swish': softSweep(now,.14,1350,650,.15);break;
      case 'slice-cut': softSweep(now,.125,1850,650,.22);tone(540,now,.065,.12,'sine',effectsBus,220);break;
      case 'slice-chip': softSweep(now,.085,1550,750,.12);tone(680,now,.045,.055,'sine',effectsBus,340);break;
      case 'slice-bomb': sliceBomb(now);break;
      case 'slice-miss': tone(440,now,.16,.10,'sine',effectsBus,220);tone(196,now+.09,.15,.055,'triangle',effectsBus);break;
      case 'correct': case 'match': {const f=1046;tone(f,now,.13,.12,'sine',effectsBus,f*1.12);tone(f*1.5,now+.025,.10,.035,'sine',effectsBus);break;}
      case 'wrong': case 'error': tone(220, now, 0.18, 0.3, 'sawtooth', effectsBus, 85); tone(165, now + 0.11, 0.22, 0.24, 'square', effectsBus, 55); noise(now, 0.1, 0.13, 550, effectsBus); break;
      case 'rock-crack':
        // Short dry stone snap with small bright chips.
        noise(now,.055,.16,1600,effectsBus);
        tone(740,now,.075,.10,'triangle',effectsBus,510);
        tone(1480,now+.035,.055,.045,'sine',effectsBus);
        noise(now+.065,.04,.065,2500,effectsBus);break;
      case 'rock-break':
        // Wider fracture followed by a diminishing scatter of fragments.
        noise(now,.12,.19,950,effectsBus);
        tone(620,now,.13,.12,'triangle',effectsBus,420);
        [0,.065,.14,.23,.34].forEach((delay,i)=>{
          noise(now+.045+delay,.045,.085/(1+i*.4),1700+i*340,effectsBus);
          tone(1100+i*165,now+.055+delay,.065,.055/(1+i*.4),'sine',effectsBus);
        });break;
      case 'skip': tone(460, now, 0.07, 0.08, 'sine', effectsBus, 330); break;
      case 'quest-complete':
        // Warm marimba-like confirmation, separate from the coin collection sound.
        [659,784,988].forEach((f,i)=>tone(f,now+i*.10,.24,.085,'sine',effectsBus));break;
      case 'quest-collect':
        // Immediate soft pluck, followed by a short, relaxed reward phrase.
        tone(784,now,.20,.115,'sine',effectsBus);tone(988,now+.075,.23,.075,'sine',effectsBus);tone(1175,now+.18,.28,.055,'sine',effectsBus);break;
      case 'streak-praise': notes([79,83,86],.075,.22,.13);break;
      case 'lightning-finish': notes([76,81,85,88],.09,.32,.14);break;
      case 'objective-fill': victoryCue('reward-fill',now);break;
      case 'star-flight': victoryCue('reward-flight',now);break;
      case 'star-land-1': case 'star-land-2': case 'star-land-3': victoryCue('reward-land'+name.slice(-1),now);break;
      case 'result-xp-tick': tone(1046,now,.06,.065,'sine',effectsBus,1320);break;
      case 'result-score-tick': tone(660,now,.055,.045,'triangle',effectsBus,820);break;
      case 'result-coin-tick': tone(1100,now,.065,.045,'sine',effectsBus,1450);break;
      case 'result-tally-done': tone(784,now,.17,.065,'triangle',effectsBus);tone(1175,now+.07,.22,.045,'sine',effectsBus);break;
      case 'quest-release':
        // A soft resolution as the claimed card dissolves; one cue per batch.
        tone(988,now,.26,.045,'sine',effectsBus);tone(1319,now+.045,.30,.028,'sine',effectsBus);tone(1568,now+.09,.32,.018,'sine',effectsBus);break;
      case 'quest-wallet': tone(1046,now,.22,.14,'sine',effectsBus);tone(1568,now+.045,.26,.065,'sine',effectsBus);break;
      case 'coin-arrive': tone(784,now,.23,.07,'sine',effectsBus);tone(1175,now+.035,.28,.032,'sine',effectsBus);break;
      case 'achievement-complete': notes([60,67,72,79],.1,.4,.10);break;
      case 'menu-quests': tone(440,now,.075,.085,'triangle',effectsBus);tone(880,now+.09,.12,.055,'sine',effectsBus);break;
      case 'menu-achievements': tone(587,now,.22,.07,'sine',effectsBus);tone(880,now+.06,.22,.05,'sine',effectsBus);break;
      case 'countdown': tone(660,now,.10,.095,'sine',effectsBus);break;
      case 'purchase': notes([79,84,88,91],.045,.18,.16);tone(1800,now,.09,.035,'sine',effectsBus,900);break;
      case 'special-starburst':
        notes([84,88,91,96],.09,.24,.105);softSweep(now,.38,1200,2600,.025);break;
      case 'special-impact':
        tone(1318,now,.14,.045,'sine',effectsBus);tone(1976,now+.025,.12,.02,'sine',effectsBus);break;
      case 'special-point':
        // Bright centered coin chime, separated by the per-tile reward cadence.
        tone(1397,now,.10,.115,'sine',effectsBus,1568);tone(2093,now+.022,.075,.035,'sine',effectsBus);break;
      case 'special-reset':
        notes([81,86,91],.12,.23,.10);softSweep(now,.42,1000,2200,.025);break;
      case 'rewind-fold':
        tone(880,now,.13,.09,'sine',effectsBus,1175);tone(1568,now+.06,.12,.035,'sine',effectsBus);break;
      case 'rewind-settle':
        notes([84,88,91],.055,.30,.095);break;
      case 'special-heart':
        notes([81,85,88],.11,.26,.11);break;
      case 'heart-fill':
        tone(1175,now,.17,.12,'sine',effectsBus,1397);tone(1760,now+.045,.13,.035,'sine',effectsBus);break;
      case 'special-crystal':
        notes([84,91,96],.085,.30,.10);tone(1568,now+.04,.21,.035,'triangle',effectsBus);break;
      case 'shield-arrive':
        tone(1046,now,.22,.105,'sine',effectsBus);tone(1568,now+.06,.28,.06,'sine',effectsBus);break;
      case 'special-hourglass':
        [0,.13,.34,.66].forEach((t,i)=>{const f=[880,1046,1318,1568][i];tone(f,now+t,.20,.105,'sine',effectsBus);tone(f*1.5,now+t+.025,.12,.025,'sine',effectsBus);});break;
      case 'skill-points': notes([79,84,88,91],.075,.24,.12);break;
      case 'colorstreak': notes([72,76,79,84,91],.07,.3,.22);break;
      case 'bonus': notes([72,76,79,84,88], .055, .25, .2); break;
      case 'shield-hit':
        // A low impact and falling metallic ring distinguish a block from activation.
        noise(now,.075,.22,1800,effectsBus);
        tone(180,now,.25,.48,'triangle',effectsBus,65);
        tone(1250,now,.38,.28,'sine',effectsBus,430);
        tone(1870,now+.015,.24,.13,'sine',effectsBus,710);
        break;
      case 'shield': {
        // Preserve the preview timbre, but give its chimes a clear foreground envelope.
        for(const [hz,delay,length,level,type] of [[155,0,.16,.42,'triangle'],[659,.045,.34,.30,'sine'],[988,.095,.45,.24,'sine']]){
          const at=now+delay,osc=context.createOscillator(),gain=context.createGain();
          osc.type=type;osc.frequency.setValueAtTime(hz,at);
          gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.008);
          gain.gain.setValueAtTime(level,at+.035);gain.gain.exponentialRampToValueAtTime(.0001,at+length);
          osc.connect(gain);gain.connect(effectsBus);osc.start(at);osc.stop(at+length+.02);
          osc.onended=()=>{osc.disconnect();gain.disconnect();};
        }
        break;
      }
      case 'level': case 'levelup': notes([74, 77, 81, 86], 0.085, 0.3, 0.18); break;
      case 'over': case 'gameover': notes([77, 74, 69, 62], 0.14, 0.4, 0.16); break;
      case 'start': notes([62, 69, 74], 0.075, 0.22); break;
      case 'map-locked': tone(740,now,.09,.10,'sine',effectsBus);tone(554,now+.095,.15,.08,'triangle',effectsBus);break;
      case 'surface-tap': tone(560,now,.065,.075,'sine',effectsBus,680);break;
      case 'leave-result': tone(660,now,.10,.09,'triangle',effectsBus,440);tone(330,now+.065,.14,.045,'sine',effectsBus);break;
      case 'click': tone(720,now,.065,.13,'sine',effectsBus,1040);tone(1440,now+.012,.045,.025,'sine',effectsBus);break;
      case 'avatar': tone(380,now,.12,.13,'sine',effectsBus,900);tone(1100,now+.055,.08,.07,'sine',effectsBus);break;
      case 'randomize': notes([72,79,74,86],.04,.075,.11);break;
      case 'menu-shop': notes([76,83],.075,.14,.11);break;
      case 'menu-ranks': notes([67,74,79],.06,.16,.1);break;
      case 'menu-settings': tone(480,now,.075,.11,'triangle',effectsBus);tone(620,now+.07,.07,.08,'triangle',effectsBus);break;
      case 'menu-profile': notes([69,76],.06,.12,.1);break;
      case 'menu-reward': notes([79,88,91],.06,.15,.1);break;
      case 'close': tone(640,now,.09,.1,'sine',effectsBus,360);break;
      case 'save': notes([72,76,84],.055,.18,.12);break;
      case 'info': tone(880,now,.09,.075,'sine',effectsBus,1080);break;
      case 'age-tick': tone(990,now,.045,.065,'sine',effectsBus,1100);break;
      case 'toggle': tone(520,now,.06,.085,'triangle',effectsBus,740);break;
      default: break;
    }
  }
  // One licensed recorded announcer; do not synthesize missing phrases.
  const praiseClips={'Excellent!':'excellent','Impressive!':'impressive','Perfect!':'perfect'};
  const voiceBuffers=new Map();let voiceSource=null,voiceEpoch=0;
  function voiceBuffer(name){
    if(!voiceBuffers.has(name))voiceBuffers.set(name,fetch('assets/praise/'+name+'.wav').then(r=>{if(!r.ok)throw Error('Voice unavailable');return r.arrayBuffer();}).then(data=>context.decodeAudioData(data)).catch(()=>{voiceBuffers.delete(name);return null;}));
    return voiceBuffers.get(name);
  }
  async function speakPraise(text){
    const name=praiseClips[text];if(!name||!sfx||sfxVolume<=0||!active||context?.state!=='running')return;
    stopVoice();const epoch=voiceEpoch,buffer=await voiceBuffer(name);
    if(epoch!==voiceEpoch||!buffer||!sfx||sfxVolume<=0||!active||context.state!=='running'||window.ShapeShiftPlatform.paused)return;
    const source=context.createBufferSource();source.buffer=buffer;source.connect(effectsBus);voiceSource=source;
    source.onended=()=>{if(voiceSource===source)voiceSource=null;source.disconnect();};duckMusic(buffer.duration);source.start();
  }
  function stopVoice(){voiceEpoch++;if(voiceSource){try{voiceSource.stop();}catch{}voiceSource=null;}}
  function pause() {
    stopVoice();stopSlice();stopPiano();stopMusicTrack(0);active = false; window.ShapeShiftPlatform.clearInterval(timer);
    if (context && context.state === 'running') context.suspend().catch(() => {});
  }
  function platformAudioChanged(){
    const allowed=window.ShapeShiftPlatform.audioAllowed;
    if(master)master.gain.setValueAtTime(allowed?.52:0,context.currentTime);
    if(!allowed)pause();else start();
  }
  const resume = start;
  let uiEpoch=0;
  async function ui(name='click'){const epoch=++uiEpoch,requestedAt=Date.now();if(context?.state==='running'){play(name);if(!active)await start();return;}await start();if(epoch===uiEpoch&&!window.ShapeShiftPlatform.paused&&Date.now()-requestedAt<180)play(name);}
  async function prepareGameStart(track='game'){
    // Resume inside the launch gesture. Music streams in independently, so a
    // slow or unavailable optional recording never prevents a playable run.
    if(!window.ShapeShiftPlatform.audioAllowed||(!music&&!sfx))return true;
    if(!setup())return true;
    void start().catch(()=>{});
    if(music&&musicVolume>0&&musicTracks[track])void musicBuffer(track);
    return true;
  }
  async function prepareCommon(){if(!setup())return false;const results=await Promise.all([...Object.keys(musicTracks).map(musicBuffer),...Object.values(praiseClips).map(voiceBuffer)]);return results.every(Boolean);}
  window.gameAudio = Object.freeze({ platformAudioChanged, start, stopVictory, prepareGameStart, prepareCommon, prepareVictory, preparePiano, pianoNote, pianoBeat, stopPiano, sliceMotion, stopSlice, stopPraise:stopVoice, speakPraise, setMenuWorld, setScene, setMusic, setSfx, setMusicVolume, setSfxVolume, play, ui, pause, resume });
})();
