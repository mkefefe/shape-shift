import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createReportInbox} from './report-inbox.js';
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const row=(id,status='new')=>({id,status,mode:'Piano Flow',description:'<img src=x onerror=alert(1)>',build:'4.94.241',distribution:'github',createdAt:1800000000000});
const reply=(reports,next=null,unread=reports.filter(r=>r.status==='new').length)=>({reports,next,unread});

test('inbox pagination keeps the filter and does not duplicate a report from the next page',async()=>{
 const calls=[],cursor={createdAt:1800000000000,id};
 const inbox=createReportInbox({load:async request=>{calls.push(request);return calls.length===1?reply([row(id)],cursor,2):reply([row(id),row(other)],null,2);}});
 await inbox.refresh({selected:'all'});await inbox.refresh({more:true});
 assert.deepEqual(calls,[{filter:'all'},{filter:'all',before:cursor}]);assert.deepEqual(inbox.snapshot().reports.map(r=>r.id),[id,other]);assert.equal(inbox.snapshot().unread,2);
});

test('changing the inbox filter cancels old loading and ignores its late response',async()=>{
 let firstReply,firstSignal;const inbox=createReportInbox({load:(request,{signal})=>request.filter==='new'?new Promise(resolve=>{firstReply=resolve;firstSignal=signal;}):Promise.resolve(reply([row(other,'resolved')]))});
 const pending=inbox.refresh();await inbox.refresh({selected:'resolved'});assert(firstSignal.aborted);firstReply(reply([row(id)]));await pending;
 assert.equal(inbox.snapshot().filter,'resolved');assert.deepEqual(inbox.snapshot().reports.map(r=>r.id),[other]);
});

test('marking read waits for confirmation, suppresses duplicate clicks, and updates the filtered list and unread count',async()=>{
 let confirm,calls=0;const inbox=createReportInbox({load:async()=>reply([row(id)],null,3),update:()=>{calls++;return new Promise(resolve=>confirm=resolve);}});
 await inbox.refresh();const pending=inbox.mark(id,'read');await inbox.mark(id,'read');assert.equal(calls,1);assert.equal(inbox.snapshot().reports[0].status,'new');
 confirm({saved:true,id,status:'read'});await pending;assert.deepEqual(inbox.snapshot().reports,[]);assert.equal(inbox.snapshot().unread,2);
});

test('failed status updates retain the report and private data is cleared on close or changed session',async()=>{
 let current=true;const inbox=createReportInbox({isCurrent:()=>current,load:async()=>reply([row(id)]),update:async()=>{throw Error('offline');}});
 await inbox.refresh();await inbox.mark(id,'resolved');assert.equal(inbox.snapshot().reports[0].status,'new');assert.match(inbox.snapshot().error,/Could not update/);
 current=false;await inbox.refresh();assert.deepEqual(inbox.snapshot().reports,[]);assert.equal(inbox.snapshot().unread,0);
 current=true;await inbox.refresh();inbox.clear();assert.deepEqual(inbox.snapshot().reports,[]);
});

test('a response arriving after close cannot recreate the private report list',async()=>{
 let receive;const inbox=createReportInbox({load:()=>new Promise(resolve=>receive=resolve)});const pending=inbox.refresh();inbox.clear();receive(reply([row(id)]));await pending;assert.deepEqual(inbox.snapshot().reports,[]);assert.equal(inbox.snapshot().loading,false);
});

test('report messages are rendered as text and the owner button does not depend on admin mode',()=>{
 const source=fs.readFileSync(new URL('./report-inbox.js',import.meta.url),'utf8');
 assert.match(source,/node\.textContent=value/);assert.match(source,/text\('p',report\.description/);
 assert.doesNotMatch(source,/innerHTML\s*=\s*(?:report|.*report\.description)/);assert.doesNotMatch(source,/adminMode/);
 assert.match(source,/button\.hidden=true/);assert.match(source,/setOwner\(value\).*value===true/);
});
