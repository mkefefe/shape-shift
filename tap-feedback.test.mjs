import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('./input-feedback.js',import.meta.url),'utf8');
function harness(mode){
 const handlers={},animations=[];
 class Element{
  constructor(){this.children=[];this.style={};this.attributes={};this.classList={contains:()=>false,add(){},remove(){}};}
  setAttribute(k,v){this.attributes[k]=v;} removeAttribute(k){delete this.attributes[k];}
  append(el){el.parent=this;this.children.push(el);} replaceChildren(){this.children=[];}
  get childElementCount(){return this.children.length;} closest(){return null;}
  matches(selector){if(selector.includes(':popover'))throw Error('unsupported selector');return false;}
  animate(frames,options){animations.push({frames,options});return {finished:new Promise(()=>{})};}
 }
 const body=new Element(),modal=new Element(),doc={body,addEventListener:(k,f)=>handlers[k]=f,querySelectorAll:()=>[modal],createElement:()=>{const e=new Element();if(mode!=='missing'){e.showPopover=()=>{if(mode==='throws')throw Error('popover unavailable');e.shown=true;};e.hidePopover=()=>{e.shown=false;};}return e;}};
 const context={document:doc,window:{ShapeShiftPlatform:{clearTimeout(){},setTimeout(){}},addEventListener(){}},Element,MutationObserver:class{observe(){}},console,Math,Promise};
 vm.runInNewContext(source.replace('export function','function')+'\ninitInputFeedback();',context);
 handlers.pointerdown({button:0,pointerType:'touch',pointerId:1,clientX:120,clientY:250,target:body});
 return {layer:body.children[0],modal,animations};
}
for(const mode of ['missing','throws','supported'])test('touch ripple and eight sparks render with popover '+mode,()=>{
 const {layer,modal,animations}=harness(mode);assert.equal(animations.length,9);assert.equal(layer.children.length,1);assert.equal(layer.children[0].style.left,'120px');assert.equal(layer.children[0].style.top,'250px');
 if(mode==='supported')assert(layer.shown);else{assert.equal(layer.parent,modal);assert(!('popover' in layer.attributes));}
 assert(animations[0].frames.at(-1).transform.includes('1.25'));assert(animations.slice(1).every(a=>a.frames.at(-1).opacity===0));
});
test('base effect layout does not depend on a supported popover pseudo-class',()=>{
 const css=fs.readFileSync(new URL('./input-feedback.css',import.meta.url),'utf8');assert(css.includes('#tap-effects{position:fixed;'));assert(!css.includes(':popover-open'));
});
