import {loadStoryAssets,drawStory} from './story-renderer.js?v=494198';
const STAGES=[{title:'The trees awaken',shape:2},{title:'Water finds its color',shape:1},{title:'The village comes alive',shape:0},{title:'The land shines again',shape:3}];
export function restorationFilmFrame(seconds,islandIndex=0){
 const finalIsland=islandIndex===9,duration=finalIsland?37:25,t=Math.max(0,Math.min(duration,seconds));
 if(t<20){const index=Math.floor(t/5);return {duration,kind:'restore',index,time:t-index*5,scene:['garden','river','village','sky'][index],...STAGES[index]};}
 return {duration,kind:finalIsland&&t>=24.5?'credits':'lanterns',time:8+t-20,scene:'ending',finalIsland};
}
export function restorationPixelGroup(stage,r,g,b){
 if(stage!=null)return stage===25?1:stage<=40?0:stage<=70?2:3;
 return b>r*1.12&&b>g*.95?1:g>r*1.08&&g>b*1.08?0:r>b*1.15?2:3;
}
export async function prepareRestorationFilm(art,island){
 const original=await loadStoryAssets(),n=640;
 const canvas=()=>Object.assign(document.createElement('canvas'),{width:n,height:n});
 const pixels=art.color.getContext('2d').getImageData(0,0,n,n),groups=Array.from({length:4},canvas),data=groups.map(c=>c.getContext('2d').createImageData(n,n)),sums=Array.from({length:4},()=>({x:0,y:0,count:0}));
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const k=(y*n+x)*4,[r,g,b,a]=pixels.data.subarray(k,k+4);if(!a)continue;
  // The first island keeps the authored tree, river, cottage and ground masks.
  const stage=island.index===0?original.restorationMap[Math.floor(y*1254/n)*1254+Math.floor(x*1254/n)]:null;
  const group=restorationPixelGroup(stage,r,g,b);data[group].data.set(pixels.data.subarray(k,k+4),k);sums[group].x+=x*a;sums[group].y+=y*a;sums[group].count+=a;
 }
 groups.forEach((c,i)=>c.getContext('2d').putImageData(data[i],0,0));
 const targets=island.index===0?[{x:.26,y:.27},{x:.51,y:.72},{x:.72,y:.43},{x:.27,y:.79}]:sums.map(s=>({x:s.count?s.x/s.count/n:.5,y:s.count?s.y/s.count/n:.6}));
 const stages=[art.gray];for(let i=0;i<4;i++){const c=canvas(),q=c.getContext('2d');q.drawImage(stages[i],0,0);q.drawImage(groups[i],0,0);stages.push(c);}stages[4]=art.color;
 const color=document.createElement('canvas');color.width=color.height=1254;color.getContext('2d').drawImage(art.color,0,0,1254,1254);
 const assets={...original,island:color,gray:art.gray,restorationStage:percent=>stages[Math.max(0,Math.min(4,Math.round(percent/25)))]};
 return {
  duration:restorationFilmFrame(0,island.index).duration,
  soundtrack:t=>{const f=restorationFilmFrame(t,island.index);return f.kind==='restore'?{file:['story-10.ogg','story-20.ogg','story-50.ogg','story-75.ogg'][f.index],offset:0}:{file:'story-ending.ogg',offset:8};},
  cues:STAGES.flatMap((_,i)=>[{name:'transform',at:i*5+.7},{name:'spark0',at:i*5+1.6}]),
  describe:t=>{const f=restorationFilmFrame(t,island.index);return f.kind==='restore'?`Restoration ${f.index+1} of 4: ${f.title}`:f.kind==='credits'?'Final island ending and credits':island.title+' restored — lanterns rising';},
  draw(ctx,t){const f=restorationFilmFrame(t,island.index);drawStory(ctx,assets,f.scene,f.time,{restorationTitle:island.title,restorationPhase:f.kind==='restore'?{...f,target:targets[f.index]}:null,finalIsland:island.index===9,suppressCredits:island.index!==9});}
 };
}
