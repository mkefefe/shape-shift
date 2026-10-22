import {starTasks} from './adventure-star-tasks.js?v=49439-web2';
import {COSMETICS} from './economy.js?v=49439-web2';
import {bindMenuSwipe,bindLaunchTap} from './menu-navigation.js?v=49439-web2';
import {rewardMarkup} from './adventure-rewards.js?v=49439-web2';
export const GAMES_UNLOCK_LEVEL=1;
export const gamesUnlocked=level=>Number.isFinite(level)&&level>=GAMES_UNLOCK_LEVEL;
export const MODES=['adventure','endless','rush'];
export function adventureFrameRequirement(level){return COSMETICS.find(c=>c.id===({20:'gold',40:'ice',60:'blossom',80:'cosmic'})[level])||null;}
export function adventureFrameAllowed(){return true;}
export const WORLD_NAMES=['Sunny Beginnings','Waterfall Way','Crystal Crossing','Blossom Heights','Golden Bridges','Cloud Gardens','Moonlit Trails','Sunset Shores','Starlight Summit','Castle in the Sky'];
export function levelSpec(level){const n=Math.max(1,Math.min(100,Math.floor(Number(level)||1)));return {level:n,world:Math.floor((n-1)/10),target:8+Math.floor((n-1)*.55),maxChoices:n<4?4:n<11?6:n<26?9:n<51?12:16,timeBonus:Math.max(0,650-(n-1)*8)};}
export function normalizeAdventure(value={}){return {cleared:Array.from({length:100},(_,i)=>value?.cleared?.[i]===true||Number(value?.stars?.[i])>0),lightning:Array.from({length:100},(_,i)=>value?.lightning?.[i]===true&&Number(value?.stars?.[i])>=3),stars:Array.from({length:100},(_,i)=>Math.max(0,Math.min(3,Math.floor(Number(value?.stars?.[i])||0)))),rushBest:Math.max(0,Math.floor(Number(value?.rushBest)||0))};}
export function unlockedLevel(progress){const i=progress.cleared.findIndex(n=>!n);return i<0?100:i+1;}
export function completeLevel(progress,level,strikes){if(level>unlockedLevel(progress)||level<1||level>100)return progress;const next=normalizeAdventure(progress);next.cleared[level-1]=true;next.stars[level-1]=Math.max(next.stars[level-1],Math.max(1,3-Math.min(2,strikes)));return next;}
export function carouselPosition(index,selected){return ((index-selected+4)%3)-1;}
export function memoryLevelGoals(level){
 const n=levelSpec(level).level;if(!adventureMechanics(n).memory)return [];
 const count=n<15?2+Math.floor((n-10)/2):Math.min(10,3+Math.floor((n-20)/15));
 const goals=[{type:'memoryCollected',target:count,required:true,label:'Collect '+count+' memory cards'}];
 for(let i=0;i<(n>=30?2:1);i++){
  const color=(Math.floor(n/4)+i)%4,shape=(n+i)%4,target=n<15?3:Math.min(6,3+Math.floor(n/30));
  goals.push({type:'collection',color,shape,target,required:true,label:'Collect '+target+' '+['red','blue','green','yellow'][color]+' '+['circles','triangles','squares','stars'][shape]});
 }
 return goals;
}
export function levelRequirements(level){
 const n=levelSpec(level).level,memory=memoryLevelGoals(n);if(memory.length)return memory;
 const count=n<=3?1:n<20?2:3,target=n<=3?3+n:n<10?3:n<20?4:Math.min(8,4+Math.floor(n/25));
 return Array.from({length:count},(_,i)=>{const color=(n-1+i)%4,shape=(Math.floor((n-1)/4)+i)%4;
 return {type:'collection',required:true,color,shape,target,label:'Collect '+target+' '+['red','blue','green','yellow'][color]+' '+['circles','triangles','squares','stars'][shape]};});
}
export function levelPrimaryGoal(level){return levelRequirements(level)[0];}
export function levelComplete(level,stats={}){return levelRequirements(level).every(goal=>objectiveMet(goal,stats));}
export function adventureLayout(level,count){
 // Complete, predictable grids: no decorative gaps or corner blockers.
 return {columns:count===1?1:count===3?3:count<=4?2:count<=9?3:count>16?5:4,cells:[],name:'classic'};
}
// Deliberate obstacle lessons, separated by clear boards for new mechanics.
// Fixed footprints keep cleared blocks from returning as the run progresses.
export function adventureDesign(level){
 const n=levelSpec(level).level;
 const lessons={4:['First block',6,[5],1],9:['Crack and clear',6,[2],2],16:['Around the center',9,[5],1],18:['Two paths',9,[4,6],1],19:['Twin blocks',9,[4,6],2]};
 let plan=lessons[n];
 if(n>=24){
  const size=n<51?9:12,columns=size===9?3:4;
  const patterns={4:['Center passage',[columns+2]],7:['Side steps',[columns+1,columns*2]],9:['Split path',[2,size-1]],0:['World finale',[columns+2,size-1]]};
  const pattern=patterns[n%10];if(pattern)plan=[pattern[0],size,pattern[1],2];
 }
 return plan?{name:plan[0],size:plan[1],blocks:plan[2],hits:plan[3]}:null;
}
export function levelTasks(level){const n=levelSpec(level).level;return starTasks(n,{seconds:adventureTimeTarget(n),frameName:id=>COSMETICS.find(c=>c.id===id)?.name||id});}
export function levelRequirementStatus(level,stats={}){return taskStatus(levelRequirements(level),stats);}
export function trackLevelPick(stats={},tile,correct,outcome){
 if(tile?.special&&outcome==='correct')return {...stats,pickups:{...stats.pickups,[tile.special]:(stats.pickups?.[tile.special]||0)+1}};
 if(!correct)return ['wrong','miss','protected'].includes(outcome)?{...stats,streak:0}:stats;
 stats=trackLevelCollection(stats,[tile]);
 return {...stats,memoryCollected:(stats.memoryCollected||0)+(tile?.memory?1:0),streak:(stats.streak||0)+1,bestStreak:Math.max(stats.bestStreak||0,(stats.streak||0)+1),
 colorChanges:(stats.colorChanges||0)+(stats.previous&&stats.previous.color!==tile.color?1:0),
 shapeChanges:(stats.shapeChanges||0)+(stats.previous&&stats.previous.shape!==tile.shape?1:0),previous:{color:tile.color,shape:tile.shape}};
}
export function starTaskValue(task,stats){if(task.type==='frame')return stats.frame===task.frame?1:0;if(task.type==='pickup')return stats.pickups?.[task.special]||0;if(task.type==='ability')return task.ability==='all'?['shield','freeze','boost'].filter(n=>stats.abilities?.[n]).length:stats.abilities?.[task.ability]?1:0;return null;}
export function trackLevelAbility(stats,name){return ['shield','freeze','boost'].includes(name)?{...stats,abilities:{...stats.abilities,[name]:true}}:stats;}
function objectiveMet(task,stats){const value=starTaskValue(task,stats);if(value!==null)return value>=task.target;if(task.type==='collection')return (stats.collections?.[task.color+':'+task.shape]||0)>=task.target;return task.type==='time'?(stats.elapsed||0)<=task.target*1000:task.type==='wrong'?(stats.wrong||0)<=task.target:task.type==='turns'?(stats.turns||0)<=task.target:(stats[task.type==='streak'?'bestStreak':task.type]||0)>=task.target;}
export function levelObjectives(level,stats={}){return levelTasks(level).map(task=>({label:task.label,done:!!stats.won&&objectiveMet(task,stats)}));}
export function saveObjectiveStars(progress,level,count){if(level>unlockedLevel(progress)||level<1||level>100||count<0)return progress;const next=normalizeAdventure(progress);next.cleared[level-1]=true;next.stars[level-1]=Math.max(next.stars[level-1],Math.min(3,count));return next;}
export function starTotal(progress){return progress.stars.reduce((a,b)=>a+b,0);}
export function initWorldMenu({start,home,screen,sound,getBest,getDifficulty,setDifficulty,getPlayerLevel=()=>1,getFrame=()=>'none',openFrames=()=>{},canStart=()=>true,isAdmin=()=>false,onAdventureComplete=()=>{},drawShape}){
 const $=id=>document.getElementById(id);
 const top=document.querySelector('.home-tools:not(.home-extras)'),bottom=document.createElement('nav');bottom.className='home-bottom';bottom.setAttribute('aria-label','Profile');$('home').append(bottom);bottom.append($('profile-open'));top.append($('leaderboard-open'),$('achievements-open'),$('shop-open'));
 const walletGroup=document.createElement('div');walletGroup.className='home-wallet-group';$('home').append(walletGroup);walletGroup.append($('coin-help-open'),$('coins-ad-open'));document.querySelector('.home-extras').hidden=true;$('mode-prev').hidden=true;$('mode-next').hidden=true;

 let progress;try{progress=normalizeAdventure(JSON.parse(window.ShapeShiftPlatform.storage.getItem('shape-shift-adventure-v1')));}catch{progress=normalizeAdventure();}
 let launching=false;
 let selected=1,level=unlockedLevel(progress);const cardTaps=createModeCardTap();
 const save=()=>{try{window.ShapeShiftPlatform.storage.setItem('shape-shift-adventure-v1',JSON.stringify(progress));}catch{}};
 const stars=n=>Array.from({length:3},(_,i)=>`<span class="map-star ${i<n?'earned':''}"><img src="assets/stars-v101.webp" alt=""></span>`).join('');
 function refresh(){
  const names=['Adventure','Endless','Games'],copy=['100 levels. A brighter world.','Keep playing. Beat your best!','60 seconds. Make every pick count.'];
  names.forEach((name,i)=>{
   let b=$('mode-cards').children[i],dot=$('mode-dots').children[i];
   if(!b){b=document.createElement('button');b.className='mode-card mode-'+MODES[i];b.setAttribute('aria-label',name+' mode');b.innerHTML=`<strong>${name}</strong><em></em><small></small>`;b.onclick=e=>{if(e.detail!==0||window.ShapeShiftPlatform.now()-lastPointerTap<600)return;if(i!==selected)select(i);else launchCard(i);};$('mode-cards').append(b);dot=document.createElement('button');dot.setAttribute('aria-label','Select '+name);dot.onclick=()=>select(i);$('mode-dots').append(dot);}
   b.dataset.position=carouselPosition(i,selected);b.setAttribute('aria-pressed',String(i===selected));b.querySelector('em').textContent=i===0?starTotal(progress)+' / '+(progress.stars.length*3):'';b.querySelector('em').hidden=i!==0;b.querySelector('em').setAttribute('aria-label',i===0?starTotal(progress)+' of '+(progress.stars.length*3)+' stars earned':'');b.querySelector('small').textContent=i===1?'Best: '+getBest():i===0?'Level '+unlockedLevel(progress):(gamesUnlocked(getPlayerLevel())?'3 endless games':'Unlocks at level '+GAMES_UNLOCK_LEVEL);b.classList.toggle('locked',i===2&&!gamesUnlocked(getPlayerLevel()));b.setAttribute('aria-label',name+' mode'+(i===2&&!gamesUnlocked(getPlayerLevel())?', locked until player level '+GAMES_UNLOCK_LEVEL:''));dot.classList.toggle('selected',i===selected);dot.setAttribute('aria-pressed',String(i===selected));
  });
  $('map-star-total').textContent=starTotal(progress)+' / '+(progress.stars.length*3);$('map-stars').setAttribute('aria-label',starTotal(progress)+' of '+(progress.stars.length*3)+' stars earned');
  const locked=selected===2&&!gamesUnlocked(getPlayerLevel());$('play').textContent=locked?'Level '+GAMES_UNLOCK_LEVEL:'Play';$('play').disabled=locked||launching;$('play').setAttribute('aria-label',locked?'Games unlocks at player level '+GAMES_UNLOCK_LEVEL:'Play '+names[selected]);$('view-map').hidden=selected!==0;$('view-map').textContent='View Map';
 }
 function select(i){cardTaps.reset();lastTapPoint=null;selected=(i+3)%3;sound('click');refresh();}
 $('mode-prev').onclick=()=>select(selected-1);$('mode-next').onclick=()=>select(selected+1);
 let lastPointerTap=-Infinity,lastTapPoint=null;const carousel=$('mode-cards');
 const resetTaps=()=>{cardTaps.reset();lastTapPoint=null;lastPointerTap=-Infinity;};
 const menuSwipe=bindMenuSwipe($('home'),{
  enabled:()=>$('app').dataset.screen==='home'&&!document.querySelector('dialog[open]'),
  modeAt:target=>{const card=target.closest('.mode-card');return card?Array.from(carousel.children).indexOf(card):-1;},
  width:()=>carousel.clientWidth,
  paint:(x,dragging)=>{carousel.classList.toggle('dragging',dragging);carousel.style.setProperty('--drag-x',x+'px');},
  swipe:direction=>select(selected+direction),cancel:resetTaps,
  tap:(mode,x,y,now)=>{
   const sameSpot=lastTapPoint&&now-lastPointerTap<=350&&Math.hypot(x-lastTapPoint.x,y-lastTapPoint.y)<=24;
   const tappedMode=sameSpot?lastTapPoint.mode:mode;lastPointerTap=now;
   if(tappedMode!==selected)select(tappedMode);
   lastTapPoint={x,y,mode:tappedMode};
   if(cardTaps.tap(tappedMode,now)){lastTapPoint=null;launchCard(tappedMode);}else sound('click');
  }
 });
 // Dialog transitions must not leave a pointer or double-tap pending on the home carousel.
 new MutationObserver(()=>menuSwipe.reset()).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open','data-screen']});
 carousel.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();select(selected+(e.key==='ArrowRight'?1:-1));}});
 function launchCard(i){cardTaps.reset();if(i===0)level=unlockedLevel(progress);startMode(MODES[i]);}
 function playSelected(){if(launching||!canStart())return;cardTaps.reset();if(selected===0)openLevel(unlockedLevel(progress));else startMode(MODES[selected]);}
 bindLaunchTap($('play'),playSelected);
 async function startMode(mode){
  if(launching||!canStart())return;
  if(mode==='rush'&&!gamesUnlocked(getPlayerLevel())){sound('map-locked');showMapNotice('Reach player level '+GAMES_UNLOCK_LEVEL+' to unlock Games.');refresh();return;}
  launching=true;cardTaps.reset();menuSwipe.reset();$('play').disabled=true;$('level-play').disabled=true;$('level-play').setAttribute('aria-busy','true');
  $('level-dialog').close();$('adventure-map').hidden=true;
  try{await start(mode,level);}finally{launching=false;$('level-play').disabled=false;$('level-play').removeAttribute('aria-busy');if($('app').dataset.screen==='home')refresh();}
 }

 function openLevel(n){
  if(launching||!canStart()||!['home','map'].includes($('app').dataset.screen))return;
  if(!isAdmin()&&n>unlockedLevel(progress)){sound('map-locked');showMapNotice('Complete Level '+(n-1)+' to unlock Level '+n+'.');return;}
  level=n;$('level-title').textContent='Level '+n;$('level-goal').textContent='Collect to win';
  let designNote=$('level-design');if(!designNote){designNote=document.createElement('p');designNote.id='level-design';$('level-goal').after(designNote);}
  const design=adventureDesign(n);designNote.hidden=!design;
  designNote.textContent=design?design.name+' · Black blocks break after '+design.hits+' adjacent '+(design.hits===1?'match':'matches')+'. No bomb needed.':'';
  let requirements=$('level-requirements');if(!requirements){requirements=document.createElement('div');requirements.id='level-requirements';$('level-goal').after(requirements);}
  renderLevelRequirements(requirements,n,{},drawShape);
  let goals=$('level-objectives');if(!goals){const heading=document.createElement('h3');heading.className='star-tasks-heading';heading.textContent='Star tasks';goals=document.createElement('ul');goals.id='level-objectives';requirements.after(heading,goals);}
  goals.innerHTML=levelTasks(n).map(task=>'<li class="star-challenge"><span class="map-star earned" aria-hidden="true"><img src="assets/stars-v101.webp" alt=""></span><span>'+task.label+'</span></li>').join('');
  let frameNote=$('level-frame-requirement');if(!frameNote){frameNote=document.createElement('p');frameNote.id='level-frame-requirement';frameNote.setAttribute('role','status');$('level-goal').after(frameNote);}
  let frameButton=$('level-choose-frame');if(!frameButton){frameButton=document.createElement('button');frameButton.id='level-choose-frame';frameButton.className='secondary';frameButton.textContent='Choose frame';frameNote.after(frameButton);frameButton.onclick=()=>{$('level-dialog').close();openFrames();};}
  const required=adventureFrameRequirement(n),ready=!required||getFrame()===required.id;
  frameNote.hidden=!required;frameButton.hidden=!required||ready;
  frameNote.textContent=required?(ready?'Frame star ready. Any frame can play.':'Optional frame star. Any frame can play.'):'';
  $('level-play').disabled=false;$('level-play').textContent='Play';
  if(!$('level-dialog').open)$('level-dialog').showModal();sound('click');
 }
 $('level-close').onclick=()=>$('level-dialog').close();bindLaunchTap($('level-play'),()=>startMode('adventure'));
 let mapWindow='',mapFrame=0,mapWidth=0;
 function paintMap(){
  mapFrame=0;const viewport=$('adventure-map'),width=viewport.clientWidth||390,range=visibleMapSections(viewport.scrollTop,viewport.clientHeight,width),key=range.join(':')+':'+width+':'+starTotal(progress)+':'+progress.lightning.join('');
  if(key===mapWindow)return;mapWindow=key;$('map-levels').replaceChildren();
  for(let section=range[0];section<=range[1];section++){
   const tile=document.createElement('div');tile.className='route-tile'+(section%2?' flipped':'');tile.style.top=((49-section)*width)+'px';tile.style.height=(width+1)+'px';$('map-levels').append(tile);
   for(let j=0;j<2;j++){const n=section*2+j+1,pos=mapNodePosition(n,width),b=document.createElement('button'),locked=!isAdmin()&&n>unlockedLevel(progress);b.className='level-node'+(locked?' locked':n===unlockedLevel(progress)?' next':' completed');b.style.left=(pos.x*100)+'%';b.style.top=pos.y+'px';b.setAttribute('aria-label','Level '+n+(locked?' locked':', '+progress.stars[n-1]+' stars'+(progress.lightning[n-1]?', Lightning Finish':'')));b.setAttribute('aria-disabled',String(locked));b.innerHTML=`<strong>${n}</strong><span class="level-stars" aria-hidden="true">${stars(progress.stars[n-1])}</span>${progress.lightning[n-1]?'<span class=map-lightning aria-hidden=true>&#9889;</span>':''}`;b.onclick=()=>openLevel(n);$('map-levels').append(b);}
  }
 }
 function sizeMap(){const width=$('adventure-map').clientWidth||390;mapWidth=width;$('map-landscape').style.height=(50*width)+'px';mapWindow='';}
 function map(){screen('map');$('adventure-map').hidden=false;sizeMap();const pos=mapNodePosition(unlockedLevel(progress),mapWidth);$('adventure-map').scrollTop=Math.max(0,pos.y-$('adventure-map').clientHeight*.60);paintMap();sound('click');}
 const mapNotice=document.createElement('div');mapNotice.id='map-notice';mapNotice.setAttribute('role','status');mapNotice.setAttribute('aria-live','polite');mapNotice.hidden=true;document.body.append(mapNotice);let mapNoticeAnimation;
 function showMapNotice(message){
 mapNoticeAnimation?.cancel();mapNotice.textContent=message;mapNotice.hidden=false;
 const animation=mapNotice.animate([{opacity:0,transform:'translate(-50%,14px)'},{opacity:1,transform:'translate(-50%,0)',offset:.12},{opacity:1,transform:'translate(-50%,-5px)',offset:.72},{opacity:0,transform:'translate(-50%,-24px)'}],{duration:2100,easing:'ease-out',fill:'forwards'});
 mapNoticeAnimation=animation;animation.finished.then(()=>{if(mapNoticeAnimation===animation)mapNotice.hidden=true;},()=>{});
 }
 let mapGesture=null;
 $('adventure-map').addEventListener('pointerdown',e=>{if(e.isPrimary)mapGesture={x:e.clientX,y:e.clientY,scroll:$('adventure-map').scrollTop,moved:false};},{passive:true});
 $('adventure-map').addEventListener('pointermove',e=>{if(mapGesture&&Math.hypot(e.clientX-mapGesture.x,e.clientY-mapGesture.y)>10)mapGesture.moved=true;},{passive:true});
 $('adventure-map').addEventListener('pointercancel',()=>{if(mapGesture)mapGesture.moved=true;},{passive:true});
 $('adventure-map').addEventListener('click',e=>{
 const dragged=e.detail!==0&&mapGesture&&(mapGesture.moved||Math.abs($('adventure-map').scrollTop-mapGesture.scroll)>10);mapGesture=null;
 if(dragged){e.preventDefault();e.stopImmediatePropagation();return;}
 if(!e.target.closest('button,a,input'))sound('surface-tap');
 },true);
 $('adventure-map').addEventListener('scroll',()=>{if(!mapFrame)mapFrame=window.ShapeShiftPlatform.requestAnimationFrame(paintMap);},{passive:true});
 new ResizeObserver(()=>{if($('adventure-map').hidden)return;const width=$('adventure-map').clientWidth;if(width&&width!==mapWidth){const ratio=$('adventure-map').scrollTop/Math.max(1,mapWidth);sizeMap();$('adventure-map').scrollTop=ratio*width;paintMap();}}).observe($('adventure-map'));
 $('view-map').onclick=()=>{if(selected===0)map();};$('map-back').onclick=()=>{mapNoticeAnimation?.cancel();mapNotice.hidden=true;home();refresh();sound('click');};
 document.querySelectorAll('[data-shop-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-shop-tab]').forEach(t=>{const on=t===b;t.setAttribute('aria-selected',String(on));$(t.dataset.shopTab).hidden=!on;});sound('click');});
 refresh();return {refresh,map,openLevel,snapshot:()=>JSON.parse(JSON.stringify(progress)),completed:()=>{const i=progress.cleared.findIndex(n=>!n);return i<0?100:i;},finish(mode,won,state,stats={}){const previouslyCleared=progress.cleared[level-1]===true;const objectives=levelObjectives(level,{...stats,won});if(mode==='adventure'&&won)progress=saveObjectiveStars(progress,level,objectives.filter(o=>o.done).length);if(mode==='rush')progress.rushBest=Math.max(progress.rushBest,state.score);const lightning=mode==='adventure'&&lightningFinish(won,stats.elapsed,objectives.filter(o=>o.done).length);if(lightning)progress.lightning[level-1]=true;save();if(mode==='adventure')onAdventureComplete({level,mode,won,previouslyCleared,admin:isAdmin()});refresh();return mode==='adventure'?rewardMarkup(objectives,lightning):'';},rushBest:()=>progress.rushBest};
}

