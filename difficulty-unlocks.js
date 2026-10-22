export const DIFFICULTY_REQUIREMENTS=Object.freeze({
 normal:Object.freeze({mode:'easy',score:10}),
 hard:Object.freeze({mode:'normal',score:25}),
 extreme:Object.freeze({mode:'hard',score:50})
});
export function difficultyUnlocked(id,bests={}){
 if(id==='easy')return true;
 const requirement=DIFFICULTY_REQUIREMENTS[id];
 if(!requirement)return false;
 const score=bests[requirement.mode];
 return Number.isFinite(score)&&score>=requirement.score;
}
export const availableDifficulty=(id,bests)=>difficultyUnlocked(id,bests)?id:'easy';
