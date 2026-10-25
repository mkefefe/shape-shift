import test from 'node:test';
import assert from 'node:assert/strict';
import {ABILITY_KEYS,bindBackKeyboard,keyboardHelpFor} from './keyboard-help.js';
import {bindResultKeyboard} from './result-keyboard.js';

function fixture(){
 const doc=new EventTarget();let ready=true,handled=true,calls=0;
 const unbind=bindBackKeyboard({doc,ready:()=>ready,back:()=>{calls++;return handled;}});
 function press(code,options={}){const event=new Event('keydown',{cancelable:true}),target={closest:()=>options.editing?{}:null,dataset:{}};Object.defineProperties(event,{code:{value:code},target:{value:target},...Object.fromEntries(Object.entries(options).map(([key,value])=>[key,{value}]))});doc.dispatchEvent(event);return event;}
 return {press,unbind,get calls(){return calls;},set ready(value){ready=value;},set handled(value){handled=value;}};
}

test('Escape uses back once; an idle home has no action or swallowed keyboard event',()=>{
 const f=fixture();assert.equal(f.press('Escape').defaultPrevented,true);assert.equal(f.calls,1);
 f.handled=false;assert.equal(f.press('Escape').defaultPrevented,false);assert.equal(f.calls,2);
 f.unbind();f.press('Escape');assert.equal(f.calls,2);
});

test('back ignores repeat, browser shortcuts and startup, while Escape can leave a text editor',()=>{
 const f=fixture();f.press('Escape',{repeat:true});f.press('Escape',{ctrlKey:true});f.press('Escape',{altKey:true});f.press('Escape',{metaKey:true});f.press('Escape',{isComposing:true});f.ready=false;f.press('Escape');assert.equal(f.calls,0);
 f.ready=true;f.press('KeyZ',{editing:true});assert.equal(f.calls,0);assert.equal(f.press('Escape',{editing:true}).defaultPrevented,true);assert.equal(f.calls,1);
});

test('ability shortcuts keep the actual Shield, Time, Rewards mapping for both keyboard number rows',()=>{
 for(const [number,ability] of [[1,'shield'],[2,'freeze'],[3,'boost']]){assert.equal(ABILITY_KEYS['Digit'+number],ability);assert.equal(ABILITY_KEYS['Numpad'+number],ability);}
 assert.equal(ABILITY_KEYS.KeyC,undefined);
});

test('desktop help gives one concise overview across menus and modes',()=>{
 assert.equal(keyboardHelpFor({loading:true}),null);
 const help={title:'Quick controls',rows:[['W A S D','Move / choose'],['Space','Select / confirm'],['Esc','Pause / back'],['1 2 3','Abilities']]};
 for(const screen of ['home','map','game'])assert.deepEqual(keyboardHelpFor({screen}),help);
 for(const dialog of ['piano-flow','shape-drop','shape-slice','settings-dialog','over-dialog'])assert.deepEqual(keyboardHelpFor({dialog}),help);
});


test('Z never triggers back or consumes ordinary text input',()=>{
 const f=fixture();
 for(const editing of [false,true])for(const key of ['z','Z']){
  const event=f.press('KeyZ',{key,editing});
  assert.equal(event.defaultPrevented,false);
 }
 assert.equal(f.calls,0);
 assert.equal(f.press('Escape').defaultPrevented,true);
 assert.equal(f.calls,1);
});

function resultFixture(){
 const doc=new EventTarget();let clicks=0,continues=0,hint=null;
 // Normalize the boolean DOM capture overload for Node's EventTarget.
 const add=doc.addEventListener.bind(doc),remove=doc.removeEventListener.bind(doc);
 doc.addEventListener=(type,listener,capture)=>add(type,listener,{capture:capture===true});
 doc.removeEventListener=(type,listener,capture)=>remove(type,listener,{capture:capture===true});
 const next={hidden:true,disabled:false,click:()=>continues++};
 const dialog={open:true,contains:target=>target.inside!==false,click:()=>clicks++,querySelector:()=>({append:node=>{hint=node;}})};
 doc.getElementById=id=>id==='over-dialog'?dialog:next;
 doc.createElement=()=>({remove(){hint=null;}});
 const unbind=bindResultKeyboard({document:doc});
 function press(code,options={}){
  const event=new Event('keydown',{cancelable:true});
  const target={inside:options.inside,closest:()=>options.editing?{}:null};
  Object.defineProperties(event,{code:{value:code},target:{value:target},...Object.fromEntries(Object.entries(options).map(([key,value])=>[key,{value}]))});
  doc.dispatchEvent(event);return event;
 }
 return {press,dialog,next,unbind,get hint(){return hint;},get clicks(){return clicks;},get continues(){return continues;}};
}

test('results advertise only Space while existing Enter/Esc dismissal still works',()=>{
 const f=resultFixture();assert.equal(f.hint.textContent,'Press Space to close');
 for(const code of ['Space','Enter','Escape'])assert.equal(f.press(code).defaultPrevented,true);
 assert.equal(f.clicks,3);
 assert.equal(f.press('KeyZ').defaultPrevented,false);assert.equal(f.clicks,3);
 f.next.hidden=false;f.press('Space');assert.equal(f.continues,1);assert.equal(f.clicks,3);
 f.unbind();assert.equal(f.hint,null);f.press('Space');assert.equal(f.continues,1);
});

test('result dismissal respects repeat, editing, browser shortcuts and dialog boundaries',()=>{
 const f=resultFixture();
 for(const options of [{repeat:true},{editing:true},{altKey:true},{ctrlKey:true},{metaKey:true},{isComposing:true},{inside:false}])f.press('Space',options);
 f.dialog.open=false;f.press('Space');assert.equal(f.clicks,0);
});