// Two measured path-center anchors per square raster tile. Odd tiles mirror vertically.
export function mapNodePosition(level,width){const section=Math.floor((level-1)/2),upper=level%2===0,y=upper?.25:.75,sourceY=section%2?1-y:y;return {x:sourceY===.25?.654:.485,y:(49-section+y)*width};}
export function visibleMapSections(scroll,height,width){const first=Math.max(0,Math.floor(scroll/width)-1),last=Math.min(49,Math.ceil((scroll+height)/width)+1);return [Math.max(0,49-last),Math.min(49,49-first)];}

export function levelTaskStatus(level,stats={}){return taskStatus(levelTasks(level),stats);}
function taskStatus(tasks,stats){return tasks.map(task=>{
 const special=starTaskValue(task,stats);if(special!==null)return {label:task.label,value:task.type==='frame'?(special?'Equipped':'Not equipped'):Math.min(special,task.target)+' / '+task.target,progress:Math.min(1,special/task.target),state:special>=task.target?'complete':'active'};
 if(task.type==='turns'){const used=stats.turns||0;return {label:task.label,value:used+' / '+task.target,progress:Math.min(1,used/task.target),state:used>task.target?'missed':'active'};}
 if(task.type==='time'){const left=Math.max(0,Math.ceil(task.target-(stats.elapsed||0)/1000));return {label:task.label,value:formatLevelTime(left)+' remaining',progress:Math.max(0,Math.min(1,left/task.target)),state:(stats.elapsed||0)>task.target*1000?'missed':'active'};}
 if(task.type==='wrong'){const missed=(stats.wrong||0)>task.target;return {label:task.label,value:missed?'Missed this attempt':task.target?(stats.wrong||0)+' / '+task.target+' wrong picks':'Still on track',progress:missed?0:1,state:missed?'missed':'active'};}
 const value=task.type==='collection'?(stats.collections?.[task.color+':'+task.shape]||0):(stats[task.type==='streak'?'bestStreak':task.type]||0);return {label:task.label,value:Math.min(task.target,value)+' / '+task.target,progress:Math.min(1,value/task.target),state:value>=task.target?'complete':'active'};
 });}
