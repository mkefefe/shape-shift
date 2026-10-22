// Small cached light textures keep soft hold trails inexpensive on mobile.
const textures=new Map();
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function lightTexture(color){
 if(textures.has(color))return textures.get(color);
 const art=document.createElement('canvas');art.width=192;art.height=768;
 const ctx=art.getContext('2d'),pixels=ctx.createImageData(192,768);
 const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
 for(let y=0;y<768;y++)for(let x=0;x<192;x++){
  const side=(x-95.5)/96,core=Math.exp(-side*side/0.018),halo=Math.exp(-side*side/0.22);
  const endFade=smooth(y/126)*smooth((767-y)/45),a=Math.min(1,core*.88+halo*.3)*endFade;
  const offset=(y*192+x)*4,white=core*.72;
  for(let c=0;c<3;c++)pixels.data[offset+c]=Math.round(rgb[c]+(255-rgb[c])*white);
  pixels.data[offset+3]=Math.round(a*255);
 }
 ctx.putImageData(pixels,0,0);textures.set(color,art);return art;
}

export function drawPianoHoldGlow(ctx,{x,y,length,size,color,progress=0,held=false}){
 if(length<=0)return;
 const width=Math.max(40,size*.8),filled=length*Math.max(0,Math.min(1,progress));
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 // A quiet white guide; its edges and far end dissolve into the scenery.
 ctx.globalAlpha=.48;ctx.drawImage(lightTexture('#c4d2df'),x-width/2,y-length,width,length);
 if(filled>0){
  ctx.globalAlpha=held?1:.78;
  ctx.drawImage(lightTexture(color),x-width/2,y-filled,width,filled);
 }
 ctx.restore();
}
