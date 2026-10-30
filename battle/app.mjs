import {createModePractice} from '../mode-practice.js?v=494200';
import {burstPath} from '../burst.js';
import {showEnemyHit} from './enemy-impact.mjs?v=494200';
import {createBattleAudio} from './audio.mjs?v=494200';
import {bindBoardKeyboard} from '../board-keyboard.js?v=494200';
import {bindPauseKeyboard} from '../pause-keyboard.js?v=494200';
import {encounter,stageEncounters} from './roster.mjs?v=494200';
import {attackPosition,cameraAttackMotion,cameraRecoilMotion} from './attack-motion.mjs?v=494200';
import {createBombImpact,stepBombImpacts,drawBombImpacts} from '../slice-effects.js';
import {skinCanvas,setActiveSkin} from '../shape-skin-art.js';
import {createRun,ENCOUNTERS,COLORS,SHAPES,matches,turnTime} from './combat.mjs?v=494200';
const $=id=>document.getElementById(id),app=$('app'),modal=$('overlay'),panel=$('panel');
let run,specialAnimating=false,paused=true,busy=false,muted=false,epoch=0,last=performance.now(),noteTimer,needPause=false,warningPlayed=false;
const embedded=new URLSearchParams(location.search).has('embedded');
let tutorialSeen,practice,practiceStep;
let cleared=0,battleDamage=10,pendingReward=null;
function send(type,data={}){if(embedded)parent.postMessage({type:'battle:'+type,...data},location.origin);}
let rewardRunId=null,rewardSeq=0,rewardRetry;
const rewardQueue=[];
function flushSharedReward(){clearTimeout(rewardRetry);if(!rewardQueue.length)return;send('reward',rewardQueue[0]);rewardRetry=setTimeout(flushSharedReward,1000);}
function sharedReward(kind){if(practice?.active)return;if(!embedded||!rewardRunId)return;rewardQueue.push({runId:rewardRunId,seq:++rewardSeq,kind,encounter:run.state.set*5+run.state.stage+1});if(rewardQueue.length===1)flushSharedReward();}
function acknowledgeReward(data){if(data.runId!==rewardRunId||data.seq!==rewardQueue[0]?.seq||data.accepted!==true)return;rewardQueue.shift();flushSharedReward();}
function metric(action){if(practice?.active)return;send('telemetry',{action});}
function fightMetric(outcome){metric(`fight_${run.state.set*5+run.state.stage+1}_${outcome}`);}
setInterval(()=>{if(run)send('telemetry',{action:'state',playing:run.state.status==='fight'&&!busy,paused:paused||document.hidden});},250);
function remember(){if(run.state.status!=='won')return;cleared=Math.max(cleared,run.state.set+1);pendingReward=['bomb','starburst','shield'][Math.floor(Math.random()*3)];if(embedded)send('progress',{completedSets:cleared,reward:pendingReward});else try{localStorage.setItem('shape-shift-battle-sets',String(cleared));}catch{}}
try{if(!embedded)cleared=Math.max(0,Number(localStorage.getItem('shape-shift-battle-sets'))||0);}catch{}
const music=new Audio('assets/battle-color-guardians-v167.ogg');music.loop=true;
let effectsAllowed=true,effectsVolume=.65,musicVolume=.2;let attackPose={enemyX:0,enemyY:0,index:-1},windMotion,lastEnemyStage=-1,attackSoundTimer;
const battleAudio=createBattleAudio(music,()=>({muted,effectsAllowed,effectsVolume,musicVolume}));
const cue=(kind,combo=0)=>battleAudio.cue(kind,combo);
const physicalSound=kind=>battleAudio.physical(kind);
const damageSound=()=>battleAudio.damage();
const playMusic=()=>battleAudio.playMusic();
function sprite(node,t){node.style.setProperty('--x',t.shape);node.style.setProperty('--y',t.color);if(node.id!=='enemy')node.replaceChildren(skinCanvas(t));}
function message(text,time=2200){if(practice?.active)return;clearTimeout(noteTimer);$('callout').textContent=text;if(time)noteTimer=setTimeout(()=>{if(run?.state.status==='fight')$('callout').textContent=run.state.combo>=3?`${run.state.combo} in a row · +4 attack`:'Match your shape OR color';},time);}
function dialog(html){panel.innerHTML=html;let close=modal.querySelector('.original-close');if(!close){close=document.createElement('button');close.className='original-close';close.setAttribute('aria-label','Close');close.innerHTML='<img src="../assets/close-v45.webp" alt="">';modal.append(close);}close.onclick=()=>run?.state.status==='fight'?resume():embedded?send('close'):intro();if(!modal.open)modal.showModal();}
function intro(){paused=true;music.pause();dialog(`<span class="eyebrow">Battle · Chapter 1</span><h2>The stolen<br>colors</h2><div class="shape-boss-preview" role="img" aria-label="The Root King, a green star monster"></div><p>The Root King and his guardians stole the land’s colors. Adventure restores the map. Here, you fight to bring those colors home.</p><span class="pill">3 lives · 5 fights · 6 choices</span><div class="campaign">${ENCOUNTERS.map((e,i)=>`<span class="${i<cleared?'restored':''}">${i<cleared?'✓':i+1} ${e.name}</span>`).join('')}</div><button class="gold" id="begin">Enter the Wildwood</button><button class="text-button" id="existing">Main menu</button>`);$('begin').onclick=start;$('existing').onclick=()=>embedded?send('close'):location.href='../';}
async function start(){practice?.clear();practice=createModePractice('battle',{seen:tutorialSeen,sound:()=>cue('start'),onComplete:()=>{tutorialSeen=true;send('tutorial-complete');void start();}});practiceStep='attack';if(run?.state.status==='lost')metric('battle_retry');if(cleared>=6)cleared=0;windMotion?.cancel();epoch++;paused=true;busy=true;await loadStage(Math.min(cleared,5));busy=false;needPause=false;run=createRun(Math.random,battleDamage,cleared,practice.active?null:pendingReward,{practice:practice.active});metric('start');fightMetric('start');warningPlayed=false;$('fx').replaceChildren();modal.close();paused=false;app.classList.remove('paused');playMusic();cue('start');render();delete app.dataset.loading;$('board').tabIndex=-1;$('board').focus({preventScroll:true});send('visible');if(practice.active){practice.mount(app);practice.guide('Match YOUR shape or color to attack—not the enemy’s.',()=>{const index=run.state.board.findIndex(t=>matches(t,run.state.current));const r=$('board').children[index]?.getBoundingClientRect();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null;});fitBoard();}message('Match your shape OR color to attack.',0);last=performance.now();if(cleared<5)void loadStage(cleared+1);if(pendingReward&&!practice.active){paused=true;busy=true;$('pause').disabled=true;await rewardArrival();busy=false;paused=false;$('pause').disabled=false;last=performance.now();}}
const loadedStages=new Map();
function loadStage(set){if(!loadedStages.has(set))loadedStages.set(set,Promise.all(stageEncounters({set}).map(e=>new Promise(resolve=>{const im=new Image();im.onload=()=>{im.decode().catch(()=>{}).then(resolve);};im.onerror=resolve;im.src=e.sprite;}))));return loadedStages.get(set);}
function render(){
 const s=run.state,e=encounter(s);if(lastEnemyStage!==s.stage){windMotion?.cancel();lastEnemyStage=s.stage;warningPlayed=false;}$('journey').setAttribute('aria-label','Stage '+(s.stage+1)+' of 5');$('journey').innerHTML=stageEncounters(s).map((_,i)=>`<span class="${i<s.stage?'done':i===s.stage?'active':''}" ${i===s.stage?'aria-current="step"':''} aria-label="Fight ${i+1}${i===4?', boss':''}"><i style="background:url(${stageEncounters(s)[i].sprite}) center/contain no-repeat"></i></span>`).join('');
 $('chapter').textContent=e.title;$('enemy-name').textContent=e.name;$('enemy-hp').textContent=`${s.enemyHp} / ${s.enemyMaxHp}`;$('enemy-fill').style.width=s.enemyHp/s.enemyMaxHp*100+'%';
 $('enemy').className=e.boss?'boss':'';$('enemy').style.backgroundImage=`url('${e.sprite}')`;$('enemy').setAttribute('aria-label',e.name);
 $('weakness').textContent=`${COLORS[e.color]} matches · ×2 damage`;
 const cue=$('color-change-cue');cue.setAttribute('aria-valuenow',s.colorTurns);cue.setAttribute('aria-valuetext',s.colorTurns===2?'Next correct match changes color':`${s.colorTurns} of 3 matches`);[...cue.children].forEach((step,i)=>step.classList.toggle('filled',i<s.colorTurns));sprite($('current'),s.current);$('current-name').textContent=COLORS[s.current.color]+' '+SHAPES[s.current.shape];
 $('hearts').innerHTML=Array.from({length:3},(_,i)=>`<span class="heart ${i<s.hp?'':'empty'}" aria-hidden="true"></span>`).join('');$('hearts').setAttribute('aria-label',`${s.hp} of ${s.maxHp} health`);$('guard').className='battle-shield';$('guard').textContent='';$('guard').hidden=!s.shield;$('guard').setAttribute('aria-label','One shield');
 $('board').dataset.size=s.board.length;
 $('board').replaceChildren(...s.board.map((t,i)=>{const b=document.createElement('button');b.className='tile choice';b.dataset.index=i;b.setAttribute('aria-label',t.special?({bomb:'Bomb: five times attack damage',starburst:'Starburst: send the other shapes into the enemy',shield:'Shield: block one enemy attack'}[t.special]):`${COLORS[t.color]} ${SHAPES[t.shape]}`);b.innerHTML=t.special?`<span class="battle-special ${t.special}"></span><small>${t.special==='starburst'?'Starburst':t.special==='bomb'?'Bomb':'Shield'}</small>`:'<span class="shape"></span>';if(t.special)b.classList.add('special-tile');else sprite(b.firstChild,t);b.onclick=()=>pick(i);return b;}));
 fitBoard();meter();
}
function fitBoard(){
 const rows=run?.state.board.length===9?3:2,css=getComputedStyle(app),gap=9;
 const fixed=['header','#journey','.player','#callout'].reduce((sum,selector)=>sum+app.querySelector(selector).getBoundingClientRect().height+(parseFloat(getComputedStyle(app.querySelector(selector)).marginTop)||0)+(parseFloat(getComputedStyle(app.querySelector(selector)).marginBottom)||0),0)+parseFloat(css.paddingTop)+parseFloat(css.paddingBottom);
 const width=app.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight);
 const reserve=(app.clientHeight<650?205:335)-(practice?.active?65:0);
 const size=Math.max(44,Math.floor(Math.min(rows===3?88:94,(width-2*gap)/3,(app.clientHeight-fixed-reserve-gap*(rows-1))/rows)));
 $('board').style.setProperty('--card-size',size+'px');$('board').style.setProperty('--rows',rows);
}
new ResizeObserver(()=>{if(run)fitBoard();}).observe(app);
function meter(){const s=run.state,e=encounter(s);$('attack-fill').style.transform=`scaleX(${s.started?1-s.clock/turnTime(s):0})`;$('attack-fill').parentElement.classList.toggle('danger',s.started&&s.clock<2);$('attack-text').textContent=practice?.active&&practiceStep==='block'?'Paused — tap the shield':s.started?`Enemy attacks in ${Math.max(0,s.clock).toFixed(1)}s`:'First match starts the fight';const imminent=s.status==='fight'&&s.clock<=1.6;const ready=imminent&&s.clock<=1&&s.guardLock===0;$('guard-tap').classList.toggle('warning',imminent);$('guard-tap').classList.toggle('ready',ready);$('enemy').classList.toggle('winding-up',imminent);$('guard-tap').setAttribute('aria-label',ready?'Tap now to block':'Tap the shield when it lights up');$('guard-tap').querySelector('span').textContent=ready?'TAP':'WAIT';if(imminent&&!warningPlayed){warningPlayed=true;prepareAttack();cue('warning');}if(!imminent){warningPlayed=false;}}
function relative(rect){const a=app.getBoundingClientRect();return {x:rect.left+rect.width/2-a.left,y:rect.top+rect.height/2-a.top};}
function pop(text,where,color){const p=document.createElement('span');p.className='damage-number';p.textContent=text;if(color)p.style.color=color;p.style.left=where.x+'px';p.style.top=where.y+'px';$('fx').append(p);p.animate([{opacity:0,transform:'translate(-50%, 10px) scale(.7)'},{opacity:1,transform:'translate(-50%, -8px) scale(1.1)',offset:.22},{opacity:1,transform:'translate(-50%, -25px)',offset:.6},{opacity:0,transform:'translate(-50%, -62px)'}],{duration:950,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>p.remove());}
function sparks(at,count=12){for(let i=0;i<count;i++){const p=document.createElement('i');p.className='spark';p.style.left=at.x+'px';p.style.top=at.y+'px';$('fx').append(p);const a=Math.random()*Math.PI*2,r=25+Math.random()*55;p.animate([{opacity:1,transform:'scale(1.4)'},{opacity:0,transform:`translate(${Math.cos(a)*r}px,${Math.sin(a)*r}px) scale(0)`}],{duration:400+Math.random()*200,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>p.remove());}}
async function flight(tile,node,delay=0,critical=false){const from=relative(node.getBoundingClientRect()),to=relative($('enemy').getBoundingClientRect());const p=document.createElement('div');p.className='shape flying';sprite(p,tile);Object.assign(p.style,{left:(from.x-24)+'px',top:(from.y-24)+'px',filter:'drop-shadow(0 0 10px #ffeeb4)'});$('fx').append(p);await p.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${(to.x-from.x)*.4}px,${(to.y-from.y)*.55}px) scale(.8)`,opacity:1,offset:.5},{transform:`translate(${to.x-from.x}px,${to.y-from.y}px) scale(.35)`,opacity:.5}],{duration:340,delay,easing:'ease-in',fill:'both'}).finished.catch(()=>{});p.remove();void bombBurst(to,{hit:true,critical,color:tile.color});}

function enemyHit(damage,at,{heavy=false,color}={}){
 return showEnemyHit({enemy:$('enemy'),healthText:$('enemy-hp'),healthFill:$('enemy-fill'),state:run.state,damage,at,pop,heavy,color,windingUp:run.state.clock<=1.6,pose:heavy?getComputedStyle($('enemy')).transform:'none'});
}

function lifeDamage(){
 damageSound();
 const layer=document.createElement('div');layer.className='battle-life-damage';layer.setAttribute('aria-hidden','true');
 app.append(layer);
 layer.addEventListener('animationend',e=>{if(e.target===layer)layer.remove();});
 $('hearts').animate([{transform:'scale(1)',filter:'none'},{transform:'scale(1.22)',filter:'drop-shadow(0 0 8px #ff4567)',offset:.22},{transform:'scale(1)',filter:'none'}],{duration:650});
}
function hurt(event){
 const blocked=event.kind==='blocked';
 if(event.enemyAttack){metric(blocked?'battle_block':'battle_enemy_hit');strikeMotion(blocked);}
 if(blocked){cue('block');pop('BLOCK',relative($('hearts').getBoundingClientRect()),'#9fe9ff');}else lifeDamage();
 message(event.wrong?'No match.':blocked?'Blocked!':'');
}
async function pick(index){
 if(paused||busy||run.state.status!=='fight'||practice?.finished||practice?.active&&practiceStep!=='attack')return;const token=epoch,tile={...run.state.board[index]},node=$('board').children[index];
 const result=run.pick(index);if(!result)return;if(result.kind==='practice-miss'){message('Try the matching shape. No heart lost.');return;}metric('input');metric(result.kind==='special'?'battle_'+result.special:result.kind==='hit'?'battle_match':'battle_wrong_pick');
 if(result.kind==='special'){busy=true;$('pause').disabled=true;pendingReward=null;send('reward-used');await specialEffect(result,node);if(token!==epoch)return;busy=false;$('pause').disabled=false;render();finishIfNeeded();return;}
 if(result.kind!=='hit'){busy=true;$('pause').disabled=true;node.classList.add('wrong');hurt(result);await new Promise(resolve=>setTimeout(resolve,450));if(token!==epoch)return;busy=false;$('pause').disabled=false;render();finishIfNeeded();return;}
 sharedReward('match');
 busy=true;$('pause').disabled=true;node.firstChild.style.opacity='.15';await flight(tile,node,0,result.critical);if(token!==epoch)return;cue('hit',run.state.combo);enemyHit(result.damage,relative($('enemy').getBoundingClientRect()),{color:result.critical?'#ffe58b':undefined});
 busy=false;$('pause').disabled=false;render();if(practice?.active){practiceStep='windup';run.state.clock=3;warningPlayed=false;meter();practice.guide('Enemy color gives double damage. Watch its attack meter.',()=>null);return;}if(result.colorShift){const meter=$('color-change-cue');meter.classList.remove('shifting');void meter.offsetWidth;meter.classList.add('shifting');$('current').animate([{filter:'brightness(2)',transform:'scale(1.15)'},{filter:'brightness(1)',transform:'scale(1)'}],{duration:420});cue('shift');}message(result.colorShift?'Color changed! Match your new color or shape.':result.interrupt?'CHARGED STRIKE! +6 damage.':result.critical?'Bonus hit! +2 damage.':result.weakness?'Enemy color! Double damage.':run.state.combo>=3?`${run.state.combo} in a row · +4 attack`:'Nice match! Your tile becomes your next match.');finishIfNeeded();
}
function finishIfNeeded(){const s=run.state;
 if(s.status==='cleared'||s.status==='won'){fightMetric('win');sharedReward('clear');
  const nextSet=s.status==='won',token=epoch,origin=relative($('enemy').getBoundingClientRect());
  if(nextSet)remember();paused=true;busy=true;$('pause').disabled=true;cue('win');
  message(nextSet?'Colors restored! Stage '+(s.set+2):'Color recovered!',0);
  sparks(origin,nextSet?32:18);impactBloom(origin,'#ffe18c');
  $('enemy').animate([{opacity:1,transform:'scale(1)'},{opacity:1,transform:'scale(1.12)',offset:.2},{opacity:0,transform:'scale(.65) translateY(-20px)'}],{duration:650,fill:'forwards'});
  setTimeout(async()=>{
   if(token!==epoch)return;
   $('enemy').getAnimations().forEach(a=>a.cancel());windMotion?.cancel();lastEnemyStage=-1;
   if(nextSet&&s.set>=5){metric('end');busy=false;$('pause').disabled=false;dialog('<h2>Colors restored!</h2><p>You defeated all 30 guardians.</p><button class="gold" id="campaign-replay">Play again</button><button class="text-button" id="campaign-home">Main menu</button>');$('campaign-replay').onclick=start;$('campaign-home').onclick=()=>embedded?send('close'):intro();return;}
   if(nextSet){await loadStage(cleared);if(token!==epoch)return;const previous=run.state;run=createRun(Math.random,battleDamage,cleared,practice.active?null:pendingReward,{practice:practice.active});for(const key of ['score','hits','misses','elapsed'])run.state[key]=previous[key];}else run.advance();
   fightMetric('start');render();
   $('enemy').animate([{opacity:0,transform:'translateY(-14px) scale(.8)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:400,easing:'ease-out'});
   if(nextSet){await rewardArrival(origin);if(cleared<5)void loadStage(cleared+1);}
   if(token!==epoch)return;
   busy=false;$('pause').disabled=false;message(encounter(run.state).rule,3000);paused=false;last=performance.now();
   if(needPause||document.hidden){needPause=false;pause();}
  },850);
 }else if(s.status==='lost'){fightMetric('loss');metric('end');paused=true;dialog(`<h2>You lost</h2><button class="gold" id="retry">Try again</button><p class="result-tap">Tap anywhere else to go back</p>`);$('retry').onclick=start;}
 else if(needPause){needPause=false;pause();}}
function pause(){if(!run||paused)return;if(busy){needPause=true;return;}windMotion?.pause();clearTimeout(attackSoundTimer);paused=true;app.classList.add('paused');music.pause();dialog(`<h2>Paused</h2><div class="pause-options"><button class="gold pause-option" id="resume">Resume</button><button class="gold pause-option" id="leave">Main menu</button></div>`);$('resume').onclick=resume;$('leave').onclick=()=>embedded?send('close'):intro();}

function resume(){if(!run||run.state.status!=='fight')return;modal.close();if(!(practice?.active&&practiceStep==='block'))windMotion?.play();paused=false;needPause=false;app.classList.remove('paused');cue('click');playMusic();last=performance.now();}
modal.addEventListener('cancel',e=>{e.preventDefault();if($('resume'))resume();});$('pause').onclick=pause;$('sound').onclick=()=>{muted=!muted;$('sound').classList.toggle('muted',muted);$('sound').setAttribute('aria-label',muted?'Enable audio':'Mute audio');if(muted)music.pause();else{playMusic();cue('click');}};
document.addEventListener('visibilitychange',()=>{if(document.hidden){music.pause();battleAudio.suspend();pause();}});
// Share the same spatial WASD + Space controls as Adventure and Endless.
// Number shortcuts remain available; dialogs retain their own keyboard navigation.
bindBoardKeyboard($('board'),{enabled:()=>!!run&&!paused&&!busy&&run.state.status==='fight'&&!modal.open,suspended:()=>!run||paused||run.state.status!=='fight'||modal.open||document.hidden});
bindPauseKeyboard(document);
const keyboardStyle=document.createElement('style');keyboardStyle.textContent='#board .keyboard-choice{outline:3px solid #fff1a1;outline-offset:2px}#board:focus{outline:none}';document.head.append(keyboardStyle);
document.addEventListener('keydown',e=>{if(e.repeat||modal.open||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;if(/^[1-9]$/.test(e.key)){e.preventDefault();void pick(+e.key-1);}else if(e.key==='Escape'){e.preventDefault();pause();}});
function tick(now){const dt=(now-last)/1000;last=now;if(run&&!paused&&!specialAnimating&&!document.hidden){if(practice?.active&&practiceStep==='windup'){run.state.clock=Math.max(.85,run.state.clock-Math.min(.05,dt));if(run.state.clock<=.85){practiceStep='block';windMotion?.pause();clearTimeout(attackSoundTimer);practice.guide('Tap the shield to block.',()=>{const r=$('guard-tap').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});}}const event=practice?.active?null:run.tick(dt);if(event){if(event.kind==='pass')message('No match. Safe pass.');else hurt(event);if(!busy){render();finishIfNeeded();}}else meter();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
// Read-only diagnostics for local balancing and automated preview checks.
window.combatPreview={snapshot:()=>run?structuredClone(run.state):null};
if(!embedded){delete app.dataset.loading;intro();}
window.addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin)return;const d=e.data;if(d?.type==='battle:reward-ack'){acknowledgeReward(d);return;}if(d?.type==='battle:init'){tutorialSeen=d.tutorialSeen===true;if(!rewardRunId&&typeof d.rewardRunId==='string')rewardRunId=d.rewardRunId;cleared=Math.max(0,Math.floor(Number(d.completedSets)||0));muted=d.muted===true;effectsAllowed=d.sfx!==false;effectsVolume=Math.max(0,Math.min(1,(d.sfxVolume??65)/100));musicVolume=d.music===false?0:Math.min(.35,(d.musicVolume??40)/200);battleDamage=Math.max(10,Math.min(30,Number(d.damage)||10));setActiveSkin(d.skin||'classic');pendingReward=['bomb','starburst','shield'].includes(d.reward)?d.reward:null;if(!run)start();}if(d?.type==='battle:save-error')message('Progress could not be saved on this device.',5000);if(d?.type==='battle:pause'){music.pause();battleAudio.suspend();pause();}});
send('ready');

modal.addEventListener('click',e=>{if(run&&['won','lost'].includes(run.state.status)&&!e.target.closest('button')){cue('click');embedded?send('close'):intro();}});

async function rewardArrival(origin){
 const node=$('board').querySelector('.special-tile');if(!node)return;
 const from=origin||relative($('enemy').getBoundingClientRect()),to=relative(node.getBoundingClientRect()),card=node.cloneNode(true),token=epoch;
 card.classList.add('reward-flight');card.removeAttribute('data-index');card.disabled=true;
 Object.assign(card.style,{position:'absolute',left:(from.x-32)+'px',top:(from.y-32)+'px',width:'64px',height:'64px',pointerEvents:'none',zIndex:5});
 $('fx').append(card);node.style.opacity='.2';
 const dx=to.x-from.x,dy=to.y-from.y,frames=[];
 for(let i=0;i<=32;i++){const t=i/32;frames.push({offset:t,transform:`translate(${dx*t}px,${dy*t-4*130*t*(1-t)}px) rotate(${(1-t)*-30}deg) scale(${.65+.35*t})`,opacity:Math.min(1,t*8)});}
 const trail=setInterval(()=>{if(card.isConnected&&!document.hidden)sparks(relative(card.getBoundingClientRect()),2);},85);
 await card.animate(frames,{duration:1150,easing:'linear',fill:'forwards'}).finished.catch(()=>{});
 clearInterval(trail);card.remove();if(token!==epoch)return;node.style.opacity='';
 node.animate([{transform:'scale(.85)',filter:'brightness(2)'},{transform:'scale(1.08)',offset:.5},{transform:'scale(1)',filter:'brightness(1)'}],{duration:320});
 impactBloom(to,'#ffdd78');sparks(to,20);cue('reward');
}
function impactBloom(at,color='#a6f7ff'){
 const ring=document.createElement('i');Object.assign(ring.style,{position:'absolute',left:at.x+'px',top:at.y+'px',width:'52px',height:'52px',border:'3px solid '+color,borderRadius:'50%',boxShadow:'0 0 18px '+color,pointerEvents:'none'});$('fx').append(ring);
 ring.animate([{opacity:.9,transform:'translate(-50%,-50%) scale(.4)'},{opacity:0,transform:'translate(-50%,-50%) scale(2.5)'}],{duration:460,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>ring.remove());
}
async function specialEffect(result,node){
 if(result.special==='starburst'){specialAnimating=true;try{await starburstVolley(result,node);}finally{specialAnimating=false;}return;}
 const bomb=result.special==='bomb',token=epoch,heldWind=windMotion?.playState==='running'?windMotion:null;
 // Keep the attack pose and timer together while the bomb lands and recoils.
 if(bomb){specialAnimating=true;heldWind?.pause();clearTimeout(attackSoundTimer);}
 const from=relative(node.getBoundingClientRect()),to=relative((bomb?$('enemy'):$('hearts')).getBoundingClientRect());
 const icon=document.createElement('i');icon.className='battle-special '+result.special;
 Object.assign(icon.style,{position:'absolute',width:'54px',height:'54px',left:(from.x-27)+'px',top:(from.y-27)+'px'});
 $('fx').append(icon);node.style.opacity='.3';
 try{
  if(!bomb)cue('shield');
  await icon.animate([{transform:'translate(0,0) scale(1)'},{transform:`translate(${to.x-from.x}px,${to.y-from.y}px) scale(1.5)`}],{duration:450,easing:'ease-in'}).finished.catch(()=>{});
  icon.remove();if(token!==epoch)return;
  if(bomb){
   physicalSound('bomb');void bombBurst(to);
   // Do not wait for the explosion tail before showing damage or the hit reaction.
   await enemyHit(result.damage,to,{heavy:true,color:'#ffe58b'}).finished.catch(()=>{});
  }else{sparks(to,24);pop('SHIELD',to,'#b7f5ff');await new Promise(resolve=>setTimeout(resolve,230));}
 }finally{
  icon.remove();
  if(bomb){specialAnimating=false;if(heldWind===windMotion&&token===epoch){if(run.state.status==='fight'&&!paused)heldWind?.play();else if(run.state.status!=='fight')heldWind?.cancel();}last=performance.now();}
 }
}

$('guard-tap').onclick=()=>{if(paused||specialAnimating||!run||practice?.finished||practice?.active&&practiceStep!=='block')return;const result=run.guard();if(!result)return;metric('input');metric(result.kind==='parry'?'battle_block':'battle_block_early');if(result.kind==='parry'){cue('parry');const at=relative($('guard-tap').getBoundingClientRect());sparks(at,24);impactBloom(at);const echo=$('guard-tap').cloneNode(true);echo.removeAttribute('id');echo.querySelector('span')?.remove();Object.assign(echo.querySelector('img').style,{width:'100%',height:'100%',objectFit:'contain'});Object.assign(echo.style,{position:'absolute',left:at.x+'px',top:at.y+'px',opacity:1,visibility:'visible',pointerEvents:'none',background:'transparent',border:'0',padding:'0',boxShadow:'none',width:'66px',height:'66px'});$('fx').append(echo);echo.animate([{opacity:1,transform:'translate(-50%,-50%) scale(1)'},{opacity:0,transform:'translate(-50%,-65%) scale(1.6)'}],{duration:500,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>echo.remove());$('guard-tap').animate([{filter:'brightness(2)',transform:'translate(-50%,-50%) scale(1.2)'},{filter:'brightness(1)',transform:'translate(-50%,-50%) scale(1)'}],{duration:350});pop('BLOCK',at,'#b5ffff');strikeMotion(true);message('Perfect block! Keep matching.');if(practice?.active){practice.finish();fitBoard();}}else{message('Wait for the shield to light up.');}meter();};

function prepareAttack(){
 const area=$('enemy-anchor').getBoundingClientRect();attackPose=attackPosition(area.width,area.height,attackPose.index);
 const shield=$('guard-tap');shield.style.left=attackPose.x+'px';shield.style.top=attackPose.y+'px';
 windMotion?.cancel();clearTimeout(attackSoundTimer);
 // Attack along the camera axis only. Shield placement never steers the enemy.
 const motion=cameraAttackMotion(run.state.clock);
 windMotion=$('enemy').animate(motion.keyframes,motion.options);if(practice?.active&&practiceStep==='block'){windMotion.currentTime=Math.max(0,motion.options.duration-motion.rush-50);windMotion.pause();}
 shield.animate([{opacity:0,transform:'translate(-50%,-50%) scale(.6)'},{opacity:1,transform:'translate(-50%,-50%) scale(1.12)',offset:.7},{opacity:1,transform:'translate(-50%,-50%) scale(1)'}],{duration:300,easing:'ease-out'});
 physicalSound('move');attackSoundTimer=setTimeout(()=>{if(!paused&&run.state.clock<.5)physicalSound('move');},Math.max(0,motion.options.duration-motion.rush));
}
function strikeMotion(blocked){
 clearTimeout(attackSoundTimer);const enemy=$('enemy'),current=getComputedStyle(enemy).transform;windMotion?.cancel();
 const recoil=cameraRecoilMotion(current,blocked);enemy.animate(recoil.keyframes,recoil.options);
 if(!blocked){const at=relative($('hearts').getBoundingClientRect());impactBloom(at,'#ffa38c');sparks(at,10);}
}
async function bombBurst(at,options={}){const canvas=document.createElement('canvas'),w=app.clientWidth,h=app.clientHeight,dpr=Math.min(2,devicePixelRatio||1);canvas.width=w*dpr;canvas.height=h*dpr;Object.assign(canvas.style,{position:'absolute',inset:'0',width:w+'px',height:h+'px',pointerEvents:'none'});$('fx').append(canvas);const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);const impact=createBombImpact({x:at.x,y:at.y,r:options.hit?16:36});
 if(options.hit){const color=['#ff938e','#8ce7ff','#aeff8c','#ffdf77'][options.color]||'#ffdf77';impact.life=.9;impact.sparks=impact.sparks.filter(s=>s.kind==='ember').slice(0,options.critical?26:18).map((s,i)=>({...s,speed:s.speed*(options.critical?.32:.23),size:s.size*.75,life:Math.min(.85,s.life),color:options.critical?'#ffdc7a':i%3===0?'#fff9df':color}));canvas.className='battle-hit-glow';}
 let impacts=[impact],last=performance.now();await new Promise(resolve=>{function frame(now){if(!canvas.isConnected){resolve();return;}const dt=Math.min(.05,(now-last)/1000);last=now;ctx.clearRect(0,0,w,h);impacts=stepBombImpacts(impacts,dt);drawBombImpacts(ctx,impacts);if(impacts.length)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});canvas.remove();}

// Reuse Adventure's curved starlight path, then launch the actual board artwork.
async function starburstVolley(result,source){
 const token=epoch,heldWind=windMotion?.playState==='running'?windMotion:null;
 const targets=result.targets.map(t=>({...t,node:$('board').children[t.index]})),origin=relative(source.getBoundingClientRect()),transients=new Set();
 heldWind?.pause();clearTimeout(attackSoundTimer);cue('nova');
 const own=node=>{transients.add(node);$('fx').append(node);return node;};
 const remove=node=>{node.remove();transients.delete(node);};
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 async function light(target,index){
  await wait(160+index*85);if(token!==epoch)return;
  const end=relative(target.node.getBoundingClientRect()),head=own(document.createElement('i'));head.className='starburst-energy';
  const tail=Array.from({length:10},()=>{const dot=own(document.createElement('i'));dot.className='starburst-light-tail';return dot;});
  const began=performance.now();
  await new Promise(resolve=>{function frame(now){
   if(token!==epoch){resolve();return;}
   const t=Math.min(1,(now-began)/560),at=q=>burstPath(origin,end,q,30+index%3*14),p=at(t);
   Object.assign(head.style,{left:p.x+'px',top:p.y+'px',transform:'translate(-50%,-50%) scale(.55)'});
   tail.forEach((dot,j)=>{const q=t-j*.025,a=at(q),b=at(q-.035);Object.assign(dot.style,{left:b.x+'px',top:b.y+'px',width:Math.hypot(a.x-b.x,a.y-b.y)+'px',transform:'rotate('+Math.atan2(a.y-b.y,a.x-b.x)+'rad)',opacity:q>0&&q<1?String((1-j/11)*.9):'0'});});
   if(t<1)requestAnimationFrame(frame);else resolve();
  }requestAnimationFrame(frame);});
  remove(head);tail.forEach(remove);if(token!==epoch)return;
  target.node.classList.add('starburst-charged');impactBloom(end,'#ffe990');cue('shift',index);
  target.node.firstChild.animate([{filter:'brightness(1)'},{filter:'brightness(1.8)',offset:.35},{filter:'brightness(1.2)'}],{duration:350});
 }
 try{
  source.animate([{filter:'brightness(1)',transform:'scale(1)'},{filter:'brightness(1.8)',transform:'scale(1.1)',offset:.4},{filter:'brightness(1)',transform:'scale(1)'}],{duration:650});
  await Promise.all(targets.map(light));if(token!==epoch)return;
  source.style.opacity='.25';await wait(120);
  for(let i=0;i<targets.length;i++){
   if(token!==epoch)return;const {node,tile}=targets[i],shape=node.querySelector('.shape'),rect=shape.getBoundingClientRect(),from=relative(rect),to=relative($('enemy').getBoundingClientRect());
   const shot=own(document.createElement('div'));shot.className='shape starburst-shape';sprite(shot,tile);
   Object.assign(shot.style,{left:from.x-rect.width/2+'px',top:from.y-rect.height/2+'px',width:rect.width+'px',height:rect.height+'px'});
   node.classList.remove('starburst-charged');shape.style.opacity='0';
   const dx=to.x-from.x,dy=to.y-from.y,frames=Array.from({length:21},(_,n)=>{const t=n/20,p=burstPath({x:0,y:0},{x:dx,y:dy},t,24+(i%2)*16);return {offset:t,transform:`translate(${p.x}px,${p.y}px) scale(${1-.48*t})`,opacity:1};});
   await shot.animate(frames,{duration:390,easing:'cubic-bezier(.3,0,.7,1)',fill:'forwards'}).finished.catch(()=>{});remove(shot);
   if(token!==epoch)return;const hit=run.starburstHit();if(!hit)break;
   cue('hit',i);void bombBurst(to,{hit:true,critical:true,color:tile.color});if(hit.damage)enemyHit(hit.damage,to,{color:'#ffe58b'});
   await wait(80);
  }
  await wait(220);
 }finally{
  transients.forEach(node=>node.remove());source.style.opacity='';targets.forEach(({node})=>{node.classList.remove('starburst-charged');node.querySelector('.shape')?.style.removeProperty('opacity');});
  if(heldWind===windMotion&&token===epoch){if(run.state.status==='fight'&&!paused)heldWind?.play();else if(run.state.status!=='fight')heldWind?.cancel();}last=performance.now();
 }
}
