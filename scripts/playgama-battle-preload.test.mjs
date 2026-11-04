import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareOwnedBattleFrame} from '../platforms/playgama/playgama-battle-preload.mjs';

const origin='https://game.example';
function fixture(prepare){return {contentWindow:{location:{origin},ShapeShiftBattlePreparation:{prepare}}};}
test('an owned frame prepares without postMessage and waits for the complete child barrier',async()=>{
  let finish,received,settled=false;
  const barrier=new Promise(resolve=>finish=resolve),settings={music:false,sfxVolume:32,platformPaused:true};
  const frame=fixture(value=>{received=value;return barrier;});
  const pending=prepareOwnedBattleFrame(frame,settings,origin).then(value=>{settled=true;return value;});
  await Promise.resolve();assert.equal(received,settings);assert.equal(settled,false);
  finish(true);assert.equal(await pending,true);
});
test('failed child assets or a missing runtime never count as prepared',async()=>{
  await assert.rejects(prepareOwnedBattleFrame(fixture(async()=>false),{},origin),/assets unavailable/);
  await assert.rejects(prepareOwnedBattleFrame(fixture(async()=>{throw Error('decode failed');}),{},origin),/decode failed/);
  await assert.rejects(prepareOwnedBattleFrame({contentWindow:{location:{origin}}},{},origin),/runtime unavailable/);
});
test('another origin is rejected before invoking any child method',async()=>{
  let called=false;const frame=fixture(()=>{called=true;return true;});frame.contentWindow.location.origin='https://other.example';
  await assert.rejects(prepareOwnedBattleFrame(frame,{},origin),/origin changed/);assert.equal(called,false);
});
test('a navigated frame cannot complete an older preparation',async()=>{
  let finish;const frame=fixture(()=>new Promise(resolve=>finish=resolve));
  const pending=prepareOwnedBattleFrame(frame,{},origin);frame.contentWindow={location:{origin}};finish(true);
  await assert.rejects(pending,/navigated/);
});