export function formatLevelTime(seconds){return Math.floor(seconds/60)+'m '+String(Math.floor(seconds%60)).padStart(2,'0')+'s';}

// Collection counts describe actual removed items, independent of score multipliers.
export function trackLevelCollection(stats,tiles){
 const collections={...stats.collections};
 for(const tile of tiles)if(tile&&!tile.special&&!tile.collected&&Number.isInteger(tile.shape)&&Number.isInteger(tile.color)){
 const key=tile.color+':'+tile.shape;collections[key]=(collections[key]||0)+1;
 }
 return {...stats,collections};
}
export function trackBombCollections(stats,tiles){
 const removed=tiles.filter(tile=>tile&&!tile.special&&!tile.collected);
 return {...trackLevelCollection(stats,removed),memoryCollected:(stats.memoryCollected||0)+removed.filter(tile=>tile.memory).length};
}
export function collectionBoard(level,state,board,rng=Math.random,stats={}){
 const goals=levelRequirements(level);
 const pending=goals.filter(g=>g.type==='collection'&&!objectiveMet(g,stats));
 const memories=board.filter(t=>t.memory&&!t.collected);
 const candidates=[...pending,...((stats.memoryCollected||0)<(goals.find(g=>g.type==='memoryCollected')?.target||0)?memories.map(t=>({type:'collection',shape:t.shape,color:t.color})):[])];
 const goal=goals.length?(candidates[Math.min(candidates.length-1,Math.floor(rng()*candidates.length))]||{}):levelPrimaryGoal(level);
 if(goal.type!=='collection'||state.heldBoard||state.sweepBoard||state.sweepPending)return board;
 const slots=board.flatMap((t,i)=>!t.special&&!t.collected&&!t.memory?[i]:[]);
 if(!slots.length)return board;
 const result=board.map(t=>({...t}));

 const take=()=>slots.splice(Math.min(slots.length-1,Math.floor(rng()*slots.length)),1)[0];
 const target={shape:goal.shape,color:goal.color};
 const reachable=state.current.shape===target.shape||state.current.color===target.color;
 // A bridge is a correct pick now and makes the target a correct pick next.
 result[take()]=reachable?target:{shape:state.current.shape,color:target.color};
 if(slots.length)result[take()]={...target};
 return result;
}

