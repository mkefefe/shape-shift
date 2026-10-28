// Fit the same square tracks to both dimensions, including Adventure's empty cells.
export function squareTrack(width,height,columns,rows,gap=6){
 return Math.max(1,Math.floor(Math.min(210,(width-gap*(columns-1))/columns,(height-gap*(rows-1))/rows)));
}
export function fitBoard(board){
  if(board.classList.contains('rewind-active')||!board.clientWidth||!board.clientHeight)return;
  const style=getComputedStyle(board),columns=Number(board.dataset.columns)||1;
  const rows=Math.max(Math.ceil(Number(board.dataset.count||1)/columns),...Array.from(board.children).filter(e=>e.style.display!=='none').map(e=>Number(e.style.gridRow)||1));
  const width=board.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
  const height=board.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
  const size=squareTrack(width,height,columns,rows,parseFloat(style.gap)||0);
  board.style.setProperty('--track',size+'px');board.style.setProperty('--cols',columns);board.style.setProperty('--rows',rows);
  board.style.setProperty('grid-template-columns',`repeat(${columns}, ${size}px)`,'important');
  board.style.setProperty('grid-template-rows',`repeat(${rows}, ${size}px)`,'important');
  board.style.setProperty('--tile-art',Math.min(100,Math.floor(size*.72))+'px');

}
export function observeBoard(board){
 const fit=()=>fitBoard(board);
 new ResizeObserver(fit).observe(board);
 new MutationObserver(fit).observe(board,{childList:true,attributes:true,attributeFilter:['data-count','data-columns','data-layout','class']});
 fit();
}
