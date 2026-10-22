import {playerLevel} from './economy.js?v=49439-web10';

// Each entry is ONE gameplay challenge, not a bundle of unrelated objectives.
// Four mastery stages deliberately revisit skills at a higher difficulty.
const rules=[];
const add=(mode,key,title,text,kind,targets,options={})=>rules.push({mode,key,title,text,kind,targets,...options});
const main=(mode)=>{
 const label=mode==='adventure'?'Adventure':'Endless';
 add(mode,'correct','Find your flow',`Make {n} correct picks in one ${label} run`,'run',[8,18,35,60]);
 add(mode,'clean','Unbroken',`Make {n} consecutive correct picks in ${label}`,'streak',[5,12,24,40]);
 add(mode,'colorRoute','Follow the color',`Make {n} color-only matches in one ${label} run`,'run',[3,6,10,16]);
 add(mode,'shapeRoute','Follow the shape',`Make {n} shape-only matches in one ${label} run`,'run',[3,6,10,16]);
 add(mode,'switchRule','Change tactics',`Alternate color-only and shape-only matches {n} times in a row in ${label}`,'streak',[2,3,4,6]);
 add(mode,'colorTravel','Color journey',`Change color on {n} consecutive correct picks in ${label}`,'streak',[3,5,7,10]);
 add(mode,'shapeTravel','Shape journey',`Change shape on {n} consecutive correct picks in ${label}`,'streak',[3,5,7,10]);
 add(mode,'palette','Full palette',`Use all four colors within {n} correct picks in ${label}`,'window',[12,10,8,6],{field:'color',distinct:4});
 add(mode,'silhouettes','Shape sampler',`Use all four shapes within {n} correct picks in ${label}`,'window',[12,10,8,6],{field:'shape',distinct:4});
 add(mode,'gallery','Collector',`Use {n} different shape/color combinations in one ${label} run`,'unique',[5,8,12,16],{field:'icon'});
 add(mode,'colorReturn','Color boomerang',`Return to a color after a different color {n} times in one ${label} run`,'run',[2,4,7,10]);
 add(mode,'shapeReturn','Shape boomerang',`Return to a shape after a different shape {n} times in one ${label} run`,'run',[2,4,7,10]);
 add(mode,'quick','Quick decisions',`Make {n} consecutive correct picks within 1.8 seconds each in ${label}`,'streak',[4,8,12,18]);
 add(mode,'recovery','Find your footing',`Make {n} correct picks in a row after losing a heart in ${label}`,'streak',[3,6,10,15]);
};
main('adventure');
add('adventure','win','Finish the trail','Win {n} Adventure levels (replays count)','total',[1,2,3,5]);
add('adventure','cleanWin','Flawless finish','Win {n} Adventure levels without losing a heart','total',[1,2,3,4]);
add('adventure','memory','Remember the reveal','Collect {n} revealed memory cards in one Adventure run','run',[2,3,4,5],{adventure:21});
add('adventure','fastWin','Decisive victory','Win an Adventure level averaging at most {n} seconds per correct pick','finish',[3,2.5,2,1.5]);
add('adventure','variedWin','Colorful victory','Win an Adventure level using at least {n} different shape/color combinations','finish',[3,4,5,6]);
add('adventure','comebackWin','Turn it around','Win {n} Adventure levels after losing a heart','total',[1,2,3,4]);
main('endless');
add('endless','survive','Keep going','Survive {n} seconds in Endless with at least one correct pick every 10 seconds','survive',[30,45,60,90]);
add('endless','lateClean','Second wind','After 30 seconds, make {n} consecutive correct Endless picks','streak',[5,10,18,25]);
add('endless','crowded','Crowd reader','Make {n} correct picks with at least 9 choices in one Endless run','run',[4,8,14,22]);
add('endless','lastHeart','Stay composed','Make {n} correct Endless picks on your last heart','run',[3,5,8,12]);
add('endless','latePalette','Late palette','After 30 seconds, use {n} different colors in one Endless run','unique',[2,3,4,4],{field:'color',minTime:30});
add('endless','fastRoute','Fast route','Make {n} color-only matches within 1.2 seconds each in one Endless run','run',[3,6,10,15]);

