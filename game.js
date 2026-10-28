import {beginModeTransition,transitioning} from './mode-transition.js?v=494115';
import {engagement,telemetryChoice,applyWelcomeStatistics,sampleEngagement} from './telemetry.js?v=494117';
import {createEndlessCoach} from './endless-coach.js?v=49499';
let openingCoach=null;
import {animateQuestRedemption} from './quest-redemption.js?v=49499';
import {initLivingMenu} from './menu-polish.js?v=49499';
import {bindPauseKeyboard} from './pause-keyboard.js?v=49499';
import {bindBoardKeyboard} from './board-keyboard.js?v=49499';
import {ABILITY_KEYS,bindBackKeyboard} from './keyboard-help.js?v=49499';
import {bindResultKeyboard} from './result-keyboard.js?v=49499';
import {bombFeedback,bombDebris} from './bomb-feedback.js?v=49499';
import {loadStartupAssets,loadBackgroundAssets} from './startup-loader.js?v=494115';
import {firstEndlessLaunch} from './first-endless.js?v=49499';
import {initMenuReadiness} from './menu-readiness.js?v=49499';
import {prepareMenuImage,awaitReady} from './menu-preload.js?v=49499';
import {ADMIN_COINS,adminProfile} from './admin-mode.js?v=49499';
import {praiseDirector} from './praise-feedback.js?v=49499';
import {showAdventureVictory} from './adventure-victory.js?v=49499';
import {initStoryUI} from './story-ui.js?v=49499';
import {initTouchUI} from './touch-ui.js?v=49499';
import {syncMenuBanner as updateMenuBanner} from './menu-navigation.js?v=49499';
import {initPianoFlow} from './piano-flow.js?v=494115';
import {claimPianoReward} from './piano-flow-engine.js?v=49499';
import {SHAPE_SKINS,buySkin,equipSkin,skinUnlocked} from './shape-skins.js?v=49499';
import {skinArtReady,ensureSkinArt,setActiveSkin,activeSkin,skinCanvas,skinIsReady} from './shape-skin-art.js?v=49499';
import {initInputFeedback} from './input-feedback.js?v=494104';
import {createSurvivalClock,formatSurvivalTime} from './survival-clock.js?v=49499';
import {difficultyUnlocked,availableDifficulty} from './difficulty-unlocks.js?v=49499';
import {enableHoldBuying} from './hold-buy.js?v=49499';
import {settleMemoryGuess,createMemoryMissReveal} from './ability-guide.js?v=49499';
import {rankingLoadMessage} from './leaderboard-cache.js?v=49499';
import {loadPrivacyContent} from './privacy-content.js?v=49499';
import {initSettingsExtras} from './settings-extras.js?v=49499';
import {initShapeSlice} from './shape-slice.js?v=494115';
import {claimSliceReward} from './shape-slice-engine.js?v=49499';
import {initGamesHub} from './games-hub.js?v=49499';
import {initShapeDrop} from './shape-drop.js?v=494115';
import {claimDropReward} from './shape-drop-engine.js?v=49499';
import {showBoardGuide,showAbilityGuide,showAbilityLock,abilityGuideOpen,SPECIAL_LESSONS,nextSpecialLesson,BOOST_LESSONS} from './ability-guide.js?v=49499';
import {fitBoard} from './board-fit.js?v=49499';
import {analytics} from './analytics.js?v=49499';
import {ensureTerms} from './terms.js?v=494117';
import {renderColorChangeCue,renderCollectionCounters,renderMatchRuleBadge,clearExpiredMatchRule,adventureMechanics,adventureRule,prepareLevelMemoryBoard,renderLevelRequirements,ensureAdventureMatch,levelObjectives,levelTasks,levelRequirements} from './world-menu.js?v=49499';
import {observeBoard} from './board-fit.js?v=49499';
observeBoard(document.getElementById('board'));
import {createGameplayScene} from './gameplay-scene.js?v=49499';
import {revealAdventureRewards,resultXpState} from './adventure-rewards.js?v=49499';
import {XP_PER_MATCH,adventureCompletionReward,BOOST_UNLOCK_LEVELS,boostUnlocked,grantAdventureBoosts} from './economy.js?v=49499';
import {initWorldMenu,trackLevelAbility,ensureStarChoice,ensureStarPickup,levelSpec,levelTaskStatus,trackLevelPick,levelPrimaryGoal,levelComplete,adventureLayout,collectionBoard,trackLevelCollection,trackBombCollections,adventureDesign,createRockLayout,damageAdjacentRocks,rockFillPlan} from './world-menu.js?v=49499';
import {completeAdRun,watchedAd,grantRunAdReward,RUN_AD_REWARD} from './ad-cadence.js?v=49499';
import {shouldOfferContinue,runContinueCountdown,startResultCountdown,startResultTally} from './countdown.js?v=49499';

import {createCoinFlight,showQuestReward} from './coin-flight.js?v=49499';
import {earnsMatchCoin} from './economy.js?v=49499';

import {initAchievements,trackAchievements} from './achievements-ui.js?v=49499';
import {claimAchievement,claimAllAchievements} from './achievement-catalog.js?v=49499';



import {compactPlayerId,currentPlayerId,identifyLeaderboardEntries,personalRanking} from './leaderboard.js?v=49499';



import {ensureAudience,onlineAllowed,leaderboardAllowed} from './audience.js?v=494117';



import {createSpecialEffect,createHeartOverflow} from './special-effects.js?v=49499';



import {createStarburst,showFloatingPoints,clearFloatingPoints} from './burst.js?v=49499';



import {resetProgressOnce,TUTORIAL_KEY,LESSONS} from './onboarding.js?v=49499';



import {ensureQuests,trackQuests,claimQuest,claimAllQuests,canClaimAllQuests,newlyCompletedQuests,questList,NORMAL_QUEST_TOTAL} from './quests.js?v=49499';



import {getIdentity,protectLocalIdentity,setIdentityFrame,cleanName,randomName,avatarElement,leaderboardAvatar,saveIdentity,renderHomeIdentity,syncIdentity,readPhoto} from './profile.js?v=49499';







import {correctChoiceIndices,awardVictoryBoard,difficultyFor,SHAPES,COLORS,SPECIALS,replayFrame,applyLoadout,abilityActive,stopAbility,frameDelta,advanceBoard,createRun,makeBoard,boardSize,duration,choose,expire,spendAbility,revive,elapsedBoardTime,timeSlowRate,seededRandom} from './engine.js?v=49499';







import {requestReward} from './rewarded.js?v=49499';







import {freshProfile,normalizeProfile,AVATARS,unlockLevelAvatars,preserveStarterAvatar,PRICES,boostPrice,buy,consume,earnCoin,matchCoinReward,COSMETICS,playerLevel,playerProgress,buyCosmetic,equipCosmetic,rewardVideoCoins,VIDEO_COIN_REWARD,FRAME_UPGRADES,nextFrameUpgrade,upgradeFrame} from './economy.js?v=49499';







import {prepareRankedRun,beginRankedRun,submitRankedRun,trackRankedActions,ownerAccess,setOwnerAdmin,loadLeaderboard,deleteOnlineProfile,resetRankedSession,saveOnlineProfile} from './leaderboard.js?v=49499';







// First-launch screens appear before the main game finishes initializing.
// Give them audio without depending on terms acceptance or statistics consent.
const welcomeAudio=window.gameAudio;
let welcomePrefs={};try{welcomePrefs=JSON.parse(window.ShapeShiftPlatform.storage.getItem('shape-shift-settings'))||{};}catch{}
welcomeAudio?.setMusic(welcomePrefs.music!==false);welcomeAudio?.setSfx(welcomePrefs.sfx!==false);
welcomeAudio?.setMusicVolume(welcomePrefs.musicVolume??40);welcomeAudio?.setSfxVolume(welcomePrefs.sfxVolume??65);
try{welcomeAudio?.setMenuWorld(JSON.parse(localStorage.getItem('shape-shift-profile-v1'))?.equipped?.background);}catch{}
welcomeAudio?.setScene('menu');
const startWelcomeAudio=()=>{if(!window.ShapeShiftPlatform.paused)welcomeAudio?.start().catch(()=>{});};
const tapWelcomeAudio=e=>{if(e.target.closest?.('#terms-dialog'))welcomeAudio?.ui('click').catch(()=>{});};
const pauseWelcomeAudio=()=>welcomeAudio?.pause();
const welcomeVisibility=()=>window.ShapeShiftPlatform.paused?pauseWelcomeAudio():startWelcomeAudio();
document.addEventListener('pointerdown',startWelcomeAudio,{capture:true,passive:true});
document.addEventListener('keydown',startWelcomeAudio,{capture:true});
document.addEventListener('click',tapWelcomeAudio,true);
document.addEventListener('unused-visibilitychange',welcomeVisibility);
window.addEventListener('unused-androidpause',pauseWelcomeAudio);
window.addEventListener('unused-androidresume',startWelcomeAudio);
// Music begins on interaction; it must not compete with first-play downloads.
const welcomeWasLoading=document.documentElement.classList.contains('startup-loading');
const welcomeCover=document.getElementById('startup-ready');
if(welcomeWasLoading){document.documentElement.classList.remove('startup-loading');if(welcomeCover)welcomeCover.hidden=true;}
const shareGameplayStatistics=await ensureTerms();
await ensureAudience();
document.removeEventListener('pointerdown',startWelcomeAudio,true);
document.removeEventListener('keydown',startWelcomeAudio,true);
document.removeEventListener('click',tapWelcomeAudio,true);
document.removeEventListener('unused-visibilitychange',welcomeVisibility);
window.removeEventListener('unused-androidpause',pauseWelcomeAudio);
window.removeEventListener('unused-androidresume',startWelcomeAudio);
await applyWelcomeStatistics(shareGameplayStatistics);
if(welcomeWasLoading){document.documentElement.classList.add('startup-loading');if(welcomeCover)welcomeCover.hidden=false;}



protectLocalIdentity();



const $=id=>document.getElementById(id);



$('choose-photo').hidden=!onlineAllowed();$('profile-name').readOnly=false;







const effectArtReady={then(resolve,reject){return Promise.all(['assets/specials-v13.webp','assets/health-boost-v5.webp','assets/abilities-v4.webp'].map(prepareMenuImage)).then(resolve,reject);}};

const audio=()=>window.gameAudio;







const store={get(key,fallback){try{return JSON.parse(window.ShapeShiftPlatform.storage.getItem(key))??fallback;}catch{return fallback;}},set(key,value){try{window.ShapeShiftPlatform.storage.setItem(key,JSON.stringify(value));}catch{}}};







const firstEndless=firstEndlessLaunch(window.ShapeShiftPlatform.storage);
try{resetProgressOnce(window.ShapeShiftPlatform.storage);}catch{}







let profile=preserveStarterAvatar(ensureQuests(normalizeProfile(store.get('shape-shift-profile-v1',freshProfile()))),getIdentity().avatar);
// Privileges are checked against the private installation credential on the server.
const adminRecovery=store.get('shape-shift-admin-recovery-v2',null);
const ownerCheck=ownerAccess().catch(()=>({owner:false,adminActive:false}));
let ownerPermission=profile.adminMode||adminRecovery?.adminMode?await ownerCheck:{owner:false,adminActive:false};
if(ownerPermission.owner&&ownerPermission.adminActive&&adminRecovery?.adminMode){profile=normalizeProfile(adminRecovery);const map=store.get('shape-shift-admin-recovery-map-v2',null);if(map)store.set('shape-shift-adventure-v1',map);}
if(profile.adminMode&&(!ownerPermission.owner||!ownerPermission.adminActive)){
 store.set('shape-shift-admin-recovery-v2',profile);
 store.set('shape-shift-admin-recovery-map-v2',store.get('shape-shift-adventure-v1',null));
 const saved=store.get('shape-shift-admin-backup-v1',null);
 profile=normalizeProfile(saved||freshProfile());
 // Preserve backups and the admin profile for recovery after a temporary outage.
 if(saved){const map=store.get('shape-shift-admin-map-backup-v1',null);if(map)store.set('shape-shift-adventure-v1',map);}
}








let pendingWalletCoins=0;

let saveTimer;function flushProfile(){window.ShapeShiftPlatform.clearTimeout(saveTimer);store.set('shape-shift-profile-v1',profile);}function saveProfile(){ if(profile.adminMode)profile.coins=ADMIN_COINS;profile=unlockLevelAvatars(profile); $('wallet').textContent=profile.adminMode?'âˆž':Math.max(0,profile.coins-pendingWalletCoins);window.ShapeShiftPlatform.clearTimeout(saveTimer);saveTimer=window.ShapeShiftPlatform.setTimeout(flushProfile,120);}







const autoPowers=new Set();







let runRng=Math.random,ranked=null,actions=[],runId='',runSaved=false;







let best=Number(store.get('shape-shift-endless-best-v3',0))||0;







let prefs={music:true,sfx:true,musicVolume:40,sfxVolume:65,...store.get('shape-shift-settings',{}),motion:false};







let rockFills=[],rockFillElapsed=0;
let state,board=[],active=false,paused=false,locked=false,counting=false;







let burstEffect=null,burstElapsed=0,effectScoreBefore=null,visualStrikes=null;

let reviveCounting=false,nativeBackground=false;
let starBoosts={};
const boostCharges=name=>(profile.inventory[name]||0)+(starBoosts[name]||0);
let levelPickStats={},runBoostLevel=1,rockLayout=null;
let collectionRun=0;
let colorFlip=null;
let memoryLesson=null;
let memoryCards=new Map(),memoryPeek=null,mechanicHold=0,lastWheelPick=0,wheelTurns=0,lastMatchRule=null;
function paintMemory(button,tile){
 button.classList.toggle('memory-card',!!tile.memory);button.classList.toggle('memory-used',!!tile.peeked);
 button.setAttribute('aria-label',tile.memory?(tile.peeked?'Remembered card. Tap to guess.':'Covered card. Tap once to look.'):tileName(tile));
}
function paintAdventureMechanic(){
 const bar=$('adventure-mechanic');if(bar)bar.hidden=true;
 renderColorChangeCue(state.current,modePicks-lastWheelPick,runMode==='adventure'&&adventureMechanics(adventureLevel).wheel);
}
function prepareAdventureMechanic(keepRound){
 if(runMode!=='adventure'){state.matchRule=null;paintAdventureMechanic();return;}
 const config=adventureMechanics(adventureLevel);
 if(!keepRound&&!state.sweepBoard&&!state.sweepPending){
 state.matchRule=adventureRule(adventureLevel,modePicks);
 if(state.matchRule!==lastMatchRule){if(state.matchRule){mechanicHold=900;sound('click');}lastMatchRule=state.matchRule;}
 if(config.wheel&&modePicks>=lastWheelPick+3){lastWheelPick=modePicks;wheelTurns++;trackAchievements({type:'colorChange',mode:runMode});const from={...state.current};state.current={...state.current,color:(state.current.color+1)%4};colorFlip={from,to:{...state.current},elapsed:0};mechanicHold=850;sound('click');}
 }else if(state.sweepBoard||state.sweepPending)state.matchRule=null;
 paintAdventureMechanic();
}

function paintCurrentShape(){
 renderMatchRuleBadge(state.current,runMode==='adventure'?state.matchRule:null);
 const icon=$('current-sprite');
 const progress=colorFlip?Math.min(1,colorFlip.elapsed/700):1;
 const tile=colorFlip?(progress<.5?colorFlip.from:colorFlip.to):state.current;
 $('current-name').textContent=tileName(tile);sprite(icon,tile);
 if(colorFlip&&progress<1){
 const angle=progress<.5?progress*180:(progress-1)*180;
 icon.style.transform='perspective(500px) rotateY('+angle+'deg)';
 icon.style.filter='drop-shadow(0 0 8px #fff0a0)';
 }else{icon.style.removeProperty('transform');icon.style.removeProperty('filter');colorFlip=null;}
}

const currentLevelStats=()=>({...levelPickStats,picks:modePicks,turns:modeTurns,elapsed:modeElapsed,wrong:modeWrong,score:state?.score||0,frame:state?.frame});
const runBoostUnlocked=name=>(starBoosts[name]||0)>0||runBoostLevel>=BOOST_UNLOCK_LEVELS[name];
let runStartXp=0,completionXpGranted=false;
const survivalClock=createSurvivalClock();
function renderSurvivalClock(){
 survivalClock.setRunning(runMode==='endless'&&active&&!paused&&!counting&&!state?.over&&!window.ShapeShiftPlatform.paused&&!nativeBackground&&!abilityGuideOpen());
 const label=$('survival-time');label.hidden=runMode!=='endless';
 const text='Time '+formatSurvivalTime(survivalClock.elapsed());
 if(label.textContent!==text)label.textContent=text;
}

function endlessBests(){return Object.fromEntries(['easy','normal','hard','extreme'].map(id=>[id,id==='normal'?best:Number(store.get('shape-shift-best-'+id,0))||0]));}
const endlessDifficulty='normal';
store.set('shape-shift-difficulty-v1',endlessDifficulty);
const gameplayScene=createGameplayScene(document.getElementById('app'));
let worldUI=null,runMode="endless",adventureLevel=1,modePicks=0,modeTurns=0,runCoins=0,rushRemaining=60000,modeWon=false,modeElapsed=0,modeWrong=0;

let coinFlights=[];

function applyRockDamage(indices,options={}){
 if(runMode!=='adventure'||!rockLayout)return;
 const before=rockLayout;rockLayout=damageAdjacentRocks(rockLayout,indices,options);
 for(const rock of before.rocks){const after=rockLayout.rocks.find(r=>r.cell===rock.cell);if(after?.hits===rock.hits)continue;analytics.count('rocks',after?'crack':'destroy');sound(after?'rock-crack':'rock-break');const el=$('board').querySelector('.board-rock[data-cell="'+rock.cell+'"]');if(el){el.classList.add('cracked');if(after){el.animate([{transform:'translateX(-3px)'},{transform:'translateX(3px)'},{transform:'translateX(0)'}],{duration:260});}else{const rect=el.getBoundingClientRect();const debris=el.cloneNode(true);debris.classList.add('shattered');debris.removeAttribute('role');debris.removeAttribute('aria-label');debris.setAttribute('aria-hidden','true');debris.style.cssText='position:fixed;z-index:30;left:'+rect.left+'px;top:'+rect.top+'px;width:'+rect.width+'px;height:'+rect.height+'px;pointer-events:none';document.body.append(debris);el.style.visibility='hidden';debris.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:1,transform:'translateY(2px) scale(1.06)',offset:.3},{opacity:0,transform:'translateY(24px) scale(.88)'}],{duration:650,easing:'ease-out',fill:'forwards'}).finished.then(()=>debris.remove());}}}
}
function clearCoinFlights(){for(const effect of coinFlights)effect.clear();coinFlights=[];}



