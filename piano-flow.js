function bindPianoKeyboard({host,dialog,active,press,release,pause}){
 const media=host.matchMedia('(hover: hover) and (pointer: fine)');
 const keys=['a','s','d','f'],held=new Set();let row;
 const reset=()=>{for(const key of held)release('key-'+key);held.clear();row?.querySelectorAll('kbd').forEach(el=>el.classList.remove('pressed'));};
 function sync(){dialog.classList.toggle('piano-desktop-keys',media.matches);if(row)row.hidden=!media.matches;if(!media.matches)reset();}
 host.addEventListener('keydown',event=>{
  const key=event.key.toLowerCase(),lane=keys.indexOf(key);
  if(lane<0||!media.matches||!dialog.open||!active()||event.ctrlKey||event.metaKey||event.altKey||event.target?.closest?.('input,textarea,select,button,[contenteditable="true"]'))return;
  event.preventDefault();if(event.repeat||held.has(key))return;
  // Change strips smoothly even if the previous key has not quite been lifted.
  reset();held.add(key);
  if(press(lane,'key-'+key))row?.querySelectorAll('kbd')[lane]?.classList.add('pressed');
 });
 host.addEventListener('keyup',event=>{const key=event.key.toLowerCase();if(!held.has(key))return;event.preventDefault();release('key-'+key);held.delete(key);row?.querySelectorAll('kbd')[keys.indexOf(key)]?.classList.remove('pressed');});
 host.addEventListener('blur',()=>{reset();if(dialog.open)pause();});
 media.addEventListener('change',sync);
 return {reset,mount(){
  reset();row=dialog.ownerDocument.createElement('div');row.className='piano-key-labels';row.setAttribute('aria-label','Keyboard strips, left to right: A, S, D, F. Hold the key for long notes.');
  for(const key of keys){const label=dialog.ownerDocument.createElement('kbd');label.textContent=key.toUpperCase();row.append(label);}
  dialog.append(row);sync();return media.matches;
 }};
}
import {createMiniTutorial} from './mini-tutorial.js?v=49439-web12';
import {createMiniResults} from './mini-results.js?v=49439-web12';
import {createMiniContinue} from './mini-continue.js?v=49439-web12';
import {createHitFeedback} from './mini-hit-feedback.js?v=49439-web12';
import {drawPianoHoldGlow} from './piano-hold-glow.js?v=49439-web12';
import {createPianoGame,pianoProgress,finishPianoProgress} from './piano-flow-engine.js?v=49452';

import {skinArtReady,skinCrop} from './shape-skin-art.js?v=49439-web12';

import {pianoLayout,pianoTarget,pianoStripAt} from './piano-flow-touch.js?v=49439-web12';

const STRIP_LINGER=1.6,STRIP_FADE=1.3;



const KEY='shape-shift-piano-v1',COLORS=['#ff7979','#63caff','#75e6a5','#ffe49a'];

