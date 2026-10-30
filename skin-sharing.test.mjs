import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const read=n=>fs.readFileSync(new URL(n,import.meta.url),'utf8');
test('every mode shares the exact skin module URL so equipment state is not duplicated',()=>{
 const urls=['game.js','shape-drop.js','piano-flow.js','mini-shape-art.js','games-hub.js'].map(n=>read(n).match(/from ['"]([^'"]*shape-skin-art\.js[^'"]*)['"]/)[1]);assert.equal(new Set(urls).size,1);
});
test('equipped atlas and crop change together, with Classic remaining available',async()=>{
 const code=read('shape-skin-art.js').replace(/^import .*;$/gm,'').replace(/export /g,'').replaceAll('import.meta.url',JSON.stringify('https://game.test/shape-skin-art.js'));const context={Map,Promise,URL,SHAPE_SKINS:[{id:'classic',art:'assets/classic.webp'},{id:'candy',art:'assets/candy.webp'}],ARTWORK_CROPS:{classic:[{x:0,y:0,w:20,h:20}],candy:[{x:5,y:6,w:30,h:30}]},prepareMenuImage:async src=>({src})};vm.createContext(context);vm.runInContext(code,context);
 await context.ensureSkinArt('classic');context.setActiveSkin('candy');await context.ensureSkinArt('candy');assert.equal(context.activeSkin(),'candy');assert.equal(context.skinCrop({shape:0,color:0}).art.src,'https://game.test/assets/candy.webp');context.setActiveSkin('classic');assert.equal(context.skinCrop({shape:0,color:0}).art.src,'https://game.test/assets/classic.webp');
});
