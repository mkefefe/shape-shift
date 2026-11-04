// Export the actual runtime notes and accompaniment, not a separate audition score.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ORIGINAL_SONGS} from '../../piano-songs.js';
import {pianoBackingPlan} from '../../piano-backing.js';
const target=process.argv[2]||fileURLToPath(new URL('./piano-catalog240.json',import.meta.url));
fs.mkdirSync(path.dirname(target),{recursive:true});
const catalog={version:'240',arrangement:'Two-bar verse/chorus hook stated three times before its two-bar answer; two statements of intro and bridge figures.',songs:ORIGINAL_SONGS.map(song=>({...song,backing:song.notes.flatMap(pianoBackingPlan)}))};
fs.writeFileSync(target,JSON.stringify(catalog,null,2)+'\n');
console.log(`Exported ${catalog.songs.length} runtime Piano arrangements to ${target}`);