// Blockers occupy selected holes, never ordinary card indices. Unchosen holes stay empty.
export function createRockLayout(level,count){
 const layout=adventureLayout(level,count);
 const design=adventureDesign(level),blocked=design&&count===design.size?design.blocks:[];
 return {...layout,name:blocked.length?'obstacles':layout.name,baseCount:count,cells:Array.from({length:count},(_,i)=>i+1).filter(cell=>!blocked.includes(cell)),rocks:blocked.map(cell=>({cell,hits:design.hits})),opened:[]};
}
export function damageAdjacentRocks(layout,indices,{hitCells=null,minimumHits=0}={}){
 if(!layout)return layout;
 const source=indices.map(i=>layout.cells[i]).filter(Boolean),columns=layout.columns;
 const adjacent=(a,b)=>Math.abs((a-1)%columns-(b-1)%columns)+Math.abs(Math.floor((a-1)/columns)-Math.floor((b-1)/columns))===1;
 const broken=[];
 const rocks=layout.rocks.map(rock=>{const hit=(!hitCells||!hitCells.has(rock.cell))&&source.some(c=>adjacent(c,rock.cell));if(hit)hitCells?.add(rock.cell);const hits=hit?Math.max(minimumHits,rock.hits-1):rock.hits;if(!hits)broken.push(rock.cell);return {...rock,hits};}).filter(r=>r.hits);
 if(!broken.length&&rocks.every((r,i)=>r.hits===layout.rocks[i].hits))return layout;
 const opened=[...layout.opened,...broken];
 const available=opened.filter(cell=>!layout.cells.includes(cell)&&!rocks.some(r=>(r.cell-1)%columns===(cell-1)%columns&&r.cell<cell)).sort((a,b)=>a-b);
 return {...layout,rocks,opened,newlyOpened:[...(layout.newlyOpened||[]),...available],cells:[...layout.cells,...available]};
}

