import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {dropLandingY,makeDropBody,dropSpawnY} from './shape-drop-engine.js';
const context={console};vm.runInNewContext(fs.readFileSync(new URL('./assets/vendor/matter-0.20.0.min.js',import.meta.url),'utf8'),context);const M=context.Matter;
test('guide stops at first contact, not gaps underneath the pile',()=>{
 const tile={shape:0,r:21,color:0},top=makeDropBody(M,160,240,{shape:1,r:45,color:1}),bottom=makeDropBody(M,160,450,{shape:2,r:35,color:2});
 const y=dropLandingY(M,tile,160,[bottom,top]);assert(y<240&&y>150);
 const probe=makeDropBody(M,160,y-.05,tile);assert.equal(M.Query.collides(probe,[top]).length,0);M.Body.translate(probe,{x:0,y:.1});assert.equal(M.Query.collides(probe,[top]).length,1);
});
test('off-path shapes do not shorten the guide and empty boards end at floor contact',()=>{
 const tile={shape:2,r:21,color:0},side=makeDropBody(M,40,200,{shape:2,r:25,color:1});
 const y=dropLandingY(M,tile,160,[side]);const probe=makeDropBody(M,160,y,tile);assert(Math.abs(probe.bounds.max.y-520)<.001);
});
test('rotated and concave shapes stop at real contact without mutating the pile',()=>{
 for(const shape of [0,1,2,3])for(const angle of [0,.6,1.2]){
 const tile={shape,r:28,color:0,angle},other=makeDropBody(M,155,300,{shape:3,r:50,color:1,angle:.4});const before=JSON.stringify(other.vertices.map(v=>[v.x,v.y]));
 const y=dropLandingY(M,tile,160,[other]),probe=makeDropBody(M,160,y-.05,tile);assert(y>dropSpawnY(tile)&&y<300);assert.equal((probe.parts.length>1?probe.parts.slice(1):[probe]).filter(part=>M.Query.collides(part,[other]).length).length,0);M.Body.translate(probe,{x:0,y:.1});assert((probe.parts.length>1?probe.parts.slice(1):[probe]).some(part=>M.Query.collides(part,[other]).length));assert.equal(JSON.stringify(other.vertices.map(v=>[v.x,v.y])),before);
 }
});
