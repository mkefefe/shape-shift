import test from 'node:test';
import assert from 'node:assert/strict';
import {guidedMatch} from './guided-match.js';
import {fitBoard} from './board-fit.js';

// Reflect attributes, child identity and styles so the real tutorial and fitter
// share the same board, as they do when a ResizeObserver runs in the browser.
class Style{
 constructor(){this.values=new Map();}
 setProperty(key,value,priority=''){this.values.set(key,{value:String(value),priority});}
 getPropertyValue(key){return this.values.get(key)?.value||'';}
 get cssText(){return [...this.values].map(([key,{value,priority}])=>`${key}: ${value}${priority?' !'+priority:''};`).join(' ');}
 set cssText(text){this.values.clear();for(const entry of text.split(';')){const colon=entry.indexOf(':');if(colon<0)continue;const raw=entry.slice(colon+1).trim(),important=raw.endsWith('!important');this.setProperty(entry.slice(0,colon).trim(),important?raw.slice(0,-10).trim():raw,important?'important':'');}}
}

class Element{
 constructor(tag){
  this.tagName=tag;this.attrs=new Map();this.childNodes=[];this.parentNode=null;this.className='';this.textContent='';this.style=new Style();
  this.dataset=new Proxy({}, {get:(_,key)=>this.getAttribute('data-'+key)??undefined,set:(_,key,value)=>{this.setAttribute('data-'+key,value);return true;},deleteProperty:(_,key)=>{this.removeAttribute('data-'+key);return true;}});
  this.classList={contains:name=>this.className.split(/\s+/).includes(name),add:(...names)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...names])].join(' ');},remove:(...names)=>{this.className=this.className.split(/\s+/).filter(name=>!names.includes(name)).join(' ');}};
 }
 get children(){return this.childNodes;}
 getAttribute(key){return key==='style'?(this.style.cssText||null):this.attrs.get(key)??null;}
 setAttribute(key,value){if(key==='style')this.style.cssText=String(value);else this.attrs.set(key,String(value));}
 removeAttribute(key){if(key==='style')this.style.cssText='';else this.attrs.delete(key);}
 append(...children){for(const child of children){child.remove();child.parentNode=this;this.childNodes.push(child);}}
 replaceChildren(...children){for(const child of this.childNodes)child.parentNode=null;this.childNodes=[];this.append(...children);}
 before(child){child.remove();const parent=this.parentNode;child.parentNode=parent;parent.childNodes.splice(parent.childNodes.indexOf(this),0,child);}
 remove(){if(this.parentNode){const siblings=this.parentNode.childNodes;siblings.splice(siblings.indexOf(this),1);this.parentNode=null;}}
 querySelectorAll(selector){return this.children.filter(child=>child.classList.contains(selector.slice(1)));}
 focus(){}
}

