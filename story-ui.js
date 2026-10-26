import {createBeaconController} from './beacon-controller.js?v=49499';
export {CHARGE_KEY,createBeaconController} from './beacon-controller.js?v=49499';
import {showStoryScene} from './story-scene.js?v=49499';

// The ending is an earned full-screen scene, never a map menu or charge shop.
export function initStoryUI({document,...options}){
 const controller=createBeaconController({...options,showScene:settings=>showStoryScene({document,...settings})});
 const present=async()=>{
  if(controller.isPlaying()||!controller.summary().ready)return;
  controller.takeMilestoneNotice();
  return controller.charge();
 };
 return {...controller,refresh:()=>{},afterResults:present,onFirstOpen:present};
}