// Fill newly cleared cells from their closest available card above, top to bottom.
export function rockFillPlan(layout){
 const arrivals=new Set(layout.newlyOpened||[]),depth=new Map();
 return [...arrivals].sort((a,b)=>a-b).map(cell=>{
  const column=(cell-1)%layout.columns;
  const above=layout.cells.filter(c=>c<cell&&(c-1)%layout.columns===column);
  const sourceCell=above.length?Math.max(...above):null;
  const order=sourceCell&&arrivals.has(sourceCell)?(depth.get(sourceCell)||0)+1:0;
  depth.set(cell,order);return {cell,sourceCell,delay:order*380,duration:380};
 });
}
// Optional timed stars do not end the level when their target is missed.
export const adventureTimeTarget=level=>{const goals=levelRequirements(level),total=goals.reduce((sum,g)=>sum+g.target,0),memory=goals.find(g=>g.type==='memoryCollected')?.target||0;return Math.min(140,Math.max(level<20?60:40,total*5+memory*5));};
export const lightningFinish=(won,elapsed,earnedStars)=>won===true&&earnedStars===3&&Number.isFinite(elapsed)&&elapsed>=0&&elapsed<60000;

export function createModeCardTap(interval=350){
 let last=null;
 return {reset(){last=null;},tap(mode,now){
  const activate=last!==null&&last.mode===mode&&now>=last.at&&now-last.at<=interval;
  last=activate?null:{mode,at:now};return activate;
 }};
}

