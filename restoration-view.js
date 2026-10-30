export const RESTORATION_MODES=Object.freeze([
 {id:'adventure',name:'Adventure',action:'Continue Adventure',purpose:'Follow the journey and bring the land back to life.'},
 {id:'endless',name:'Endless',action:'Play Endless',purpose:'Keep matching to gather color for your island.'},
 {id:'games',name:'Games',action:'Choose a game',purpose:'Play Piano Flow, Shape Drop or Shape Slice to gather color.'},
 {id:'battle',name:'Battle',action:'Enter Battle',purpose:'Defeat the color thieves and help restore your island.'}
]);
export function restorationView(summary={},selected){
 const mode=RESTORATION_MODES.find(item=>item.id===selected)||RESTORATION_MODES.find(item=>item.id===summary.requiredMode)||RESTORATION_MODES[0];
 const access=summary.access?.[mode.id]||{unlocked:true};
 const task=summary.tasks?.find(t=>t.mode===mode.id)||(summary.task?.mode===mode.id?summary.task:null);
 const complete=!!summary.completed,locked=!access.unlocked,required=!!task&&!complete;
 return {mode,task,required,complete,locked,taskComplete:!!task?.complete,
  action:summary.readyToRestore?'Restore color':locked?'Locked':mode.action,
  heading:locked?'Locked':complete?'Your island is restored':task?.complete?'Task complete':'Required task',
  title:locked?access.requirement:complete?mode.purpose:task?.title||mode.purpose,
  note:locked?'Keep playing Adventure or Endless to level up.':complete?'Keep playing your favorite modes.':summary.readyToRestore?'All tasks complete. Restore color when you’re ready.':`Each task fills ${Math.round(100/(summary.tasks?.length||2))}% of the restoration bar.`,
  progress:required?`${task.current} / ${task.target}${task.type==='xp'?' Color':''}`:'',
  ratio:required?Math.min(1,Math.max(0,task.current/Math.max(1,task.target))):0
 };
}
