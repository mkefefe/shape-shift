import {xpForLevel} from './economy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {creditRestoration,creditBattleReward} from './world-rewards.js';
import {normalizeRestoration,applyRestorationReward,claimRestoration,restorationSummary} from './world-restoration.js';
import {createBattleRewards} from './battle-rewards.js';

const uuid='12345678-1234-4321-abcd-123456789abc';
const fresh=()=>({coins:10,xp:40,worldRestoration:normalizeRestoration(),owned:['gold']});
const match=(seq=1,extra={})=>({mode:'battle',coins:1,xp:3,receipt:`battle:match:${uuid}:${seq}`,...extra});
const clear=(encounter=1,extra={})=>({mode:'battle',coins:encounter%5?5:15,xp:encounter%5?10:25,receipt:`battle:clear:${encounter}`,...extra});

test('restoration copies earned XP without crediting the shared wallet or XP again',()=>{
 const profile=fresh(),before=JSON.stringify(profile),next=creditRestoration(profile,{mode:'slice',xp:20,receipt:'slice-run-1'});
 assert.notEqual(next.profile,profile);assert.equal(next.profile.coins,10);assert.equal(next.profile.xp,40);
 assert.equal(next.profile.worldRestoration.totalXp,20);assert.equal(next.profile.worldRestoration.byMode.slice,20);assert.equal(next.result.addedXp,20);
 assert.equal(JSON.stringify(profile),before);assert.equal(next.profile.owned,profile.owned);
});

test('restoration keeps the original profile reference on duplicate, invalid, admin and no-op awards',()=>{
 const profile=creditRestoration(fresh(),{mode:'piano',xp:5,receipt:'run'}).profile;
 for(const event of [{mode:'piano',xp:5,receipt:'run'},{mode:'ad',xp:50,receipt:'ad'},{mode:'drop',xp:0,receipt:'zero'},{mode:'slice',xp:NaN,receipt:'bad'}])assert.equal(creditRestoration(profile,event).profile,profile);
 const admin={...profile,adminMode:true};assert.equal(creditRestoration(admin,{mode:'adventure',xp:50,receipt:'admin',firstAdventureWin:true}).profile,admin);
});

test('first Adventure win is saved even when earlier run awards already reached the floor',()=>{
 const profile=creditRestoration(fresh(),{mode:'adventure',xp:30,receipt:'run-xp'}).profile;
 const result=creditRestoration(profile,{mode:'adventure',xp:0,receipt:'run-win',firstAdventureWin:true});
 assert.notEqual(result.profile,profile);assert.equal(result.profile.worldRestoration.totalXp,30);assert(result.profile.worldRestoration.firstAdventureWin);assert.equal(result.profile.xp,40);
});

test('completed tasks remain pending on further zero-value rewards',()=>{
 const profile=fresh();profile.worldRestoration=normalizeRestoration({version:3,totalXp:100,firstAdventureWin:true,restoredCount:1,taskProgress:10,modeTasks:{adventure:10,endless:8}});
 const result=creditRestoration(profile,{mode:'endless',xp:0,receipt:'no-auto-claim'});
 assert.equal(result.profile,profile);assert.equal(result.profile.worldRestoration.restoredCount,1);
 assert(restorationSummary(result.profile.worldRestoration).readyToRestore);
});

test('Battle match atomically adds coins, XP and the same restoration XP',()=>{
 const profile=fresh(),before=JSON.stringify(profile),result=creditBattleReward(profile,match());
 assert(result.accepted);assert.equal(result.profile.coins,11);assert.equal(result.profile.xp,43);
 assert.equal(result.profile.worldRestoration.totalXp,3);assert.equal(result.profile.worldRestoration.byMode.battle,3);
 assert.equal(result.result.addedXp,3);assert.equal(JSON.stringify(profile),before);
});

test('duplicate Battle matches advance the queue without paying again, including after reload',()=>{
 const first=creditBattleReward(fresh(),match()),profile=JSON.parse(JSON.stringify(first.profile));
 const again=creditBattleReward(profile,match());assert(again.accepted);assert.equal(again.profile,profile);assert.equal(again.result.addedXp,0);
});

test('Battle rewards persist the active job atomically and duplicates never advance the next job',()=>{
 let profile={...fresh(),xp:xpForLevel(25)};
 profile.worldRestoration={...normalizeRestoration(),totalXp:500,firstAdventureWin:true,restoredCount:3,modeTasks:{adventure:14,endless:12,games:14,battle:0}};
 profile=creditBattleReward(profile,match()).profile;
 assert.equal(profile.worldRestoration.modeTasks.battle,3);assert.equal(profile.worldRestoration.restoredCount,3);
 profile=creditBattleReward(profile,clear(1,{xp:8})).profile;
 assert.equal(profile.worldRestoration.modeTasks.battle,11);
 const completed=creditBattleReward(profile,match(2,{xp:5}));
 assert.equal(completed.result.toPercent,0);assert.equal(completed.profile.worldRestoration.restoredCount,3);assert(restorationSummary(completed.profile.worldRestoration,{playerLevel:25}).readyToRestore);completed.profile.worldRestoration=claimRestoration(completed.profile.worldRestoration,'landmark-4',{playerLevel:25}).state;
 assert.equal(completed.profile.worldRestoration.taskProgress,0);assert.equal(completed.profile.coins,17);assert.equal(completed.profile.xp,xpForLevel(25)+16);
 const reloaded=JSON.parse(JSON.stringify(completed.profile));
 assert.equal(creditBattleReward(reloaded,match(2,{xp:5})).profile,reloaded);
 assert.equal(creditBattleReward(reloaded,clear()).profile,reloaded);
 assert.equal(reloaded.worldRestoration.taskProgress,0);assert.equal(reloaded.worldRestoration.totalXp,516);
});

