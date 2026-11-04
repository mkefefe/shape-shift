import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createPianoGame,pianoSongTempo,createPianoPerformedSupport} from './piano-flow-engine.js';
import {createPianoInput} from './piano-input.js';
import {pianoLayout,pianoTarget} from './piano-flow-touch.js';
import {adventurePianoSpec,adventurePianoStage} from './adventure-piano.js';
import {PIANO_STAGE_RELEASE_SECONDS} from './piano-flow-engine.js';
const options={stripTap:true,rhythm:true,melodicStrips:true,fullSongs:true,rng:()=>0};
const note=(id,beat,lane,hold=0,bpm=100)=>({id,beat,end:beat+hold,lane,hold,bpm,pitch:60+lane*2,shape:lane,color:0,duration:hold?hold+.5:1,soundBeats:hold?hold+.1:.8,rapid:!hold,status:'waiting',awaiting:false});
function fixture(notes,{beat=notes[0].beat,recoverWrongTap=false}={}){const events=[],g=createPianoGame({...options,recoverWrongTap,onEvent:e=>events.push(e)});g.start();g.countdown=0;g.notes=notes;g.beat=beat;g.bpm=notes[0].bpm;events.length=0;return {g,events,input:createPianoInput({getGame:()=>g})};}
function advance(g,seconds,frame=1/240){for(let left=seconds;left>1e-8;){const dt=Math.min(left,frame);g.step(dt);left-=dt;}}

test('the actual view paints a solid first note throughout 3/2/1 and descends continuously after GO',()=>{
 const source=readFileSync(new URL('./piano-flow.js',import.meta.url),'utf8');
 const drawSource=source.slice(source.indexOf(' function round('),source.indexOf(' function advanceGame('));
 assert(drawSource.includes('function draw()'));
 for(const [width,height] of [[320,568],[390,844],[844,390]])for(const adventure of [null,{mode:'piano',level:15}]){
  const game=createPianoGame({...options,adventure}),drawn=[],text=[],clips=[];let clip=null,path=null;
  const ctx=new Proxy({
   save(){clips.push(clip);},restore(){clip=clips.pop();},beginPath(){path=null;},rect(x,y,w,h){path={x,y,w,h};},clip(){if(path)clip=path;},
   createLinearGradient(){return {addColorStop(){}};},measureText(){return {width:50};},fillText(value){text.push(value);},
   drawImage(art,sx,sy,sw,sh,x,y,w,h){if(Number.isInteger(art.id))drawn.push({id:art.id,x,y,w,h,visibleHeight:Math.max(0,Math.min(y+h,clip?clip.y+clip.h:Infinity)-Math.max(y,clip?.y??-Infinity))});}
  },{get:(target,key)=>key in target?target[key]:()=>{}});
  const context={game,ctx,canvas:{},canvasBounds:{width,height},devicePixelRatio:1,pianoLayout,pianoTarget,layout:null,
   measureCanvas(){},holdGlows:[0,0,0,0],glows:[0,0,0,0],glowFade:()=>0,stripColors:[0,1,2,3],quiet:true,
   skinCrop:note=>({art:{id:note.id},x:0,y:0,w:100,h:100}),COLORS:['red','blue','green','yellow'],drawPianoHoldGlow(){},
   reveals:[],particles:[],damage:0,translate:value=>value};
  const draw=vm.runInNewContext(drawSource+'\ndraw;',context);
  const paint=()=>{drawn.length=0;text.length=0;draw();return drawn.find(n=>n.id===game.notes[0].id);};
  game.start();const first=paint(),beat=game.beat,l=pianoLayout(width,height,true,true,true);
  assert(first&&first.visibleHeight>=l.size/2,'a solid part of the first note is inside the actual clip');
  assert(Math.abs(first.y+first.h/2-l.top)<1e-8);assert(text.includes('3'));
  for(const [seconds,count] of [[1.01,'2'],[1,'1']]){
   advance(game,seconds);const next=paint();assert.deepEqual(next,first);assert(text.includes(count));assert.equal(game.beat,beat);
   assert.equal(game.pressStrip(game.notes[0].lane),false);assert.equal(game.score,0);assert.equal(game.time,0);
  }
  advance(game,.99);assert.equal(game.countdown,0);assert.deepEqual(paint(),first);assert(text.includes('GO!'));
  game.step(1/60);const moving=paint();assert(moving.y>first.y);assert(moving.y-first.y<6,'GO advances one ordinary frame without a jump');
  assert(game.pressStrip(game.notes[0].lane));assert.equal(game.hits,1);
  assert(game.inputWindow>game.cueWindow,'the full visible input window remains larger than the staged cue');
  const waiting=game.notes.find(n=>n.status==='waiting');game.beat=waiting.beat-game.inputWindow+.001;
  assert(game.pressStrip(waiting.lane),'later notes remain playable at their first visible sliver');
 }
});

