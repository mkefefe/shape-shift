import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as e from './engine.js';
import {consume} from './economy.js';
const base=()=>e.createRun(()=>0);
const pickup=s=>e.advanceBoard(e.choose(s,[{special:'hourglass'}],0));
const round=s=>e.advanceBoard(e.choose(s,[s.current],0));
test('pickup is automatic, cannot be toggled off, and consumes no inventory ability',()=>{
 const s=pickup(base());assert.equal(s.pickupSlowRounds,3);assert.equal(s.slowRounds,0);assert.equal(s.freeze,1);
 assert.equal(e.abilityActive(s,'freeze'),false);assert.equal(e.stopAbility(s,'freeze'),s);assert.equal(e.elapsedBoardTime(1000,s),500);
});
test('both activation orders produce quarter-speed time with independent lifetimes',()=>{
 for(const first of ['pickup','boost']){
  let s=first==='pickup'?e.spendAbility(pickup(base()),'freeze'):pickup(e.spendAbility(base(),'freeze'));
  assert.equal(s.slowRounds,5);assert.equal(s.pickupSlowRounds,3);assert.equal(e.elapsedBoardTime(1000,s),250);
  for(let n=0;n<3;n++)s=round(s);
  assert.equal(s.pickupSlowRounds,0);assert.equal(s.slowRounds,2);assert(s.slow);assert.equal(e.elapsedBoardTime(1000,s),500);
  s=round(round(s));assert.equal(e.elapsedBoardTime(1000,s),1000);assert.equal(s.slow,false);
 }
});
test('stopping or expiring the inventory boost preserves the remaining pickup time',()=>{
 let s=e.spendAbility(base(),'freeze');for(let i=0;i<4;i++)s=round(s);s=pickup(s);
 assert.equal(s.slowRounds,1);assert.equal(s.pickupSlowRounds,3);
 const stopped=e.stopAbility(s,'freeze');assert.equal(stopped.pickupSlowRounds,3);assert(stopped.slow);assert.equal(e.elapsedBoardTime(1000,stopped),500);
 s=round(s);assert.equal(s.slowRounds,0);assert.equal(s.pickupSlowRounds,2);assert.equal(e.elapsedBoardTime(1000,s),500);
 const resumed=e.spendAbility(s,'freeze');assert.equal(resumed.pickupSlowRounds,2);assert.equal(e.elapsedBoardTime(1000,resumed),250);
});
test('another pickup refreshes only its own duration and cannot create unlimited slowdown',()=>{
 let s=round(e.spendAbility(pickup(base()),'freeze'));assert.equal(s.slowRounds,4);
 s=pickup(s);assert.equal(s.pickupSlowRounds,3);assert.equal(s.slowRounds,4);assert.equal(e.timeSlowRate(s),.25);
});
test('partial Crown boards and local pickups do not burn either duration per tile',()=>{
 let s=e.spendAbility(pickup(base()),'freeze');s={...s,sweepPending:true,picks:12,stage:12};let b=e.makeBoard(s);
 s=e.advanceBoard(e.choose(s,b,0));assert.equal(s.slowRounds,5);assert.equal(s.pickupSlowRounds,3);
});
test('actual bottom-button handler starts a separate paid ability and stops only that ability',()=>{
 const source=fs.readFileSync(new URL('./game.js',import.meta.url),'utf8');
 const extract=name=>{const start=source.indexOf('function '+name+'(');let depth=0;for(let i=source.indexOf('{',start);i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'&&!--depth)return source.slice(start,i+1);}throw Error(name);};
 const c={...e,state:pickup(base()),profile:{coins:0,inventory:{freeze:2}},autoPowers:new Set(),consume,active:true,paused:false,locked:false,rockFills:[],actions:[],ranked:null,runMode:'endless',analytics:{count(){}},runBoostUnlocked:()=>true,abilityGuideOpen:()=>false,saveProfile(){},trackRankedActions:()=>Promise.resolve(),$:()=>({}),update(){},timer(){},sound(){}};
 c.starBoosts={};c.boostCharges=name=>(c.profile.inventory[name]||0)+(c.starBoosts[name]||0);
 vm.createContext(c);vm.runInContext(extract('chargePower')+extract('ability')+";ability('freeze');",c);
 assert.equal(c.profile.inventory.freeze,1);assert.equal(c.state.slowRounds,5);assert.equal(c.state.pickupSlowRounds,3);assert.equal(e.elapsedBoardTime(1000,c.state),250);assert.equal(c.actions[0].type,'ability');
 vm.runInContext("ability('freeze');",c);assert.equal(c.state.slowRounds,0);assert.equal(c.state.pickupSlowRounds,3);assert.equal(e.elapsedBoardTime(1000,c.state),500);assert.equal(c.profile.inventory.freeze,1);assert.equal(c.actions[1].type,'stopAbility');
});


test('Adventure task supply is consumed before owned stock and never saved into inventory',()=>{
 const source=fs.readFileSync(new URL('./game.js',import.meta.url),'utf8');
 const start=source.indexOf('function chargePower(');let end=start,depth=0;for(let i=source.indexOf('{',start);i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'&&!--depth){end=i+1;break;}}
 const c={...e,state:base(),profile:{coins:13,inventory:{freeze:2}},starBoosts:{freeze:1},consume,runMode:'adventure',levelPickStats:{},trackLevelAbility:(s,n)=>({...s,[n]:true}),actions:[],ranked:null,analytics:{count(){}},runBoostUnlocked:()=>true,saveProfile(){},trackRankedActions:()=>Promise.resolve()};
 vm.createContext(c);vm.runInContext(source.slice(start,end)+";chargePower('freeze');",c);
 assert.equal(c.starBoosts.freeze,0);assert.equal(c.profile.inventory.freeze,2);assert.equal(c.profile.coins,13);assert.equal(c.levelPickStats.freeze,true);assert.equal(c.state.slowRounds,5);
});
