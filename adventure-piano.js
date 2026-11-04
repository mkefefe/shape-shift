import {ORIGINAL_SONGS} from './piano-songs.js?v=494241';

// Each island owns a written phrase. Retrying never chooses another song,
// changes lanes, or shuffles the harmony. The verse states its two-bar hook
// three times, answers it, and resolves into the song's sustained tonic.
const STAGES=Object.freeze({
  15:'cloud-carousel',30:'homeward-sparks',45:'sunlit-steps',
  60:'copper-strings',75:'neon-horizon',90:'clockwork-garden'
});

export function adventurePianoSpec(level){
  if(!Object.hasOwn(STAGES,level))return null;
  const song=ORIGINAL_SONGS.find(song=>song.id===STAGES[level]);
  const noteCount=song.notes.filter(note=>note.section==='Verse').length+1;
  return {target:noteCount-2,noteCount,title:song.title};
}

export function adventurePianoStage(challenge){
  if(challenge?.mode!=='piano'||!Object.hasOwn(STAGES,challenge.level))return null;
  const song=ORIGINAL_SONGS.find(song=>song.id===STAGES[challenge.level]);
  const verse=song.notes.filter(note=>note.section==='Verse'),origin=verse[0].songBeat;
  const notes=[...verse.map(note=>({...note,songBeat:note.songBeat-origin,bar:note.bar-verse[0].bar})),
    {...song.notes.at(-1),songBeat:32,bar:8,phraseBar:0,motifBar:0}]
    .map(note=>({...note,chord:[...note.chord],harmony:[...note.harmony],round:0,phrase:'adventure-piano-'+challenge.level}));
  return {level:challenge.level,id:song.id,title:song.title,bpm:song.bpm,beats:36,notes,target:notes.length-2};
}
