import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from './combat.mjs';
import {showEnemyHit} from './enemy-impact.mjs';

function feedback(){
 const healthText={textContent:'100 / 100'},healthFill={style:{width:'100%'}},animations=[],numbers=[];
 const enemy={animate(frames,options){
  let complete,abort;
  const reaction={frames,options,cancelled:false,finished:new Promise((resolve,reject)=>{complete=resolve;abort=reject;}),cancel(){this.cancelled=true;abort(new DOMException('Animation cancelled','AbortError'));},complete:()=>complete()};
  animations.push(reaction);return reaction;
 }};
 return {enemy,healthText,healthFill,animations,numbers,at:{x:120,y:160},pop:(...args)=>numbers.push(args)};
}

test('bomb impact updates health and damage feedback before its recoil finishes',async()=>{
 const ui=feedback(),state={enemyHp:30,enemyMaxHp:80};
 const reaction=showEnemyHit({...ui,state,damage:50,heavy:true});
 let completed=false;reaction.finished.then(()=>{completed=true;});
 await Promise.resolve();
 assert.equal(completed,false,'the impact reaction is still playing');
 assert.equal(ui.healthText.textContent,'30 / 80');
 assert.equal(ui.healthFill.style.width,'37.5%');
 assert.deepEqual(ui.numbers,[['−50',ui.at,undefined]]);
 assert.equal(ui.animations.length,1);
 reaction.complete();await reaction.finished;
});

test('bomb visibly recoils during wind-up and returns to the frozen attack pose',()=>{
 const ui=feedback(),pose='matrix(1.3, 0, 0, 1.3, 0, 0)';
 const reaction=showEnemyHit({...ui,state:{enemyHp:40,enemyMaxHp:90},damage:50,heavy:true,windingUp:true,pose});
 assert.equal(reaction.frames[0].transform,pose);
 assert.equal(reaction.frames.at(-1).transform,pose);
 assert.ok(reaction.frames.some(frame=>frame.transform!==pose&&frame.transform.includes(pose)),
  'a bomb must move the enemy even while an attack is winding up, not only flash its brightness');
 assert.ok(reaction.options.duration>=400,'leave time to see the heavy hit');
 reaction.complete();
});

test('a lethal bomb shows zero health at the impact, with the actual damage number',()=>{
 const run=createRun(()=>.8,10,0,'bomb'),ui=feedback();
 run.state.enemyHp=40;run.state.enemyMaxHp=40;
 const result=run.pick(run.state.board.findIndex(tile=>tile.special==='bomb'));
 const reaction=showEnemyHit({...ui,state:run.state,damage:result.damage,heavy:true});
 assert.equal(run.state.status,'cleared');
 assert.equal(ui.healthText.textContent,'0 / 40');
 assert.equal(ui.healthFill.style.width,'0%');
 assert.equal(ui.numbers[0][0],'−40','do not show overkill as extra damage');
 assert.equal(ui.animations.length,1,'the lethal hit still gets an impact reaction');
 reaction.complete();
});

test('ordinary hits keep their short reaction and immediate health feedback',()=>{
 const ui=feedback();
 const reaction=showEnemyHit({...ui,state:{enemyHp:70,enemyMaxHp:100},damage:10});
 assert.equal(ui.healthText.textContent,'70 / 100');
 assert.equal(ui.healthFill.style.width,'70%');
 assert.equal(ui.numbers[0][0],'−10');
 assert.ok(reaction.frames.some(frame=>frame.transform!==reaction.frames[0].transform));
 assert.ok(reaction.options.duration<400);
 reaction.complete();
});

test('each Starburst arrival updates health and replaces the previous hit reaction',()=>{
 const run=createRun(()=>.8,10,5,'starburst'),ui=feedback();
 run.state.enemyHp=1000;run.state.enemyMaxHp=1000;
 const effect=run.pick(run.state.board.findIndex(tile=>tile.special==='starburst'));
 for(let i=0;i<effect.count;i++){
  const hit=run.starburstHit();
  showEnemyHit({...ui,state:run.state,damage:hit.damage});
  assert.equal(ui.healthText.textContent,`${1000-(i+1)*10} / 1000`);
  assert.equal(ui.healthFill.style.width,`${(1000-(i+1)*10)/10}%`);
  assert.equal(ui.numbers.length,i+1);
  if(i)assert.equal(ui.animations[i-1].cancelled,true,'older reactions cannot override the latest impact');
  assert.equal(ui.animations[i].cancelled,false);
 }
 assert.equal(ui.animations.length,5);
 ui.animations.at(-1).complete();
});
