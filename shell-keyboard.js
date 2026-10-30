import {keyboardHelpFor} from './keyboard-help.js?v=494198';

// Recover only when a game key is pressed on the surrounding page; never steal browser shortcuts.
const frame=document.querySelector('iframe');
for(const type of ['keydown','keyup'])document.addEventListener(type,event=>{
 if(!/^(Key[WASDFHB]|Space|Escape|Enter|NumpadEnter|Digit[123]|Numpad[123])$/.test(event.code)||event.ctrlKey||event.metaKey||event.altKey||event.isComposing||event.target.closest?.('input,textarea,select,[contenteditable]'))return;
 if(event.target.closest?.('#keyboard-help,#keyboard-help-toggle')&&['Space','Enter','NumpadEnter'].includes(event.code))return;
 const doc=frame.contentDocument;if(!doc||!doc.getElementById('startup-ready')?.hidden)return;
 event.preventDefault();frame.contentWindow.focus();
 (doc.activeElement||doc.body).dispatchEvent(new KeyboardEvent(type,{key:event.key,code:event.code,repeat:event.repeat,shiftKey:event.shiftKey,bubbles:true,cancelable:true}));
});

// Two-finger trackpad gestures over the surrounding page reach the active menu.
document.addEventListener('wheel',event=>{
 if(event.ctrlKey||event.metaKey||!event.deltaY||!frame?.contentWindow)return;
 const doc=frame.contentDocument;if(!doc?.getElementById('startup-ready')?.hidden)return;
 const delta=event.deltaY*(event.deltaMode===1?20:event.deltaMode===2?frame.clientHeight:1);
 frame.contentWindow.dispatchEvent(new frame.contentWindow.CustomEvent('shape-shift-scroll',{detail:delta}));
 event.preventDefault();
},{passive:false});

// Keep optional desktop help beside the portrait game, never over its board.
const guide=document.createElement('aside');guide.id='keyboard-help';guide.hidden=true;guide.setAttribute('aria-label','Keyboard controls');
const heading=document.createElement('h2');heading.textContent='Keyboard';
const hide=document.createElement('button');hide.type='button';hide.textContent='Hide';hide.setAttribute('aria-label','Hide keyboard controls');
const context=document.createElement('p');context.className='keyboard-help-context';
const rows=document.createElement('dl');
const toggle=document.createElement('button');toggle.type='button';toggle.id='keyboard-help-toggle';toggle.textContent='Keyboard controls';toggle.hidden=true;toggle.setAttribute('aria-controls',guide.id);toggle.setAttribute('aria-expanded','false');
guide.append(heading,hide,context,rows);document.body.append(guide,toggle);
let dismissed=false,guideReady=false,lastHelp='',observer,paint=0;
try{dismissed=sessionStorage.getItem('shape-shift-keyboard-help')==='hidden';}catch{}
function showGuide(){guide.hidden=!guideReady||dismissed;toggle.hidden=!guideReady||!dismissed;toggle.setAttribute('aria-expanded',String(!guide.hidden));}
hide.onclick=()=>{dismissed=true;try{sessionStorage.setItem('shape-shift-keyboard-help','hidden');}catch{}showGuide();toggle.focus();};
toggle.onclick=()=>{dismissed=false;try{sessionStorage.removeItem('shape-shift-keyboard-help');}catch{}showGuide();hide.focus();};
function updateGuide(){
 paint=0;const doc=frame.contentDocument,app=doc?.getElementById('app');
 const dialog=doc?.activeElement?.closest('dialog[open]')||[...(doc?.querySelectorAll('dialog[open]')||[])].at(-1);
 const help=keyboardHelpFor({screen:app?.dataset.screen,dialog:dialog?.id,paused:dialog?.dataset.paused==='true',loading:!doc?.getElementById('startup-ready')?.hidden||doc.documentElement.classList.contains('startup-loading')||app?.dataset.storyActive==='true'});
 guideReady=!!help;showGuide();if(!help)return;
 const i18n=frame.contentWindow.ShapeShiftI18n,t=text=>i18n?.translate(text)||text;
 heading.textContent=t('Keyboard');hide.textContent=t('Hide');hide.setAttribute('aria-label',t('Hide keyboard controls'));guide.setAttribute('aria-label',t('Keyboard controls'));toggle.textContent=t('Keyboard controls');
 document.documentElement.lang=doc.documentElement.lang;
 const key=JSON.stringify([help,i18n?.currentLanguage()]);if(key===lastHelp)return;lastHelp=key;context.textContent=t(help.title);rows.replaceChildren();
 for(const [keys,action] of help.rows){const term=document.createElement('dt'),keycap=document.createElement('kbd'),description=document.createElement('dd');keycap.textContent=t(keys);term.append(keycap);description.textContent=t(action);rows.append(term,description);}
}
function observeGame(){
 observer?.disconnect();const doc=frame.contentDocument;if(!doc?.documentElement)return;
 observer=new MutationObserver(records=>{if(!paint&&records.some(record=>record.type==='attributes'||record.target===doc.body))paint=requestAnimationFrame(updateGuide);});
 observer.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-language','data-screen','data-paused','data-story-active','open','hidden','class']});updateGuide();
}
frame.addEventListener('load',observeGame);if(frame.contentDocument?.readyState!=='loading')observeGame();
