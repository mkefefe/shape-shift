import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as engine from './engine.js';
test('Cosmic repeats indefinitely every ten correct picks, excluding bonus picks',()=>{
 let s=engine.applyLoadout(engine.createRun(()=>0),'cosmic','garden');
 for(let round=0;round<30;round++){
  for(let n=1;n<=10;n++){s=engine.choose(s,[s.current],0);assert.equal(s.sweepPending,n===10);assert.equal(s.chainTarget,10);}
  const target={...s.current};let board=engine.makeBoard(s);
  assert(board.every(t=>t.bonusTile&&t.shape===target.shape&&t.color===target.color));
  if(round%2){s=engine.expire(s,board);assert.equal(s.chainProgress,0);}
  else for(let i=0;i<board.length;i++){s=engine.choose(s,board,i);assert.equal(s.chainProgress,0);if(s.sweepBoard)board=s.sweepBoard;}
  assert.equal(s.sweepPending,false);assert.equal(s.sweepBoard,null);
 }
});
test('pending Cosmic board overrides a partial refill and honors the new board size',()=>{
 const s={...engine.applyLoadout(engine.createRun(()=>0),'cosmic'),sweepPending:true,heldBoard:[{special:'heart'}],bombRefillBoard:[{special:'bomb'}]};
 const board=engine.makeBoard(s,()=>0,12);assert.equal(board.length,12);assert(board.every(t=>t.bonusTile&&t.shape===s.current.shape&&t.color===s.current.color));
});
test('actual nextBoard path refreshes Cosmic tiles and timer even with nearly expired time',()=>{
 const source=fs.readFileSync(new URL('./game.js',import.meta.url),'utf8');
 const start=source.indexOf('function nextBoard()');let depth=0,end=start;
 for(let i=source.indexOf('{',start);i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'&&!--depth){end=i+1;break;}}
 const timer=source.slice(source.indexOf('function timer()'),start);
 const node=()=>({children:[],style:{},dataset:{},classList:{contains(){return false;},remove(){},add(){},toggle(){}},setAttribute(k,v){this[k]=v;},append(n){this.children.push(n);},replaceChildren(){this.children=[];}});
 for(const stale of [false,true]){
  const nodes=Object.fromEntries(['board','timer','mode-hud','board-status'].map(k=>[k,node()]));nodes.timer.parentElement=node();
  let s=engine.applyLoadout(engine.createRun(()=>0),'cosmic');for(let i=0;i<10;i++)s=engine.choose(s,[s.current],0);
  if(stale)s={...s,heldBoard:[s.current],bombRefillBoard:[s.current]};
  const c={...engine,openingCoach:null,state:s,board:[],remaining:1,boardTime:2800,transition:460,locked:true,boardSerial:4,runMode:'endless',runRng:()=>0,adventureLevel:1,rockLayout:null,rockFills:[],rockFillElapsed:0,burstEffect:null,effectScoreBefore:0,visualStrikes:null,memoryCards:new Map([[0,{}]]),autoPowers:[],rushRemaining:0,
   $:id=>nodes[id],document:{createElement:node},fitBoard(){},prepareAdventureMechanic(){},chargePower(){},update(){},trackAchievements(){},sprite(){},paintMemory(){},tileName:t=>t.shape+' '+t.color,resolve(){},adventureLayout:(level,size)=>({name:'test',columns:3,cells:Array.from({length:size},(_,i)=>i+1)})};
  vm.createContext(c);vm.runInContext(timer+source.slice(start,end)+';nextBoard();',c);
  assert.equal(c.remaining,c.boardTime);assert(c.remaining>1);assert.equal(nodes.timer.style.transform,'scaleX(1)');assert.equal(nodes.timer.parentElement['aria-valuenow'],100);
  assert.equal(c.boardSerial,5);assert.equal(c.locked,false);assert.equal(c.transition,0);assert.equal(c.memoryCards.size,0);
  assert(c.board.every(t=>t.shape===s.current.shape&&t.color===s.current.color&&t.bonusTile));
  vm.runInContext('remaining-=100;timer();',c);assert(nodes.timer.parentElement['aria-valuenow']<100);
 }
});
