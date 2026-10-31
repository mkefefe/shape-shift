import {createBeaconController} from './beacon-controller.js?v=494201';
export {CHARGE_KEY,createBeaconController} from './beacon-controller.js?v=494201';
import {showStoryScene} from './story-scene.js?v=494201';

// Adventure completion records the clear; island celebrations belong exclusively
// to the shared restoration screen, never to a level-100 credits sequence.
export function initStoryUI({document,...options}){
 const controller=createBeaconController({...options,showScene:settings=>showStoryScene({document,...settings})});
 return {...controller,summary:()=>({...controller.summary(),ready:null}),refresh:()=>{},afterResults:async()=>{},onFirstOpen:async()=>{}};
}
