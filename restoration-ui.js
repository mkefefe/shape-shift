import {prepareRestorationFilm} from './restoration-film.js?v=494198';
import {loadRestorationIsland,drawRestorationIsland} from './restoration-islands.js?v=494198';
import {RESTORATION_MODES,restorationView} from './restoration-view.js?v=494198';
const bounded=value=>Math.max(0,Math.min(100,Number(value)||0));
function ensureStyles(doc=document){
 if(doc.getElementById('restoration-styles'))return;
 const css=doc.createElement('link');css.id='restoration-styles';css.rel='stylesheet';css.href=new URL('./restoration-ui.css?v=494198',import.meta.url).href;doc.head.append(css);
}

// Shared progression is deliberately a small destination, not another opening
// film. Art and its geography are loaded only after play or on explicit open.
export function initRestorationUI({getSummary,sound=()=>{},onAdventure=()=>{},onMode=()=>{},onClaim=()=>null,getAudioSettings=()=>({music:true,sfx:true,musicVolume:40,sfxVolume:65})}){
 const home=document.getElementById('home');
 ensureStyles();
 const card=document.createElement('button');card.type='button';card.id='restoration-goal';card.setAttribute('aria-haspopup','dialog');
 card.innerHTML='<canvas width="112" height="112" aria-hidden="true"></canvas><span class="restoration-goal-copy"><strong>Bring color home</strong><small><span class="restoration-goal-next"></span><span class="restoration-goal-xp"></span></small><span class="restoration-mini-track" aria-hidden="true"><i></i></span></span><b></b>';
 if(home){home.classList.add('has-restoration-goal');const tagline=home.querySelector('.tagline');if(tagline)tagline.after(card);else home.prepend(card);}
 const panel=document.createElement('dialog');panel.id='restoration-dialog';panel.tabIndex=-1;panel.setAttribute('aria-labelledby','restoration-title');
 panel.innerHTML=`<button class="close" type="button" aria-label="Close island"><img src="assets/close-v45.webp" alt=""></button>
 <div class="restoration-content">
  <h2 id="restoration-title">Bring color home</h2><p class="restoration-earned" role="status" hidden></p>
  <div class="restoration-art"><canvas width="640" height="640" role="img" aria-label="Your island"></canvas><div class="restoration-percent"></div></div>
  <p class="restoration-next"></p>
  <div class="restoration-meter" role="progressbar" aria-label="Task progress toward restoration"><i></i><strong></strong></div>
  <div class="restoration-modes" role="group" aria-label="Choose a mode to see its task"></div>
  <section class="restoration-task" aria-live="polite" aria-atomic="true"><small class="restoration-task-heading"></small><strong class="restoration-task-title"></strong><div class="restoration-task-meter" role="progressbar"><i></i><b></b></div><p class="restoration-task-note"></p></section>
  <button class="primary restoration-continue" type="button">Continue Adventure</button>
 </div>`;
 (document.getElementById('app')||document.body).append(panel);
 const thumb=card.querySelector('canvas'),canvas=panel.querySelector('canvas'),ctx=canvas.getContext('2d'),earned=panel.querySelector('.restoration-earned'),meter=panel.querySelector('.restoration-meter'),nextLabel=panel.querySelector('.restoration-next'),continueButton=panel.querySelector('.restoration-continue'),taskBox=panel.querySelector('.restoration-task');
 let claiming=false,assets,assetIndex=-1,loading,animation=0,epoch=0,celebrating=false,finishAnimation,thumbPercent='',selectedMode='adventure',celebrationOverlay,stopFilmSound;
 const summary=()=>getSummary()||{};
 for(const {id,name}of RESTORATION_MODES){
  const button=document.createElement('button');button.type='button';button.dataset.mode=id;button.setAttribute('aria-pressed','false');
  button.innerHTML='<span class="restoration-mode-name"></span><span class="restoration-mode-required" aria-hidden="true"></span>';
  button.querySelector('.restoration-mode-name').textContent=name;
  button.onclick=()=>{sound('click');selectedMode=id;refreshSelection();};
  panel.querySelector('.restoration-modes').append(button);
 }
 function refreshSelection(){
  const s=summary(),view=restorationView(s,selectedMode);selectedMode=view.mode.id;
  for(const button of panel.querySelectorAll('[data-mode]')){
   const item=restorationView(s,button.dataset.mode),selected=button.dataset.mode===selectedMode;
   button.setAttribute('aria-pressed',String(selected));button.classList.toggle('required',item.required);button.classList.toggle('locked',item.locked);button.classList.toggle('complete',item.taskComplete);
   button.querySelector('.restoration-mode-required').textContent=item.locked?'Locked':item.taskComplete?'Done':item.required?'Task':'';
   button.setAttribute('aria-label',item.mode.name+(item.locked?' — '+item.title:item.taskComplete?' — task complete':item.required?' — required task':''));
  }
  taskBox.classList.toggle('is-required',view.required);taskBox.classList.toggle('is-complete',view.taskComplete);
  taskBox.querySelector('.restoration-task-heading').textContent=view.heading;
  taskBox.querySelector('.restoration-task-title').textContent=view.title;
  taskBox.querySelector('.restoration-task-note').textContent=view.note;
  const progress=taskBox.querySelector('.restoration-task-meter');progress.hidden=!view.required;
  if(view.required){progress.querySelector('i').style.width=view.ratio*100+'%';progress.querySelector('b').textContent=view.progress;progress.setAttribute('aria-label',view.task.title);progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax',String(view.task.target));progress.setAttribute('aria-valuenow',String(view.task.current));}
  continueButton.textContent=claiming?'Restoring…':view.action;continueButton.disabled=claiming||(!s.readyToRestore&&view.locked);
 }
 function paint(percent){
  if(!assets||assetIndex!==(summary().island?.index||0))return;
  if(panel.open)drawRestorationIsland(ctx,assets,percent/100);
  const key=assetIndex+':'+percent;
  if(key!==thumbPercent){drawRestorationIsland(thumb.getContext('2d'),assets,percent/100);thumbPercent=key;card.classList.add('art-ready');}
 }
 function warm(){
  const index=summary().island?.index||0;
  if(assets&&assetIndex===index)return Promise.resolve(assets);
  if(loading?.index===index)return loading.promise;
  const promise=loadRestorationIsland(index).then(art=>{if((summary().island?.index||0)===index){assets=art;assetIndex=index;paint(summary().percent);}return art;}).catch(()=>{loading=null;return null;});
  loading={index,promise};return promise;
 }
 function setMeter(percent){panel.querySelector('.restoration-percent').textContent=Math.floor(bounded(percent))+'% restored';}
 function refresh(){
  const s=summary(),percent=bounded(s.percent),complete=s.completed||percent>=100,title=complete?'All islands restored':s.next?.title||'The first trees';
  const current=bounded(s.taskPercent),required=100,xp=`${Math.floor(current)}% ready`;
  const needed=RESTORATION_MODES.find(m=>m.id===s.requiredMode)?.name;
  card.querySelector('.restoration-goal-next').textContent=complete?'All islands restored!':title;
  card.querySelector('.restoration-goal-xp').textContent=complete?'':s.readyToRestore?'Ready to restore':xp;
  card.querySelector('b').textContent=`${s.restoredIslands||0}/${s.islandCount||10}`;card.querySelector('i').style.width=(complete?100:Math.min(100,current/required*100))+'%';
  card.setAttribute('aria-label',`Your island, ${Math.floor(percent)} percent restored. ${complete?'Island restored.':'Next: '+title+'. '+(s.task?.title||xp)}`);
  nextLabel.textContent=complete?'Every island is full of color':title;canvas.setAttribute('aria-label',`Your island, ${Math.floor(percent)} percent restored`);
  meter.querySelector('i').style.width=(complete?100:current/required*100)+'%';meter.querySelector('strong').textContent=complete?'Island complete':s.readyToRestore?'Ready to restore':xp;
  meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax',String(required));meter.setAttribute('aria-valuenow',String(complete?required:current));
  refreshSelection();
  if(!celebrating){setMeter(percent);paint(percent);if(panel.open)void warm();}
 }
 function close(){stopFilmSound?.();epoch++;cancelAnimationFrame(animation);finishAnimation?.();finishAnimation=null;celebrating=false;celebrationOverlay?.remove();celebrationOverlay=null;panel.classList.remove('is-restoring');if(panel.open)panel.close();refresh();}
 panel.querySelector('.close').onclick=()=>{sound('close');close();};
 panel.addEventListener('cancel',event=>{event.preventDefault();sound('close');close();});
 panel.addEventListener('click',event=>{if(event.target!==panel)return;const r=panel.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom){sound('close');close();}});
 continueButton.onclick=async()=>{
  if(claiming)return;
  const ready=summary();
  if(ready.readyToRestore){
   claiming=true;refreshSelection();
   try{
    const token=epoch,loaded=await warm();if(!loaded||!panel.open||token!==epoch)return;
    const film=await prepareRestorationFilm(loaded,ready.island);if(!panel.open||token!==epoch)return;const result=onClaim(ready.claimId);if(result?.claimed)await celebrateIsland(loaded,ready.island,film);else {earned.textContent='Could not save. Please try again.';earned.hidden=false;}
   }catch{earned.textContent='The animation could not load. Please try again.';earned.hidden=false;}finally{claiming=false;refresh();}
   return;
  }
  if(restorationView(ready,selectedMode).locked)return;const mode=selectedMode;sound('start');close();if(mode==='adventure')onAdventure();else onMode(mode);};
 async function celebrateIsland(art,island,film){
  const token=++epoch;celebrating=true;panel.classList.add('is-restoring');
  const rect=panel.querySelector('.restoration-art').getBoundingClientRect(),bounds=panel.getBoundingClientRect();
  const overlay=document.createElement('div');overlay.className='restoration-celebration';overlay.setAttribute('role','status');overlay.setAttribute('aria-label','Restoring '+island.title);
  overlay.innerHTML='<canvas width="720" height="1280"></canvas>';
  const surface=overlay.querySelector('canvas'),q=surface.getContext('2d');celebrationOverlay=overlay;panel.append(overlay);
  const startRect={x:rect.left-bounds.left,y:rect.top-bounds.top,w:rect.width,h:rect.height};
  const settings=getAudioSettings(),media=new Audio(new URL('./assets/story-beacon/story-10.ogg',import.meta.url).href);
  media.volume=settings.music===false?0:Math.max(0,Math.min(1,(settings.musicVolume??40)/100));
  const unregister=window.ShapeShiftPlatform?.registerMedia?.(media);let stopped=false;
  const effects=film.cues.map(({name,at})=>{const audio=new Audio(new URL('./assets/audio/victory-'+name+'-v4947.ogg',import.meta.url).href);audio.volume=settings.sfx===false?0:Math.max(0,Math.min(1,(settings.sfxVolume??65)/100))*.6;return {audio,at,fired:false,off:window.ShapeShiftPlatform?.registerMedia?.(audio)};});
  const stopSound=()=>{if(stopped)return;stopped=true;for(const cue of effects){cue.audio.pause();cue.audio.removeAttribute('src');cue.audio.load();cue.off?.();}media.pause();media.removeAttribute('src');media.load();unregister?.();window.gameAudio?.resume();};stopFilmSound=stopSound;
  window.gameAudio?.pause();
  await new Promise(resolve=>{finishAnimation=resolve;let elapsed=0,last=performance.now(),soundStarted=false,soundFile='story-10.ogg';
   function frame(now){
    if(token!==epoch||!panel.open){stopSound();resolve();return;}
    const dt=Math.max(0,Math.min(100,now-last));last=now;
    const paused=document.hidden||window.ShapeShiftPlatform?.paused;
    if(!paused)elapsed+=dt;
    if(paused){media.pause();for(const cue of effects)cue.audio.pause();}else if(soundStarted&&media.paused&&!media.ended&&media.volume>0)media.play().catch(()=>{});
    const expand=Math.min(1,elapsed/800),e=expand*expand*(3-2*expand);
    overlay.style.left=startRect.x*(1-e)+'px';overlay.style.top=startRect.y*(1-e)+'px';
    overlay.style.width=(startRect.w+(bounds.width-startRect.w)*e)+'px';overlay.style.height=(startRect.h+(bounds.height-startRect.h)*e)+'px';
    if(expand<1)drawRestorationIsland(q,art,0);
    else {
     if(!soundStarted){soundStarted=true;if(media.volume>0)media.play().catch(()=>{});}
     const seconds=(elapsed-800)/1000;film.draw(q,seconds);const track=film.soundtrack(seconds);if(track.file!==soundFile){soundFile=track.file;media.onloadedmetadata=()=>{media.currentTime=track.offset;};media.src=new URL('./assets/story-beacon/'+track.file,import.meta.url).href;media.load();if(!paused&&media.volume>0)media.play().catch(()=>{});}for(const cue of effects)if(!paused&&!cue.fired&&seconds>=cue.at){cue.fired=true;if(cue.audio.volume>0)cue.audio.play().catch(()=>{});}
     overlay.setAttribute('aria-label',film.describe(seconds));
    }
    if(elapsed<800+film.duration*1000)animation=requestAnimationFrame(frame);
    else {stopSound();finishAnimation=null;resolve();}
   }animation=requestAnimationFrame(frame);
  });
  stopFilmSound=null;if(token!==epoch)return;
  await warm();if(token!==epoch)return;
  overlay.remove();celebrationOverlay=null;celebrating=false;panel.classList.remove('is-restoring');
  panel.querySelector('#restoration-title').textContent=summary().completed?'Color comes home':'A new island awaits';
  earned.hidden=true;selectedMode=summary().requiredMode||'adventure';refresh();
 }
 async function show({mode}={}){
  if(claiming)return;
  const token=++epoch;selectedMode=mode||summary().requiredMode||'adventure';refresh();
  panel.querySelector('#restoration-title').textContent='Bring color home';earned.hidden=true;
  panel.querySelector('.restoration-art').style.backgroundImage="url('assets/story-beacon/sky.webp')";
  if(!panel.open){panel.showModal();panel.focus({preventScroll:true});}
  const loaded=await warm();if(token!==epoch||!panel.open)return;
  panel.querySelector('.restoration-art').classList.toggle('unavailable',!loaded);
  if(loaded){paint(summary().percent);setMeter(summary().percent);}
 }
 card.addEventListener('pointerdown',event=>event.stopPropagation());
 card.onclick=event=>{event.stopPropagation();sound('info');void show();};
 refresh();
 // Returning to the menu can prepare its preview at idle; first-run gameplay
 // may call warm() earlier without blocking controls or loading story audio.
 if(typeof IntersectionObserver!=='undefined'){
  const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();if('requestIdleCallback'in window)requestIdleCallback(()=>void warm(),{timeout:2000});else setTimeout(()=>void warm(),600);});observer.observe(card);
 }
 return {refresh,show,close,isOpen:()=>panel.open,warm};
}
