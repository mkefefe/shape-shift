import test from 'node:test';
import assert from 'node:assert/strict';
import {createPianoGame,createPianoRhythmScheduler,pianoSecondsToBeat} from './piano-flow-engine.js';
import {pianoBackingPlan} from './piano-backing.js';

const options={stripTap:true,rhythm:true,melodicStrips:true,fullSongs:true,rng:()=>0};
function rhythm(game,plan=pianoBackingPlan){
 const calls=[],scheduler=createPianoRhythmScheduler({plan,play:event=>calls.push({...event,scheduledAt:game.time+event.delay})});
 return {scheduler,calls};
}
function gameAt(beat,notes){return {started:true,practice:false,paused:false,over:false,countdown:0,recoverySeconds:0,beat,time:0,bpm:100,notes};}
const drum=(id,beat,kind='kick')=>({id,beat,kind,duration:.2,gain:.4});

test('ordinary 50–210ms late successful taps do not remove or shift the written downbeats',()=>{
 for(const lateness of [.05,.15,.21]){
  const game=createPianoGame(options);game.start();game.countdown=0;game.beat=1.7;
  const {scheduler,calls}=rhythm(game),bpm=game.bpm;
  for(let i=0;i<1800&&game.beat<6.1;i++){
   game.step(1/240);scheduler.step(game);
   if(!game.notes.some(n=>n.status==='holding')){
    const next=game.notes.find(n=>n.status==='waiting');
    if(next&&(game.beat-next.beat)*60/game.bpm>=lateness){
     for(const lane of [...game.pressed])game.release(lane);
     assert(game.pressStrip(next.lane));
    }
   }
  }
  assert(game.hits>=2);assert.equal(game.lives,game.maxLives);
  const kicks=calls.filter(e=>e.kind==='kick');assert.equal(kicks.length,2);
  for(const [i,kick] of kicks.entries())assert(Math.abs(kick.scheduledAt-(.3+i*4)*60/bpm)<1e-7);
  assert.equal(new Set(calls.map(e=>e.id)).size,calls.length);
 }
});

test('missed melody notes leave the rhythm running until the game ends',()=>{
 const game=createPianoGame(options);game.start();game.countdown=0;game.beat=1.7;
 const {scheduler,calls}=rhythm(game);
 for(let i=0;i<1800&&!game.over;i++){game.step(1/240);scheduler.step(game);}
 assert(game.over);assert.equal(game.hits,0);assert(calls.filter(e=>e.kind==='kick').length>=2);
 const count=calls.length;scheduler.step(game);assert.equal(calls.length,count);
});

test('lookahead does not duplicate a hit when many frames or note events share its window',()=>{
 const game=gameAt(4,[{beat:4,bpm:100}]),{scheduler,calls}=rhythm(game,()=>[drum('kick',0),drum('hat',.2,'hat')]);
 for(let i=0;i<30;i++)scheduler.step(game);
 assert.deepEqual(calls.map(e=>e.id),['kick','hat']);assert.equal(scheduler.pendingCount,2);
 game.beat=4.1;scheduler.step(game);assert.equal(calls.length,2);
});

test('pause cancels ownership of future hits without replaying a beat already sounded',()=>{
 const game=gameAt(4,[{beat:4,bpm:100}]),{scheduler,calls}=rhythm(game,()=>[drum('now',0),drum('future',.2)]);
 scheduler.step(game);game.paused=true;scheduler.cancelAhead(game.beat);scheduler.step(game);
 assert.equal(scheduler.pendingCount,1);assert.equal(calls.length,2);
 game.paused=false;scheduler.step(game);
 assert.deepEqual(calls.map(e=>e.id),['now','future','future']);
 // The first future voice was cancelled by stopPiano; only its replacement remains.
 scheduler.step(game);assert.equal(calls.length,3);
});

test('recovery clears the old schedule, stays silent during rewind, and restarts on the new grid',()=>{
 const game=gameAt(4,[{beat:4,bpm:100}]),{scheduler,calls}=rhythm(game,()=>[drum('kick',0)]);
 scheduler.step(game);scheduler.clear();game.recoverySeconds=1;game.beat=2;
 scheduler.step(game);assert.equal(scheduler.pendingCount,0);assert.equal(calls.length,1);
 game.recoverySeconds=0;scheduler.step(game);assert.equal(calls.length,1);
 game.beat=3.9;scheduler.step(game);assert.equal(calls.length,2);assert(Math.abs(calls[1].delay-.06)<1e-9);
});

