import {beginModeTransition} from './mode-transition.js?v=494123';
import {engagement,registerModeState} from './telemetry.js?v=494118';
import {createDropWater} from './drop-water.js';
import {translate} from './localization.js?v=494126';
import {createDropMergeAudio} from './drop-merge-audio.js';
import {dropArtworkGeometry} from './drop-art-geometry.js';
import {drawDropMerge,DROP_MERGE_DURATION} from './drop-merge-fx.js?v=494105';
import {createSceneryTint} from './scenery-progress.js';
import {bindDropKeyboard} from './drop-keyboard.js';
import {dropBombFeedback} from './bomb-feedback.js';
import {createMiniTutorial} from './mini-tutorial.js';
import {createMiniResults} from './mini-results.js';
import {createMiniContinue} from './mini-continue.js';
import {createHitFeedback} from './mini-hit-feedback.js';
import {ARTWORK_CROPS} from './artwork-crops.js';
import {skinArtReady,skinCrop,activeSkin} from './shape-skin-art.js?v=49499';
import {miniGameCoins} from './mini-game-rewards.js';
import {dropLayout,fitDropArtwork,dropFramePatches,dropShapeBox} from './shape-drop-view.js';
import {createDropGame,dropProgress,finishDropProgress,dropSpawnY,DROP_WIDTH as W,DROP_LINE, DROP_RADIUS} from './shape-drop-engine.js';
const KEY='shape-shift-drop-v1';
const containerArt=new Image(),obstacleArt=new Image(),bombArt=new Image(),gardenArt=new Image(),imageLoads=new WeakMap();
function loadDropImage(image,src){
 if(image.complete&&image.naturalWidth)return Promise.resolve(true);
 if(!imageLoads.has(image)){
  const loading=new Promise(resolve=>{let done=false;const finish=ready=>{if(done)return;done=true;window.clearTimeout(timer);resolve(ready);};const timer=window.setTimeout(()=>{image.src='';finish(false);},12000);image.src=src;image.decode().then(()=>finish(true),()=>finish(false));});
  imageLoads.set(image,loading.then(ready=>{if(!ready)imageLoads.delete(image);return ready;}));
 }
 return imageLoads.get(image);
}
let matterLoad;
function prepareMatter(){
 if(window.Matter)return Promise.resolve(true);
 if(!matterLoad)matterLoad=new Promise(resolve=>{
  const script=document.createElement('script');let timer;
  const finish=ready=>{window.clearTimeout(timer);script.onload=script.onerror=null;if(!ready){script.remove();matterLoad=null;}resolve(ready);};
  script.src='assets/vendor/matter-0.20.0.min.js';script.async=true;script.onload=()=>finish(!!window.Matter);script.onerror=()=>finish(false);
  timer=window.setTimeout(()=>finish(false),12000);document.head.append(script);
 });
 return matterLoad;
}
const COLORS=['#ff4f69','#36caff','#65f078','#ffe367'];
export function initShapeDrop({sound=name=>window.gameAudio?.ui(name),getXp=()=>0,reward=()=>false,onProgress=()=>{},onQuestEvent=()=>{},onClose=()=>{},getLoadout=()=>({})}={}){
 let M;
 const teaching=createMiniTutorial('drop');
 const dialog=document.createElement('dialog');dialog.id='shape-drop';dialog.setAttribute('aria-label','Shape Drop');document.body.append(dialog);
 let crops=[],artworkPromise;const collisionArtwork=new WeakMap();
 function prepareArtwork(){return artworkPromise??=Promise.all(['circle','triangle','square','star'].map(async(shape,index)=>{
  const art=new Image();art.decoding='async';if(!await loadDropImage(art,'assets/drop-'+shape+'-hd-v250.webp'))throw Error('Drop shape unavailable');
  for(const [color,crop] of ARTWORK_CROPS['drop-'+shape+'-hd-v250'].entries())crops[color*4+index]={art,...crop};
 })).then(()=>true).catch(()=>{artworkPromise=null;return false;});}
 async function prepareAssets(){
  const results=await Promise.all([prepareArtwork(),prepareMatter(),loadDropImage(containerArt,'assets/drop-container-v241.webp'),loadDropImage(obstacleArt,'assets/shape-lock-chains-v202.webp'),loadDropImage(bombArt,'assets/slice-bomb-v239.webp'),loadDropImage(gardenArt,'assets/drop-garden-v491.webp'),Promise.resolve(skinArtReady).then(values=>values.every(Boolean))]);
  M=window.Matter;const ready=results.every(Boolean)&&!!M&&crops.length===16;
  if(ready)for(let shape=0;shape<4;shape++)for(let color=0;color<4;color++)for(const obstacle of [false,true]){
   const crop=dropCrop({shape,color,obstacle});if(collisionArtwork.has(crop))continue;
   const sample=document.createElement('canvas'),scale=192/Math.max(crop.w,crop.h);sample.width=Math.round(crop.w*scale);sample.height=Math.round(crop.h*scale);
   const context=sample.getContext('2d',{willReadFrequently:true});context.drawImage(crop.art,crop.x,crop.y,crop.w,crop.h,0,0,sample.width,sample.height);
   collisionArtwork.set(crop,dropArtworkGeometry(context.getImageData(0,0,sample.width,sample.height).data,sample.width,sample.height,shape,crop.w/crop.h));sample.width=sample.height=0;
  }
  return ready;
 }
 function dropCrop(tile){if(tile.bomb)return {art:bombArt,x:0,y:0,w:1280,h:1280};return !tile.obstacle&&activeSkin()!=='classic'?skinCrop(tile):crops[tile.color*4+tile.shape];}
 let framePatches=dropFramePatches();
 let progress;try{progress=dropProgress(JSON.parse(window.ShapeShiftPlatform.storage.getItem(KEY)||'null'));}catch{progress=dropProgress();}
 let sceneryTint,dropWater;
 let game=null,raf=0,last=0,paused=false,runId='',saved=false,pendingSave=null,canvas,ctx,hudScore,hudCoins,announcement,overlay,transform,drag=null,fx=[],version=0,quiet=false,viewBounds=null,lastHud='',paintElapsed=0;
 const stamps=new Map();let stampPixels=0;
 const make=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls||'';if(text!==undefined)el.textContent=text;return el;};
 const play=name=>{try{sound(name)?.catch?.(()=>{});}catch{}};
 const mergeAudio=createDropMergeAudio(play);
 const continueOffer=createMiniContinue();
 const resultsScreen=createMiniResults();
 const hitFeedback=createHitFeedback(dialog,{sound:play,reducedMotion:()=>quiet});
 function button(label,fn,cls='drop-action'){const b=make('button',cls,label);b.type='button';b.onclick=()=>{play('click');fn();};return b;}
 function icon(label,fn,kind){const b=button('',fn,'drop-icon drop-icon-'+kind);b.setAttribute('aria-label',label);return b;}
 function sprite(tile,cls=''){const s=make('span','drop-sprite '+cls);s.setAttribute('aria-hidden','true');const crop=dropCrop(tile);if(crop){s.style.aspectRatio=crop.w+'/'+crop.h;s.style.height='auto';s.style.backgroundImage=`url('${crop.art.src}')`;s.style.backgroundSize=`${crop.art.naturalWidth/crop.w*100}% ${crop.art.naturalHeight/crop.h*100}%`;s.style.backgroundPosition=`${crop.x/(crop.art.naturalWidth-crop.w)*100}% ${crop.y/(crop.art.naturalHeight-crop.h)*100}%`;}return s;}
 function persist(next){try{window.ShapeShiftPlatform.storage.setItem(KEY,JSON.stringify(next));}catch{return false;}progress=next;try{onProgress(progress);}catch{}return true;}
 function settleRewards(){let next=progress;for(const entry of progress.pending){let paid=false;try{paid=reward(entry)!==false;}catch{}if(paid){play('coin-arrive');next={...next,pending:next.pending.filter(p=>p.id!==entry.id)};}}if(next!==progress)persist(next);}
 registerModeState('drop',()=>game&&dialog.open?{playing:!!(!game.over&&!paused&&!overlay),paused:!!(paused||!!overlay)}:null);
 function saveRun(){
  if(saved||!game)return true;
  const next=pendingSave||finishDropProgress(progress,game,runId);pendingSave=next;
  if(!persist(next))return false;saved=true;engagement.endRun('finished');onQuestEvent({type:'finish',mode:'drop',time:game.time});pendingSave=null;settleRewards();return true;
 }
 function stop(){dropWater?.dispose();dropWater=null;mergeAudio.reset();keyboard.reset();teaching.clear();resultsScreen.reset();continueOffer.reset();window.gameAudio?.stopPraise();hitFeedback.reset();for(const stamp of stamps.values())stamp.width=stamp.height=0;stamps.clear();stampPixels=0;viewBounds=null;version++;window.ShapeShiftPlatform.cancelAnimationFrame(raf);raf=0;game?.dispose();game=null;drag=null;fx=[];overlay=null;}
 function close(){if(game&&!saveRun()){pause('Progress could not be saved. Free storage and try again.');return;}stop();dialog.close();window.gameAudio?.setScene('menu');onClose();}
 function header(title,back,playView=false){const h=make('header','drop-header');h.append(icon(playView?'Pause Shape Drop':'Close Games',back,playView?'pause':'close'),make('h2','',title),make('span','drop-header-spacer'));dialog.append(h);}
 async function menu(){
  if(game&&!saveRun()){pause('Progress could not be saved. Free storage and try again.');return;}stop();const token=version;dialog.dataset.view='menu';dialog.replaceChildren();header('Games',close);await prepareArtwork();if(token!==version)return;
  const card=make('section','drop-game-card'),artboard=make('div','drop-preview-board');
  const tiles=[[0,1,18,73,-12],[2,0,43,79,8],[1,2,66,74,-8],[3,3,80,49,15],[0,2,30,40,5],[2,1,55,18,-17]];
  for(const [shape,color,x,y,angle] of tiles){const s=sprite({shape,color},'drop-preview-piece');s.style.cssText+=`;left:${x}%;top:${y}%;transform:translate(-50%,-50%) rotate(${angle}deg)`;artboard.append(s);}
  artboard.append(make('span','drop-preview-trail'));
  card.append(artboard,make('p','drop-eyebrow','ENDLESS · PHYSICS'),make('h3','','Shape Drop'),make('p','drop-description','Aim. Drop. Match. Let gravity do the rest.'));
  const rule=make('div','drop-match-example');rule.append(sprite({shape:0,color:1}),make('b','','+'),sprite({shape:0,color:2}),make('span','','Same shape'),sprite({shape:0,color:1}),make('b','','+'),sprite({shape:2,color:1}),make('span','','Same color'));card.append(rule);
  card.append(make('p','drop-copy','Touching shapes clear when their color OR shape matches. Gray chained blocks never match. Keep the pile below the line.'),button('Play Shape Drop',start));
  dialog.append(card,make('p','drop-best-summary','Best score  '+progress.best.toLocaleString()));settleRewards();window.gameAudio?.setScene('menu');
 }
 function drawShape(c,tile,x,y,size,angle=0,alpha=1,golden=false){
  if(tile.bomb){c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=alpha;const scale=size/890;c.drawImage(bombArt,-600*scale,-775*scale,1280*scale,1280*scale);c.restore();return;}
  const crop=dropCrop(tile);if(!crop)return;c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=alpha;const h=size*crop.h/crop.w;
  const density=Math.min(2,devicePixelRatio||1)*(transform?.scale||1),baseSize=dropShapeBox(tile.shape,tile.r??DROP_RADIUS).width,width=Math.max(1,Math.ceil(baseSize*density)),height=Math.max(1,Math.ceil(baseSize*crop.h/crop.w*density));
  const key=[activeSkin(),tile.shape,tile.color,!!tile.obstacle,golden,width,height].join(':');let stamp=stamps.get(key);
  if(!stamp){
   stamp=document.createElement('canvas');stamp.width=width;stamp.height=height;const paint=stamp.getContext('2d');paint.imageSmoothingQuality='high';
   if(tile.obstacle)paint.filter='grayscale(1) brightness(.82)';
   paint.drawImage(crop.art,crop.x,crop.y,crop.w,crop.h,0,0,width,height);
   if(golden){paint.filter='none';paint.globalCompositeOperation='source-atop';paint.fillStyle='#ffe264d9';paint.fillRect(0,0,width,height);paint.globalCompositeOperation='source-over';}
   if(tile.obstacle){paint.filter='none';const side=Math.min(width,height)*.94;paint.drawImage(obstacleArt,(width-side)/2,(height-side)/2,side,side);}
   stamps.set(key,stamp);stampPixels+=width*height;
   while(stamps.size>64||stampPixels>4_000_000){const oldest=stamps.keys().next().value;if(oldest===key)break;const old=stamps.get(oldest);stampPixels-=old.width*old.height;old.width=old.height=0;stamps.delete(oldest);}
  }
  c.drawImage(stamp,-size/2,-h/2,size,h);
  c.restore();
 }
 function dropHint(){return game.queue[0].bomb?'Drop the bomb to clear nearby shapes':game.queue[0].obstacle?'Locked block · Stays in the pile · Aim carefully':'Tap where you want to drop';}

 function drawMerge(f){
  drawDropMerge(ctx,f,game.time-f.at,(paint,tile,scale,golden)=>{const crop=dropCrop(tile),box=fitDropArtwork(tile.shape,tile.r,crop.w/crop.h,tile.geometry);drawShape(paint,tile,box.x*scale,box.y*scale,box.width*scale,0,1,golden);},{quiet});
 }
 function render(){
  if(!canvas||!ctx||!game)return;const rect=viewBounds??=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const dpr=Math.min(2,devicePixelRatio||1);if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);}
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
  const H=game.height;transform=dropLayout(rect.width,rect.height,H);const {scale,x,y}=transform;ctx.translate(x,y);ctx.scale(scale,scale);
  // A lightly tinted pane lets the live garden show through the open container.
  const glass=ctx.createLinearGradient(0,DROP_LINE,W,H);glass.addColorStop(0,'#d5faff1c');glass.addColorStop(.5,'#d0fbff12');glass.addColorStop(1,'#075a6c2e');
  ctx.fillStyle=glass;ctx.beginPath();ctx.roundRect(0,DROP_LINE,W,H-DROP_LINE,[0,0,12,12]);ctx.fill();
  ctx.save();ctx.beginPath();ctx.rect(-4,-130,W+8,H+177);ctx.clip();
  if(game.danger>0){ctx.fillStyle='#ff786b25';ctx.fillRect(0,DROP_LINE,W,42);}
  ctx.strokeStyle=game.danger>0?'#cf4e53':'#76a89b88';ctx.setLineDash([6,8]);ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(6,DROP_LINE);ctx.lineTo(W-6,DROP_LINE);ctx.stroke();ctx.setLineDash([]);
  if(game.danger>0){ctx.fillStyle='#a72e40';ctx.font='900 11px Nunito,sans-serif';ctx.textAlign='center';ctx.fillText(translate('Clear the top!'),W/2,DROP_LINE+20);}
  if(!game.over){
   if(drag!==null){ctx.save();ctx.strokeStyle='#ffffff';ctx.shadowColor='#164b68';ctx.shadowBlur=3;ctx.setLineDash([4,8]);ctx.lineCap='round';ctx.lineWidth=2.8;ctx.beginPath();ctx.moveTo(game.aim,52);ctx.lineTo(game.aim,Math.max(52,game.landingY()));ctx.stroke();ctx.restore();}
   const tile=game.queue[0],crop=dropCrop(tile),box=fitDropArtwork(tile.shape,tile.r??DROP_RADIUS,crop.w/crop.h,tile.geometry);
   // Use the same size, pivot and starting height as the falling body.
   ctx.save();ctx.translate(game.aim,dropSpawnY(tile));ctx.rotate(tile.angle||0);
   drawShape(ctx,tile,box.x,box.y,box.width);ctx.restore();
  }
  for(const b of game.pieces){if(b.drop.clearAt!==null)continue;const t=b.drop,age=t.clearAt===null?0:(game.time-t.clearAt)/.12,crop=dropCrop(t),box=fitDropArtwork(t.shape,t.r,crop.w/crop.h,t.geometry);ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);if(age){ctx.shadowColor=COLORS[t.color];ctx.shadowBlur=quiet?8:22;}drawShape(ctx,t,box.x,box.y,box.width*(1+age*.12),0,1-age);ctx.restore();}
  for(const f of fx){if(f.kind==='merge'){drawMerge(f);continue;}const age=(game.time-f.at)/.8;if(age>=1)continue;ctx.globalAlpha=1-age;if(!quiet){ctx.strokeStyle=f.color;ctx.lineWidth=2*(1-age);ctx.beginPath();ctx.arc(f.x,f.y,10+age*32,0,Math.PI*2);ctx.stroke();for(let k=0;k<6;k++){const a=k*Math.PI/3;ctx.fillStyle=f.color;ctx.beginPath();ctx.arc(f.x+Math.cos(a)*(12+age*35),f.y+Math.sin(a)*(12+age*35),2.4*(1-age),0,Math.PI*2);ctx.fill();}}
   if(f.label){ctx.font='1000 19px Nunito,sans-serif';ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.strokeStyle='#276c62';ctx.lineWidth=3;const yy=f.y-(quiet?12:age*32);ctx.strokeText(f.label,Math.max(35,Math.min(W-35,f.x)),yy);ctx.fillText(f.label,Math.max(35,Math.min(W-35,f.x)),yy);}}
  ctx.globalAlpha=1;ctx.restore();
  // Small translucent highlights sit on the front of the glass, below the painted rim.
  ctx.save();ctx.beginPath();ctx.roundRect(0,DROP_LINE,W,H-DROP_LINE,[0,0,12,12]);ctx.clip();
  const sheen=ctx.createLinearGradient(0,0,W,0);sheen.addColorStop(0,'#ffffff00');sheen.addColorStop(.45,'#ffffff00');sheen.addColorStop(.5,'#ffffff0e');sheen.addColorStop(.57,'#ffffff00');sheen.addColorStop(1,'#ffffff00');ctx.fillStyle=sheen;ctx.save();ctx.transform(1,0,-.3,1,90,0);ctx.fillRect(-100,DROP_LINE,W+200,H-DROP_LINE);ctx.restore();
  ctx.restore();
  for(const p of framePatches)ctx.drawImage(containerArt,p.sx,p.sy,p.sw,p.sh,p.x,p.y,p.width,p.height);

 }
 function update(){if(!game)return;const key=[game.score,game.cleared,game.pieces.length,game.drops].join(':');if(key===lastHud)return;lastHud=key;hudScore.textContent=game.score.toLocaleString();hudCoins.textContent=miniGameCoins(game.cleared).toLocaleString();hudCoins.parentElement.setAttribute('aria-label',miniGameCoins(game.cleared)+' coins earned this run');canvas.setAttribute('aria-label',`Shape Drop play area. Score ${game.score}. ${game.pieces.filter(p=>!p.drop.obstacle).length} shapes. ${game.pieces.filter(p=>p.drop.obstacle).length} locked blocks. Current drop: ${game.queue[0].bomb?'bomb, clears nearby objects':game.queue[0].obstacle?'locked block, cannot match':`matching shape, ${game.queue[0].sizeScale??1} times size`}. Drag to aim and release to drop. Hold A or D to aim smoothly, S drops. Left and right arrows also aim, Space drops, Up rotates.`);}
 function release(){if(!game||paused||game.over)return;const locked=game.queue[0].obstacle;if(game.drop()){teaching.event('drop');play(locked?'drop-block':'drop-release');announcement.textContent=locked?'Locked blocks stay in the pile':dropHint();update();}}
 function panel(title){overlay?.remove();overlay=make('div','drop-overlay');const card=make('section','drop-panel');card.append(make('h2','',title));overlay.append(card);dialog.append(overlay);for(const child of dialog.children)if(child!==overlay)child.inert=true;return card;}
 function resume(){if(!paused||game?.over)return;overlay?.remove();overlay=null;for(const child of dialog.children)child.inert=false;paused=false;dialog.dataset.paused='false';last=window.ShapeShiftPlatform.now();canvas.focus();update();}
 function pause(message){if(!game||game.over||paused)return;paused=true;keyboard.reset();window.gameAudio?.stopPraise();dialog.dataset.paused='true';drag=null;const card=panel('Paused');card.classList.add('drop-pause-panel');card.append(make('p','drop-result-best','Best score '+Math.max(progress.best,game.score).toLocaleString()));if(message)card.append(make('p','',message));card.append(button('Resume',resume),button('End run',()=>{game.end();showResult();},'drop-secondary'));card.querySelector('button').focus();update();}
 function showResult(){mergeAudio.reset();keyboard.reset();window.gameAudio?.stopPraise();if(!game)return;window.ShapeShiftPlatform.cancelAnimationFrame(raf);raf=0;paused=false;dialog.dataset.paused='true';if(!saved&&game.over&&game.endReason==='overflow'&&continueOffer.offer({description:'Watch a video to clear the upper pile and keep your score.',resume:()=>{game.revive();hitFeedback.reset();paused=true;resume();raf=window.ShapeShiftPlatform.requestAnimationFrame(tick);},finish:showResult}))return;if(!saved)play('over');const xpBefore=getXp(),stored=saveRun();resultsScreen.show({score:game.score,best:Math.max(progress.best,game.score),coins:miniGameCoins(game.cleared),elapsed:game.time*1000,xpBefore,xpAfter:getXp(),stored,pending:progress.pending.length>0,retry:showResult,finish:close});render();}

 let entering=false;
 async function start(){if(entering)return;entering=true;const gate=beginModeTransition('Shape Drop');try{await gate.covered;document.getElementById('games-hub')?.close();if(!dialog.open)dialog.showModal();await prepareRun(gate);}finally{gate.dispose();entering=false;}}
 async function prepareRun(gate){
  window.gameAudio?.start()?.catch(()=>{});
  if(game&&!saveRun())return;stop();const token=version;dialog.dataset.view='play';dialog.dataset.paused='false';dialog.replaceChildren();saved=false;pendingSave=null;paused=false;runId='shape-drop-'+crypto.randomUUID();quiet=document.body.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenery=make('div','drop-scenery');sceneryTint=createSceneryTint(scenery,{garden:true});scenery.setAttribute('aria-hidden','true');const stars=make('div','drop-night-stars');scenery.append(stars);const motes=make('div','drop-motes');for(let i=0;i<24;i++){const mote=make('i');mote.style.cssText=`left:${5+(i*37)%90}%;top:${40+(i*17)%55}%;animation-delay:${-i*1.7}s`;motes.append(mote);}scenery.append(motes);dialog.append(scenery);
  const hud=make('header','drop-play-hud');hudScore=make('strong','drop-live-score','0');hudScore.setAttribute('aria-label','Score');const coins=make('div','mini-run-coins'),coinIcon=make('img');coinIcon.src='assets/coin-v10.webp';coinIcon.alt='';hudCoins=make('strong','','0');coins.append(coinIcon,hudCoins);hud.append(icon('Pause Shape Drop',()=>pause(),'pause'),hudScore,coins);dialog.append(hud);
  const stage=make('div','drop-stage');canvas=make('canvas','drop-canvas');canvas.tabIndex=0;canvas.setAttribute('role','application');stage.append(canvas);dialog.append(stage);ctx=canvas.getContext('2d');transform=null;viewBounds=null;lastHud='';paintElapsed=0;
  const keys=make('p','drop-keyboard-hint','Hold A / D to move · S to drop');dialog.append(keys);
  announcement=make('p','drop-gesture-hint','Tap where you want to drop');announcement.setAttribute('aria-live','polite');dialog.append(announcement);
  const loading=panel('Getting ready…');loading.setAttribute('role','status');loading.append(button('Games',close,'drop-secondary'));let loadingTimer;
  const ready=await Promise.race([prepareAssets(),new Promise(resolve=>{loadingTimer=window.ShapeShiftPlatform.setTimeout(()=>resolve(false),15000);})]);window.ShapeShiftPlatform.clearTimeout(loadingTimer);
  if(token!==version||!dialog.open)return;if(!ready){const card=panel('Unable to load');card.classList.add('drop-result-panel');card.append(make('p','','Shape Drop could not load. Check your connection and try again.'),button('Retry',start),button('Games',close,'drop-secondary'));return;}
  overlay?.remove();overlay=null;for(const child of dialog.children)child.inert=false;
  dropWater=createDropWater(scenery,gardenArt);dropWater.step(0);settleRewards();const stageBounds=canvas.getBoundingClientRect();const layout=dropLayout(stageBounds.width,stageBounds.height);game=createDropGame(M,{...getLoadout(),height:layout.worldHeight,geometryFor:tile=>tile.bomb?null:collisionArtwork.get(dropCrop(tile)),autoDrop:false,onImpact:event=>play(event.type==='floor'?'drop-land':'drop-touch'),onBomb:event=>{play('slice-bomb');const rect=canvas.getBoundingClientRect();if(transform)dropBombFeedback(dialog,rect.left+transform.x+event.x*transform.scale,rect.top+transform.y+event.y*transform.scale,quiet);for(const b of event.pieces)fx.push({x:b.position.x,y:b.position.y,at:game.time,color:b.drop.obstacle?'#ffd56a':COLORS[b.drop.color],label:'+'+(game.frame==='blossom'?2:1)});announcement.textContent=event.pieces.length?'Bomb! +'+event.pieces.length*(game.frame==='blossom'?2:1):'Bomb!';lastHud='';},onEnd:e=>{if(e.reason==='overflow')hitFeedback.hit();},onClear:event=>{teaching.event('match');for(const group of event.groups)onQuestEvent({type:'success',mode:'drop',time:game.time,matches:group.length-1,combo:event.combo,height:game.height,x:group.reduce((n,b)=>n+b.position.x,0)/group.length,y:group.reduce((n,b)=>n+b.position.y,0)/group.length,obstacle:game.pieces.some(b=>b.drop.obstacle),pieces:group.map(b=>({shape:b.drop.shape,color:b.drop.color,r:b.drop.r,age:game.time-b.drop.born}))});mergeAudio.merge(game.time);for(const group of event.groups)fx.push({kind:'merge',at:game.time,x:group.reduce((sum,b)=>sum+b.position.x,0)/group.length,y:group.reduce((sum,b)=>sum+b.position.y,0)/group.length,pieces:group.map(b=>({tile:{...b.drop},x:b.position.x,y:b.position.y,angle:b.angle}))});announcement.textContent='Match!  +'+event.score;}});
  teaching.mount(dialog);engagement.startRun('drop');onQuestEvent({type:'start',mode:'drop',time:0});framePatches=dropFramePatches(game.height);update();render();window.gameAudio?.setScene('drop');canvas.focus();await gate.reveal(()=>render());if(token!==version||!dialog.open)return;last=window.ShapeShiftPlatform.now();raf=window.ShapeShiftPlatform.requestAnimationFrame(tick);
  const aim=e=>{if(paused||game.over||!transform)return;const r=canvas.getBoundingClientRect();game.aimAt((e.clientX-r.left-transform.x)/transform.scale);};
  canvas.onpointerdown=e=>{if(e.button!==0||drag!==null||paused||game.over||!transform)return;keyboard.reset();drag=e.pointerId;canvas.setPointerCapture(e.pointerId);aim(e);};canvas.onpointermove=e=>{if(drag===e.pointerId)aim(e);};canvas.onpointerup=e=>{if(drag===e.pointerId){aim(e);drag=null;release();render();}};canvas.onpointercancel=()=>{drag=null;render();};canvas.onlostpointercapture=()=>{drag=null;render();};
 }
 function tick(now){if(!game||!dialog.open)return;const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(!paused&&!window.ShapeShiftPlatform.paused){keyboard.step(dt);const drops=game.drops;game.step(hitFeedback.step(dt));mergeAudio.step(game.time);if(!game.over){sceneryTint.step(dt,game.score,quiet);dropWater?.step(dt);}if(game.drops!==drops){play('drop-release');}game.events.length=0;fx=fx.filter(f=>game.time-f.at<(f.kind==='merge'?DROP_MERGE_DURATION:.8)).slice(-80);if(game.time-game.lastClear>1.8){const hint=game.danger>0?'Clear the top before it fills!':dropHint();if(announcement.textContent!==hint)announcement.textContent=hint;}update();paintElapsed+=dt;if(paintElapsed>=1/60){paintElapsed%=1/60;render();}if(game.over&&!hitFeedback.active){showResult();return;}}raf=window.ShapeShiftPlatform.requestAnimationFrame(tick);}
 const keyboard=bindDropKeyboard(dialog,{active:()=>dialog.open&&game&&!game.over&&!paused&&!window.ShapeShiftPlatform.paused&&!overlay&&drag===null&&dialog.contains(document.activeElement),move:dx=>game.aimAt(game.aim+dx),drop:release});
 dialog.addEventListener('keydown',e=>{if(!game||game.over)return;if(e.key==='Escape'||(e.key===' '&&e.target.closest('button')))return;if(['ArrowLeft','ArrowRight','ArrowUp',' ','p','P'].includes(e.key)){e.preventDefault();if(e.key.toLowerCase()==='p'){if(paused)resume();else pause();}else if(!paused){if(e.key===' ')release();else if(e.key==='ArrowUp')game.rotate();else game.aimAt(game.aim+(e.key==='ArrowLeft'?-14:14));render();}}});
 dialog.addEventListener('pointerdown',e=>{if(e.button===0&&!e.target.closest('button,a,input,select,textarea'))play('surface-tap');});
 dialog.addEventListener('cancel',e=>{e.preventDefault();if(game&&!game.over){if(paused)resume();else pause();}else close();});
 const autoPause=()=>{if(dialog.open&&game&&!game.over&&!paused)pause();};document.addEventListener('unused-visibilitychange',()=>{if(window.ShapeShiftPlatform.paused)autoPause();});window.addEventListener('unused-blur',autoPause);window.addEventListener('shape-shift-pause',autoPause);window.addEventListener('unused-androidpause',autoPause);
 window.addEventListener('unused-pagehide',()=>{if(game&&!saved){game.end();showResult();}});new ResizeObserver(()=>{viewBounds=null;if(game)render();}).observe(dialog);
 try{onProgress(progress);}catch{}
 return {async prepare(){if(!await prepareAssets())throw Error('Shape Drop assets unavailable');},open(){if(dialog.open)return;start();play('click');},close};
}
