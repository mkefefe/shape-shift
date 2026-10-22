import {bindLaunchTap} from './menu-navigation.js?v=49439-web5';
import {activeSkin} from './shape-skin-art.js?v=49439-web5';
export function initGamesHub({openDrop,openSlice,openPiano,sound=name=>window.gameAudio?.ui(name)}){
 const dialog=document.createElement('dialog');dialog.id='games-hub';dialog.setAttribute('aria-label','Games');document.body.append(dialog);
 const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
 function close(){dialog.close();}
 let builtSkin=null;
 function open(){
  if(dialog.open)return;
  if(builtSkin===activeSkin()){dialog.showModal();window.gameAudio?.setScene('menu');return;}
  builtSkin=activeSkin();dialog.replaceChildren();
  const header=make('header','drop-header'),back=make('button','hub-back');
  back.type='button';back.setAttribute('aria-label','Back to main menu');back.onclick=()=>{sound('click');close();};
  const backArt=make('img','');backArt.src='assets/back-v307.webp';backArt.alt='';backArt.draggable=false;backArt.setAttribute('aria-hidden','true');back.append(backArt);
  header.append(make('h2','','Games'));
  const list=make('div','hub-games');
  for(const data of [
   {name:'Shape Drop',kind:'drop',copy:'Aim, tap, and match.',action:openDrop},
   {name:'Shape Slice',kind:'slice',copy:'Slice shapes.',action:openSlice},
   {name:'Piano Flow',kind:'piano',copy:'Tap shapes. Make music.',action:openPiano}
  ]){
   const card=make('button','hub-game hub-'+data.kind);card.type='button';card.setAttribute('aria-label','Open '+data.name);
   const art=make('img','hub-cover');art.src='./assets/hub-'+data.kind+(data.kind==='piano'?'-v292.webp':'-v291.webp');art.decoding='async';art.alt='';art.width=1774;art.height=887;art.draggable=false;
   const copy=make('span','hub-copy');copy.append(make('strong','hub-title',data.name),make('span','hub-description',data.copy));
   card.append(art,copy);bindLaunchTap(card,()=>{if(!dialog.open)return;sound('click');close();data.action();});list.append(card);
  }
  dialog.append(back,header,list);dialog.showModal();window.gameAudio?.setScene('menu');
 }
 dialog.addEventListener('pointerdown',e=>{if(e.button===0&&!e.target.closest('button,a,input'))sound('surface-tap');});
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});return {open,close};
}