const adventureLevels=[15,30,45,60,75,90];
const adventureChallenge=level=>({mode:'piano',level,...adventurePianoSpec(level)});
const chartNote=n=>({id:n.id,pitch:n.pitch,lane:n.lane,beat:n.beat,duration:n.duration,hold:n.hold,chord:n.chord,section:n.section,song:n.song});
function playAdventure(g,{skip=new Set(),observe=()=>{}}={}){
 const seen=new Map();g.start();
 for(let frame=0;frame<12000&&!g.over;frame++){
  for(const n of g.notes){
   seen.set(n.id,chartNote(n));
   if(!skip.has(n.id)&&n.status==='waiting'&&n.beat-g.beat<=(g.inputWindow??4.4)&&g.countdown===0){
    const first=g.notes.find(other=>other.lane===n.lane&&other.status==='waiting'&&other.beat-g.beat<=(g.inputWindow??4.4));
    if(first!==n)continue;
    assert(g.pressNote(n.id),'authored visible note must be playable');g.release(n.lane);
   }
  }
  observe(g);g.step(1/120);
 }
 assert(g.over,'finite Adventure must terminate');return [...seen.values()];
}

test('each Adventure Piano level repeats its authored hook three times and closes on its tonic',()=>{
 for(const level of adventureLevels){
  const stage=adventurePianoStage(adventureChallenge(level)),spec=adventurePianoSpec(level);
  assert.equal(stage.notes.length,spec.noteCount);assert.equal(spec.target,spec.noteCount-2);
  const phrase=from=>stage.notes.filter(n=>n.songBeat>=from&&n.songBeat<from+8).map(n=>({pitch:n.pitch,duration:n.duration,sound:n.soundBeats,chord:n.chord,at:n.songBeat-from}));
  assert.deepEqual(phrase(0),phrase(8));assert.deepEqual(phrase(0),phrase(16));
  const last=stage.notes.at(-1);assert.equal(last.section,'Outro');assert.equal(last.songBeat,32);assert.equal(last.duration,4);
  assert.equal(last.pitch%12,last.chord[0]%12);assert.equal(stage.beats,36);
 }
 assert.equal(adventurePianoStage({mode:'drop',level:15}),null);assert.equal(adventurePianoSpec(16),null);
});

test('Adventure retries replay identical finite notes and never choose or leak another song',()=>{
 for(const level of adventureLevels){
  const challenge=adventureChallenge(level),make=()=>createPianoGame({adventure:challenge,rng:()=>{throw Error('Adventure must not use randomness');}});
  const first=make(),retry=make(),a=playAdventure(first),b=playAdventure(retry);
  assert.deepEqual(a,b);assert.equal(a.length,challenge.noteCount);assert.equal(new Set(a.map(n=>n.song)).size,1);
  assert(first.stageComplete&&retry.stageComplete);assert.equal(first.hits,challenge.noteCount);assert.equal(first.songsCompleted,0);
  assert.deepEqual(first.stageProgress,{done:challenge.noteCount,total:challenge.noteCount,label:'Notes'});
  const beat=first.beat;advance(first,5);assert.equal(first.beat,beat);assert.equal(first.notes.some(n=>n.beat>=first.stageEndBeat),false);
 }
});

