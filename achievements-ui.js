import {ACHIEVEMENTS,achievementState,advanceAchievements} from './achievements.js';
import {MODE_ACHIEVEMENTS,achievementProgress} from './achievement-catalog.js';
import {onlineAllowed} from './audience.js?v=cloud3';
const key='shape-shift-achievements-v1';let saved;try{saved=JSON.parse(window.ShapeShiftPlatform.storage.getItem(key));}catch{}
let state=achievementState(saved),notify=()=>{},noticeTimer,hooks={},tab='endless',selected=null,collecting=false;
const $=id=>document.getElementById(id),claimed=id=>(hooks.getProfile?.().achievementClaims||[]).includes(id);
const ready=mode=>MODE_ACHIEVEMENTS.filter(a=>(!mode||a.mode===mode)&&complete(state,a)&&!claimed(a.id));
function updateBadge(){const badge=$('achievement-badge');if(!badge)return;const count=ready().length;badge.textContent=count;badge.hidden=!count;badge.parentElement.setAttribute('aria-label','Achievements'+(count?', '+count+' rewards ready':''));}

const complete=(s,a)=>claimed(a.id)||achievementProgress(s.modeStats,a)>=a.target;
export function syncAchievements(){if(onlineAllowed()&&window.ShapeShiftGames?.configured())window.ShapeShiftGames.sync(JSON.stringify(state.unlocked));}
export function trackAchievements(event){
 const next=advanceAchievements(state,event),fresh=MODE_ACHIEVEMENTS.filter(a=>complete(next,a)&&!complete(state,a));
 try{window.ShapeShiftPlatform.storage.setItem(key,JSON.stringify(next));}catch{return;}state=next;
 if(fresh.length&&event.type!=='history'){notify();syncAchievements();const notice=$('achievement-notice');notice.textContent=fresh[0].name+(fresh.length>1?' +'+(fresh.length-1):'');notice.hidden=false;window.ShapeShiftPlatform.clearTimeout(noticeTimer);noticeTimer=window.ShapeShiftPlatform.setTimeout(()=>notice.hidden=true,2600);}
 updateBadge();if($('achievements-dialog')?.open)renderAchievements();
}
const shapeCenters=[[-3.11,-5.662],[0.08,-4.705],[1.834,-5.024],[4.067,-3.589],[-2.951,-0.718],[0.08,0.399],[1.834,0.08],[4.067,1.675],[-3.11,3.589],[0.08,4.545],[1.834,4.226],[4.067,5.821],[-2.951,8.852],[0.08,9.968],[1.994,9.649],[4.067,11.244]];
const medalPositions=[[-1.934,-4.006],[-100.276,-2.901],[-200.138,-3.453],[-298.481,-3.867],[-2.21,-102.072],[-99.862,-101.657],[-200,-101.519],[-299.033,-101.243],[-1.796,-193.785],[-99.724,-193.785],[-200,-193.785],[-299.586,-193.785]];
function art(award){
 const match=/^(color|shape)([0-3])$/.exec(award.art);
 if(match){const color=match[1]==='color'?Number(match[2]):1,shape=match[1]==='shape'?Number(match[2]):2,[dx,dy]=shapeCenters[color*4+shape];const wrap=document.createElement('span');wrap.className='achievement-medal achievement-shape-art';wrap.setAttribute('aria-hidden','true');const img=document.createElement('img');img.src='assets/shapes-v2.webp';img.alt='';img.style.left=(-shape*100+dx)+'%';img.style.top=(-color*100+dy)+'%';wrap.append(img);return wrap;}
 if(award.art==='coin'){const img=document.createElement('img');img.alt='';img.className='achievement-medal';img.src='assets/coin-v10.webp';return img;}
 const index=({sliceBest:1,sliceCount:0,sliceCombo:5,dropBest:1,dropCleared:0,dropChain:5,picks:0,best:1,streakBest:2,runs:3,wins:4,highest:4,perfectWins:5,fastWins:6,memory:7,shapeLocks:8,colorLocks:9,colorChanges:10,colorChainBest:10,shapeChainBest:0,maxBoard:11,easyRuns:3,normalRuns:3,hardRuns:2,extremeRuns:2})[award.stat]??0;
 const wrap=document.createElement('span');wrap.className='achievement-medal achievement-atlas-art';wrap.setAttribute('aria-hidden','true');const img=document.createElement('img');img.src='assets/achievement-medals-v208.webp';img.alt='';img.style.left=medalPositions[index][0]+'%';img.style.top=medalPositions[index][1]+'%';
 // Clip in atlas coordinates before optical centering, so adjacent medals cannot bleed into this badge.
 const col=index%4,row=Math.floor(index/4),rowEdges=[0,363,707,1086];
 img.style.clipPath='inset('+(rowEdges[row]/1086*100)+'% '+((3-col)*25)+'% '+((1086-rowEdges[row+1])/1086*100)+'% '+(col*25)+'%)';
 wrap.append(img);return wrap;
}
function meter(award){const value=achievementProgress(state.modeStats,award),bar=document.createElement('span');bar.className='achievement-meter';bar.setAttribute('role','progressbar');bar.setAttribute('aria-label',award.name);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',award.target);bar.setAttribute('aria-valuenow',value);const fill=document.createElement('i');fill.style.width=(value/award.target*100)+'%';bar.append(fill);return bar;}
function details(award){
 selected=award;const popup=$('achievement-detail-popup'),detail=$('achievement-detail');detail.replaceChildren();
 const title=document.createElement('h3');title.id='achievement-detail-title';title.textContent=award.name;
 const desc=document.createElement('p');desc.id='achievement-detail-description';desc.textContent=award.description;
 const progress=document.createElement('strong');progress.textContent=achievementProgress(state.modeStats,award)+' / '+award.target;
 const reward=document.createElement('div');reward.className='achievement-reward';reward.textContent=award.reward+' ';const coin=document.createElement('img');coin.src='assets/coin-v10.webp';coin.alt='coins';reward.append(coin);
 const footer=document.createElement('div');footer.className='achievement-detail-footer';
 if(claimed(award.id)){const done=document.createElement('span');done.className='achievement-collected';done.textContent='Collected';footer.append(done);}
 else if(complete(state,award)){const collect=document.createElement('button');collect.className='primary achievement-collect';collect.textContent='Collect';collect.onclick=async()=>{collect.disabled=true;try{await hooks.collect?.(award,state.modeStats,collect);renderAchievements();if(selected===award&&popup.open)details(award);}catch{collect.disabled=false;footer.setAttribute('aria-label','Could not save. Please try again.');}};footer.append(collect);}
 else{const status=document.createElement('span');status.className='achievement-in-progress';status.textContent='In progress';footer.append(status);}
 detail.append(art(award),title,desc,meter(award),progress,reward,footer);
 if(!popup.open)popup.showModal();
}
function renderAchievements(){
 const list=$('achievement-list'),scroll=list.scrollTop;list.hidden=false;$('achievement-tabs').hidden=false;$('achievement-count').hidden=false;list.replaceChildren();
 for(const button of $('achievement-tabs').children){button.setAttribute('aria-selected',String(button.dataset.mode===tab));button.classList.toggle('selected',button.dataset.mode===tab);const count=ready(button.dataset.mode).length;button.querySelector('.achievement-tab-dot').hidden=!count;button.setAttribute('aria-label',button.dataset.mode[0].toUpperCase()+button.dataset.mode.slice(1)+(count?', '+count+' rewards ready':''));}
 const awards=MODE_ACHIEVEMENTS.filter(a=>a.mode===tab).sort((a,b)=>a.tier-b.tier);$('achievement-count').textContent=awards.filter(a=>complete(state,a)).length+' / '+awards.length+' earned';
 for(const award of awards){const earned=complete(state,award),card=document.createElement('button');card.className='achievement-tile'+(earned?' earned':'')+(claimed(award.id)?' claimed':'');card.dataset.award=award.id;card.setAttribute('aria-label',award.name+', '+achievementProgress(state.modeStats,award)+' of '+award.target+(claimed(award.id)?', collected':earned?', reward ready':''));const title=document.createElement('span');title.className='achievement-mini-title';title.textContent=award.shortName;const tier=document.createElement('span');tier.className='achievement-tier';tier.textContent=['I','II','III','IV','V'][award.tier];const label=document.createElement('span');label.className='achievement-mini-progress';label.textContent=claimed(award.id)?'Collected':earned?'Collect':achievementProgress(state.modeStats,award)+' / '+award.target;card.append(art(award),tier,title,meter(award),label);if(earned&&!claimed(award.id)){const dot=document.createElement('span');dot.className='achievement-ready-dot';dot.setAttribute('aria-hidden','true');card.append(dot);}card.onclick=()=>{hooks.sound?.('click');details(award);};list.append(card);}
 list.scrollTop=scroll;updateBadge();
 const collectAll=$('achievement-collect-all'),count=ready(tab).length;
 collectAll.hidden=!count;collectAll.disabled=collecting;collectAll.textContent=collecting?'Collecting…':'Collect all';
 collectAll.setAttribute('aria-label','Collect all '+count+' '+tab+' achievement rewards');
 const configured=onlineAllowed()&&window.ShapeShiftGames?.configured();$('google-achievements').hidden=!configured;$('achievement-status').textContent='';
}
export function initAchievements(onAward,options={}){
 notify=onAward;hooks=options;
 const tabs=document.createElement('div');tabs.id='achievement-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Achievement modes');
 for(const mode of ['endless','adventure','games']){const b=document.createElement('button');b.dataset.mode=mode;b.textContent=mode[0].toUpperCase()+mode.slice(1);b.setAttribute('role','tab');const dot=document.createElement('span');dot.className='achievement-tab-dot';dot.setAttribute('aria-hidden','true');b.append(dot);b.onclick=()=>{hooks.sound?.('click');tab=mode;selected=null;$('achievement-list').scrollTop=0;renderAchievements();};tabs.append(b);}
 $('achievement-list').before(tabs);
 const badge=document.createElement('span');badge.id='achievement-badge';badge.className='nav-badge';badge.hidden=true;$('achievements-open').append(badge);
 const list=$('achievement-list'),wrap=document.createElement('div');wrap.id='achievement-grid-wrap';list.before(wrap);wrap.append(list);
 const collectAll=document.createElement('button');collectAll.id='achievement-collect-all';collectAll.className='primary';collectAll.textContent='Collect all';collectAll.hidden=true;wrap.after(collectAll);
 collectAll.onclick=async()=>{
  if(collecting||!ready(tab).length)return;
  const mode=tab;collecting=true;collectAll.disabled=true;collectAll.textContent='Collecting…';$('achievement-status').textContent='';
  let failed=false;
  try{await hooks.collectAll(mode,state.modeStats,collectAll);}catch{failed=true;}
  finally{collecting=false;renderAchievements();if(failed)$('achievement-status').textContent='Could not save rewards. Please try again.';}
 };
 updateBadge();
 const popup=document.createElement('dialog');popup.id='achievement-detail-popup';popup.setAttribute('aria-labelledby','achievement-detail-title');popup.setAttribute('aria-describedby','achievement-detail-description');
 const close=document.createElement('button');close.className='close';close.setAttribute('aria-label','Close achievement details');const closeArt=document.createElement('img');closeArt.src='assets/close-v45.webp';closeArt.alt='';close.append(closeArt);close.onclick=()=>{hooks.sound?.('close');popup.close();};
 const detail=document.createElement('div');detail.id='achievement-detail';popup.append(close,detail);document.body.append(popup);
 popup.addEventListener('close',()=>{const id=selected?.id;selected=null;renderAchievements();if($('achievements-dialog').open&&id)$('achievement-list').querySelector('[data-award="'+id+'"]')?.focus({preventScroll:true});});
 popup.addEventListener('click',e=>{if(e.target!==popup)return;const r=popup.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){hooks.sound?.('close');popup.close();}});
 $('achievements-dialog').addEventListener('close',()=>{if(popup.open)popup.close();});
 $('achievements-open').onclick=()=>{selected=null;renderAchievements();$('achievements-dialog').showModal();syncAchievements();};$('google-achievements').onclick=()=>window.ShapeShiftGames?.show();
 window.addEventListener('playgamesstatus',event=>{$('achievement-status').textContent=event.detail;});window.addEventListener('playgamesconnected',syncAchievements);window.addEventListener('unused-androidresume',syncAchievements);syncAchievements();
}
