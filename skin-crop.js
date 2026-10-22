export function silhouetteBounds(data,width,height,threshold=160){
 const seen=new Uint8Array(width*height),queue=new Int32Array(width*height);let best=null;
 for(let i=0;i<seen.length;i++){
  if(seen[i]||data[i*4+3]<=threshold)continue;
  let head=0,tail=1,x0=width,y0=height,x1=0,y1=0;queue[0]=i;seen[i]=1;
  while(head<tail){const n=queue[head++],x=n%width,y=Math.floor(n/width);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
   for(const next of [x>0?n-1:-1,x+1<width?n+1:-1,y>0?n-width:-1,y+1<height?n+width:-1])if(next>=0&&!seen[next]&&data[next*4+3]>threshold){seen[next]=1;queue[tail++]=next;}
  }
  if(!best||tail>best.count)best={x:x0,y:y0,w:x1-x0+1,h:y1-y0+1,count:tail};
 }
 return best;
}
