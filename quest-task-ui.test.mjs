import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureQuests,trackQuests,claimQuest} from './quests.js';
const now=1800000000000;
const base=()=>({coins:1000,xp:3000,owned:[],equipped:{frame:'none',background:'garden'},normalClaimed:[],quests:[],dailyResetAt:now+86400000,dailyQuests:Array.from({length:3},(_,i)=>({id:'daily-'+i,type:'picks',target:5,progress:0,reward:100}))});
test('old completed tasks retain their reward and cannot be claimed twice',()=>{
 const p=base();p.quests=[{id:'normal-1',sequence:1,type:'journey',title:'Veteran Unbroken',target:20,progress:20,reward:250},{id:'normal-2',sequence:2,type:'journey',target:20,progress:19,reward:100}];
 const migrated=ensureQuests(p,()=>0,now);assert.equal(migrated.quests[0].progress,20);assert.equal(migrated.quests[0].reward,250);assert.equal(migrated.quests[1].progress,0);
 const claimed=claimQuest(migrated,'normal-1',()=>0,now);assert.equal(claimed.coins,1250);assert.equal(claimQuest(claimed,'normal-1',()=>0,now).coins,1250);assert.deepEqual(claimed.normalClaimed,[1]);
});
test('daily migration retains claimed and ready rewards through reload',()=>{
 const p=base();p.dailyQuests=p.dailyQuests.map((q,i)=>({...q,type:'journey',progress:i<2?5:2,claimed:i===0}));const migrated=ensureQuests(p,()=>0,now);assert(migrated.dailyQuests[0].claimed);assert.equal(migrated.dailyQuests[1].progress,5);assert.equal(migrated.dailyQuests[2].progress,0);assert.deepEqual(ensureQuests(migrated,()=>0,now),migrated);
});
test('general tasks advance from either mode and preserve progress after reload',()=>{
 for(const mode of ['adventure','endless']){let p=ensureQuests(base(),()=>0,now);p=trackQuests(p,{type:'pick',correct:true,mode,tile:{shape:0,color:1},score:1});assert.equal(p.quests[0].progress,1);assert.equal(p.quests[1].progress,1);p=ensureQuests(p,()=>0,now);assert.equal(p.quests[0].progress,1);}
});
test('all 400 task titles state a short action and later targets increase',()=>{
 let count=0,first,last;
 for(let start=0;start<400;start+=3){const p=base();p.normalClaimed=Array.from({length:start},(_,i)=>i+1);for(const q of ensureQuests(p,()=>0,now).quests){count++;assert(q.title.split(/\s+/).length<=6);assert(!q.mode);assert(/^(Make|Pick|Match|Score) /.test(q.title));if(q.sequence===1)first=q.target;if(q.sequence===397)last=q.target;}}
 assert.equal(count,400);assert(last>first);
});