add('drop','match','Clear the pile','Make {n} matches in one Shape Drop run','run',[5,12,25,40]);
add('drop','three','Bridge builder','Clear at least 3 pieces together {n} times in one Shape Drop run','run',[1,2,3,5]);
add('drop','four','Big connection','Clear at least 4 pieces together {n} times in one Shape Drop run','run',[1,2,3,4]);
add('drop','colorLink','Color connection','Clear a group of different shapes sharing one color {n} times in one run','run',[1,3,5,8]);
add('drop','shapeLink','Shape connection','Clear a group of different colors sharing one shape {n} times in one run','run',[1,3,5,8]);
add('drop','bridge','Two-way bridge','Clear a group containing multiple colors AND multiple shapes {n} times in one run','run',[1,2,4,6]);
add('drop','sizeMix','Size mixer','Clear pieces of different sizes together {n} times in one run','run',[2,4,7,10]);
add('drop','large','Heavy lifting','Clear {n} large pieces in one Shape Drop run','run',[3,6,10,16]);
add('drop','small','Little victories','Clear {n} small pieces in one Shape Drop run','run',[4,8,14,20]);
add('drop','airborne','Catch on contact','Make {n} clears involving a piece less than a second old in one run','run',[2,4,7,10]);
add('drop','chain','Chain reaction','Reach a Shape Drop chain of {n}','best',[2,3,4,5]);
add('drop','left','Left pocket','Make {n} clears in the left third of the container in one run','run',[2,4,6,9]);
add('drop','right','Right pocket','Make {n} clears in the right third of the container in one run','run',[2,4,6,9]);
add('drop','center','Center stage','Make {n} clears in the middle third of the container in one run','run',[3,5,8,12]);
add('drop','sides','Across the glass','Alternate left-half and right-half clears {n} times in a row','streak',[3,4,5,6]);
add('drop','palette','Paint the glass','Clear all four colors within {n} clearing groups','window',[10,8,6,4],{field:'colors',distinct:4});
add('drop','gallery','Shape collection','Clear {n} different shape/color combinations in one run','unique',[5,8,12,16],{field:'icons'});
add('drop','obstacle','Work around it','Make {n} clears while a locked block remains in the container','run',[2,4,7,10]);
add('drop','low','Low profile','Make {n} clears in the bottom third of the container in one run','run',[3,5,8,12]);
add('drop','rescue','Room to breathe','Clear pieces in the top third {n} times in one run','run',[1,2,3,5]);

add('slice','cut','Slice practice','Slice {n} shapes in one run','run',[12,25,50,80]);
add('slice','clean','Untouchable','Slice {n} shapes consecutively without losing a heart','streak',[8,16,30,50]);
add('slice','rising','On the rise','Slice {n} rising shapes in one run','run',[5,10,18,30]);
add('slice','falling','Catch the fall','Slice {n} falling shapes in one run','run',[5,10,18,30]);
add('slice','apex','At the peak','Slice {n} shapes close to the peak of their arc in one run','run',[2,4,7,10]);
add('slice','upCut','Upward sweep','Slice {n} shapes with upward strokes in one run','run',[4,8,14,22]);
add('slice','downCut','Downward sweep','Slice {n} shapes with downward strokes in one run','run',[4,8,14,22]);
add('slice','horizontal','Side swipe','Slice {n} shapes with mostly horizontal strokes in one run','run',[4,8,14,22]);
add('slice','diagonal','Diagonal sweep','Slice {n} shapes with diagonal strokes in one run','run',[4,8,14,22]);
add('slice','combo','One flowing cut','Slice {n} shapes in a single quick swipe','best',[2,3,4,5]);
add('slice','doubles','Double time','Make {n} two-shape swipe combos in one run','run',[2,4,6,10]);
add('slice','palette','Rainbow sweep','Slice all four colors within {n} consecutive shapes','window',[12,10,8,6],{field:'color',distinct:4});
add('slice','gallery','All kinds','Slice {n} different shape/color combinations in one run','unique',[5,8,12,16],{field:'icon'});
add('slice','alternating','Rise and fall','Alternate slicing rising and falling shapes {n} times consecutively','streak',[3,4,5,6]);
add('slice','recovery','Back in action','Slice {n} shapes without another lost heart after a mistake','streak',[4,8,12,18]);
add('slice','hazardFree','Steady blade','Slice {n} shapes in a run without hitting a bomb','cleanRun',[12,24,40,65]);
add('slice','waveSet','Wave explorer','Slice shapes from {n} different waves in one run','unique',[4,8,12,18],{field:'wave'});
add('slice','late','Keep your focus','After 30 seconds, slice {n} shapes without losing a heart','streak',[6,12,20,30]);
add('slice','small','Fine aim','Slice {n} smaller shapes (radius under 29) in one run','run',[4,8,14,22]);
add('slice','large','Big sweep','Slice {n} larger shapes (radius at least 29) in one run','run',[4,8,14,22]);

