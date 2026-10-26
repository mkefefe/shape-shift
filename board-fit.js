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
  board.style.setProperty('--tile-art',Math.min(100,Math.floor(size*.72))+'px');
  // The tinted surface hugs the grid, not the full flexible layout slot.
  // Reserve the same border on every side, including sparse Adventure layouts.
  const gap=parseFloat(style.gap)||0,pad=14;
  const gridWidth=size*columns+gap*(columns-1),gridHeight=size*rows+gap*(rows-1);
  const surfaceX=Math.max(0,(board.clientWidth-gridWidth)/2-pad);
  const surfaceY=Math.max(0,(board.clientHeight-gridHeight)/2-pad);
  board.style.setProperty('--surface-x',surfaceX+'px');
  board.style.setProperty('--surface-y',surfaceY+'px');

  // Cut the tint out beneath occupied cards so translucent card art stays unchanged.
  const bounds=board.getBoundingClientRect();
  const holes=Array.from(board.children).filter(e=>e.matches('.choice:not(.collected),.board-rock')&&e.style.display!=='none').map(e=>{
   const radius=parseFloat(getComputedStyle(e).borderTopLeftRadius)||18;
   // Layout bounds exclude temporary reveal/landing transforms.
   const r={left:bounds.left+e.offsetLeft,top:bounds.top+e.offsetTop,width:e.offsetWidth,height:e.offsetHeight};
   return `<rect x="${r.left-bounds.left}" y="${r.top-bounds.top}" width="${r.width}" height="${r.height}" rx="${radius}" fill="black"/>`;
  }).join('');
  const mask=`<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}"><defs><mask id="holes"><rect width="100%" height="100%" fill="white"/>${holes}</mask></defs><rect width="100%" height="100%" fill="white" mask="url(#holes)"/></svg>`;
  board.style.setProperty('--board-tint-mask',`url("data:image/svg+xml,${encodeURIComponent(mask)}")`);
}
export function observeBoard(board){
 const fit=()=>fitBoard(board);
 new ResizeObserver(fit).observe(board);
 new MutationObserver(fit).observe(board,{childList:true,attributes:true,attributeFilter:['data-count','data-columns','data-layout']});
 fit();
}
