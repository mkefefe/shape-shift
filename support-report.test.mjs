import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBugReport,SUPPORT_EMAIL} from './support-report.js';
import {openSupportLink,bindSupportLinks,loadPrivacyContent} from './privacy-content.js';
import {isTextEntry,initTouchUI} from './touch-ui.js';
import {bindPauseKeyboard} from './pause-keyboard.js';

test('report email carries plain description and build without interpreting HTML or query characters',()=>{
 const description='Music stopped & the menu said <p>hello</p>\nExpected: sound + buttons.';
 const report=buildBugReport({description,mode:'Shape Drop',version:'4.94.238'});
 const url=new URL(report.href);
 assert.equal(url.pathname,SUPPORT_EMAIL);assert.equal(report.copyRequired,false);
 assert.equal(url.searchParams.get('body'),report.text);
 assert(report.text.includes('Version: 4.94.238\nWhere: Shape Drop'));
 assert(report.text.endsWith(description));assert.equal(url.searchParams.size,2);
 assert.throws(()=>buildBugReport({description:'  \n '}),/Describe/);
});

test('long and non-Latin reports preserve their complete text within Android link limits',()=>{
 const description='音楽が止まる 🎵 '.repeat(200);
 const report=buildBugReport({description,mode:'untrusted mode',version:'4.94.238'});
 assert.equal(report.copyRequired,true);assert(report.href.length<2048);
 assert.equal(new URL(report.href).searchParams.has('body'),false);
 assert(report.text.endsWith(description.trim()));assert(report.text.includes('Where: Other'));
});

test('external links use Android bridge and reject executable URLs',()=>{
 const opened=[];const host={location:{href:'https://game.test/'},ShapeShiftLinks:{open:url=>opened.push(url)}};
 assert.equal(openSupportLink('javascript:alert(1)',host),false);assert.equal(opened.length,0);
 const report=buildBugReport({description:'Cannot hear music',version:'4.94.238'});
 assert.equal(openSupportLink(report.href,host),true);assert.deepEqual(opened,[report.href]);
 const web={location:{href:'https://game.test/'},open:(...args)=>opened.push(args)};
 openSupportLink(report.href,web);assert.equal(web.location.href,report.href);
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