add('piano','note','Find the melody','Complete {n} notes in one Piano Flow run','run',[12,25,45,70]);
add('piano','clean','Clear melody','Complete {n} notes consecutively without losing a heart','streak',[8,16,30,50]);
add('piano','hold','Sustain','Finish {n} hold notes in one run','run',[2,4,7,10]);
add('piano','longHold','Long breath','Finish {n} holds lasting at least 2 seconds in one run','run',[1,2,3,5]);
add('piano','shortHold','Brief sustain','Finish {n} holds lasting under 2 seconds in one run','run',[2,4,6,9]);
add('piano','resume','Pick up the thread','Finish {n} hold notes after releasing and resuming them','run',[1,2,3,4]);
add('piano','unbrokenHold','One breath','Finish {n} holds without releasing early in one run','run',[2,4,6,10]);
add('piano','afterHold','Back to the beat','Complete a tap immediately after a completed hold {n} times in one run','run',[2,4,6,9]);
add('piano','beforeHold','Into the sustain','Complete a hold immediately after a tap {n} times in one run','run',[2,4,6,9]);
add('piano','ascending','Climb the keys','Complete {n} consecutive notes with increasing pitches','streak',[2,3,4,5]);
add('piano','descending','Down the keys','Complete {n} consecutive notes with decreasing pitches','streak',[2,3,4,5]);
add('piano','turnaround','Melody turns','Change pitch direction {n} times in one run','run',[3,6,10,16]);
add('piano','stepwise','Neighboring keys','Complete {n} pitch steps of 1 or 2 semitones in one run','run',[4,8,12,20]);
add('piano','leaps','Musical leaps','Complete {n} pitch jumps of at least 5 semitones in one run','run',[3,6,10,15]);
add('piano','lanes','Across the piano','Play all four strips within {n} completed notes','window',[12,10,8,6],{field:'lane',distinct:4});
add('piano','register','Note collection','Play {n} different pitches in one run','unique',[5,8,12,16],{field:'pitch'});
add('piano','cross','Cross the keyboard','Complete {n} moves between non-neighboring strips in one run','run',[3,6,10,16]);
add('piano','recovery','Recover the tune','Complete {n} consecutive notes after losing a heart','streak',[4,8,12,18]);
add('piano','late','Encore','After 30 seconds, complete {n} consecutive notes without losing a heart','streak',[6,12,20,30]);
add('piano','holdPalette','Sustained colors','Finish holds in {n} different colors in one run','unique',[2,3,4,4],{field:'color'});

export const JOURNEY_RULES=rules;
const labels={adventure:'Adventure',endless:'Endless',drop:'Shape Drop',slice:'Shape Slice',piano:'Piano Flow'};
export const QUEST_JOURNEY=Array.from({length:4},(_,stage)=>rules.map(r=>{
 const parameter=r.targets[stage],target=['window','finish'].includes(r.kind)?1:parameter;
 const difficulty=null,minScore=r.mode==='endless'?[0,25,75,150][stage]:0;
 const level=['drop','slice','piano'].includes(r.mode)?[25,30,40,50][stage]:[1,8,18,30][stage];
 const text=r.text.replace('{n}',parameter).replace(/\b1 Adventure levels\b/g,'1 Adventure level').replace(/\b1 holds\b/g,'1 hold').replace(/\b1 times\b/g,'once').replace(/\b1 Adventure levels\b/g,'1 Adventure level').replace(/\b1 holds\b/g,'1 hold').replace(/\b1 times\b/g,'once')+(r.key==='holdPalette'&&stage===3?' (after 30 seconds)':'')+(minScore?' (after reaching '+minScore+' points)':'');
 return {type:'journey',catalogue:4,rule:r.key,mode:r.mode,kind:r.kind,field:r.field||null,distinct:r.distinct||null,minTime:r.minTime||0,parameter,target,progress:0,reward:100,level,difficulty,minScore,adventure:r.key==='memory'?[20,20,35,50][stage]:r.adventure||0,stage,title:labels[r.mode]+' - '+r.title,description:text,hint:['total'].includes(r.kind)?'Progress carries over between runs.':'Complete this challenge in one run. Your best attempt stays visible.',runtime:{}};
})).flat().map((q,i)=>({...q,id:'normal-'+(i+1),sequence:i+1}));
export function journeyQuest(sequence){const q=QUEST_JOURNEY[sequence-1];return q?{...q,runtime:{}}:null;}
export function questAvailable(q,p){return playerLevel(p)>=q.level&&(!q.adventure||(p.adventureCompleted||0)+1>=q.adventure);}
export function journeyDailyPool(p){return QUEST_JOURNEY.filter(q=>q.stage===0&&questAvailable(q,p)).map(q=>({...q,reward:50,runtime:{}}));}

