import {pianoIcon} from './piano-music.js?v=494240';
import {PIANO_SCORES} from './piano-song-data.js?v=494240';

const CHORDS={C:[48,52,55],Cmaj7:[48,52,55,59],F:[53,57,60],Fmaj7:[53,57,60,64],G:[43,47,50],G7:[43,47,50,53],Am:[45,48,52],Am7:[45,48,52,55],Dm:[50,53,57],Dm7:[50,53,57,60],Em:[52,55,59],Em7:[52,55,59,62]};
const SEMITONES={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
export function scorePitch(name){
 const match=/^([A-G])([3-5])$/.exec(name);
 if(!match)throw Error('Unknown written pitch: '+name);
 const pitch=(Number(match[2])+1)*12+SEMITONES[match[1]];pianoIcon(pitch);return pitch;
}
export function readPianoBar([chordName,written]){
 const chord=CHORDS[chordName];if(!chord)throw Error('Unknown chord '+chordName);
 let offset=0;
 const notes=written.split(/\s+/).map(token=>{
  const match=/^([A-G][3-5])(?:\/(\d*\.?\d+)(h)?(?::(\d*\.?\d+))?)?$/.exec(token);
  if(!match)throw Error('Invalid written note: '+token);
  const pitch=scorePitch(match[1]),duration=Number(match[2]||1),sustain=Boolean(match[3]);
  const soundBeats=match[4]?Number(match[4]):sustain?Math.min(duration-.2,3.3):Math.min(.9,duration*.82);
  const holdBeats=sustain?Math.max(0,soundBeats-.2):0;
  if(duration<=0||soundBeats<=0||soundBeats>duration)throw Error('Invalid note duration: '+token);
  const note={pitch,duration,soundBeats,holdBeats,restAfter:duration-soundBeats,offset};offset+=duration;return note;
 });
 if(Math.abs(offset-4)>1e-9)throw Error('Written bar must total four beats: '+written+' ('+offset+')');
 return {chord:[...chord],notes};
}
function quietBar(measure){
 const a=measure.notes[0],b=measure.notes.find(n=>n.offset>=2)||measure.notes.at(-1);
 return {...measure,notes:[{...a,duration:2,soundBeats:1.1,holdBeats:0,restAfter:.9,offset:0},{...b,duration:2,soundBeats:1.7,holdBeats:1.5,restAfter:.3,offset:2}]};
}
function compose([id,title,bpm,tonicName,style,verseScore,verseEnding,chorusScore,chorusEnding,bridgeScore]){
 const tonic=scorePitch(tonicName),a=verseScore.map(readPianoBar),b=chorusScore.map(readPianoBar),cadence=readPianoBar(verseEnding),chorusCadence=readPianoBar(chorusEnding),bridge=bridgeScore.map(readPianoBar);
 // Establish a short, recognizable melodic/harmonic hook before answering it.
 // A B | A B | A B | turnaround home: three complete identical statements,
 // including note lengths and rests. Changing a chord every unfamiliar bar
 // made free-timed performances sound like a succession of unrelated ideas.
 const hook=(phrase,turnaround,ending)=>[phrase[0],phrase[1],phrase[0],phrase[1],phrase[0],phrase[1],turnaround,ending];
 const final={chord:[...cadence.chord],notes:[{pitch:tonic,duration:4,soundBeats:3.3,holdBeats:3.1,restAfter:.7,offset:0}]};
 const introduction=quietBar(a[0]);
 const form=[['Intro',[introduction,introduction]],['Verse',hook(a,a[2],cadence)],['Chorus',hook(b,b[3],chorusCadence)],['Bridge',[...bridge,...bridge]],['Chorus',hook(b,b[3],chorusCadence)],['Outro',[quietBar(a[0]),final]]];
 const notes=[],sections=[];let beat=0,bar=0;
 for(const [section,measures] of form){
  sections.push({name:section,beat,bars:measures.length});
  for(let sectionBar=0;sectionBar<measures.length;sectionBar++){
   const measure=measures[sectionBar];
   for(const n of measure.notes){
    const downbeat=n.offset===0,accent=downbeat?1:n.offset===2?.9:n.offset%1===0?.82:.72;
    notes.push({...n,chord:[...measure.chord],harmony:downbeat?[measure.chord[0],measure.chord[2]]:[],
     section,energy:section==='Intro'?.38:section==='Outro'?.3:section==='Chorus'?.85:section==='Bridge'?.48:.65,
     accent,gate:n.soundBeats/n.duration,song:id,title,bpm,style,songBeat:beat+n.offset,bar,phraseBar:sectionBar%4,
     motifBar:section==='Intro'?0:section==='Bridge'||sectionBar<6?sectionBar%2:sectionBar,
     rapid:n.duration<1,...pianoIcon(n.pitch)});
   }
   beat+=4;bar++;
  }
 }
 return {id,title,bpm,tonic,style,beats:beat,sections,notes};
}
export const ORIGINAL_SONGS=PIANO_SCORES.map(compose);

// Compatibility with saved gameplay options. Brightness is an instrument/mix
// choice: never rewrite a minor harmony or change a player's learned melody.
export function brightenPianoSong(song){
 return {...song,notes:song.notes.map(n=>({...n,chord:[...n.chord],harmony:[...n.harmony]}))};
}
export function createSongSequence(rng=Math.random,{bright=false}={}){
 const catalog=bright?ORIGINAL_SONGS.map(brightenPianoSong):ORIGINAL_SONGS;
 const randomIndex=n=>Math.floor(Math.max(0,Math.min(.999999,Number(rng())||0))*n);
 let remaining=ORIGINAL_SONGS.map((_,i)=>i),songIndex=remaining.splice(randomIndex(remaining.length),1)[0],index=0,round=0;
 return ()=>{
  let song=catalog[songIndex];
  if(index===song.notes.length){
   if(!remaining.length)remaining=ORIGINAL_SONGS.map((_,i)=>i).filter(i=>i!==songIndex);
   const previous=songIndex;songIndex=remaining.splice(randomIndex(remaining.length),1)[0];
   // At a cycle boundary the previous song is eligible later, never immediately.
   if(round%ORIGINAL_SONGS.length===ORIGINAL_SONGS.length-1)remaining.push(previous);
   index=0;round++;song=catalog[songIndex];
  }
  const n=song.notes[index++];return {...n,chord:[...n.chord],harmony:[...n.harmony],phrase:song.id+'-'+round,round};
 };
}
