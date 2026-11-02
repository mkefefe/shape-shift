import test from 'node:test';import assert from 'node:assert/strict';
import {adventureChallenge,challengeTasks,challengeFinished,challengeStats,createAdventureChallengeRun} from './adventure-challenges.js';
import {freshProfile,grantAdventureBoosts,buyCosmetic} from './economy.js';
import {normalizeAdventure,saveObjectiveStars,levelObjectives} from './world-menu.js';
test('twenty short special stages rotate all three games and ordinary levels stay matching',()=>{
 let modes=[];for(let level=1;level<=100;level++){const c=adventureChallenge(level);assert.equal(!!c,level%5===0);if(c){modes.push(c.mode);assert.equal(challengeTasks(c).length,3);assert(c.target>0&&c.target<60);}}
 assert.deepEqual(modes.slice(0,3),['drop','slice','piano']);assert.equal(modes.length,20);
});
test('challenge completion cannot come from practice; timeout and goal use active game time',()=>{
 const c=adventureChallenge(5);assert(!challengeFinished({score:100,time:0,practice:true},c));
 assert(!challengeFinished({score:7,time:119},c));assert(challengeFinished({score:8,time:1},c));assert(challengeFinished({score:1,time:120},c));
 const stats=challengeStats({score:8,time:25,bestCombo:2},c);assert(stats.won);assert(levelObjectives(5,stats).every(o=>o.done));
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
 run.step(game);run.step(game);assert.equal(ends,1);assert.deepEqual(run.result(game,false),{});assert.equal(writes,0);
 assert.equal(run.result(game,true).title,'LEVEL COMPLETE');run.result(game,true);assert.equal(writes,1);
 }finally{globalThis.document=old;}
});
