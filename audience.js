let selectedAgeGroup='unknown';
export function analyticsAgeGroup(){try{return localStorage.getItem('shape-shift-adult-age-group')||selectedAgeGroup;}catch{return selectedAgeGroup;}}
export function ageGroupFor(age){if(classifyAge(age)!=='adult')return 'unknown';return age<25?'18-24':age<35?'25-34':age<45?'35-44':age<55?'45-54':'55-plus';}
export const AUDIENCE_KEY='shape-shift-audience-v1';
export function classifyAge(age){
 if(typeof age!=='number'||!Number.isInteger(age)||age<0||age>120)return null;
 return age>=18?'adult':'protected';
}
export function audience(){try{const a=JSON.parse(localStorage.getItem(AUDIENCE_KEY));return ['adult','protected'].includes(a)?a:'unknown';}catch{return 'unknown';}}
export const onlineAllowed=()=>false;
// Ranking participation is independent of age and optional aggregate analytics.
export const leaderboardAllowed=()=>!window.ShapeShiftPlatform.live&&window.ShapeShiftPlatform.storage.getItem('shape-shift-online-disabled')!=='1';
export async function ensureAudience(){
 let chosen=audience();
 if(chosen==='unknown')chosen=await new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.id='age-dialog';
  dialog.setAttribute('aria-labelledby','age-title');
  dialog.innerHTML=`<div class="dialog-content age-content"><h2 id="age-title" tabindex="-1" autofocus>Welcome!</h2><p class="age-question">How old are you?</p><div class="age-picker"><button class="age-step" id="age-up" aria-label="Previous age">▲</button><div class="age-wheel" role="listbox" aria-label="Your age" tabindex="0"><div class="age-option" data-age="" role="option" aria-selected="true">Select age</div>${Array.from({length:121},(_,age)=>`<div class="age-option" id="age-option-${age}" data-age="${age}" role="option" aria-selected="false">${age}</div>`).join('')}</div><button class="age-step" id="age-down" aria-label="Next age">▼</button></div><p class="age-help">Swipe up or down to choose</p><button class="primary" id="age-continue" disabled>Continue</button><button class="age-text-action" id="age-private">Prefer not to share</button></div>`;
  document.body.append(dialog);dialog.addEventListener('cancel',e=>e.preventDefault());
  const wheel=dialog.querySelector('.age-wheel'),options=[...wheel.children],proceed=dialog.querySelector('#age-continue');
  let selected=null,lastSoundAt=-Infinity,audioReady=false;
  const prepareSound=()=>{if(audioReady)return;audioReady=true;let settings={};try{settings=JSON.parse(localStorage.getItem('shape-shift-settings'))||{};}catch{}window.gameAudio?.setMusicVolume(settings.musicVolume??40);window.gameAudio?.setSfxVolume(settings.sfxVolume??65);window.gameAudio?.setSfx(settings.sfx!==false);window.gameAudio?.setMusic(settings.music!==false);window.gameAudio?.start();};
  const tickSound=()=>{prepareSound();const now=performance.now();if(now-lastSoundAt<45)return;lastSoundAt=now;window.gameAudio?.ui('age-tick');};
  const sync=()=>{
   const index=Math.max(0,Math.min(121,Math.round(wheel.scrollTop/48)));
   const previous=selected;selected=index===0?null:index-1;if(selected!==previous)tickSound();
   options.forEach((option,i)=>option.setAttribute('aria-selected',String(i===index)));
   if(index)wheel.setAttribute('aria-activedescendant',options[index].id);else wheel.removeAttribute('aria-activedescendant');
   proceed.disabled=selected===null;
  };
  const move=delta=>{wheel.scrollTop=Math.max(0,Math.min(121,Math.round(wheel.scrollTop/48)+delta))*48;sync();};
  wheel.addEventListener('scroll',sync,{passive:true});
  // The wheel owns mouse scrolling; never chain it to the welcome page.
  let wheelDelta=0;
  wheel.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();wheelDelta+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?96:1);if(Math.abs(wheelDelta)>=32){move(Math.sign(wheelDelta));wheelDelta=0;}},{passive:false});
  dialog.addEventListener('wheel',e=>{if(!e.target.closest('.age-wheel'))e.preventDefault();},{passive:false});
  // Own dragging for touch, pen and mouse. Native snap scrolling can fight short swipes.
  let drag=null,suppressClick=false;
  wheel.addEventListener('pointerdown',e=>{if(e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;prepareSound();drag={id:e.pointerId,y:e.clientY,top:wheel.scrollTop,option:e.target.closest('.age-option')};suppressClick=false;wheel.style.scrollSnapType='none';wheel.setPointerCapture(e.pointerId);});
  wheel.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const delta=drag.y-e.clientY;if(Math.abs(delta)>3)suppressClick=true;if(suppressClick){e.preventDefault();wheel.scrollTop=Math.max(0,Math.min(121*48,drag.top+delta*1.35));sync();}});
  const endDrag=e=>{if(!drag||drag.id!==e.pointerId)return;const tapped=drag.option;drag=null;wheel.scrollTop=(!suppressClick&&e.type==='pointerup'&&tapped?options.indexOf(tapped):Math.round(wheel.scrollTop/48))*48;sync();wheel.style.scrollSnapType='';if(wheel.hasPointerCapture(e.pointerId))wheel.releasePointerCapture(e.pointerId);};
  wheel.addEventListener('pointerup',endDrag);wheel.addEventListener('pointercancel',endDrag);wheel.addEventListener('lostpointercapture',endDrag);
  wheel.addEventListener('click',e=>{if(suppressClick){suppressClick=false;return;}const option=e.target.closest('.age-option');if(option){wheel.scrollTop=options.indexOf(option)*48;sync();}});
  wheel.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp'].includes(e.key)){e.preventDefault();move(({ArrowDown:1,ArrowUp:-1,PageDown:10,PageUp:-10})[e.key]);}});
  dialog.querySelector('#age-up').onclick=()=>move(-1);
  dialog.querySelector('#age-down').onclick=()=>move(1);
  const finish=a=>{prepareSound();window.gameAudio?.ui('click').catch(()=>{});try{localStorage.setItem(AUDIENCE_KEY,JSON.stringify(a));localStorage.setItem('shape-shift-adult-age-group',a==='adult'?selectedAgeGroup:'unknown');}catch{a='protected';}dialog.close();dialog.remove();resolve(a);};
  proceed.onclick=()=>{sync();const a=classifyAge(selected);if(a){selectedAgeGroup=ageGroupFor(selected);finish(a);}};
  dialog.querySelector('#age-private').onclick=()=>finish('protected');dialog.showModal();

 });
 // The native SDK remains off until this explicit age decision.
 window.ShapeShiftAds?.setAudience?.(chosen);
 return chosen;
}
