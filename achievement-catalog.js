// Five milestones per family, paced across short, medium and long-term play.
const colors=['Red','Blue','Green','Yellow'],shapes=['Circles','Triangles','Squares','Stars'];
const family=(stat,name,targets,description,art='trophy',weight=1)=>({stat,name,targets,description,art,weight});
const common=[
 family('picks','Match Maker',[1,10,30,100,300],n=>`Make ${n} correct picks across this mode.`),
 family('points','Point Collector',[25,100,300,1000,3000],n=>`Earn ${n} total points in this mode.`,'coin'),
 ...colors.map((c,i)=>family('color'+i,c+' Collector',[5,15,40,100,250],n=>`Match ${n} ${c.toLowerCase()} shapes across this mode.`,'color'+i)),
 ...shapes.map((s,i)=>family('shape'+i,s+' Collector',[5,15,40,100,250],n=>`Match ${n} ${s.toLowerCase()} across this mode.`,'shape'+i)),
 family('colorChainBest','Color Changer',[2,3,5,7,10],n=>`Make ${n} consecutive correct picks, changing color on every pick. Mistakes break the streak.`,'color',1.5),
 family('shapeChainBest','Shape Changer',[2,3,5,7,10],n=>`Make ${n} consecutive correct picks, changing shape on every pick. Mistakes break the streak.`,'shape',1.5)
];
const endless=[...common,
 family('best','Personal Best',[10,25,50,100,250],n=>`Score ${n} points in one Endless run.`,'trophy',1.5),
 family('streakBest','Steady Hands',[3,5,10,20,40],n=>`Make ${n} correct picks without a mistake in one run.`,'trophy',1.5),
 family('runs','Back for More',[1,3,5,10,25],n=>`Start ${n} Endless runs.`),
 ...['easy','normal','hard','extreme'].map((d,i)=>family(d+'Runs',['Finding Rhythm','Building Momentum','Staying Sharp','Going Further'][i],[1,2,3,5,10],n=>`Reach ${[10,25,50,100][i]} points in ${n} Endless runs.`,'trophy',d==='extreme'?1.5:1)),
 family('maxBoard','Bigger Board',[2,4,9,12,16],n=>`Reach a board with ${n} choices in Endless.`,'shape',1.5)
];
const adventure=[...common,
 family('wins','Trail Blazer',[1,3,5,15,30],n=>`Complete ${n} Adventure levels. Replays count.`,'map'),
 family('highest','New Horizons',[5,10,20,50,100],n=>`Complete Adventure level ${n}.`,'map',2),
 family('perfectWins','Three Star Finish',[1,3,5,10,25],n=>`Finish ${n} Adventure levels with all three stars. Replays count.`,'star',1.5),
 family('fastWins','Quick Explorer',[1,2,5,10,20],n=>`Win ${n} Adventure levels in under one minute. Replays count.`,'time',1.5),
 family('memory','Memory Keeper',[1,3,10,25,60],n=>`Correctly collect ${n} covered cards in Adventure.`,'shape',1.5),
 family('shapeLocks','Chain Champion',[1,5,15,40,100],n=>`Make ${n} correct picks while shape lock is active.`,'shape',1.5),
 family('colorLocks','Color Keeper',[1,5,15,40,100],n=>`Make ${n} correct picks while color lock is active.`,'color',1.5),
 family('colorChanges','Turning Colors',[1,3,10,25,60],n=>`Trigger ${n} color changes by filling the three-step meter.`,'color')
];
const games=[
 family('dropBest','Drop Champion',[100,250,500,1000,2500],n=>`Score ${n} points in one Shape Drop run.`,'trophy',1.5),
 family('dropCleared','Shape Sweeper',[10,50,150,400,1000],n=>`Clear ${n} shapes across Shape Drop runs.`,'shape'),
 family('dropChain','Chain Reaction',[2,3,4,6,8],n=>`Reach a ×${n} chain in Shape Drop.`,'star',2),
 family('sliceBest','Slice Star',[100,250,500,1000,2500],n=>`Score ${n} points in one Shape Slice run.`,'trophy',1.5),
 family('sliceCount','Sharp Swipes',[10,50,150,400,1000],n=>`Slice ${n} shapes across Shape Slice runs.`,'shape'),
 family('sliceCombo','Swipe Specialist',[2,3,4,5,6],n=>`Slice ${n} shapes in one continuous quick swipe.`,'star',2)
];
// Keep original receipt IDs while raising unclaimed targets. Previously collected rewards stay collected.
const revised={picks:[25,500,2500,10000,30000],points:[250,2500,15000,75000,250000],
 colorChainBest:[10,30,100,400,1000],shapeChainBest:[10,30,100,400,1000],best:[100,400,1000,2500,5000],streakBest:[20,75,200,500,1000],runs:[5,25,75,200,500],
 easyRuns:[5,25,75,150,300],normalRuns:[5,20,60,125,250],hardRuns:[3,15,40,100,200],extremeRuns:[3,10,30,75,150],
 wins:[3,15,50,150,400],highest:[10,25,50,75,100],perfectWins:[3,15,40,100,250],fastWins:[5,20,60,150,300],
 memory:[10,75,300,1000,3000],shapeLocks:[25,150,600,2000,6000],colorLocks:[25,150,600,2000,6000],colorChanges:[10,75,300,1000,3000],
 dropBest:[50,150,300,600,1200],dropCleared:[100,1000,5000,15000,40000],sliceBest:[50,150,300,600,1000],sliceCount:[100,1000,5000,15000,40000]};