test('reaching the Adventure note target leaves the remaining phrase playable until the musical ending',()=>{
 const challenge=adventureChallenge(15),events=[],g=createPianoGame({adventure:challenge,onEvent:e=>events.push(e)});let reached=false,allPlayedBeforeEnding=false;
 playAdventure(g,{observe:g=>{
  if(g.hits>=challenge.target&&!reached){reached=true;assert.equal(g.over,false);assert.equal(g.stageComplete,false);assert(g.stageProgress.done<g.stageProgress.total);}
  if(g.hits===challenge.noteCount&&g.beat<g.stageEndBeat){allPlayedBeforeEnding=true;assert.equal(g.over,false);assert.equal(g.stageComplete,false);}
 }});
 assert(reached&&allPlayedBeforeEnding);assert(g.beat>=g.stageEndBeat);
 assert.equal(events.filter(e=>e.type==='end').length,1);assert.equal(events.find(e=>e.type==='end').reason,'stage-complete');
});

test('a last visible Adventure note can play after the nominal ending and its complete sound drains before results',()=>{
 const challenge=adventureChallenge(15),events=[],g=createPianoGame({adventure:challenge,onEvent:e=>events.push(e)}),lastId=challenge.noteCount-1;
 g.setViewport({lateWindow:3});g.start();
 for(let frames=0;g.beat<g.stageEndBeat+1.8&&frames<10000;frames++){
  for(const n of g.notes)if(n.id!==lastId&&n.status==='waiting'&&n.beat-g.beat<=4.4&&g.countdown===0){assert(g.pressNote(n.id));g.release(n.lane);}
  g.step(1/120);
 }
 assert.equal(g.over,false);assert.equal(g.stageComplete,false);assert.equal(g.hits,challenge.noteCount-1);
 const last=g.notes.find(n=>n.id===lastId);assert(last&&last.status==='waiting');
 const playedAt=g.time;assert(g.pressStrip(last.lane));assert.equal(g.hits,challenge.noteCount);g.release(last.lane);
 assert.equal(last.status,'done');const tail=last.duration*60/last.bpm+PIANO_STAGE_RELEASE_SECONDS;
 advance(g,tail-.03);assert.equal(g.over,false);assert.equal(g.stageComplete,false);
 advance(g,.05);assert(g.over&&g.stageComplete);assert(g.time>=playedAt+tail);
 assert.equal(events.filter(e=>e.type==='note'&&e.note.id===lastId).length,1);assert.equal(g.lives,g.maxLives);
});

test('one or two missed Adventure notes resolve naturally without truncating the chart or counting as hits',()=>{
 for(const missed of [[25],[0,25]]){
  const challenge=adventureChallenge(15),g=createPianoGame({adventure:challenge});
  playAdventure(g,{skip:new Set(missed)});
  assert.equal(g.hits,challenge.noteCount-missed.length);assert(g.hits>=challenge.target);assert.equal(g.lives,g.maxLives-missed.length);
  assert.equal(g.stageProgress.done,challenge.noteCount);assert(g.stageComplete);assert(g.beat>=g.stageEndBeat);
 }
});

test('losing the final heart after the written endpoint remains failure rather than natural completion',()=>{
 const challenge=adventureChallenge(15),g=createPianoGame({adventure:challenge});g.setViewport({lateWindow:1.6});
 playAdventure(g,{skip:new Set([0,8,25])});
 assert.equal(g.lives,0);assert.equal(g.stageComplete,false);assert.equal(g.stageProgress.done,challenge.noteCount);
 assert(g.beat>g.stageEndBeat);assert.equal(g.revive(),false);assert.equal(g.stageComplete,false);
});

