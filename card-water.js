import {createWaterSurface} from './water-surface.js?v=494201';

// Coordinates refer to each 512 x 1024 card painting, not the displayed card.
// Masks stay inside water: crests, clocks, bridges, flowers and banks stay still.
export const CARD_WATER={
 endless:{column:0,width:512,height:1024,falls:[
  [105,133,109,184,12,14],[103,198,111,317,20,24],[135,205,145,323,15,18],
  [216,250,219,304,14,18],[410,283,409,367,20,24],[135,375,140,428,19,23],
  [248,444,245,527,22,27],[343,445,347,527,23,28],[69,525,67,549,22,26],
  [438,580,437,651,18,22],[240,785,243,833,24,28],[380,791,384,834,19,24]
 ],pools:[[[218,552],[332,550],[350,564],[388,571],[374,591],[240,589],[190,574]],
 [[214,848],[367,848],[380,865],[346,890],[268,900],[221,884]],
 [[157,955],[238,958],[253,979],[332,983],[361,1008],[352,1023],[202,1023],[185,999]]]},
 adventure:{column:1,width:512,height:1024,falls:[
  [466,494,465,561,22,29],[437,664,438,724,19,25],
  [66,665,70,720,19,23],[461,336,460,364,10,12]
 ],pools:[[[414,582],[477,580],[493,591],[498,610],[455,626],[424,615]],
 [[8,221],[178,220],[166,234],[50,246],[14,239]]]},
 rush:{column:2,width:512,height:1024,falls:[
  [252,211,255,267,19,22],[340,268,340,310,15,18],
  [171,329,169,421,24,29],[390,448,392,485,18,22],
  [264,889,267,980,39,45],[306,889,308,966,17,21]
 ],pools:[[[9,355],[52,349],[63,361],[51,383],[17,391],[4,382]],
 [[131,440],[191,439],[212,450],[200,468],[160,480],[134,468]],
 [[418,502],[492,496],[509,510],[505,531],[454,535],[429,520]]]}
};


// Moving foam stays inset from the painted banks; no landscape pixels shift.
export function paintCardFalls(ctx,scene,time){
 for(const [index,[x0,y0,x1,y1,w0,w1]] of scene.falls.entries()){
  const h=y1-y0;ctx.save();ctx.beginPath();
  ctx.moveTo(x0-w0/2+3,y0+3);ctx.lineTo(x0+w0/2-3,y0+3);
  ctx.lineTo(x1+w1/2-3,y1-3);ctx.lineTo(x1-w1/2+3,y1-3);ctx.closePath();ctx.clip();
  for(let i=0;i<3;i++){
   const phase=(time*.0008+i/3+index*.173)%1,length=Math.min(32,h*.38),y=y0+phase*(h+length)-length;
   const p=Math.max(0,Math.min(1,(y-y0)/h)),x=x0+(x1-x0)*p+(i-1)*Math.min(w0,w1)*.18;
   const fade=Math.sin(phase*Math.PI),fill=ctx.createLinearGradient(0,y,0,y+length);
   fill.addColorStop(0,'rgba(235,255,255,0)');fill.addColorStop(.45,`rgba(242,255,255,${.55*fade})`);fill.addColorStop(1,'rgba(235,255,255,0)');
   ctx.strokeStyle=fill;ctx.lineWidth=Math.max(1.8,Math.min(w0,w1)*.13);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(x1-x0)*length/h,y+length);ctx.stroke();
  }ctx.restore();
 }
}

export function createCardWater(atlas,home){
 const layers=new Map();
 for(const [mode,scene] of Object.entries(CARD_WATER)){
  const source=document.createElement('canvas');source.width=512;source.height=1024;
  source.getContext('2d').drawImage(atlas,scene.column*512,0,512,1024,0,0,512,1024);
  layers.set(mode,{surface:createWaterSurface(source,'garden',scene),canvas:null});
 }
 return {
  hide(){for(const {canvas} of layers.values())if(canvas)canvas.hidden=true;},
  paint(time){
   for(const [mode,layer] of layers){
    const card=home.querySelector('.mode-'+mode);if(!card)continue;
    if(!layer.canvas){layer.canvas=document.createElement('canvas');layer.canvas.className='card-water';layer.canvas.setAttribute('aria-hidden','true');card.prepend(layer.canvas);}
    const canvas=layer.canvas;canvas.hidden=Math.abs(Number(card.dataset.position))>1;
    if(canvas.hidden)continue;
    const w=card.clientWidth,h=card.clientHeight,dpr=Math.min(devicePixelRatio||1,2),scale=w/512;
    if(!w||!h)continue;
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const {surface}=layer,water=surface.paint(time*1.25);ctx.drawImage(water,surface.left*scale,(h-1024*scale)/2+surface.top*scale,water.width*scale,water.height*scale);
    ctx.save();ctx.translate(0,(h-1024*scale)/2);ctx.scale(scale,scale);paintCardFalls(ctx,CARD_WATER[mode],time);ctx.restore();
   }
  }
 };
}
