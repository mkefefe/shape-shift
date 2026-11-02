// Short authored breaks in the matching journey; standalone Games stay endless.
export function adventureChallenge(level){
 const n=Number(level);if(!Number.isInteger(n)||n<5||n>100||n%5)return null;
 const index=n/5-1,mode=['drop','slice','piano'][index%3],tier=Math.floor(index/3);
 const target=({drop:8,slice:16,piano:12})[mode]+tier*({drop:2,slice:3,piano:2})[mode];
 return {level:n,mode,name:({drop:'Shape Drop',slice:'Shape Slice',piano:'Piano Flow'})[mode],target,limit:120,starTime:75};
}
export function challengeTasks(c){return [
 {type:'challengeScore',target:c.target,label:'Reach '+c.target+' points'},
 {type:'time',target:c.starTime,label:'Finish within 1m 15s'},
 c.mode==='drop'?{type:'bestCombo',target:2,label:'Make a combo of 2 or more'}:{type:'wrong',target:0,label:'Finish without losing a heart'}
 ];}
export function challengeStats(game,c){return {won:game.score>=c.target,challengeScore:game.score,elapsed:game.time*1000,wrong:Math.max(0,(game.maxLives||3)-(game.lives??3)),bestCombo:game.bestCombo||0};}
export function challengeFinished(game,c){return !!c&&!game.practice&&(game.score>=c.target||game.time>=c.limit);}
export function createAdventureChallengeRun({getChallenge=()=>null,onResult=()=>({})}={}){
 let challenge=null,hud=null,outcome=null;
 return {start(dialog){challenge=getChallenge();outcome=null;hud?.remove();hud=null;if(challenge){hud=document.createElement('div');hud.className='adventure-challenge-hud';dialog.append(hud);}},
 step(game){if(!challenge||!game)return;const left=Math.max(0,Math.ceil(challenge.limit-game.time));if(hud)hud.textContent='Level '+challenge.level+' · '+Math.min(game.score,challenge.target)+' / '+challenge.target+' · '+left+'s';if(!game.over&&challengeFinished(game,challenge))game.end('challenge');},
 result(game,stored){if(!challenge)return {};if(!stored)return {};outcome??=onResult(challenge,challengeStats(game,challenge));return outcome;},
 goals(card){if(!challenge)return;const list=document.createElement('ul');list.className='adventure-pause-goals';for(const task of challengeTasks(challenge)){const row=document.createElement('li');row.textContent=task.label;list.append(row);}card.append(list);},
 active:()=>!!challenge};
}