export function initPianoFlow({sound=name=>window.gameAudio?.ui(name),getXp=()=>0,reward=()=>false,onQuestEvent=()=>{},onProgress=()=>{},getLoadout=()=>({}),onClose=()=>{}}={}){

 const teaching=createMiniTutorial('piano');
 const dialog=document.createElement('dialog');dialog.id='piano-flow';dialog.setAttribute('aria-label','Piano Flow');document.body.append(dialog);

 let game,canvas,ctx,score,best,coins,hearts,hint,songLabel,overlay,raf=0,last=0,epoch=0,saved=false,runId,pendingSave,progress,layout,particles=[],reveals=[],glows=[0,0,0,0],stripColors=[0,1,2,3],damage=0,quiet=false;



 const inputs=new Map(),voices=new Map(),holdGlows=[0,0,0,0],particleArt=new Map();

 const keyboard=bindPianoKeyboard({host:window,dialog,active:()=>Boolean(game?.started&&!game.paused&&!game.over&&game.countdown<=0&&!overlay),press,release,pause});
 const glowFade=remaining=>{const t=Math.min(1,Math.max(0,remaining/STRIP_FADE));return t*t*(3-2*t);};

 try{progress=pianoProgress(JSON.parse(window.ShapeShiftPlatform.storage.getItem(KEY)));}catch{progress=pianoProgress(null);}

 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;};

 const play=name=>{try{sound(name)?.catch?.(()=>{});}catch{}};

 const continueOffer=createMiniContinue();
 const resultsScreen=createMiniResults();
 const hitFeedback=createHitFeedback(dialog,{sound:play,reducedMotion:()=>quiet,hearts:()=>hearts});
 const button=(text,action,cls='drop-action')=>{const b=el('button',cls,text);b.type='button';b.onclick=()=>{play('click');action();};return b;};

 function persist(p){try{window.ShapeShiftPlatform.storage.setItem(KEY,JSON.stringify(p));progress=p;try{onProgress(p);}catch{}return true;}catch{return false;}}

 function settle(){for(const e of [...progress.pending])try{if(reward(e)!==false)persist({...progress,pending:progress.pending.filter(x=>x.id!==e.id)});}catch{}}

 function save(){if(!game||saved||!game.started)return true;pendingSave??=finishPianoProgress(progress,game,runId);if(!persist(pendingSave))return false;saved=true;onQuestEvent({type:'finish',mode:'piano',time:game.time});pendingSave=null;settle();return true;}

 function clearInput(){keyboard.reset();damage=0;delete dialog.dataset.pianoError;inputs.clear();window.gameAudio?.stopPiano();voices.clear();}

 function stop(){teaching.clear();resultsScreen.reset();continueOffer.reset();window.gameAudio?.stopPraise();hitFeedback.reset();epoch++;window.ShapeShiftPlatform.cancelAnimationFrame(raf);clearInput();game?.dispose();game=null;particles=[];reveals=[];glows.fill(0);holdGlows.fill(0);}

 function close(){if(!save()){result();return;}stop();dialog.close();window.gameAudio?.setScene('menu');onClose();}

 function panel(title,kind='drop-pause-panel'){overlay?.remove();overlay=el('div','drop-overlay');const card=el('section','drop-panel '+kind);card.append(el('h2','',title));overlay.append(card);dialog.append(overlay);for(const child of dialog.children)if(child!==overlay)child.inert=true;return card;}

 function removePanel(){overlay?.remove();overlay=null;for(const child of dialog.children)child.inert=false;}

 function begin(){removePanel();teaching.mount(dialog);game.start();last=window.ShapeShiftPlatform.now();canvas.focus();dialog.dataset.paused='false';}

 function resume(){if(!game||game.over)return;removePanel();game.resume();last=window.ShapeShiftPlatform.now();canvas.focus();dialog.dataset.paused='false';hint.textContent=game.notes.some(n=>n.awaiting)?'Hold anywhere on the glowing strip to continue':'Tap anywhere on the next shape’s strip';}

 function help(){const card=panel('How to play');card.append(el('p','','Play the lowest shape first by tapping anywhere on its strip. Tapping a different strip costs a heart. Tap near the beat as the shape reaches the glowing line; slightly early taps are buffered.'),el('p','','Tap each short note separately, even when it repeats on the same strip. Long notes save their glow progress when you lift your finger. Hold again to continue. Finish before the end of the trail crosses the bottom line to keep your heart.'),button('Got it',resume));card.querySelector('button').focus();}

 function pause(){if(!game||!game.started||game.over||game.paused)return;game.pause();window.gameAudio?.stopPraise();clearInput();dialog.dataset.paused='true';const card=panel('Paused');card.classList.add('piano-pause','drop-pause-panel');card.append(button('Resume',resume),button('End',()=>{game.end();result();},'drop-secondary'));card.querySelector('button').focus();}

 function result(){window.gameAudio?.stopPraise();
  if(!game)return;game.end();clearInput();window.ShapeShiftPlatform.cancelAnimationFrame(raf);dialog.dataset.paused='true';
  if(!saved&&game.lives<=0&&continueOffer.offer({description:'Watch a video to refill your hearts and keep playing.',resume:()=>{game.revive();hitFeedback.reset();resume();raf=window.ShapeShiftPlatform.requestAnimationFrame(tick);},finish:result}))return;
  const xpBefore=getXp(),stored=save();resultsScreen.show({title:'BEAUTIFULLY PLAYED',score:game.score,best:progress.best,coins:game.coins,elapsed:game.time*1000,xpBefore,xpAfter:getXp(),stored,pending:progress.pending.length>0,retry:result,finish:close});
 }

 function event(e){if(e.type==='miss'){damage=.65;dialog.dataset.pianoError=e.reason==='wrong'?'Wrong strip':'Missed note';}if(e.type==='miss'&&e.damaged===false){if(e.note){voices.get(e.note.id)?.();voices.delete(e.note.id);}return;}if(e.type==='complete')teaching.event(e.note?.hold?'held':'tap');if(e.type==='hold'||e.type==='note'&&e.note?.hold)teaching.event('hold');
  if(e.type==='release'&&e.note)e.note.questResumed=true;
  if(['start','complete','miss'].includes(e.type))onQuestEvent({type:e.type==='complete'?'success':e.type==='miss'?'failure':e.type==='end'?'finish':'start',mode:'piano',time:e.time,failure:e.type==='miss',holdSeconds:e.note?.hold?e.note.hold*60/game.bpm:0,tile:e.note?{shape:e.note.shape,color:e.note.color,lane:e.note.lane,pitch:e.note.pitch,hold:e.note.hold,resumed:!!e.note.questResumed}:null});

  if(e.type==='queued'){glows[e.note.lane]=STRIP_LINGER;stripColors[e.note.lane]=e.note.color;hint.textContent=e.note.hold?'Keep holding this strip':'Note ready — follows the beat';}

  else if(e.type==='note'){voices.get(e.note.id)?.();const releaseNote=window.gameAudio?.pianoNote(e.note.pitch,Math.max(.12,Math.min(e.note.duration,e.note.beat+e.note.duration-e.beat)*60/game.bpm*(e.note.gate??.94)),false,e.note.accent??.9);if(e.note.hold)voices.set(e.note.id,releaseNote);glows[e.note.lane]=STRIP_LINGER;stripColors[e.note.lane]=e.note.color;}

  else if(e.type==='complete'){voices.delete(e.note.id);glows[e.note.lane]=STRIP_LINGER;hint.textContent=e.note.hold?'Lovely hold':e.perfect?'Perfect':'Nice';if(layout){const p=pianoTarget(e.note,game.beat,layout);p.y=Math.min(p.y,layout.h-54);reveals.push({note:e.note,x:p.x/layout.w,y:p.y/layout.h,age:0});reveals=reveals.slice(-12);const count=quiet?5:8,phase=Math.random()*Math.PI*2;

    for(let i=0;i<count;i++){const angle=phase+(i+(Math.random()-.5)*.5)*Math.PI*2/count,speed=quiet?35+Math.random()*15:85+Math.random()*40;

     particles.push({x:p.x+Math.cos(angle)*p.size*.08,y:p.y+Math.sin(angle)*p.size*.08,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,age:0,life:quiet?.45:.6+Math.random()*.12,color:COLORS[e.note.color],square:i%3===0,size:quiet?.9:1+Math.random()*.3,rotation:Math.random()*Math.PI,spin:(Math.random()-.5)*3});}

   }particles=particles.slice(-160);}

  else if(e.type==='release'){voices.get(e.note.id)?.();voices.delete(e.note.id);hint.textContent='Progress saved. Hold this strip again - no heart lost.';}

  else if(e.type==='miss'){if(e.note){voices.get(e.note.id)?.();voices.delete(e.note.id);}window.gameAudio?.stopPraise();hitFeedback.hit();hint.textContent=e.reason==='wrong'?'Wrong strip — follow the lowest shape':'Missed note — keep going';}

  else if(e.type==='beat')window.gameAudio?.pianoNote(e.pitch,.7,true);
  else if(e.type==='accompaniment'){
   const backingEnergy=Math.max(0,Math.min(1,e.energy??1));
   for(const pitch of e.pitches)window.gameAudio?.pianoNote(pitch,e.duration,true,(e.velocity??.65)*backingEnergy);
   window.gameAudio?.pianoBeat(e.pulse,backingEnergy);
  }

  else if(e.type==='timing')hint.textContent=e.reason==='order'?'Play the lowest shape first':'Wait for the glowing line';

  else if(e.type==='countdown')play('countdown');

  else if(e.type==='ready'){play('countdown');hint.textContent=dialog.classList.contains('piano-desktop-keys')?'A S D F · Hold the key for long notes':'Go! Tap anywhere on the next shape’s strip';}

 }

 function update(){songLabel.textContent=game.songTitle?game.songTitle+' · '+game.section:'';score.textContent=game.score;best.textContent='BEST '+Math.max(progress.best,game.score);coins.textContent=game.coins;if(hearts.dataset.count!==String(game.lives)){hearts.dataset.count=game.lives;hearts.replaceChildren(...Array.from({length:game.maxLives},(_,i)=>el('i','heart'+(i>=game.lives?' empty':''))));hearts.setAttribute('aria-label',game.lives+' of '+game.maxLives+' hearts left');}canvas.setAttribute('aria-label',`Falling musical shapes. Score ${game.score}. ${game.lives} hearts.`);}

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

 function draw(){if(!game||!ctx)return;const r=canvas.getBoundingClientRect(),w=r.width,h=r.height;if(!w||!h)return;const dpr=Math.min(2,devicePixelRatio||1);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);

  layout=pianoLayout(w,h,true,true,true);const {top,hit,lane,x,size}=layout;ctx.imageSmoothingQuality='high';

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

  ctx.save();ctx.strokeStyle='#ffd5b880';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,layout.missLine);ctx.lineTo(x+lane*4,layout.missLine);ctx.stroke();ctx.restore();

  const next=game.notes.find(n=>n.status==='waiting');

  ctx.save();ctx.beginPath();ctx.rect(0,top-12,w,h-top+12);ctx.clip();

  for(const n of game.notes){if(!game.started||game.countdown>0||['done','missed'].includes(n.status))continue;const p=pianoTarget(n,game.beat,layout),held=n.status==='holding',started=held||n.status==='partial'||n.status==='queued',color=started?COLORS[n.color]:'#dddddd',crop=skinCrop(n);const length=n.hold*layout.unit;if(p.y+p.size/2<top-45||p.y-length-p.size/2>h)continue;

   if(n.hold)drawPianoHoldGlow(ctx,{x:p.x,y:p.y,length,size:p.size,color:COLORS[n.color],progress:started?(n.heldBeats||0)/n.hold:0,held});

   if(crop){const scale=p.size/Math.max(crop.w,crop.h),sw=crop.w*scale,sh=crop.h*scale;ctx.save();ctx.filter=started?'none':'grayscale(1)';ctx.globalAlpha=n===next||held?1:.75;ctx.shadowColor=color;ctx.shadowBlur=quiet?0:held||n===next?22:5;ctx.drawImage(crop.art,crop.x,crop.y,crop.w,crop.h,p.x-sw/2,p.y-sh/2,sw,sh);ctx.restore();}

   if(n===next&&!n.hold&&game.beat>=0){ctx.fillStyle='#fff8d1';ctx.textAlign='center';ctx.font='900 10px Nunito,sans-serif';ctx.fillText('NEXT',p.x,p.y+p.size/2+15);}



   if(n.hold){
    // This stays visible as soon as the shape enters, even before its tail does.
    const label=n.awaiting||n.status==='partial'?'CONTINUE':held?'HOLDING':n.status==='queued'?'READY':'HOLD',badgeY=Math.min(layout.missLine-26,p.y+p.size/2+7),badgeW=Math.min(lane-8,label==='HOLD'?54:76);
    ctx.fillStyle=started?'#183348ee':'#edf2f4ee';round(p.x-badgeW/2,badgeY,badgeW,22,11);ctx.fill();
    ctx.fillStyle=started?color:'#253747';ctx.textAlign='center';ctx.font='900 10px Nunito,sans-serif';ctx.fillText(label,p.x,badgeY+14);
   }

  }

  ctx.restore();

  for(const r of reveals){const crop=skinCrop(r.note);if(!crop)continue;const grow=Math.max(0,1-r.age/.16),scale=layout.size*grow/Math.max(crop.w,crop.h);ctx.save();ctx.globalAlpha=Math.max(0,1-r.age/.16);ctx.shadowColor=COLORS[r.note.color];ctx.shadowBlur=quiet?0:18;ctx.drawImage(crop.art,crop.x,crop.y,crop.w,crop.h,r.x*w-crop.w*scale/2,r.y*h-crop.h*scale/2,crop.w*scale,crop.h*scale);ctx.restore();}

  ctx.save();ctx.globalCompositeOperation='lighter';

  for(const p of particles){const fade=Math.max(0,1-p.age/p.life),size=40*p.size*(.65+.35*fade);ctx.save();ctx.globalAlpha=Math.min(1,fade*1.6);ctx.translate(p.x,p.y);ctx.rotate(p.rotation);ctx.drawImage(sparkArt(p.color,p.square),-size/2,-size/2,size,size);ctx.restore();}ctx.restore();

  if(game.started&&!game.paused&&(game.countdown>0||game.time<.4)){ctx.textAlign='center';ctx.font='1000 64px Nunito,sans-serif';ctx.fillStyle='#fff6d6';ctx.fillText(game.countdown>0?String(Math.ceil(game.countdown)):'GO!',w/2,h*.45);}

  if(damage>0&&!quiet){ctx.fillStyle=`rgba(255,82,110,${damage*.35})`;ctx.fillRect(0,0,w,h);}

 }

 function tick(now){if(!game||!dialog.open)return;const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;if(!window.ShapeShiftPlatform.paused&&!game.paused){hitFeedback.step(dt);game.step(dt);for(let i=0;i<4;i++){glows[i]=Math.max(0,glows[i]-dt);holdGlows[i]=Math.max(0,holdGlows[i]-dt);}for(const r of reveals)r.age+=dt;reveals=reveals.filter(r=>r.age<.16);for(const p of particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;const drag=Math.exp(-2.4*dt);p.vx*=drag;p.vy*=drag;p.rotation+=p.spin*dt;}particles=particles.filter(p=>p.age<p.life);damage=Math.max(0,damage-dt);if(!damage)delete dialog.dataset.pianoError;update();draw();if(game.over&&!hitFeedback.active){result();return;}}raf=window.ShapeShiftPlatform.requestAnimationFrame(tick);}

 async function start(){if(game&&!save())return;stop();const version=epoch;dialog.replaceChildren();dialog.dataset.view='play';dialog.dataset.paused='true';overlay=null;saved=false;pendingSave=null;runId='piano-flow-'+crypto.randomUUID();quiet=document.body.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches;window.gameAudio?.setScene('piano');window.gameAudio?.start()?.catch(()=>{});

  const scenery=el('div','piano-scenery');scenery.append(el('div','piano-mist'));dialog.append(scenery);canvas=el('canvas','piano-canvas');canvas.tabIndex=0;canvas.setAttribute('role','application');dialog.append(canvas);ctx=canvas.getContext('2d');canvas.onpointerdown=e=>{if(e.button!==0||!layout||!game||game.countdown>0||overlay||inputs.size)return;const r=canvas.getBoundingClientRect(),lane=pianoStripAt(layout,e.clientX-r.left,e.clientY-r.top);if(lane===null)return;e.preventDefault();if(press(lane,'p'+e.pointerId))canvas.setPointerCapture(e.pointerId);};canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=e=>release('p'+e.pointerId);

  const hud=el('header','piano-hud'),pauseButton=button('',pause,'piano-pause-button');pauseButton.setAttribute('aria-label','Pause Piano Flow');score=el('strong','piano-score','0');score.setAttribute('aria-label','Score');best=el('small','piano-best');hearts=el('div','piano-lives');hearts.setAttribute('role','img');const wallet=el('div','piano-coins'),coin=el('img');coin.src='assets/coin-v10.webp';coin.alt='Coins';coins=el('strong','','0');wallet.append(coin,coins);hud.append(pauseButton,score,hearts,best,wallet);dialog.append(hud);songLabel=el('p','piano-song');dialog.append(songLabel);

  hint=el('p','piano-hint','Tap anywhere on the next shape’s strip');dialog.append(hint);
 if(keyboard.mount())hint.textContent='A S D F · Left to right · Hold the key for long notes';

  game=createPianoGame({...getLoadout(),directTouch:true,rhythm:true,stripTap:true,melodicStrips:true,fullSongs:true,onEvent:event});settle();update();draw();const card=panel('Piano Flow');const status=el('p','','Preparing the piano…');card.append(status);

  const [ready]=await Promise.all([window.gameAudio?.preparePiano(),skinArtReady]);if(version!==epoch||!dialog.open)return;

  card.replaceChildren(el('h2','','Piano Flow'));if(!ready){card.append(el('p','','The piano could not load. Try again.'),button('Try again',start),button('Games',close,'drop-secondary'));return;}

  begin();last=window.ShapeShiftPlatform.now();raf=window.ShapeShiftPlatform.requestAnimationFrame(tick);

 }

 function press(lane,id){if(!game||game.paused||game.over||overlay||inputs.size)return false;if(!game.pressStrip(lane))return false;inputs.set(id,lane);update();draw();return true;}

 function release(id){const lane=inputs.get(id);if(lane===undefined)return;inputs.delete(id);game?.release(lane);}

 dialog.addEventListener('cancel',e=>{e.preventDefault();if(game?.over||!game?.started)close();else if(game.paused)resume();else pause();});

 const autoPause=()=>{if(dialog.open)pause();};window.addEventListener('unused-blur',autoPause);window.addEventListener('unused-androidpause',autoPause);document.addEventListener('unused-visibilitychange',()=>{if(window.ShapeShiftPlatform.paused)autoPause();});window.addEventListener('unused-pagehide',()=>{if(game&&!saved){game.end();save();}});new ResizeObserver(()=>{if(game)draw();}).observe(dialog);

 try{onProgress(progress);}catch{}
 return {open(){if(dialog.open)return;dialog.showModal();start();},close};

}

