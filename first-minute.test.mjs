import test from 'node:test';
import assert from 'node:assert/strict';
import {createEndlessCoach} from './endless-coach.js';
test('five real-board steps teach shape, color and waiting without confirmation or restarting',()=>{
 let completed=0;
 const doc={querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>({classList:{remove(){}}}),defaultView:{removeEventListener(){}}};
 const coach=createEndlessCoach({doc,complete:()=>completed++});
 let current={shape:0,color:0};
 for(let step=0;step<5;step++){
  assert.equal(coach.introducing,false);
  const board=coach.board({current,excludedShape:null});
  const match=board.findIndex(t=>t.shape===current.shape||t.color===current.color);
  if(step===3){assert.equal(match,-1);assert.equal(coach.timerRunning,true);assert.equal(coach.accept(null),true);}
  else{assert.notEqual(match,-1);assert.equal(coach.timerRunning,false);assert.equal(coach.accept(match),true);current=board[match];}
 }
 assert.equal(completed,1);assert.equal(coach.active,false);
});
