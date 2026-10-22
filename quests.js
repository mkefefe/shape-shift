import {journeyQuest,journeyDailyPool,questAvailable,advanceJourney} from './quest-journey.js?v=49439-web11';
import {advanceQuestRun,advanceChallenge} from './quest-challenges.js?v=49439-web11';
import {COSMETICS,playerLevel} from './economy.js?v=49439-web11';
const shapes=['circle','triangle','square','star'],colors=['red','blue','green','yellow'];
export function questPool(p){return [
 ...shapes.map((name,value)=>({id:'shape-'+value,type:'streak',value,target:3,reward:100,title:'Pick 3 '+name+' shapes in a row',hint:'Consecutive correct picks in one run.'})),
 ...colors.map((name,value)=>({id:'color-'+value,type:'color',value,target:5,reward:50,title:'Pick '+name+' 5 times',hint:'Correct picks across any number of runs.'})),
 {id:'score-20',type:'score',target:20,reward:100,title:'Score 20 in one run',hint:'Boost and streak points count too.'},
 {id:'picks-15',type:'picks',target:15,reward:100,title:'Make 15 correct picks',hint:'Progress carries over between runs.'},
 ...COSMETICS.filter(c=>p.owned.includes(c.id)&&playerLevel(p)>=c.level).map(c=>({id:'wear-'+c.id,type:'wear',value:c.id,kind:c.kind,target:1,reward:100,title:'Play a run with '+c.name,hint:'Make at least 5 correct picks, then finish the run.'}))];}
export const NORMAL_QUEST_TOTAL=400;
export const DAILY_PERIOD=24*60*60*1000;
const allQuests=p=>[...(p.quests||[]),...(p.dailyQuests||[])];
export const questList=(p,tab='normal')=>tab==='daily'?(p.dailyQuests||[]).filter(q=>!q.claimed):(p.quests||[]);
function normalQuest(sequence,p){return journeyQuest(sequence);}
export function ensureQuests(p,rng=Math.random,now=Date.now()){
 const pool=questPool(p),claimed=[...new Set((p.normalClaimed||[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=NORMAL_QUEST_TOTAL))];
 let active=(Array.isArray(p.quests)?p.quests:[]).slice(0,3).map((q,i)=>{
 const sequence=Number.isInteger(q.sequence)?q.sequence:i+1;
 if(sequence<1||sequence>NORMAL_QUEST_TOTAL||claimed.includes(sequence))return null;
 const template=q.id?.startsWith('normal-')?(q.type==='journey'?normalQuest(sequence,p):(q.progress>=q.target?q:normalQuest(sequence,p))):pool.find(t=>t.id===q.id);
 if(template?.type==='journey'){
  if(!questAvailable(template,p)&&q.progress<q.target)return null;
  return {...template,progress:q.catalogue===4?Math.min(template.target,Math.max(0,Number(q.progress)||0)):0,runtime:q.catalogue===4?(q.runtime||{}):{}};
 }
 if(template?.type==='challenge'){
  const same=q.catalogue===3;
  const parts=template.parts.map((part,j)=>({...part,progress:same?Math.min(part.target,Math.max(0,Number(q.parts?.[j]?.progress)||0)):0}));
  return {...template,parts,progress:same?Math.min(template.target,Math.max(parts.reduce((n,p)=>n+p.progress,0),Number(q.progress)||0)):0};
 }
 return template?{...template,id:q.id,sequence,progress:Math.min(template.target,Math.max(0,Number(q.progress)||0))}:null;
 }).filter(Boolean);
 for(let seq=1;seq<=NORMAL_QUEST_TOTAL&&active.length<3;seq++)if(!claimed.includes(seq)&&!active.some(q=>q.sequence===seq)){const q=normalQuest(seq,p);if(questAvailable(q,p))active.push(q);}
 let reset=Number(p.dailyResetAt),daily=p.dailyQuests;
 if(!Number.isFinite(reset)||reset<=0||now>=reset||!Array.isArray(daily)||daily.length!==3){
 reset=Number.isFinite(reset)&&reset>0?reset+(Math.floor((now-reset)/DAILY_PERIOD)+1)*DAILY_PERIOD:now+DAILY_PERIOD;
 const available=journeyDailyPool(p);daily=Array.from({length:3},(_,i)=>{const q=available.splice(Math.min(available.length-1,Math.floor(rng()*available.length)),1)[0];return {...q,id:'daily-'+reset+'-'+i,progress:0,claimed:false};});
 }
 daily=daily.map(q=>q.type==='journey'&&q.mode==='endless'?{...q,difficulty:null,description:(q.description||'').replace(/ \((easy|normal|hard|extreme)\)$/,'')}:q);
 return {...p,questVersion:4,quests:active,normalClaimed:claimed,dailyResetAt:reset,dailyQuests:daily};
}
export function trackQuests(p,e){if(p.questVersion>=2)p=ensureQuests(p);const {run,delta}=advanceQuestRun(p.questRun||{},e);const track=q=>{if(q.type==='journey'){const event=e.type==='pick'?{...e,type:e.correct?'success':'failure',failure:e.lostLife||(!e.correct&&!['pass','protected'].includes(e.outcome))}:e;return advanceJourney(q,event,p);}if(q.type==='challenge')return advanceChallenge(q,run,delta);if(q.progress>=q.target)return q;let n=q.progress;
 if(e.type==='start'&&(q.type==='streak'||q.type==='score'))n=0;
 if(e.type==='pick'){
 if(q.type==='streak'){if(e.correct)n=e.tile&&!e.tile.special&&e.tile.shape===q.value?n+1:0;else if(e.outcome!=='pass')n=0;}
 if(e.correct){if(q.type==='color'&&!e.tile?.special&&e.tile?.color===q.value)n++;if(q.type==='picks')n++;}
 if(q.type==='score')n=Math.max(n,e.score||0);
 }
 if(e.type==='finish'&&q.type==='wear'&&e.picks>=5&&e.loadout?.[q.kind]===q.value)n=1;
 return {...q,progress:Math.min(q.target,n)};};return {...p,questRun:run,quests:(p.quests||[]).map(track),dailyQuests:(p.dailyQuests||[]).map(track)};}
export function claimQuest(p,id,rng=Math.random,now=Date.now()){
 const current=ensureQuests(p,rng,now),q=allQuests(current).find(q=>q.id===id);
 if(!q||q.claimed||q.progress<q.target)return p;
 if(id.startsWith('daily-'))return {...current,coins:p.coins+q.reward,dailyQuests:current.dailyQuests.map(t=>t.id===id?{...t,claimed:true}:t)};
 return ensureQuests({...current,coins:p.coins+q.reward,normalClaimed:[...current.normalClaimed,q.sequence],quests:current.quests.filter(t=>t.id!==id)},rng,now);
}
export function newlyCompletedQuests(before,after){return allQuests(after).filter(q=>!q.claimed&&q.progress>=q.target&&allQuests(before).some(old=>old.id===q.id&&old.progress<old.target));}
export function canClaimAllQuests(p,tab='normal'){const list=questList(p,tab);return list.length>0&&list.every(q=>!q.claimed&&q.progress>=q.target);}
export function claimAllQuests(p,rng=Math.random,tab='normal',now=Date.now()){
 if(!canClaimAllQuests(p,tab))return p;
 return questList(p,tab).reduce((next,q)=>claimQuest(next,q.id,rng,now),p);
}