for(const families of [endless,adventure,games])for(const f of families){f.receiptTargets??=[...f.targets];f.targets=/^(color|shape)[0-3]$/.test(f.stat)?[100,500,2000,7500,20000]:(revised[f.stat]||f.targets);}
games.push(
 family('dropRuns','Back to Drop',[5,25,75,200,500],n=>`Finish ${n} Shape Drop runs with at least 10 matches.`),
 family('dropPoints','Drop Dedication',[250,1500,7500,25000,75000],n=>`Earn ${n} points across Shape Drop runs.`),
 family('dropGroups','Connected Shapes',[20,100,500,1500,5000],n=>`Clear groups of at least three shapes ${n} times in Shape Drop.`),
 family('dropObstacles','Under Pressure',[25,150,750,2500,7500],n=>`Make ${n} clears while obstacles are on the Shape Drop board.`),
 family('dropSurvival','Drop Endurance',[120,240,420,600,900],n=>`Survive ${n} seconds in one Shape Drop run with at least 10 matches.`,'time'),
 family('sliceRuns','Back to Slice',[5,25,75,200,500],n=>`Finish ${n} Shape Slice runs with at least 10 slices.`),
 family('sliceCleanBest','Careful Blade',[20,50,100,200,400],n=>`Slice ${n} shapes without missing a wave or hitting a hazard.`),
 family('sliceRising','On the Rise',[50,250,1000,4000,10000],n=>`Slice ${n} shapes while they are moving upward.`),
 family('sliceSurvival','Slice Endurance',[60,120,180,300,480],n=>`Survive ${n} seconds in one Shape Slice run with at least 10 slices.`,'time'),
 family('pianoBest','Piano Performance',[50,150,300,600,1000],n=>`Complete ${n} notes in one Piano Flow run.`),
 family('pianoCount','Piano Practice',[100,1000,5000,15000,40000],n=>`Complete ${n} notes across Piano Flow runs.`),
 family('pianoHolds','Hold the Melody',[25,150,750,2500,7500],n=>`Fully complete ${n} hold notes in Piano Flow.`),
 family('pianoCleanBest','Flawless Phrase',[20,50,100,200,400],n=>`Complete ${n} Piano Flow notes without losing a life.`),
 family('pianoRuns','Encore',[5,25,75,200,500],n=>`Finish ${n} Piano Flow runs with at least 10 completed notes.`)
);
export const MODE_ACHIEVEMENTS=Object.entries({endless,adventure,games}).flatMap(([mode,families])=>families.flatMap(f=>f.targets.map((target,tier)=>({id:`${mode}_${f.stat}_${f.receiptTargets?.[tier]??target}`,mode,stat:f.stat,target,tier,name:f.name+' '+['I','II','III','IV','V'][tier],shortName:f.name,description:f.description(target),art:f.art,reward:Math.round(([50,75,100,150,250][tier]*f.weight)/25)*25}))));
const integer=n=>Number.isSafeInteger(n)&&n>=0?n:0;
export function normalizeModeStats(raw={}){return Object.fromEntries(['endless','adventure','games'].map(mode=>{const stats={};for(const a of MODE_ACHIEVEMENTS.filter(a=>a.mode===mode))stats[a.stat]=integer(raw?.[mode]?.[a.stat]);for(const key of ['streak','colorChain','shapeChain','runScore',...['drop','slice','piano'].flatMap(m=>[m+'RunHits',m+'Clean',m+'RunActive'])])stats[key]=integer(raw?.[mode]?.[key]);for(const key of ['lastColor','lastShape'])stats[key]=Number.isInteger(raw?.[mode]?.[key])&&raw[mode][key]>=0&&raw[mode][key]<4?raw[mode][key]:null;return [mode,stats];}));}
export function advanceModeStats(raw,event){
 const all=normalizeModeStats(raw),s=all[event.mode];if(!s)return all;
 // Shape Drop uses its durable totals; obsolete Dash stars cannot unlock these awards.
 if(event.mode==='games'){
  const m=event.game;
  if(['drop','slice','piano'].includes(m)){
   if(event.type==='start'){s[m+'RunHits']=0;s[m+'Clean']=0;s[m+'RunActive']=1;}
   if(event.type==='success'&&s[m+'RunActive']){
    const count=m==='drop'?Math.max(1,integer(event.matches)):1;
    s[m+'RunHits']+=count;s[m+'Clean']+=count;
    if(m==='drop'){s.dropPoints+=count;if(event.pieces?.length>=3)s.dropGroups++;if(event.obstacle)s.dropObstacles++;}
    if(m==='slice'){s.sliceCleanBest=Math.max(s.sliceCleanBest,s.sliceClean);if(event.tile?.vy<0)s.sliceRising++;}
    if(m==='piano'){s.pianoCount++;s.pianoBest=Math.max(s.pianoBest,s.pianoRunHits);s.pianoCleanBest=Math.max(s.pianoCleanBest,s.pianoClean);if(event.tile?.hold>0)s.pianoHolds++;}
   }
   if(event.type==='failure')s[m+'Clean']=0;
   if(event.type==='finish'&&s[m+'RunActive']){s[m+'RunActive']=0;if(s[m+'RunHits']>=10){s[m+'Runs']++;if(m!=='piano')s[m+'Survival']=Math.max(s[m+'Survival'],integer(Math.floor(event.time)));}}
  }

  if(event.type==='pianoHistory')s.pianoBest=Math.max(s.pianoBest,integer(event.best));
  if(event.type==='dropHistory'){
   s.dropBest=Math.max(s.dropBest,integer(event.best));
   s.dropCleared=Math.max(s.dropCleared,integer(event.cleared));
   s.dropChain=Math.max(s.dropChain,Math.min(8,integer(event.bestCombo)));
  }
  if(event.type==='sliceHistory'){s.sliceBest=Math.max(s.sliceBest,integer(event.best));s.sliceCount=Math.max(s.sliceCount,integer(event.sliced));s.sliceCombo=Math.max(s.sliceCombo,integer(event.bestCombo));}
  return all;
 }
 if(event.type==='runStart'){s.runs=(s.runs||0)+1;s.streak=0;s.colorChain=0;s.shapeChain=0;s.lastColor=null;s.lastShape=null;s.runScore=0;}
 if(event.type==='pick'){
  if(event.correct&&event.tile&&!event.tile.special){s.picks++;s.streak++;s.streakBest=Math.max(s.streakBest||0,s.streak);const t=event.tile;
   if(Number.isInteger(t.color)&&t.color>=0&&t.color<4){s['color'+t.color]++;s.colorChain=s.lastColor!==null&&s.lastColor!==t.color?s.colorChain+1:1;s.colorChainBest=Math.max(s.colorChainBest,s.colorChain);s.lastColor=t.color;}
   if(Number.isInteger(t.shape)&&t.shape>=0&&t.shape<4){s['shape'+t.shape]++;s.shapeChain=s.lastShape!==null&&s.lastShape!==t.shape?s.shapeChain+1:1;s.shapeChainBest=Math.max(s.shapeChainBest,s.shapeChain);s.lastShape=t.shape;}
   if(event.mode==='adventure'){if(t.memory)s.memory++;if(event.rule==='shape')s.shapeLocks++;if(event.rule==='color')s.colorLocks++;}
  }else if(['wrong','miss','protected'].includes(event.outcome)){s.streak=0;s.colorChain=0;s.shapeChain=0;s.lastColor=null;s.lastShape=null;}
  if(Number.isSafeInteger(event.score)&&event.score>=0){if(event.mode==='endless')for(const [i,d] of ['easy','normal','hard','extreme'].entries()){const threshold=[10,25,50,100][i];if(s.runScore<threshold&&event.score>=threshold)s[d+'Runs']++;}s.points+=Math.max(0,event.score-s.runScore);s.runScore=event.score;if(event.mode==='endless')s.best=Math.max(s.best,event.score);}
 }
 if(event.type==='board'&&event.mode==='endless')s.maxBoard=Math.max(s.maxBoard,integer(event.count));
 if(event.type==='colorChange'&&event.mode==='adventure')s.colorChanges++;
 if(event.type==='finish'&&event.mode==='adventure'&&event.won){s.wins++;s.highest=Math.max(s.highest,integer(event.level));if(event.stars===3)s.perfectWins++;if(event.elapsed>=0&&event.elapsed<60000)s.fastWins++;}
 if(event.type==='history'){if(event.mode==='endless')s.best=Math.max(s.best,integer(event.best));else {const stars=Array.isArray(event.stars)?event.stars:[];s.highest=Math.max(s.highest,stars.reduce((n,v,i)=>v>0?i+1:n,0));s.wins=Math.max(s.wins,stars.filter(n=>n>0).length);s.perfectWins=Math.max(s.perfectWins,stars.filter(n=>n===3).length);}}
 return all;
}
export const achievementProgress=(stats,award)=>Math.min(award.target,stats?.[award.mode]?.[award.stat]||0);
export function claimAchievement(profile,stats,id){const award=MODE_ACHIEVEMENTS.find(a=>a.id===id);if(!award||achievementProgress(stats,award)<award.target||profile.achievementClaims?.includes(id))return profile;return {...profile,coins:(profile.coins||0)+award.reward,achievementClaims:[...(profile.achievementClaims||[]),id]};}


// Claim only eligible rewards in the explicitly selected mode, in one profile update.
export function claimAllAchievements(profile,stats,mode){
 if(!['endless','adventure','games'].includes(mode))return profile;
 return MODE_ACHIEVEMENTS.filter(a=>a.mode===mode).reduce((next,a)=>claimAchievement(next,stats,a.id),profile);
}
