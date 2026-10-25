import test from 'node:test';
import assert from 'node:assert/strict';
import {ABILITY_KEYS,bindBackKeyboard,keyboardHelpFor} from './keyboard-help.js';

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

test('number labels keep the actual Shield, Time, Rewards mapping for both keyboard number rows',()=>{
 for(const [number,ability] of [[1,'shield'],[2,'freeze'],[3,'boost']]){assert.equal(ABILITY_KEYS['Digit'+number],ability);assert.equal(ABILITY_KEYS['Numpad'+number],ability);}
 assert.equal(ABILITY_KEYS.KeyC,undefined);
});

test('contextual desktop help uses Escape and the correct controls for every mode',()=>{
 assert.equal(keyboardHelpFor({loading:true}),null);
 assert.deepEqual(keyboardHelpFor({screen:'home'}).rows[0],['A / D','Switch modes']);
 assert.equal(keyboardHelpFor({screen:'home'}).rows.some(([key])=>key==='Esc'),false);
 assert.deepEqual(keyboardHelpFor({screen:'map'}).rows,[['W','Next level'],['S','Previous level'],['Space','Select'],['Esc','Back']]);
 assert.deepEqual(keyboardHelpFor({screen:'game'}).rows,[['W A S D','Move'],['Space','Pick'],['Esc','Pause']]);
 assert.deepEqual(keyboardHelpFor({dialog:'piano-flow'}).rows[0],['A S D F','Play notes']);
 assert.deepEqual(keyboardHelpFor({dialog:'shape-drop'}).rows.slice(0,2),[['A / D','Move'],['S','Drop']]);
 assert.deepEqual(keyboardHelpFor({dialog:'shape-slice'}).rows[0],['Drag','Slice shapes']);
 for(const dialog of ['piano-flow','shape-drop','shape-slice'])assert.deepEqual(keyboardHelpFor({dialog,paused:true}).rows.at(-1),['Esc','Back']);
 assert.deepEqual(keyboardHelpFor({dialog:'settings-dialog'}).rows.at(-1),['Esc','Back']);
 assert.deepEqual(keyboardHelpFor({dialog:'over-dialog'}),{title:'Results',rows:[['Space','Continue'],['Esc','Continue']]});
});
