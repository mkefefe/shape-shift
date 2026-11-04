import {pianoBackingPlan} from './piano-backing.js?v=494240';
import {createAdventureChallengeRun} from './adventure-challenges.js?v=207';
import {flushResultStorage,recoverJournaledResult} from './result-storage.js?v=494240';
import {createResultJournal} from './run-results.js?v=494240';
import {beginModeTransition} from './mode-transition.js?v=494240';
import {engagement,registerModeState} from './telemetry.js?v=494240';
import {translate} from './localization.js?v=494240';
import {createSceneryTint} from './scenery-progress.js';
import {createPianoInput,bindPianoKeyboard,pianoInputClock} from './piano-input.js?v=494240';
import {createMiniTutorial} from './mini-tutorial.js';
import {createModePractice,continuePracticeRun} from './mode-practice.js?v=494240';
import {createMiniResults} from './mini-results.js?v=494240';
import {createMiniContinue} from './mini-continue.js';
import {createHitFeedback} from './mini-hit-feedback.js';
import {drawPianoHoldGlow} from './piano-hold-glow.js';
import {createPianoGame,pianoProgress,finishPianoProgress,createPianoPerformedSupport,createPianoRhythmScheduler,PIANO_STALL_SECONDS} from './piano-flow-engine.js?v=494240';

import {skinArtReady,skinCrop} from './shape-skin-art.js?v=494240';

import {pianoLayout,pianoTarget,pianoStripAt} from './piano-flow-touch.js';

const STRIP_LINGER=1.6,STRIP_FADE=1.3;
let skyReady;
function prepareSky(){
 if(!skyReady)skyReady=new Promise(resolve=>{const image=new Image();let done=false;const finish=ready=>{if(done)return;done=true;window.clearTimeout(timer);resolve(ready);};const timer=window.setTimeout(()=>{image.src='';finish(false);},12000);image.src='assets/piano-sky-v281.webp';image.decode().then(()=>finish(true),()=>finish(false));}).then(ready=>{if(!ready)skyReady=null;return ready;});
 return skyReady;
}



const KEY='shape-shift-piano-v1',COLORS=['#ff7979','#63caff','#75e6a5','#ffe49a'];

