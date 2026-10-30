import test from 'node:test';
import assert from 'node:assert/strict';
import {initStoryUI} from './story-ui.js';
test('level 100 completes Adventure without a credits or restoration handoff',async()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const ui=initStoryUI({document:{},storage,adventure:{cleared:Array(99).fill(true)},beforeScene:()=>{throw new Error('Unexpected credits scene');}});
 ui.record({mode:'adventure',level:100,won:true});
 assert.equal(ui.summary().adventureComplete,true);assert.equal(ui.summary().ready,null);
 await ui.afterResults();await ui.onFirstOpen();assert.equal(ui.isPlaying(),false);assert.equal(ui.snapshot().cleared.length,100);
});
