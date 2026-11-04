import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from './worker.mjs';
const token=()=>crypto.randomUUID()+crypto.randomUUID();
const hash=async value=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))).toString('hex');
function setup(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('./reports-schema.sql',import.meta.url),'utf8'));sql.exec('CREATE TABLE owners(player_id TEXT PRIMARY KEY,admin_active INTEGER DEFAULT 0)');
 const wrap=(query,params=[])=>({bind:(...values)=>wrap(query,values),async first(){return sql.prepare(query).get(...params)||null;},async all(){return {results:sql.prepare(query).all(...params)};},async run(){return {meta:{changes:sql.prepare(query).run(...params).changes}};}});
 const env={DB:{prepare:wrap},CREATIONS:{limit:async()=>({success:true})}};
 const request=async(path,credential,body={},options={})=>worker.fetch(new Request('https://scores.test'+path,{method:options.method||'POST',headers:{Origin:options.origin||'https://mkefefe.github.io','Content-Type':'application/json',...(credential?{Authorization:'Bearer '+credential}:{})},...((options.method||'POST')==='GET'?{}:{body:JSON.stringify(body)})}),env);
 return {sql,env,request};
}
const report=overrides=>({id:crypto.randomUUID(),mode:'Piano Flow',description:'The game paused after the countdown.',build:'4.94.240',distribution:'github',...overrides});
test('report sends privately, acknowledges persistence and retries once without duplicates',async()=>{
 const {sql,request}=setup(),credential=token(),body=report({description:'A & S <script>test</script> 🎹'});
 const sent=await request('/api/reports',credential,body);assert.equal(sent.status,201);assert.deepEqual(await sent.json(),{saved:true,id:body.id});
 assert.equal(sent.headers.get('Access-Control-Allow-Origin'),'https://mkefefe.github.io');assert.equal(sent.headers.get('Cache-Control'),'no-store');
 const saved=sql.prepare('SELECT * FROM bug_reports').get();assert.equal(saved.description,body.description);assert.equal(saved.reporter_id,await hash(credential));assert(!JSON.stringify(saved).includes(credential));
 assert.equal((await request('/api/reports',credential,body)).status,200);assert.equal(sql.prepare('SELECT COUNT(*) n FROM bug_reports').get().n,1);
 assert.equal((await request('/api/reports',credential,{...body,description:'changed'})).status,409);
 assert.equal((await request('/api/reports',token(),body)).status,409);sql.close();
});
test('reports require a credential, valid fields, bounded text and an allowed origin',async()=>{
 const {sql,request}=setup();assert.equal((await request('/api/reports',null,report())).status,401);
 for(const change of [{description:''},{description:'x'.repeat(2001)},{id:'not-a-uuid'},{mode:'unknown'},{build:'<html>'},{distribution:'bad url'}])assert.equal((await request('/api/reports',token(),report(change))).status,400);
 assert.equal((await request('/api/reports',token(),report(),{origin:'https://unrelated.example'})).status,403);
 assert.equal((await request('/api/reports',token(),{}, {method:'GET'})).status,405);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM bug_reports').get().n,0);sql.close();
});
test('one installation cannot flood the inbox, but retrying an accepted report succeeds',async()=>{
 const {sql,request}=setup(),credential=token(),first=report();assert.equal((await request('/api/reports',credential,first)).status,201);
 for(let i=0;i<4;i++)assert.equal((await request('/api/reports',credential,report())).status,201);
 assert.equal((await request('/api/reports',credential,report())).status,429);assert.equal((await request('/api/reports',credential,first)).status,200);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM bug_reports').get().n,5);sql.close();
});
test('only a registered owner can read or update reports, independently of admin mode',async()=>{
 const {sql,request}=setup(),player=token(),owner=token(),body=report();await request('/api/reports',player,body);
 for(const credential of [player,token()]){
  assert.equal((await request('/api/reports/inbox',credential,{adminMode:true})).status,403);
  assert.equal((await request('/api/reports/status',credential,{id:body.id,status:'resolved',owner:true})).status,403);
 }
 sql.prepare('INSERT INTO owners(player_id,admin_active) VALUES(?,0)').run(await hash(owner));
 const inbox=await request('/api/reports/inbox',owner);assert.equal(inbox.status,200);const page=await inbox.json();assert.equal(page.unread,1);assert.equal(page.reports[0].description,body.description);assert(!('reporter_id' in page.reports[0]));
 assert.equal((await request('/api/reports/status',owner,{id:body.id,status:'resolved'})).status,200);
 const resolved=await (await request('/api/reports/inbox',owner,{filter:'resolved'})).json();assert.equal(resolved.unread,0);assert.equal(resolved.reports.length,1);
 assert.equal((await request('/api/reports/status',owner,{id:body.id,status:'invalid'})).status,400);sql.close();
});
test('inbox pages with identical timestamps have no duplicate or missing reports',async()=>{
 const {sql,request}=setup(),owner=token();sql.prepare('INSERT INTO owners(player_id) VALUES(?)').run(await hash(owner));const at=Date.now();
 const insert=sql.prepare("INSERT INTO bug_reports(id,reporter_id,mode,description,build,distribution,created_at,updated_at) VALUES(?,?,'Other',?,'4.94.240','github',?,?)");
 for(let i=0;i<32;i++)insert.run(crypto.randomUUID(),'test',String(i),at,at);
 const first=await (await request('/api/reports/inbox',owner)).json();assert.equal(first.reports.length,25);assert(first.next);
 const second=await (await request('/api/reports/inbox',owner,{before:first.next})).json();assert.equal(second.reports.length,7);assert.equal(second.next,null);
 assert.equal(new Set([...first.reports,...second.reports].map(r=>r.id)).size,32);sql.close();
});
test('database failure never falsely acknowledges a sent report',async()=>{
 const {sql,env,request}=setup();env.DB.prepare=()=>{throw Error('offline');};const response=await request('/api/reports',token(),report());assert.equal(response.status,503);assert.equal((await response.json()).saved,undefined);sql.close();
});
test('expired reports disappear from the owner inbox',async()=>{
 const {sql,request}=setup(),owner=token();sql.prepare('INSERT INTO owners(player_id) VALUES(?)').run(await hash(owner));
 sql.prepare("INSERT INTO bug_reports VALUES(?,?,'Other','old','4.94.239','github',0,0,'new')").run(crypto.randomUUID(),'test');
 const page=await (await request('/api/reports/inbox',owner)).json();assert.equal(page.reports.length,0);assert.equal(page.unread,0);sql.close();
});
