import test from 'node:test';import assert from 'node:assert/strict';
import {adventureChallenge,challengeTasks,challengeFinished,challengeStats,challengeHud,createAdventureChallengeRun} from './adventure-challenges.js';
import {freshProfile,grantAdventureBoosts,buyCosmetic} from './economy.js';
import {normalizeAdventure,saveObjectiveStars,levelObjectives,levelRequirements,levelComplete,adventureMechanics,adventureDesign} from './world-menu.js';
test('nineteen short special stages rotate all three games and ordinary levels stay matching',()=>{
 let modes=[];for(let level=1;level<=100;level++){const c=adventureChallenge(level);assert.equal(!!c,level<100&&level%5===0);if(c){modes.push(c.mode);assert.equal(challengeTasks(c).length,3);assert(c.target>0&&c.target<60);}}
 assert.deepEqual(modes.slice(0,3),['drop','slice','piano']);assert.equal(modes.length,19);
});
test('a score target or elapsed time cannot cut an authored stage short',()=>{
 const c=adventureChallenge(5);assert(!challengeFinished({score:100,time:0,practice:true},c));
 assert(!challengeFinished({score:7,time:119},c));assert(!challengeFinished({score:800,time:1},c));assert(!challengeFinished({score:800,time:1200},c));
 assert(!challengeStats({score:800,time:1200,over:true},c).won);
 assert(!challengeFinished({stageComplete:true,practice:true},c));
 const stats=challengeStats({score:8,time:25,bestCombo:2,stageComplete:true},c);assert(stats.won);assert(levelObjectives(5,stats).every(o=>o.done));
 assert(!levelComplete(5,{challengeScore:800}));assert(levelComplete(5,stats));
 assert(!challengeStats({score:7,time:25,stageComplete:true},c).won);
 assert(!challengeStats({score:800,time:25,stageComplete:true,lives:0},c).won);
});
test('Piano goals require actual notes and the ending even with a score multiplier',()=>{
 const c=adventureChallenge(15);
 assert.equal(c.noteCount,c.target+2);
 assert(!challengeStats({score:1000,hits:c.target-1,time:30,stageComplete:true,lives:3},c).won);
 assert(!challengeStats({score:1000,hits:c.target,time:30,lives:3},c).won);
 const stats=challengeStats({score:1000,hits:c.noteCount,time:30,stageComplete:true,lives:3,maxLives:3},c);
 assert(stats.won);assert.equal(stats.challengeScore,c.noteCount);assert(levelObjectives(15,stats).every(o=>o.done));
 assert.match(challengeTasks(c)[0].label,/notes/);
});
test('the stage HUD keeps the remaining sequence visible after reaching the goal',()=>{
 const c=adventureChallenge(15),game={score:100,hits:c.target,stageProgress:{done:c.target,total:c.noteCount,label:'Notes'}};
 assert.equal(challengeHud(game,c),'Level 15 · Goal reached\n2 notes left');
 assert.equal(challengeHud({...game,stageProgress:{...game.stageProgress,done:c.noteCount}},c),'Level 15 · Goal reached\nFinishing the piece');
 assert.doesNotMatch(challengeHud(game,c),/120s|0s/);
 assert.match(challengeHud({...game,practice:true},c),/Practice first/);
});
test('mini-game stars survive normalization and do not unlock levels out of order',()=>{
 const p=normalizeAdventure({cleared:[true,true,true,true]});const next=saveObjectiveStars(p,5,2);assert(next.cleared[4]);assert.equal(normalizeAdventure(next).stars[4],2);assert.equal(saveObjectiveStars(p,10,3),p);
});
test('worlds are earned at 25 and 60, existing owners keep them, and coins cannot buy them',()=>{
 let p={...freshProfile(),coins:99999,xp:99999};assert.equal(buyCosmetic(p,'moon'),p);
 p=grantAdventureBoosts(p,24);assert(!p.owned.includes('moon'));p=grantAdventureBoosts(p,25);assert(p.owned.includes('moon'));assert(!p.owned.includes('sunset'));
 assert(grantAdventureBoosts(p,60).owned.includes('sunset'));assert(grantAdventureBoosts({...p,owned:['sunset']},1).owned.includes('sunset'));assert.equal(p.coins,99999);
});

test('challenge result waits for durable run save and credits its Adventure outcome only once',()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>({remove(){},textContent:''})};
 try{let writes=0,ends=0;const run=createAdventureChallengeRun({getChallenge:()=>adventureChallenge(5),onResult:(_,stats)=>{writes++;assert(stats.won);return {title:'LEVEL COMPLETE'};}});
 run.start({append(){}});const game={score:8,time:30,bestCombo:2,over:false,end(){ends++;this.over=true;}};
 run.step(game);assert.equal(ends,0);game.stageComplete=true;run.step(game);run.step(game);assert.equal(ends,1);assert.deepEqual(run.result(game,false),{});assert.equal(writes,0);
 assert.equal(run.result(game,true).title,'LEVEL COMPLETE');run.result(game,true);assert.equal(writes,1);
 }finally{globalThis.document=old;}
});

test('challenge pause separates goals and Back never restarts or resumes the run',()=>{
 const old=globalThis.document;
 const element=()=>({children:[],classList:{add(){}},append(...nodes){this.children.push(...nodes)},querySelector(){return {focus(){}}},remove(){}});
 globalThis.document={createElement:element};
 try{const run=createAdventureChallengeRun({getChallenge:()=>adventureChallenge(30)});run.start(element());let view=element(),resumes=0,exits=0;
 const panel=title=>{view=element();view.title=title;return view},button=(text,click)=>({text,click});
 run.pause(view,{panel,button,resume:()=>resumes++,exit:()=>exits++});assert.deepEqual(view.children.map(n=>n.text),['Resume','Level tasks','Main menu']);
 view.children[1].click();assert.equal(view.title,'Level 30 tasks');assert.equal(view.children[0].children.length,4);view.children[1].click();
 assert.equal(view.title,'Paused');assert.equal(resumes,0);assert.equal(exits,0);view.children[0].click();assert.equal(resumes,1);
 }finally{globalThis.document=old;}
});

test('level 100 is an uncapped matching finale with optional score stars',()=>{
 assert.equal(adventureChallenge(100),null);assert.deepEqual(levelRequirements(100),[]);assert.equal(adventureDesign(100),null);assert.deepEqual(adventureMechanics(100),{lock:null,memory:0,wheel:false});
 for(const score of [0,100,200,500,10000])assert.equal(levelComplete(100,{score,elapsed:9999999}),false);
 assert.deepEqual(levelObjectives(100,{won:true,score:200}).map(o=>o.done),[true,true,false]);
 const progress=normalizeAdventure({cleared:Array(99).fill(true)});const done=saveObjectiveStars(progress,100,0);assert.equal(done.cleared[99],true);assert.equal(done.stars[99],0);
});