let remaining=0,boardTime=0,last=0,frame=0,transition=0,countdownToken=0,boardSerial=0;







const specialLabels={bomb:'Bomb â€” blast nearby choices',starburst:'Starburst â€” clear ordinary tiles',hourglass:'Hourglass â€” slow three boards',crystal:'Shield crystal â€” block one hit',reset:'Rewind â€” return to one tile',heart:'Heart potion â€” refill all lives'};







function tileName(tile){if(tile.special)return specialLabels[tile.special];return COLORS[tile.color]+' '+SHAPES[tile.shape];}







const chainedCenters=[[-2.951, -5.821], [0.08, -5.024], [2.951, -5.343], [4.067, -3.907], [-3.11, -0.877], [0.08, 0.399], [2.472, -0.08], [4.067, 1.037], [-2.951, 3.27], [0.239, 3.907], [2.313, 3.429], [4.226, 5.343], [-3.429, 9.011], [0.08, 10.287], [2.472, 9.649], [4.067, 11.085]];
const centers=[[-3.11,-5.662],[0.08,-4.705],[1.834,-5.024],[4.067,-3.589],[-2.951,-0.718],[0.08,0.399],[1.834,0.08],[4.067,1.675],[-3.11,3.589],[0.08,4.545],[1.834,4.226],[4.067,5.821],[-2.951,8.852],[0.08,9.968],[1.994,9.649],[4.067,11.244]];







function sprite(el,tile){
 el.classList.remove('skinned','special-art','bomb-art');
 if(tile.special==='bomb'){el.replaceChildren();el.classList.add('bomb-art');return;}
 if(tile.special){el.replaceChildren();el.classList.add('special-art');el.style.setProperty('--special',SPECIALS.indexOf(tile.special));return;}
 const chained=el.dataset.shapeLocked==='true';
 if(chained||skinIsReady(activeSkin())){el.classList.add('skinned');el.replaceChildren(skinCanvas(tile,activeSkin(),{chained}));}
 else{const [dx,dy]=centers[tile.color*4+tile.shape];el.style.setProperty('--dx',dx+'%');el.style.setProperty('--dy',dy+'%');const image=document.createElement('img');image.src='assets/shapes-v2.webp';image.alt='';image.draggable=false;image.style.left=(-(tile.shape*100)+dx)+'%';image.style.top=(-(tile.color*100)+dy)+'%';el.replaceChildren(image);}
}







function sound(name){if(name==='shield'||name==='shield-hit'){audio()?.ui(name)?.catch(()=>{});return;}audio()?.play(name);}
let praiseAnimation=null;const praiseRun=praiseDirector.createRun(showStreakPraise);
function showStreakPraise(text){
 let el=$('streak-praise');if(!el){el=document.createElement('div');el.id='streak-praise';el.setAttribute('role','status');$('game').append(el);}
 praiseAnimation?.cancel();el.textContent=text;el.hidden=false;
 el.style.top='50%';
 const animation=el.animate([{opacity:0,transform:'translate(-50%,-40%) scale(.7)'},{opacity:1,transform:'translate(-50%,-50%) scale(1.08)',offset:.18},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.7},{opacity:0,transform:'translate(-50%,-65%) scale(.97)'}],{duration:1100,easing:'ease-out',fill:'forwards'});praiseAnimation=animation;
 animation.finished.then(()=>{if(praiseAnimation===animation)el.hidden=true;},()=>{});
}




function uiSound(name='click'){audio()?.ui(name).catch(()=>{});}







let menuReadiness;
function screen(name){if(name==='home'&&menuReadiness&&!menuReadiness.homeReady())return menuReadiness.openHome(()=>screen(name));if(name!=='home')menuReadiness?.cancelHome();if(name!=='game')clearFloatingPoints();audio()?.setScene(name==='game'?'game':'menu');$('app').dataset.screen=name;$('app').dataset.mode=runMode;gameplayScene.scene(name==='game'?runMode:null,adventureLevel);$('home').hidden=name!=='home';$('adventure-map').hidden=name!=='map';if(name==='home'){worldUI?.refresh();if(!profile.adminMode)prepareRankedRun(endlessDifficulty);}$('game').hidden=name!=='game';$('home-best').textContent=best;applyCosmetics();window.scrollTo({top:0,left:0,behavior:'instant'});}







function closeDialogs(){document.querySelectorAll('dialog[open]:not(.mode-curtain)').forEach(d=>d.close());}







function update(){
 renderSurvivalClock();
 if(state)$('score').parentElement.querySelector('.label').textContent='SCORE';







 $('score').textContent=effectScoreBefore===null?state.score:effectScoreBefore;$('run-coins').textContent=Math.max(0,runCoins-coinFlights.reduce((sum,effect)=>sum+effect.coins,0));







 $('color-streak').textContent=runMode!=='endless'&&state.colorStreak>=2?COLORS[state.current.color]+' Ã—'+state.colorStreak:'';







 $('shape-streak').textContent=runMode!=='endless'&&state.shapeStreak>=2?SHAPES[state.current.shape]+' Ã—'+state.shapeStreak:'';







 const health=$('health');health.replaceChildren();







 for(let i=0;i<(state.maxLives||3);i++){const heart=document.createElement('span');heart.className='heart'+(i>=(state.maxLives||3)-(visualStrikes??state.strikes)?' empty':'');heart.setAttribute('aria-hidden','true');health.append(heart);}







 if(state.shieldEnabled){const shield=document.createElement('span');shield.className='health-shield'+(state.protected?'':' empty');shield.setAttribute('aria-hidden','true');if(state.protected&&state.protectionHits>1){const count=document.createElement('b');count.className='shield-hit-count';count.textContent=state.protectionHits;shield.append(count);}health.append(shield);}







 health.setAttribute('aria-label',((state.maxLives||3)-(visualStrikes??state.strikes))+' lives remaining'+(state.shieldEnabled?(state.protected?', '+(state.protectionHits||1)+' shield hits ready':', shield used'):''));







 paintCurrentShape();paintAdventureMechanic();







 for(const [name,label,effect] of [['freeze','Double time','twice the time for five boards'],['boost','Five times points','five points per correct pick for five boards'],['shield','Shield','blocks one mistake, then waits five completed turns']]){







  const enabled=abilityActive(state,name);







  $(name+'-charges').textContent=runBoostUnlocked(name)?boostCharges(name):'Map '+BOOST_UNLOCK_LEVELS[name];$(name).classList.toggle('level-locked',!runBoostUnlocked(name));



  if(name==='shield'&&state.shieldCooldown>0){$(name+'-charges').textContent='Wait '+state.shieldCooldown+' turns';}
  if(!enabled&&boostCharges(name)===0)autoPowers.delete(name);







  $(name).classList.toggle('armed',enabled||autoPowers.has(name));







  $(name).setAttribute('aria-label',label+' â€” '+effect+'. '+boostCharges(name)+' charges. '+(name==='shield'&&state.shieldCooldown>0?state.shieldCooldown+' turns cooldown. ':'')+'Auto refill '+(autoPowers.has(name)?'on':'off'));







  if(!runBoostUnlocked(name))$(name).setAttribute('aria-label',label+' â€” finish Adventure level '+BOOST_UNLOCK_LEVELS[name]);
  $(name).title=label+': '+(enabled?'Active. Tap to stop. ':'Tap to activate. ')+boostCharges(name)+' charges left.';







 }







 for(const name of Object.keys(PRICES)){$(name).disabled=locked||rockFills.length>0||paused||counting||(runBoostUnlocked(name)&&!autoPowers.has(name)&&!abilityActive(state,name)&&boostCharges(name)===0);$(name).setAttribute('aria-pressed',String(autoPowers.has(name)||abilityActive(state,name)));}















}







function timer(){







 const hud=$('mode-hud');hud.hidden=runMode==='endless';
 const goal=runMode==='adventure'?levelPrimaryGoal(adventureLevel):null;
 const status=goal?levelTaskStatus(adventureLevel,currentLevelStats())[0]:null;
 const text=status?status.label+' Â· '+status.value:'Games Â· '+Math.ceil(rushRemaining/1000)+'s';
 if(goal?.type==='collection'||goal?.type==='memoryCollected'){
 renderCollectionCounters(hud,levelRequirements(adventureLevel),{...currentLevelStats().collections,memory:currentLevelStats().memoryCollected||0},sprite,String(collectionRun));
 }else if(hud.dataset.content!==text||hud.classList.contains('collection-goal')){
 hud.dataset.content=text;delete hud.dataset.collectionRun;hud.classList.remove('collection-goal');hud.textContent=text;
 }
 const ratio=Math.max(0,remaining/boardTime);







 $('timer').style.transform='scaleX('+ratio+')';







 $('timer').parentElement.setAttribute('aria-valuenow',Math.round(ratio*100));







 $('timer').parentElement.classList.toggle('frozen',state.slow);







 $('board-status').textContent=timeSlowRate(state)===.25?'4x time / Both active':state.pickupSlowRounds>0?'Time Crystal: '+state.pickupSlowRounds+' rounds':state.slowRounds>0?'Double Time: '+state.slowRounds+' rounds':state.protected?'Shield ready':runMode==='adventure'&&rockLayout?.rocks.length?'Match beside black blocks':'Pick one';







}







function nextBoard(){for(const node of $('board').children)node.classList.remove('correct-answer-pulse','correct-answer-still');
 // Crown always enters a fresh round, never a local refill with leftover time.
 if(state.sweepPending){state={...state,heldBoard:null,bombRefillBoard:null,sweepBoard:null,specialEffect:null};memoryCards.clear();}


 // Bombs refill their local footprint without advancing the untouched board.
 if(state.bombRefillBoard){
  const changed=state.blastTargets;board=makeBoard(state,runRng,board.length);
  state={...advanceBoard(state),bombRefillBoard:null,bombBoard:false,specialEffect:null,blastTargets:null};
  effectScoreBefore=null;visualStrikes=null;locked=false;transition=0;
  boardTime=duration(state)+(runMode==='adventure'?levelSpec(adventureLevel).timeBonus:0);remaining=boardTime;
  for(const i of changed){const button=$('board').children[i];if(!button)continue;
   const art=document.createElement('span');art.className='sprite';art.setAttribute('aria-hidden','true');sprite(art,board[i]);
   button.replaceChildren(art);button.disabled=false;button.removeAttribute('aria-hidden');button.classList.remove('collected','picked-tile','memory-open');
   button.setAttribute('aria-label',tileName(board[i])+', choice '+(i+1));paintMemory(button,board[i]);
  }
  for(const [i,button] of [...$('board').querySelectorAll('button.choice')].entries())button.disabled=!!board[i].collected;
  $('board').classList.remove('success','miss','burst-clear');update();timer();return;
 }
 effectScoreBefore=null;visualStrikes=null;



 burstEffect?.clear();burstEffect=null;







 const rewindReveal=state.specialEffect==='reset';
 const keepRound=!!state.heldBoard,replacedIndex=state.replacedIndex;



 const previousOutcome=state.outcome;state=advanceBoard(state);
 prepareAdventureMechanic(keepRound);







 for(const name of autoPowers)chargePower(name);







 let capacity=boardSize(state);
 if(runMode==='adventure'&&!keepRound&&!state.sweepBoard&&!state.sweepPending){
  const baseCount=adventureDesign(adventureLevel)?.size??Math.min(capacity,levelSpec(adventureLevel).maxChoices);
  if(!rockLayout||rewindReveal||rockLayout.baseCount!==baseCount)rockLayout=createRockLayout(adventureLevel,baseCount);
  capacity=rockLayout.cells.length;
 }
 board=openingCoach?.active?openingCoach.board(state):makeBoard(state,runRng,capacity);
 if(runMode==='adventure'){
 board=ensureStarPickup(adventureLevel,currentLevelStats(),state,board);
 board=collectionBoard(adventureLevel,state,board,runRng,currentLevelStats());
 if(!state.sweepBoard&&!state.sweepPending){
  if(!keepRound)board=prepareLevelMemoryBoard(adventureLevel,board,memoryCards,currentLevelStats(),runRng);
  board=ensureStarPickup(adventureLevel,currentLevelStats(),state,board);
 board=collectionBoard(adventureLevel,state,board,runRng,currentLevelStats());
  board=ensureAdventureMatch(state,board);
  board=ensureStarChoice(adventureLevel,currentLevelStats(),state,board);
 }
 }


 if(keepRound){



  locked=false;transition=0;const button=$('board').children[replacedIndex];const art=document.createElement('span');art.className='sprite';art.setAttribute('aria-hidden','true');sprite(art,board[replacedIndex]);button.replaceChildren(art);button.setAttribute('aria-label',tileName(board[replacedIndex])+', choice '+(replacedIndex+1));button.classList.remove('pickup-flip');void button.offsetWidth;button.classList.add('pickup-flip');$('board').classList.remove('miss','success','burst-clear');for(const [i,b] of [...$('board').querySelectorAll('button.choice')].entries())b.disabled=!!board[i].collected;update();timer();return;



 }



 boardSerial++;const serial=boardSerial;







 locked=false;boardTime=duration(state)+(runMode==='adventure'?levelSpec(adventureLevel).timeBonus:0);remaining=boardTime;transition=0;







 const layout=runMode==='adventure'&&rockLayout&&rockLayout.cells.length===board.length?rockLayout:adventureLayout(runMode==='adventure'?adventureLevel:1,board.length),columns=layout.columns;
 $('board').dataset.layout=layout.name;
 // Genuine gaps are transparent; only actual rock blockers have a visible object.
 $('board').style.backgroundImage='';$('board').style.backgroundSize='';$('board').style.backgroundPosition='';
 $('board').style.gridTemplateColumns=layout.cells.length?'repeat('+columns+',minmax(0,1fr))':'';
 $('board').style.gridTemplateRows=layout.cells.length?'repeat('+Math.ceil(Math.max(...layout.cells)/columns)+',minmax(0,1fr))':'';







 $('board').dataset.linear=String(runMode==='endless'&&['hard','extreme'].includes(state.difficulty));$('board').dataset.columns=columns;$('board').dataset.count=board.length;trackAchievements({type:'board',mode:runMode,count:board.length});







 $('board').classList.remove('miss','success','burst-clear');$('board').replaceChildren();







 board.forEach((tile,index)=>{







  const button=document.createElement('button');button.type='button';button.className='choice';if(layout.cells.length){button.style.gridColumn=String((layout.cells[index]-1)%columns+1);button.style.gridRow=String(Math.floor((layout.cells[index]-1)/columns)+1);}if(rewindReveal)button.classList.add('rewind-reveal');







  if(tile.collected){button.classList.add('collected');button.disabled=true;button.setAttribute('aria-hidden','true');$('board').append(button);return;}



  button.setAttribute('aria-label',tileName(tile)+', choice '+(index+1));button.dataset.index=index;







  const art=document.createElement('span');art.className='sprite';art.setAttribute('aria-hidden','true');sprite(art,tile);







  button.append(art);paintMemory(button,tile);button.onpointerdown=e=>{if(e.isPrimary&&e.button===0){e.preventDefault();if(serial===boardSerial)resolve(index);}};button.onclick=e=>{if(e.detail===0&&serial===boardSerial)resolve(index);};







  $('board').append(button);







 });
 openingCoach?.paint();








 if(runMode==='adventure'&&layout===rockLayout)for(const rock of rockLayout.rocks){
 const el=document.createElement('span');el.className='board-rock'+(rock.hits===1?' cracked':'');el.dataset.cell=rock.cell;el.setAttribute('role','img');el.setAttribute('aria-label','Black block: '+rock.hits+' nearby matches to break');el.style.gridColumn=String((rock.cell-1)%columns+1);el.style.gridRow=String(Math.floor((rock.cell-1)/columns)+1);
 el.innerHTML='<span class="stone-art"></span>';$('board').append(el);
 }
 rockFills=[];rockFillElapsed=0;
 if(layout===rockLayout&&rockLayout.newlyOpened?.length){
  fitBoard($('board'));
  rockFills=rockFillPlan(rockLayout).map(plan=>{
   const el=$('board').children[layout.cells.indexOf(plan.cell)];
   const source=plan.sourceCell?$('board').children[layout.cells.indexOf(plan.sourceCell)]:null;
   const distance=source?el.offsetTop-source.offsetTop:el.offsetHeight;
   el.style.opacity='0';el.style.transform='translateY('+(-distance)+'px)';
   return {...plan,el,distance};
  });
  $('board').querySelectorAll('button.choice').forEach(b=>b.disabled=true);
 }
 if(rockLayout)rockLayout.newlyOpened=[];
 update();timer();







}







let cancelResultCountdown=null,cancelResultTally=null,cancelAdventureReveal=null,cancelVictory=null;

function stopResultCountdown(){cancelVictory?.();cancelVictory=null;$('over-dialog').classList.remove('victory-result','victory-arriving');cancelAdventureReveal?.();cancelAdventureReveal=null;cancelResultTally?.();cancelResultTally=null;cancelResultCountdown?.();cancelResultCountdown=null;$('result-return-countdown').hidden=true;}

