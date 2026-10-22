// Three optional stars per stage. Rows are authored in map order, ten per world.
// w=wrong picks, t=time, s=streak, c/h=color/shape changes, u=boost, p=pickup, f=frame.
export const STAR_PLAN=[
 ['w2 t s2','w2 t c2','w1 t h2','w1 s3 ushield','t c3 h3','w1 t ufreeze','s3 c3 ushield','w1 h4 ufreeze','t s4 uboost','w1 s4 pcrystal'],
 ['t c4 pcrystal','w1 h4 ushield','s4 c4 ufreeze','w1 t pstarburst','t h5 uboost','w1 c5 pcrystal','s4 h4 ushield','t c5 pstarburst','w1 s5 uall','t c4 fgold'],
 ['w1 c5 ushield','t h5 pcrystal','s5 c5 uboost','w1 h5 ufreeze','w0 t s5','t c6 pstarburst','w1 s6 ushield','c5 h5 uall','w0 h6 pcrystal','t s6 pbomb'],
 ['w0 c6 ufreeze','t h6 pstarburst','s6 c6 ushield','w1 h6 uboost','c6 h6 pcrystal','w0 t uall','s6 h6 pbomb','t c7 ufreeze','w1 s7 pstarburst','t h6 fice'],
 ['w0 s6 pcrystal','c7 h6 ushield','t s7 uboost','w1 c7 pbomb','s7 h7 ufreeze','t c7 uall','w0 h7 pstarburst','c6 h7 uboost','w1 s8 pcrystal','t h7 pbomb'],
 ['w0 c7 ushield','s7 h6 pstarburst','t c8 ufreeze','w1 h8 uall','s8 c7 pbomb','w0 t uboost','c8 h7 pcrystal','t s8 ushield','w1 c8 pstarburst','t s7 fblossom'],
 ['w0 h8 ufreeze','c8 s8 ushield','t h8 pcrystal','w1 s8 uboost','c8 h8 pbomb','w0 c8 uall','s8 h8 pstarburst','t c9 ushield','w1 h9 ufreeze','t s9 pbomb'],
 ['w0 s8 uboost','c9 h8 pcrystal','t h9 uall','w1 c9 ushield','s9 h8 pbomb','w0 h9 pstarburst','c9 s9 ufreeze','t c10 uboost','w1 s9 pcrystal','t h9 fcosmic'],
 ['w0 c9 pbomb','s9 h9 ushield','t h10 pstarburst','w1 c10 uall','s10 c9 uboost','w0 h10 pcrystal','c10 h9 ufreeze','t s10 pstarburst','w1 h10 pbomb','s9 c10 uall'],
 ['w0 s10 ushield','c10 h10 pcrystal','t c11 pbomb','w1 s10 ufreeze','s10 h10 uboost','w0 c11 pstarburst','c11 h10 ushield','t s11 uall','w1 h11 pbomb','w0 s12 uall']
].flatMap(world=>world.map(row=>row.split(' ')));
export function starTasks(level,{seconds,frameName}){
 return STAR_PLAN[level-1].map(code=>{
  const kind=code[0],value=code.slice(1),target=Number(value);
  if(kind==='t')return {type:'time',target:seconds,label:'Finish within '+Math.floor(seconds/60)+'m '+String(seconds%60).padStart(2,'0')+'s'};
  if(kind==='w')return {type:'wrong',target,label:target?'Finish with at most '+target+' wrong '+(target===1?'pick':'picks'):'Finish without a wrong pick'};
  if(kind==='s')return {type:'streak',target,label:'Make '+target+' correct picks in a row'};
  if(kind==='c'||kind==='h')return {type:kind==='c'?'colorChanges':'shapeChanges',target,label:'Change '+(kind==='c'?'color':'shape')+' on '+target+' correct picks'};
  if(kind==='u')return {type:'ability',ability:value,target:value==='all'?3:1,label:value==='all'?'Use Shield, Slow Time and ×5 in this run':'Use '+({shield:'Shield',freeze:'Slow Time',boost:'×5 points'})[value]+' in this run'};
  if(kind==='p')return {type:'pickup',special:value,target:1,label:'Pick up '+({crystal:'a Shield Crystal',starburst:'a Starburst',bomb:'a Bomb'})[value]};
  return {type:'frame',frame:value,target:1,label:'Finish with '+frameName(value)+' equipped'};
 });
}
