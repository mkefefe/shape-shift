import {loadStoryAssets,drawStory} from './story-renderer.js?ui258';
const STAGES=[{title:'The trees awaken',shape:2},{title:'Water finds its color',shape:1},{title:'The village comes alive',shape:0},{title:'The land shines again',shape:3}];
export const RESTORATION_MERGE_SECONDS=2.6;
export const RESTORATION_CHARGE_SECONDS=3.9;
export const RESTORATION_BEAM_GAP=.4;
export const RESTORATION_PHASE_SECONDS=4.9;
export const RESTORATION_COLOR_SECONDS=RESTORATION_CHARGE_SECONDS+3*RESTORATION_BEAM_GAP+RESTORATION_PHASE_SECONDS;
export const RESTORATION_CUES=Object.freeze([
 {id:'merge',at:RESTORATION_MERGE_SECONDS,file:'victory-transform-v4947.ogg',gain:.85},
 {id:'travel',at:RESTORATION_MERGE_SECONDS+.25,file:'victory-gather-v4947.ogg',gain:.65},
 {id:'charge',at:RESTORATION_MERGE_SECONDS+.9,file:'victory-resolve-v4947.ogg',gain:.8},
 ...STAGES.flatMap((stage,index)=>[
  {id:'beam-'+index,at:RESTORATION_CHARGE_SECONDS+index*RESTORATION_BEAM_GAP,file:'victory-reward-flight-v49459.ogg',gain:.5},
  {id:'bloom-'+index,at:RESTORATION_CHARGE_SECONDS+index*RESTORATION_BEAM_GAP+1.1,file:'victory-spark'+index+'-v49436.ogg',gain:.45}
 ])
].sort((a,b)=>a.at-b.at).map(Object.freeze));
export function restorationFilmFrame(seconds,islandIndex=0){
 const finalIsland=islandIndex===9,duration=RESTORATION_COLOR_SECONDS+(finalIsland?17:5),t=Math.max(0,seconds);
 if(t<RESTORATION_COLOR_SECONDS)return {duration,kind:'restore',time:t-RESTORATION_CHARGE_SECONDS,scene:'garden',mergeAt:RESTORATION_MERGE_SECONDS,beams:STAGES.map((stage,index)=>({...stage,index,launch:RESTORATION_CHARGE_SECONDS+index*RESTORATION_BEAM_GAP}))};
 return {duration,kind:finalIsland&&t>=RESTORATION_COLOR_SECONDS+4.5?'credits':'lanterns',time:8+t-RESTORATION_COLOR_SECONDS,scene:'ending',finalIsland};
}
export function restorationPixelGroup(stage,r,g,b){
 if(stage!=null)return stage===25?1:stage<=40?0:stage<=70?2:3;
 return b>r*1.12&&b>g*.95?1:g>r*1.08&&g>b*1.08?0:r>b*1.15?2:3;
}
export async function prepareRestorationFilm(art,island){
 const original=await loadStoryAssets(),n=art.color.width;
 const canvas=()=>Object.assign(document.createElement('canvas'),{width:n,height:n});
 const pixels=art.color.getContext('2d').getImageData(0,0,n,n),groups=Array.from({length:4},canvas),data=groups.map(c=>c.getContext('2d').createImageData(n,n)),sums=Array.from({length:4},()=>({x:0,y:0,count:0}));
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const k=(y*n+x)*4,r=pixels.data[k],g=pixels.data[k+1],b=pixels.data[k+2],a=pixels.data[k+3];if(!a)continue;
  // The first island keeps the authored tree, river, cottage and ground masks.
  const stage=island.index===0?original.restorationMap[Math.floor(y*1254/n)*1254+Math.floor(x*1254/n)]:null;
  const group=restorationPixelGroup(stage,r,g,b);const out=data[group].data;out[k]=r;out[k+1]=g;out[k+2]=b;out[k+3]=a;sums[group].x+=x*a;sums[group].y+=y*a;sums[group].count+=a;
 }
 groups.forEach((c,i)=>c.getContext('2d').putImageData(data[i],0,0));
 const targets=island.index===0?[{x:.26,y:.27},{x:.51,y:.72},{x:.72,y:.43},{x:.27,y:.79}]:sums.map(s=>({x:s.count?s.x/s.count/n:.5,y:s.count?s.y/s.count/n:.6}));
 const stages=[art.gray];for(let i=0;i<4;i++){const c=canvas(),q=c.getContext('2d');q.drawImage(stages[i],0,0);q.drawImage(groups[i],0,0);stages.push(c);}stages[4]=art.color;
 const color=art.color;
 // A retina-sized reveal layer prevents the moving color front from going soft.
 const reveal=document.createElement('canvas');reveal.width=1440;reveal.height=2560;
 const assets={...original,reveal,districtReveal:canvas(),restorationGroups:groups,island:color,gray:art.gray,restorationStage:percent=>stages[Math.max(0,Math.min(4,Math.round(percent/25)))]};
 return {
  duration:restorationFilmFrame(0,island.index).duration,
  soundtrack:()=>({file:island.index===9?'restoration-score-final-v206.ogg':'restoration-score-v206.ogg',offset:0}),
  // The score stays continuous; effects follow the same visual clock as the action.
  cues:RESTORATION_CUES,
  describe:t=>{const f=restorationFilmFrame(t,island.index);return f.kind==='restore'?(t<RESTORATION_CHARGE_SECONDS?'One spark fills the beacon':'Four colors restore the island together'):f.kind==='credits'?'Final island ending and credits':island.title+' restored; lanterns rising';},
  draw(ctx,t,opening=1,imageFrame){const f=restorationFilmFrame(t,island.index);drawStory(ctx,assets,f.scene,f.time,{restorationTitle:island.title,restorationImageFrame:imageFrame,restorationClock:t,restorationOpening:opening,restorationPhase:f.kind==='restore'?{...f,targets}:null,finalIsland:island.index===9,suppressCredits:island.index!==9});}
 };
}

// Visual clock only. Audio retains playbackRate 1 throughout.
export function restorationPresentation(seconds,islandIndex=0){
 const colorDuration=RESTORATION_COLOR_SECONDS/1.3;
 const filmSeconds=seconds<colorDuration?seconds*1.3:RESTORATION_COLOR_SECONDS+seconds-colorDuration;
 const returnAt=islandIndex===9?colorDuration+17:colorDuration+.7;
 const progress=Math.max(0,Math.min(1,(seconds-returnAt)/1.5));
 return {filmSeconds,dock:restorationEase(progress),duration:returnAt+1.5+1};
}

// Zero velocity and acceleration at both ends, with no spring overshoot.
export function restorationEase(value){const p=Math.max(0,Math.min(1,value));return p*p*p*(p*(p*6-15)+10);}
export function restorationTransition(card,viewport,progress){
 const p=Math.max(0,Math.min(1,progress)),mix=(a,b)=>a+(b-a)*p;
 const rect={x:mix(card.x,0),y:mix(card.y,0),w:mix(card.w,viewport.w),h:mix(card.h,viewport.h)};
 const first=Math.min(card.w,card.h),scale=Math.min(viewport.w/720,viewport.h/1280),last=700*scale;
 const size=mix(first,last),cx=mix(card.x+card.w/2,viewport.w/2);
 const cy=mix(card.y+card.h/2,(viewport.h-1280*scale)/2+760*scale);
 return {...rect,image:{x:cx-rect.x-size/2,y:cy-rect.y-size/2,size}};
}
