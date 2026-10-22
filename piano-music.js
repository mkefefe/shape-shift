// One permanent pitch per color/shape, independent of skin, run, or phrase.
export const PIANO_PITCHES=Object.freeze([48,50,52,53,55,57,59,60,62,64,65,67,69,71,72,74]);
export const pianoPitch=(shape,color)=>PIANO_PITCHES[color*4+shape];
export function pianoIcon(pitch){
 const index=PIANO_PITCHES.indexOf(pitch);
 if(index<0)throw new RangeError('Pitch is outside the shape piano');
 return {shape:index%4,color:Math.floor(index/4)};
}
const chords=[[48,52,55],[50,53,57],[52,55,59],[53,57,60],[55,59,62],[45,48,52]];
// Newly authored arrangements of traditional melodies; no recordings are used.
const twinkle=[
 [72,1],[72,1],[79,1],[79,1],[81,1],[81,1],[79,2],
 [77,1],[77,1],[76,1],[76,1],[74,1],[74,1],[72,2],
 [79,1],[79,1],[77,1],[77,1],[76,1],[76,1],[74,2],
 [79,1],[79,1],[77,1],[77,1],[76,1],[76,1],[74,2],
 [72,1],[72,1],[79,1],[79,1],[81,1],[81,1],[79,2],
 [77,1],[77,1],[76,1],[76,1],[74,1],[74,1],[72,2]
];
const brotherJohn=[
 [72,2],[74,2],[76,2],[72,2],[72,2],[74,2],[76,2],[72,2],
 [76,2],[77,2],[79,4],[76,2],[77,2],[79,4],
 [79,1],[81,1],[79,1],[77,1],[76,2],[72,2],
 [79,1],[81,1],[79,1],[77,1],[76,2],[72,2],
 [72,2],[67,2],[72,4],[72,2],[67,2],[72,4]
];
function arranged(id,title,pairs){
 pairs=pairs.map(([pitch,duration])=>[pitch-12,duration]);
 let beat=0,chord=chords[0];
 const notes=pairs.map(([pitch,duration])=>{
  // Keep the harmony for the whole measure, including its passing melody notes.
  const choices=[chords[0],chords[3],chords[4]].filter(c=>c.some(p=>p%12===pitch%12));
  if(beat%4===0)chord=choices[0]||chords[0];
  const harmony=beat%4===0?[chord[0],chord[2]]:[];
  beat+=duration;return {pitch,duration,harmony,chord:[...chord]};
 });
 return {id,title,notes};
}
export const TRADITIONAL_PHRASES=[
 arranged('twinkle','Twinkle, Twinkle, Little Star',twinkle),
 arranged('brother-john','Frère Jacques',brotherJohn)
];
// Ten harmonic paths and ten motifs give 100 complete, distinct four-bar phrases.
// Variation happens between phrases; melody notes stay inside the current harmony.
// Common pop harmony, transposed into C major / A minor. Original melodies below.
// i-iv-VI-VII (Shape of You reference); I-V-vi-IV (Love Story reference).
export const PIANO_PROGRESSIONS=[[5,1,3,4],[0,4,5,3],[5,3,0,4],[0,5,3,4],[3,0,4,5],
 [0,2,5,3],[5,4,3,0],[0,4,3,0],[1,3,0,4],[3,4,5,0]];
const progressions=PIANO_PROGRESSIONS;
// A short, singable idea is repeated, answered, then resolved. The scale positions
// give each phrase a register; nearest chord tones keep strong beats consonant.
const motifs=[[7,8,9,7],[9,8,7,9],[4,5,7,5],[7,9,8,7],[11,10,9,11],
 [12,11,9,11],[2,3,4,2],[0,1,2,4],[14,13,12,14],[15,14,12,14]];
const rhythms=[[1,1,1,1],[.5,.5,1,2],[1.5,.5,1,1],[.5,1,.5,2],[2,.5,.5,1],
 [.5,.5,1.5,1.5],[1,.5,1.5,1],[1,1.5,.5,1],[.5,1.5,1.5,.5],[1.5,1,.5,1]];
