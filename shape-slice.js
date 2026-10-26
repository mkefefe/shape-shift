import {createSceneryTint} from './scenery-progress.js?v=49484';
import {createMiniTutorial} from './mini-tutorial.js?v=49439-web12';
import {createMiniResults} from './mini-results.js?v=49439-web12';
import {createMiniContinue} from './mini-continue.js?v=49439-web12';
import {createHitFeedback} from './mini-hit-feedback.js?v=49439-web12';
import {sliceViewport} from './slice-viewport.js?v=49439-web12';
import {createSliceBurst,stepSliceEffects,drawSliceEffects,createBombImpact,stepBombImpacts,drawBombImpacts,bombCameraOffset,bombImpactPending,bombHaptic} from './slice-effects.js?v=49487';
import {drawSliceTrail,slicePointerPoint,sliceTrailColor,SLICE_TRAIL_LIFETIME} from './slice-trail.js?v=49439-web12';
import {miniGameCoins} from './mini-game-rewards.js?v=49439-web12';
import {createSliceGame,sliceProgress,finishSliceProgress,SLICE_WIDTH as W,SLICE_HEIGHT as H} from './shape-slice-engine.js?v=49439-web12';
import {shapeArtReady,paintMiniShape} from './mini-shape-art.js?v=49482';
import {cutShape,splitFragment,stepFragments,artworkBox,polygonArea} from './slice-fragments.js?v=49439-web12';
const bomb=new Image(),galaxy=new Image(),imageLoads=new WeakMap();
function loadSliceImage(image,src){
 if(image.complete&&image.naturalWidth)return Promise.resolve(true);
 if(!imageLoads.has(image)){
  const loading=new Promise(resolve=>{let done=false;const finish=ready=>{if(done)return;done=true;window.clearTimeout(timer);resolve(ready);};const timer=window.setTimeout(()=>{image.src='';finish(false);},12000);image.src=src;image.decode().then(()=>finish(true),()=>finish(false));});
  imageLoads.set(image,loading.then(ready=>{if(!ready)imageLoads.delete(image);return ready;}));
 }
 return imageLoads.get(image);
}
async function prepareAssets(){return (await Promise.all([shapeArtReady,loadSliceImage(bomb,'assets/slice-bomb-v239.webp'),loadSliceImage(galaxy,'assets/slice-galaxy-v49476.webp')])).every(Boolean);}
const KEY='shape-shift-slice-v1',colors=['#ff5878','#49ceff','#6bff89','#ffe56c'];
export function initShapeSlice({sound=name=>window.gameAudio?.ui(name),getXp=()=>0,reward=()=>false,onProgress=()=>{},onQuestEvent=()=>{},onClose=()=>{},getLoadout=()=>({})}={}){
 const teaching=createMiniTutorial('slice');
 const dialog=document.createElement('dialog');dialog.id='shape-slice';dialog.setAttribute('aria-label','Shape Slice');document.body.append(dialog);
 let progress;try{progress=sliceProgress(JSON.parse(window.ShapeShiftPlatform.storage.getItem(KEY)));}catch{progress=sliceProgress();}
 let sceneryTint;
 let game,canvas,ctx,trailCanvas,trailCtx,scoreText,bestText,coinText,livesText,notice,lifeNotice,lifeLossTime=0,lifeLossCount=0,lifeLossReason='',overlay,transform,raf=0,last=0,paused=false,version=0,saved=false,pendingSave,runId,pointer=null,previous=null,trail=[],fragments=[],sparks=[],effects={sparks:[],flashes:[]},labels=[],impacts=[],camera={x:0,y:0},lastBombAt=-100,flash=0,quiet=false,stroke=0,swipeSeconds=0,swipeColor=sliceTrailColor(0),motionEnergy=0,motionAt=-100,motionStamp=null;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;};
 const play=name=>{try{sound(name)?.catch?.(()=>{});}catch{}};
 const continueOffer=createMiniContinue();
 const resultsScreen=createMiniResults();
 const hitFeedback=createHitFeedback(dialog,{sound:play,reducedMotion:()=>quiet,hearts:()=>livesText});
 function button(text,fn,cls='drop-action'){const b=el('button',cls,text);b.type='button';b.onclick=()=>{play('click');fn();};return b;}
 function persist(next){try{window.ShapeShiftPlatform.storage.setItem(KEY,JSON.stringify(next));}catch{return false;}progress=next;try{onProgress(next);}catch{}return true;}
 function settle(){let next=progress;for(const entry of progress.pending){try{if(reward(entry)!==false){play('coin-arrive');next={...next,pending:next.pending.filter(e=>e.id!==entry.id)};}}catch{}}if(next!==progress)persist(next);}
 function save(){if(!game||saved)return true;pendingSave??=finishSliceProgress(progress,game,runId);if(!persist(pendingSave))return false;saved=true;onQuestEvent({type:'finish',mode:'slice',time:game.time});pendingSave=null;settle();return true;}
 function stop(){teaching.clear();resultsScreen.reset();continueOffer.reset();lastHud='';paintTime=0;window.gameAudio?.stopPraise();hitFeedback.reset();endGesture(true);version++;window.ShapeShiftPlatform.cancelAnimationFrame(raf);game?.dispose();game=null;pointer=null;previous=null;trail=[];fragments=[];sparks=[];effects={sparks:[],flashes:[]};labels=[];impacts=[];camera={x:0,y:0};lastBombAt=-100;flash=0;lifeLossTime=0;lifeLossCount=0;lifeLossReason='';overlay=null;}
 function close(){if(game&&!save()){result();return;}stop();dialog.close();window.gameAudio?.setScene('menu');onClose();}
 function panel(title){overlay?.remove();overlay=el('div','drop-overlay');const card=el('section','drop-panel');card.append(el('h2','',title));overlay.append(card);dialog.append(overlay);for(const child of dialog.children)if(child!==overlay)child.inert=true;return card;}
 function endGesture(clear=false){motionEnergy=0;motionStamp=null;window.gameAudio?.stopSlice();const id=pointer;pointer=null;previous=null;game?.endStroke();if(id!==null&&dialog.hasPointerCapture(id))dialog.releasePointerCapture(id);if(clear){trail=[];renderTrail();}}
 function pause(){if(!game||game.over||paused)return;paused=true;window.gameAudio?.stopPraise();dialog.dataset.paused='true';endGesture(true);const card=panel('Paused');card.classList.add('drop-pause-panel');card.append(button('Resume',resume),button('End run',()=>{game.end();result();},'drop-secondary'));card.querySelector('button').focus();}
 function resume(){if(!game||game.over)return;overlay?.remove();overlay=null;for(const child of dialog.children)child.inert=false;paused=false;dialog.dataset.paused='false';last=window.ShapeShiftPlatform.now();canvas.focus();}
 function result(){window.gameAudio?.stopPraise();if(!game)return;game.end();dialog.dataset.paused='true';endGesture(true);window.ShapeShiftPlatform.cancelAnimationFrame(raf);if(!saved&&game.lives<=0&&continueOffer.offer({description:'Watch a video to refill your hearts and keep your score.',resume:()=>{game.revive();hitFeedback.reset();lifeLossTime=0;fragments=[];effects={sparks:[],flashes:[]};resume();raf=window.ShapeShiftPlatform.requestAnimationFrame(tick);},finish:result}))return;if(!saved)play('over');const xpBefore=getXp(),stored=save();resultsScreen.show({score:game.score,best:Math.max(progress.best,game.score),coins:miniGameCoins(game.sliced,3),elapsed:game.time*1000,xpBefore,xpAfter:getXp(),stored,pending:progress.pending.length>0,retry:result,finish:close});render();
 }

 function cutEffect(piece,from,to,color){const burst=createSliceBurst(piece,from,to,color,quiet);effects.sparks.push(...burst.sparks);effects.flashes.push(burst.flash);if(effects.sparks.length>96)effects.sparks.splice(0,effects.sparks.length-96);if(effects.flashes.length>24)effects.flashes.splice(0,effects.flashes.length-24);}
 function event(e){if(e.type==='slice')teaching.event('slice');
  if(['slice','miss','hazard'].includes(e.type))onQuestEvent({type:e.type==='slice'?'success':e.type==='end'?'finish':'failure',mode:'slice',time:e.time,failure:['miss','hazard'].includes(e.type),hazard:e.type==='hazard',tile:e.piece?{shape:e.piece.shape,color:e.piece.color,vy:e.piece.vy,r:e.piece.r,wave:e.piece.wave}:null,dx:(e.to?.x||0)-(e.from?.x||0),dy:(e.to?.y||0)-(e.from?.y||0),combo:e.combo});
  if(e.type==='launch'){play('slice-launch');
  }else if(e.type==='fall'){play('slice-fall');
  }else if(e.type==='slice'){
   play('slice-cut');
   if(e.combo===3)play('bonus');fragments.push(...cutShape(e.piece,e.from,e.to,stroke));cutEffect(e.piece,e.from,e.to,colors[e.piece.color]);
   labels.push({x:e.piece.x,y:e.piece.y,age:0,text:e.combo>=3?e.combo+' SHAPE COMBO!':'+'+e.points,color:e.combo>=3?'#ffe677':'#fff'});notice.textContent=e.combo>=3?e.combo+' shapes sliced!':'Slice the pieces again!';
  }else if(e.type==='hazard'||e.type==='miss'){
   window.gameAudio?.stopPraise();hitFeedback.hit();
   lifeLossReason=lifeLossTime>1&&lifeLossReason!==e.type?'both':e.type;lifeLossCount=lifeLossTime>1?lifeLossCount+1:1;lifeLossTime=1.8;
   lifeNotice.hidden=false;lifeNotice.replaceChildren(el('strong','',`−${lifeLossCount} ${lifeLossCount===1?'HEART':'HEARTS'}`),el('span','',lifeLossReason==='both'?'Bomb + missed batch':e.type==='hazard'?'Bomb hit':lifeLossCount>1?'Missed batches':'Missed batch'));

   if(e.type==='hazard'){impacts.push(createBombImpact(e.piece,quiet));impacts=impacts.slice(-8);if(e.time-lastBombAt>.12){bombHaptic(quiet);lastBombAt=e.time;}}
   labels.push({x:e.piece.x,y:Math.min(H-45,e.piece.y),age:0,text:e.type==='hazard'?'BOMB! −1 HEART':'MISSED',color:e.type==='hazard'?'#ffb47b':'#ffb5c7'});notice.textContent=e.type==='hazard'?'Bomb hit! One heart lost.':'Missed batch. One heart lost.';
  }
 }
 let lastHud='',paintTime=0;
 function update(){const key=[game.score,game.sliced,game.lives,game.maxLives,progress.best].join(':');if(key===lastHud)return;lastHud=key;scoreText.textContent=game.score.toLocaleString();coinText.textContent=miniGameCoins(game.sliced,3).toLocaleString();coinText.parentElement.setAttribute('aria-label',miniGameCoins(game.sliced,3)+' coins earned this run');bestText.textContent=Math.max(game.score,progress.best).toLocaleString();if(livesText.dataset.count!==String(game.lives)){livesText.dataset.count=game.lives;livesText.style.setProperty('--heart-count',game.maxLives);livesText.replaceChildren(...Array.from({length:game.maxLives},(_,i)=>{const heart=el('i','heart'+(i>=game.lives?' empty':''));heart.setAttribute('aria-hidden','true');return heart;}));livesText.setAttribute('aria-label',game.lives+' of '+game.maxLives+' hearts left');}canvas.setAttribute('aria-label',`Shape Slice playfield. Score ${game.score}. ${game.lives} of ${game.maxLives} hearts left. Swipe through shapes, avoid bombs.`);}
 function hazard(p){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle*.25);/* Sprite sphere is centered at (600,775); preserve its native proportions. */const size=p.r*2/890;ctx.drawImage(bomb,-600*size,-775*size,1280*size,1280*size);ctx.restore();}
 function paintShape(p){const box=artworkBox(p.shape,p.r);ctx.translate(0,box.y);paintMiniShape(ctx,p,box.width);}
 function render(){if(!game||!ctx)return;const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;const dpr=Math.min(2,devicePixelRatio||1);if(canvas.width!==Math.round(box.width*dpr)||canvas.height!==Math.round(box.height*dpr)){canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,box.width,box.height);transform=sliceViewport(box.width,box.height);const {x,y,scale,bounds}=transform;game.setBounds(bounds);camera=bombCameraOffset(impacts);const scenery=dialog.querySelector('.slice-scenery');if(scenery)scenery.style.transform=`translate(${camera.x}px,${camera.y}px)`;const hud=dialog.querySelector('.slice-play-hud');if(hud)hud.style.transform=`translate(${camera.x}px,${camera.y}px)`;livesText.classList.toggle('slice-bomb-damage',impacts.some(p=>p.age<.4));livesText.classList.toggle('slice-life-damage',lifeLossTime>0);ctx.translate(x+camera.x,y+camera.y);ctx.scale(scale,scale);
  ctx.save(); // The canvas itself clips at the real display edges; no inner arena clip.
  if(game.time<3){ctx.fillStyle='#c6f8ffbb';ctx.textAlign='center';ctx.font='900 18px Nunito,sans-serif';ctx.fillText('SWIPE TO SLICE',W/2,H*.4);ctx.font='700 12px Nunito,sans-serif';ctx.fillText('Shapes launch from below',W/2,H*.4+24);}
  for(const p of game.pieces){if(p.hazard){hazard(p);continue;}ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.shadowColor=colors[p.color];ctx.shadowBlur=quiet?0:8;paintShape(p);ctx.restore();}
  for(const f of fragments){ctx.save();ctx.globalAlpha=1;ctx.translate(f.x,f.y);ctx.rotate(f.angle);ctx.beginPath();f.mask.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.save();ctx.clip();ctx.translate(f.artX,f.artY);paintShape(f);ctx.restore();
   // The polygon is only a clipping mask; drawing its edge exposes a false outline.
   ctx.restore();}
  for(const p of sparks){ctx.globalAlpha=Math.max(0,1-p.age/.5);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  drawSliceEffects(ctx,effects);drawBombImpacts(ctx,impacts);
  for(const l of labels){ctx.globalAlpha=Math.max(0,1-l.age/.85);ctx.fillStyle=l.color;ctx.strokeStyle='#102c4a';ctx.lineWidth=3;ctx.textAlign='center';ctx.font='1000 '+(l.text.length>5?15:22)+'px Nunito,sans-serif';const yy=l.y-(quiet?0:l.age*42),xx=Math.max(bounds.left+85,Math.min(bounds.right-85,l.x));ctx.strokeText(l.text,xx,yy);ctx.fillText(l.text,xx,yy);}ctx.globalAlpha=1;
  if(flash>0&&!quiet){ctx.fillStyle=`rgba(255,63,99,${flash*.5})`;ctx.fillRect(bounds.left,bounds.top,bounds.right-bounds.left,bounds.bottom-bounds.top);}ctx.restore();renderTrail();
 }
 function renderTrail(){
  if(!trailCanvas||!trailCtx)return;const box=dialog.getBoundingClientRect();if(!box.width||!box.height)return;
  const dpr=Math.min(2,devicePixelRatio||1),width=Math.round(box.width*dpr),height=Math.round(box.height*dpr);
  if(trailCanvas.width!==width||trailCanvas.height!==height){trailCanvas.width=width;trailCanvas.height=height;}
  trailCtx.setTransform(dpr,0,0,dpr,0,0);trailCtx.clearRect(0,0,box.width,box.height);
  if(game&&!paused&&!game.over)drawSliceTrail(trailCtx,trail,game.time,quiet);
 }
 function tick(now){if(!game||!dialog.open)return;const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(!paused&&!window.ShapeShiftPlatform.paused){game.step(hitFeedback.step(dt));if(!game.over)sceneryTint.step(dt,game.score,quiet);lifeLossTime=Math.max(0,lifeLossTime-dt);lifeNotice.hidden=lifeLossTime===0;if(pointer!==null){if(game.time-motionAt>.06)motionEnergy*=Math.exp(-dt*15);window.gameAudio?.sliceMotion(motionEnergy);}fragments=stepFragments(fragments,dt,transform?.bounds);stepSliceEffects(effects,dt);impacts=stepBombImpacts(impacts,dt);for(const p of sparks){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;}for(const l of labels)l.age+=dt;sparks=sparks.filter(p=>p.age<.5).slice(-150);labels=labels.filter(l=>l.age<.85).slice(-20);trail=trail.filter(p=>game.time-p.time<SLICE_TRAIL_LIFETIME).slice(-320);flash=Math.max(0,flash-dt);paintTime+=dt;if(paintTime>=1/60){paintTime%=1/60;update();render();}if(game.over&&!hitFeedback.active&&lifeLossTime===0&&!bombImpactPending(impacts)){result();return;}}raf=window.ShapeShiftPlatform.requestAnimationFrame(tick);}
 async function start(){if(game&&!save())return;const audioReady=window.gameAudio?.prepareGameStart('slice')?.catch(()=>false)??Promise.resolve(true);stop();const token=version;dialog.dataset.view='play';dialog.dataset.paused='false';dialog.replaceChildren();saved=false;pendingSave=null;paused=false;swipeSeconds=0;swipeColor=sliceTrailColor(0);runId='shape-slice-'+crypto.randomUUID();quiet=document.body.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenery=el('div','slice-scenery');sceneryTint=createSceneryTint(scenery,{garden:false,strength:.075});scenery.setAttribute('aria-hidden','true');scenery.append(el('div','slice-stars slice-stars-far'),el('div','slice-stars slice-stars-mid'),el('div','slice-stars slice-stars-near'));dialog.append(scenery);
  const hud=el('div','slice-play-hud'),pauseButton=button('',pause,'drop-icon drop-icon-pause');pauseButton.setAttribute('aria-label','Pause Shape Slice');scoreText=el('strong','slice-current-score','0');scoreText.setAttribute('aria-label','Current score');const best=el('div','slice-best');bestText=el('strong','','0');best.append(el('span','','BEST'),bestText);livesText=el('div','slice-lives');livesText.setAttribute('role','img');const coins=el('div','mini-run-coins'),coinIcon=el('img');coinIcon.src='assets/coin-v10.webp';coinIcon.alt='';coinText=el('strong','','0');coins.append(coinIcon,coinText);hud.append(pauseButton,scoreText,best,livesText,coins);dialog.append(hud);const stage=el('div','drop-stage');canvas=el('canvas','drop-canvas');canvas.tabIndex=0;canvas.setAttribute('role','application');stage.append(canvas);dialog.append(stage);ctx=canvas.getContext('2d');transform=null;trailCanvas=el('canvas','slice-trail-canvas');trailCanvas.setAttribute('aria-hidden','true');dialog.append(trailCanvas);trailCtx=trailCanvas.getContext('2d');
  const help=el('div','slice-help');notice=el('span','','Swipe shapes · Avoid the bombs');notice.setAttribute('aria-live','polite');help.append(notice);dialog.append(help);lifeNotice=el('div','slice-life-loss');lifeNotice.hidden=true;lifeNotice.setAttribute('role','status');lifeNotice.setAttribute('aria-live','assertive');lifeNotice.setAttribute('aria-atomic','true');dialog.append(lifeNotice);
  const loading=panel('Getting ready…');loading.setAttribute('role','status');loading.append(button('Games',close));
  let loadingTimer;
  const ready=await Promise.race([Promise.all([prepareAssets(),audioReady]).then(values=>values.every(Boolean)),new Promise(resolve=>{loadingTimer=window.ShapeShiftPlatform.setTimeout(()=>resolve(false),10000);})]);
  window.ShapeShiftPlatform.clearTimeout(loadingTimer);
  if(token!==version||!dialog.open)return;
  if(!ready){const card=panel('Unable to load');card.append(el('p','','Check your connection and try again.'),button('Retry',start),button('Games',close));return;}
  overlay?.remove();overlay=null;for(const child of dialog.children)child.inert=false;
  settle();const {frame,upgrade}=getLoadout();game=createSliceGame({frame,upgrade,onEvent:event,bounds:sliceViewport(canvas.clientWidth,canvas.clientHeight).bounds});teaching.mount(dialog);onQuestEvent({type:'start',mode:'slice',time:0});update();render();canvas.focus();window.gameAudio?.setScene('slice');last=window.ShapeShiftPlatform.now();raf=window.ShapeShiftPlatform.requestAnimationFrame(tick);
  const point=e=>{const p=slicePointerPoint(e,canvas.getBoundingClientRect(),transform);return {...p,x:p.x-camera.x/transform.scale,y:p.y-camera.y/transform.scale};};
  const addTrail=e=>{const r=dialog.getBoundingClientRect();trail.push({x:e.clientX-r.left,y:e.clientY-r.top,time:game.time,stroke,color:swipeColor});};
  const overControl=e=>[...dialog.querySelectorAll('button')].some(b=>{const r=b.getBoundingClientRect();return r.width>0&&e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;});
  const move=e=>{
   if(!game||pointer!==e.pointerId||paused||game.over||!transform)return;
   if(overControl(e)){previous=null;motionEnergy=0;motionStamp=null;window.gameAudio?.stopSlice();game.endStroke();return;}
   const samples=e.getCoalescedEvents?.()||[];
   for(const sample of samples.length?samples:[e]){
    const p=point(sample);
    if(!previous){previous=p;stroke++;game.beginStroke();addTrail(sample);continue;}
    const distance=Math.hypot(p.x-previous.x,p.y-previous.y),elapsed=Math.max(1/240,Math.min(.1,(sample.timeStamp-(motionStamp??sample.timeStamp-16))/1000));
    if(distance>.4)swipeSeconds+=elapsed;swipeColor=sliceTrailColor(swipeSeconds);
    motionStamp=sample.timeStamp;motionAt=game.time;motionEnergy=Math.min(1,distance/elapsed/1500);window.gameAudio?.sliceMotion(motionEnergy);
    const oldFragments=[...fragments];game.slice(previous,p);
    if(!game.over)for(const f of oldFragments){const cut=splitFragment(f,previous,p,stroke);if(cut){fragments=fragments.filter(item=>item!==f);fragments.push(...cut);play('slice-chip');cutEffect({...f,r:Math.min(f.r,Math.sqrt(polygonArea(f.mask)/Math.PI))},previous,p,colors[f.color]);}}
    addTrail(sample);previous=p;if(game.over)break;
   }
   if(game.over){endGesture(true);if(!hitFeedback.active&&lifeLossTime===0&&!bombImpactPending(impacts))result();}
  };
  dialog.onpointerdown=e=>{
   if(e.button!==0||!game||pointer!==null||paused||game.over||!transform||e.target.closest('button,a,input,select,textarea,.drop-overlay'))return;
   e.preventDefault();pointer=e.pointerId;previous=point(e);motionStamp=e.timeStamp;motionEnergy=0;dialog.setPointerCapture(pointer);game.beginStroke();stroke++;addTrail(e);renderTrail();
  };
  dialog.onpointermove=move;dialog.onpointerup=e=>{move(e);if(pointer===e.pointerId)endGesture();};
  dialog.onpointercancel=()=>endGesture(true);dialog.onlostpointercapture=()=>{if(pointer!==null)endGesture(true);};

 }
 dialog.addEventListener('pointerdown',e=>{if(e.button===0&&!e.target.closest('button,a,input,select,textarea'))play('surface-tap');});
 dialog.addEventListener('cancel',e=>{e.preventDefault();if(game&&!game.over){if(paused)resume();else pause();}else close();});dialog.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='p'&&game&&!game.over){e.preventDefault();paused?resume():pause();}});
 const autoPause=()=>{if(dialog.open)pause();};window.addEventListener('unused-blur',autoPause);window.addEventListener('unused-androidpause',autoPause);document.addEventListener('unused-visibilitychange',()=>{if(window.ShapeShiftPlatform.paused)autoPause();});window.addEventListener('unused-pagehide',()=>{if(game&&!saved){game.end();save();}});new ResizeObserver(()=>{if(game){endGesture(true);render();}}).observe(dialog);
 try{onProgress(progress);}catch{}
 return {async prepare(){if(!await prepareAssets())throw Error('Shape Slice assets unavailable');},open(){if(dialog.open)return;dialog.showModal();start();},close};
}
