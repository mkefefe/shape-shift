import {createStoryController} from './story-controller.js';
import {showStoryScene} from './story-scene.js?v=story1';
import {loadStoryAssets,drawStoryIsland} from './story-renderer.js';

export function initStoryUI({document,storage,adventure,admin,adminBackup,settings,beforeScene,afterScene,sound=()=>{}}){
 const map=document.getElementById('adventure-map'),header=map.querySelector('.map-header');
 const button=document.createElement('button');button.id='story-map-open';button.type='button';
 button.innerHTML='<span class="story-map-label">Color Beacon <strong></strong></span><span class="story-map-next"></span><span class="story-map-action">Story</span>';
 header.append(button);
 const dialog=document.createElement('dialog');dialog.id='story-library';dialog.setAttribute('aria-labelledby','story-library-title');
 dialog.innerHTML='<button class="close" aria-label="Close story"><img src="assets/close-v45.webp" alt=""></button><div class="dialog-content"><h2 id="story-library-title">Color Beacon</h2><canvas class="story-library-art" width="400" height="400" role="img" aria-label="Your island and Color Beacon"></canvas><p class="story-library-summary"></p><p class="story-library-explanation">Match shapes to gather color. Each new Adventure level charges the beacon. At 100%, its light restores the whole island.</p><p class="story-star-note">Stars are extra challenges. Replaying a level does not add charge.</p><div class="story-library-scenes"></div><p class="story-library-next"></p></div>';
 document.body.append(dialog);
 let controller,art=null,artLoading=null;
 function paintIsland(){
  const canvas=dialog.querySelector('.story-library-art'),summary=controller.summary();canvas.setAttribute('aria-label','Your island: '+summary.percent+'% of the Color Beacon restored');
  if(art){drawStoryIsland(canvas.getContext('2d'),art,summary.percent);return;}
  if(!artLoading)artLoading=loadStoryAssets().then(assets=>{art=assets;artLoading=null;if(dialog.open)paintIsland();}).catch(()=>{artLoading=null;});
 }
 function refresh(){
  if(!controller)return;const summary=controller.summary();
  button.querySelector('strong').textContent=summary.percent+'%';
  button.querySelector('.story-map-next').textContent=summary.complete?'Your island is full of color':summary.next.title+' · Level '+summary.next.level;
  button.setAttribute('aria-label','Color Beacon '+summary.percent+' percent. '+(summary.complete?'Story complete.': 'Next chapter at level '+summary.next.level+'.')+' View story.');
  dialog.querySelector('.story-library-summary').textContent=summary.complete?'Your world is restored.':summary.percent+' / 100 levels · '+summary.percent+'% charged';
  if(dialog.open)paintIsland();
  const list=dialog.querySelector('.story-library-scenes');list.replaceChildren();
  const item=document.createElement('button');item.type='button';item.className='primary';item.textContent='Play story';
  item.onclick=async()=>{sound('click');dialog.close();await controller.replayAll();if(!dialog.open){dialog.showModal();paintIsland();}};list.append(item);
  dialog.querySelector('.story-library-next').textContent=summary.next?'Next: '+summary.next.title+' at Level '+summary.next.level:'Adventure complete. Endless and Games are still yours to enjoy.';
 }
 controller=createStoryController({storage,adventure,admin,adminBackup,showScene:options=>showStoryScene({document,...options}),settings,beforeScene,afterScene,changed:refresh});
 button.onclick=()=>{refresh();sound('click');dialog.showModal();paintIsland();};
 dialog.querySelector('.close').onclick=()=>{sound('close');dialog.close();};
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 refresh();return {...controller,refresh};
}
