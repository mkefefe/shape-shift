import test from 'node:test';
import assert from 'node:assert/strict';
import {bindBoardKeyboard} from './board-keyboard.js';

test('tutorial suppresses the stale board cursor and Space, then restores the same selection',()=>{
 const oldObserver=globalThis.MutationObserver,oldStyle=globalThis.getComputedStyle;
 globalThis.MutationObserver=class{observe(){}};
 globalThis.getComputedStyle=()=>({visibility:'visible'});
 const host=new EventTarget();Object.assign(host,{cancelAnimationFrame(){},requestAnimationFrame(){return 1},performance:{now:()=>0}});
 const doc=new EventTarget();doc.defaultView=host;doc.body={};doc.activeElement=doc.body;
 const cards=Array.from({length:9},(_,i)=>{const classes=new Set();return {offsetLeft:i%3*100,offsetTop:Math.floor(i/3)*100,offsetWidth:90,offsetHeight:90,clicks:0,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},getClientRects:()=>[{}],focus(){doc.activeElement=this},click(){this.clicks++}}});
 const root=new EventTarget();root.contains=node=>cards.includes(node);root.querySelectorAll=selector=>selector==='.keyboard-choice'?cards.filter(c=>c.classList.contains('keyboard-choice')):cards;
 const press=code=>{const event=new Event('keydown',{cancelable:true});Object.defineProperty(event,'code',{value:code});doc.dispatchEvent(event)};
 try{
  bindBoardKeyboard(root,{enabled:()=>true,doc});press('KeyD');assert.equal(cards[1].classList.contains('keyboard-choice'),true);
  host.dispatchEvent(new Event('shape-shift-guide-start'));assert.equal(root.querySelectorAll('.keyboard-choice').length,0);
  press('Space');press('KeyD');assert.equal(cards.reduce((n,c)=>n+c.clicks,0),0);
  host.dispatchEvent(new Event('shape-shift-guide-end'));assert.equal(cards[1].classList.contains('keyboard-choice'),true);
  assert.equal(root.querySelectorAll('.keyboard-choice').length,1);press('Space');assert.equal(cards[1].clicks,1);
 }finally{globalThis.MutationObserver=oldObserver;globalThis.getComputedStyle=oldStyle;}
});
