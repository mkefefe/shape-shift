import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBugReport,createReportDraft,REPORT_DRAFT_KEY} from './support-report.js';
import {openSupportLink,bindSupportLinks,loadPrivacyContent} from './privacy-content.js';
import {isTextEntry,initTouchUI} from './touch-ui.js';
import {bindPauseKeyboard} from './pause-keyboard.js';

const id1='11111111-1111-4111-8111-111111111111',id2='22222222-2222-4222-8222-222222222222';
const draftStorage=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};};
test('report payload preserves plain Unicode text and sends only the requested report fields',()=>{
 const description='Music stopped & the menu said <p>hello</p>\nExpected: 音楽 🎵 + buttons.';
 const report=buildBugReport({description:'  '+description+'  ',mode:'Shape Drop',version:'4.94.240',distribution:'github',id:id1});
 assert.deepEqual(report,{id:id1,description,mode:'Shape Drop',build:'4.94.240',distribution:'github'});
 assert.equal(buildBugReport({description:'test',mode:'untrusted mode',id:id1}).mode,'Other');
 assert.throws(()=>buildBugReport({description:'  \n '}),/Describe/);
 assert.throws(()=>buildBugReport({description:'a'.repeat(2001)}),/2,000/);
});

test('failed reports retain a local draft and reuse the same request after reopening',async()=>{
 const storage=draftStorage(),calls=[];
 const first=createReportDraft({storage,randomId:()=>id1,submit:async payload=>{calls.push(payload);throw Error('offline');}});
 first.update({description:'音楽が止まる 🎵',mode:'Piano Flow'});await assert.rejects(first.send(first.beginView()),/offline/);
 assert.equal(first.snapshot().description,'音楽が止まる 🎵');assert(storage.getItem(REPORT_DRAFT_KEY));
 const reopened=createReportDraft({storage,randomId:()=>assert.fail('Retry must reuse its original id'),submit:async payload=>{calls.push(payload);return {saved:true,id:payload.id};}});
 await reopened.send(reopened.beginView());assert.deepEqual(calls[1],calls[0]);assert.equal(reopened.snapshot().description,'');assert.equal(storage.getItem(REPORT_DRAFT_KEY),null);
});

test('duplicate submit events share one request and only a matching acknowledgment clears the draft',async()=>{
 const storage=draftStorage();let calls=0,reply;
 const draft=createReportDraft({storage,randomId:()=>id1,submit:payload=>{calls++;return new Promise(resolve=>reply=resolve);}});
 draft.update({description:'Buttons stop working'});const view=draft.beginView(),first=draft.send(view),second=draft.send(view);
 assert.equal(first,second);assert.equal(draft.snapshot().pending,true);await Promise.resolve();assert.equal(calls,1);
 reply({saved:true,id:id1});assert.equal((await first).cleared,true);assert.equal(draft.snapshot().pending,false);assert.equal(draft.snapshot().description,'');
 const unconfirmed=createReportDraft({storage,randomId:()=>id2,submit:async()=>({saved:true,id:id1})});unconfirmed.update({description:'Keep this draft'});await assert.rejects(unconfirmed.send(unconfirmed.beginView()),/not confirm/);assert.equal(unconfirmed.snapshot().description,'Keep this draft');
});

test('editing while a report is sending keeps the new draft and gives it a different request id',async()=>{
 const calls=[];let reply,number=0;
 const draft=createReportDraft({storage:draftStorage(),randomId:()=>[id1,id2][number++],submit:payload=>{calls.push(payload);return calls.length===1?new Promise(resolve=>reply=resolve):Promise.resolve({saved:true,id:payload.id});}});
 draft.update({description:'First report',mode:'Endless'});const view=draft.beginView(),pending=draft.send(view);await Promise.resolve();draft.update({description:'A different issue',mode:'Battle'});reply({saved:true,id:id1});
 assert.equal((await pending).cleared,false);assert.equal(draft.snapshot().description,'A different issue');await draft.send(view);assert.equal(calls[1].id,id2);assert.equal(calls[1].description,'A different issue');
});

test('late success from an earlier form opening never clears a reopened form',async()=>{
 let reply,calls=0;
 const draft=createReportDraft({storage:draftStorage(),randomId:()=>id1,submit:()=>{calls++;return new Promise(resolve=>reply=resolve);}});
 draft.update({description:'Keep on screen'});const pending=draft.send(draft.beginView());await Promise.resolve();draft.endView();const reopened=draft.beginView();reply({saved:true,id:id1});
 assert.equal((await pending).cleared,false);assert.equal(draft.snapshot().description,'Keep on screen');assert.equal(draft.snapshot().sent,true);assert.equal((await draft.send(reopened)).alreadySent,true);assert.equal(calls,1);
});

