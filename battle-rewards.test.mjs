import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattleRewards,BATTLE_REWARDS_KEY} from './battle-rewards.js';

const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
function fixture(options={}){const awards=[],storage=options.storage||memory();let opens=0;const controller=createBattleRewards({storage,onReward:a=>awards.push(a),createId:()=>`open-${++opens}`,...options});const runId=controller.begin();return {controller,runId,awards,storage,event:(seq,kind='match',encounter=1)=>({runId,seq,kind,encounter})};}

test('one actual match credits fixed shared currency, regardless of supplied amounts',()=>{
 const f=fixture(),event={...f.event(1),coins:9999,xp:9999};
 assert.equal(f.controller.accept(event).accepted,true);
 assert.deepEqual(f.awards,[{mode:'battle',coins:1,xp:3,receipt:'battle:match:open-1:1',kind:'match',encounter:1}]);
 assert.equal(f.controller.accept(event).duplicate,true);
 assert.equal(f.awards.length,1);
});

test('rejects stale sessions, gaps, malformed and special-item reward events',()=>{
 const f=fixture();
 for(const event of [{...f.event(1),runId:'other'},f.event(2),f.event(0),f.event(1,'starburst'),f.event(1,'bomb'),f.event(1,'shield'),f.event(1,'clear',0),f.event(1,'clear',31),f.event(1,'clear','1'),{...f.event(1),seq:Infinity}])assert.equal(f.controller.accept(event),null);
 assert.equal(f.awards.length,0);
 assert.equal(f.controller.accept(f.event(1)).accepted,true);
 f.controller.end();assert.equal(f.controller.accept(f.event(2)),null);
 const next=f.controller.begin();assert.equal(f.controller.accept(f.event(2)),null);
 assert.equal(f.controller.accept({...f.event(1),runId:next}).accepted,true);
 assert.equal(f.awards[1].receipt,'battle:match:open-2:1');
});

test('all 30 first-clear rewards persist separately from set progress, including six bosses',()=>{
 const f=fixture();f.storage.setItem('shape-shift-battle-sets-v2',JSON.stringify({completedSets:6}));
 for(let encounter=1;encounter<=30;encounter++)f.controller.accept(f.event(encounter,'clear',encounter));
 assert.equal(f.awards.filter(a=>a.coins===15&&a.xp===25).length,6);
 assert.equal(f.awards.filter(a=>a.coins===5&&a.xp===10).length,24);
 assert.deepEqual(JSON.parse(f.storage.getItem(BATTLE_REWARDS_KEY)).cleared,Array.from({length:30},(_,i)=>i+1));
 const replay=fixture({storage:f.storage});
 for(let encounter=1;encounter<=30;encounter++)assert.equal(replay.controller.accept(replay.event(encounter,'clear',encounter)).duplicate,true);
 assert.equal(replay.awards.length,0);
 replay.controller.accept(replay.event(31));assert.equal(replay.awards.length,1,'normal matches still earn on replay');
});

test('losing and retrying a partially cleared set cannot farm first-clear bonuses',()=>{
 const f=fixture();f.controller.accept(f.event(1,'clear',1));f.controller.accept(f.event(2,'clear',2));
 assert.equal(f.controller.accept(f.event(3,'clear',1)).duplicate,true);
 assert.equal(f.controller.accept(f.event(4,'clear',2)).duplicate,true);
 f.controller.accept(f.event(5,'clear',3));
 assert.deepEqual(f.awards.map(a=>a.encounter),[1,2,3]);
});

test('admin testing earns neither match rewards nor first-clear credit',()=>{
 let admin=true;const f=fixture({enabled:()=>!admin});
 assert.equal(f.controller.accept(f.event(1)).excluded,true);
 assert.equal(f.controller.accept(f.event(2,'clear',5)).excluded,true);
 assert.equal(f.awards.length,0);assert.equal(f.storage.getItem(BATTLE_REWARDS_KEY),null);
 admin=false;f.controller.accept(f.event(3,'clear',5));assert.equal(f.awards[0].coins,15);
});

test('failed host transactions retry the same receipt before advancing the sequence',()=>{
 let attempts=0;const f=fixture({onReward:a=>{f.awards.push(a);return ++attempts>1;}});
 assert.equal(f.controller.accept(f.event(1,'clear',5)).accepted,false);
 assert.equal(f.storage.getItem(BATTLE_REWARDS_KEY),null);
 assert.equal(f.controller.accept(f.event(2)),null);
 assert.equal(f.controller.accept(f.event(1,'clear',5)).accepted,true);
 assert.equal(f.awards[0].receipt,f.awards[1].receipt);
 assert.equal(f.controller.accept(f.event(1,'clear',5)).duplicate,true);
 assert.equal(f.awards.length,2);
});

test('host receipt dedupe survives a failed secondary clear save and reopening',()=>{
 const storage=memory(),set=storage.setItem,receipts=new Set(),awards=[];let fail=true;
 storage.setItem=(k,v)=>{if(fail)throw new Error('storage full');set(k,v);};
 const onReward=a=>{if(!receipts.has(a.receipt)){receipts.add(a.receipt);awards.push(a);}return true;};
 const f=fixture({storage,onReward});assert.equal(f.controller.accept(f.event(1,'clear',10)).accepted,true);
 fail=false;const replay=fixture({storage,onReward});replay.controller.accept(replay.event(1,'clear',10));
 assert.equal(awards.length,1);assert.deepEqual(JSON.parse(storage.getItem(BATTLE_REWARDS_KEY)).cleared,[10]);
});

test('corrupt reward storage cannot invent cleared encounters',()=>{
 const storage=memory();storage.setItem(BATTLE_REWARDS_KEY,'{"cleared":[0,31,"5",1,1]}');
 const f=fixture({storage});assert.equal(f.controller.accept(f.event(1,'clear',1)).duplicate,true);
 f.controller.accept(f.event(2,'clear',5));assert.equal(f.awards.length,1);
});
