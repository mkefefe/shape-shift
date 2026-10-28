import {test} from 'node:test';
import assert from 'node:assert/strict';
import {squareTrack,fitBoard} from './board-fit.js';
test('square tracks fit narrow, short, dense and sparse boards without overflow',()=>{
 for(const [w,h] of [[288,260],[328,375],[440,440],[288,120]])for(const [cols,rows] of [[1,1],[2,1],[3,1],[2,2],[3,2],[3,3],[4,3],[4,4],[5,4]]){
  const size=squareTrack(w,h,cols,rows,6);
  assert.ok(size*cols+6*(cols-1)<=w);assert.ok(size*rows+6*(rows-1)<=h);
 }
 assert.equal(squareTrack(328,375,3,3,6),105);
});


test('two-choice tutorial replaces stale single-column sizing',()=>{
 const original=globalThis.getComputedStyle;
 try{
 globalThis.getComputedStyle=()=>({paddingLeft:'14',paddingRight:'14',paddingTop:'14',paddingBottom:'14',gap:'8'});
 const values={'--cols':1,'--rows':1};const board={classList:{contains:()=>false},clientWidth:440,clientHeight:476,dataset:{columns:'2',count:'2'},children:[{style:{}},{style:{}}],style:{setProperty:(key,value)=>values[key]=value}};
 fitBoard(board);assert.equal(values['--cols'],2);assert.equal(values['--rows'],1);assert.equal(values['--track'],'202px');assert.equal(values['--board-tint-mask'],undefined);
 }finally{globalThis.getComputedStyle=original;}
});
