import test from 'node:test';
import assert from 'node:assert/strict';
import {supportRequest,submitBugReport,loadReportInbox,updateReportStatus,REPORT_TOKEN_KEY,supportErrorMessage} from './support-api.js';
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const payload={id,mode:'Piano Flow',description:'音楽 stopped <script>safe text</script>',build:'4.94.241',distribution:'github'};
const entry={...payload,createdAt:1800000000000,status:'new'};
function fixture(entries=[]){const values=new Map(entries),calls=[];const platform={storage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))}};return {values,calls,platform};}
const response=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});

test('report submission works with rankings and statistics off and never adds private fields to the payload',async()=>{
 const f=fixture([['shape-shift-online-disabled','1'],['shape-shift-statistics','no']]);
 const result=await submitBugReport({...payload,email:'not sent',token:'not sent',photo:'not sent'},{platform:f.platform,randomId:()=>id,fetcher:async(url,options)=>{f.calls.push({url,options});return response({saved:true,id},201);}});
 assert.deepEqual(result,{saved:true,id});assert.deepEqual(JSON.parse(f.calls[0].options.body),payload);
 assert.equal(f.calls[0].options.credentials,'omit');assert.match(f.calls[0].options.headers.Authorization,/^Bearer /);
 assert.equal(f.values.get('shape-shift-online-disabled'),'1');assert.equal(f.values.get('shape-shift-statistics'),'no');
});

test('reports reuse the existing installation credential and require an exact server acknowledgment',async()=>{
 const f=fixture([[REPORT_TOKEN_KEY,'existing-installation-credential']]);
 await submitBugReport(payload,{platform:f.platform,randomId:()=>assert.fail('must retain existing token'),fetcher:async(_url,options)=>{assert.equal(options.headers.Authorization,'Bearer existing-installation-credential');return response({saved:true,id});}});
 for(const reply of [{saved:false,id},{saved:true,id:other},{}])await assert.rejects(submitBugReport(payload,{platform:f.platform,fetcher:async()=>response(reply)}),/did not confirm/);
});

test('a missing acknowledgment, bad status, or rate limit is an error rather than a sent report',async()=>{
 const f=fixture();
 for(const status of [400,403,429,500])await assert.rejects(submitBugReport(payload,{platform:f.platform,fetcher:async()=>response({error:'<script>untrusted</script>'},status)}),error=>error.status===status&&!error.message.includes('<script>'));
 assert.match(supportErrorMessage({status:429}),/draft is kept/);
 await assert.rejects(submitBugReport({...payload,description:' '},{platform:f.platform}),/Please enter/);
});

test('report timeout aborts the network request and leaves a retryable error',async()=>{
 const f=fixture();let aborted=false;
 await assert.rejects(submitBugReport(payload,{platform:f.platform,timeout:5,fetcher:(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(Object.assign(Error('aborted'),{name:'AbortError'}));},{once:true}))}),{code:'TIMEOUT'});
 assert(aborted);
});

test('token changes invalidate responses and abort a still-pending owner request',async()=>{
 const f=fixture([[REPORT_TOKEN_KEY,'old-credential']]);
 await assert.rejects(submitBugReport(payload,{platform:f.platform,fetcher:async()=>{f.values.set(REPORT_TOKEN_KEY,'new-credential');return response({saved:true,id});}}),{code:'SESSION_CHANGED'});
 let started,aborted=false;const ready=new Promise(resolve=>started=resolve);
 const pending=loadReportInbox({filter:'new'},{platform:f.platform,fetcher:(_url,{signal})=>{started();return new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(Error('aborted'));},{once:true}));}});
 await ready;f.values.set(REPORT_TOKEN_KEY,'third-credential');await assert.rejects(pending,{code:'SESSION_CHANGED'});assert(aborted);
});

test('closing an inbox can cancel its request without treating cancellation as saved data',async()=>{
 const f=fixture(),controller=new AbortController();let started;const ready=new Promise(resolve=>started=resolve);
 const pending=loadReportInbox({filter:'all'},{platform:f.platform,signal:controller.signal,fetcher:(_url,{signal})=>{started();return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(Error('closed'),{name:'AbortError'})),{once:true}));}});
 await ready;controller.abort();await assert.rejects(pending,{name:'AbortError'});
});

test('inbox and status requests preserve pagination and validate owner-only response contracts',async()=>{
 const f=fixture(),before={id,createdAt:1800000000000},calls=[];
 const options={platform:f.platform,fetcher:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return response(url.endsWith('/status')?{saved:true,id,status:'resolved'}:{reports:[entry],next:before,unread:1});}};
 const result=await loadReportInbox({filter:'all',before},options);assert.equal(result.reports[0].description,payload.description);assert.deepEqual(calls[0].body,{filter:'all',before});
 await updateReportStatus(id,'resolved',options);assert.deepEqual(calls[1].body,{id,status:'resolved'});
 await assert.rejects(loadReportInbox({filter:'all'},{platform:f.platform,fetcher:async()=>response({reports:[{...entry,status:'unknown'}],next:null,unread:1})}),/incomplete report list/);
 await assert.rejects(updateReportStatus(id,'read',{platform:f.platform,fetcher:async()=>response({saved:true,id,status:'resolved'})}),/did not confirm/);
 await assert.rejects(supportRequest('/api/admin',{},options),/Unknown report/);
});
