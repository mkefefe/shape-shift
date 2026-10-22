// Legacy v3 tracker retained only for already-issued daily quests and claimable rewards.
const skill=(id,name,text,target,kind='sum',family=id)=>({id,name,text,target,kind,family});
export const QUEST_SKILLS=[
 skill('picks','Match maker','Make 20 correct picks',20),
 skill('streak','Steady hands','Make 8 correct picks without a mistake',8,'best'),
 skill('colorChange','Color switcher','Change color on 6 correct picks',6),
 skill('shapeChange','Shape shifter','Change shape on 6 correct picks',6),
 skill('sameColor','Color keeper','Keep your color on 6 correct picks',6),
 skill('sameShape','Shape keeper','Keep your shape on 6 correct picks',6),
 skill('colors','Full palette','Match all 4 colors in one run',4,'best'),
 skill('shapes','Full set','Match all 4 shapes in one run',4,'best'),
 skill('icons','Mix and match','Match 10 different shape/color pairs in one run',10,'best'),
 skill('colorReturn','Color boomerang','Return to a color after one different color, 3 times',3),
 skill('shapeReturn','Shape boomerang','Return to a shape after one different shape, 3 times',3),
 skill('ruleChain','Change tactics','Alternate color-only and shape-only matches 4 times in a row',4,'best'),
 skill('colorChain','Color journey','Change color on 4 consecutive correct picks',4,'best'),
 skill('shapeChain','Shape journey','Change shape on 4 consecutive correct picks',4,'best'),
 skill('twins','Perfect twins','Match both your shape and color 3 times',3),
 skill('recovery','Comeback','Make 3 correct picks in a row after a mistake',3,'best'),
 skill('boardFour','Crowded choices','Make 6 correct picks on boards with at least 4 choices',6),
 skill('boardNine','Big board','Make 4 correct picks on boards with at least 9 choices',4),
 skill('quick','Quick thinking','Make 10 correct picks within 1.2 seconds each',10),
 skill('patient','Take your time','Make 5 correct picks after waiting at least 2 seconds',5),
 skill('quickChain','Quick and clean','Make 5 correct picks in a row within 1.8 seconds each',5,'best'),
 skill('colorOnly','Color route','Match by color only 8 times',8),
 skill('shapeOnly','Shape route','Match by shape only 8 times',8),
 skill('specials','Special delivery','Collect 3 special items',3),
 skill('memory','Remember me','Correctly collect 2 covered cards in Adventure',2),
 skill('endlessPicks','Endless explorer','Make 15 correct picks in Endless',15),
 skill('adventurePicks','Adventure explorer','Make 15 correct picks in Adventure',15),
 skill('finish','See it through','Finish a run with at least 15 correct picks',1),
 skill('win','Trail finisher','Win an Adventure level (replays count)',1),
 skill('cleanWin','Clean victory','Win an Adventure level without a mistake or timeout',1),
 skill('score','Point builder','Reach 50 points in one run',50,'best'),
 skill('specialSet','Toolbox','Collect 3 different special-item types in one run',3,'best')
];
export function advanceQuestRun(previous,event){
 const r=event.type==='start'?{}:{...previous},delta={};
 if(event.type==='start')return {run:{picks:0,mistakes:0,streak:0,colors:[],shapes:[],icons:[],specialSet:[]},delta};
 if(event.type==='pick'){
  const t=event.tile,ordinary=event.correct&&t&&!t.special;
  if(!event.correct&&event.outcome!=='pass'){
   r.mistakes=(r.mistakes||0)+1;r.streak=0;r.colorChain=0;r.shapeChain=0;r.ruleChain=0;r.quickChain=0;r.recovery=0;r.recovering=true;r.last=null;r.beforeLast=null;r.lastRule=null;
  }
  if(event.correct){r.picks=(r.picks||0)+1;r.streak=(r.streak||0)+1;delta.picks=1;delta[event.mode==='adventure'?'adventurePicks':event.mode==='endless'?'endlessPicks':'other']=1;
   if(event.boardSize>=4)delta.boardFour=1;if(event.boardSize>=9)delta.boardNine=1;
   if(Number.isFinite(event.responseMs)&&event.responseMs<=1200)delta.quick=1;
   if(event.responseMs>=2000)delta.patient=1;
   r.quickChain=Number.isFinite(event.responseMs)&&event.responseMs<=1800?(r.quickChain||0)+1:0;
   if(r.recovering)r.recovery=(r.recovery||0)+1;
   if(t?.special){delta.specials=1;r.specialSet=[...new Set([...(r.specialSet||[]),t.special])];}
   if(t?.memory&&event.mode==='adventure')delta.memory=1;
  }
  if(ordinary){
   for(const [key,value] of [['colors',t.color],['shapes',t.shape],['icons',t.color+':'+t.shape]])r[key]=[...new Set([...(r[key]||[]),value])];
   const before=event.before||r.last;
   if(before){const color=before.color===t.color,shape=before.shape===t.shape;
    delta[color?'sameColor':'colorChange']=1;delta[shape?'sameShape':'shapeChange']=1;
    if(color&&shape)delta.twins=1;
    const rule=color&&!shape?'colorOnly':shape&&!color?'shapeOnly':null;if(rule)delta[rule]=1;
    r.ruleChain=rule?(r.lastRule&&rule!==r.lastRule?(r.ruleChain||0)+1:1):0;r.lastRule=rule;
    r.colorChain=color?0:(r.colorChain||0)+1;r.shapeChain=shape?0:(r.shapeChain||0)+1;
   }
   if(r.beforeLast&&r.last){if(t.color===r.beforeLast.color&&t.color!==r.last.color)delta.colorReturn=1;if(t.shape===r.beforeLast.shape&&t.shape!==r.last.shape)delta.shapeReturn=1;}
   r.beforeLast=r.last;r.last={shape:t.shape,color:t.color};
  }else if(event.correct){r.colorChain=0;r.shapeChain=0;r.ruleChain=0;r.lastRule=null;r.last=null;r.beforeLast=null;}
 }
 if(event.type==='finish'){
  if(event.picks>=15)delta.finish=1;
  if(event.mode==='adventure'&&event.won){delta.win=1;if(!r.mistakes)delta.cleanWin=1;}
 }
 if(event.type==='pick'||event.type==='finish')r.score=Math.max(r.score||0,event.score||0);
 return {run:r,delta};
}
export function advanceChallenge(q,run,delta){
 if(q.progress>=q.target)return q;
 const parts=q.parts.map(p=>{
  const value=Array.isArray(run[p.id])?run[p.id].length:run[p.id]||0;
  const progress=Math.min(p.target,p.kind==='best'?Math.max(p.progress||0,value):(p.progress||0)+(delta[p.id]||0));
  return {...p,progress};
 });return {...q,parts,progress:parts.reduce((n,p)=>n+p.progress,0)};
}
