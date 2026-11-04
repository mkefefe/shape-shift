import {adventurePianoSpec} from './adventure-piano.js?v=494241';
import {adventureDropSpec} from './adventure-drop.js?v=494241';
import {adventureSliceSpec} from './adventure-slice.js?v=494241';
// Adventure stages have a finite, written ending. A score target is evaluated
// after that ending; reaching it never removes notes or interrupts a wave.
export function adventureChallenge(level){
 const n=Number(level);if(!Number.isInteger(n)||n<5||n>=100||n%5)return null;
 const index=n/5-1,mode=['drop','slice','piano'][index%3],tier=Math.floor(index/3);
 const written=({drop:adventureDropSpec,slice:adventureSliceSpec,piano:adventurePianoSpec})[mode](n);
 const target=mode==='piano'?written.target:({drop:8,slice:16})[mode]+tier*({drop:2,slice:3})[mode];
 return {level:n,mode,name:({drop:'Shape Drop',slice:'Shape Slice',piano:'Piano Flow'})[mode],...written,target,starTime:75};
}
export const challengeMetric=(game,c)=>Math.max(0,Number(c.mode==='piano'?game.hits:game.score)||0);
export const challengeGoal=c=>c.mode==='piano'?'Play '+c.target+' notes':'Reach '+c.target+' points';
export const challengeEnding=c=>({piano:'Finish the piece',slice:'Complete every wave',drop:'Use every drop and let the board settle'})[c.mode];
export function challengeDescription(c){return c.mode==='piano'?c.title+' · '+c.noteCount+' notes':c.mode==='slice'?c.title+' · '+c.waveCount+' waves':c.title+' · '+c.pieceCount+' drops';}
export function challengeTasks(c){
 const second=c.mode==='piano'?{type:'challengeScore',target:c.noteCount,label:'Play all '+c.noteCount+' notes'}:c.mode==='slice'?{type:'bestCombo',target:3,label:'Slice a combo of 3 or more'}:{type:'time',target:c.starTime,label:'Finish within 1m 15s'};
 return [{type:'challengeScore',target:c.target,label:challengeGoal(c)},second,c.mode==='drop'?{type:'bestCombo',target:2,label:'Make a combo of 2 or more'}:{type:'wrong',target:0,label:'Finish without losing a heart'}];
}
export function challengeStats(game,c){
 const complete=challengeFinished(game,c),value=challengeMetric(game,c);
 return {won:complete&&game.lives!==0&&value>=c.target,stageComplete:complete?1:0,challengeScore:value,elapsed:game.time*1000,wrong:Math.max(0,(game.maxLives||3)-(game.lives??3)),bestCombo:game.bestCombo||0};
}
export function challengeFinished(game,c){return !!c&&!game.practice&&game.stageComplete===true;}
export function challengeHud(game,c){
 if(game.practice)return 'Level '+c.level+' · Practice first';
 const score=challengeMetric(game,c),goal=score>=c.target?'Goal reached':Math.min(score,c.target)+' / '+c.target+(c.mode==='piano'?' notes':' points');
 const progress=game.stageProgress;
 const left=progress&&Number.isFinite(progress.total)?Math.max(0,progress.total-progress.done):null;
 const sequence=left===null?challengeEnding(c):left===0?({piano:'Finishing the piece',slice:'Clearing the last wave',drop:'Letting the board settle'})[c.mode]:left+' '+({piano:left===1?'note':'notes',slice:left===1?'wave':'waves',drop:left===1?'drop':'drops'})[c.mode]+' left';
 return 'Level '+c.level+' · '+goal+'\n'+sequence;
}
export function createAdventureChallengeRun({getChallenge=()=>null,onResult=()=>({})}={}){
 let challenge=null,hud=null,outcome=null;
 return {start(dialog){challenge=getChallenge();outcome=null;hud?.remove();hud=null;if(challenge){hud=document.createElement('div');hud.className='adventure-challenge-hud';dialog.append(hud);}},
 step(game){if(!challenge||!game)return;if(hud){const copy=challengeHud(game,challenge);if(hud.textContent!==copy)hud.textContent=copy;}if(!game.over&&challengeFinished(game,challenge))game.end('stage-complete');},
 result(game,stored){if(!challenge)return {};if(!stored)return {};outcome??=onResult(challenge,challengeStats(game,challenge));return outcome;},
 goals(card){if(!challenge)return;const list=document.createElement('ul');list.className='adventure-pause-goals';for(const task of [{label:challengeEnding(challenge)},...challengeTasks(challenge)]){const row=document.createElement('li');row.textContent=task.label;list.append(row);}card.append(list);},
 pause(card,{panel,button,resume,exit}){if(!challenge)return false;
  const showPause=()=>{const view=panel('Paused');view.classList.add('drop-pause-panel');this.pause(view,{panel,button,resume,exit});};
  const showTasks=()=>{const view=panel('Level '+challenge.level+' tasks');view.classList.add('adventure-task-panel');this.goals(view);view.append(button('Back',showPause));view.querySelector('button').focus();};
  card.append(button('Resume',resume),button('Level tasks',showTasks),button('Main menu',exit));return true;
 },
 active:()=>!!challenge};
}
