// Progress uses active play time only. Score boosts can advance a phase, never rewind it.
export const SKY_PALETTES=[
 ['#080f2c','#251844','#208cd8','#8d3cb3'],
 ['#071d2b','#123d49','#19c9d1','#4679dd'],
 ['#1b1039','#4a2054','#a85ce9','#e064ac'],
 ['#20132e','#44302e','#e39155','#bd62c8'],
 ['#081e30','#173d47','#55d2c4','#548deb']
];
export const sceneryStage=(score=0,seconds=0)=>Math.floor(Math.max(Math.max(0,Number(score)||0)/50,Math.max(0,Number(seconds)||0)/120));
export function sceneryPalette(phase){const p=Math.max(0,Number(phase)||0),index=Math.floor(p),a=SKY_PALETTES[index%SKY_PALETTES.length],b=SKY_PALETTES[(index+1)%SKY_PALETTES.length],t=p-index;return a.map((hex,i)=>'#'+[1,3,5].map(n=>Math.round(parseInt(hex.slice(n,n+2),16)*(1-t)+parseInt(b[i].slice(n,n+2),16)*t).toString(16).padStart(2,'0')).join(''));}
export function createSceneryProgress(){let seconds=0,stage=0,phase=0;return {step(delta,score=0,reduced=false){const dt=Math.max(0,Math.min(.25,Number(delta)||0));seconds+=dt;stage=Math.max(stage,sceneryStage(score,seconds));phase=Math.min(stage,phase+dt/(reduced?12:6));return {seconds,stage,phase,palette:sceneryPalette(phase),speed:1+Math.min(stage,6)*.12};}};}