// Store only small counters and distinct values, never physics bodies or note arrays.
export function advanceJourney(q,e,p){
 if(q.progress>=q.target||!questAvailable(q,p)||e.mode!==q.mode)return q;
 if(e.type==='start')return {...q,runtime:{count:0,misses:0,live:true}};
 let r={...q.runtime};if(!r.live)return q;
 if(e.type==='finish'){r.live=false;}
 if(e.failure){r.misses=(r.misses||0)+1;r.recovering=true;if(['streak','cleanRun','survive'].includes(q.kind))r.count=0;if(q.kind==='survive'){r.since=e.time;r.lastTime=e.time;}r.window=[];r.last=null;r.previous=null;r.direction=0;if(e.hazard)r.bomb=true;return {...q,runtime:r};}
 if(q.minScore&&!(e.score>=q.minScore))return {...q,runtime:r};
 const t={...(e.tile||{})},last=r.last,prev=r.previous,flags={};let value=1;
 if(e.type==='success'){
  flags.correct=flags.clean=flags.cut=flags.note=true;
  const dc=last?last.color!==t.color:false,ds=last?last.shape!==t.shape:false;
  if(e.mode==='adventure'||e.mode==='endless'){
   const b=e.before||last,co=b&&b.color===t.color&&b.shape!==t.shape,sh=b&&b.shape===t.shape&&b.color!==t.color;
   flags.colorRoute=co;flags.shapeRoute=sh;flags.fastRoute=co&&e.responseMs<=1200;
   const rule=co?'color':sh?'shape':null;flags.switchRule=!!rule&&!!r.matchRule&&rule!==r.matchRule;r.matchRule=rule;
   flags.colorTravel=b&&b.color!==t.color;flags.shapeTravel=b&&b.shape!==t.shape;
   flags.colorReturn=prev&&last&&t.color===prev.color&&dc;flags.shapeReturn=prev&&last&&t.shape===prev.shape&&ds;
   flags.quick=Number.isFinite(e.responseMs)&&e.responseMs<=1800;flags.memory=!!t.memory;
   flags.crowded=e.boardSize>=9;flags.lastHeart=e.lives===1;flags.lateClean=e.time>=30;
  }
  if(e.mode==='drop'){
   const pieces=e.pieces||[],colors=[...new Set(pieces.map(x=>x.color))],shapes=[...new Set(pieces.map(x=>x.shape))];
   t.colors=colors;t.icons=pieces.map(x=>x.color+':'+x.shape);flags.match=true;if(q.rule==='match')value=e.matches||1;
   flags.three=pieces.length>=3;flags.four=pieces.length>=4;
   flags.colorLink=colors.length===1&&shapes.length>1;flags.shapeLink=shapes.length===1&&colors.length>1;flags.bridge=colors.length>1&&shapes.length>1;
   flags.sizeMix=new Set(pieces.map(x=>Math.round(x.r))).size>1;
   flags.large=pieces.some(x=>x.r>=30);flags.small=pieces.some(x=>x.r<24);
   flags.airborne=pieces.some(x=>x.age<1);flags.chain=true;
   flags.left=e.x<320/3;flags.right=e.x>640/3;flags.center=!flags.left&&!flags.right;
   flags.sides=last&&last.side!==(e.x<160?'left':'right');t.side=e.x<160?'left':'right';
   flags.obstacle=!!e.obstacle;flags.low=e.y>e.height*2/3;flags.rescue=e.y<e.height/3;
   if(q.rule==='large')value=pieces.filter(x=>x.r>=30).length;
   if(q.rule==='small')value=pieces.filter(x=>x.r<24).length;
  }
  if(e.mode==='slice'){
   flags.rising=t.vy<0;flags.falling=t.vy>=0;flags.apex=Math.abs(t.vy)<100;
   flags.upCut=e.dy<0;flags.downCut=e.dy>0;flags.horizontal=Math.abs(e.dx)>Math.abs(e.dy)*2;
   flags.diagonal=Math.abs(e.dx)>0&&Math.abs(e.dy/e.dx)>=.5&&Math.abs(e.dy/e.dx)<=2;
   flags.combo=true;flags.doubles=e.combo===2;flags.alternating=last&&(last.vy<0)!==(t.vy<0);
   flags.hazardFree=!r.bomb;flags.small=t.r<29;flags.large=t.r>=29;
  }
  if(e.mode==='piano'){
   flags.hold=!!t.hold;flags.longHold=!!t.hold&&e.holdSeconds>=2;flags.shortHold=!!t.hold&&e.holdSeconds<2;
   flags.resume=!!t.hold&&!!t.resumed;flags.unbrokenHold=!!t.hold&&!t.resumed;
   flags.afterHold=last?.hold&&!t.hold;flags.beforeHold=last&&!last.hold&&!!t.hold;
   const diff=last?t.pitch-last.pitch:0,dir=Math.sign(diff);
   flags.ascending=diff>0;flags.descending=diff<0;flags.turnaround=!!dir&&!!r.direction&&dir!==r.direction;
   flags.stepwise=Math.abs(diff)>=1&&Math.abs(diff)<=2;flags.leaps=Math.abs(diff)>=5;flags.cross=last&&Math.abs(t.lane-last.lane)>=2;
   if(dir)r.direction=dir;flags.holdPalette=!!t.hold&&(q.stage<3||e.time>=30);
  }
  flags.recovery=!!r.recovering;flags.late=e.time>=30;
  t.icon=Number.isInteger(t.color)&&Number.isInteger(t.shape)?t.color+':'+t.shape:null;
  r.total=(r.total||0)+1;r.response=(r.response||0)+(e.responseMs||0);r.icons=[...new Set([...(r.icons||[]),...(t.icon?[t.icon]:[])])];
  r.previous=last||null;r.last={color:t.color??null,shape:t.shape??null,pitch:t.pitch??null,lane:t.lane??null,hold:t.hold??null,vy:t.vy??null,side:t.side??null};
 }
 if(e.type==='finish'){
  flags.win=!!e.won;flags.cleanWin=e.won&&!r.misses;flags.comebackWin=e.won&&r.misses>0;
  flags.fastWin=e.won&&r.total>0&&r.response/r.total<=q.parameter*1000;
  flags.variedWin=e.won&&(r.icons?.length||0)>=q.parameter;
 }
 const success=e.type==='success',eligible=success&&e.time>=q.minTime&&(!q.minScore||e.score>=q.minScore);
 if(q.kind==='window'&&success){r.window=[...(r.window||[]),[].concat(t[q.field]??[])].slice(-q.parameter);if(new Set(r.window.flat()).size>=q.distinct)r.count=1;}
 else if(q.kind==='unique'&&eligible&&(q.rule!=='holdPalette'||flags.holdPalette)){
  r.values=[...new Set([...(r.values||[]),...[].concat(t[q.field]??[])])];r.count=r.values.length;
 }else if(q.kind==='survive'&&success){if(r.lastTime!==undefined&&e.time-r.lastTime>10)r.since=e.time;r.since??=e.time;r.lastTime=e.time;r.count=e.time-r.since;}
 else if(q.kind==='best'&&flags[q.rule])r.count=Math.max(r.count||0,e.combo||0);
 else if(q.kind==='finish'&&flags[q.rule])r.count=1;
 else if(q.kind==='total'&&flags[q.rule])r.count=(r.count||0)+1;
 else if(success){if(flags[q.rule])r.count=(r.count||0)+value;else if(q.kind==='streak')r.count=0;}
 const progress=q.kind==='total'?Math.min(q.target,q.progress+(flags[q.rule]?1:0)):Math.min(q.target,Math.max(q.progress,Math.floor(r.count||0)));
 return {...q,progress,runtime:r};
}