let continueOfferOpen=false,continueOfferReady=false,continueAdPending=false;
function dismissRunScreen(){
 if(continueAdPending)return;
 if(continueOfferOpen){
  if(!continueOfferReady)return;
  continueOfferOpen=false;uiSound('leave-result');finish(true);return;
 }
 if(runMode==='adventure')return;
 uiSound('leave-result');home();
}
function finish(finalize=false){openingCoach?.close();
 if(!(runMode==='adventure'&&modeWon))audio()?.stopPraise();
 if(cancelVictory)return;
 $('adventure-continue').hidden=runMode!=='adventure';

 stopResultCountdown();

 clearCoinFlights();







 active=false;counting=false;window.ShapeShiftPlatform.cancelAnimationFrame(frame);renderSurvivalClock();
 $('result-survival').hidden=runMode!=='endless';
 $('result-survival').textContent='Survived '+formatSurvivalTime(survivalClock.elapsed());
 if(window.ShapeShiftAds?.showRewarded&&shouldOfferContinue(runMode,state,finalize)){
  $('adventure-continue').hidden=true;
  analytics.count('ad_offers','continue');continueOfferOpen=true;continueOfferReady=false;continueAdPending=false;
  $('over-dialog').classList.add('continue-offer');
  $('over-dialog').classList.remove('adventure-results');
  $('record').textContent='KEEP GOING?';
  $('continue-ad').hidden=false;$('continue-ad').disabled=!window.ShapeShiftAds;
  $('ad-status').textContent=window.ShapeShiftAds?'Watch a video to refill your lives.':'Continue is available in the Android app.';
  document.querySelector('.result-home-hint').textContent='';
  $('result-return-countdown').hidden=false;
  audio()?.setScene('menu');if(!$('over-dialog').open)$('over-dialog').showModal();$('record').focus({preventScroll:true});sound('over');
  cancelResultCountdown=startResultCountdown(n=>{$('result-return-countdown').textContent=String(n);},()=>{
   continueOfferReady=true;$('result-return-countdown').hidden=true;
   document.querySelector('.result-home-hint').textContent='Tap anywhere else to finish your run.';
  },{visible:()=>!window.ShapeShiftPlatform.paused&&!nativeBackground&&$('over-dialog').open&&!continueAdPending});
  return;
 }
 continueOfferOpen=false;$('over-dialog').classList.remove('continue-offer');
 document.querySelector('.result-home-hint').textContent='';
 $('adventure-continue').hidden=runMode!=='adventure'&&runMode!=='endless';$('adventure-continue').textContent='Continue';
 if(runMode==='adventure'&&modeWon)state=awardVictoryBoard(state,board,true);
 if(runMode==='adventure'&&modeWon&&!completionXpGranted){profile=adventureCompletionReward(profile,true);completionXpGranted=true;saveProfile();flushProfile();}
 trackAchievements({type:'finish',mode:runMode,won:modeWon,level:adventureLevel,elapsed:modeElapsed,stars:runMode==='adventure'?levelObjectives(adventureLevel,{...currentLevelStats(),won:modeWon}).filter(o=>o.done).length:0});
 engagement.endRun('finished');analytics.endRun(modeWon?'win':'loss',runMode==='adventure'?levelObjectives(adventureLevel,{...currentLevelStats(),won:modeWon}).map((o,i)=>({...o,type:levelTasks(adventureLevel)[i].type})):[],adventureLayout(adventureLevel,board.length).name);
 const previous=best;recordRun();







 if(runMode==='endless'&&state.difficulty!=='normal'){const key='shape-shift-best-'+state.difficulty;store.set(key,Math.max(state.score,Number(store.get(key,0))||0));}
 if(runMode==='endless'&&state.difficulty==='normal'){best=Math.max(best,state.score,Number(store.get('shape-shift-endless-best-v3',0))||0);store.set('shape-shift-endless-best-v3',best);}







 $('record').textContent=state.score>previous?'NEW ENDLESS BEST':'RUN OVER';







 const startProgress=playerProgress(runStartXp);$('result-xp-label').textContent=startProgress.capped?'MAX LEVEL':startProgress.current+' / '+startProgress.required+' XP';$('result-xp-bar').classList.remove('xp-level-up');
 $('final-score').textContent='0';$('final-coins').textContent='+0';$('final-best').textContent=state.difficulty==='normal'?best:Math.max(state.score,Number(store.get('shape-shift-best-'+state.difficulty,0))||0);$('result-progress').textContent='Level '+startProgress.level;$('level-progress').max=startProgress.required||1;$('level-progress').value=startProgress.capped?1:startProgress.current;$('level-progress').setAttribute('aria-label',$('result-xp-label').textContent);







 $('continue-ad').hidden=true;







 $('continue-ad').disabled=!window.ShapeShiftAds; 







 $('ad-status').textContent=window.ShapeShiftAds?'One continue per run.':'';







 if(!window.ShapeShiftAds)$('ad-status').textContent='';







 const stars=worldUI?.finish(runMode,modeWon,state,currentLevelStats());syncAdventureBoosts();$('adventure-result').hidden=runMode!=='adventure';$('adventure-result').classList.remove('rewards-revealed','rewards-settled');$('adventure-result').innerHTML=stars||'';document.querySelector('#over-dialog .best-line').hidden=runMode!=='endless';
 if(runMode!=='endless'){$('record').textContent=runMode==='adventure'?(modeWon?'LEVEL '+adventureLevel+' COMPLETE':'LEVEL '+adventureLevel):(modeWon?'GAME COMPLETE':'GAME OVER');$('continue-ad').hidden=true;$('ad-status').textContent=runMode==='adventure'?(modeWon?(adventureLevel===100?'Adventure complete. Continue to your island.':'Next level unlocked on your map.'):'Try again from the Adventure map.'):'Best: '+worldUI.rushBest();}


 if(runMode==='endless')$('ad-status').textContent='';
 const tally=()=>{
 let lastXpLevel=playerProgress(runStartXp).level,lastXpGain=0,lastXpCue=-1;
 cancelResultTally=startResultTally(state.score,runCoins,(score,coins,progress)=>{
  $('final-score').textContent=score;$('final-coins').textContent='+'+coins;
  const xp=resultXpState(runStartXp,profile.xp,progress);
  $('result-progress').textContent='Level '+xp.level;$('level-progress').max=xp.required||1;$('level-progress').value=xp.required?xp.current:1;
  $('result-xp-label').textContent=xp.required?xp.current+' / '+xp.required+' XP':'MAX LEVEL';
  $('level-progress').setAttribute('aria-label','Level '+xp.level+': '+$('result-xp-label').textContent);
  if(xp.level>lastXpLevel){sound('levelup');$('result-xp-bar').classList.remove('xp-level-up');void $('result-xp-bar').offsetWidth;$('result-xp-bar').classList.add('xp-level-up');lastXpLevel=xp.level;}
  else if(xp.gained>lastXpGain&&progress-lastXpCue>=.075){sound('result-xp-tick');lastXpCue=progress;}
  lastXpGain=xp.gained;
 },cue=>sound(cue),{visible:()=>!window.ShapeShiftPlatform.paused&&!nativeBackground&&$('over-dialog').open,reduced:prefs.motion});

 if(runMode==='rush'){$('result-return-countdown').hidden=false;cancelResultCountdown=startResultCountdown(n=>{$('result-return-countdown').textContent='Main menu in '+n+'s';},()=>{uiSound('leave-result');home();},{visible:()=>!window.ShapeShiftPlatform.paused&&!nativeBackground&&$('over-dialog').open});}
 };
 const startResultRewards=()=>{
  if(runMode==='adventure')cancelAdventureReveal=revealAdventureRewards($('adventure-result'),sound,()=>{if(modeWon&&storyUI.summary().ready){void (async()=>{if(await home(true)===false)return;worldUI?.map();await storyUI.afterResults();})();}else tally();},{visible:()=>!window.ShapeShiftPlatform.paused&&!nativeBackground});
  else tally();
 };
 const presentResults=(animateRewards=true)=>{
  $('over-dialog').classList.toggle('adventure-results',runMode==='adventure');audio()?.setScene('menu',{preservePraise:runMode==='adventure'&&modeWon});if(!$('over-dialog').open)$('over-dialog').showModal();$('record').focus({preventScroll:true});
  if(!(runMode==='adventure'&&modeWon))sound('over');
  if(animateRewards)startResultRewards();
 };
 if(runMode==='adventure'&&modeWon){
  cancelVictory=showAdventureVictory({document,points:state.victoryPoints,level:adventureLevel,drawShape:sprite,sound,stopSound:()=>audio()?.stopVictory?.(),
   visible:()=>!window.ShapeShiftPlatform.paused&&!nativeBackground,reduced:prefs.motion||matchMedia('(prefers-reduced-motion: reduce)').matches,
   reveal:()=>presentResults(false),done:()=>{cancelVictory=null;startResultRewards();}});
 }else presentResults();







}







let feedbackTimeout;







function showPlayFeedback(outcome,oldStrikes){







 const el=$('play-feedback');window.ShapeShiftPlatform.clearTimeout(feedbackTimeout);el.replaceChildren();el.className='';







 const good=outcome==='correct',hurt=outcome==='wrong'||outcome==='miss';







 if(!good&&!hurt&&outcome!=='protected')return;







 const title=document.createElement('strong'),detail=document.createElement('span');







 if(good){

  // Correct-pick points are shown on the selected tile instead of below the board.

  if(state.bonus)sound('bonus');

  if(state.sweepStarted)sound('level');

  if(state.specialEffect)sound(state.specialEffect==='heart'&&oldStrikes===0?'special-point':'special-'+state.specialEffect);

 }else{

  // Damage and shield saves animate the health HUD; no banner below the board.

  el.replaceChildren();el.className='';

  const target=$('health');target.classList.remove('feedback-pop');void target.offsetWidth;target.classList.add('feedback-pop');

 }



 $('game').classList.remove('damage-flash','shield-flash');
 if((hurt||outcome==='protected')&&!prefs.motion){void $('game').offsetWidth;$('game').classList.add(outcome==='protected'?'shield-flash':'damage-flash');}







 feedbackTimeout=window.ShapeShiftPlatform.setTimeout(()=>{el.className='';el.replaceChildren();},good?850:1100);







}







function resolve(index){







 if(abilityGuideOpen()||memoryPeek||mechanicHold>0||!active||paused||counting||locked||rockFills.length||index!==null&&board[index]?.collected)return;







 if(runMode==='adventure'&&index!==null){
 const tile=board[index];
 if(tile.memory&&!tile.peeked){tile.peeked=true;memoryCards.set(index,{...tile});memoryPeek={index,elapsed:0};const b=$('board').children[index];paintMemory(b,tile);b.classList.add('memory-open');b.setAttribute('aria-label',tileName(tile)+'. Remember this card.');sound('click');return;}
 if(state.matchRule&&!tile.special&&!tile.bonusTile&&(tile.shape===state.current.shape||tile.color===state.current.color)&&tile[state.matchRule]!==state.current[state.matchRule]){
 const b=$('board').children[index];b.animate([{transform:'translateX(0)'},{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}],{duration:220});sound('click');return;
 }
 }
 if(openingCoach?.active&&!openingCoach.accept(index))return;
 const correctAnswers=correctChoiceIndices(state,board);locked=true;modeTurns++;const oldScore=state.score;const oldStrikes=state.strikes;const praisePreviousColor=state.current.color;const questBefore={...state.current};const questTile=index===null?null:board[index];







 actions.push(index===null?{type:'expire'}:{type:'choose',index});trackRankedActions(ranked,actions).catch(()=>{});







 if(index!==null&&board[index]&&!board[index].special&&board[index].shape!==state.current.shape&&board[index].color!==state.current.color)modeWrong++;
 const bombLayout=runMode==='adventure'&&rockLayout?rockLayout:adventureLayout(1,board.length);
 state={...state,boardColumns:bombLayout.columns,boardCells:bombLayout.cells};
 state=index===null?expire(state,board):choose(state,board,index);
 const missedMemory=runMode==='adventure'&&index!==null&&settleMemoryGuess(memoryCards,index,questTile,state.outcome);
 if(runMode==='adventure'){
 if(index!==null&&questTile?.memory&&state.outcome==='correct'){$('board').children[index]?.classList.add('memory-open');}

 }

 analytics.pick({correct:earnsMatchCoin(state,questTile),wrong:index!==null&&!questTile?.special&&state.outcome!=='correct',missed:index===null&&['miss','protected'].includes(state.outcome),special:questTile?.special,responseMs:Math.max(0,boardTime-remaining)});

 if(state.specialEffect==='reset')$('board').querySelectorAll('.board-rock').forEach(el=>el.style.visibility='hidden');
 effectScoreBefore=state.specialEffect?oldScore:null;visualStrikes=state.specialEffect==='heart'?oldStrikes:null;







 if(earnsMatchCoin(state,questTile)&&!questTile.bonusTile)applyRockDamage([index]);
 levelPickStats=trackLevelPick(levelPickStats,questTile,earnsMatchCoin(state,questTile),state.outcome);
 if(['adventure','endless'].includes(runMode)&&earnsMatchCoin(state,questTile)&&!questTile.bonusTile)praiseRun.success({colorChanged:questTile.color!==praisePreviousColor});
 if(['wrong','miss','protected'].includes(state.outcome)){praiseRun.miss();audio()?.stopPraise();}
 if(runMode==='adventure'&&state.specialEffect==='starburst'&&index!==null)levelPickStats=trackLevelCollection(levelPickStats,board.filter(tile=>!tile.memory));
 if(earnsMatchCoin(state,questTile)){

  const earnedCoins=matchCoinReward(state);analytics.count('coins_earned','match',earnedCoins);profile=earnCoin(profile,state);modePicks++;runCoins+=earnedCoins;

  const coin=createCoinFlight($('board').children[index],document.querySelector('.run-coins img'),prefs.motion);

  if(coin){coin.coins=earnedCoins;coinFlights.push(coin);coin.draw(0);}

 }



 trackAchievements({type:'pick',mode:runMode,correct:earnsMatchCoin(state,questTile),outcome:state.outcome,score:state.score,tile:questTile,rule:state.matchRule});



 profile=trackQuestProgress(profile,{type:'pick',difficulty:endlessDifficulty,time:survivalClock.elapsed()/1000,lives:state.maxLives-state.strikes,lostLife:state.strikes>oldStrikes,correct:state.outcome==='correct',outcome:state.outcome,tile:questTile,score:state.score,mode:runMode,before:questBefore,boardSize:board.length,responseMs:Math.max(0,boardTime-remaining)});saveProfile();updateQuestBadge();







 state=clearExpiredMatchRule(state,adventureLevel,modePicks);
 $('board').querySelectorAll('button').forEach(b=>b.disabled=true);







 const messages={protected:'Shield saved you. Keep going!',correct:'',pass:'No match on that board. No strike.',wrong:'Wrong choice Â· one life lost.',miss:'Missed a match Â· one life lost.'};







 $('feedback').textContent=index===null&&board.some(t=>t.bonusTile)?'Color Rush complete!':messages[state.outcome];







 $('board').classList.toggle('miss',state.outcome==='wrong'||state.outcome==='miss');







 $('board').classList.toggle('success',state.outcome==='correct');







 if(state.outcome==='correct'&&!state.specialEffect){const tile=$('board').children[index];const rect=tile.getBoundingClientRect();showFloatingPoints(rect.x+rect.width/2,rect.y+rect.height/2,state.score-oldScore,prefs.motion);tile.classList.add('picked-tile');}

 if(state.outcome==='protected')sound('shield-hit');
 else if(!state.specialEffect)sound(state.outcome==='pass'?'skip':state.outcome==='miss'?'wrong':state.outcome);







 showPlayFeedback(state.outcome,oldStrikes);







 update();



 if(state.specialEffect&&state.specialEffect!=='starburst'&&state.specialEffect!=='bomb'&&(state.specialEffect!=='heart'||oldStrikes>0)){burstEffect?.clear();burstElapsed=0;burstEffect=createSpecialEffect(state.specialEffect,$('board'),index,{health:$('health'),shield:$('health').querySelector('.health-shield')||$('health'),timer:$('timer').parentElement,board:$('board')},prefs.motion,sound);burstEffect?.draw(0);}



 if(state.specialEffect==='heart'&&oldStrikes===0){
  burstEffect?.clear();burstElapsed=0;burstEffect=createHeartOverflow($('board'),index,prefs.motion);burstEffect?.draw(0);
  const r=$('board').children[index]?.getBoundingClientRect();if(r)showFloatingPoints(r.x+r.width/2,r.y+r.height/2,state.earned,prefs.motion);
 }
 if(state.specialEffect==='heart'&&oldStrikes>0&&burstEffect){

  const flight=burstEffect;let restored=0;const step=prefs.motion?140:230,start=prefs.motion?150:650;

  burstEffect={duration:start+oldStrikes*step+250,draw(elapsed){flight.draw(Math.min(elapsed,flight.duration));const desired=Math.min(oldStrikes,Math.max(0,Math.floor((elapsed-start)/step)+1));

   while(restored<desired){restored++;visualStrikes=oldStrikes-restored;update();const hearts=$('health').querySelectorAll('.heart');hearts[(state.maxLives||3)-visualStrikes-1]?.classList.add('heart-restored');sound('heart-fill');}

  },clear(){flight.clear();visualStrikes=null;}};

 }

 if(state.specialEffect==='bomb'){
  burstEffect?.clear();burstEffect=null;burstElapsed=0;
  const rect=$('board').children[index].getBoundingClientRect();bombFeedback($('game'),rect.x+rect.width/2,rect.y+rect.height/2,prefs.motion);sound('slice-bomb');
  const debris=[];for(const cell of state.blastTargets){const tile=$('board').children[cell];if(!tile)continue;tile.classList.add('picked-tile');const r=tile.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;showFloatingPoints(x,y,state.earned/state.blastTargets.length,prefs.motion);debris.push({x,y});}bombDebris($('game'),debris,prefs.motion);
  if(runMode==='adventure'){levelPickStats=trackBombCollections(levelPickStats,state.blastTargets.map(i=>board[i]));for(const i of state.blastTargets)memoryCards.delete(i);applyRockDamage(state.blastTargets,{minimumHits:1});}
 }
 if(state.specialEffect==='starburst'){burstEffect?.clear();burstElapsed=0;const hitCells=new Set();burstEffect=createStarburst($('board'),board,index,$('score'),state.multiplier*difficultyFor(state).points,prefs.motion,sound,tileIndex=>applyRockDamage([tileIndex],{hitCells,minimumHits:1}));burstEffect?.draw(0);}







 // Crown picks share one timer and leave the remaining cards immediately tappable.
 if(questTile?.bonusTile&&state.sweepBoard){
  board=state.sweepBoard.map(tile=>({...tile}));
  locked=false;transition=0;
  [...$('board').querySelectorAll('button.choice')].forEach((button,i)=>{button.disabled=!!board[i].collected;});
  $('board').classList.remove('success');update();return;
 }
 if(missedMemory){burstEffect?.clear();burstElapsed=0;burstEffect=createMemoryMissReveal($('board').children[index],tileName(questTile));burstEffect.draw(0);}
 transition=burstEffect?burstEffect.duration:state.over?400:state.specialEffect==='bomb'?120:state.specialEffect?650:state.outcome==='correct'?(prefs.motion?180:460):220;if(['adventure','endless'].includes(runMode)&&['wrong','miss','protected'].includes(state.outcome)){
  for(const index of correctAnswers)$('board').children[index]?.classList.add(prefs.motion?'correct-answer-still':'correct-answer-pulse');
  transition=Math.max(transition,900);
  if(burstEffect)burstEffect.duration=Math.max(burstEffect.duration,900);
 }
 update();







}







function advanceCoinFlights(delta){
 for(const effect of coinFlights){effect.elapsed+=delta;effect.draw(effect.elapsed);}

 const arrived=coinFlights.filter(effect=>effect.elapsed>=effect.duration);

 if(arrived.length){arrived.forEach(effect=>effect.clear());coinFlights=coinFlights.filter(effect=>effect.elapsed<effect.duration);$('run-coins').textContent=Math.max(0,runCoins-coinFlights.reduce((sum,effect)=>sum+effect.coins,0));const counter=document.querySelector('.run-coins');counter.classList.remove('feedback-pop');void counter.offsetWidth;counter.classList.add('feedback-pop');}
}