function fixture(t,{optionalAttributes=true}={}){
 const elements=[],listeners=new Map(),timers=new Map(),sounds=[];let timerId=0,now=0;
 const doc={
  createElement(tag){const element=new Element(tag);elements.push(element);return element;},
  getElementById:id=>elements.find(element=>element.id===id),
  addEventListener:(name,callback)=>listeners.set(name,callback),
  removeEventListener:(name,callback)=>{if(listeners.get(name)===callback)listeners.delete(name);},
  defaultView:{setTimeout(callback,delay){const id=++timerId;timers.set(id,{callback,at:now+delay});return id;},clearTimeout:id=>timers.delete(id)}
 };
 const create=(tag,id)=>Object.assign(doc.createElement(tag),{id});
 const game=create('section','game'),board=create('div','board'),current=create('div','current-sprite'),name=create('strong','current-name'),status=create('span','board-status');
 game.append(current,name,status,board);board.className='board';board.clientWidth=440;board.clientHeight=476;board.dataset.columns='1';board.dataset.count='1';
 if(optionalAttributes){board.dataset.layout='islands';board.dataset.linear='true';}
 board.style.setProperty('border-color','blue');
 const originalChoice=doc.createElement('button');originalChoice.className='choice';originalChoice.onclick=()=>sounds.push('original-choice');board.append(originalChoice);
 const originalArt=doc.createElement('canvas');current.className='sprite original-art';current.style.setProperty('opacity','0.7');current.append(originalArt);name.textContent='Original shape';status.textContent='Original status';
 const originalCurrentStyle=current.getAttribute('style'),originalCurrentClass=current.className;
 const originalAttrs=Object.fromEntries(['count','columns','layout','linear'].map(key=>[key,board.getAttribute('data-'+key)]));
 const previousComputedStyle=globalThis.getComputedStyle;
 globalThis.getComputedStyle=()=>({paddingLeft:'14',paddingRight:'14',paddingTop:'14',paddingBottom:'14',gap:game.classList.contains('guided-match-active')?'18':'8'});
 t.after(()=>{if(previousComputedStyle===undefined)delete globalThis.getComputedStyle;else globalThis.getComputedStyle=previousComputedStyle;});
 fitBoard(board);
 const sprite=(element,tile)=>{element.className='sprite skinned';element.style.setProperty('--shape',tile.shape);element.replaceChildren(doc.createElement('canvas'));};
 return {
  doc,game,board,current,timers,listeners,sounds,
  launch:()=>guidedMatch({doc,sprite,sound:value=>sounds.push(value)}),
  skip(){elements.find(element=>element.textContent==='Skip practice').onclick();},
  tick(ms){now+=ms;while(true){const next=[...timers].filter(([,timer])=>timer.at<=now).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)return;timers.delete(next[0]);next[1].callback();}},
  assertRestored(){
   for(const [key,value] of Object.entries(originalAttrs))assert.equal(board.getAttribute('data-'+key),value,`restore data-${key}`);
   assert.equal(board.children.length,1);assert.equal(board.children[0],originalChoice);assert.equal(current.children.length,1);assert.equal(current.children[0],originalArt);
   assert.equal(current.className,originalCurrentClass);assert.equal(current.getAttribute('style'),originalCurrentStyle);assert.equal(board.style.getPropertyValue('border-color'),'blue');
   assert.equal(name.textContent,'Original shape');assert.equal(status.textContent,'Original status');assert.equal(game.classList.contains('guided-match-active'),false);
   assert.equal(elements.find(element=>element.id==='guided-match').parentNode,null);assert.equal(timers.size,0);assert.equal(listeners.size,0);
   assert.equal(board.style.getPropertyValue('--cols'),'1');assert.equal(board.style.getPropertyValue('--rows'),'1');
   originalChoice.onclick();assert.equal(sounds.at(-1),'original-choice');
  }
 };
}

function assertTwoChoiceFit(board,width,height){
 board.clientWidth=width;board.clientHeight=height;fitBoard(board);
 assert.equal(board.dataset.columns,'2');assert.equal(board.dataset.count,'2');assert.equal(board.dataset.layout,'classic');assert.equal(board.dataset.linear,'false');
 assert.equal(board.children.length,2);assert.equal(board.style.getPropertyValue('--cols'),'2');assert.equal(board.style.getPropertyValue('--rows'),'1');
 const track=parseFloat(board.style.getPropertyValue('--track'));
 assert.equal(board.style.getPropertyValue('grid-template-columns'),`repeat(2, ${track}px)`);assert.equal(board.style.getPropertyValue('grid-template-rows'),`repeat(1, ${track}px)`);
 assert.ok(track*2+18<=width-28,`two choices fit width ${width}`);assert.ok(track<=height-28,`one row fits height ${height}`);
}

test('guided practice keeps two choices beside each other after resizing a one-column Adventure board',async t=>{
 const f=fixture(t),completion=f.launch();
 for(const [width,height] of [[440,476],[320,300],[280,180],[600,150],[440,476]])assertTwoChoiceFit(f.board,width,height);
 f.skip();assert.equal(await completion,true);f.assertRestored();
});

test('completing all guided matches restores original layout, board handlers and current artwork',async t=>{
 const f=fixture(t),completion=f.launch();
 for(const [step,answer] of [0,1,0].entries()){
  assertTwoChoiceFit(f.board,320-step*20,300-step*50);
  f.board.children[answer].onclick();f.tick(650);
 }
 assert.equal(await completion,true);assert.equal(f.sounds.filter(sound=>sound==='correct').length,3);f.assertRestored();
});

test('skipping guided practice removes layout attributes that were originally absent',async t=>{
 const f=fixture(t,{optionalAttributes:false}),completion=f.launch();
 assertTwoChoiceFit(f.board,320,300);f.skip();assert.equal(await completion,true);f.assertRestored();
});
