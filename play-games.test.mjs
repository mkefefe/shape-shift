import test from 'node:test';
import assert from 'node:assert/strict';
import {achievementState,advanceAchievements} from './achievements.js';
import {googleAchievementsAvailable,syncGoogleAchievements} from './play-games.js';

function wrapper(hostname='appassets.androidplatform.net'){
 const sent=[];return {sent,location:{hostname},ShapeShiftGames:{configured:()=>true,sync:payload=>sent.push(JSON.parse(payload))}};
}
test('Google sync is native-only, including when a web preview fakes the bridge',()=>{
 for(const host of [undefined,{},wrapper('localhost'),wrapper('127.0.0.1'),wrapper('playgama.com')]){
  assert.equal(googleAchievementsAvailable(host),false);
  assert.equal(syncGoogleAchievements({unlocked:['first_match']},host),false);
 }
 const host=wrapper();host.ShapeShiftGames.configured=()=>false;assert.equal(googleAchievementsAvailable(host),false);
});
test('only known earned achievement keys cross the bridge, once each',()=>{
 const host=wrapper();assert(syncGoogleAchievements({unlocked:['first_match','first_match','fake','score_100']},host));
 assert.deepEqual(host.sent,[['first_match','score_100']]);
});
test('a bridge failure cannot lose saved awards or block gameplay, and retry resends them',()=>{
 const host=wrapper(),state=advanceAchievements(achievementState(),{type:'pick',correct:true,score:1});
 const saved=JSON.stringify(state);host.ShapeShiftGames.sync=()=>{throw Error('offline');};
 assert.equal(syncGoogleAchievements(state,host),false);assert.equal(JSON.stringify(state),saved);
 host.ShapeShiftGames.sync=payload=>host.sent.push(JSON.parse(payload));
 assert.equal(syncGoogleAchievements(JSON.parse(saved),host),true);assert.deepEqual(host.sent,[['first_match']]);
});
test('first-match Google award syncs immediately even when no local tier was earned',async()=>{
 const host=wrapper();const values=new Map();
 host.ShapeShiftPlatform={storage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},clearTimeout(){},setTimeout(){}};
 globalThis.window=host;globalThis.document={getElementById:()=>null};
 try{
  const ui=await import('./achievements-ui.js?google-first-match-test');
  ui.trackAchievements({type:'pick',correct:true,score:1,mode:'endless'});
  assert.deepEqual(host.sent,[['first_match']]);
  assert(JSON.parse(values.get('shape-shift-achievements-v1')).unlocked.includes('first_match'));
  ui.trackAchievements({type:'pick',correct:true,score:2,mode:'endless'});
  assert.equal(host.sent.length,1,'no upload for every ordinary pick');
 }finally{delete globalThis.window;delete globalThis.document;}
});
test('Adventure Google milestones use completed levels and earned stars, never map access',()=>{
 const start=achievementState({modeStats:{adventure:{highest:100}}});
 assert.deepEqual(advanceAchievements(start,{type:'runStart',mode:'adventure'}).unlocked,[]);
 const won=advanceAchievements(start,{type:'finish',mode:'adventure',won:true,level:1,stars:3,elapsed:30000});
 assert(won.unlocked.includes('adventure_1'));assert(won.unlocked.includes('adventure_perfect'));
 const failed=advanceAchievements(start,{type:'finish',mode:'adventure',won:false,level:1,stars:0});
 assert(!failed.unlocked.includes('adventure_1'));
});