function tick(now){
 renderSurvivalClock();







 if(!active||paused)return;







 if(abilityGuideOpen()){last=now;frame=window.ShapeShiftPlatform.requestAnimationFrame(tick);return;}
 // Reward flights finish even while the next board's rule-change cue holds play.
 if(!window.ShapeShiftPlatform.paused&&!nativeBackground)advanceCoinFlights(frameDelta(now,last));
 if(maybeAdventureGuide()||maybeAbilityGuide()){last=now;frame=window.ShapeShiftPlatform.requestAnimationFrame(tick);return;}
 if(memoryPeek||mechanicHold>0){const dt=frameDelta(now,last);last=now;if(!window.ShapeShiftPlatform.paused&&!nativeBackground){
 if(colorFlip){colorFlip.elapsed+=dt;paintCurrentShape();}
 if(memoryPeek){memoryPeek.elapsed+=dt;if(memoryPeek.elapsed>=1300){const b=$('board').children[memoryPeek.index];b?.classList.remove('memory-open');if(b)paintMemory(b,board[memoryPeek.index]);memoryPeek=null;}}
 else mechanicHold=Math.max(0,mechanicHold-dt);
 }frame=window.ShapeShiftPlatform.requestAnimationFrame(tick);return;}
 const frameMs=now-last;if(frameMs>0&&frameMs<1000)analytics.count('frames',frameMs<20?'under-20ms':frameMs<34?'20-34ms':frameMs<50?'34-50ms':'50ms-plus');let delta=frameDelta(now,last);last=now;gameplayScene.tick(delta,{score:state.score,reduced:prefs.motion||matchMedia('(prefers-reduced-motion: reduce)').matches,duration:boardTime,slow:state.slow,slowRate:timeSlowRate(state),locked});if(runMode==='adventure'&&!rockFills.length)modeElapsed+=delta;









 if(rockFills.length){
  rockFillElapsed+=delta;
  for(const fill of rockFills){const t=Math.max(0,Math.min(1,(rockFillElapsed-fill.delay)/fill.duration)),p=1-(1-t)*(1-t);fill.el.style.opacity=String(Math.min(1,t*3));fill.el.style.transform='translateY('+(-fill.distance*(1-p))+'px)';}
  if(rockFills.every(fill=>rockFillElapsed>=fill.delay+fill.duration)){
   rockFills.forEach(({el})=>{el.style.removeProperty('opacity');el.style.removeProperty('transform');});rockFills=[];
   [...$('board').querySelectorAll('button.choice')].forEach((b,i)=>b.disabled=!!board[i].collected);fitBoard($('board'));update();
  }
 }
 else if(locked){if(burstEffect){burstElapsed+=delta;burstEffect.draw(burstElapsed);transition=Math.max(0,burstEffect.duration-burstElapsed);}else transition-=delta;if(transition<=0){if(state.over||(runMode==='adventure'&&levelComplete(adventureLevel,currentLevelStats()))||(runMode==='rush'&&rushRemaining<=0)){modeWon=!state.over;finish();return;}nextBoard();}}







 else{







  const realDelta=delta;delta=elapsedBoardTime(delta,state);







  if(runMode==='rush'){rushRemaining=Math.max(0,rushRemaining-realDelta);if(rushRemaining<=0){modeWon=true;finish();return;}}if(!openingCoach?.active||openingCoach.timerRunning)remaining-=delta;timer();if(remaining<=0)resolve(null);







 }







 frame=window.ShapeShiftPlatform.requestAnimationFrame(tick);







}







function chargePower(name){







 if(!runBoostUnlocked(name))return false;
 const next=spendAbility(state,name);if(next===state)return false;







 const loan=starBoosts[name]>0;const paid=loan?profile:consume(profile,name);if(!loan&&paid===profile)return false;if(loan)starBoosts[name]--;







 analytics.count('boosts',name);profile=paid;state=next;if(runMode==='adventure')levelPickStats=trackLevelAbility(levelPickStats,name);saveProfile();actions.push({type:'ability',name});trackRankedActions(ranked,actions).catch(()=>{});return true;







}







function ability(name){
 if(abilityGuideOpen())return;







 if(!runBoostUnlocked(name)){showAbilityLock(BOOST_UNLOCK_LEVELS[name]);uiSound('error');return;}
 if(!active||paused||locked||rockFills.length)return;







 if(autoPowers.has(name)||abilityActive(state,name)){autoPowers.delete(name);const stopped=stopAbility(state,name);if(stopped!==state){state=stopped;actions.push({type:'stopAbility',name});trackRankedActions(ranked,actions).catch(()=>{});}$('feedback').textContent='Boost stopped.';update();timer();sound('click');return;}







 if(boostCharges(name)<=0)return;







 autoPowers.add(name);chargePower(name);







 $('feedback').textContent=name==='shield'?(state.shieldCooldown>0?'Shield queued: ready after '+state.shieldCooldown+' turns.':'Shield on. One hit, then a 5-turn cooldown. Tap again to stop.'):'On. Uses one every 5 rounds. Tap again to stop.';







 update();timer();sound(name==='freeze'?'special-hourglass':name==='shield'?'shield':'skill-points');







}







async function start(forceTutorial=false,onPrepared=()=>{},beforeTutorial=()=>Promise.resolve()){
 if(counting||active)return;
 const gate=beginModeTransition(runMode==='adventure'?'Adventure':runMode==='rush'?'Time Rush':'Endless');
 try{return await prepareRun(forceTutorial,onPrepared,beforeTutorial,gate);}finally{gate.dispose();}
}
async function prepareRun(forceTutorial,onPrepared,beforeTutorial,gate){












 if(counting||active)return;openingCoach?.close();openingCoach=runMode==='endless'&&(forceTutorial===true||!store.get(TUTORIAL_KEY,false))?createEndlessCoach({resetTimer:()=>{remaining=boardTime;timer();},complete:()=>{store.set(TUTORIAL_KEY,true);firstEndless.complete();}}):null;const token=++countdownToken;counting=true;$('play').disabled=true;$('run-load-error')?.remove();try{collectionRun++;survivalClock.reset();renderSurvivalClock();colorFlip=null;runStartXp=profile.xp||0;syncAdventureBoosts();runBoostLevel=profile.adventureCompleted||0;completionXpGranted=false;modePicks=0;modeTurns=0;runCoins=0;rushRemaining=60000;modeWon=false;modeElapsed=0;modeWrong=0;levelPickStats={};starBoosts={};if(runMode==='adventure')for(const task of levelTasks(adventureLevel))if(task.type==='ability')for(const name of task.ability==='all'?['shield','freeze','boost']:[task.ability])starBoosts[name]=1;rockLayout=null;memoryCards=new Map();memoryPeek=null;memoryLesson=null;mechanicHold=0;lastWheelPick=0;wheelTurns=0;lastMatchRule=null;rockFills=[];rockFillElapsed=0;praiseRun.startRun();praiseAnimation?.cancel();if($('streak-praise'))$('streak-praise').hidden=true;clearCoinFlights();trackAchievements({type:'runStart',mode:runMode,difficulty:endlessDifficulty});uiSound('start');autoPowers.clear();audio()?.start();syncIdentity().catch(()=>{});







 closeDialogs();window.ShapeShiftPlatform.cancelAnimationFrame(frame);







 active=false;paused=false;counting=true;state=null;screen('game');$('play').disabled=true;$('countdown').hidden=false;$('countdown').querySelector('strong').textContent='...';$('countdown').querySelector('span').textContent='Loading level';$('countdown').querySelector('p').textContent='Getting your shapes readyâ€¦';$('game').setAttribute('aria-busy','true');$('board').replaceChildren();







 for(const name of Object.keys(PRICES))$(name).disabled=true;







 for(const button of $('board').querySelectorAll('button'))button.disabled=true;







 await new Promise(resolve=>window.ShapeShiftPlatform.requestAnimationFrame(()=>window.ShapeShiftPlatform.setTimeout(resolve,0)));if(token!==countdownToken)return;await Promise.all([effectArtReady,skinArtReady,runMode==='adventure'?ensureSkinArt(activeSkin(),true):null]);if(token!==countdownToken)return;ranked=null;if(runMode==='endless'&&!openingCoach&&!profile.adminMode){ranked=await beginRankedRun(endlessDifficulty).catch(()=>null);}if(token!==countdownToken)return;







 profile=trackQuests(ensureQuests(profile),{type:'start',mode:runMode,difficulty:endlessDifficulty});saveProfile();



 runRng=runMode==='adventure'?seededRandom(0x53480000+adventureLevel):ranked?seededRandom(ranked.seed):Math.random;runId=crypto.randomUUID();actions=[];runSaved=false;







 state=applyLoadout(createRun(runRng),profile.equipped.frame,profile.equipped.background,runRng,profile.upgrades[profile.equipped.frame]||0);state.mode=runMode;state.difficulty=endlessDifficulty;analytics.startRun(runMode,endlessDifficulty,adventureLevel);engagement.startRun(runMode);actions.push({type:'loadout',frame:replayFrame(profile.equipped.frame),map:profile.equipped.background,upgrade:profile.upgrades[profile.equipped.frame]||0});for(const name of Object.keys(PRICES))state[name]=boostCharges(name)>0?1:0;
 if(runMode==='adventure'){
 state.adventureLevel=adventureLevel;
 const requiredShapes=levelRequirements(adventureLevel).filter(g=>g.type==='collection').map(g=>g.shape);
 if(requiredShapes.includes(state.excludedShape)){
  state.excludedShape=[0,1,2,3].find(shape=>!requiredShapes.includes(shape))??null;
  if(state.current.shape===state.excludedShape)state.current={...state.current,shape:requiredShapes[0]};
 }
 }
 if(runMode==='adventure'&&adventureLevel>=4)state.stage=levelSpec(adventureLevel).maxChoices===4?3:levelSpec(adventureLevel).maxChoices===6?4:levelSpec(adventureLevel).maxChoices===9?7:levelSpec(adventureLevel).maxChoices===12?12:17;







 nextBoard();await gate.reveal();if(token!==countdownToken)return;$('game').removeAttribute('aria-busy');$('countdown').querySelector('span').textContent='Find your shape';$('countdown').querySelector('p').textContent='Match either. Pick one.';







 $('feedback').textContent='';







 audio()?.setMusic(prefs.music);audio()?.setSfx(prefs.sfx);audio()?.start();







 if(!openingCoach&&(forceTutorial===true||!store.get(TUTORIAL_KEY,false))){



  $('countdown').hidden=true;onPrepared();await beforeTutorial();if(token!==countdownToken)return;
  const completed=await new Promise(resolve=>{tutorialCompletion=resolve;openTutorial(true);});



  if(!completed||token!==countdownToken)return;



 }



 onPrepared();await beforeTutorial();$('countdown').hidden=false;openingCoach?.paint();







 $('countdown').hidden=true;if(token!==countdownToken)return;$('countdown').hidden=false;
 for(const n of (openingCoach?[]:['3','2','1'])){if(token!==countdownToken)return;$('countdown').querySelector('strong').textContent=n;await new Promise(r=>window.ShapeShiftPlatform.setTimeout(r,500));}







 if(token!==countdownToken)return;







 counting=false;$('countdown').hidden=true;active=true;last=window.ShapeShiftPlatform.now();update();







 frame=window.ShapeShiftPlatform.requestAnimationFrame(tick);if(window.ShapeShiftPlatform.paused)pause();







 }catch(error){
  console.error('Unable to start run',error);
  if(forceTutorial&&document.documentElement.classList.contains('startup-loading')){counting=false;active=false;throw error;}
  if(token===countdownToken){home(true);const message=document.createElement('p');message.id='run-load-error';message.setAttribute('role','status');message.textContent='Could not load the game. Tap Play to try again.';$('play').after(message);}
 }finally{if(token===countdownToken){$('play').disabled=false;$('game').removeAttribute('aria-busy');}}
}







function pause(){



 if(abilityGuideOpen()||$('tutorial-dialog').open||$('boost-lesson-dialog').open)return;







 if(reviveCounting)return;

 if(counting&&!state)return;







 if(counting){countdownToken++;counting=false;$('countdown').hidden=true;active=true;}







 if(!active||paused)return;







 paused=true;audio()?.setScene('menu');window.ShapeShiftPlatform.cancelAnimationFrame(frame);update();$('pause-quests').querySelector('span').textContent=runMode==='adventure'?'Level Tasks':'Quests';$('pause-dialog').showModal();







}







function resume(){







 if(!active)return;audio()?.setScene('game');paused=false;$('pause-dialog').close();last=window.ShapeShiftPlatform.now();update();audio()?.resume();frame=window.ShapeShiftPlatform.requestAnimationFrame(tick);







}







function home(skipOffer=false){
 if(menuReadiness&&!menuReadiness.homeReady())return menuReadiness.openHome(()=>home(skipOffer));

 stopResultCountdown();

 effectScoreBefore=null;visualStrikes=null;

 clearCoinFlights();



 burstEffect?.clear();burstEffect=null;







 if(state&&(active||paused||counting))recordRun();







 window.ShapeShiftPlatform.clearTimeout(feedbackTimeout);$('play-feedback').replaceChildren();$('play-feedback').className='';countdownToken++;reviveCounting=false;counting=false;active=false;paused=false;$('play').disabled=false;$('game').removeAttribute('aria-busy');survivalClock.setRunning(false);$('countdown').hidden=true;







 window.ShapeShiftAds?.cancelRewarded?.();







 window.ShapeShiftPlatform.cancelAnimationFrame(frame);closeDialogs();audio()?.start();screen('home');flushProfile();
 if(skipOffer!==true&&state?.over&&runId){const result=completeAdRun(store.get('shape-shift-ad-cadence-v1',{}),runId);store.set('shape-shift-ad-cadence-v1',result.state);if(result.offer&&window.ShapeShiftAds)openCoinOffer(true);}








}







function applyPrefs(){







 prefs.motion=false; // Full animations also replace previously saved reduced-motion preferences.

 document.body.classList.remove('reduce-motion');







 for(const key of ['music','sfx'])$(key+'-setting').checked=Boolean(prefs[key]);
 for(const key of ['music','sfx']){
  const fallback=key==='music'?40:65,value=Number(prefs[key+'Volume']);prefs[key+'Volume']=Number.isFinite(value)?Math.max(0,Math.min(100,value)):fallback;
  const slider=$(key+'-volume');slider.value=prefs[key+'Volume'];slider.style.setProperty('--volume',prefs[key+'Volume']+'%');slider.setAttribute('aria-valuetext',prefs[key+'Volume']+' percent');
  $(key+'-volume-value').textContent=prefs[key+'Volume']+'%';

 }
 audio()?.setMusicVolume(prefs.musicVolume);audio()?.setSfxVolume(prefs.sfxVolume);








 audio()?.setMusic(prefs.music);audio()?.setSfx(prefs.sfx);store.set('shape-shift-settings',prefs);







}







// The world menu owns Play and routes its single tap to the selected mode.







$('home-level').onclick=()=>{const p=playerProgress(profile.xp);$('xp-help-level').textContent='Level '+p.level;$('xp-help-progress').max=p.required||1;$('xp-help-progress').value=p.capped?1:p.current;$('xp-help-count').textContent=p.capped?'MAX LEVEL':p.current+' / '+p.required+' XP';$('xp-help-progress').setAttribute('aria-label',$('xp-help-count').textContent);$('xp-help-dialog').showModal();};

$('coin-help-open').onclick=()=>$('coin-help-dialog').showModal();



$('settings-open').onclick=openSettings;







$('pause-settings').onclick=openSettings;







$('home-link').onclick=e=>{e.preventDefault();if(active||counting)pause();else home();};







$('pause').onclick=pause;$('resume').onclick=resume;$('quit').onclick=home;















$('shield').onclick=()=>ability('shield');







$('freeze').onclick=()=>ability('freeze');$('boost').onclick=()=>ability('boost');







document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());







for(const key of ['music','sfx'])$(key+'-setting').onchange=e=>{prefs[key]=e.target.checked;applyPrefs();};
for(const key of ['music','sfx']){
 $(key+'-volume').oninput=e=>{prefs[key+'Volume']=Number(e.target.value);if(prefs[key+'Volume']>0)prefs[key]=true;applyPrefs();audio()?.start();};
 if(key==='sfx')$(key+'-volume').onchange=()=>audio()?.ui('click');
}








$('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();resume();});







$('over-dialog').addEventListener('close',stopResultCountdown);
bindResultKeyboard();
bindPauseKeyboard();

$('over-dialog').addEventListener('cancel',e=>{e.preventDefault();dismissRunScreen();});







document.addEventListener('keydown',e=>{
 if(abilityGuideOpen())return;







 if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.isComposing||e.target.closest('input,textarea,select,[contenteditable]')||document.querySelector('dialog[open]'))return;







 if(e.code==='Escape'&&(active||counting)&&!paused){e.preventDefault();pause();return;}







 if(!active||paused||locked)return;







 const boostKey=ABILITY_KEYS[e.code];
 if(boostKey){e.preventDefault();ability(boostKey);return;}







 if(e.code==='KeyF'){e.preventDefault();ability('freeze');}







 if(e.code==='KeyH'){e.preventDefault();ability('shield');}







 if(e.code==='KeyB'){e.preventDefault();ability('boost');}







});







document.addEventListener('unused-visibilitychange',()=>{if(window.ShapeShiftPlatform.paused){survivalClock.setRunning(false);pause();audio()?.pause();flushProfile();}else if($('app').dataset.storyActive!=='true')audio()?.start();});







window.addEventListener('unused-pagehide',flushProfile);







window.addEventListener('unused-androidpause',()=>{nativeBackground=true;survivalClock.setRunning(false);pause();audio()?.pause();flushProfile();});







window.addEventListener('unused-androidresume',()=>{nativeBackground=false;if($('app').dataset.storyActive!=='true')audio()?.start();});







window.handleAndroidBack=()=>{
 const open=[...document.querySelectorAll('dialog[open]')];
 const focused=document.activeElement?.closest('dialog[open]');
 const top=focused||open.at(-1);
 if(top){
  if(top.id==='pause-dialog'){resume();return true;}
  const close=top.querySelector('.close:not([disabled]),[data-close="'+top.id+'"]:not([disabled])');
  if(close){close.click();return true;}
  // Custom game screens own their back stack through the dialog cancel event.
  if(top.dispatchEvent(new Event('cancel',{cancelable:true})))top.close();
  return true;
 }
 if(abilityGuideOpen())return true;
 if(active||counting){pause();return true;}
 if($('app').dataset.screen==='map'){$('map-back').click();return true;}
 return false;
};
window.addEventListener('androidback',()=>window.handleAndroidBack());
bindBoardKeyboard($('board'),{suspended:()=>!active||paused||openingCoach?.introducing||abilityGuideOpen()||window.ShapeShiftPlatform.paused||!!document.querySelector('dialog[open]'),enabled:()=>['endless','adventure'].includes(runMode)&&active&&!paused&&!locked&&!counting&&!abilityGuideOpen()&&!window.ShapeShiftPlatform.paused&&!document.querySelector('dialog[open]')});
for(const [code,name] of Object.entries(ABILITY_KEYS).filter(([code])=>code.startsWith('Digit')))$(name).setAttribute('aria-keyshortcuts',code.slice(-1));
bindBackKeyboard({ready:()=>$('startup-ready').hidden,back:()=>window.handleAndroidBack()});








