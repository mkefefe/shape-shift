// Exercise the actual portal build transform and startup/runtime source.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {waitForPortalStartupPaint} from '../platforms/playgama/playgama-startup-render.mjs';

const root=new URL('../',import.meta.url);
const read=(base,name)=>readFileSync(new URL(name,base),'utf8');
const script=source=>source.replace(/^import .*;\r?\n/gm,'').replace(/\bexport /g,'').replaceAll('import.meta.url',JSON.stringify(new URL('mode-transition.js',root).href));
const sharedGame=read(root,'game.js');
const game=execFileSync(process.platform==='win32'?'python':'python3',['-c',`import importlib.util,pathlib,sys
spec=importlib.util.spec_from_file_location('editions','scripts/build-editions.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
sys.stdout.buffer.write(module.playgama_game_source(pathlib.Path('game.js').read_text(encoding='utf-8')).encode('utf-8'))`],{cwd:root,encoding:'utf8',maxBuffer:2000000});
const from=game.indexOf('async function prepareStartup(){');
const to=game.indexOf('\nprepareStartup();',from);
assert(from>=0&&to>from,'Cannot locate actual startup function');
const startup=game.slice(from,to);
const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};

function clock(){
 let now=0,id=0;const timers=new Map(),frames=new Map();
 const host={performance:{now:()=>now},setTimeout(fn,ms=0){const key=++id;timers.set(key,{fn,at:now+ms});return key;},clearTimeout:key=>timers.delete(key),
  requestAnimationFrame(fn){const key=++id;frames.set(key,fn);return key;},cancelAnimationFrame:key=>frames.delete(key)};
 return {host,pendingFrames:()=>frames.size,pendingTimers:()=>timers.size,async frame(){const list=[...frames.values()];frames.clear();for(const fn of list)fn(now);await flush();},
  async advance(ms){const end=now+ms;for(;;){const first=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!first||first[1].at>end)break;now=first[1].at;timers.delete(first[0]);first[1].fn();await flush();}now=end;await flush();}};
}
function classList(initial=[]){const values=new Set(initial);return {add:value=>values.add(value),remove:value=>values.delete(value),contains:value=>values.has(value)};}

async function setup(firstJourney,{assets,paint}={}){
 const time=clock(),messages=[],milestones=[],errors=[];
 const app={inert:false},button={hidden:true},copy={textContent:''},bar={value:0},percent={textContent:''},countdown={hidden:false};
 const cover={hidden:false,classList:classList(),querySelector:selector=>({'button':button,'p':copy,'progress':bar,'.startup-percent':percent}[selector])};
 const document={hidden:true,documentElement:{classList:classList(['startup-loading'])},getElementById:id=>({'app':app,'startup-ready':cover,'countdown':countdown}[id]),addEventListener(){},removeEventListener(){}};
 const bridge={platform:{language:'en',isPaused:true,isAudioEnabled:false,on(){},sendMessage:async name=>messages.push(name)},
  advertisement:{on(){},isRewardedSupported:false,isInterstitialSupported:false},storage:{get:async()=>[null],set:async()=>{}},EVENT_NAME:{}};
 const context=vm.createContext({document,console:{error:(...args)=>errors.push(args)},Promise,TextEncoder,URL,
  setTimeout:time.host.setTimeout,clearTimeout:time.host.clearTimeout,requestAnimationFrame:time.host.requestAnimationFrame,
  window:time.host,firstJourney:{pending:firstJourney},runMode:null,adventureLevel:null,$:id=>document.getElementById(id),
  startupReadiness:{prepare:async progress=>{await assets;progress(11,11,'complete');return true;}},markStartup:name=>milestones.push(name),
  start:async(_tutorial,onPrepared,beforeTutorial)=>{onPrepared();await beforeTutorial();},
  update(){paint?.();},timer(){},openingCoach:null,storyUI:{onFirstOpen:async()=>{}},engagement:{event(){},flush(){}}});
 vm.runInContext(script(read(root,'playables-core.mjs'))+'\n'+script(read(root,'platforms/playgama/playgama-platform.mjs'))+'\n'+script(read(root,'mode-transition.js'))+'\n'+script(read(root,'platforms/playgama/playgama-startup-render.mjs'))+'\n'+startup,context);
 const platform=vm.runInContext('createPlaygamaPlatform',context)({bridge,host:time.host,isInteractive:()=>cover.hidden&&!app.inert&&!document.documentElement.classList.contains('startup-loading')});
 context.window.ShapeShiftPlatform=platform;
 await platform.initialize();platform.syncInitialState();platform.setPauseReason('visibility',true);
 let gameplayTimerFired=false;platform.setTimeout(()=>{gameplayTimerFired=true;},1);
 const request=vm.runInContext('prepareStartup()',context);await flush();
 return {time,platform,request,messages,milestones,errors,app,cover,bar,percent,gameplayTimerFired:()=>gameplayTimerFired};
}

test('visible startup paints once, waits two native frames, and clears its fallback timer',async()=>{
 const time=clock();let paints=0,done=false;
 const pending=waitForPortalStartupPaint(()=>{paints++;},time.host).then(()=>{done=true;});await flush();
 assert.equal(paints,1);assert.equal(done,false);await time.frame();assert.equal(done,false);
 await time.frame();await pending;assert.equal(done,true);assert.equal(time.pendingFrames(),0);assert.equal(time.pendingTimers(),0);
});

