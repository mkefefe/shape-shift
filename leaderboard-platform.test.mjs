import test from 'node:test';
import assert from 'node:assert/strict';

async function fixture(t,platform,{disabled=false}={}){
 const values=new Map(disabled?[['shape-shift-online-disabled','1']]:[]),calls=[];
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
 const previous={window:globalThis.window,localStorage:globalThis.localStorage,fetch:globalThis.fetch};
 globalThis.localStorage=storage;
 globalThis.window={ShapeShiftPlatform:{storage,setTimeout,clearTimeout,...platform}};
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>({entries:[],players:0})};};
 t.after(()=>{for(const [key,value]of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}});
 const board=await import(`./leaderboard.js?platform-test=${Math.random()}`);
 return {board,calls};
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