let coinRewardPending=false;



let runBonusOffer=false;
function noteWatchedAd(){store.set('shape-shift-ad-cadence-v1',watchedAd(store.get('shape-shift-ad-cadence-v1',{}),runId));}
function openCoinOffer(bonus=false){
 if(coinRewardPending)return;runBonusOffer=bonus;
 const amount=bonus?RUN_AD_REWARD:VIDEO_COIN_REWARD;
 $('coins-ad-title').textContent=bonus?'Bonus break':'Free coins';
 document.querySelector('#coins-ad-dialog .coin-reward-amount').textContent=amount.toLocaleString()+' coins';
 $('coins-ad-status').textContent=window.ShapeShiftAds?`Watch a video to collect ${amount.toLocaleString()} coins. You can skip this offer.`:'Rewarded videos are available in the Android app.';
 $('coins-ad-watch').querySelector('span').textContent='Earn '+amount.toLocaleString()+' coins';
 $('coins-ad-watch').disabled=!window.ShapeShiftAds;
 analytics.count('ad_offers',bonus?'run-bonus':'menu');$('coins-ad-dialog').showModal();
}
$('coins-ad-open').onclick=()=>openCoinOffer(false);

$('coins-ad-dialog').addEventListener('cancel',event=>{if(coinRewardPending)event.preventDefault();});



$('coins-ad-watch').onclick=async()=>{

 if(coinRewardPending||!window.ShapeShiftAds)return;

 coinRewardPending=true;$('coins-ad-watch').disabled=true;$('coins-ad-close').disabled=true;

 $('coins-ad-status').textContent='Loading videoâ€¦';audio()?.pause();

 let result;

 try{result=await requestReward(window,120000,runBonusOffer?'run-bonus':'default');}catch{result='failed';}

 audio()?.start();

 try{

  if(result==='rewarded'){analytics.count('coins_earned','ad',runBonusOffer?RUN_AD_REWARD:VIDEO_COIN_REWARD);

   const oldBalance=profile.coins-pendingWalletCoins;

   noteWatchedAd();
   const next=runBonusOffer?grantRunAdReward(profile,result):rewardVideoCoins(profile,result),earned=next.coins-profile.coins;

   pendingWalletCoins+=earned;profile=next;saveProfile();flushProfile();

   const origin=document.querySelector('#coins-ad-dialog .coin-reward-amount').getBoundingClientRect();

   $('coins-ad-dialog').close();uiSound('quest-collect');

   try{await showQuestReward({getBoundingClientRect:()=>origin},$('coin-help-open'),earned,oldBalance,prefs.motion);}catch{}finally{

    pendingWalletCoins=Math.max(0,pendingWalletCoins-earned);saveProfile();uiSound('coin-arrive');

   }

  }else{

   $('coins-ad-status').textContent=result==='dismissed'?'Video closed early. No coins added.':result==='unsupported'?'Rewarded videos are available in the Android app.':'No video available right now. Please try again shortly.';

  }

 }finally{coinRewardPending=false;$('coins-ad-watch').disabled=false;$('coins-ad-close').disabled=false;}

};



async function continueWithCountdown(){

 const token=++countdownToken;effectScoreBefore=null;visualStrikes=null;window.ShapeShiftPlatform.cancelAnimationFrame(frame);actions.push({type:'revive'});trackRankedActions(ranked,actions).catch(()=>{});runSaved=false;

 state=revive(state);continueOfferOpen=false;continueOfferReady=false;modeWon=false;closeDialogs();screen('game');paused=false;active=false;counting=true;reviveCounting=true;nextBoard();

 for(const b of $('board').children)b.disabled=true;

 $('feedback').textContent='';const overlay=$('countdown');overlay.querySelector('span').textContent='Youâ€™re back!';overlay.querySelector('p').textContent='Lives restored';overlay.hidden=false;

 $('health').classList.add('refilling');[...$('health').children].forEach((h,i)=>h.style.setProperty('--heart-delay',(i*140)+'ms'));

 const ready=await runContinueCountdown(n=>{overlay.querySelector('strong').textContent=n;uiSound('countdown');},{cancelled:()=>token!==countdownToken,visible:()=>!window.ShapeShiftPlatform.paused&&!nativeBackground});

 if(token!==countdownToken)return;

 reviveCounting=false;counting=false;overlay.hidden=true;$('health').classList.remove('refilling');if(!ready)return;

 active=true;paused=false;locked=false;last=window.ShapeShiftPlatform.now();for(const [i,b] of [...$('board').querySelectorAll('button.choice')].entries())b.disabled=!!board[i].collected;

 audio()?.setScene('game');uiSound('start');update();frame=window.ShapeShiftPlatform.requestAnimationFrame(tick);

}



$('continue-ad').onclick=async()=>{







 if(!state?.over||state.continued||!window.ShapeShiftAds)return;







 stopResultCountdown();

 continueAdPending=true;
 const endedRun=state;const runToken=countdownToken;







 $('continue-ad').disabled=true;







 $('ad-status').textContent='Loading rewarded adâ€¦';audio()?.pause();







 const result=await requestReward(window,120000,'continue');
 continueAdPending=false;continueOfferReady=true;
 document.querySelector('.result-home-hint').textContent='Tap anywhere else to finish your run.';







 $('continue-ad').disabled=false;







 if(state!==endedRun||runToken!==countdownToken)return;







 audio()?.start();







 if(result!=='rewarded'){$('ad-status').textContent=result==='dismissed'?'Ad closed before the reward. Your score is safe.':result==='unsupported'?'Open the Android app to watch a rewarded ad.':'No ad available right now. Try again shortly.';return;}







 noteWatchedAd();
 await continueWithCountdown();



};







$('privacy-options').hidden=!window.ShapeShiftAds;







$('privacy-options').onclick=()=>{window.ShapeShiftAds?.privacy();};







window.addEventListener('adprivacy',e=>{if($('settings-dialog').open)$('privacy-status').textContent=e.detail?.message||'';});







function recordRun(){







 if(!state||runSaved)return;runSaved=true;analytics.endRun('abandoned');engagement.endRun('abandoned');



 const loadout=actions.find(a=>a.type==='loadout');profile=trackQuestProgress(profile,{type:'finish',difficulty:endlessDifficulty,time:survivalClock.elapsed()/1000,picks:state.picks,mode:runMode,won:modeWon,score:state.score,loadout:{frame:state.frame,background:loadout?.map}});updateQuestBadge();







 if(runMode==='endless'&&state.difficulty!=='normal'){const key='shape-shift-best-'+state.difficulty;store.set(key,Math.max(state.score,Number(store.get(key,0))||0));}
 if(runMode==='endless'&&state.difficulty==='normal'){best=Math.max(best,state.score,Number(store.get('shape-shift-endless-best-v3',0))||0);store.set('shape-shift-endless-best-v3',best);}







 const entry={id:runId,mode:runMode,ranked:!!ranked,score:state.score,picks:state.picks,date:new Date().toISOString()};







 profile.runs=[entry,...profile.runs.filter(r=>r.id!==runId)].slice(0,30);







 if(ranked){profile.pending=[{id:ranked.id,expectedScore:state.score,actions:actions.slice()},...profile.pending.filter(r=>r.id!==ranked.id)].slice(0,20);}







 saveProfile();flushScores();







}







let flushing=null;







function flushScores(){



 if(flushing)return flushing;



 flushing=(async()=>{for(const run of profile.pending.slice()){



  try{await submitRankedRun(run);profile.pending=profile.pending.filter(r=>r!==run);saveProfile();}



  catch(error){if([400,404,413,422].includes(error.status)){profile.failedScores=[{...run,status:error.status},...(profile.failedScores||[])].slice(0,20);profile.pending=profile.pending.filter(r=>r!==run);saveProfile();continue;}break;}



 }})().finally(()=>{flushing=null;});



 return flushing;



}







function applyCosmetics(){
 setActiveSkin(profile.equipped.skin);







 $('app').dataset.background=profile.equipped.background;
 window.gameAudio?.setMenuWorld(profile.equipped.background);







 $('app').dataset.frame=profile.equipped.frame;setIdentityFrame(profile.equipped.frame);







 $('home-level').textContent='Level '+playerLevel(profile);







}







const itemTips={shield:'Blocks one mistake, then waits 5 completed turns before using another. Tap again to stop.',freeze:'Twice as much time for 5 rounds. Combines with the board Time Crystal for 4x time. Uses another when it ends. Tap again to stop only this boost.',boost:'5 times the points and coins for 5 rounds. Uses another when it ends. Tap again to stop.',none:'Classic frame. No passive bonus.',gold:'Start each run with four hearts instead of three.',ice:'Every board gives you 10% more time.',blossom:'Double points and gameplay XP in every mode. Combines with the 5x points boost for 10x points. All four shape types stay in play.',cosmic:'Color Rush: every 10 correct picks in a row starts a fresh bonus round with a full timer. Every tile matches your current shape and color and gives double points. Earn the next rush with 10 more correct picks. Bonus tiles do not count; mistakes reset progress. Works on every background.',garden:'Your first five successful-pick stages get 0.2 seconds of extra time.',moon:'Every board gives you 10% more time. Combines with Crystal Halo.',sunset:'10% chance of a special item on eligible Adventure boards; 20% in other modes. Items can heal, protect, slow time or clear tiles. Rewind appears only outside Adventure.'};



let activeItemTip=null;



function hideItemTip(){if(activeItemTip){activeItemTip.tip.hidden=true;activeItemTip.target.setAttribute('aria-expanded','false');activeItemTip=null;}}



function makeTip(target,key,label){



 target.type='button';target.classList.add('item-info');target.setAttribute('aria-label','About '+label);target.setAttribute('aria-expanded','false');



 const tip=document.createElement('span');tip.className='item-tip';tip.id='tip-'+key;tip.textContent=key==='gold'?'Start each run with '+(4+(profile.upgrades.gold||0))+' hearts.':key==='ice'?'Every board gives you '+(10+5*(profile.upgrades.ice||0))+'% more time.':itemTips[key];tip.hidden=true;tip.setAttribute('role','tooltip');target.setAttribute('aria-describedby',tip.id);



 const show=()=>{



  hideItemTip();tip.hidden=false;target.setAttribute('aria-expanded','true');activeItemTip={target,tip};



  const anchor=target.getBoundingClientRect(),box=tip.getBoundingClientRect();



  tip.style.left=Math.max(12,Math.min(innerWidth-box.width-12,anchor.left+anchor.width/2-box.width/2))+'px';



  const above=anchor.top-box.height-10;



  tip.style.top=Math.max(12,Math.min(innerHeight-box.height-12,above>=12?above:anchor.bottom+10))+'px';



 };



 target.onclick=e=>{e.stopPropagation();if(e.pointerType!=='mouse'&&activeItemTip?.target===target)hideItemTip();else show();};



 target.onpointerenter=e=>{if(e.pointerType==='mouse')show();};target.onpointerleave=e=>{if(e.pointerType==='mouse')hideItemTip();};



 target.onfocus=()=>{if(target.matches(':focus-visible'))show();};target.onblur=hideItemTip;



 target.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();hideItemTip();}};



 return tip;



}



$('shop-dialog').addEventListener('close',hideItemTip);



$('shop-dialog').addEventListener('scroll',hideItemTip,true);



window.addEventListener('resize',hideItemTip);



document.addEventListener('click',e=>{if(!e.target.closest('.item-info'))hideItemTip();});



let shopNoticeTimer;



function clearShopNotice(){



 window.ShapeShiftPlatform.clearTimeout(shopNoticeTimer);



 const notice=$('shop-notice');notice.hidden=true;notice.textContent='';



}



function showShopNotice(message){
 analytics.count('blocked',message.includes('coins')?'coins':message.includes('level')?'level':'inventory');



 clearShopNotice();



 const notice=$('shop-notice');notice.textContent=message;notice.hidden=false;



 // Restart the fade when another unavailable item is tapped.



 notice.getAnimations().forEach(animation=>{animation.cancel();animation.play();});



 shopNoticeTimer=window.ShapeShiftPlatform.setTimeout(clearShopNotice,2000);



 uiSound();



}



$('shop-dialog').addEventListener('close',clearShopNotice);



function renderCosmeticShop(){







 for(const kind of ['frame','background']){







 const area=$(kind+'-items');area.replaceChildren();







 const defaults={frame:{id:'none',name:'No frame'},background:{id:'garden',name:'Sunny garden'}};







 for(const item of [{...defaults[kind],kind,price:0,level:1},...COSMETICS.filter(c=>c.kind===kind)]){







 const owned=item.price===0||profile.owned.includes(item.id),equipped=profile.equipped[kind]===item.id,locked=playerLevel(profile)<item.level;







 const card=document.createElement('div');card.className='cosmetic-card';







 const preview=document.createElement('button');preview.className='cosmetic-preview '+kind+'-preview';preview.dataset.cosmetic=item.id;







 if(kind==='frame'){preview.append(avatarElement(getIdentity().avatar));if(item.index!==undefined){const ring=document.createElement('span');ring.className='frame-art frame-'+item.id;preview.append(ring);}}







 const title=document.createElement('strong');title.textContent=item.name;







 const b=document.createElement('button');b.className='shop-buy';shopAction(b,equipped?'Equipped':locked?'Locked':owned?'Equip':'Buy',!owned&&!locked?item.price:undefined);b.disabled=equipped;b.classList.toggle('unavailable',locked||!owned&&profile.coins<item.price);







 b.setAttribute('aria-label',(owned?'Equip ':'Buy ')+item.name+(locked?' â€” requires level '+item.level:''));







 b.onclick=()=>{if(!owned&&playerLevel(profile)<item.level){showShopNotice('Reach level '+item.level+' to unlock this.');return;}if(!owned&&profile.coins<item.price){showShopNotice('Not enough coins.');return;}clearShopNotice();if(!owned){analytics.count('coins_spent',kind,item.price);analytics.count('purchases',item.id);}profile=owned?equipCosmetic(profile,kind,item.id):buyCosmetic(profile,item.id);saveProfile();applyCosmetics();shop();sound(owned?'click':'purchase');$('shop-message').textContent=item.name+' equipped.';};







 const info=document.createElement('small');info.textContent=locked?'Level '+item.level:owned?'Owned':'';const tip=makeTip(preview,item.id,item.name);card.append(preview,title,tip,info);



 let upgradeButton=null;



 if(FRAME_UPGRADES[item.id]){



  const perk=document.createElement('small');perk.className='upgrade-benefit';perk.textContent=item.id==='gold'?(4+(profile.upgrades.gold||0))+' hearts':(10+5*(profile.upgrades.ice||0))+'% more time';card.append(perk);



  if(owned){



   const next=nextFrameUpgrade(profile,item.id),upgrade=document.createElement('button');upgrade.className='shop-buy frame-upgrade';



   if(!next){upgrade.textContent=item.id==='ice'?'Level 3 Â· Max':'Max upgrade';upgrade.disabled=true;}



   else{



    const gated=playerLevel(profile)<next.level;



    const benefit=document.createElement('small');benefit.textContent='Next: '+next.benefit+' Â· Lv '+next.level;card.append(benefit);



    shopAction(upgrade,gated?'Locked':'Upgrade',gated?undefined:next.price);upgrade.classList.toggle('unavailable',gated||profile.coins<next.price);upgrade.setAttribute('aria-label','Upgrade '+item.name+' to '+next.benefit);



    upgrade.onclick=()=>{



     const offer=nextFrameUpgrade(profile,item.id);if(!offer)return;



     if(playerLevel(profile)<offer.level){showShopNotice('Reach level '+offer.level+' to upgrade this.');return;}



     if(profile.coins<offer.price){showShopNotice('Not enough coins.');return;}



     const updated=upgradeFrame(profile,item.id);if(updated===profile)return;analytics.count('coins_spent','upgrade',offer.price);analytics.count('purchases',item.id+'-upgrade');



     profile=updated;saveProfile();flushProfile();clearShopNotice();shop();uiSound('purchase');$('shop-message').textContent=item.name+' upgraded: '+offer.benefit+'.';



    };



   }



   upgradeButton=next?upgrade:null;



  }



 }



 card.append(b);if(upgradeButton)card.append(upgradeButton);



 area.append(card);







 }







 }







}







function renderSkinShop(){
 const area=$('skin-items');area.replaceChildren();
 for(const skin of SHAPE_SKINS){
  const owned=profile.ownedSkins.includes(skin.id),equipped=profile.equipped.skin===skin.id,locked=!skinUnlocked(profile,skin.id);
  const card=document.createElement('article');card.className='cosmetic-card skin-card'+(locked?' locked':'');
  const preview=document.createElement('div');preview.className='skin-preview';
  for(let shape=0;shape<4;shape++)preview.append(skinCanvas({shape,color:shape},skin.id));
  const name=document.createElement('strong');name.textContent=skin.name;
  const info=document.createElement('small');info.textContent=skin.id==='classic'?'Original shapes':locked?'Unlocks at level '+skin.level:'All shapes Â· All colors';
  const button=document.createElement('button');button.className='shop-buy';shopAction(button,equipped?'Equipped':owned?'Equip':locked?'Level '+skin.level:'Buy',!owned&&!locked?skin.price:undefined);button.disabled=equipped;button.setAttribute('aria-disabled',String(equipped||locked));
  button.classList.toggle('unavailable',locked||!owned&&profile.coins<skin.price);
  button.setAttribute('aria-label',equipped?skin.name+' equipped':owned?'Equip '+skin.name:locked?skin.name+' unlocks at level '+skin.level:'Buy '+skin.name+' for '+skin.price+' coins');
  button.onclick=()=>{
   if(!skinUnlocked(profile,skin.id)){showShopNotice('Reach player level '+skin.level+' to unlock '+skin.name+'.');return;}
   if(!skinIsReady(skin.id)){showShopNotice('Skin artwork is loading. Try again in a moment.');return;}
   const alreadyOwned=profile.ownedSkins.includes(skin.id);
   if(!alreadyOwned&&profile.coins<skin.price){showShopNotice('Not enough coins.');return;}
   const next=alreadyOwned?equipSkin(profile,skin.id):buySkin(profile,skin.id);if(next===profile)return;
   profile=next;saveProfile();flushProfile();applyCosmetics();sound(alreadyOwned?'click':'purchase');shop();$('shop-message').textContent=skin.name+' equipped for every game.';
  };
  card.append(preview,name,info,button);area.append(card);
 }
}

