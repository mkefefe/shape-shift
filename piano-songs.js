import {pianoIcon} from './piano-music.js?v=49439-web12';

// Original scores, written in four-bar questions and answers. Only the starting
// song is random: the melody, harmony, and rhythm always belong together.
const chords={C:[48,52,55],F:[53,57,60],G:[55,59,62],Am:[45,48,52],Dm:[50,53,57],Em:[52,55,59]};
const bar=(chord,pitches,rhythm=[1,1,2])=>({chord:chords[chord],pitches,rhythm});
const answer=(phrase,cadence)=>[...phrase,...phrase.slice(0,3),cadence];
function quiet(phrase){
 return phrase.map(measure=>{
  // Retain the two strong-beat tones; passing notes need not become long holds.
  let beat=0,second=measure.pitches[0];
  measure.pitches.forEach((pitch,i)=>{if(beat<=2)second=pitch;beat+=measure.rhythm[i];});
  return {...measure,pitches:[measure.pitches[0],second],rhythm:[2,2]};
 });
}
function compose(id,title,bpm,tonic,a,aCadence,b,bCadence){
 const verse=answer(a,aCadence),chorus=answer(b,bCadence);
 const intro=quiet(a),outro=quiet([...a.slice(0,3),aCadence]);
 outro[3]={...aCadence,pitches:[tonic],rhythm:[4]};
 const form=[['Intro',intro],['Verse',verse],['Build',b],['Chorus',chorus],['Verse',verse],['Chorus',chorus],['Outro',outro]];
 const notes=[];let beat=0,measureIndex=0;
 for(const [section,measures] of form)for(let sectionBar=0;sectionBar<measures.length;sectionBar++){
  const {chord,pitches,rhythm}=measures[sectionBar];let local=0;
  pitches.forEach((pitch,i)=>{
   const duration=rhythm[i],cadence=sectionBar%4===3&&i===pitches.length-1;
   notes.push({pitch,duration,chord:[...chord],harmony:i===0?[chord[0],chord[2]]:[],section,
    energy:section==='Intro'?.46:section==='Outro'?.4:section==='Chorus'?.94:section==='Build'?.8:.67,
    accent:local===0?1:local===2?.9:.78,gate:cadence?.82:.94,
    song:id,title,bpm,songBeat:beat+local,bar:measureIndex,phraseBar:sectionBar%4,
    rapid:duration<2,...pianoIcon(pitch)});local+=duration;
  });
  if(local!==4||pitches.length!==rhythm.length)throw new Error('Each written measure must fill four beats');
  beat+=4;measureIndex++;
 }
 return {id,title,bpm,tonic,beats:beat,notes};
}

