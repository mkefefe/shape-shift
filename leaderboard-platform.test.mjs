import test from 'node:test';
import assert from 'node:assert/strict';

async function fixture(t,platform,{disabled=false}={}){
 const values=new Map(disabled?[['shape-shift-online-disabled','1']]:[]),calls=[];
 values.set('shape-shift-ranking-agreement-v1','yes');
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
 const previous={window:globalThis.window,localStorage:globalThis.localStorage,fetch:globalThis.fetch};
 globalThis.localStorage=storage;
 globalThis.window={ShapeShiftPlatform:{storage,setTimeout,clearTimeout,...platform}};
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>({entries:[],players:0})};};
 t.after(()=>{for(const [key,value]of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}});
 const board=await import(`./leaderboard.js?platform-test=${Math.random()}`);
 return {board,calls,storage,values};
}

test('Playgama live platform with cloudRankings capability fetches public rankings',async t=>{
 const {board,calls}=await fixture(t,{live:true,playgama:true,cloudRankings:true});
 assert.deepEqual(await board.loadLeaderboard(),{entries:[],players:0});
 assert.equal(calls.length,1);assert.match(calls[0].url,/\/api\/leaderboard$/);
 assert.equal(calls[0].options.method,'GET');assert.equal(calls[0].options.headers,undefined);
});

test('browser rankings remain available and live platforms without capability stay blocked',async t=>{
 const {board,calls}=await fixture(t,{live:false});
 await board.loadLeaderboard();assert.equal(calls.length,1);
 globalThis.window.ShapeShiftPlatform.storage.removeItem('shape-shift-public-rankings-v1');
 globalThis.window.ShapeShiftPlatform.live=true;
 await assert.rejects(board.loadLeaderboard(),/unavailable on this platform/);assert.equal(calls.length,1);
});

test('Playgama public reading does not enable opted-out player uploads',async t=>{
 const {board,calls}=await fixture(t,{live:true,cloudRankings:true},{disabled:true});
 await board.loadLeaderboard();assert.equal(calls.length,1);
 await assert.rejects(board.saveOnlineProfile({name:'Test',avatar:0,frame:'none'}),/privacy settings/);
 assert.equal(calls.length,1);
});

test('live Playgama cloud rankings permit participation while opt-out still blocks it',async t=>{
 const {board,calls,storage}=await fixture(t,{live:true,cloudRankings:true});
 await board.saveOnlineProfile({name:'My chosen name',avatar:0,frame:'none'});
 assert.equal(calls.length,1);assert.match(calls[0].url,/\/api\/profile$/);assert.match(calls[0].options.headers.Authorization,/^Bearer /);
 storage.setItem('shape-shift-online-disabled','1');await assert.rejects(board.saveOnlineProfile({name:'No upload'}),/privacy settings/);assert.equal(calls.length,1);
});
test('personal endpoint uses the current full identity and never adds authentication to public GET',async t=>{
 const {board,calls}=await fixture(t,{live:false});
 await board.saveOnlineProfile({name:'My player',avatar:0});const id=await board.currentPlayerId();
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>({entry:{id,name:'My player',score:88,rank:173,runs:3,updatedAt:1800000000000},players:240,ranked:true})};};
 const personal=await board.loadPersonalRanking();assert.equal(personal.entry.rank,173);assert.match(calls.at(-1).url,/\/api\/personal-rank$/);assert.equal(calls.at(-1).options.method,'POST');assert.match(calls.at(-1).options.headers.Authorization,/^Bearer /);
});
test('late response after ranking-session reset cannot restore personal data',async t=>{
 const {board}=await fixture(t,{live:false});await board.saveOnlineProfile({name:'A',avatar:0});const id=await board.currentPlayerId();let reply;
 globalThis.fetch=async()=>({ok:true,status:200,json:()=>new Promise(resolve=>reply=resolve)});
 const pending=board.loadPersonalRanking();while(!reply)await new Promise(resolve=>setImmediate(resolve));board.resetRankedSession();reply({entry:{id,name:'A',score:5,rank:1,runs:1,updatedAt:1800000000000},players:1,ranked:true});await assert.rejects(pending,{code:'SESSION_CHANGED'});
});
test('personal presentation uses server scores beyond top100 and never fabricates a local score',async t=>{
 const {board}=await fixture(t,{live:false});
 assert.deepEqual(board.personalRanking([],{normal:99999}),{rank:null,score:null,listed:false});
 const own={id:'a'.repeat(64),rank:173,score:88};assert.deepEqual(board.personalRanking([],{entry:own}),{...own,listed:false,cached:false,savedAt:undefined});
 assert.equal(board.personalRanking([{isYou:true,score:3,rank:1}],{entry:null,ranked:false}).score,null);
 assert.equal(board.personalRanking([{isYou:true,score:3,rank:1}]).listed,true);
});
test('queued score upload finishes before rank fetch, removes by id and includes newly queued runs',async t=>{
 const {board}=await fixture(t,{live:false});let queue=[{id:'one'}];const order=[];
 const result=await board.flushPendingRankedScores({pending:()=>queue,submit:async run=>{order.push('submit '+run.id);if(run.id==='one')queue=[{id:'one'},{id:'two'}];},saved:run=>{order.push('saved '+run.id);queue=queue.filter(r=>r.id!==run.id);},failed:()=>assert.fail('unexpected rejection')});order.push('fetch rank');
 assert.deepEqual(order,['submit one','saved one','submit two','saved two','fetch rank']);assert.equal(result.uploaded,2);assert.deepEqual(queue,[]);
});
test('temporary upload failure retains pending scores and terminal rejection does not poison later runs',async t=>{
 const {board}=await fixture(t,{live:false});let queue=[{id:'bad'},{id:'good'},{id:'offline'}],failed=[];
 const result=await board.flushPendingRankedScores({pending:()=>queue,submit:async run=>{if(run.id==='bad')throw Object.assign(Error(),{status:422});if(run.id==='offline')throw Error('offline');},saved:run=>queue=queue.filter(r=>r.id!==run.id),failed:run=>{failed.push(run.id);queue=queue.filter(r=>r.id!==run.id);}});
 assert.equal(result.uploaded,1);assert.equal(result.rejected,1);assert.equal(result.error.message,'offline');assert.deepEqual(failed,['bad']);assert.deepEqual(queue,[{id:'offline'}]);
});