function shopAction(button,label,price){
 button.replaceChildren();
 const text=document.createElement('span');text.textContent=label;button.append(text);
 if(price!==undefined){const cost=document.createElement('span');cost.className='shop-action-price';cost.append(document.createTextNode(String(price)+' '));const coin=document.createElement('img');coin.src='assets/coin-v10.webp';coin.alt='coins';cost.append(coin);button.append(cost);}
}
function shop(){
 syncAdventureBoosts();



 hideItemTip();







 $('shop-wallet').textContent=profile.coins;renderSkinShop();renderCosmeticShop();$('shop-items').replaceChildren();







 for(const [name,label,description,art] of [['shield','Shield','One hit, then 5 turns to recharge.','shield'],['freeze','Ã—2 time','Twice as much time for 5 rounds.','time'],['boost','Ã—5 rewards','5 times the points and coins for 5 rounds.','boost']]){







  const row=document.createElement('div');row.className='shop-item';







  const icon=document.createElement('button');icon.className='power-art '+(art==='boost'?'boost-art':'');icon.dataset.ability=name;icon.style.setProperty('--power',art==='shield'?2:0);







  const copy=document.createElement('div');const title=document.createElement('strong');title.textContent=label;const desc=document.createElement('small');desc.textContent=description;const owned=document.createElement('small');owned.textContent='Owned: '+profile.inventory[name];const tip=makeTip(icon,name,label);copy.append(title,owned,tip);







  const price=boostPrice(profile,name);const button=document.createElement('button');button.className='shop-buy';shopAction(button,boostUnlocked(profile,name)?'Buy':'Locked',boostUnlocked(profile,name)?price:undefined);button.setAttribute('aria-label',boostUnlocked(profile,name)?'Buy '+label+' for '+price+' coins':label+' â€” unlocks after Adventure level '+BOOST_UNLOCK_LEVELS[name]);if(!boostUnlocked(profile,name))owned.textContent='Finish Adventure '+BOOST_UNLOCK_LEVELS[name];button.classList.toggle('unavailable',profile.coins<price||profile.inventory[name]>=999);







  button.dataset.repeatBuy=name;
  button.onclick=()=>{if(!boostUnlocked(profile,name)){showShopNotice('Finish Adventure level '+BOOST_UNLOCK_LEVELS[name]+' to unlock '+label+'.');return false;}if(profile.inventory[name]>=999){showShopNotice('Your inventory is full.');return false;}if(profile.coins<boostPrice(profile,name)){showShopNotice('Not enough coins.');return false;}const result=buy(profile,name);if(result===profile)return false;analytics.count('coins_spent','boost',profile.coins-result.coins);analytics.count('purchases',name);clearShopNotice();profile=result;saveProfile();$('shop-message').textContent=label+' added to your inventory.';sound('purchase');shop();return true;};row.append(icon,copy,button);$('shop-items').append(row);







 }







}







let rankingsRequest=0;



let lastRankingsSnapshot=null;
function renderPersonalRanking(entries=[],cached=false){
 const dialog=$('leaderboard-dialog'),summary=personalRanking(entries,endlessBests()),identity=getIdentity();
 let footer=$('leaderboard-personal');
 if(!footer){footer=document.createElement('button');footer.id='leaderboard-personal';footer.type='button';footer.className='personal-score-row';dialog.querySelector('.dialog-content').append(footer);}
 const rank=document.createElement('strong');rank.className='rank-number';rank.textContent=summary.rank===null?'â€”':String(summary.rank);
 const copy=document.createElement('span');copy.className='personal-rank-copy';
 const name=document.createElement('strong');name.className='personal-rank-name';name.textContent=identity.name;
 const hint=document.createElement('small');hint.textContent=summary.listed?(cached?'Last loaded ranking':'Your ranking'):'Personal best Â· rank unavailable';copy.append(name,hint);
 const score=document.createElement('b');score.className='rank-score';score.textContent=summary.score;
 footer.replaceChildren(rank,leaderboardAvatar(identity),copy,score);footer.disabled=!summary.listed;footer.hidden=summary.listed&&summary.rank<=3;
 footer.setAttribute('aria-label',summary.listed?'Your rank '+summary.rank+', '+identity.name+', '+summary.score+' points. Jump to your entry.':identity.name+', personal best '+summary.score+' points. Global rank unavailable.');
 footer.onclick=()=>{
  const row=$('leaderboard-rows').querySelector('.rank-you');if(!row)return;
  row.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  row.focus({preventScroll:true});
 };
}

async function rankings(silent=false){




 const request=++rankingsRequest;



 if(!silent&&!lastRankingsSnapshot)$('leaderboard-status').textContent='Loading rankingsâ€¦';



 try{



  if(leaderboardAllowed())flushScores().catch(()=>{});



  const [data,playerId]=await Promise.all([loadLeaderboard(),leaderboardAllowed()?currentPlayerId():Promise.resolve(null)]);



  if(request!==rankingsRequest)return;



  const entries=identifyLeaderboardEntries(data.entries,playerId,getIdentity());




  $('leaderboard-reload').hidden=!data.cached;
  $('leaderboard-status').textContent=data.cached?'Offline rankings':entries.length?'':'No scores yet.';



  renderPersonalRanking(entries,Boolean(data.cached));
  const snapshot=JSON.stringify(entries);
  if(snapshot===lastRankingsSnapshot)return;
  lastRankingsSnapshot=snapshot;
  $('leaderboard-rows').replaceChildren();
  for(const [i,row] of entries.entries()){



   const line=document.createElement('div');line.className='rank-card'+(row.isYou?' rank-you':'');if(row.isYou)line.tabIndex=-1;



   const rank=document.createElement('strong');rank.className='rank-number';rank.textContent=i+1;



   const copy=document.createElement('div');const name=document.createElement('strong');name.textContent=row.name;copy.append(name);



   if(row.isYou){line.tabIndex=-1;line.setAttribute('aria-label','Rank '+(i+1)+', '+row.name+', '+row.score+' points');}



   const score=document.createElement('b');score.className='rank-score';score.textContent=row.score;



   line.append(rank,leaderboardAvatar(row),copy,score);$('leaderboard-rows').append(line);



  }



 }catch(error){if(request===rankingsRequest){$('leaderboard-status').textContent=rankingLoadMessage(error,Boolean(lastRankingsSnapshot));$('leaderboard-reload').hidden=false;}}



}








enableHoldBuying($('shop-dialog'));
function resetShopView(){for(const tab of document.querySelectorAll('[data-shop-tab]')){const first=tab.dataset.shopTab==='shop-items';tab.setAttribute('aria-selected',String(first));$(tab.dataset.shopTab).hidden=!first;$(tab.dataset.shopTab).scrollTop=0;}$('shop-dialog').querySelector('.dialog-content').scrollTop=0;}
$('shop-open').onclick=()=>{resetShopView();analytics.count('shop',({ 'shop-items':'boosts','skin-items':'skins','frame-items':'frames','background-items':'worlds'})[document.querySelector('[data-shop-tab][aria-selected="true"]')?.dataset.shopTab]||'boosts');shop();$('shop-dialog').showModal();};







$('leaderboard-open').onclick=()=>{
 const dialog=$('leaderboard-dialog');renderPersonalRanking();dialog.showModal();
 // Reset after showModal so restored focus cannot keep the old scroll position.
 for(const pane of [dialog,dialog.querySelector('.dialog-content'),$('leaderboard-rows')])pane.scrollTo({top:0,left:0,behavior:'instant'});
 rankings();
};$('leaderboard-reload').onclick=()=>rankings();
$('leaderboard-reload').hidden=true;$('leaderboard-reload').textContent='Retry';
window.ShapeShiftPlatform.setInterval(()=>{if(!window.ShapeShiftPlatform.paused&&$('leaderboard-dialog').open)rankings(true);},30000);
document.addEventListener('unused-visibilitychange',()=>{if(!window.ShapeShiftPlatform.paused&&$('leaderboard-dialog').open)rankings(true);});







window.addEventListener('storage',e=>{if(e.key==='shape-shift-profile-v1'){profile=normalizeProfile(store.get('shape-shift-profile-v1',freshProfile()));$('wallet').textContent=profile.coins;if($('shop-dialog').open)shop();}});







saveProfile();flushScores();applyPrefs();screen('home');renderHomeIdentity();







const shapePreload=new Image();shapePreload.src='assets/shapes-v2.webp';







if(window.ShapeShiftAds)audio()?.start();







document.addEventListener('pointerdown',()=>audio()?.start(),{passive:true});
document.addEventListener('keydown',()=>audio()?.start(),{capture:true});







$('app').addEventListener('click',e=>{if($('app').dataset.screen==='home'&&!e.target.closest('button,a,input,label,dialog'))uiSound('surface-tap');});







for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target.closest('button,input,label,a,select,textarea'))return;const r=dialog.getBoundingClientRect();const outside=e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;if(dialog.id==='tutorial-dialog'||dialog.id==='age-dialog'||dialog.id==='boost-lesson-dialog')return;if(dialog.id==='over-dialog'){dismissRunScreen();return;}if(outside){if(dialog.id==='coins-ad-dialog'&&coinRewardPending)return;uiSound('close');if(dialog.id==='pause-dialog')resume();else dialog.close();}});







let draftAvatar,draftCosmetics;







function renderProfileCosmetics(){
 renderProfileSkins();



 for(const kind of ['frame','background']){



  const area=$(kind==='frame'?'profile-frames':'profile-backgrounds');area.replaceChildren();



  const base=kind==='frame'?{id:'none',name:'No frame',price:0}:{id:'garden',name:'Sunny garden',price:0};



  for(const item of [base,...COSMETICS.filter(c=>c.kind===kind)]){



   const owned=!item.price||profile.owned.includes(item.id),selected=draftCosmetics?.[kind]===item.id;



   const button=document.createElement('button');button.type='button';button.className='profile-cosmetic'+(owned?'':' locked');button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-label',item.name+(owned?'':' â€” locked'));



   if(kind==='frame')button.append(avatarElement(draftAvatar,undefined,item.id));



   else{const art=document.createElement('span');art.className='background-preview';art.dataset.cosmetic=item.id;button.append(art);}



   const name=document.createElement('strong');name.textContent=item.name;const status=document.createElement('small');status.textContent=!owned?'Locked':(selected?'Selected':'Owned')+(item.id==='ice'?' Â· Level '+(1+(profile.upgrades.ice||0))+' of 3':'');button.append(name,status);



   button.onclick=()=>{



    if(!owned){showProfileNotice(playerLevel(profile)<item.level?'Locked Â· Reach level '+item.level+' to unlock '+item.name+'.':'Locked Â· Buy '+item.name+' in the shop.');return;}



    draftCosmetics[kind]=item.id;profile=equipCosmetic(profile,kind,item.id);saveProfile();flushProfile();applyCosmetics();$('profile-lock-message').textContent='';previewAvatar();renderProfileCosmetics();showProfileNotice(item.name+' equipped.');



   };area.append(button);



  }



 }



}



function renderProfileSkins(){
 const area=$('profile-skins');area.replaceChildren();
 for(const skin of SHAPE_SKINS){
  const owned=profile.ownedSkins.includes(skin.id),selected=profile.equipped.skin===skin.id,levelLocked=!skinUnlocked(profile,skin.id);
  const button=document.createElement('button');button.type='button';button.className='profile-cosmetic profile-skin'+(owned?'':' locked');
  button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-label',skin.name+' skin'+(owned?'':' â€” locked'));
  const preview=document.createElement('span');preview.className='skin-preview';
  for(let shape=0;shape<4;shape++)preview.append(skinCanvas({shape,color:shape},skin.id));
  const name=document.createElement('strong');name.textContent=skin.name;
  const status=document.createElement('small');status.textContent=selected?'Selected':owned?'Owned':levelLocked?'Unlocks at level '+skin.level:'Buy in shop Â· '+skin.price+' coins';
  button.append(preview,name,status);
  button.onclick=()=>{
   if(levelLocked){showProfileNotice('Reach player level '+skin.level+' to unlock '+skin.name+'.');return;}
   if(!owned){showProfileNotice('Buy '+skin.name+' in the shop for '+skin.price+' coins.');return;}
   if(!skinIsReady(skin.id)){showProfileNotice('Skin artwork is loading. Try again in a moment.');return;}
   const next=equipSkin(profile,skin.id);if(next===profile)return;
   profile=next;draftCosmetics.skin=skin.id;saveProfile();flushProfile();applyCosmetics();renderProfileSkins();showProfileNotice(skin.name+' equipped for every game.');
  };
  area.append(button);
 }
}

$('profile-shop').onclick=()=>{clearProfileNotice();resetShopView();shop();$('shop-dialog').showModal();};



$('shop-dialog').addEventListener('close',()=>{if($('profile-dialog').open){renderProfileCosmetics();previewAvatar();}});







let profileNoticeAnimation=null,profileNameNoticeTimer=null;
function clearProfileNotice(){
 window.ShapeShiftPlatform.clearTimeout(profileNameNoticeTimer);profileNoticeAnimation?.cancel();profileNoticeAnimation=null;
 const notice=$('profile-notice');if(notice.matches(':popover-open'))notice.hidePopover();notice.textContent='';
}
function showProfileNotice(message){
 clearProfileNotice();if(!$('profile-dialog').open||!message)return;
 const notice=$('profile-notice');notice.textContent=message;notice.showPopover();
 const animation=notice.animate([
  {opacity:0,transform:'translate(-50%,24px)',offset:0},
  {opacity:1,transform:'translate(-50%,0)',offset:.14},
  {opacity:1,transform:'translate(-50%,-10px)',offset:.72},
  {opacity:0,transform:'translate(-50%,-36px)',offset:1}
 ],{duration:2400,easing:'ease-out',fill:'both'});
 profileNoticeAnimation=animation;animation.finished.then(()=>{if(profileNoticeAnimation===animation)clearProfileNotice();},()=>{});
}
$('profile-dialog').addEventListener('close',clearProfileNotice);

function previewAvatar(){for(const b of $('avatar-presets').querySelectorAll('[data-avatar]')){const owned=profile.ownedAvatars.includes(+b.dataset.avatar);b.classList.toggle('avatar-locked',!owned);b.setAttribute('aria-label',AVATARS[+b.dataset.avatar].name+' avatar'+(owned?'':' â€” locked'));}$('profile-preview').replaceChildren(avatarElement(draftAvatar,undefined,draftCosmetics?.frame||profile.equipped.frame));for(const b of $('avatar-presets').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.avatar!==undefined&&+b.dataset.avatar===draftAvatar));}







$('profile-open').onclick=()=>{const me=getIdentity();draftAvatar=me.avatar;draftCosmetics={...profile.equipped};$('profile-lock-message').textContent='';renderProfileCosmetics();$('profile-name').value=me.name;$('profile-message').textContent='';previewAvatar();$('profile-dialog').showModal();};







for(let i=0;i<6;i++){const b=document.createElement('button');b.type='button';b.dataset.avatar=i;b.setAttribute('aria-label',['Fox','Penguin','Cat','Frog','Dragon','Bear'][i]+' avatar');b.append(avatarElement(i));b.onclick=()=>{if(!profile.ownedAvatars.includes(i)){const a=AVATARS[i];showProfileNotice('Reach level '+a.level+' to unlock '+a.name+' for free.');return;}draftAvatar=i;$('profile-lock-message').textContent='';autoSaveIdentity();previewAvatar();renderProfileCosmetics();};$('avatar-presets').append(b);}







$('avatar-presets').append($('choose-photo'));







$('random-name').onclick=()=>{$('profile-name').value=randomName();autoSaveIdentity();};







$('choose-photo').onclick=()=>{if(onlineAllowed())$('profile-photo').click();};







$('profile-photo').onchange=async e=>{if(!onlineAllowed()||!e.target.files[0])return;try{draftAvatar=await readPhoto(e.target.files[0]);autoSaveIdentity();previewAvatar();renderProfileCosmetics();}catch(error){showProfileNotice(error.message);}e.target.value='';};







let identitySyncTimer;



function autoSaveIdentity(){



 const name=cleanName($('profile-name').value),previous=getIdentity();



 try{



  // An unfinished name must not prevent saving an avatar selection.



  saveIdentity(name.length>=2?name:previous.name,draftAvatar);



  if(name.length<2)showProfileNotice('Use at least two characters. Your previous name is kept.');
  else if(draftAvatar!==previous.avatar)showProfileNotice('Avatar updated.');
  else if(name!==previous.name){window.ShapeShiftPlatform.clearTimeout(profileNameNoticeTimer);profileNameNoticeTimer=window.ShapeShiftPlatform.setTimeout(()=>showProfileNotice('Name changed.'),650);}



  window.ShapeShiftPlatform.clearTimeout(identitySyncTimer);identitySyncTimer=window.ShapeShiftPlatform.setTimeout(()=>syncIdentity().catch(()=>{}),500);



 }catch(error){draftAvatar=previous.avatar;showProfileNotice(error.message);}



}



$('profile-name').addEventListener('input',e=>{if(!e.isComposing)autoSaveIdentity();});



$('profile-name').addEventListener('compositionend',autoSaveIdentity);



$('profile-name').addEventListener('change',()=>{autoSaveIdentity();$('profile-name').value=getIdentity().name;});



$('profile-dialog').addEventListener('close',()=>{window.ShapeShiftPlatform.clearTimeout(identitySyncTimer);syncIdentity().catch(()=>{});});


















syncIdentity().catch(()=>{});











// Menu-only sounds: gameplay and purchases already have their own specific cues.



document.addEventListener('click',event=>{



 const control=event.target.closest('button,a,input[type="checkbox"]');



 if(!control||control.disabled||control.matches('#play,.choice,.power,.shop-buy,.quest-collect,#quests-collect-all,.level-node'))return;



 const cues={'quit':'leave-result','copy-player-id':'click','home-level':'info','coin-help-open':'info','achievements-open':'menu-achievements','quests-open':'menu-quests','pause-quests':'menu-quests','shop-open':'menu-shop','profile-shop':'menu-shop','leaderboard-open':'menu-ranks','leaderboard-reload':'menu-ranks','settings-open':'menu-settings','pause-settings':'menu-settings','profile-open':'menu-profile','coins-ad-open':'menu-reward','random-name':'randomize','choose-photo':'avatar'};



 const cue=cues[control.id]||(control.matches('[data-close]')?'close':control.closest('#avatar-presets')||control.matches('.profile-cosmetic')?'avatar':control.matches('.item-info')?'info':control.matches('input[type="checkbox"]')?'toggle':'click');



 uiSound(cue);



},true);







function trackQuestProgress(before,event){before={...before,questUnlocks:{bests:endlessBests()}};const next=trackQuests(before,event);if(newlyCompletedQuests(before,next).length){for(const q of newlyCompletedQuests(before,next))analytics.count('quests',q.type);uiSound('quest-complete');showQuestCompletion();}return next;}



let questNoticeTimer;



