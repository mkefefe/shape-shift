import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
const code=execFileSync(process.platform==='win32'?'python':'python3',['-c',"import importlib.util,pathlib;s=importlib.util.spec_from_file_location('b','scripts/build-editions.py');b=importlib.util.module_from_spec(s);s.loader.exec_module(b);print(b.playgama_audio_source(pathlib.Path('audio.js').read_text(encoding='utf-8'),'audio.js'))"],{cwd:root,encoding:'utf8'});
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
function clock(){let now=0,id=0;const jobs=new Map();return {window:{setTimeout(fn,ms){jobs.set(++id,{fn,at:now+ms});return id;},clearTimeout(id){jobs.delete(id);}},async advance(ms){now+=ms;for(const [id,j] of jobs)if(j.at<=now){jobs.delete(id);j.fn();}await flush();}};}
function preparation(){
 const time=clock();let finish,calls=0;
 const pending=new Promise(resolve=>finish=resolve);
 const ctx=vm.createContext({window:time.window,Promise,setup:()=>true,prepareCommon:()=>{calls++;return pending;},preparePiano:async()=>true,prepareGate:async()=>true,prepareVictory:async()=>true});
 vm.runInContext(code.slice(code.indexOf('  let allWarm=null;'),code.indexOf('  function playGate(')),ctx);
 return {time,finish,prepare:()=>vm.runInContext('prepareAll()',ctx),calls:()=>calls};
}
test('a healthy 45-second full audio preparation remains locked until completion and deduplicates callers',async()=>{
 const h=preparation(),p=h.prepare();assert.equal(p,h.prepare());let result;p.then(v=>result=v);
 await h.time.advance(45000);assert.equal(result,undefined);assert.equal(h.calls(),1);
 h.finish(true);await flush();assert.equal(result,true);
});
test('stalled complete preparation fails within its bound and permits another attempt',async()=>{
 const h=preparation(),p=h.prepare();await h.time.advance(120000);assert.equal(await p,false);
 const next=h.prepare();assert.notEqual(next,p);h.finish(true);assert.equal(await next,true);assert.equal(h.calls(),2);
});
test('failed required audio never becomes a successful readiness result',async()=>{
 const h=preparation(),p=h.prepare();h.finish(false);assert.equal(await p,false);
});
test('required download may finish after 12 seconds; stalled download still aborts',async()=>{
 const time=clock();let finish,signal;
 const ctx=vm.createContext({window:time.window,AbortController,fetch:async(_url,opts)=>{signal=opts.signal;return {ok:true,arrayBuffer:()=>new Promise((resolve,reject)=>{finish=resolve;signal.addEventListener('abort',()=>reject(Error('aborted')));})};}});
 vm.runInContext(code.slice(code.indexOf('  async function audioData('),code.indexOf('  function setup(')),ctx);
 const first=vm.runInContext("audioData('music')",ctx);await flush();await time.advance(40000);assert.equal(signal.aborted,false);finish(new ArrayBuffer(8));assert.equal((await first).byteLength,8);
 const stalled=vm.runInContext("audioData('music')",ctx);const rejection=assert.rejects(stalled,/aborted/);await flush();await time.advance(60000);await rejection;
});
