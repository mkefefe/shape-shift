import {normalizeModeStats,advanceModeStats} from './achievement-catalog.js?v=494241';
export const ACHIEVEMENTS=[
 {id:'first_match',name:'First Match',description:'Make your first correct pick.',stat:'picks',target:1},
 {id:'score_50',name:'Finding Your Flow',description:'Score 50 points in one run.',stat:'best',target:50},
 {id:'score_100',name:'Century Club',description:'Score 100 points in one run.',stat:'best',target:100},
 {id:'score_250',name:'Shape Shifter',description:'Score 250 points in one run.',stat:'best',target:250},
 {id:'streak_10',name:'Perfect Ten',description:'Make 10 correct picks without a mistake.',stat:'streakBest',target:10},
 {id:'picks_100',name:'Match Maker',description:'Make 100 correct picks across your runs.',stat:'picks',target:100},
 {id:'quest_1',name:'Quest Complete',description:'Collect your first quest reward.',stat:'quests',target:1},
 {id:'quests_10',name:'Quest Champion',description:'Collect 10 quest rewards.',stat:'quests',target:10},
 {id:'adventure_1',name:'Adventure Begins',description:'Complete your first Adventure level.',mode:'adventure',stat:'wins',target:1},
 {id:'adventure_perfect',name:'Three-Star Victory',description:'Complete an Adventure level with all three stars.',mode:'adventure',stat:'perfectWins',target:1}
];
export function achievementState(value={}){
 const result={};for(const key of ['picks','best','streak','streakBest','quests'])result[key]=Number.isSafeInteger(value?.[key])&&value[key]>=0?value[key]:0;
 result.modeStats=normalizeModeStats(value?.modeStats);result.unlocked=ACHIEVEMENTS.filter(a=>value?.unlocked?.includes(a.id)).map(a=>a.id);return result;
}
export function advanceAchievements(previous,event){
 const s=achievementState(previous);s.modeStats=advanceModeStats(s.modeStats,event);
 if(event.type==='pick'){
  if(event.correct){s.picks++;s.streak++;s.streakBest=Math.max(s.streakBest,s.streak);}
  else if(['wrong','miss','protected'].includes(event.outcome))s.streak=0;
 }
 if(event.type==='runStart')s.streak=0;
 if(event.type==='quest')s.quests++;
 if(Number.isSafeInteger(event.score)&&event.score>=0)s.best=Math.max(s.best,event.score);
 for(const a of ACHIEVEMENTS)if((a.mode?s.modeStats[a.mode]?.[a.stat]:s[a.stat])>=a.target&&!s.unlocked.includes(a.id))s.unlocked.push(a.id);
 return s;
}