export function initPianoFlow({getAdventureChallenge=()=>null,onAdventureResult=()=>({}),sound=name=>window.gameAudio?.ui(name),getXp=()=>0,reward=()=>false,onQuestEvent:reportQuest=()=>{},onProgress=()=>{},getLoadout=()=>({}),onClose=()=>{}}={}){

 const teaching=createMiniTutorial('piano');
 const practice=createModePractice('piano',{onComplete:()=>continuePracticeRun(game,()=>{engagement.startRun('piano');onQuestEvent({type:'start',mode:'piano',time:game.time});hint.hidden=false;hint.textContent='Tap any visible note’s strip';last=gameLast=window.ShapeShiftPlatform.now();update();draw();})});
 const onQuestEvent=event=>{if(!practice.active)reportQuest(event);};
 const dialog=document.createElement('dialog');dialog.id='piano-flow';dialog.setAttribute('aria-label','Piano Flow');document.body.append(dialog);

 let game,canvas,ctx,score,best,coins,hearts,hint,overlay,raf=0,last=0,gameLast=0,epoch=0,saved=false,runId,pendingSave,progress,layout,particles=[],reveals=[],glows=[0,0,0,0],stripColors=[0,1,2,3],damage=0,quiet=false;



 let skyJourney,skyClock=0,scenery,mist,canvasBounds,assetsReady;
 function prepareResources(){if(!assetsReady)assetsReady=Promise.all([window.gameAudio?.preparePiano()??true,Promise.resolve(skinArtReady).then(values=>values.every(Boolean)),prepareSky()]).then(values=>{if(!values.every(Boolean))throw Error('Piano Flow assets unavailable');for(const color of COLORS)for(const square of [false,true])sparkArt(color,square);return true;}).catch(error=>{assetsReady=null;throw error;});return assetsReady;}
 function measureCanvas(){if(canvas)canvasBounds=canvas.getBoundingClientRect();}
 const rhythm=createPianoRhythmScheduler({plan:pianoBackingPlan,epoch:()=>window.gameAudio?.pianoBackingEpoch??0,play:event=>window.gameAudio?.pianoRhythm(event.kind,event.gain,event.delay)??false});
 const support=createPianoPerformedSupport({now:()=>window.ShapeShiftPlatform.now()/1000,play:event=>window.gameAudio?.pianoPerformance(event.pitch,event.seconds,true,event.gain,event.delay)});
 const voices=new Map(),holdGlows=[0,0,0,0],particleArt=new Map();

 const input=createPianoInput({getGame:()=>game,enabled:()=>dialog.open&&!overlay,onPress:()=>engagement.interaction('piano'),onChange:()=>{update();draw();}});
 const keyboard=bindPianoKeyboard({host:window,dialog,active:()=>Boolean(game?.started&&!game.paused&&!game.over&&!overlay),press,release,pause});
 const glowFade=remaining=>{const t=Math.min(1,Math.max(0,remaining/STRIP_FADE));return t*t*(3-2*t);};

 try{progress=pianoProgress(JSON.parse(window.ShapeShiftPlatform.storage.getItem(KEY)));}catch{progress=pianoProgress(null);}

 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;};

 const play=name=>{try{sound(name)?.catch?.(()=>{});}catch{}};

 const continueOffer=createMiniContinue({tracker:engagement});
 const resultJournal=createResultJournal(window.ShapeShiftPlatform.storage,KEY+'-continue-result');
 const resultsScreen=createMiniResults();
 const adventureRun=createAdventureChallengeRun({getChallenge:getAdventureChallenge,onResult:onAdventureResult});
 const hitFeedback=createHitFeedback(dialog,{sound:play,reducedMotion:()=>quiet,hearts:()=>hearts});
 const button=(text,action,cls='drop-action')=>{const b=el('button',cls,text);b.type='button';b.onclick=()=>{play('click');action();};return b;};

 function persist(p){try{window.ShapeShiftPlatform.storage.setItem(KEY,JSON.stringify(p));progress=p;try{onProgress(p);}catch{}void flushResultStorage();return true;}catch{return false;}}

 function recoverResult(){return recoverJournaledResult({journal:resultJournal,progress,finish:finishPianoProgress,persist,onRecovered:result=>onQuestEvent({type:'finish',mode:'piano',time:result.time||0})});}
 function settle(){if(!recoverResult())return false;for(const e of [...progress.pending])try{if(reward(e)!==false)persist({...progress,pending:progress.pending.filter(x=>x.id!==e.id)});}catch{}}

 registerModeState('piano',()=>game&&dialog.open?{playing:!!(game.started&&!game.over&&!game.paused&&!overlay),paused:!!(game.paused||!!overlay)}:null);
 function save(){if(!game||saved||!game.started||game.practice)return true;pendingSave??=finishPianoProgress(progress,game,runId);if(!persist(pendingSave))return false;saved=true;engagement.endRun('finished');onQuestEvent({type:'finish',mode:'piano',time:game.time});pendingSave=null;resultJournal.clear();settle();return true;}

 function clearInput(){keyboard.reset();input.reset();damage=0;delete dialog.dataset.pianoError;window.gameAudio?.stopPiano();voices.clear();support.clear();rhythm.cancelAhead(game?.beat);}
 window.addEventListener('shape-shift-input-reset',clearInput);

 function stop(){practice.clear();teaching.clear();resultsScreen.reset();continueOffer.reset();window.gameAudio?.stopPraise();hitFeedback.reset();epoch++;window.ShapeShiftPlatform.cancelAnimationFrame(raf);clearInput();rhythm.clear();game?.dispose();game=null;particles=[];reveals=[];glows.fill(0);holdGlows.fill(0);}

 function close(){if(!save()){result();return false;}stop();dialog.close();window.gameAudio?.setScene('menu');onClose();return true;}

 function panel(title,kind='drop-pause-panel'){overlay?.remove();overlay=el('div','drop-overlay');const card=el('section','drop-panel '+kind);card.append(el('h2','',title));overlay.append(card);dialog.append(overlay);for(const child of dialog.children)if(child!==overlay)child.inert=true;return card;}

 function removePanel(){overlay?.remove();overlay=null;for(const child of dialog.children)child.inert=false;}

 function begin(){removePanel();game.start();last=gameLast=window.ShapeShiftPlatform.now();canvas.focus();dialog.dataset.paused='false';}

 function resume(){if(!game||game.over)return;removePanel();game.resume();last=gameLast=window.ShapeShiftPlatform.now();canvas.focus();dialog.dataset.paused='false';hint.textContent='Tap any visible note’s strip';}

 function help(){const card=panel('How to play');card.append(el('p','','Tap a strip or press A, S, D or F whenever a matching note is visible. Each fresh press plays the note and earns its point immediately. You can play visible notes in different strips in any order.'),el('p','','Press again for each new note. Long notes earn their point on the first press too. Keep holding for a longer tone if you like; lifting never takes that point away. You can hold different strips together.'),button('Got it',resume));card.querySelector('button').focus();}

 function pause(){if(!game||!game.started||game.over||game.paused)return;game.pause();window.gameAudio?.stopPraise();clearInput();dialog.dataset.paused='true';const card=panel('Paused');card.classList.add('piano-pause','drop-pause-panel');if(!adventureRun.pause(card,{panel,button,resume,exit:close}))card.append(button('Resume',resume),button('End',()=>{game.end();result();},'drop-secondary'));card.querySelector('button').focus();}

 function result(){window.gameAudio?.stopPraise();
  if(!game)return;game.end();clearInput();window.ShapeShiftPlatform.cancelAnimationFrame(raf);dialog.dataset.paused='true';
  if(!adventureRun.active()&&!saved&&game.lives<=0&&continueOffer.offer({checkpoint:()=>resultJournal.write(runId,game),description:'Watch a video to refill your hearts and keep playing.',resume:()=>{game.revive();hitFeedback.reset();resume();raf=window.ShapeShiftPlatform.requestAnimationFrame(tick);},finish:result}))return;
  const xpBefore=getXp(),stored=save();resultsScreen.show({title:'BEAUTIFULLY PLAYED',score:game.score,best:progress.best,coins:game.coins,elapsed:game.time*1000,xpBefore,xpAfter:getXp(),stored,pending:progress.pending.length>0,retry:result,restart:start,finish:close,...adventureRun.result(game,stored)});
 }

 function event(e){if(e.type==='end'){window.gameAudio?.stopPiano(true);rhythm.clear();}if(e.type==='practice-miss'){practice.guide('Tap this note’s strip.',practicePoint);return;}if(e.type==='complete'&&practice.active){if(e.note.hold)practice.finish();else practice.guide('Tap the long note. Holding is optional.',practicePoint);}if(e.type==='start'&&!practice.active)engagement.startRun('piano');if(e.type==='miss'){damage=.65;dialog.dataset.pianoError=e.reason==='wrong'?'Wrong strip':'Missed note';}if(e.type==='miss'&&e.damaged===false){if(e.note){voices.get(e.note.id)?.();voices.delete(e.note.id);}return;}if(e.type==='complete')teaching.event(e.note?.hold?'held':'tap');if(e.type==='hold'||e.type==='note'&&e.note?.hold)teaching.event('hold');
  if(e.type==='release'&&e.note)e.note.questResumed=true;
  if(['start','complete','miss'].includes(e.type))onQuestEvent({type:e.type==='complete'?'success':e.type==='miss'?'failure':e.type==='end'?'finish':'start',mode:'piano',time:e.time,failure:e.type==='miss',holdSeconds:e.note?.hold?e.note.hold*60/game.bpm:0,tile:e.note?{shape:e.note.shape,color:e.note.color,lane:e.note.lane,pitch:e.note.pitch,hold:e.note.hold,resumed:!!e.note.questResumed}:null});

   if(e.type==='input'||e.type==='queued'){if(e.type==='input')engagement.successfulAction('piano');glows[e.note.lane]=STRIP_LINGER;stripColors[e.note.lane]=e.note.color;hint.textContent=e.note.hold?'Nice · hold for a longer tone':'Nice';}

  else if(e.type==='note'){
   // Melody and pitched support respond to the actual press. The separate
   // percussion scheduler keeps its steady groove without delayed melody attacks.
   const noteBpm=e.note.bpm||game.bpm;
   const pitched=pianoBackingPlan(e.note).filter(support=>!['kick','snare','hat'].includes(support.kind));
   support.schedule(pitched,{bpm:noteBpm,beat:game.beat});
   voices.get(e.note.id)?.();const releaseNote=window.gameAudio?.pianoPerformance(e.note.pitch,Math.max(.08,(e.remainingSound??e.note.soundBeats??e.note.duration)*60/noteBpm*(Number.isFinite(e.note.soundBeats)?1:e.note.gate??.94)),false,e.note.accent??.9);if(e.note.hold&&e.note.status==='holding')voices.set(e.note.id,releaseNote);glows[e.note.lane]=STRIP_LINGER;stripColors[e.note.lane]=e.note.color;}

  else if(e.type==='complete'){if(e.note.status!=='holding')voices.delete(e.note.id);glows[e.note.lane]=STRIP_LINGER;hint.textContent=e.note.hold?'Nice · hold for a longer tone':'Nice';if(layout){const p=pianoTarget(e.note,game.beat,layout);p.y=Math.min(p.y,layout.h-54);reveals.push({note:e.note,x:p.x/layout.w,y:p.y/layout.h,age:0});reveals=reveals.slice(-12);const count=quiet?5:8,phase=Math.random()*Math.PI*2;

    for(let i=0;i<count;i++){const angle=phase+(i+(Math.random()-.5)*.5)*Math.PI*2/count,speed=quiet?35+Math.random()*15:85+Math.random()*40;

     particles.push({x:p.x+Math.cos(angle)*p.size*.08,y:p.y+Math.sin(angle)*p.size*.08,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,age:0,life:quiet?.45:.6+Math.random()*.12,color:COLORS[e.note.color],square:i%3===0,size:quiet?.9:1+Math.random()*.3,rotation:Math.random()*Math.PI,spin:(Math.random()-.5)*3});}

   }particles=particles.slice(-160);}

  else if(e.type==='recover'){window.gameAudio?.stopPiano();voices.clear();support.clear();rhythm.clear();hint.textContent='Try this note again';}
  else if(e.type==='stall'){window.gameAudio?.stopPiano(true);support.clear();rhythm.resyncAfterStall();}
  else if(e.type==='recovered'){hint.textContent='Tap any visible note’s strip';}
  else if(e.type==='sustain-end'){voices.delete(e.note.id);}
  else if(e.type==='release'){voices.get(e.note.id)?.();voices.delete(e.note.id);hint.textContent=e.optional?'Point earned':'Hold again to finish the trail';}

  else if(e.type==='miss'){if(e.note){voices.get(e.note.id)?.();voices.delete(e.note.id);}window.gameAudio?.stopPraise();hitFeedback.hit();hint.textContent=e.reason==='wrong'?'Wrong strip — choose a visible shape':'Missed note — keep going';}

  else if(e.type==='beat')window.gameAudio?.pianoNote(e.pitch,.7,true);
  // Accompaniment is scheduled from the performed note above, never a second clock.

  else if(e.type==='timing')hint.textContent='Choose a visible note’s strip';

  else if(e.type==='countdown')play('countdown');

  else if(e.type==='ready'){play('countdown');hint.textContent=dialog.classList.contains('piano-desktop-keys')?'A S D F · Play any visible note':'Go! Tap any visible note’s strip';}

 }

 function setText(node,value){value=String(value);if(node.textContent!==value)node.textContent=value;}
 function update(){setText(score,game.score);setText(best,'BEST '+(game.practice?progress.best:Math.max(progress.best,game.score)));setText(coins,game.practice?0:game.coins);if(hearts.dataset.count!==String(game.lives)){hearts.dataset.count=game.lives;hearts.replaceChildren(...Array.from({length:game.maxLives},(_,i)=>el('i','heart'+(i>=game.lives?' empty':''))));hearts.setAttribute('aria-label',game.lives+' of '+game.maxLives+' hearts left');}const label=`Falling musical shapes. Score ${game.score}. ${game.lives} hearts.`;if(canvas.getAttribute('aria-label')!==label)canvas.setAttribute('aria-label',label);}

 // Cache eight tiny glow sprites instead of applying a canvas blur to every particle each frame.

 function sparkArt(color,square){

  const key=color+(square?'square':'circle');if(particleArt.has(key))return particleArt.get(key);

  const art=document.createElement('canvas');art.width=art.height=40;const c=art.getContext('2d');

  const glow=c.createRadialGradient(20,20,1,20,20,18);glow.addColorStop(0,color+'b0');glow.addColorStop(.3,color+'55');glow.addColorStop(1,color+'00');c.fillStyle=glow;c.fillRect(0,0,40,40);

  c.fillStyle=color;if(square)c.fillRect(15.5,15.5,9,9);else{c.beginPath();c.arc(20,20,4.5,0,Math.PI*2);c.fill();}

  c.fillStyle='#ffffffc0';if(square)c.fillRect(18.7,18.7,2.6,2.6);else{c.beginPath();c.arc(20,20,1.5,0,Math.PI*2);c.fill();}

  particleArt.set(key,art);return art;

 }

 function round(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}

 function draw(){if(!game||!ctx)return;if(!canvasBounds)measureCanvas();const {width:w,height:h}=canvasBounds;if(!w||!h)return;const dpr=Math.min(2,devicePixelRatio||1);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);

  layout=pianoLayout(w,h,true,true,true);game.setViewport({inputWindow:4+(layout.size/2+12)/layout.unit,lateWindow:(h-layout.hit+layout.size/2)/layout.unit});const {top,hit,lane,x,size}=layout;ctx.imageSmoothingQuality='high';

  for(let i=0;i<4;i++){

   const left=x+i*lane,gradient=ctx.createLinearGradient(0,top,0,h),holding=game.pressed.has(i);

   // Refresh the hold envelope while pressed, so completion fades from the same brightness.

   if(holding)holdGlows[i]=STRIP_LINGER;

   const heldLight=glowFade(holdGlows[i]),lit=Math.max(heldLight,glowFade(glows[i]));

   gradient.addColorStop(0,i%2?'#bcbcbc15':'#f2f2f224');gradient.addColorStop(1,i%2?'#77777730':'#dddddd40');ctx.fillStyle=gradient;round(left+2,top-12,lane-4,h-top+12,7);ctx.fill();

   ctx.fillStyle='#ffffff36';ctx.fillRect(left,top-12,1,h-top+12);if(i===3)ctx.fillRect(left+lane,top-12,1,h-top+12);

   const crop=skinCrop({shape:i,color:stripColors[i]});if(crop){const scale=22/Math.max(crop.w,crop.h);ctx.save();ctx.globalAlpha=.85;ctx.filter='grayscale('+(1-lit)+')';ctx.drawImage(crop.art,crop.x,crop.y,crop.w,crop.h,left+lane/2-crop.w*scale/2,top-31-crop.h*scale/2,crop.w*scale,crop.h*scale);ctx.restore();}

   if(lit>0){

    ctx.save();round(left+2,top-12,lane-4,h-top+12,7);ctx.clip();

    ctx.globalAlpha=lit*.2+heldLight*.32;ctx.fillStyle=COLORS[stripColors[i]];ctx.fillRect(left+2,top-12,lane-4,h-top+12);

    if(heldLight>0){

     const sheen=ctx.createLinearGradient(left,0,left+lane,0);sheen.addColorStop(0,'#ffffff00');sheen.addColorStop(.5,'#ffffff');sheen.addColorStop(1,'#ffffff00');

     ctx.globalAlpha=heldLight*.16;ctx.fillStyle=sheen;ctx.fillRect(left+2,top-12,lane-4,h-top+12);

     ctx.globalAlpha=heldLight*.65;ctx.fillStyle=COLORS[stripColors[i]];ctx.fillRect(left+2,top-12,2,h-top+12);ctx.fillRect(left+lane-4,top-12,2,h-top+12);

    }

    ctx.restore();

   }

  }





  ctx.save();ctx.beginPath();ctx.rect(0,top-12,w,h-top+12);ctx.clip();

  for(const n of game.notes){if(!game.started||game.countdown>0||['done','missed'].includes(n.status))continue;const p=pianoTarget(n,game.beat,layout),held=n.status==='holding',started=held||n.status==='partial'||n.status==='queued',color=started?COLORS[n.color]:'#dddddd',crop=skinCrop(n);const length=n.hold*layout.unit;if(p.y+p.size/2<top-45||p.y-length-p.size/2>h)continue;

   if(n.hold)drawPianoHoldGlow(ctx,{x:p.x,y:p.y,length,size:p.size,color:COLORS[n.color],progress:started?(n.heldBeats||0)/n.hold:0,held});

   if(crop){const scale=p.size/Math.max(crop.w,crop.h),sw=crop.w*scale,sh=crop.h*scale;ctx.save();ctx.filter=started?'none':'grayscale(1)';ctx.globalAlpha=1;ctx.shadowColor=color;ctx.shadowBlur=quiet?0:held?22:8;ctx.drawImage(crop.art,crop.x,crop.y,crop.w,crop.h,p.x-sw/2,p.y-sh/2,sw,sh);ctx.restore();}





   if(n.hold&&p.y+p.size/2>=top-12){
    // This stays visible as soon as the shape enters, even before its tail does.
    const label=held?'SUSTAINING':'TAP / HOLD',badgeY=Math.min(layout.missLine-26,p.y+p.size/2+7),badgeW=Math.min(lane-8,Math.max(76,ctx.measureText(translate(label)).width+16));
    ctx.fillStyle=started?'#183348ee':'#edf2f4ee';round(p.x-badgeW/2,badgeY,badgeW,22,11);ctx.fill();
    ctx.fillStyle=started?color:'#253747';ctx.textAlign='center';ctx.font='900 10px Nunito,sans-serif';ctx.fillText(translate(label),p.x,badgeY+14);
   }

  }

  ctx.restore();

  for(const r of reveals){const crop=skinCrop(r.note);if(!crop)continue;const grow=Math.max(0,1-r.age/.16),scale=layout.size*grow/Math.max(crop.w,crop.h);ctx.save();ctx.globalAlpha=Math.max(0,1-r.age/.16);ctx.shadowColor=COLORS[r.note.color];ctx.shadowBlur=quiet?0:18;ctx.drawImage(crop.art,crop.x,crop.y,crop.w,crop.h,r.x*w-crop.w*scale/2,r.y*h-crop.h*scale/2,crop.w*scale,crop.h*scale);ctx.restore();}

  ctx.save();ctx.globalCompositeOperation='lighter';

  for(const p of particles){const fade=Math.max(0,1-p.age/p.life),size=40*p.size*(.65+.35*fade);ctx.save();ctx.globalAlpha=Math.min(1,fade*1.6);ctx.translate(p.x,p.y);ctx.rotate(p.rotation);ctx.drawImage(sparkArt(p.color,p.square),-size/2,-size/2,size,size);ctx.restore();}ctx.restore();

  if(!game.practice&&game.started&&!game.paused&&(game.countdown>0||game.time<.4)){ctx.textAlign='center';ctx.font='1000 64px Nunito,sans-serif';ctx.fillStyle='#fff6d6';ctx.fillText(game.countdown>0?String(Math.ceil(game.countdown)):translate('GO!'),w/2,h*.45);}

  if(damage>0&&!quiet){ctx.fillStyle=`rgba(255,82,110,${damage*.35})`;ctx.fillRect(0,0,w,h);}

 }

 function advanceGame(now){const dt=Math.max(0,(now-gameLast)/1000);gameLast=Math.max(gameLast,now);if(game&&!game.paused&&!window.ShapeShiftPlatform.paused&&!practice.finished){game.step(dt);adventureRun.step(game);}}
 function advanceInput(eventTime){const now=window.ShapeShiftPlatform.now();advanceGame(pianoInputClock(eventTime,performance.now(),now,gameLast,PIANO_STALL_SECONDS*1000));}

 function tick(now){if(!game||!dialog.open)return;const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;if(!window.ShapeShiftPlatform.paused&&!game.paused){hitFeedback.step(dt);advanceGame(now);rhythm.step(game);input.flush();if(game.started&&!game.over){const mood=skyJourney.step(dt,game.score,quiet);skyClock+=dt;if(scenery&&skyClock>=.1){skyClock=0;mist.style.transform=quiet?'none':`translate(${Math.sin(mood.seconds*.15)*3}%,${Math.cos(mood.seconds*.11)*2}%)`;}}for(let i=0;i<4;i++){glows[i]=Math.max(0,glows[i]-dt);holdGlows[i]=Math.max(0,holdGlows[i]-dt);}for(const r of reveals)r.age+=dt;reveals=reveals.filter(r=>r.age<.16);for(const p of particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;const drag=Math.exp(-2.4*dt);p.vx*=drag;p.vy*=drag;p.rotation+=p.spin*dt;}particles=particles.filter(p=>p.age<p.life);damage=Math.max(0,damage-dt);if(!damage)delete dialog.dataset.pianoError;update();draw();if(game.over&&!hitFeedback.active){result();return;}}raf=window.ShapeShiftPlatform.requestAnimationFrame(tick);}

 let entering=false;

 function practicePoint(){const note=game.notes.find(n=>!['done','missed'].includes(n.status));if(!note||!layout)return null;const p=pianoTarget(note,game.beat,layout),r=canvas.getBoundingClientRect();if(p.y+p.size/2<layout.top||p.y-p.size/2>layout.h)return null;return {x:r.left+(p.x-p.size*.32)*r.width/layout.w,y:r.top+Math.min(p.y,layout.hit)*r.height/layout.h};}
 function startPractice(){if(!practice.active)return;hint.hidden=true;practice.mount(dialog);practice.guide('Tap any visible note’s strip.',practicePoint);}

 async function start(){if(entering)return;entering=true;let gate;try{await prepareResources();gate=beginModeTransition('Piano Flow');await gate.covered;document.getElementById('games-hub')?.close();if(!dialog.open)dialog.showModal();await prepareRun(gate);}catch(error){if(!dialog.open)dialog.showModal();const card=panel('Piano Flow');card.append(el('p','','The piano could not load. Try again.'),button('Try again',start),button('Games',close,'drop-secondary'));}finally{gate?.dispose();entering=false;}}
 async function prepareRun(gate){if(!game&&!recoverResult()){const card=panel('Unable to save progress');card.append(button('Retry',start),button('Games',close));return;}if(game&&!save())return;stop();const version=epoch;dialog.replaceChildren();dialog.dataset.view='play';dialog.dataset.paused='true';overlay=null;saved=false;pendingSave=null;runId='piano-flow-'+crypto.randomUUID();quiet=document.body.classList.contains('reduce-motion');window.gameAudio?.setScene('piano');window.gameAudio?.start()?.catch(()=>{});

  skyClock=0;scenery=el('div','piano-scenery');mist=el('div','piano-mist');mist.style.animation='none';skyJourney=createSceneryTint(scenery,{strength:.1});scenery.append(mist);dialog.append(scenery);canvas=el('canvas','piano-canvas');canvasBounds=null;canvas.tabIndex=0;canvas.setAttribute('role','application');dialog.append(canvas);ctx=canvas.getContext('2d');canvas.onpointerdown=e=>{if(e.button!==0||!layout||!game||overlay)return;const r=canvas.getBoundingClientRect(),lane=pianoStripAt(layout,e.clientX-r.left,e.clientY-r.top);if(lane===null)return;e.preventDefault();canvas.focus({preventScroll:true});if(press(lane,'p'+e.pointerId,e.timeStamp))canvas.setPointerCapture(e.pointerId);};canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=e=>release('p'+e.pointerId,e.timeStamp);

  const hud=el('header','piano-hud'),pauseButton=button('',pause,'piano-pause-button');pauseButton.setAttribute('aria-label','Pause Piano Flow');score=el('strong','piano-score','0');score.setAttribute('aria-label','Score');best=el('small','piano-best');hearts=el('div','piano-lives');hearts.setAttribute('role','img');const wallet=el('div','piano-coins'),coin=el('img');coin.src='assets/coin-v10.webp';coin.alt='Coins';coins=el('strong','','0');wallet.append(coin,coins);hud.append(pauseButton,score,hearts,best,wallet);dialog.append(hud);

  hint=el('p','piano-hint','Tap any visible note’s strip');dialog.append(hint);
 if(keyboard.mount())hint.textContent='A S D F · Play any visible note';

  game=createPianoGame({...getLoadout(),practice:practice.active,directTouch:true,rhythm:true,stripTap:true,melodicStrips:true,fullSongs:true,recoverWrongTap:true,brightSongs:true,onEvent:event});settle();update();draw();

  removePanel();draw();await gate.reveal(()=>draw());if(version!==epoch||!dialog.open)return;startPractice();begin();last=gameLast=window.ShapeShiftPlatform.now();adventureRun.start(dialog);raf=window.ShapeShiftPlatform.requestAnimationFrame(tick);

 }

 function press(lane,id,eventTime){advanceInput(eventTime);return input.press(lane,id);}

 function release(id,eventTime){advanceInput(eventTime);input.release(id);}

 dialog.addEventListener('cancel',e=>{e.preventDefault();if(game?.over||!game?.started)close();else if(game.paused)resume();else pause();});

 const autoPause=()=>{if(dialog.open)pause();};window.addEventListener('unused-blur',autoPause);window.addEventListener('androidpause',autoPause);document.addEventListener('visibilitychange',()=>{if(window.ShapeShiftPlatform.paused)autoPause();});window.addEventListener('pagehide',()=>{if(game&&!saved){if(continueOffer.isOffering()){resultJournal.write(runId,game);return;}game.end();save();}});new ResizeObserver(()=>{if(game){measureCanvas();draw();}}).observe(dialog);

 settle();
 try{onProgress(progress);}catch{}
 return {prepare:prepareResources,open(){if(dialog.open)return;return start();},close};

}