function showQuestCompletion(){



 const notice=$('quest-notice');notice.hidden=false;notice.classList.remove('quest-notice-enter');void notice.offsetWidth;notice.classList.add('quest-notice-enter');



 window.ShapeShiftPlatform.clearTimeout(questNoticeTimer);questNoticeTimer=window.ShapeShiftPlatform.setTimeout(()=>{notice.hidden=true;},2400);



 const badge=$('quest-badge');badge.classList.remove('quest-badge-pop');void badge.offsetWidth;badge.classList.add('quest-badge-pop');



}



let questTab='daily',questClaiming=false,questRenderVersion=0;
function showQuestCollectAll(){return questList(profile,questTab).length===3&&canClaimAllQuests(profile,questTab);}
function updateQuestBadge(){
 const ready=[...profile.quests,...(profile.dailyQuests||[])].filter(q=>!q.claimed&&q.progress>=q.target).length;
 $('quest-badge').hidden=!ready;$('quest-badge').textContent=ready;
 $('quests-collect-all').hidden=false;
 $('quests-collect-all').disabled=questClaiming||!questList(profile,questTab).some(q=>!q.claimed&&q.progress>=q.target);
 const allLabel=document.createElement('span');allLabel.textContent='Collect all';
 const allReward=questList(profile,questTab).filter(q=>!q.claimed&&q.progress>=q.target).reduce((sum,q)=>sum+q.reward,0);
 $('quests-collect-all').replaceChildren(allLabel,...(allReward?[questRewardLabel(allReward)]:[]));
 $('quests-collect-all').setAttribute('aria-label','Collect all '+allReward+' coins');
 for(const tab of ['daily','normal']){
  const button=$('quests-'+tab+'-tab'),count=questList(profile,tab).filter(q=>!q.claimed&&q.progress>=q.target).length;
  let dot=button.querySelector('.quest-tab-dot');if(!dot){dot=document.createElement('span');dot.className='quest-tab-dot';dot.setAttribute('aria-hidden','true');button.append(dot);}
  dot.hidden=!count;button.setAttribute('aria-label',(tab==='daily'?'Daily':'Task')+(count?', '+count+' rewards ready':''));
 }
}
function renderQuests(){
 questRenderVersion++;profile=ensureQuests({...profile,questUnlocks:{bests:endlessBests()}});saveProfile();
 if(profile.normalClaimed.length>=NORMAL_QUEST_TOTAL)questTab='daily';
 $('quests-normal-tab').hidden=profile.normalClaimed.length>=NORMAL_QUEST_TOTAL;
 for(const tab of ['daily','normal'])$('quests-'+tab+'-tab').setAttribute('aria-selected',String(questTab===tab));
 const list=$('quest-list'),quests=[...questList(profile,questTab)].sort((a,b)=>Number(b.progress>=b.target)-Number(a.progress>=a.target)||(b.progress/b.target)-(a.progress/a.target)),empty=questTab==='daily'&&!quests.length;
 list.setAttribute('aria-labelledby','quests-'+questTab+'-tab');list.classList.toggle('daily-cleared',empty);
 updateQuestBadge();list.replaceChildren();
 const batch=showQuestCollectAll();
 for(const q of quests)list.append(createQuestCard(q,batch));
 if(questTab==='normal'&&!quests.length){const note=document.createElement('p');note.className='daily-quest-empty';note.textContent='More challenges unlock as you level up and open new modes.';list.append(note);}
 if(empty){
  const done=document.createElement('div');done.className='daily-quest-empty';
  const title=document.createElement('h3');title.textContent='Daily quests complete!';
  const copy=document.createElement('p');copy.textContent='New quests in';
  const clock=document.createElement('strong');clock.id='daily-quest-countdown';clock.setAttribute('role','timer');clock.setAttribute('aria-label','Time until new daily quests');
  const note=document.createElement('p');note.textContent='All rewards collected. See you next round!';
  done.append(title,copy,clock,note);list.append(done);
 }
 updateQuestClock();
}
function updateQuestClock(){
 if(questClaiming)return;
 const left=Math.max(0,Math.ceil((profile.dailyResetAt-Date.now())/1000));
 const time=String(Math.floor(left/3600)).padStart(2,'0')+':'+String(Math.floor(left/60)%60).padStart(2,'0')+':'+String(left%60).padStart(2,'0');
 $('quest-cycle-status').hidden=questTab==='daily'&&!questList(profile,'daily').length;
 $('quest-cycle-status').textContent=questTab==='normal'?profile.normalClaimed.length+' / 400 completed':'Refreshes in '+time;
 if($('daily-quest-countdown'))$('daily-quest-countdown').textContent=time;
}
for(const tab of ['daily','normal'])$('quests-'+tab+'-tab').onclick=()=>{questTab=tab;renderQuests();};
window.ShapeShiftPlatform.setInterval(()=>{if(Date.now()>=profile.dailyResetAt){profile=ensureQuests(profile);saveProfile();updateQuestBadge();if($('quests-dialog').open)renderQuests();}else if($('quests-dialog').open)updateQuestClock();},1000);

function questRewardLabel(value){
 const reward=document.createElement('span');reward.className='quest-reward';
 const coin=document.createElement('img');coin.src='assets/coin-v10.webp';coin.alt='coins';
 const amount=document.createElement('strong');amount.textContent=value;reward.append(coin,amount);return reward;
}
function createQuestCard(q,batch=false){
 const complete=q.progress>=q.target,card=document.createElement('article');card.className='quest-card'+(complete?' complete':'');card.dataset.questId=q.id;card.tabIndex=-1;
 const title=document.createElement('h3');title.textContent=q.type==='wear'?'Get 5 correct picks in a run with '+q.title.replace('Play a run with ',''):q.title.replace('circle shapes','circles').replace('triangle shapes','triangles').replace('square shapes','squares').replace('star shapes','stars');
 const progress=document.createElement('div');progress.className='quest-progress';progress.setAttribute('role','progressbar');progress.setAttribute('aria-label',title.textContent);progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax',q.target);progress.setAttribute('aria-valuenow',q.progress);
 const fill=document.createElement('span');fill.className='quest-progress-fill';fill.style.width=(q.progress/q.target*100)+'%';
 const count=document.createElement('strong');count.textContent=q.progress+' / '+q.target;progress.append(fill,count);
 const reward=questRewardLabel(q.reward);
 const footer=document.createElement('div');footer.className='quest-footer';
 footer.append(reward);
 if(complete){const status=document.createElement('span');status.className='quest-completed-label';status.textContent='Completed';footer.append(status);}
 card.append(title);
 if(q.type==='journey'){const description=document.createElement('p');description.className='quest-objectives';description.textContent=q.description;card.append(description);}
 if(q.type==='challenge'){
  const objectives=document.createElement('ul');objectives.className='quest-objectives';
  for(const part of q.parts){const row=document.createElement('li');row.classList.toggle('done',part.progress>=part.target);row.textContent=part.text+' ('+part.progress+' / '+part.target+')';objectives.append(row);}
  card.append(objectives);
 }
 card.append(progress,footer);return card;
}
async function collectQuestRewards(quests,next,source,all){
 if(questClaiming||next===profile)return;
 const list=$('quest-list'),version=questRenderVersion,claimedTab=questTab;
 const cards=quests.map(q=>[...list.children].find(c=>c.dataset.questId===q.id)).filter(Boolean);
 const reward=next.coins-profile.coins,oldBalance=profile.coins-pendingWalletCoins;
 const rewards=quests.map(q=>{const card=cards.find(c=>c.dataset.questId===q.id),rect=card.querySelector('.quest-reward').getBoundingClientRect();return {amount:q.reward,source:{getBoundingClientRect:()=>rect}};});
 const origin=source.getBoundingClientRect();
 try{window.ShapeShiftPlatform.storage.setItem('shape-shift-profile-v1',JSON.stringify(next));}
 catch{let message=$('quest-save-error');if(!message){message=document.createElement('p');message.id='quest-save-error';message.setAttribute('role','alert');$('quest-cycle-status').after(message);}message.textContent='Could not save rewards. Please try again.';return;}
 $('quest-save-error')?.remove();questClaiming=true;pendingWalletCoins+=reward;profile=next;saveProfile();flushProfile();updateQuestBadge();
 analytics.count('claims',all?'all':'single',quests.length);analytics.count('coins_earned','quest',reward);
 for(const card of cards){const status=card.querySelector('.quest-completed-label');if(status)status.textContent='Collected!';trackAchievements({type:'quest'});}
 const reduced=prefs.motion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 let delivered=0;
 showQuestReward({getBoundingClientRect:()=>origin},$('coin-help-open'),reward,oldBalance,reduced,{rewards,onCollect:()=>uiSound('quest-collect'),onArrive:amount=>{delivered+=amount;pendingWalletCoins=Math.max(0,pendingWalletCoins-amount);saveProfile();uiSound('quest-wallet');}}).catch(()=>{}).finally(()=>{pendingWalletCoins=Math.max(0,pendingWalletCoins-(reward-delivered));saveProfile();});
 try{
  await animateQuestRedemption(cards,{reduced,sound:uiSound});
 }finally{
  const sameList=questRenderVersion===version&&questTab===claimedTab;
  const previous=new Map(sameList?[...list.querySelectorAll('.quest-card')].map(c=>[c.dataset.questId,c.getBoundingClientRect().top]):[]);
  questClaiming=false;renderQuests();
  if(sameList&&!reduced)for(const card of list.querySelectorAll('.quest-card')){
   const from=previous.get(card.dataset.questId);if(from===undefined)continue;
   const delta=from-card.getBoundingClientRect().top;
   if(delta)card.animate([{transform:'translateY('+delta+'px)'},{transform:'translateY(0)'}],{duration:340,easing:'cubic-bezier(.2,.8,.2,1)'});
  }
  if(sameList&&$('quests-dialog').open)(list.querySelector('.quest-card')||$('quests-daily-tab')).focus({preventScroll:true});
 }
}
$('quests-collect-all').onclick=()=>{const ready=questList(profile,questTab).filter(q=>!q.claimed&&q.progress>=q.target);collectQuestRewards(ready,ready.reduce((next,q)=>claimQuest(next,q.id),profile),$('quests-collect-all'),true);};

$('quests-open').onclick=()=>{questTab='daily';$('quest-list').scrollTop=0;renderQuests();$('quests-dialog').showModal();};
$('pause-quests').onclick=()=>{
 if(runMode!=='adventure'){renderQuests();$('quests-dialog').showModal();return;}
 const stats=currentLevelStats();$('level-tasks-title').textContent='Level '+adventureLevel;
 $('level-task-list').innerHTML='<h3 class="collection-heading">Collect to win</h3><div id="paused-level-requirements"></div><h3 class="star-tasks-heading">Star tasks</h3>'+levelTaskStatus(adventureLevel,stats).map(t=>'<div class="level-task-card '+t.state+'"><strong>'+t.label+'</strong><span>'+t.value+'</span><progress max="1" value="'+t.progress+'" aria-label="'+t.label+'"></progress></div>').join('');
 renderLevelRequirements($('paused-level-requirements'),adventureLevel,stats,sprite);$('level-tasks-dialog').showModal();
};
$('tasks-resume').onclick=()=>{$('level-tasks-dialog').close();resume();};



updateQuestBadge();







let lessonIndex=0,tutorialStartsRun=false,tutorialReturnPaused=false,tutorialCompletion=null,tutorialFromSettings=false;
const tutorialClose=document.createElement('button');tutorialClose.id='tutorial-close';tutorialClose.className='close';tutorialClose.setAttribute('aria-label','Close how to play');tutorialClose.innerHTML='<img src="assets/close-v45.webp" alt="" aria-hidden="true">';tutorialClose.onclick=()=>{uiSound('close');closeTutorialReplay();};



function openTutorial(startRun=false,fromSettings=false){
 lessonIndex=0;tutorialStartsRun=startRun;tutorialReturnPaused=paused;tutorialFromSettings=fromSettings;
 const dialog=$('tutorial-dialog');dialog.dataset.replay=String(fromSettings);dialog.setAttribute('aria-labelledby','tutorial-title');
 if(fromSettings)dialog.prepend(tutorialClose);else tutorialClose.remove();
 closeDialogs();renderLesson();dialog.showModal();audio()?.start();
}
function closeTutorialReplay(){
 if(!tutorialFromSettings)return;
 tutorialFromSettings=false;$('tutorial-dialog').close();tutorialClose.remove();
 if(tutorialReturnPaused&&!$('pause-dialog').open)$('pause-dialog').showModal();
 openSettings();$('how-to-play-open').focus({preventScroll:true});
}



function renderLesson(){



 const done=lessonIndex>=LESSONS.length;$('tutorial-board').replaceChildren();$('tutorial-note').textContent='';$('tutorial-step').textContent=done?'Ready to play':('Practice '+(lessonIndex+1)+' / '+LESSONS.length);



 $('tutorial-current').hidden=done;$('tutorial-board').hidden=done;$('tutorial-dialog').classList.toggle('tutorial-ready',done);$('tutorial-next').hidden=!done&&LESSONS[lessonIndex].answer!==null;



 if(done){$('tutorial-title').textContent='You have got it!';$('tutorial-copy').textContent='Match the shape OR color. Every correct pick earns 1 score and 1 coin. A wrong pick or missed available match costs a life. Lost lives stay lost. Watch the timer, and try your quests!';$('tutorial-next').textContent=tutorialStartsRun?'Start my run':'Done';return;}



 const lesson=LESSONS[lessonIndex];$('tutorial-title').textContent=lesson.title;$('tutorial-copy').textContent=lesson.copy;$('tutorial-next').textContent='Let this board pass';



 const current=document.createElement('div');current.className='sprite';sprite(current,lesson.current);const name=document.createElement('strong');name.textContent='You are: '+tileName(lesson.current);$('tutorial-current').replaceChildren(current,name);



 lesson.choices.forEach((tile,index)=>{const b=document.createElement('button');b.className='choice tutorial-choice';b.setAttribute('aria-label',tileName(tile));const art=document.createElement('div');art.className='sprite';sprite(art,tile);b.append(art);if(index===lesson.answer){b.classList.add('tutorial-target');const hand=document.createElement('img');hand.className='tutorial-hand';hand.src='assets/ability-hand-v169.webp';hand.alt='';hand.setAttribute('aria-hidden','true');hand.style.setProperty('--hand-angle','-90deg');hand.style.setProperty('--hand-left',index===0?'38%':'50%');b.append(hand);}b.onclick=()=>{if(index!==lesson.answer){uiSound('wrong');$('tutorial-note').textContent='That matches neither. No life lost in practice. Try the highlighted choice.';if(lesson.answer===null)$('tutorial-note').textContent='Neither matches. Use Let this board pass instead.';return;}uiSound('correct');lessonIndex++;renderLesson();};$('tutorial-board').append(b);});



}



$('tutorial-next').onclick=()=>{if(lessonIndex<LESSONS.length){lessonIndex++;renderLesson();return;}if(tutorialFromSettings){closeTutorialReplay();return;}store.set(TUTORIAL_KEY,true);firstEndless.complete();$('tutorial-dialog').close();if(tutorialStartsRun){const complete=tutorialCompletion;tutorialCompletion=null;complete?.(true);}else if(tutorialReturnPaused)$('pause-dialog').showModal();};



$('tutorial-dialog').addEventListener('cancel',e=>{e.preventDefault();closeTutorialReplay();});
$('tutorial-dialog').addEventListener('keydown',event=>{
 if(!tutorialFromSettings||event.code!=='Escape'||event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.isComposing)return;
 event.preventDefault();event.stopPropagation();closeTutorialReplay();
});

$('privacy-policy-open').onclick=()=>{$('privacy-policy-dialog').showModal();loadPrivacyContent($('privacy-policy-content'));};



function syncRankingSettings(){$('rankings-enable-open').hidden=leaderboardAllowed();}
function openSettings(){$('privacy-status').textContent='';syncRankingSettings();$('settings-dialog').showModal();}
$('settings-dialog').addEventListener('close',()=>{$('privacy-status').textContent='';});
$('rankings-enable-open').onclick=()=>{$('rankings-enable-status').textContent='';$('rankings-enable-dialog').showModal();};
$('rankings-enable-confirm').onclick=async()=>{const button=$('rankings-enable-confirm');button.disabled=true;$('rankings-enable-status').textContent='Connectingâ€¦';resetRankedSession();window.ShapeShiftPlatform.storage.removeItem('shape-shift-online-disabled');try{await saveOnlineProfile(getIdentity());profile.pending=[];saveProfile();flushProfile();$('rankings-enable-dialog').close();syncRankingSettings();renderPublicPlayerId();$('privacy-status').textContent='Leaderboard uploads are on. Finish a new Endless run to post a score.';}catch{window.ShapeShiftPlatform.storage.setItem('shape-shift-online-disabled','1');$('rankings-enable-status').textContent='Could not connect. Uploads are still off. Please try again.';}finally{button.disabled=false;}};
$('delete-profile-open').onclick=()=>{$('delete-profile-status').textContent='';$('delete-profile-dialog').showModal();};



$('delete-profile-confirm').onclick=async()=>{const b=$('delete-profile-confirm');b.disabled=true;window.ShapeShiftPlatform.storage.setItem('shape-shift-online-disabled','1');resetRankedSession();ranked=null;try{if(window.ShapeShiftPlatform.storage.getItem('shape-shift-player-token'))await deleteOnlineProfile();window.ShapeShiftPlatform.storage.removeItem('shape-shift-player-token');profile.pending=[];saveProfile();flushProfile();$('public-player-id').textContent='';$('player-id-row').hidden=true;$('delete-profile-status').textContent='Online profile deleted. Ranking uploads are off.';}catch{$('delete-profile-status').textContent='Could not delete the online record. Uploads are off. Please reconnect and try again.';}finally{b.disabled=false;syncRankingSettings();}};



async function renderPublicPlayerId(){



 const token=window.ShapeShiftPlatform.storage.getItem('shape-shift-player-token');



 $('public-player-id').textContent='';$('player-id-row').hidden=true;$('player-id-status').textContent='';if(!token)return;



 try{



  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));



  const fullId=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');



  if(window.ShapeShiftPlatform.storage.getItem('shape-shift-player-token')===token){$('public-player-id').textContent=compactPlayerId(fullId);$('player-id-row').hidden=false;}



 }catch{/* Offline game remains usable if secure hashing is unavailable. */}



}



renderPublicPlayerId();



$('profile-open').addEventListener('click',renderPublicPlayerId);

let copyStatusTimer;

