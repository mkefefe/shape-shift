import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProfile,normalizeProfile} from './economy.js';
import {checkpointRunResult,finalizeRunResult,recoverRunResult,createResultJournal} from './run-results.js';
import {finishDropProgress,claimDropReward} from './shape-drop-engine.js';
import {finishSliceProgress,claimSliceReward} from './shape-slice-engine.js';
import {finishPianoProgress,claimPianoReward} from './piano-flow-engine.js';
import {pendingResultModes,flushResultStorage,recoverJournaledResult} from './result-storage.js';

const id='aabbccdd-1234-4567-89ab-123456789abc';
const snapshot=(score=25)=>({id,mode:'endless',difficulty:'normal',score,picks:score,date:'2026-10-31T16:00:00Z',ranked:{id:'ranked-1',expectedScore:score,actions:[{type:'loadout'}]},questEvent:{type:'finish',mode:'endless',score,picks:score},restoration:{mode:'endless',xp:0,receipt:'main:'+id+':xp:75'}});
const storage=()=>{const rows=new Map();return {getItem:k=>rows.get(k)||null,setItem:(k,v)=>rows.set(k,v),removeItem:k=>rows.delete(k)};};

test('a loss before Continue saves history and wallet and recovers a final score after reload',()=>{
 const earned={...freshProfile(),coins:25,xp:75};
 const staged=checkpointRunResult(earned,snapshot());
 assert.equal(staged.runs[0].score,25);assert.equal(staged.pending.length,0,'do not close a ranked run before an earned continue');
 const reloaded=normalizeProfile(JSON.parse(JSON.stringify(staged))),recovered=recoverRunResult(reloaded);
 assert.equal(recovered.coins,25);assert.equal(recovered.xp,75);assert.equal(recovered.runs.length,1);
 assert.equal(recovered.pending.length,1);assert.equal(recovered.pending[0].expectedScore,25);assert.equal(recovered.pendingRunResult,undefined);
 assert.deepEqual(recoverRunResult(recovered),recovered);
});

test('continued loss replaces the provisional record without duplicate currency, quests or rank submissions',()=>{
 const first=checkpointRunResult({...freshProfile(),coins:25,xp:75},snapshot());
 const afterContinue={...first,coins:40,xp:120};
 const final=finalizeRunResult(afterContinue,snapshot(40));
 assert.equal(final.runs.length,1);assert.equal(final.runs[0].score,40);assert.equal(final.pending.length,1);
 assert.equal(final.pending[0].expectedScore,40);assert.equal(final.coins,40);assert.equal(final.xp,120);
 assert.strictEqual(finalizeRunResult(final,snapshot(40)),final,'duplicate backdrop/key callbacks are no-ops');
});

for(const [mode,finish,claim,result] of [
 ['shape-drop',finishDropProgress,claimDropReward,{score:8,matches:6,bombPoints:2,cleared:12,bestCombo:2,time:30,frame:'none'}],
 ['shape-slice',finishSliceProgress,claimSliceReward,{score:12,sliced:10,bonusScore:2,bestCombo:3,time:30,frame:'none'}],
 ['piano-flow',finishPianoProgress,claimPianoReward,{score:12,hits:12,coins:10,time:30,frame:'none'}]
])test(mode+' recovers a closed Continue offer exactly once, even after its reward was acknowledged',()=>{
 const store=storage(),journal=createResultJournal(store,mode+'-continue-result'),runId=mode+'-'+id;
 assert(journal.write(runId,result));const row=journal.read();
 const progress=finish({},row.result,row.id),paid=claim(freshProfile(),progress.pending[0]);
 assert.equal(progress.runs,1);assert(paid.coins>0);
 // Simulate death between progress commit and journal deletion: its reward has
 // already left the pending queue, but the durable completion receipt survives.
 const acknowledged={...progress,pending:[]},again=finish(acknowledged,row.result,row.id);
 assert.equal(again.runs,1);assert.equal(again.pending.length,0);
 assert.strictEqual(claim(paid,progress.pending[0]),paid);
 journal.clear();assert.equal(journal.read(),null);
});

test('journal reports storage failure without pretending the checkpoint was written',()=>{
 const journal=createResultJournal({getItem:()=>null,setItem(){throw Error('quota');},removeItem(){}},'test');
 assert.equal(journal.write(id,{score:4}),false);assert.equal(journal.read(),null);
});

test('recovery retains the journal on a failed commit and does not replay a completed quest',()=>{
 const store=storage(),journal=createResultJournal(store,'shape-shift-slice-v1-continue-result');
 journal.write('shape-slice-'+id,{score:9,sliced:9,time:20});
 let progress={},questFinishes=0,fail=true;
 const recover=()=>recoverJournaledResult({journal,progress,finish:finishSliceProgress,persist:next=>{if(fail)return false;progress=next;return true;},onRecovered:()=>questFinishes++});
 assert.equal(recover(),false);assert(journal.read());assert.equal(questFinishes,0);
 fail=false;assert.equal(recover(),true);assert.equal(progress.runs,1);assert.equal(questFinishes,1);
 journal.write('shape-slice-'+id,{score:9,sliced:9,time:20});
 assert.equal(recover(),true);assert.equal(progress.runs,1);assert.equal(questFinishes,1);
});

test('startup recovery loads only modes with unfinished results or pending rewards',()=>{
 const store=storage();store.setItem('shape-shift-drop-v1',JSON.stringify({pending:[{id:'unpaid'}]}));
 store.setItem('shape-shift-piano-v1-continue-result',JSON.stringify({id:'pending'}));
 assert.deepEqual(pendingResultModes(store),['drop','piano']);
});

test('platform flush waits for durable storage and reports a rejected save',async()=>{
 let resolve,done=false;const work=flushResultStorage({flush:()=>new Promise(r=>resolve=r)}).then(result=>{done=true;return result;});
 await Promise.resolve();assert.equal(done,false);resolve();assert.equal(await work,true);
 assert.equal(await flushResultStorage({flush:async()=>{throw Error('offline');}}),false);
});

test('an already-finalized main run clears a leftover journal without paying it twice',()=>{
 const final=finalizeRunResult(freshProfile(),snapshot());
 const recovered=recoverRunResult({...final,pendingRunResult:snapshot()});
 assert.equal(recovered.pendingRunResult,undefined);assert.equal(recovered.pending.length,1);assert.equal(recovered.runs.length,1);
});
