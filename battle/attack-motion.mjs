export function attackPosition(width,height,previous=-1,random=Math.random){
 const choices=[[-.32,0],[.32,0],[-.25,-.26],[.25,-.26],[0,-.3]];
 const available=choices.map((_,i)=>i).filter(i=>i!==previous),index=available[Math.min(available.length-1,Math.floor(random()*available.length))];
 const [dx,dy]=choices[index],margin=36;
 const x=Math.max(Math.min(margin,width/2),Math.min(width-margin,width/2+width*dx));
 const y=Math.max(Math.min(margin,height/2),Math.min(height-margin,height/2+height*dy));
 return {index,x,y,enemyX:(x-width/2)*.48,enemyY:(y-height/2)*.48};
}

// Preserve the gameplay warning window; only the final 200ms is the lunge.
export const ATTACK_PEAK_SCALE=2.05;
export function cameraAttackMotion(seconds){
 const duration=Math.max(50,seconds*1000),rush=Math.min(200,duration*.55);
 const launch=1-rush/duration;
 return {keyframes:[
  {transform:'scale(1)',offset:0,easing:'ease-out'},
  {transform:'scale(.92)',offset:Math.min(.18,launch*.5)},
  {transform:'scale(.92)',offset:launch,easing:'cubic-bezier(.55,0,.85,.4)'},
  {transform:`scale(${ATTACK_PEAK_SCALE})`,offset:1}
 ],options:{duration,easing:'linear',fill:'forwards'},rush};
}
export function cameraRecoilMotion(current,blocked){
 return {keyframes:[
  {transform:current==='none'?'scale(1)':current,offset:0},
  {transform:blocked?'scale(.86)':`scale(${ATTACK_PEAK_SCALE})`,offset:blocked?.3:.14,easing:'cubic-bezier(.15,.7,.3,1)'},
  {transform:'scale(1)',offset:1}
 ],options:{duration:blocked?300:360,easing:'ease-out'}};
}
