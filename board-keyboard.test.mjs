import test from 'node:test';
import assert from 'node:assert/strict';
import {directionalChoice} from './board-keyboard.js';
const grid=Array.from({length:9},(_,i)=>({x:i%3*100,y:Math.floor(i/3)*100}));
test('WASD follows visible grid directions and wraps at its outer edges',()=>{
 assert.equal(directionalChoice(grid,4,'KeyW'),1);assert.equal(directionalChoice(grid,4,'KeyS'),7);assert.equal(directionalChoice(grid,4,'KeyA'),3);assert.equal(directionalChoice(grid,4,'KeyD'),5);assert.equal(directionalChoice(grid,2,'KeyD'),0);assert.equal(directionalChoice(grid,0,'KeyW'),6);
});
test('navigation crosses a missing or blocked cell and prefers the same column',()=>{
 const sparse=grid.filter((_,i)=>i!==1);assert.equal(directionalChoice(sparse,0,'KeyD'),1);assert.equal(directionalChoice(sparse,0,'KeyS'),2);
});
test('single and empty boards keep a safe selection',()=>{
 assert.equal(directionalChoice([],0,'KeyW'),0);assert.equal(directionalChoice([{x:0,y:0}],0,'KeyS'),0);
});

test('wrapping preserves columns and rows and chooses the nearest available edge tile',()=>{
 assert.equal(directionalChoice(grid,1,'KeyW'),7);assert.equal(directionalChoice(grid,7,'KeyS'),1);assert.equal(directionalChoice(grid,3,'KeyA'),5);
 const sparse=grid.filter((_,i)=>i!==7);assert.equal(sparse[directionalChoice(sparse,1,'KeyW')].y,200);
});
