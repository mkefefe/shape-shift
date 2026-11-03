import {BEACON} from './story-restoration.js?v=494221';
// One prepared painting per destination. The source art is never stretched;
// the same composition expands from the preview into the celebration window.
const cache=new Map();
// Keep native detail throughout the card-to-film transition.
const SIZE=1254;
const canvas=()=>Object.assign(document.createElement('canvas'),{width:SIZE,height:SIZE});
const image=async url=>{const im=new Image();im.src=new URL(url,import.meta.url).href;await im.decode();return im;};
let beacon;
export function loadRestorationIsland(index=0){
 if(cache.has(index))return cache.get(index);
 const pending=(async()=>{
  const source=index===0?await image('./assets/story-beacon/island.webp'):await image(`./assets/restoration-islands/island-${index}-v218.webp`);
  const color=canvas(),c=color.getContext('2d');
  c.imageSmoothingQuality='high';c.drawImage(source,0,0,SIZE,SIZE);
  if(index>0){
   const tower=await(beacon??=image('./assets/story-beacon/island.webp'));
   c.save();c.scale(SIZE/1254,SIZE/1254);c.beginPath();BEACON.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();c.drawImage(tower,0,0,1254,1254);c.restore();
  }
  const gray=canvas(),g=gray.getContext('2d');g.filter='grayscale(1) brightness(.78)';g.drawImage(color,0,0);
  const pixels=c.getImageData(0,0,SIZE,SIZE),groups=Array.from({length:4},canvas),data=groups.map(a=>a.getContext('2d').createImageData(SIZE,SIZE));
  for(let i=0;i<pixels.data.length;i+=4){
   const r=pixels.data[i],bg=pixels.data[i+1],b=pixels.data[i+2];
   // Blue water/crystals, green foliage, warm roofs/flowers, then the stone and light.
   const group=b>r*1.12&&b>bg*.95?0:bg>r*1.08&&bg>b*1.08?1:r>b*1.15?2:3;
   const out=data[group].data;out[i]=r;out[i+1]=bg;out[i+2]=b;out[i+3]=pixels.data[i+3];
  }
  groups.forEach((a,i)=>a.getContext('2d').putImageData(data[i],0,0));
  while(cache.size>1)cache.delete(cache.keys().next().value);
  return {color,gray,groups};
 })();cache.set(index,pending);pending.catch(()=>cache.delete(index));return pending;
}
export function drawRestorationIsland(ctx,art,progress=0){
 const {width:w,height:h}=ctx.canvas,s=Math.min(w,h),x=(w-s)/2,y=(h-s)/2;
 ctx.clearRect(0,0,w,h);ctx.drawImage(progress>=1?art.color:art.gray,x,y,s,s);
 if(progress<=0||progress>=1)return;
 for(let i=0;i<4;i++){
  const p=Math.max(0,Math.min(1,progress*4-i));if(!p)continue;
  ctx.save();ctx.beginPath();ctx.rect(x,y+s*(1-p),s,s*p);ctx.clip();ctx.drawImage(art.groups[i],x,y,s,s);ctx.restore();
 }
}