test('Adventure practice hands off to the exact first authored note with clean score and no tutorial credit',()=>{
 const challenge=adventureChallenge(45),events=[],g=createPianoGame({...options,practice:true,onEvent:e=>events.push(e)});
 g.setViewport({inputWindow:5.2});g.start();advance(g,10);assert(g.pressStrip(1));g.release(1);advance(g,4);assert(g.pressStrip(2));g.release(2);
 assert.equal(g.hits,2);assert.equal(g.stageProgress,null);assert(g.completePractice(challenge));assert.equal(g.completePractice(challenge),false);
 const fresh=createPianoGame({adventure:challenge});fresh.setViewport({inputWindow:5.2});
 assert.deepEqual(g.notes.map(chartNote),fresh.notes.map(chartNote));assert.equal(g.beat,fresh.beat);assert.equal(g.countdown,3);
 assert.equal(g.hits,0);assert.equal(g.coins,0);assert.equal(g.score,0);assert.equal(g.time,0);assert.equal(g.pressed.size,0);
 assert.equal(g.stageProgress.done,0);assert.equal(events.filter(e=>e.type==='stage-start').length,1);
 playAdventure(g);assert.equal(g.hits,challenge.noteCount);assert(g.stageComplete);
});

test('Adventure retains top-entry immediate ASDF scoring, optional holds and foreground stall protection',()=>{
 const g=createPianoGame({adventure:adventureChallenge(60)}),layout=pianoLayout(390,844,true,true,true);
 const inputWindow=4+(layout.size/2+12)/layout.unit;g.setViewport({inputWindow});g.start();advance(g,3);
 const first=g.notes[0],entry=pianoTarget(first,g.beat,layout);assert(Math.abs(entry.y+entry.size/2-(layout.top-12))<1e-8);
 assert(g.pressStrip(first.lane));assert.equal(g.hits,1);g.release(first.lane);assert.equal(first.status,'done');
 const before={beat:g.beat,time:g.time,lives:g.lives};g.step(2);assert.equal(g.beat,before.beat);assert.equal(g.time,before.time);assert.equal(g.lives,before.lives);assert.equal(g.paused,false);
 g.pause();advance(g,1);assert.equal(g.beat,before.beat);g.resume();g.step(.02);assert(g.beat>before.beat);
});