// Color changes unlock at level 15 and remain active alongside later mechanics.
export function adventureMechanics(level){
 if(level<5)return {lock:null,memory:0,wheel:false};
 if(level<8)return {lock:'shape',memory:0,wheel:false};
 if(level<10)return {lock:'color',memory:0,wheel:false};
 if(level<15)return {lock:null,memory:1,wheel:false};
 if(level<20)return {lock:null,memory:0,wheel:true};
 const variant=(level-20)%4;
 return {lock:variant===1?'shape':variant===3?'color':null,memory:variant===0||variant===3?2:variant===2?3:0,wheel:true};
}
export function adventureRule(level,picks){const lock=adventureMechanics(level).lock;return lock&&picks%10>=5&&picks%10<8?lock:null;}
// Expire immediately after the final qualifying pick, before the board transition.
// New locks still begin with the next board, never partway through a choice.
export function clearExpiredMatchRule(state,level,picks){
 if(!state.matchRule)return state;
 return state.mode!=='adventure'||state.sweepBoard||state.sweepPending||adventureRule(level,picks)!==state.matchRule?{...state,matchRule:null}:state;
}
export function prepareMemoryBoard(board,memories,count,rng=Math.random){
 const result=board.map(t=>({...t}));
 // Preserve remembered cards when a board shrinks instead of duplicating them.
 for(const [slot,tile] of [...memories])if(slot>=result.length){
  const free=result.flatMap((t,i)=>!t.special&&!t.bonusTile&&!t.collected&&!memories.has(i)?[i]:[]);
  if(free.length>1){memories.delete(slot);memories.set(free[0],tile);}
 }
 for(const [slot,tile] of memories)if(slot<result.length){
 if(result[slot].special){const free=result.findIndex((t,i)=>!t.special&&!memories.has(i));if(free>=0)result[free]=result[slot];}
 result[slot]={...tile};
 }
 // Replace each collected memory card on the next board, without moving
 // cards the player is still remembering or hiding the last ordinary choice.
 const missing=Math.max(0,count-memories.size);
 if(missing){
 const slots=result.flatMap((t,i)=>!t.special&&!t.bonusTile&&!t.memory&&!t.collected?[i]:[]);
 for(let n=0;n<missing&&slots.length>1;n++){const slot=slots.splice(Math.min(slots.length-1,Math.floor(rng()*slots.length)),1)[0];const tile={...result[slot],memory:true,hidden:true,peeked:false};memories.set(slot,tile);result[slot]={...tile};}
 }
 return result;
}
export function prepareLevelMemoryBoard(level,board,memories,stats={},rng=Math.random){
 const target=memoryLevelGoals(level).find(goal=>goal.type==='memoryCollected')?.target||0;
 const remaining=Math.max(0,target-(stats.memoryCollected||0));
 return prepareMemoryBoard(board,memories,Math.min(adventureMechanics(level).memory,remaining),rng);
}
export function ensureAdventureMatch(state,board){
 if(!state.matchRule)return board;
 if(board.some(t=>!t.special&&!t.memory&&t[state.matchRule]===state.current[state.matchRule]))return board;
 const i=board.findIndex(t=>!t.special&&!t.memory&&!t.collected);if(i<0)return board;
 return board.map((t,j)=>j===i?{...t,[state.matchRule]:state.current[state.matchRule]}:t);
}