test('lookahead crosses a song boundary using the outgoing and incoming tempos exactly',()=>{
 const notes=[{beat:4,bpm:90},{beat:6,bpm:120}],game=gameAt(5.9,notes);game.bpm=90;
 assert(Math.abs(pianoSecondsToBeat(game,6)-1/15)<1e-9);
 assert(Math.abs(pianoSecondsToBeat(game,6.1)-(1/15+.05))<1e-9);
 const {scheduler,calls}=rhythm(game,n=>n.beat===6?[drum('new-downbeat',0),drum('new-subbeat',.1),drum('later',.5)]:[]);
 scheduler.step(game);assert.deepEqual(calls.map(e=>e.id),['new-downbeat','new-subbeat']);
 assert(Math.abs(calls[0].delay-1/15)<1e-9);assert(Math.abs(calls[1].delay-(1/15+.05))<1e-9);
 game.beat=6.1;game.bpm=120;assert(Math.abs(pianoSecondsToBeat(game,5.9)+(1/15+.05))<1e-9);
});

test('count-in, practice, paused, ended and unstarted runs cannot schedule percussion',()=>{
 for(const [key,value] of [['started',false],['practice',true],['paused',true],['over',true],['countdown',1],['recoverySeconds',.5]]){
  const game=gameAt(4,[{beat:4,bpm:100}]);game[key]=value;
  const {scheduler,calls}=rhythm(game,()=>[drum('kick',0)]);scheduler.step(game);
  assert.equal(calls.length,0);assert.equal(scheduler.pendingCount,0);
 }
});

test('expired beats are skipped after a frame stall and schedule memory stays bounded',()=>{
 const game=gameAt(0,[]),{scheduler,calls}=rhythm(game,n=>[drum('kick-'+n.beat,0)]);
 for(let beat=0;beat<100;beat+=.1){game.beat=beat;game.notes=Array.from({length:12},(_,i)=>({beat:Math.floor(beat)-4+i,bpm:100}));scheduler.step(game);assert(scheduler.pendingCount<=10);}
 assert.equal(new Set(calls.map(e=>e.id)).size,calls.length);
 scheduler.clear();game.beat=110;game.notes=[{beat:109,bpm:100}];const count=calls.length;scheduler.step(game);assert.equal(calls.length,count);
});


test('a resumed pause remains silent while the chart waits for a fresh physical hold',()=>{
 const note={beat:4,bpm:100,status:'holding',awaiting:true},game=gameAt(4,[note]);
 const {scheduler,calls}=rhythm(game,()=>[drum('future',.2)]);
 for(let i=0;i<10;i++)scheduler.step(game);assert.equal(calls.length,0);assert.equal(scheduler.pendingCount,0);
 note.awaiting=false;scheduler.step(game);assert.equal(calls.length,1);assert(Math.abs(calls[0].delay-.12)<1e-9);
});


test('a muted sampler does not claim the upcoming beat, so unmuting inside lookahead can play it',()=>{
 const game=gameAt(3.9,[{beat:4,bpm:100}]);let muted=true;const queued=[];
 const scheduler=createPianoRhythmScheduler({plan:()=>[drum('kick',0)],play:event=>{if(muted)return false;queued.push(event);return true;}});
 scheduler.step(game);assert.equal(scheduler.pendingCount,0);assert.equal(queued.length,0);
 muted=false;scheduler.step(game);assert.equal(queued.length,1);assert.equal(scheduler.pendingCount,1);
 assert(Math.abs(queued[0].delay-.06)<1e-9);scheduler.step(game);assert.equal(queued.length,1);
});

test('music mute invalidates a queued future hit and unmute reschedules it without repeating the elapsed beat',()=>{
 const game=gameAt(4,[{beat:4,bpm:100}]);let muted=false,epoch=0;const queued=[];
 const scheduler=createPianoRhythmScheduler({epoch:()=>epoch,plan:()=>[drum('now',0),drum('future',.2)],play:event=>{if(muted)return false;queued.push(event);return true;}});
 scheduler.step(game);assert.equal(queued.length,2);
 // stopPiano(true) cancels both voices and increments the audio generation.
 muted=true;epoch++;scheduler.step(game);assert.equal(scheduler.pendingCount,1);
 game.beat=4.1;muted=false;scheduler.step(game);
 assert.deepEqual(queued.map(e=>e.id),['now','future','future']);assert(Math.abs(queued.at(-1).delay-.06)<1e-9);
 scheduler.step(game);assert.equal(queued.length,3);
});
