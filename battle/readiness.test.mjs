import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {battleArtSources,prepareBattleArt} from './readiness.mjs';
import {STARTUP_ASSETS} from '../startup-assets.js';
const base='https://example.test/game/battle/';
const styles=fs.readFileSync(new URL('./style.css',import.meta.url),'utf8');
const document={baseURI:base,images:[{src:base+'../assets/pause-v30.webp'}],styleSheets:[{href:base+'style.css',cssRules:[{cssText:styles}]}]};
test('Battle readiness includes every CSS image, external icons and late dialog art',()=>{
 const urls=battleArtSources(document);assert.equal(new Set(urls).size,urls.length);
 for(const path of ['assets/drop-garden-v491.webp','assets/shapes-v2.webp','assets/action-v45.webp','../assets/close-v45.webp','../assets/slice-bomb-v239.webp','../assets/delivery-v144/browser-shield-hd1.webp','../assets/delivery-v144/menu-panel-v240.webp'])assert(urls.includes(new URL(path,base).href),path);
 assert(!urls.some(src=>src.endsWith('.ttf')),'fonts use their own decoder');
 // CI runs these contracts before the base archive is restored into _site.
 // Shared archived art must be in the build-verified startup inventory; Battle
 // owns its checked-in files directly. Never depend on a previous local build.
 for(const url of urls){const file=new URL(url).pathname.replace(/^\/game\//,'');assert(STARTUP_ASSETS.includes(file)||fs.existsSync(new URL('../'+file,import.meta.url)),file);}
});
test('Battle waits for all images, skins and font decoding without starting gameplay',async()=>{
 let release;const pending=new Promise(resolve=>release=resolve),images=[],skins=[];let done=false;
 const doc={...document,fonts:{load:async name=>{assert.equal(name,'20px Nunito');await pending;return [{}];}}};
 const warming=prepareBattleArt(doc,{prepareImage:async url=>{images.push(url);return {};},prepareSkin:async id=>{skins.push(id);return true;},skins:[{id:'classic'},{id:'candy'}],awaitReady:promise=>promise}).then(ok=>{done=true;return ok;});
 await Promise.resolve();assert.equal(done,false);release();assert.equal(await warming,true);assert.deepEqual(skins,['classic','candy']);assert.equal(images.length,battleArtSources(doc).length);
});
test('failed Battle image or skin readiness reports failure for a retry',async()=>{
 for(const failure of ['image','skin']){
  const result=await prepareBattleArt(document,{prepareImage:async()=>{if(failure==='image')throw Error('missing');return {};},prepareSkin:async()=>failure!=='skin',skins:[{id:'classic'}],awaitReady:promise=>promise});assert.equal(result,false);
 }
});
