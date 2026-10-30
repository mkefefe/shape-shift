import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMiniQuestEvent} from './mini-quest-events.js';
import {freshProfile} from './economy.js';
import {ensureQuests,trackQuests} from './quests.js';

const fresh=()=>ensureQuests(freshProfile(),()=>0);
const apply=(profile,event)=>{const next=normalizeMiniQuestEvent(event);return next?trackQuests(profile,next):profile;};
const progress=profile=>Object.fromEntries(profile.quests.map(q=>[q.type,q.progress]));
const blueCircle={shape:0,color:1};

for(const mode of ['slice','piano'])test(mode+' completed actions advance current v5 quests with real shape/color',()=>{
 let profile=fresh();profile=apply(profile,{type:'start',mode,time:0});
 for(let n=0;n<3;n++)profile=apply(profile,{type:'success',mode,time:n+1,tile:blueCircle});
 assert.deepEqual(progress(profile),{picks:3,color:3,streak:3});
});

test('one Drop group counts once; a color connection does not invent a shared shape',()=>{
 const profile=apply(fresh(),{type:'success',mode:'drop',matches:2,pieces:[blueCircle,{shape:1,color:1},{shape:2,color:1}]});
 assert.deepEqual(progress(profile),{picks:1,color:1,streak:0});
});

test('Drop shape connection earns the shape streak without inventing a color',()=>{
 const profile=apply(fresh(),{type:'success',mode:'drop',pieces:[blueCircle,{shape:0,color:2}]});
 assert.deepEqual(progress(profile),{picks:1,color:0,streak:1});
});

test('mixed Drop bridge counts a match but no shape/color or artificial streak',()=>{
 let profile=apply(fresh(),{type:'success',mode:'drop',pieces:[blueCircle,blueCircle]});
 profile=apply(profile,{type:'success',mode:'drop',pieces:[blueCircle,{shape:1,color:1},{shape:1,color:2}]});
 assert.deepEqual(progress(profile),{picks:2,color:1,streak:0});
});

test('missing or invalid note attributes cannot fulfill shape/color tasks',()=>{
 const input={type:'success',mode:'piano',tile:{shape:8,color:'1'},time:1};
 const profile=apply(fresh(),input);
 assert.deepEqual(progress(profile),{picks:1,color:0,streak:0});
 assert.deepEqual(input,{type:'success',mode:'piano',tile:{shape:8,color:'1'},time:1});
});

test('mistakes and a new run reset unfinished streaks, not accumulated picks/colors',()=>{
 let profile=apply(fresh(),{type:'success',mode:'slice',tile:blueCircle});
 profile=apply(profile,{type:'failure',mode:'slice',hazard:true,failure:true});
 assert.deepEqual(progress(profile),{picks:1,color:1,streak:0});
 profile=apply(profile,{type:'success',mode:'piano',tile:blueCircle});
 profile=apply(profile,{type:'start',mode:'drop'});
 assert.deepEqual(progress(profile),{picks:2,color:2,streak:0});
});

test('failure and finish events retain their meaningful source data',()=>{
 assert.deepEqual(normalizeMiniQuestEvent({type:'failure',mode:'piano',failure:true,time:4}),{type:'pick',mode:'piano',failure:true,time:4,correct:false,outcome:'miss',lostLife:true});
 const finish={type:'finish',mode:'drop',time:12};assert.deepEqual(normalizeMiniQuestEvent(finish),finish);
});

test('scores require a real snapshot rather than guessed per-action points',()=>{
 const input={type:'success',mode:'slice',tile:blueCircle};
 assert(!Object.hasOwn(normalizeMiniQuestEvent(input),'score'));
 assert.equal(normalizeMiniQuestEvent({...input,score:17}).score,17);
 assert(!Object.hasOwn(normalizeMiniQuestEvent({...input,score:NaN}),'score'));
});

test('unknown modes, non-completions, and malformed merge groups earn nothing',()=>{
 for(const event of [null,{type:'success',mode:'battle'}, {type:'hold',mode:'piano'}, {type:'success',mode:'drop'}, {type:'success',mode:'drop',pieces:[blueCircle]}])assert.equal(normalizeMiniQuestEvent(event),null);
});
