// Game artwork and labels are controls, not selectable webpage content.
export function isTextEntry(target){
 const element=target?.nodeType===3?target.parentElement:target;
 if(element?.isContentEditable)return true;
 const field=element?.closest?.('input,textarea');
 return !!field&&(field.tagName==='TEXTAREA'||['text','search','url','tel','email','password','number'].includes(field.type));
}
export function initTouchUI(document){
 const suppressBrowserAction=event=>{if(!isTextEntry(event.target))event.preventDefault();};
 // These events do not consume pointer/touch input, so holds, sliders and scrolling work normally.
 for(const type of ['contextmenu','selectstart','dragstart'])document.addEventListener(type,suppressBrowserAction,{capture:true});
}
