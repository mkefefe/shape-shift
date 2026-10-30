// All attacks update the enemy's health and feedback at projectile impact.
const activeReactions=new WeakMap();
export function showEnemyHit({enemy,healthText,healthFill,state,damage,at,pop,heavy=false,windingUp=false,pose='none',color}){
 healthText.textContent=`${state.enemyHp} / ${state.enemyMaxHp}`;
 healthFill.style.width=state.enemyHp/state.enemyMaxHp*100+'%';
 activeReactions.get(enemy)?.cancel();
 const base=pose==='none'?'':pose;
 const frames=heavy?[
  {transform:base||'scale(1)',filter:'brightness(1)'},
  {transform:`${base} translateY(-12px) scale(.84) rotate(-5deg)`,filter:'brightness(2)',offset:.16},
  {transform:`${base} translateX(9px) scale(1.04) rotate(3deg)`,filter:'brightness(1.45)',offset:.42},
  {transform:`${base} translateX(-4px) scale(.98) rotate(-1deg)`,filter:'brightness(1.1)',offset:.7},
  {transform:base||'scale(1)',filter:'brightness(1)'}
 ]:windingUp?[
  {filter:'brightness(1)'},{filter:'brightness(1.8)',offset:.3},{filter:'brightness(1)'}
 ]:[
  {transform:'translateX(0)',filter:'brightness(1)'},
  {transform:'translateX(8px) scale(.93)',filter:'brightness(1.8)',offset:.3},
  {transform:'translateX(-3px)',filter:'brightness(1)',offset:.65},
  {transform:'translateX(0)',filter:'brightness(1)'}
 ];
 const reaction=enemy.animate(frames,{duration:heavy?520:windingUp?230:280,easing:'ease-out'});
 // Rapid impacts may replace an unfinished reaction (for example Starburst).
 void reaction.finished.catch(()=>{});
 activeReactions.set(enemy,reaction);
 if(damage>0)pop('−'+damage,at,color);
 return reaction;
}