test('first clears are permanently recorded and bosses use host-supplied rewards',()=>{
 const first=creditBattleReward(fresh(),clear(5));assert(first.accepted);
 assert.equal(first.profile.coins,25);assert.equal(first.profile.xp,65);assert.deepEqual(first.profile.battleClearRewards,['battle:clear:5']);
 assert.equal(first.result.toPercent,0);assert.equal(first.profile.worldRestoration.totalXp,25);
 assert.equal(first.profile.worldRestoration.taskProgress,0);assert.equal(creditBattleReward(first.profile,clear(5)).profile,first.profile);
});

test('clear receipts cannot pay again after more than 256 later match receipts',()=>{
 let profile=creditBattleReward(fresh(),clear()).profile;
 for(let seq=1;seq<=300;seq++)profile=creditBattleReward(profile,match(seq)).profile;
 assert(!profile.worldRestoration.receipts.includes('battle:clear:1'));assert(profile.battleClearRewards.includes('battle:clear:1'));
 const before=JSON.stringify(profile),again=creditBattleReward(profile,clear());
 assert(again.accepted);assert.equal(again.profile,profile);assert.equal(JSON.stringify(profile),before);
});

test('a clear already in the bounded ledger is promoted without a second payout',()=>{
 const profile=fresh();profile.worldRestoration=applyRestorationReward(profile.worldRestoration,{mode:'battle',xp:10,receipt:'battle:clear:1'}).state;
 const result=creditBattleReward(profile,clear());assert(result.accepted);assert.equal(result.profile.coins,profile.coins);assert.equal(result.profile.xp,profile.xp);
 assert.deepEqual(result.profile.battleClearRewards,['battle:clear:1']);assert.equal(result.result.addedXp,0);assert.equal(profile.battleClearRewards,undefined);
});

test('admin Battle rewards are acknowledged without changing any balances or receipts',()=>{
 const admin={...fresh(),adminMode:true};
 for(const award of [match(),clear()]){const result=creditBattleReward(admin,award);assert(result.accepted);assert.equal(result.profile,admin);assert.equal(result.result.addedXp,0);}
});

test('malformed Battle awards cannot mutate the profile and are not acknowledged',()=>{
 const profile=fresh();
 const invalid=[null,{},match(1,{mode:'endless'}),match(1,{coins:-1}),match(1,{coins:1.5}),match(1,{xp:NaN}),match(1,{xp:Infinity}),match(1,{xp:'3'}),match(1,{coins:Number.MAX_SAFE_INTEGER+1})];
 for(const receipt of ['battle:clear:0','battle:clear:31','battle:clear:01','battle:clear:1:extra','battle:match:abc:1',`battle:match:${uuid}:0`,`battle:match:${uuid}:01`,`battle:match:${uuid}:1.5`,`battle:match:${uuid}:9007199254740992`,'battle:clear:1 '])invalid.push(match(1,{receipt}));
 for(const award of invalid){const result=creditBattleReward(profile,award);assert.equal(result.accepted,false);assert.equal(result.profile,profile);assert.equal(result.result.addedXp,0);}
});

test('coin-only and zero-amount valid Battle receipts still deduplicate',()=>{
 const one=creditBattleReward(fresh(),match(1,{coins:2,xp:0}));assert(one.accepted);assert.equal(one.profile.coins,12);assert.equal(one.profile.xp,40);
 assert.equal(creditBattleReward(one.profile,match(1,{coins:2,xp:0})).profile,one.profile);
 const zero=creditBattleReward(one.profile,match(2,{coins:0,xp:0}));assert(zero.accepted);assert(zero.profile.worldRestoration.receipts.includes(match(2).receipt));
});

test('balances never overflow or silently reset malformed saved currency',()=>{
 for(const profile of [{...fresh(),coins:Number.MAX_SAFE_INTEGER},{...fresh(),xp:Number.MAX_SAFE_INTEGER},{...fresh(),coins:NaN},{...fresh(),xp:-1}]){
  const result=creditBattleReward(profile,match());assert.equal(result.accepted,false);assert.equal(result.profile,profile);
 }
});

test('UUID case is canonicalized, preventing differently cased duplicate receipts',()=>{
 const first=creditBattleReward(fresh(),match(1,{receipt:`battle:match:${uuid.toUpperCase()}:1`}));
 assert(first.accepted);assert.equal(creditBattleReward(first.profile,match()).profile,first.profile);
});

test('Battle bridge can atomically commit and acknowledge these transactions',()=>{
 let profile=fresh();const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 const rewards=createBattleRewards({storage,createId:()=>uuid,onReward:award=>{const transaction=creditBattleReward(profile,award);if(!transaction.accepted)return false;profile=transaction.profile;return true;}});
 rewards.begin();assert(rewards.accept({kind:'match',encounter:1,runId:uuid,seq:1}).accepted);assert(rewards.accept({kind:'clear',encounter:1,runId:uuid,seq:2}).accepted);
 assert.equal(profile.coins,16);assert.equal(profile.xp,53);assert.equal(profile.worldRestoration.totalXp,13);assert.deepEqual(profile.battleClearRewards,['battle:clear:1']);
});
