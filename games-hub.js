import {bindLaunchTap} from './menu-navigation.js?v=494200';
import {activeSkin} from './shape-skin-art.js?v=494200';
export function initGamesHub({openDrop,openSlice,openPiano,sound=name=>window.gameAudio?.ui(name)}){
 const dialog=document.createElement('dialog');dialog.id='games-hub';dialog.setAttribute('aria-label','Games');document.body.append(dialog);
 const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
 function close(){dialog.close();}
 let builtSkin=null,selected=0;
 function highlight(){const cards=[...dialog.querySelectorAll('.hub-game')];cards.forEach((card,i)=>card.classList.toggle('keyboard-game',i===selected));cards[selected]?.focus({preventScroll:true});}
 dialog.addEventListener('keydown',event=>{
  if(!['KeyW','KeyS','Space','Enter','NumpadEnter'].includes(event.code)||event.ctrlKey||event.altKey||event.metaKey||event.isComposing)return;
  event.preventDefault();if(event.repeat)return;const cards=[...dialog.querySelectorAll('.hub-game')];if(!cards.length)return;
  if(['Space','Enter','NumpadEnter'].includes(event.code)){cards[selected].click();return;}selected=(selected+(event.code==='KeyS'?1:-1)+cards.length)%cards.length;highlight();
 });
 dialog.addEventListener('focusin',event=>{const cards=[...dialog.querySelectorAll('.hub-game')],index=cards.indexOf(event.target);if(index>=0){selected=index;cards.forEach((card,i)=>card.classList.toggle('keyboard-game',i===selected));}});

 function open(){
  if(dialog.open)return;
  if(builtSkin===activeSkin()){dialog.showModal();selected=0;highlight();window.gameAudio?.setScene('menu');return;}
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
   card.append(art,copy);bindLaunchTap(card,()=>{if(!dialog.open)return;sound('click');data.action();});list.append(card);
  }
  const hint=make('p','hub-keyboard-hint','W / S select · Space play · Esc back');dialog.append(back,header,list,hint);dialog.showModal();selected=0;highlight();window.gameAudio?.setScene('menu');
 }
 dialog.addEventListener('pointerdown',e=>{if(e.button===0&&!e.target.closest('button,a,input'))sound('surface-tap');});
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});return {open,close};
}
