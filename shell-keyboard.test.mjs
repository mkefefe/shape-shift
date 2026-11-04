import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {keyboardHelpFor} from './keyboard-help.js';

const source=readFileSync(new URL('./shell-keyboard.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/,'');
const index=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const backdropScript=[...index.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]).find(text=>text.includes('shape-shift-ready'));
assert(backdropScript,'Outer ready handler must be tested from its shipped source');

function fixture(){
 const listeners=new Map(),messages=new Map(),keys=[],scroll=[],observed=[],nodes=[];
 let focused=0,injectedReads=0;
 const element=tag=>({tag,children:[],hidden:false,append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},setAttribute(name,value){this[name]=value;},focus(){}});
 const cover={hidden:true},app={dataset:{screen:'game'}},active={closest:()=>null,dispatchEvent:event=>keys.push(event)};
 const gameDocument={readyState:'complete',documentElement:{lang:'en',classList:{contains:()=>false}},body:element('body'),activeElement:active,
  getElementById:id=>({'startup-ready':cover,app}[id]),querySelectorAll:()=>[]};
 class SyntheticEvent{constructor(type,options){this.type=type;Object.assign(this,options);}}
 const gameWindow={focus(){focused++;},dispatchEvent:event=>scroll.push(event),CustomEvent:SyntheticEvent};
 const frame={contentDocument:gameDocument,contentWindow:gameWindow,clientHeight:600,addEventListener(type,listener){this[type]=listener;}};
 // Model the real host injection: a hidden iframe precedes the game's main.
 const injectedWindow={};
 const injected={hidden:true,id:'SBBCrossIframe',get contentDocument(){injectedReads++;return {readyState:'loading',getElementById:()=>null};},contentWindow:injectedWindow,addEventListener(){}};
 const backdrop={dataset:{src:'assets/delivery-v144/home-world-v101.webp'}};
 const document={body:element('body'),documentElement:{lang:'en'},
  querySelector:selector=>selector==='iframe'?injected:selector==='main>iframe'?frame:selector==='.backdrop'?backdrop:null,
  createElement:tag=>{const node=element(tag);nodes.push(node);return node;},
  addEventListener(type,listener){listeners.set(type,listener);}};
 const context=vm.createContext({document,keyboardHelpFor,KeyboardEvent:SyntheticEvent,
  MutationObserver:class{observe(target){observed.push(target);}disconnect(){}},
  requestAnimationFrame:()=>1,sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  addEventListener(type,listener){messages.set(type,listener);}});
 function dispatch(type,options={}){
  const event={type,code:'KeyA',key:'a',deltaY:120,deltaMode:0,prevented:false,
   target:{closest:selector=>options.editing&&selector.includes('input')?{}:options.help&&selector.includes('#keyboard-help')?{}:null},
   preventDefault(){this.prevented=true;},...options};
  listeners.get(type)?.(event);return event;
 }
 return {runShell:()=>vm.runInContext(source,context),runBackdrop:()=>vm.runInContext(backdropScript,context),dispatch,
  message:(source,data)=>messages.get('message')?.({source,data}),keys,scroll,observed,nodes,cover,gameDocument,gameWindow,injectedWindow,backdrop,
  focused:()=>focused,injectedReads:()=>injectedReads};
}

test('an injected leading iframe cannot take game keys, scroll or desktop help',()=>{
 const f=fixture();f.runShell();
 for(const code of ['KeyA','KeyS','KeyD','KeyF'])for(const type of ['keydown','keyup']){
  const event=f.dispatch(type,{code,key:code.at(-1).toLowerCase()});assert.equal(event.prevented,true);
 }
 assert.deepEqual(f.keys.map(({type,code})=>[type,code]),['KeyA','KeyS','KeyD','KeyF'].flatMap(code=>[['keydown',code],['keyup',code]]));
 assert.equal(f.focused(),8);
 for(const [deltaMode,deltaY] of [[0,120],[1,2],[2,1]])assert.equal(f.dispatch('wheel',{deltaMode,deltaY}).prevented,true);
 assert.deepEqual(f.scroll.map(event=>[event.type,event.detail]),[['shape-shift-scroll',120],['shape-shift-scroll',40],['shape-shift-scroll',600]]);
 assert.deepEqual(f.observed,[f.gameDocument.documentElement]);
 assert.equal(f.nodes.find(node=>node.id==='keyboard-help').hidden,false);
 assert.equal(f.injectedReads(),0);
});

test('scoped shell forwarding still respects loading, text editing and browser shortcuts',()=>{
 const f=fixture();f.runShell();
 for(const options of [{ctrlKey:true},{metaKey:true},{altKey:true},{isComposing:true},{editing:true},{code:'KeyZ'},{code:'Enter',help:true}])
  assert.equal(f.dispatch('keydown',options).prevented,false);
 for(const options of [{ctrlKey:true},{metaKey:true},{deltaY:0}])assert.equal(f.dispatch('wheel',options).prevented,false);
 f.cover.hidden=false;
 assert.equal(f.dispatch('keydown').prevented,false);assert.equal(f.dispatch('wheel').prevented,false);
 assert.equal(f.keys.length,0);assert.equal(f.scroll.length,0);assert.equal(f.focused(),0);assert.equal(f.injectedReads(),0);
});

test('the backdrop accepts readiness from the real game and ignores the injected iframe',()=>{
 const f=fixture();f.runBackdrop();
 f.message(f.injectedWindow,'shape-shift-ready');assert.equal(f.backdrop.src,undefined);
 f.message(f.gameWindow,'unrelated-message');assert.equal(f.backdrop.src,undefined);
 f.message(f.gameWindow,'shape-shift-ready');assert.equal(f.backdrop.src,f.backdrop.dataset.src);
});