test('external support links still use the Android bridge and reject executable URLs',()=>{
 const opened=[];const host={location:{href:'https://game.test/'},ShapeShiftLinks:{open:url=>opened.push(url)}};
 assert.equal(openSupportLink('javascript:alert(1)',host),false);assert.equal(opened.length,0);
 const href='mailto:mk.studio.customersupport@gmail.com';assert.equal(openSupportLink(href,host),true);assert.deepEqual(opened,[href]);
 const web={location:{href:'https://game.test/'},open:(...args)=>opened.push(args)};
 openSupportLink('https://example.test/help',web);assert.deepEqual(opened.at(-1),['https://example.test/help','_blank','noopener,noreferrer']);
});

test('game text selection and dragging are blocked without blocking editable report fields',()=>{
 const events=new Map();initTouchUI({addEventListener:(type,callback)=>events.set(type,callback)});
 const textarea={tagName:'TEXTAREA'},field={closest:()=>textarea};
 assert.equal(isTextEntry(field),true);assert.equal(isTextEntry({closest:()=>({tagName:'INPUT',type:'range'})}),false);
 for(const type of ['contextmenu','selectstart','dragstart']){
  let prevented=0;events.get(type)({target:field,preventDefault:()=>prevented++});assert.equal(prevented,0);
  events.get(type)({target:{closest:()=>null},preventDefault:()=>prevented++});assert.equal(prevented,1);
 }
 assert(!events.has('pointerdown'));assert(!events.has('touchstart'));
});

test('privacy loader renders bundled policy content and retries a failed load',async()=>{
 const originals={fetch:globalThis.fetch,DOMParser:globalThis.DOMParser,document:globalThis.document};
 const main={childNodes:[{nodeName:'H1',textContent:'Shape Shift privacy policy'},{nodeName:'P',textContent:'Saved on this device.'}]};
 const host={dataset:{},textContent:'',children:[],listeners:0,replaceChildren(...nodes){this.children=nodes;},append(node){this.children.push(node);},addEventListener(){this.listeners++;}};
 let requests=0;
 try{
  globalThis.fetch=async()=>({ok:++requests>1,text:async()=>'<main>policy</main>'});
  globalThis.DOMParser=class{parseFromString(){return {querySelector:()=>main};}};
  globalThis.document={importNode:node=>({...node}),createElement:()=>({})};
  assert.equal(await loadPrivacyContent(host),false);assert.equal(host.children.at(-1).textContent,'Try again');assert.equal(host.dataset.loading,undefined);
  assert.equal(await loadPrivacyContent(host),true);assert.deepEqual(host.children,main.childNodes);assert.equal(host.dataset.loaded,'yes');
  assert.equal(await loadPrivacyContent(host),true);assert.equal(requests,2);bindSupportLinks(host);assert.equal(host.listeners,1);
 }finally{Object.assign(globalThis,originals);}
});

test('report form keeps Enter and WASD as native typing even after pointer editing',()=>{
 const events=new Map();bindPauseKeyboard({addEventListener:(type,callback)=>events.set(type,callback)});
 const target={dataset:{menuEditing:'true'},closest:selector=>selector.includes('data-native-form')?{}:null,matches:()=>true};
 for(const code of ['Enter','KeyW','Space','KeyS']){
  let consumed=false;events.get('keydown')({target,code,preventDefault:()=>consumed=true,stopImmediatePropagation:()=>consumed=true});
  assert.equal(consumed,false);assert.equal(target.dataset.menuEditing,'true');
 }
});

test('privacy startup shares its request and a timed-out request can be retried',async()=>{
 const originals={DOMParser:globalThis.DOMParser,document:globalThis.document};
 const host={dataset:{},children:[],replaceChildren(...nodes){this.children=nodes;},append(node){this.children.push(node);},addEventListener(){}};
 let requests=0,aborted=false;
 const fetcher=(_url,{signal})=>{requests++;return new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(Error('aborted'));},{once:true}));};
 try{
  globalThis.document={createElement:()=>({}),importNode:node=>node};
  const first=loadPrivacyContent(host,{fetcher,timeout:5}),second=loadPrivacyContent(host,{fetcher,timeout:5});
  assert.equal(first,second);assert.equal(await first,false);assert.equal(requests,1);assert.equal(aborted,true);
  assert.equal(host.dataset.loading,undefined);assert.equal(host.children.at(-1).textContent,'Try again');
  const content={textContent:'Policy'};globalThis.DOMParser=class{parseFromString(){return {querySelector:()=>({childNodes:[content]})};}};
  const retry=loadPrivacyContent(host,{fetcher:async()=>{requests++;return {ok:true,text:async()=>'<main>Policy</main>'};}});
  assert.equal(await retry,true);assert.equal(requests,2);assert.deepEqual(host.children,[content]);assert.equal(host.dataset.loaded,'yes');
 }finally{Object.assign(globalThis,originals);}
});