test('every visible lane plays immediately from the upper screen, at every song tempo',()=>{
 for(const bpm of [72,100,144])for(let lane=0;lane<4;lane++){
  const a=note(900,4,lane,0,bpm),{g,events}=fixture([a],{beat:0});
  assert(g.pressStrip(lane));assert.equal(g.hits,1);assert.equal(g.score,1);assert.equal(g.coins,1);
  assert.equal(a.status,'done');assert.equal(events.filter(e=>e.type==='note').length,1);
  assert.equal(events.find(e=>e.type==='complete').rating,'hit');
  g.release(lane);advance(g,.2);assert.equal(events.filter(e=>e.type==='note').length,1,'no deferred attack');
 }
});
test('visible notes in different lanes can be played in any order, with independent simultaneous holds',()=>{
 const a=note(900,2,0,2),b=note(901,3,1,2),c=note(902,4,2),d=note(903,4.2,3),{g,events}=fixture([a,b,c,d],{beat:0});
 for(const lane of [3,1,2,0])assert(g.pressStrip(lane));
 assert.equal(g.hits,4);assert.equal(g.lives,g.maxLives);assert.equal(g.pressed.size,4);
 assert.deepEqual(events.filter(e=>e.type==='note').map(e=>e.note.id),[903,901,902,900]);
 g.release(0);assert.equal(a.status,'done');assert.equal(b.status,'holding');assert(g.pressed.has(1));
 g.release(1);assert.equal(g.hits,4);assert.equal(g.coins,4);
});
test('each fresh press selects the earliest visible unplayed note only within its own lane',()=>{
 const notes=[note(900,2,0),note(901,3,1),note(902,3.5,1),note(903,9,2)],{g,input}=fixture(notes,{beat:0});
 assert(!g.pressNote(902));input.press(1,'finger');assert.equal(notes[1].status,'done');assert.equal(notes[0].status,'waiting');
 input.press(1,'finger');input.flush();assert.equal(g.hits,1);
 input.release('finger');input.press(1,'finger');assert.equal(notes[2].status,'done');assert.equal(g.hits,2);
 assert(!g.pressNote(903));assert.equal(notes[3].status,'waiting');
});
test('a long visible note awards its point on attack and lifting it cannot remove or duplicate that point',()=>{
 for(const length of [0,.03,.4,1.5]){
  const a=note(900,4,0,2),{g,events}=fixture([a],{beat:0});assert(g.pressStrip(0));
  assert.equal(g.hits,1);assert.equal(g.coins,1);assert.equal(a.status,'holding');
  advance(g,length);g.release(0);assert.equal(a.status,'done');assert.equal(g.lives,g.maxLives);
  assert(!g.pressStrip(0));assert.equal(g.hits,1);assert.equal(events.filter(e=>e.type==='complete').length,1);
 }
});
test('short notes and the visible tail of long notes remain playable until they exit the viewport',()=>{
 for(const [w,h] of [[320,568],[390,844],[1200,800]])for(const hold of [0,2]){
  const layout=pianoLayout(w,h,true,true,true),window=4+(layout.size/2+12)/layout.unit,late=(h-layout.hit+layout.size/2)/layout.unit;
  for(const position of ['top','bottom']){
   const a=note(900,4,0,hold),beat=position==='top'?4-window+.01:4+hold+late-.01,{g}=fixture([a],{beat});g.inputWindow=window;g.lateWindow=late;
   const p=pianoTarget(a,g.beat,layout);assert(p.y+p.size/2>=layout.top-12);assert(p.y-hold*layout.unit-p.size/2<h);
   assert(g.pressStrip(0),`${w}x${h} ${position} hold ${hold}`);assert.equal(g.hits,1);
  }
  const a=note(900,4,0,hold),{g}=fixture([a],{beat:4+hold+late+.01});g.lateWindow=late;assert(!g.pressNote(a.id));g.step(.01);
  assert.equal(a.status,'missed');assert.equal(g.lives,g.maxLives-1);
 }
});
test('a held key never collects the next note, and a press made before visibility is never buffered',()=>{
 const a=note(900,4,0,.5),b=note(901,5,0),{g,input,events}=fixture([a,b],{beat:-1});
 input.press(0,'key');g.beat=0;input.flush();assert.equal(g.hits,0);
 input.release('key');input.press(0,'key');assert.equal(g.hits,1);advance(g,1);g.beat=5;
 input.press(0,'key');input.flush();assert.equal(b.status,'waiting');assert.equal(g.hits,1);
 input.release('key');input.press(0,'key');assert.equal(g.hits,2);assert.equal(events.filter(e=>e.type==='note').length,2);
});
test('wrong-lane recovery freezes and rewinds once, then an early visible retry works immediately',()=>{
 const a=note(900,4,0),{g,events,input}=fixture([a],{beat:3.9,recoverWrongTap:true});input.press(1,'bad');
 const time=g.time;assert.equal(g.lives,g.maxLives-1);assert.equal(g.recoverySeconds,1);advance(g,.5);assert(g.beat<3.9);assert.equal(g.time,time);
 g.pause();const frozen=g.recoverySeconds;advance(g,.5);assert.equal(g.recoverySeconds,frozen);g.resume();advance(g,.6);
 input.release('bad');input.press(0,'good');assert.equal(g.hits,1);assert.equal(events.filter(e=>e.type==='recover').length,1);assert.equal(events.filter(e=>e.type==='note').length,1);
});
test('pause ends optional sustain, retains its point and resumes the clock without demanding another hold',()=>{
 const a=note(900,4,0,2),b=note(901,5,1),{g,events}=fixture([a,b],{beat:2});g.pressStrip(0);advance(g,.1);g.pause();
 const beat=g.beat;advance(g,.5);assert.equal(g.beat,beat);assert.equal(g.hits,1);assert.equal(a.status,'done');
 g.resume();advance(g,.1);assert(g.beat>beat);assert(g.pressStrip(1));assert.equal(g.hits,2);assert.equal(events.filter(e=>e.type==='note').length,2);
});
test('revive preserves all earned taps and optional holds without replaying or rescoring them',()=>{
 const a=note(900,4,0),b=note(901,5,1,2),c=note(902,7,2),{g,events}=fixture([a,b,c]);
 g.pressStrip(0);g.release(0);g.pressStrip(1);g.lives=0;g.end();assert(g.revive());
 assert.equal(a.status,'done');assert.equal(b.status,'done');assert.equal(g.hits,2);events.length=0;advance(g,3);
 assert.equal(events.filter(e=>e.type==='note').length,0);assert.equal(g.hits,2);g.beat=4;assert(g.pressStrip(2));assert.equal(g.hits,3);
});
test('written tempo stays stable and changes exactly at the next score boundary',()=>{
 assert.equal(pianoSongTempo(10000,104),104);const a=note(900,4,0,0,90),b=note(901,6,1,0,120),{g}=fixture([a,b],{beat:5.9});a.status='done';g.step(.2);
 assert(Math.abs(g.beat-(6+(.2-.1*60/90)*2))<1e-8);assert.equal(g.bpm,120);
});
test('slow frames retain musical time, while a long foreground stall drops its time without pausing or damage',()=>{
 for(const frame of [.2,.5,1]){const fast=fixture([note(900,100,0)],{beat:0}).g,slow=fixture([note(900,100,0)],{beat:0}).g;advance(fast,1);advance(slow,1,frame);assert(Math.abs(fast.beat-slow.beat)<1e-8);assert(Math.abs(slow.time-1)<1e-8);}
 const {g:stalled,events}=fixture([note(900,4,0)],{beat:3});stalled.step(1.5);assert.equal(stalled.paused,false);assert.equal(stalled.beat,3);assert.equal(stalled.time,0);assert.equal(stalled.lives,stalled.maxLives);
 assert.equal(events.filter(e=>e.type==='stall').length,1);stalled.step(.02);assert(stalled.beat>3&&stalled.beat<3.04);assert.equal(stalled.time,.02);assert(stalled.pressStrip(0));assert.equal(stalled.hits,1);
});