export function renderMatchRuleBadge(current,rule){
 const panel=document.querySelector('#game .current'),icon=document.getElementById('current-sprite');if(!panel||!icon)return;
 document.getElementById('match-rule-badge')?.remove();
 panel.classList.toggle('has-match-lock',!!rule);panel.dataset.matchRule=rule||'';icon.dataset.shapeLocked=String(rule==='shape');
 icon.style.setProperty('--locked-color',['#f34a61','#329aff','#58d575','#ffdf48'][current.color]);
 icon.setAttribute('role','img');icon.setAttribute('aria-label',rule==='shape'?['Circle','Triangle','Square','Star'][current.shape]+' shape, any color':rule==='color'?['Red','Blue','Green','Yellow'][current.color]+' color, any shape':['Red','Blue','Green','Yellow'][current.color]+' '+['circle','triangle','square','star'][current.shape]);
}

// Escape UI symbols so source encoding conversions cannot corrupt completion text.
export const collectionCountLabel=remaining=>remaining>0?'\u00d7'+remaining:'\u2713';
export function collectionCounters(goals,collections={}){
 return goals.filter(goal=>goal.type==='collection'||goal.type==='memoryCollected').map(goal=>{const key=goal.type==='memoryCollected'?'memory':goal.color+':'+goal.shape;return {...goal,key,remaining:Math.max(0,goal.target-(collections[key]||0))};});
}
export function renderLevelRequirements(container,level,stats,draw){
 container.replaceChildren();container.className='level-requirements';container.setAttribute('role','list');container.setAttribute('aria-label','Items left to collect');
 const counts={...stats.collections,memory:stats.memoryCollected||0};
 for(const goal of collectionCounters(levelRequirements(level),counts)){
  const item=document.createElement('span');item.className='collection-counter';item.setAttribute('role','listitem');
  const label=goal.type==='memoryCollected'?'Flip cards':['Red','Blue','Green','Yellow'][goal.color]+' '+['circles','triangles','squares','stars'][goal.shape];
  item.setAttribute('aria-label',label+': '+goal.remaining+' remaining');
  const art=document.createElement('span');art.className='sprite';art.setAttribute('aria-hidden','true');
  if(goal.type==='memoryCollected'){art.classList.add('collection-memory');art.textContent='?';}else draw(art,goal);
  const count=document.createElement('strong');count.className='collection-remaining';count.textContent=collectionCountLabel(goal.remaining);
  item.classList.toggle('requirement-complete',!goal.remaining);item.append(art,count);container.append(item);
 }
}
export function renderCollectionCounters(hud,goals,collections,draw,runKey){
 if(hud.dataset.collectionRun!==runKey){hud.replaceChildren();hud.dataset.collectionRun=runKey;hud._finishedGoals=new Set();}
 hud.classList.add('collection-goal');
 const finished=hud._finishedGoals||(hud._finishedGoals=new Set());
 for(const goal of collectionCounters(goals,collections)){
  if(finished.has(goal.key))continue;
  let item=[...hud.children].find(el=>el.dataset.goal===goal.key);
  if(!item){
   item=document.createElement('span');item.className='collection-counter';item.dataset.goal=goal.key;
   const art=document.createElement('span');art.className='sprite';art.setAttribute('aria-hidden','true');if(goal.type==='memoryCollected'){art.className='sprite collection-memory';art.textContent='?';}else draw(art,goal);
   const count=document.createElement('strong');count.className='collection-remaining';item.append(art,count);hud.append(item);
  }
  const label=goal.type==='memoryCollected'?'Memory cards':['Red','Blue','Green','Yellow'][goal.color]+' '+['circle','triangle','square','star'][goal.shape];
  item.setAttribute('aria-label',label+': '+goal.remaining+' remaining');
  item.lastChild.textContent=collectionCountLabel(goal.remaining);
  if(!goal.remaining){
   finished.add(goal.key);item.classList.add('collection-done');
   const animation=item.animate([{opacity:1},{opacity:1,offset:.65},{opacity:0}],{duration:650,fill:'forwards'});
   animation.finished.then(()=>{
    if(!item.isConnected||hud.dataset.collectionRun!==runKey)return;
    const positions=new Map([...hud.children].map(el=>[el,el.getBoundingClientRect().left]));item.remove();
    for(const el of hud.children){const dx=positions.get(el)-el.getBoundingClientRect().left;if(dx)el.animate([{transform:'translateX('+dx+'px)'},{transform:'translateX(0)'}],{duration:220,easing:'ease-out'});}
   },()=>{});
  }
 }
}

