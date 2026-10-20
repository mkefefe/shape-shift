import {createSongSequence} from './piano-songs.js?v=piano2';
import {createPianoSequence,pianoDifficulty} from './piano-music.js';
import {maxLivesForFrame} from './engine.js';
export const PIANO_LANES=3,PIANO_WINDOW=.38;
// At the fastest strip tempo this still leaves over half a second to change strips.
export const PIANO_HOLD_GAP=1.5,PIANO_MAX_HOLD=4.5;
const tune=[[76,1],[79,1],[74,2],[76,1.5],[72,.5],[69,2],[72,1],[76,1],[77,1],[76,1],[74,2],[71,1],[67,1],[71,1],[74,1],[76,2],[79,1.5],[76,.5],[72,2],[74,1],[77,1],[76,1],[74,1],[71,1],[69,1],[67,2]];
// Short, connected phrases keep the phone chart flowing between sustained notes.
const flowingTune=[
 [72,.5],[76,.5],[79,.5],[76,.5],[74,.5],[76,.5],[81,1],
 [79,.5],[76,.5],[74,.5],[72,.5],[71,.5],[74,.5],[74,1],
 [69,.5],[72,.5],[76,.5],[79,.5],[77,.5],[76,.5],[72,1],
 [71,.5],[74,.5],[79,.5],[77,.5],[76,.5],[74,.5],[72,1]
];
const bass=[48,45,41,43,40,45,38,43];
export const pianoTempo=seconds=>90+Math.min(90,Math.max(0,seconds)*.32);
export const pianoStripTempo=seconds=>72+Math.min(108,Math.max(0,seconds-30)*.3);
export function createPianoGame({rng=Math.random,onEvent=()=>{},frame='none',upgrade=0,directTouch=false,rhythm=false,stripTap=false,melodicStrips=false,fullSongs=false}={}){
 const resumableHolds=stripTap||melodicStrips;
 const maxLives=maxLivesForFrame(frame,upgrade),g={time:0,beat:fullSongs?-3:stripTap?0:-4,countdown:stripTap?3:0,started:false,paused:false,over:false,notes:[],score:0,coins:0,hits:0,combo:0,bestCombo:0,maxLives,lives:maxLives,bpm:stripTap?72:90,lanes:rhythm?4:3,fullSongs,songTitle:'',section:'',songsCompleted:0,rhythm,stripTap,melodicStrips,pressed:new Set()};
 let cursor=stripTap?2:directTouch&&!rhythm?2.5:0,serial=0,lastLane=-1,lastWrong=-10,lastBeat=stripTap?-1:-5;
 const nextMusic=fullSongs?createSongSequence(rng):createPianoSequence(rng,{difficulty:()=>pianoDifficulty(g.time)});
 const measures=[];let backingPulse=0,damageUntil=-1;
 const emit=(type,extra={})=>onEvent({type,...extra,time:g.time,beat:g.beat});
 function fill(){while(cursor<g.beat+9){
  if(melodicStrips){const music=nextMusic(),hold=music.duration>=2?Math.min(PIANO_MAX_HOLD,music.duration-PIANO_HOLD_GAP):0;
   // Fit the finger-transfer gap INSIDE the written rhythm, never stretch a bar.
   const spacing=music.duration;
   if(music.harmony.length)measures.push({beat:cursor-(fullSongs?0:2),chord:music.chord,title:music.title,section:music.section,energy:music.energy,bpm:music.bpm,round:music.round});
   let lane=music.shape;
   if(lane===lastLane)lane=(lane+1+Math.floor(Math.max(0,Math.min(.999999,Number(rng())||0))*3))%4;
   lastLane=lane;
   g.notes.push({...music,id:serial++,lane,beat:cursor,hold,end:cursor+hold,status:'waiting',awaiting:false});cursor+=spacing;continue;}
  const phrase=directTouch?flowingTune:tune,[pitch,writtenDuration]=phrase[serial%phrase.length],duration=writtenDuration*(stripTap?2:1);let lane=rhythm?[0,1,3,2,1,3,0,2,3,1,0,2,1,3,0,2,3,1,2,0,3,1,3,2,0,1,3,0][serial%28]:Math.floor(Math.max(0,Math.min(.99999,Number(rng())||0))*3);if(!rhythm&&lane===lastLane)lane=(lane+1+(serial%2))%3;lastLane=lane;
  const hold=directTouch?(writtenDuration>=1?duration-.2:0):(serial>3&&duration>=1.5&&serial%3!==0?duration-.2:0);
  g.notes.push({id:serial,shape:rhythm?lane:serial%4,color:(serial+Math.floor(serial/4))%4,lane,pitch,duration,beat:cursor,hold,end:cursor+hold,status:'waiting',awaiting:false});serial++;cursor+=duration;}}
 fill();
 function end(){if(g.over)return;g.over=true;g.pressed.clear();emit('end');}
 function fail(note,reason){
  if(note&&['missed','done'].includes(note.status))return;
  const expected=note||nextUnplayed(),alreadyCharged=expected?.damageCharged;
  if(note){note.status='missed';note.awaiting=false;}
  const damaged=!alreadyCharged&&g.time>=damageUntil;
  if(expected)expected.damageCharged=true;
  if(damaged){g.combo=0;g.lives=Math.max(0,g.lives-1);damageUntil=g.time+1.5;}
  emit('miss',{note,reason,damaged});if(!g.lives)end();
 }

 function complete(note){if(['done','missed'].includes(note.status))return;note.status='done';note.awaiting=false;g.hits++;g.coins=Math.min(100000,g.coins+1);g.combo++;g.bestCombo=Math.max(g.bestCombo,g.combo);g.score=g.hits;emit('complete',{note,perfect:note.perfect});}
 function press(lane){if(melodicStrips)return pressStrip(lane);if(!Number.isInteger(lane)||lane<0||lane>=g.lanes||!g.started||g.paused||g.over||g.pressed.has(lane))return false;if(rhythm){const note=g.notes.find(n=>n.lane===lane&&(n.status==='waiting'||resumableHolds&&n.status==='partial'||n.status==='holding'&&n.awaiting));return note?pressNote(note.id):false;}g.pressed.add(lane);
  const held=g.notes.find(n=>n.lane===lane&&n.status==='holding'&&n.awaiting);
  if(held){held.awaiting=false;emit('note',{note:held,remaining:Math.max(.1,held.end-g.beat)});return true;}
  if(g.beat<-.5)return false;
  const note=g.notes.find(n=>n.lane===lane&&n.status==='waiting'&&Math.abs(n.beat-g.beat)<=PIANO_WINDOW);
  if(!note){if(g.time-lastWrong>.25){lastWrong=g.time;fail(null,'wrong');}return false;}
  note.perfect=Math.abs(note.beat-g.beat)<.15;emit('note',{note,remaining:note.hold?Math.max(.1,note.end-g.beat):0});
  if(note.hold){note.status='holding';emit('hold',{note});}else complete(note);return true;
 }
 function nextUnplayed(){return g.notes.find(n=>['waiting','partial','holding'].includes(n.status)||n.status==='queued'&&n.hold);}
 function wrongStrip(){if(g.time-lastWrong>.25){lastWrong=g.time;fail(null,'wrong');}return false;}
 function pressNote(id){
  if(!g.started||g.countdown>0||!fullSongs&&g.beat<(rhythm?-PIANO_WINDOW:0)||g.paused||g.over)return false;
  const note=g.notes.find(n=>n.id===id);if(!note||g.pressed.has(note.lane)||melodicStrips&&g.pressed.size)return false;
  if(melodicStrips&&['waiting','partial'].includes(note.status)&&nextUnplayed()!==note)return wrongStrip();
  if(resumableHolds&&note.status==='partial'){
   if(g.beat>note.beat+note.hold)return false;
   const first=g.notes.find(n=>n.lane===note.lane&&['waiting','partial'].includes(n.status));if(first!==note)return false;
   g.pressed.add(note.lane);note.status='holding';emit('note',{note,remaining:Math.max(.01,note.hold-(note.heldBeats||0))});return true;
  }
  if(note.status==='holding'&&note.awaiting){g.pressed.add(note.lane);note.awaiting=false;emit('note',{note,remaining:resumableHolds?Math.max(.01,note.hold-(note.heldBeats||0)):Math.max(.1,note.end-g.beat)});return true;}
  if(fullSongs&&note.status==='waiting'){
   const until=note.beat-g.beat;
   if(until>4.4){emit('timing',{reason:'early'});return false;}
  }
  if(note.status!=='waiting'||note.beat-g.beat>5||g.beat>note.beat+(resumableHolds?note.hold:PIANO_WINDOW)+(fullSongs?.65:0))return false;
  if(stripTap){const next=g.notes.find(n=>n.lane===note.lane&&(n.status==='waiting'||resumableHolds&&n.status==='partial'));if(next!==note||note.beat-g.beat>4.4)return false;}
  else if(rhythm){const next=g.notes.find(n=>n.status==='waiting');if(next!==note){emit('timing',{reason:'order'});return false;}if(Math.abs(note.beat-g.beat)>PIANO_WINDOW){emit('timing',{reason:'early'});return false;}}
  g.pressed.add(note.lane);note.perfect=stripTap||!rhythm||Math.abs(note.beat-g.beat)<.15;
  if(note.hold&&resumableHolds){note.heldBeats=0;note.holdLength=note.hold;note.status='holding';}
  else if(note.hold){note.holdStarted=g.beat;note.end=rhythm&&!stripTap?note.beat+note.hold:g.beat+note.hold;note.holdLength=note.end-g.beat;note.status='holding';}
  emit('note',{note,remaining:note.hold?(resumableHolds?note.hold:Math.max(.1,note.end-g.beat)):rhythm?note.duration*.9:0});if(note.hold)emit('hold',{note});else complete(note);return true;
 }
 // A finger owns exactly one strip. Subsequent notes sound on the same beat position,
 // rather than all visible shapes being collected at once.
 function pressStrip(lane){
  if(!Number.isInteger(lane)||lane<0||lane>=g.lanes||!g.started||g.countdown>0||g.paused||g.over||g.pressed.size)return false;
  const awaiting=g.notes.find(n=>n.status==='holding'&&n.awaiting);
  if(awaiting){if(awaiting.lane!==lane)return false;return pressNote(awaiting.id);}
  const next=nextUnplayed();
  if(fullSongs&&(!next||next.beat-g.beat>4.4))return false;
  if(next&&next.lane===lane&&next.beat-g.beat<=4.4&&g.beat<=next.beat+next.hold+(fullSongs?.65:0))return pressNote(next.id);
  return wrongStrip();
 }
 function release(lane){g.pressed.delete(lane);if(fullSongs){const queued=g.notes.find(n=>n.lane===lane&&n.status==='queued'&&n.hold);if(queued){queued.status='waiting';emit('release',{note:queued});}}if(g.paused||g.over)return;const n=g.notes.find(n=>n.lane===lane&&n.status==='holding'&&!n.awaiting);if(n){if(resumableHolds){n.status='partial';emit('release',{note:n});return;}if(g.beat<n.end-.16)fail(n,'released');else complete(n);}}
 function step(dt){if(!g.started||g.paused||g.over||!Number.isFinite(dt)||dt<=0||g.notes.some(n=>n.status==='holding'&&n.awaiting))return;
  const seconds=Math.min(.05,dt);if(g.countdown>0){const before=Math.ceil(g.countdown);g.countdown=Math.max(0,g.countdown-seconds);if(g.countdown<1e-8)g.countdown=0;const after=Math.ceil(g.countdown);if(after!==before)emit(after?'countdown':'ready',{count:after});return;}
  const previousBeat=g.beat;g.time+=seconds;g.bpm=fullSongs?(measures.findLast(m=>m.beat<=g.beat)?.bpm||measures[0]?.bpm||88):stripTap?pianoStripTempo(g.time):pianoTempo(g.time);g.beat+=seconds*g.bpm/60;
  if(melodicStrips){
   // Bass + broken chords supply an audible pulse even between player taps.
   // The two-beat offset matches the normal strip collection position.
   while(backingPulse*.5<=g.beat){
    const at=backingPulse*.5;while(measures.length>1&&measures[1].beat<=at)measures.shift();
    const measure=measures[0],chord=measure?.chord;
    if(fullSongs&&measure){g.songTitle=measure.title;g.section=measure.section;g.songsCompleted=measure.round;}
    if(chord){const step=backingPulse%8;
     const pitch=step===0?(chord[0]>=48?chord[0]-12:chord[0]):step===4?chord[2]-12:chord[[0,1,2,1][step%4]];
     emit('accompaniment',{energy:measure?.energy??1,pitch,pitches:step===2||step===6?[...chord]:[pitch],pulse:backingPulse,duration:(step%4===0?1.35:.7)*60/g.bpm,musicalBeat:at});
    }
    backingPulse++;
   }
  }
  const whole=Math.floor(g.beat);if(whole>lastBeat){lastBeat=whole;if(whole<0)emit('countdown',{count:-whole});else if(!melodicStrips){const roots=rhythm?[48,45,41,43]:bass;emit('beat',{pitch:roots[Math.floor(whole/(stripTap?8:4))%roots.length]+(whole%2?12:0),accent:whole%(stripTap?8:4)===0});}}
  for(const n of g.notes){
   if(g.over)break;
   if(fullSongs&&n.status==='queued'&&g.beat>=n.beat){const down=g.pressed.has(n.lane);g.pressed.delete(n.lane);n.status='waiting';pressNote(n.id);if(!down)g.pressed.delete(n.lane);}

   if(resumableHolds){
    const deadline=n.beat+n.hold+(fullSongs?.65:0);
    // Only finger-down time fills a long note. Its travel deadline never moves.
    if(n.status==='holding'&&!n.awaiting){
     n.heldBeats=Math.min(n.hold,(n.heldBeats||0)+Math.max(0,Math.min(g.beat,deadline)-previousBeat));
     if(n.heldBeats>=n.hold-1e-8)complete(n);
    }
    if(!['done','missed'].includes(n.status)&&g.beat>deadline)fail(n,'missed');
   }else if(n.status==='waiting'&&g.beat>n.beat+(stripTap?0:PIANO_WINDOW))fail(n,'missed');
   else if(n.status==='holding'&&!n.awaiting&&g.beat>=n.end)complete(n);
  }
  if(melodicStrips&&!g.over&&g.pressed.size&&!g.notes.some(n=>n.status==='holding')){
   const lane=[...g.pressed][0],next=nextUnplayed();
   if(next&&next.lane===lane&&next.beat-g.beat<=(fullSongs?0:2)){g.pressed.delete(lane);if(!pressNote(next.id))g.pressed.add(lane);}
  }
  g.notes=g.notes.filter(n=>n.end>g.beat-2||n.status==='holding');fill();
 }
 return Object.assign(g,{revive(){if(!g.over||g.lives>0)return false;g.over=false;g.paused=false;damageUntil=-1;g.lives=g.maxLives;g.combo=0;g.pressed.clear();if(fullSongs){const next=g.notes.find(n=>n.status==='waiting'||n.status==='partial');if(next){g.beat=next.beat-5;for(const n of g.notes)if(!['done','missed'].includes(n.status)){n.status='waiting';n.heldBeats=0;n.awaiting=false;}}}else{g.notes=[];measures.length=0;cursor=g.beat+4;}backingPulse=Math.ceil(g.beat*2);g.countdown=3;fill();return true;},press,pressStrip,pressNote,release,step,end,start(){if(g.started||g.over)return;g.started=true;emit('start');if(g.countdown)emit('countdown',{count:Math.ceil(g.countdown)});},pause(){if(!g.started||g.over||g.paused)return;g.paused=true;g.pressed.clear();for(const n of g.notes){if(n.status==='holding')n.awaiting=true;if(fullSongs&&n.status==='queued'&&n.hold)n.status='waiting';}},resume(){if(!g.over){g.paused=false;g.pressed.clear();}},dispose(){g.over=true;g.notes=[];g.pressed.clear();}});
}
const safe=n=>Number.isSafeInteger(n)&&n>=0?n:0;
const receipt=e=>e&&/^piano-flow-[a-f0-9-]{36}$/.test(e.id)&&Number.isSafeInteger(e.coins)&&e.coins>=0&&e.coins<=100000;
export function pianoProgress(raw){
 // Only records written with the universal note-count rule are comparable.
 // Preserve old data for recovery, but never show a weighted record as notes.
 const current=raw?.scoreVersion===3;
 return {best:current?safe(raw?.best):0,scoreVersion:3,
  legacyBest:Math.max(safe(raw?.legacyBest),current?0:safe(raw?.best)),
  runs:safe(raw?.runs),pending:Array.isArray(raw?.pending)?raw.pending.filter(receipt):[]};
}
export function finishPianoProgress(raw,result,id){
 const p=pianoProgress(raw);if(p.pending.some(e=>e.id===id))return p;
 const score=safe(result.hits);
 return {...p,best:Math.max(p.best,score),runs:p.runs+1,pending:[...p.pending,{id,coins:Math.min(100000,safe(result.coins))}]};
}
export function claimPianoReward(profile,entry){if(!receipt(entry))return profile;const paid=Array.isArray(profile.pianoRewards)?profile.pianoRewards:[];if(paid.includes(entry.id))return profile;const coins=profile.coins+entry.coins,xp=(profile.xp||0)+Math.min(200,entry.coins);if(!Number.isSafeInteger(coins)||!Number.isSafeInteger(xp))return profile;return {...profile,coins,xp,pianoRewards:[...paid,entry.id]};}

