import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Battle and Piano UI retain valid UTF-8 punctuation and symbols',async()=>{
 const decoder=new TextDecoder('utf-8',{fatal:true});
 // Exact encoding damage signatures, not ordinary accented or non-English text.
 const damaged=/\u00e2\u20ac[\u00a6\u201d\u2122]|\u00c2\u00b7|\u00c3\u2014|\u00e2\u0153\u201c|\ufffd/;
 for(const name of ['battle/app.mjs','piano-flow.js']){
  const source=decoder.decode(await readFile(new URL(name,import.meta.url)));
  assert(!damaged.test(source),`${name} contains damaged display text`);
 }
});