export function renderColorChangeCue(current,picks,enabled){
 const panel=document.querySelector('#game .current'),icon=document.getElementById('current-sprite');if(!panel||!icon)return;
 let cue=document.getElementById('color-change-cue');
 if(!cue){cue=document.createElement('div');cue.id='color-change-cue';cue.setAttribute('role','img');cue.innerHTML='<i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i>';}
 if(cue.parentElement!==panel)panel.insertBefore(cue,icon);
 cue.hidden=!enabled;if(!enabled)return;
 const filled=Math.max(0,Math.min(3,picks));
 cue.setAttribute('aria-label',filled===3?'Color changing':(3-filled)+' turns until color changes');
 Array.from(cue.children).forEach((segment,index)=>segment.classList.toggle('filled',index<filled));
}

// Star pickups are offered on ordinary boards, so optional stars do not rely on luck.
export function ensureStarPickup(level,stats,state,board){
 const task=levelTasks(level).find(t=>t.type==='pickup');
 if(!task||objectiveMet(task,stats)||state.heldBoard||state.bombRefillBoard||state.sweepBoard||state.sweepPending||board.some(t=>t.special===task.special))return board;
 const slots=board.flatMap((tile,i)=>!tile.special&&!tile.memory&&!tile.collected&&!tile.bonusTile?[i]:[]);
 if(slots.length<3)return board;
 const result=board.slice();result[slots.at(-1)]={special:task.special};return result;
}