test('the first song note enters at the top after count-in on short, tall and wide screens',()=>{
 for(const [w,h] of [[320,568],[390,844],[844,390],[1200,800]]){
  const events=[],g=createPianoGame({...options,onEvent:e=>events.push(e)}),layout=pianoLayout(w,h,true,true,true);
  const inputWindow=4+(layout.size/2+12)/layout.unit,lateWindow=(h-layout.hit+layout.size/2)/layout.unit;
  g.setViewport({inputWindow,lateWindow});const first=g.notes[0],entry=pianoTarget(first,g.beat,layout);
  assert(Math.abs(entry.y+entry.size/2-(layout.top-12))<1e-8,`${w}x${h}: first note starts at clipping edge`);
  g.start();advance(g,2.9);assert(!g.pressStrip(first.lane));assert.deepEqual(pianoTarget(first,g.beat,layout),entry);
  advance(g,.1);assert.equal(g.countdown,0);assert.deepEqual(pianoTarget(first,g.beat,layout),entry,'GO cannot move a note into the middle');
  g.step(1/60);const visible=pianoTarget(first,g.beat,layout);assert(visible.y>entry.y);assert(visible.y-entry.y<5,'first movement is one normal frame');
  assert(g.pressStrip(first.lane),'the first visible sliver is immediately playable');assert.equal(g.hits,1);
  assert.deepEqual(events.filter(e=>e.type==='countdown').map(e=>e.count),[3,2,1]);
 }
});

