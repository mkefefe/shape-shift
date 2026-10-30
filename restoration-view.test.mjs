import test from 'node:test';
import assert from 'node:assert/strict';
import {restorationView} from './restoration-view.js';

const taskSummary=(overrides={})=>({
 completed:false,requiredMode:'endless',xpReady:false,
 task:{mode:'endless',type:'xp',title:'Collect 18 Color in Endless',current:6,target:18,complete:false},
 ...overrides
});

test('opening or invalid selection shows the currently required mode and progress',()=>{
 for(const selected of [undefined,'removed-mode']){
  const view=restorationView(taskSummary(),selected);
  assert.equal(view.mode.id,'endless');assert.equal(view.mode.action,'Play Endless');
  assert.equal(view.required,true);assert.equal(view.heading,'Required task');
  assert.equal(view.title,'Collect 18 Color in Endless');assert.equal(view.progress,'6 / 18 Color');
  assert.equal(view.ratio,1/3);
 }
});

test('locked modes explain their requirement and cannot offer a play action',()=>{
 const view=restorationView({...taskSummary(),access:{battle:{unlocked:false,requirement:'Restore the western garden to unlock Battle'}}},'battle');
 assert(view.locked);assert.equal(view.action,'Locked');assert.equal(view.required,false);assert.match(view.title,/western garden/);
});
test('each available mode shows its own required task and progress',()=>{
 const summary={...taskSummary(),tasks:[taskSummary().task,{mode:'adventure',type:'xp',title:'Collect 10 Color in Adventure',current:4,target:10,complete:false}]};
 const view=restorationView(summary,'adventure');assert.equal(view.progress,'4 / 10 Color');assert(view.required);assert.equal(view.ratio,.4);
});

test('completing all tasks offers restoration instead of another game',()=>{
 const summary=taskSummary({tasksComplete:true,readyToRestore:true,task:{...taskSummary().task,current:18,complete:true}});
 const view=restorationView(summary);
 assert.equal(view.heading,'Task complete');assert.equal(view.progress,'18 / 18 Color');
 assert.equal(view.ratio,1);assert.equal(view.complete,false);
 assert.equal(view.note,'All tasks complete. Restore color when you’re ready.');assert.equal(view.action,'Restore color');
});

test('a fully restored world defaults to Adventure with no obsolete task or bar',()=>{
 const summary={completed:true,requiredMode:null,task:null,xpReady:true};
 const view=restorationView(summary);
 assert.equal(view.mode.id,'adventure');assert.equal(view.mode.action,'Continue Adventure');
 assert.equal(view.complete,true);assert.equal(view.required,false);
 assert.equal(view.heading,'Your island is restored');
 assert.equal(view.note,'Keep playing your favorite modes.');
 assert.equal(view.progress,'');assert.equal(view.ratio,0);
 assert.equal(restorationView(summary,'endless').mode.action,'Play Endless');
});

test('Games selects the shared minigame task and offers the hub instead of one specific game',()=>{
 const view=restorationView(taskSummary({requiredMode:'games',task:{mode:'games',type:'xp',title:'Collect 20 Color in Games',current:10,target:20,complete:false}}));
 assert.equal(view.mode.id,'games');assert.equal(view.mode.action,'Choose a game');
 assert.equal(view.required,true);assert.equal(view.title,'Collect 20 Color in Games');
 assert.equal(view.progress,'10 / 20 Color');assert.equal(view.ratio,.5);
});

test('first Adventure win is displayed as a win count instead of XP',()=>{
 const view=restorationView(taskSummary({requiredMode:'adventure',task:{mode:'adventure',type:'win',title:'Win an Adventure level',current:0,target:1,complete:false}}));
 assert.equal(view.mode.id,'adventure');assert.equal(view.progress,'0 / 1');
 assert.equal(view.mode.action,'Continue Adventure');assert.equal(view.ratio,0);
});
