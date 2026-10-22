import test from 'node:test';
import assert from 'node:assert/strict';
import {loadStartupAssets} from './startup-loader.js';
import {prepareMenuImage} from './menu-preload.js';
test('startup awaits decoded images and completely downloaded audio',async()=>{
 let release,done=false;const gate=new Promise(r=>release=r),progress=[];
 const loading=loadStartupAssets((n,total)=>progress.push([n,total]),{assets:['test-delayed.webp','test-audio.ogg'],prepareImage:()=>gate,fetcher:async()=>({ok:true,arrayBuffer:async()=>gate})}).then(()=>done=true);
 await Promise.resolve();assert.equal(done,false);assert.deepEqual(progress,[]);release();await loading;assert.equal(done,true);assert.deepEqual(progress,[[1,2],[2,2]]);
});
test('failed artwork keeps startup blocked and is retried; completed assets are reused',async()=>{
 let failed=true,calls=0;const options={assets:['test-failure.png','test-ready.png'],prepareImage:async src=>{calls++;if(failed&&src==='test-failure.png')throw Error('decode failed');}};
 await assert.rejects(loadStartupAssets(()=>{},options),/decode failed/);assert.equal(calls,2);failed=false;await loadStartupAssets(()=>{},options);assert.equal(calls,3);
});
test('HTTP failures cannot count as loaded assets',async()=>{
 await assert.rejects(loadStartupAssets(()=>{throw Error('must not report progress');},{assets:['test-missing.ogg'],fetcher:async()=>({ok:false})}),/Could not load/);
});
test('image preparation shares pending work, retains success and retries failures',async()=>{
 const original=globalThis.Image;let count=0,fail=true;globalThis.Image=class{constructor(){count++;}async decode(){if(fail)throw Error('offline');}};
 try{const first=prepareMenuImage('test-retained.png');assert.equal(first,prepareMenuImage('test-retained.png'));await assert.rejects(first,/offline/);fail=false;const image=await prepareMenuImage('test-retained.png');assert.equal(await prepareMenuImage('test-retained.png'),image);assert.equal(count,2);}finally{globalThis.Image=original;}
});