test('count-in resize and rewarded continuation both cue the next unplayed note at the current top edge',()=>{
 const g=createPianoGame(options);g.start();advance(g,1);
 const layout=pianoLayout(844,390,true,true,true),inputWindow=4+(layout.size/2+12)/layout.unit;
 g.setViewport({inputWindow});assert(Math.abs(g.countdown-2)<1e-8);assert(Math.abs(pianoTarget(g.notes[0],g.beat,layout).y+layout.size/2-(layout.top-12))<1e-8);
 advance(g,2);g.pressStrip(g.notes[0].lane);g.release(g.notes[0].lane);const earned=g.hits,next=g.notes.find(n=>!n.scored);
 g.lives=0;g.end();assert(g.revive());assert.equal(g.hits,earned);assert.equal(g.countdown,3);
 assert(Math.abs(pianoTarget(next,g.beat,layout).y+layout.size/2-(layout.top-12))<1e-8);
 advance(g,3);const before=g.beat;g.step(1/60);assert(g.beat>before);assert(g.pressStrip(next.lane));assert.equal(g.hits,earned+1);
});

test('an explicit background pause still freezes the chart across a stall until resume',()=>{
 const {g,events}=fixture([note(900,4,0)],{beat:2});g.pause();g.step(5);
 assert(g.paused);assert.equal(g.beat,2);assert.equal(g.time,0);assert.equal(events.filter(e=>e.type==='stall').length,0);assert(!g.pressStrip(0));
 g.resume();g.step(.02);assert(!g.paused);assert(g.beat>2);assert(g.pressStrip(0));
});
test('lead attacks get their full authored articulation immediately, even before or after nominal onset',()=>{
 for(const beat of [0,4.5]){const a=note(900,4,0,2),{g,events}=fixture([a],{beat});g.pressStrip(0);const sound=events.find(e=>e.type==='note');assert.equal(sound.remainingSound,a.soundBeats);assert.equal(sound.time,0);assert.equal(g.hits,1);}
});
test('performed support sounds on the press and cancels stale future figures when the player moves on',()=>{
 let now=0;const calls=[],cancelled=[];const support=createPianoPerformedSupport({now:()=>now,play:event=>{calls.push(event);return ()=>cancelled.push(event.id);}});
 support.schedule([{id:'bass',beat:0,duration:1},{id:'arp',beat:.5,duration:.3}],{bpm:100,beat:0});
 assert.deepEqual(calls.map(e=>e.delay),[0,.3]);now=.1;
 support.schedule([{id:'next-bass',beat:0,duration:1},{id:'next-arp',beat:.5,duration:.3}],{bpm:120,beat:0});
 assert.deepEqual(cancelled,['arp']);assert.equal(calls[2].delay,0);assert.equal(calls[3].delay,.25);
 support.clear();assert.deepEqual(cancelled,['arp','next-bass','next-arp']);
 support.schedule([{id:'next-bass',beat:0,duration:1}],{bpm:120,beat:0});assert.equal(calls.length,5,'pause clears cancelled support ownership');
});

test('wrong-strip recovery releases optional sustains without removing their earned point',()=>{
 const a=note(900,2,0,3),b=note(901,3,1),{g,events}=fixture([a,b],{beat:0,recoverWrongTap:true});
 g.pressStrip(0);assert.equal(g.hits,1);assert.equal(a.status,'holding');g.pressStrip(3);
 assert.equal(a.status,'done');assert.equal(g.pressed.size,0);assert.equal(g.hits,1);assert.equal(g.recoverySeconds,1);
 assert.equal(events.filter(e=>e.type==='release'&&e.note===a).length,1);advance(g,1.1);g.pressStrip(1);assert.equal(g.hits,2);
});
