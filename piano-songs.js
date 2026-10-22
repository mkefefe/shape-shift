import {pianoIcon,PIANO_PITCHES} from './piano-music.js?v=49439-web3';
// Original, fixed scores: random selection changes the starting tune, never its notes.
const C=[48,52,55],F=[53,57,60],G=[55,59,62],Am=[45,48,52],Dm=[50,53,57],Em=[52,55,59];
const form=[['Intro',4],['Verse',8],['Build',4],['Chorus',8],['Verse',8],['Chorus',8],['Outro',4]];
const scale=[0,2,4,5,7,9,11];
function higher(pitch){const octave=Math.floor(pitch/12),index=scale.indexOf(pitch%12)+2;return (octave+Math.floor(index/7))*12+scale[index%7];}
function compose(id,title,bpm,a,b){
 const notes=[];let beat=0;
 for(const [section,bars] of form)for(let bar=0;bar<bars;bar++){
  // Repeat each motif four times before changing it. A -> higher A -> B -> A.
  const raised=(section==='Verse'||section==='Chorus')&&bar<4;
  const motif=section==='Build'||section==='Chorus'?b:a;
  const chord=raised?motif.chord.map(higher):motif.chord;
  let local=0;
  motif.pitches.forEach((original,i)=>{
   const pitch=raised?higher(original):original,duration=motif.rhythm[i];
   notes.push({pitch,duration,chord:[...chord],harmony:i===0?[chord[0],chord[2]]:[],section,
    energy:section==='Intro'||section==='Outro'?.5:section==='Chorus'?1:.75,
    song:id,title,bpm,songBeat:beat+local,rapid:duration<2,...pianoIcon(pitch)});local+=duration;
  });
  if(local!==4)throw new Error('Each motif must fill one measure');beat+=4;
 }
 return {id,title,bpm,beats:beat,notes};
}
const motif=(chord,pitches,rhythm)=>({chord,pitches,rhythm});
export const ORIGINAL_SONGS=[
 compose('sunlit-steps','Sunlit Steps',88,
  motif(C,[60,62,64,67],[1,1,1,1]),motif(G,[62,67,62,67,67,62],[.5,.5,.5,.5,1,1])),
 compose('neon-horizon','Neon Horizon',100,
  motif(Am,[57,60,64,60,57],[.5,.5,1,1,1]),motif(Dm,[62,65,69,69,65,62],[.5,.5,.5,.5,1,1])),
 compose('ripple-road','Ripple Road',92,
  motif(C,[60,64,60,64,64,60],[.5,.5,.5,.5,1,1]),motif(F,[60,65,69,65],[1,1,1,1])),
 compose('moonlight-echo','Moonlight Echo',88,
  motif(Em,[59,64,67],[1,1,2]),motif(Am,[60,60,64,60,57],[.5,.5,1,1,1])),
 compose('copper-strings','Copper Strings',96,
  motif(Dm,[62,65,65,62,62,65],[.5,.5,.5,.5,1,1]),motif(Am,[57,60,64],[1,1,2])),
 compose('homeward-sparks','Homeward Sparks',94,
  motif(F,[60,65,69,69],[1,1,1,1]),motif(C,[64,60,64,60,60,60,64],[.5,.5,.5,.5,.5,.5,1])),
 compose('rainy-window','Rainy Window',90,
  motif(Am,[64,60,57,60],[1.5,.5,1,1]),motif(Em,[59,64,67,64,59],[.5,.5,1,1,1])),
 compose('golden-hour','Golden Hour',94,
  motif(C,[67,64,60],[1,1,2]),motif(F,[65,65,69,65,60,65],[.5,.5,.5,.5,1,1])),
 compose('little-comet','Little Comet',98,
  motif(G,[62,67,69,67,62,62],[.5,.5,.5,.5,1,1]),motif(C,[60,64,67,64],[1,1,1,1])),
 compose('velvet-stairs','Velvet Stairs',92,
  motif(Dm,[65,62,65,69,65],[1,.5,.5,1,1]),motif(Am,[57,60,57,60,64,60],[.5,.5,.5,.5,1,1]))
];

function arrangeSong(song,rng){
 const patterns=[[1,1,2],[2,1,1],[3,1],[1,3],[4],[.5,.5,3]];
 let bag=[],last=-1;const motifPatterns=new Map();
 const notes=[];
 for(let bar=0;bar<song.beats/4;bar++){
  const original=song.notes.filter(n=>Math.floor(n.songBeat/4)===bar);
  const signature=original.map(n=>[n.pitch-original[0].pitch,n.duration].join(":")).join(",");
  if(!motifPatterns.has(signature)){
  if(!bag.length){
   bag=patterns.map((_,i)=>i);
   for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.max(0,Math.min(.999999,Number(rng())||0))*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
   if(bag.at(-1)===last)[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];
  }
  last=bag.pop();motifPatterns.set(signature,last);
  }
  last=motifPatterns.get(signature);
  let offset=0;
  patterns[last].forEach((duration,i)=>{
   const n=original[Math.min(i,original.length-1)];
   notes.push({...n,duration,songBeat:bar*4+offset,chord:[...n.chord],harmony:i===0?[n.chord[0],n.chord[2]]:[]});
   offset+=duration;
  });
 }
 return {...song,notes};
}

export function createSongSequence(rng=Math.random){
 let songIndex=Math.floor(Math.max(0,Math.min(.9999,rng()))*ORIGINAL_SONGS.length),index=0,round=0;let arranged=arrangeSong(ORIGINAL_SONGS[songIndex],rng);
 return ()=>{if(index===arranged.notes.length){index=0;songIndex=(songIndex+1)%ORIGINAL_SONGS.length;round++;arranged=arrangeSong(ORIGINAL_SONGS[songIndex],rng);}
 const song=arranged,n=song.notes[index++];return {...n,chord:[...n.chord],harmony:[...n.harmony],phrase:song.id+'-'+round,round,bpm:Math.min(132,song.bpm+Math.floor(round/2)*8)};};
}
