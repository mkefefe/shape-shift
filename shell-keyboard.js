// Recover only when a game key is pressed on the surrounding page; never steal browser shortcuts.
const frame=document.querySelector('iframe');
for(const type of ['keydown','keyup'])document.addEventListener(type,event=>{
 if(!/^(Key[WASDFHBZ]|Space|Escape|Enter|NumpadEnter|Digit[123]|Numpad[123])$/.test(event.code)||event.ctrlKey||event.metaKey||event.altKey||event.isComposing||event.target.closest?.('input,textarea,select,[contenteditable]'))return;
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