$('copy-player-id').onclick=async()=>{

 const id=$('public-player-id').textContent;if(!/^\d{7,9}$/.test(id))return;

 let copied=false;

 try{if(window.ShapeShiftClipboard)copied=window.ShapeShiftClipboard.copyPlayerId(id);else if(navigator.clipboard){await navigator.clipboard.writeText(id);copied=true;}}catch{}

 if(!copied){const input=document.createElement('textarea');input.value=id;input.setAttribute('aria-label','Player ID to copy');input.style='position:absolute;opacity:0;width:1px;height:1px';$('profile-dialog').append(input);input.select();try{copied=document.execCommand('copy');}catch{}input.remove();$('copy-player-id').focus();}

 window.ShapeShiftPlatform.clearTimeout(copyStatusTimer);showProfileNotice(copied?'Player ID copied.':'Could not copy. Press and hold the ID to copy it.');

 copyStatusTimer=window.ShapeShiftPlatform.setTimeout(()=>{$('player-id-status').textContent='';},2200);

};











async function collectAchievementRewards(next,button){
 if(next===profile)return;
 const reward=next.coins-profile.coins,oldBalance=profile.coins;
 // Credit coins and all claim receipts together before animating the reward.
 window.ShapeShiftPlatform.storage.setItem('shape-shift-profile-v1',JSON.stringify(next));profile=next;saveProfile();flushProfile();uiSound('quest-collect');
 analytics.count('coins_earned','achievement',reward);
 await showQuestReward(button,$('coin-help-open'),reward,oldBalance,prefs.motion,{onArrive:()=>uiSound('quest-wallet')}).catch(()=>{});
}
initAchievements(()=>uiSound('achievement-complete'),{getProfile:()=>profile,sound:uiSound,
 collectAll:(mode,stats,button)=>collectAchievementRewards(claimAllAchievements(profile,stats,mode),button),collect:async(award,stats,button)=>{
 await collectAchievementRewards(claimAchievement(profile,stats,award.id),button);
}});
trackAchievements({type:'history',mode:'adventure',stars:store.get('shape-shift-adventure-v1',{}).stars});
trackAchievements({type:'history',mode:'endless',best:Math.max(best,...['easy','normal','hard','extreme'].map(d=>Number(store.get('shape-shift-best-'+d,0))||0))});



trackAchievements({type:'existingBest',score:best});




function syncMenuBanner(){if($('app').dataset.storyActive==='true'){window.ShapeShiftAds?.setBannerVisible?.(false);return;}updateMenuBanner(document,window.ShapeShiftAds);}
const bannerObserver=new MutationObserver(syncMenuBanner);
bannerObserver.observe($('app'),{attributes:true,attributeFilter:['data-screen']});
for(const dialog of document.querySelectorAll('dialog'))bannerObserver.observe(dialog,{attributes:true,attributeFilter:['open']});
syncMenuBanner();

let gamesHub;
function miniQuestEvent(event){trackAchievements({...event,game:event.mode,mode:'games'});profile=trackQuestProgress(profile,event);saveProfile();updateQuestBadge();}
const shapeDrop=initShapeDrop({getLoadout:()=>({frame:profile.equipped.frame}),getXp:()=>profile.xp,onQuestEvent:miniQuestEvent,sound:uiSound,onClose:()=>gamesHub?.open(),onProgress:progress=>trackAchievements({type:'dropHistory',mode:'games',...progress}),reward:entry=>{
 const next=claimDropReward(profile,entry);if(next===profile)return profile.dropRewards?.includes(entry.id)===true;
 try{window.ShapeShiftPlatform.storage.setItem('shape-shift-profile-v1',JSON.stringify(next));}catch{return false;}
 profile=next;saveProfile();flushProfile();return true;
}});
const shapeSlice=initShapeSlice({getXp:()=>profile.xp,onQuestEvent:miniQuestEvent,sound:uiSound,getLoadout:()=>({frame:profile.equipped.frame,upgrade:profile.upgrades[profile.equipped.frame]||0}),onClose:()=>gamesHub?.open(),onProgress:progress=>trackAchievements({type:'sliceHistory',mode:'games',...progress}),reward:entry=>{
 const next=claimSliceReward(profile,entry);if(next===profile)return profile.sliceRewards?.includes(entry.id)===true;
 try{window.ShapeShiftPlatform.storage.setItem('shape-shift-profile-v1',JSON.stringify(next));}catch{return false;}
 profile=next;saveProfile();flushProfile();return true;
}});
const pianoFlow=initPianoFlow({onProgress:progress=>trackAchievements({type:'pianoHistory',mode:'games',...progress}),getXp:()=>profile.xp,onQuestEvent:miniQuestEvent,sound:uiSound,getLoadout:()=>({frame:profile.equipped.frame,upgrade:profile.upgrades[profile.equipped.frame]||0}),onClose:()=>gamesHub?.open(),reward:entry=>{
 const next=claimPianoReward(profile,entry);if(next===profile)return profile.pianoRewards?.includes(entry.id)===true;
 try{window.ShapeShiftPlatform.storage.setItem('shape-shift-profile-v1',JSON.stringify(next));}catch{return false;}
 profile=next;saveProfile();flushProfile();return true;
}});
gamesHub=initGamesHub({openPiano:()=>pianoFlow.open(),openDrop:()=>shapeDrop.open(),openSlice:()=>shapeSlice.open(),sound:uiSound});
for(const id of ['shape-drop','shape-slice','piano-flow','games-hub'])bannerObserver.observe(document.getElementById(id),{attributes:true,attributeFilter:['open']});
const storyUI=initStoryUI({document,storage:window.ShapeShiftPlatform.storage,adventure:store.get('shape-shift-adventure-v1',{}),admin:profile.adminMode===true,adminBackup:store.get('shape-shift-admin-map-backup-v1',null),sound:uiSound,
 settings:()=>({reduced:prefs.motion||matchMedia('(prefers-reduced-motion: reduce)').matches,effectsVolume:prefs.sfx?prefs.sfxVolume/100:0,volume:Math.max(prefs.music?prefs.musicVolume/100:0,prefs.sfx?prefs.sfxVolume/100:0)}),
 beforeScene:()=>{$('app').dataset.storyActive='true';audio()?.pause();syncMenuBanner();},
 afterScene:()=>{delete $('app').dataset.storyActive;if(!window.ShapeShiftPlatform.paused&&!nativeBackground)audio()?.start();syncMenuBanner();}
});
worldUI=initWorldMenu({getFrame:()=>profile.equipped.frame,openFrames:()=>$('profile-open').click(),drawShape:sprite,getPlayerLevel:()=>playerLevel(profile),canStart:()=>!counting&&!active&&!storyUI.isPlaying(),start:async(mode,level)=>{if(counting||active)return;if(mode==='rush'){uiSound('start');gamesHub.open();return;}runMode=mode;adventureLevel=level;return start();},home,screen,sound:uiSound,getBest:(difficulty='normal')=>difficulty==='normal'?best:Number(store.get('shape-shift-best-'+difficulty,0))||0,isAdmin:()=>profile.adminMode===true,onAdventureComplete:entry=>{storyUI.record(entry);}});

$('adventure-continue').onclick=async()=>{if(runMode==='endless'){dismissRunScreen();return;}if(runMode!=='adventure'||storyUI.isPlaying())return;const button=$('adventure-continue');button.disabled=true;try{uiSound('leave-result');if(await home(true)===false)return;worldUI?.map();await storyUI.afterResults();}finally{button.disabled=false;}};

// Analytics tracks only fixed counters. Input text and pointer coordinates are never read.
for(const event of ['pointerdown','pointermove','keydown'])document.addEventListener(event,()=>engagement.input(),{passive:true});
window.ShapeShiftPlatform.setInterval(()=>sampleEngagement({visible:!window.ShapeShiftPlatform.paused&&!nativeBackground,playing:active&&!paused&&!counting,paused}),1000);
window.ShapeShiftPlatform.setInterval(()=>analytics.flush(),60000);
document.addEventListener('unused-visibilitychange',()=>{if(window.ShapeShiftPlatform.paused)analytics.sessionEnd();else analytics.sessionStart();});
window.addEventListener('unused-pagehide',()=>analytics.sessionEnd());
window.addEventListener('unused-androidpause',()=>analytics.sessionEnd());
window.addEventListener('unused-androidresume',()=>analytics.sessionStart());
document.querySelectorAll('[data-shop-tab]').forEach(b=>b.addEventListener('click',()=>analytics.count('shop',({'shop-items':'boosts','skin-items':'skins','frame-items':'frames','background-items':'worlds'})[b.dataset.shopTab])));

$('terms-open').onclick=()=>ensureTerms(true);

function syncAdventureBoosts(){if(!worldUI)return;profile=grantAdventureBoosts(profile,worldUI.completed());saveProfile();}
function tutorialBoardReady(){
 return active&&!paused&&!locked&&!counting&&!memoryPeek&&mechanicHold<=0&&!colorFlip&&!burstEffect&&!rockFills.length&&!coinFlights.length&&!window.ShapeShiftPlatform.paused&&!nativeBackground&&!document.querySelector('dialog[open]');
}
function maybeAbilityGuide(){
 if(!tutorialBoardReady())return false;
 for(const name of ['shield','freeze','boost']){
  const key='ability-practice-v1-'+name;
  if(runBoostUnlocked(name)&&profile.inventory[name]>0&&!store.get(key,false)){
   showAbilityGuide($(name),BOOST_LESSONS[name],()=>{store.set(key,true);ability(name);});return true;
  }
 }
 const index=nextSpecialLesson(board,special=>store.get('special-practice-v1-'+special,false));
 if(index>=0){const special=board[index].special;showAbilityGuide($('board').children[index],SPECIAL_LESSONS[special],()=>{store.set('special-practice-v1-'+special,true);resolve(index);});return true;}
 return false;
}
for(const name of ['shield','freeze','boost'])document.querySelector('.abilities').append($(name));
syncAdventureBoosts();

initSettingsExtras(uiSound,()=>openTutorial(false,true));
initTouchUI(document);
initInputFeedback();

function maybeAdventureGuide(){
 if(runMode!=='adventure'||!tutorialBoardReady())return false;
 if(memoryLesson){
  const index=memoryLesson.index,tile=board[index];
  if(!tile?.memory||!tile.peeked){memoryLesson=null;return false;}
  // A guided matching turn follows the real peek; the card stays covered in its original slot.
  state.current={...state.current,color:tile.color,shape:tile.shape};paintCurrentShape();paintAdventureMechanic();
  showBoardGuide($('board').children[index],['Memory card: match','Your shape now matches the card you saw. Tap that covered card again to collect it. You cannot peek again.'],()=>{
   memoryLesson=null;resolve(index);if(state.outcome==='correct')store.set('adventure-live-v2-memory',true);
  },{focus:$('current-sprite'),wrong:'Tap the covered card you remembered.'});return true;
 }
 const config=adventureMechanics(adventureLevel);
 const kind=state.matchRule&&!store.get('adventure-live-v2-'+state.matchRule,false)?state.matchRule:config.memory&&!store.get('adventure-live-v2-memory',false)?'memory':config.wheel&&!store.get('adventure-live-v2-wheel',false)?'wheel':null;
 if(!kind)return false;
 const index=kind==='memory'?board.findIndex(t=>t.memory&&!t.peeked):board.findIndex(t=>!t.special&&!t.memory&&!t.collected&&(state.matchRule?t[state.matchRule]===state.current[state.matchRule]:t.shape===state.current.shape||t.color===state.current.color));
 if(index<0)return false;
 const colorName=['red','blue','green','yellow'][state.current.color];
 const copy=kind==='memory'?'Tap once to peek. Remember the card: you cannot peek again. Later taps are guesses. A wrong guess costs a heart.':kind==='wheel'?'After 3 turns, your color changes. This bar fills one step each turn. Check your new color before tapping.':kind==='shape'?'While the chains are here, match the SHAPE only. The same color with a different shape will not count.':('While this lock is here, match '+colorName+' only. The same shape in another color will not count.');
 const title=({memory:'Memory card: peek',wheel:'Color change',shape:'Shape lock',color:'Color lock'})[kind];
 showBoardGuide($('board').children[index],[title,copy],()=>{
  if(kind==='memory'){memoryLesson={index};resolve(index);return;}
  if(kind!=='wheel'||modePicks%3===2)store.set('adventure-live-v2-'+kind,true);resolve(index);
 },{focus:kind==='shape'||kind==='color'?$('current-sprite'):kind==='wheel'?$('color-change-cue'):$('board').children[index],wrong:kind==='color'?'Match '+colorName+'. A matching shape alone does not count.':kind==='shape'?'Match the shape. A matching color alone does not count.':'Tap the glowing card.'});return true;
}

async function enableAdminMode(){
 if(profile.adminMode)return;
 try{ownerPermission=await setOwnerAdmin(true);}catch{uiSound('click');return;}
 if(!ownerPermission.owner||!ownerPermission.adminActive)return;
 window.ShapeShiftPlatform.storage.setItem('shape-shift-admin-backup-v1',JSON.stringify(profile));
 window.ShapeShiftPlatform.storage.setItem('shape-shift-admin-map-backup-v1',window.ShapeShiftPlatform.storage.getItem('shape-shift-adventure-v1')||'null');
 profile=adminProfile(profile);saveProfile();flushProfile();applyCosmetics();worldUI?.refresh();
 adminExit.hidden=false;adminExit.textContent='Exit admin mode';uiSound('bonus');
}
const adminExit=document.createElement('button');adminExit.className='secondary';adminExit.textContent='Exit admin mode';adminExit.hidden=!profile.adminMode;
adminExit.onclick=async()=>{try{await setOwnerAdmin(false);}catch{return;}const saved=window.ShapeShiftPlatform.storage.getItem('shape-shift-admin-backup-v1');if(!saved)return;const restored=normalizeProfile(JSON.parse(saved));window.ShapeShiftPlatform.storage.removeItem('shape-shift-admin-recovery-v2');window.ShapeShiftPlatform.storage.removeItem('shape-shift-admin-recovery-map-v2');profile=restored;saveProfile();flushProfile();window.ShapeShiftPlatform.storage.removeItem('shape-shift-admin-backup-v1');const map=window.ShapeShiftPlatform.storage.getItem('shape-shift-admin-map-backup-v1');if(map&&map!=='null')window.ShapeShiftPlatform.storage.setItem('shape-shift-adventure-v1',map);else window.ShapeShiftPlatform.storage.removeItem('shape-shift-adventure-v1');window.ShapeShiftPlatform.storage.removeItem('shape-shift-admin-map-backup-v1');location.reload();};
document.querySelector('#settings-dialog .settings-links').append(adminExit);
const adminEnter=document.createElement('button');adminEnter.className='secondary';adminEnter.textContent='Enable admin mode';adminEnter.hidden=!ownerPermission.owner||profile.adminMode;
adminEnter.onclick=async()=>{await enableAdminMode();adminEnter.hidden=!!profile.adminMode;};document.querySelector('#settings-dialog .settings-links').append(adminEnter);
ownerCheck.then(permission=>{ownerPermission=permission;adminEnter.hidden=!permission.owner||profile.adminMode;});

menuReadiness=initMenuReadiness({getProfile:()=>profile,skinSources:SHAPE_SKINS.map(s=>s.art),prepareSkins:async()=>{const ready=await Promise.all(SHAPE_SKINS.map(s=>ensureSkinArt(s.id)));if(ready.some(value=>!value))throw Error('Shape previews unavailable');},idle:()=>!document.hidden&&!window.ShapeShiftPlatform.paused&&((!active&&!counting)||paused||$('tutorial-dialog').open)});
// Keep every screen and first-run lesson behind the full asset/readiness barrier.
async function prepareStartup(){
 const cover=document.getElementById('startup-ready');if(!cover)return;
 cover.hidden=false;document.documentElement.classList.add('startup-loading');document.getElementById('app').inert=true;const retry=cover.querySelector('button');retry.hidden=true;
 cover.classList.remove('startup-finished');cover.querySelector('p').textContent='Loading your worldâ€¦';const bar=cover.querySelector('progress'),percent=cover.querySelector('.startup-percent');bar.value=0;percent.textContent='0%';
 try{
  await loadStartupAssets((done,total)=>{bar.value=Math.floor(done/total*85);percent.textContent=bar.value+'%';});
  cover.querySelector('p').textContent='Getting ready to playâ€¦';
  await Promise.all([awaitReady(document.fonts.ready,'Font preparation'),effectArtReady,skinArtReady.then(values=>{if(values.some(ready=>!ready))throw Error('Current shape artwork unavailable');})]);
  await menuReadiness.prepareAll();bar.value=95;percent.textContent='95%';

  let launch,showFirstLesson;const firstScreenVisible=new Promise(resolve=>{showFirstLesson=resolve;});
  if(firstEndless.pending){
   runMode='endless';let prepared;const boardReady=new Promise(resolve=>prepared=resolve);launch=start(true,prepared,()=>firstScreenVisible);
   // Prepare the board without opening a modal above the loading cover. The
   // first tutorial is presented only after all assets and the screen are ready.
   await Promise.race([boardReady,launch]);
  }
  bar.value=100;percent.textContent='100%';cover.querySelector('p').textContent='Ready!';
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  cover.hidden=true;document.documentElement.classList.remove('startup-loading');document.getElementById('app').inert=false;
  window.ShapeShiftPlatform.ready();
  if(launch){const firstGate=beginModeTransition('Your first game');try{await firstGate.reveal();}finally{firstGate.dispose();}}
  showFirstLesson();
  loadBackgroundAssets({paused:()=>document.hidden||transitioning||active||counting});
  if(launch)await launch;else await storyUI.onFirstOpen();
  window.ShapeShiftReminders?.requestFirstLaunch?.();
 }catch(error){console.error('Startup preparation failed',error);cover.querySelector('p').textContent='Could not prepare the game. Please try again.';retry.hidden=false;retry.onclick=prepareStartup;}
}
prepareStartup();

window.addEventListener('playables-save',flushProfile);

initLivingMenu({getProfile:()=>profile,commit:next=>{window.ShapeShiftPlatform.storage.setItem('shape-shift-profile-v1',JSON.stringify(next));profile=next;saveProfile();flushProfile();},sound:uiSound});

// First-party telemetry lifecycle is shared by Android and portal editions.
const telemetrySettings=document.createElement('button');telemetrySettings.className='secondary';telemetrySettings.textContent='Gameplay statistics';telemetrySettings.onclick=()=>telemetryChoice(true);document.querySelector('#settings-dialog .settings-links')?.append(telemetrySettings);
ownerCheck.then(p=>{if(p.owner)engagement.setTest(true);}).catch(()=>{});
if(profile.adminMode||adminRecovery?.adminMode||['localhost','127.0.0.1'].includes(location.hostname))engagement.setTest(true);
window.ShapeShiftPlatform.setInterval(()=>engagement.flush(),15000);
document.addEventListener('visibilitychange',()=>document.hidden?engagement.background():engagement.foreground());
window.addEventListener('pagehide',()=>engagement.background());
window.addEventListener('androidpause',()=>engagement.background());
window.addEventListener('androidresume',()=>engagement.foreground());
window.addEventListener('online',()=>engagement.flush());
