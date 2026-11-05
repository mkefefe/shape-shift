import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

async function fixture(t,platform,{disabled=false}={}){
 const values=new Map(disabled?[['shape-shift-online-disabled','1']]:[]),calls=[];
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

test('a fresh player can read rankings and submit a profile without terms or analytics agreement',async t=>{
 const {board,calls,storage}=await fixture(t,{live:false});
 await board.loadLeaderboard();
 assert.equal(storage.getItem('shape-shift-player-token'),null,'public reading remains anonymous');
 await board.saveOnlineProfile({name:'SunnyFox42',avatar:2,frame:'none',email:'must-not-upload',photoURL:'must-not-upload'});
 assert.equal(calls.length,2);assert.deepEqual(JSON.parse(calls[1].options.body),{name:'SunnyFox42',avatar:2,frame:'none'});
 for(const key of ['shape-shift-ranking-agreement-v1','shape-shift-terms','shape-shift-statistics','shape-shift-analytics-choice-v2'])assert.equal(storage.getItem(key),null,key);
});

test('leaderboard opening shows the board directly even without ranking agreement',()=>{
 const source=fs.readFileSync(new URL('./game.js',import.meta.url),'utf8');
 const handler=source.match(/\$\('leaderboard-open'\)\.onclick=\(\)=>\{([\s\S]*?)\n\};\$\('leaderboard-reload'\)/)?.[1];assert(handler);
 const events=[],pane={scrollTo:()=>events.push('scroll')},dialog={...pane,showModal:()=>events.push('board'),querySelector:()=>pane};
 vm.runInNewContext('(function(){'+handler+'})()',{$:id=>{if(id==='leaderboard-dialog')return dialog;if(id==='leaderboard-rows')return pane;assert.fail('Unexpected ranking gate '+id);},leaderboardAllowed:()=>false,renderPersonalRanking:()=>events.push('personal'),rankings:()=>events.push('load')});
 assert.deepEqual(events,['personal','board','scroll','scroll','scroll','load']);
});

test('the public board renders while personal profile and score uploads are still pending',async t=>{
 const {board}=await fixture(t,{live:false}),events=[];let releaseIdentity,releaseScores;
 const identity=new Promise(resolve=>releaseIdentity=resolve),scores=new Promise(resolve=>releaseScores=resolve);
 const pending=board.loadRankingPanels({loadPublic:async()=>({entries:[]}),syncIdentity:()=>identity,flushScores:()=>{events.push('flush');return scores;},loadPersonal:async()=>{events.push('personal fetch');return {ranked:false};},onPublic:()=>events.push('public shown'),onPersonal:()=>events.push('personal shown')});
 await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(events,['public shown']);
 releaseIdentity();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(events,['public shown','flush']);
 releaseScores();await pending;assert.deepEqual(events,['public shown','flush','personal fetch','personal shown']);
});

test('explicit opt-out still reads the public board without identity or score requests',async t=>{
 const {board}=await fixture(t,{live:false},{disabled:true}),events=[];
 await board.loadRankingPanels({participating:false,loadPublic:async()=>({entries:[]}),syncIdentity:()=>assert.fail('identity upload'),flushScores:()=>assert.fail('score upload'),loadPersonal:()=>assert.fail('personal request'),onPublic:()=>events.push('public'),onPersonal:value=>{assert.equal(value,null);events.push('no personal');}});
 assert.deepEqual(events.sort(),['no personal','public']);
});

test('public and personal failures are independent and stale responses cannot repaint the board',async t=>{
 const {board}=await fixture(t,{live:false}),events=[];
 await board.loadRankingPanels({loadPublic:async()=>{throw Error('offline');},loadPersonal:async()=>({ranked:false}),onPublicError:error=>events.push(error.message),onPersonal:()=>events.push('personal shown')});
 assert.deepEqual(events.sort(),['offline','personal shown']);
 events.length=0;let reply,current=true;
 const pending=board.loadRankingPanels({participating:false,isCurrent:()=>current,loadPublic:()=>new Promise(resolve=>reply=resolve),onPublic:()=>events.push('stale'),onPersonal:()=>{}});
 await new Promise(resolve=>setImmediate(resolve));current=false;reply({entries:[]});await pending;assert.deepEqual(events,[]);
});

test('the rendered leaderboard exposes Retry for failed or cached public and personal results',async t=>{
 const {board}=await fixture(t,{live:false});
 const source=fs.readFileSync(new URL('./game.js',import.meta.url),'utf8'),start=source.indexOf('async function rankings(silent=false){'),end=source.indexOf('\nenableHoldBuying(',start);
 assert(start>=0&&end>start);const fn=source.slice(start,end).trim();
 for(const scenario of [{publicError:true},{publicCached:true},{personalError:true},{personalCached:true},{}]){
  const nodes={'leaderboard-status':{textContent:''},'leaderboard-reload':{hidden:true}},state={rankingsRequest:0,lastRankingsSnapshot:null,lastRankingEntries:[],lastPersonalRanking:null,lastRankingPlayerId:null};
  Object.assign(state,{$:id=>nodes[id],window:{ShapeShiftPlatform:{storage:{getItem:()=>null}}},leaderboardAllowed:()=>true,rankedSessionVersion:()=>0,syncIdentity:async()=>{},currentPlayerId:async()=>null,readPublicRankings:()=>null,readPersonalRanking:()=>null,flushScores:async()=>{},renderPersonalRanking:()=>{},rankingEntries:data=>data.entries,rankingLoadMessage:()=> 'Check your connection and tap Retry.',renderRankingRows:entries=>{state.lastRankingEntries=entries;},loadRankingPanels:options=>board.loadRankingPanels({...options,loadPublic:async()=>{if(scenario.publicError)throw Error('offline');return {entries:[],players:0,cached:scenario.publicCached===true};},loadPersonal:async()=>{if(scenario.personalError)throw Error('offline');return {ranked:false,entry:null,players:0,cached:scenario.personalCached===true};}})});
  await vm.runInNewContext('('+fn+')()',state);
  assert.equal(nodes['leaderboard-reload'].hidden,Object.keys(scenario).length===0,JSON.stringify(scenario));
 }
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

test('owner access is checked by the server even when ranking uploads are explicitly off',async t=>{
 const {board,calls}=await fixture(t,{live:false},{disabled:true});
 await board.ownerAccess();await board.setOwnerAdmin(true);
 assert.deepEqual(calls.map(row=>new URL(row.url).pathname),['/api/owner','/api/admin']);
 assert(calls.every(row=>row.options.headers.Authorization.startsWith('Bearer ')));
 await assert.rejects(board.saveOnlineProfile({name:'No upload'}),/privacy settings/);
 assert.equal(calls.length,2);
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

test('a failed prefetch is retried at launch instead of starting an unranked game',async t=>{
 const {board,storage}=await fixture(t,{live:true,cloudRankings:true});let calls=0;
 globalThis.fetch=async()=>{if(++calls===1)throw Error('Connection lost');return {ok:true,status:200,json:async()=>({id:'run-retry',seed:123,rules:44,protocol:2,nonce:'first'})};};
 const prefetch=board.prepareRankedRun();const launch=board.beginRankedRun();
 assert.equal(await prefetch,null);assert.equal((await launch).id,'run-retry');assert.equal(calls,2);
 assert.equal(JSON.parse(storage.getItem('shape-shift-run-proofs-v2'))['run-retry'].nonce,'first');
});

test('an unavailable ranking connection fails launch rather than returning a null run',async t=>{
 const {board}=await fixture(t,{live:true,cloudRankings:true});
 globalThis.fetch=async()=>{throw Error('Connection lost');};
 await assert.rejects(board.beginRankedRun(),/Connection lost/);
});

test('a real run checkpoints its complete actions before finish and personal lookup',async t=>{
 const {board}=await fixture(t,{live:true,cloudRankings:true});const paths=[];
 globalThis.fetch=async(url,options)=>{const path=new URL(url).pathname,body=JSON.parse(options.body);paths.push(path);
  let reply;if(path==='/api/run')reply={id:'run',seed:42,rules:44,protocol:2,nonce:'one'};
  if(path==='/api/checkpoint'){assert.equal(body.offset,0);assert.equal(body.nonce,'one');assert.equal(body.actions.length,2);reply={nonce:'two',count:2};}
  if(path==='/api/finish'){assert.equal(body.expectedScore,1);reply={saved:true,score:1};}
  if(path==='/api/personal-rank')reply={entry:{id:await board.currentPlayerId(),name:'Test',score:1,rank:101,runs:1,updatedAt:1800000000000},players:101,ranked:true};
  return {ok:true,status:200,json:async()=>reply};};
 const run=await board.beginRankedRun();const actions=[{type:'loadout',frame:'none',map:'garden',upgrade:0},{type:'choose',index:0}];
 assert.equal((await board.submitRankedRun({...run,actions,expectedScore:1})).saved,true);
 assert.equal((await board.loadPersonalRanking()).entry.score,1);
 assert.deepEqual(paths,['/api/run','/api/checkpoint','/api/finish','/api/personal-rank']);
});

test('Endless can start without ranking when the score service rejects or stalls',async()=>{
 const {beginPlayableRun}=await import('./leaderboard.js');
 assert.equal(await beginPlayableRun('normal',{start:async()=>{throw Error('offline')}}),null);
 assert.equal(await beginPlayableRun('normal',{start:()=>new Promise(()=>{}),timeoutMs:10}),null);
 const run={id:'verified',protocol:2};assert.equal(await beginPlayableRun('normal',{start:async()=>run}),run);
});