test('withheld native frames use the bounded timer and cancel queued rendering',async()=>{
 for(const firstFrame of [false,true]){
  const time=clock();let done=false;
  const pending=waitForPortalStartupPaint(undefined,time.host).then(()=>{done=true;});await flush();
  if(firstFrame)await time.frame();
  await time.advance(249);assert.equal(done,false);
  await time.advance(1);await pending;assert.equal(done,true);assert.equal(time.pendingFrames(),0);assert.equal(time.pendingTimers(),0);
 }
});

test('paint completion is required and paint failures propagate before the timer is armed',async()=>{
 const time=clock();let release,done=false;
 const pending=waitForPortalStartupPaint(()=>new Promise(resolve=>{release=resolve;}),time.host).then(()=>{done=true;});
 await time.advance(1000);assert.equal(done,false);assert.equal(time.pendingTimers(),0);assert.equal(time.pendingFrames(),0);
 release();await flush();await time.advance(250);await pending;
 await assert.rejects(waitForPortalStartupPaint(()=>{throw Error('paint failed');},time.host),/paint failed/);
 assert.equal(time.pendingTimers(),0);assert.equal(time.pendingFrames(),0);
});

for(const firstJourney of [false,true])test(`portal startup reports ready without native RAF, firstJourney=${firstJourney}, while real gameplay remains paused`,async()=>{
 let paints=0;const r=await setup(firstJourney,{paint:()=>{paints++;}});
 assert.equal(r.platform.paused,true);assert(r.milestones.includes('assets_ready'));
 await r.time.advance(249);assert.equal(r.messages.includes('game_ready'),false);assert.equal(r.cover.hidden,false);assert.equal(r.app.inert,true);
 await r.time.advance(1);
 if(firstJourney){assert.equal(r.cover.hidden,true);assert.equal(r.app.inert,true);assert.equal(paints,1);await r.time.advance(249);assert.equal(r.messages.includes('game_ready'),false);assert.equal(r.app.inert,true);}
 await r.time.advance(101);await r.request;
 assert.equal(r.messages.filter(name=>name==='game_ready').length,1);assert.equal(r.cover.hidden,true);assert.equal(r.app.inert,false);
 assert.equal(r.platform.paused,true);assert.equal(r.gameplayTimerFired(),false);assert.equal(r.platform.now(),0);
 assert.equal(r.time.pendingFrames(),0);assert.equal(r.time.pendingTimers(),0);assert.deepEqual(r.errors,[]);
});

test('pending required assets cannot be bypassed by the startup timer',async()=>{
 let release;const assets=new Promise(resolve=>{release=resolve;});const r=await setup(true,{assets});
 await r.time.advance(5000);assert.equal(r.messages.includes('game_ready'),false);assert.equal(r.milestones.includes('assets_ready'),false);
 assert.equal(r.cover.hidden,false);assert.equal(r.app.inert,true);assert.equal(r.time.pendingTimers(),0);assert.equal(r.time.pendingFrames(),0);
 release();await flush();await r.time.advance(600);await r.request;assert.equal(r.messages.filter(name=>name==='game_ready').length,1);
});

test('failed required assets retain the loading cover and never announce ready',async()=>{
 const r=await setup(false,{assets:Promise.reject(Error('required asset unavailable'))});await r.time.advance(5000);await r.request;
 assert.equal(r.messages.includes('game_ready'),false);assert.equal(r.milestones.includes('assets_ready'),false);
 assert.equal(r.cover.hidden,false);assert.equal(r.app.inert,true);assert.equal(r.cover.querySelector('button').hidden,false);
 assert.equal(r.time.pendingTimers(),0);assert.equal(r.time.pendingFrames(),0);assert.equal(r.errors.length,1);
});

test('the portal transform is restricted to the two startup waits and keeps later transitions unchanged',()=>{
 const sharedStart=sharedGame.indexOf('async function prepareStartup(){'),sharedEnd=sharedGame.indexOf('\nprepareStartup();',sharedStart);
 const portalStart=game.indexOf('async function prepareStartup(){'),portalEnd=game.indexOf('\nprepareStartup();',portalStart);
 assert.equal(game.slice(game.indexOf('\n')+1,portalStart),sharedGame.slice(0,sharedStart));
 assert.equal(game.slice(portalEnd),sharedGame.slice(sharedEnd));
 const startup=game.slice(portalStart,portalEnd);
 assert.equal((startup.match(/await waitForPortalStartupPaint\(/g)||[]).length,2);
 assert(startup.indexOf('await startupReadiness.prepare')<startup.indexOf('await waitForPortalStartupPaint'));
 assert.match(startup,/finally\{firstGate\.dispose\(\);\}/);
 assert.match(sharedGame.slice(sharedStart,sharedEnd),/await firstGate\.reveal/);
 assert.match(read(root,'mode-transition.js'),/await new Promise\(resolve=>requestAnimationFrame\(\(\)=>requestAnimationFrame\(resolve\)\)\)/);
});