const basicPhrases=progressions.flatMap((path,p)=>motifs.map((motif,m)=>{
 const notes=path.flatMap((degree,bar)=>{
  const chord=chords[degree];let beat=0;
  return motif.slice(0,bar===3?3:4).map((position,i)=>{
   const duration=bar===3?(i===2?2:1):rhythms[m][i];
   let pitch=PIANO_PITCHES[Math.max(0,Math.min(15,position+(bar===2?-1:0)))];
   const cadence=bar===3&&i===2;
   if(beat%2===0||cadence){
    const candidates=PIANO_PITCHES.filter(n=>cadence?n%12===chord[0]%12:chord.some(c=>c%12===n%12));
    pitch=candidates.reduce((a,b)=>Math.abs(a-pitch)<=Math.abs(b-pitch)?a:b);
   }
   beat+=duration;
   return {pitch,duration,harmony:i===0?[chord[0],chord[2]]:[],chord:[...chord]};
  });
 });
 return {id:`original-${p}-${m}`,title:'Shape melody',notes};
}));
// Deterministic scores: 100 motifs/harmonic paths, each arranged at three densities.
// Sixteen measures: theme, repeat, contrasting answer, return (A-A-B-A).
export const ORIGINAL_PHRASES=Array.from({length:3},(_,tier)=>basicPhrases.map((base,arrangement)=>{
 const answer=base.notes.map((n,i)=>{
  const index=PIANO_PITCHES.indexOf(n.pitch),target=PIANO_PITCHES[Math.min(15,index+(i%4<2?2:-1))]??n.pitch;
  const candidates=PIANO_PITCHES.filter(p=>n.chord.some(c=>c%12===p%12));
  const pitch=candidates.reduce((a,b)=>Math.abs(a-target)<=Math.abs(b-target)?a:b);
  return {...n,pitch};
 });
 const source=[...base.notes,...base.notes,...answer,...base.notes];
 let beat=0;
 const notes=source.flatMap(n=>{
  const start=beat;beat+=n.duration;
  // Preserve sustained cadences; ornament short notes with neighboring scale tones.
  const split=tier>0&&n.duration>=1&&n.duration<2&&(tier===2||start>=32&&start<48);
  if(!split)return [{...n,harmony:[...n.harmony],chord:[...n.chord]}];
  const index=PIANO_PITCHES.indexOf(n.pitch),neighbor=PIANO_PITCHES[index===15?14:index+1];
  return [{...n,duration:n.duration/2},{...n,pitch:neighbor,duration:n.duration/2,harmony:[]}];
 });
 // Alternate a short cadence, a whole-bar sustain, and a tied long cadence.
 // Entire measures are retained so backing chords and the next song stay aligned.
 const sustain=arrangement%3;
 if(sustain===1){
  let from=notes.length,remaining=4;
  while(remaining>0){from--;remaining-=notes[from].duration;}
  const last=notes.at(-1);
  notes.splice(from,notes.length-from,{...last,duration:4,harmony:[last.chord[0],last.chord[2]]});
 }else if(sustain===2)notes.at(-1).duration+=4;
 return {id:`${base.id}-tier-${tier}`,title:'Shape melody',tier,notes};
})).flat();
export const pianoDifficulty=seconds=>seconds<75?0:seconds<180?1:2;
export function createPianoSequence(rng=Math.random,{difficulty=null}={}){
 let phrase=null,index=0,bag=[],previous=null,currentTier=null;
 function nextPhrase(){
  const tier=difficulty?difficulty():null;
  if(!bag.length||tier!==currentTier){
   currentTier=tier;
   bag=tier===null?[...ORIGINAL_PHRASES,...TRADITIONAL_PHRASES]:ORIGINAL_PHRASES.filter(p=>p.tier===tier);
   for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.max(0,Math.min(.999999,Number(rng())||0))*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
   if(bag.at(-1).id===previous)[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];
  }
  const next=bag.pop();previous=next.id;return next;
 }
 return ()=>{
  if(!phrase||index===phrase.notes.length){phrase=nextPhrase();index=0;}
  const note=phrase.notes[index++];return {...note,harmony:[...note.harmony],chord:[...note.chord],...pianoIcon(note.pitch),phrase:phrase.id};
 };
}