// Eighth notes connect nearby tones; longer endings give each phrase somewhere
// to breathe. Answer phrases resolve to the tonic instead of looping a bar.
export const ORIGINAL_SONGS=[
 compose('sunlit-steps','Sunlit Steps',88,60,
  [bar('C',[64,65,67]),bar('Am',[69,67,64]),
   bar('F',[65,64,60,62],[1,1,1,1]),bar('G',[62,64,67])],
  bar('C',[64,62,60]),
  [bar('F',[65,67,69,65],[1,.5,.5,2]),bar('C',[67,64,64,67],[1,.5,.5,2]),
   bar('Dm',[65,64,62,65],[1,1,1,1]),bar('G',[67,69,71])],
  bar('C',[67,64,60])),
 compose('neon-horizon','Neon Horizon',100,57,
  [bar('Am',[60,62,64,60],[1,.5,.5,2]),bar('F',[60,62,65]),
   bar('C',[64,62,60,64],[1,1,1,1]),bar('Em',[64,62,59])],
  bar('Am',[60,59,57]),
  [bar('Am',[64,65,67,69],[1,.5,.5,2]),bar('F',[69,67,65]),
   bar('Dm',[65,67,69,65],[1,.5,.5,2]),bar('Em',[67,65,64])],
  bar('Am',[64,60,57])),
 compose('ripple-road','Ripple Road',92,60,
  [bar('C',[60,62,64],[1.5,.5,2]),bar('F',[65,64,60],[1.5,.5,2]),
   bar('Dm',[62,64,65,64],[1,1,1,1]),bar('G',[62,64,67])],
  bar('C',[64,62,60]),
  [bar('C',[67,69,67,64],[.5,.5,1,2]),bar('Am',[64,65,64,60],[.5,.5,1,2]),
   bar('F',[60,62,65,69],[1,1,1,1]),bar('G',[67,65,62])],
  bar('C',[64,62,60])),
 compose('moonlight-echo','Moonlight Echo',88,57,
  [bar('Am',[64,62,60]),bar('Em',[59,60,64]),
   bar('F',[65,64,60],[1.5,.5,2]),bar('Em',[59,62,64])],
  bar('Am',[60,59,57]),
  [bar('F',[65,67,69]),bar('C',[67,65,64,62],[1,1,1,1]),
   bar('Dm',[62,64,65,69],[1,.5,.5,2]),bar('Em',[67,65,64])],
  bar('Am',[64,60,57])),
 compose('copper-strings','Copper Strings',96,62,
  [bar('Dm',[62,64,65,69],[1,.5,.5,2]),bar('F',[69,67,65]),
   bar('C',[64,65,67,64],[1,1,1,1]),bar('Am',[64,62,60])],
  bar('Dm',[65,64,62]),
  [bar('F',[69,67,65,69],[1,.5,.5,2]),bar('C',[67,69,67,64],[.5,.5,1,2]),
   bar('Dm',[65,64,62,65],[1,.5,.5,2]),bar('Am',[64,62,60])],
  bar('Dm',[65,64,62])),
 compose('homeward-sparks','Homeward Sparks',94,65,
  [bar('F',[60,62,65]),bar('C',[64,65,67]),
   bar('Dm',[65,64,62,65],[1,1,1,1]),bar('C',[64,62,60])],
  bar('F',[60,62,65]),
  [bar('F',[69,67,65,69],[.5,.5,1,2]),bar('Am',[69,67,64]),
   bar('Dm',[65,67,69,65],[1,.5,.5,2]),bar('C',[67,65,64])],
  bar('F',[69,67,65])),
 compose('rainy-window','Rainy Window',90,57,
  [bar('Am',[60,59,57],[1.5,.5,2]),bar('Dm',[57,59,62],[1.5,.5,2]),
   bar('F',[60,62,65,64],[1,1,1,1]),bar('Em',[64,62,59])],
  bar('Am',[60,59,57]),
  [bar('F',[65,64,60,65],[1,.5,.5,2]),bar('C',[64,62,60]),
   bar('Dm',[62,64,65,62],[1,.5,.5,2]),bar('Em',[59,62,64])],
  bar('Am',[64,60,57])),
 compose('golden-hour','Golden Hour',94,60,
  [bar('C',[67,65,64],[1.5,.5,2]),bar('Am',[64,62,60],[1.5,.5,2]),
   bar('F',[60,62,65,64],[1,1,1,1]),bar('G',[62,64,67])],
  bar('C',[64,62,60]),
  [bar('F',[69,67,65,69],[1,.5,.5,2]),bar('C',[67,65,64]),
   bar('Am',[64,65,67,69],[.5,.5,1,2]),bar('G',[71,69,67])],
  bar('C',[67,64,60])),
 compose('little-comet','Little Comet',98,67,
  [bar('G',[67,69,71]),bar('Em',[71,69,67]),
   bar('C',[64,65,67,69],[1,1,1,1]),bar('Dm',[69,67,65])],
  bar('G',[71,69,67]),
  [bar('C',[67,69,72,72],[1,.5,.5,2]),bar('G',[71,72,71,67],[.5,.5,1,2]),
   bar('Am',[69,67,64,69],[1,.5,.5,2]),bar('Dm',[69,67,65])],
  bar('G',[71,69,67])),
 compose('velvet-stairs','Velvet Stairs',92,62,
  [bar('Dm',[65,64,62],[1.5,.5,2]),bar('Am',[60,62,64],[1.5,.5,2]),
   bar('F',[65,67,69,67],[1,1,1,1]),bar('C',[67,65,64])],
  bar('Dm',[65,64,62]),
  [bar('Dm',[69,67,65,62],[1,.5,.5,2]),bar('F',[65,67,69]),
   bar('C',[67,69,67,64],[.5,.5,1,2]),bar('Am',[64,62,60])],
  bar('Dm',[65,64,62]))
];

export function createSongSequence(rng=Math.random){
 let songIndex=Math.floor(Math.max(0,Math.min(.9999,Number(rng())||0))*ORIGINAL_SONGS.length),index=0,round=0;
 return ()=>{
  let song=ORIGINAL_SONGS[songIndex];
  if(index===song.notes.length){index=0;songIndex=(songIndex+1)%ORIGINAL_SONGS.length;round++;song=ORIGINAL_SONGS[songIndex];}
  const n=song.notes[index++];return {...n,chord:[...n.chord],harmony:[...n.harmony],phrase:song.id+'-'+round,round};
 };
}
