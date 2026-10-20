import {pianoIcon,PIANO_PITCHES} from './piano-music.js';
// Original scores. No commercial melodies or recordings are used.
const C=[48,52,55],F=[53,57,60],G=[55,59,62],Am=[45,48,52],Dm=[50,53,57],Em=[52,55,59];
const form=[['Intro',4],['Verse',8],['Build',4],['Chorus',8],['Verse',8],['Chorus',8],['Outro',4]];
function compose(id,title,bpm,paths,themes){
 const notes=[];let beat=0;
 for(const [section,bars] of form)for(let bar=0;bar<bars;bar++){
  const chorus=section==='Chorus',soft=section==='Intro'||section==='Outro';
  const path=paths[chorus?1:0],chord=path[bar%4],motif=themes[chorus?1:0][bar%4];
  const rhythm=soft?(bar%2===0?[1,1,2]:[2,1,1]):chorus&&bar%4!==3?[.5,.5,1,1,1]:[1,1,2];
  let local=0;
  rhythm.forEach((duration,i)=>{
   let pitch=motif[i%motif.length];
   if(i===0||i===rhythm.length-1){const choices=PIANO_PITCHES.filter(n=>chord.some(c=>n%12===c%12));pitch=choices.reduce((a,b)=>Math.abs(a-pitch)<=Math.abs(b-pitch)?a:b);}
   notes.push({pitch,duration,chord:[...chord],harmony:local===0?[chord[0],chord[2]]:[],section,energy:soft?.3:chorus?1:section==='Build'?.75:.55,song:id,title,bpm,songBeat:beat+local,...pianoIcon(pitch)});local+=duration;
  });beat+=4;
 }
 return {id,title,bpm,beats:beat,notes};
}
export const ORIGINAL_SONGS=[
 compose('sunlit-steps','Sunlit Steps',88,[[C,Am,F,G],[F,G,C,Am]],[
 [[60,64,67],[64,62,60],[65,64,60],[62,67,62]],
 [[65,67,69,67,65],[67,69,71,69,67],[67,64,62,64,60],[64,62,60]]]),
 compose('neon-horizon','Neon Horizon',100,[[Am,F,C,G],[Dm,Am,F,G]],[
 [[64,60,57],[65,64,60],[64,67,64],[62,59,55]],
 [[65,69,67,65,62],[64,67,69,67,64],[65,67,69,67,65],[67,65,62]]])
];

function arrangeSong(song,rng){
 const patterns=[[1,1,2],[2,1,1],[3,1],[1,3],[4],[.5,.5,3]];
 let bag=[],last=-1;
 const notes=[];
 for(let bar=0;bar<song.beats/4;bar++){
  if(!bag.length){
   bag=patterns.map((_,i)=>i);
   for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.max(0,Math.min(.999999,Number(rng())||0))*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
   if(bag.at(-1)===last)[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];
  }
  last=bag.pop();
  const original=song.notes.filter(n=>Math.floor(n.songBeat/4)===bar);
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
