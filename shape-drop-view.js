import {DROP_HEADROOM} from './shape-drop-engine.js?v=49439-web5';
// The frame's inner rails map to x=0/320; its floor follows the playfield height.
// Preserve illustrated caps/corners at a uniform scale; only plain rail sections stretch.
const FRAME_SCALE=.3,FRAME_LEFT=107,FRAME_RIGHT=917,FRAME_FLOOR=1368,FRAME_TIP=95;
export function dropFramePatches(worldHeight=520){
 const sx=[0,200,824,1024],sy=[0,240,1240,1536];
 const dx=[-FRAME_LEFT*FRAME_SCALE,(200-FRAME_LEFT)*FRAME_SCALE,320+(824-FRAME_RIGHT)*FRAME_SCALE,320+(1024-FRAME_RIGHT)*FRAME_SCALE];
 const dy=[68-FRAME_TIP*FRAME_SCALE,68+(240-FRAME_TIP)*FRAME_SCALE,worldHeight+(1240-FRAME_FLOOR)*FRAME_SCALE,worldHeight+(1536-FRAME_FLOOR)*FRAME_SCALE];
 const patches=[];for(let row=0;row<3;row++)for(let col=0;col<3;col++){if(col===1&&row<2)continue;patches.push({sx:sx[col],sy:sy[row],sw:sx[col+1]-sx[col],sh:sy[row+1]-sy[row],x:dx[col],y:dy[row],width:dx[col+1]-dx[col],height:dy[row+1]-dy[row]});}return patches;
}
// A single coordinate transform keeps drawing and touch aiming aligned at every size,
// including the illustrated rim and room above the opening for a full-size held piece.
export function dropLayout(width,height,runHeight){
 const headroom=DROP_HEADROOM,footroom=(1536-FRAME_FLOOR)*FRAME_SCALE;
 const minimumHeight=520;
 // Use spare portrait height for the container, not blank sky above it.
 // Once a run starts, preserve its physics height across viewport changes.
 const fittingScale=Math.max(.01,Math.min((width-20)/384.2,(height-20)/(minimumHeight+headroom+footroom)));
 const worldHeight=runHeight??Math.max(minimumHeight,Math.min(1200,(height-20)/fittingScale-headroom-footroom));
 const scale=Math.max(.01,Math.min((width-20)/384.2,(height-20)/(worldHeight+headroom+footroom)));
 return {scale,x:(width-320*scale)/2,y:10+headroom*scale,worldHeight};
}
// Match the unrotated collision silhouettes. The artwork keeps its native aspect ratio.
export function dropShapeBox(shape,r){
 if(shape===0)return {width:r*2,height:r*2,y:0};
 if(shape===2)return {width:r*1.65,height:r*1.65,y:0};
 const outer=r*1.23;
 if(shape===1)return {width:outer*1.732,height:outer*1.5,y:-outer*.25};
 return {width:outer*Math.sin(Math.PI*2/5)*2,height:outer*(1+Math.cos(Math.PI/5)),y:outer*(Math.cos(Math.PI/5)-1)/2};
}
export function fitDropArtwork(shape,r,aspect=1){const box=dropShapeBox(shape,r),width=Math.min(box.width,box.height*Math.max(.01,aspect));return {...box,width,height:width/Math.max(.01,aspect)};}
