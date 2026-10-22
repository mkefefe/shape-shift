import {TUTORIAL_KEY} from './onboarding.js?v=49439-web12';
export const FIRST_ENDLESS_KEY='shape-shift-first-endless-v1';
// Decide before profile initialization writes starter data. Interrupted lessons resume.
export function firstEndlessLaunch(storage){
 let pending=false;
 try{
  const status=storage.getItem(FIRST_ENDLESS_KEY),learned=storage.getItem(TUTORIAL_KEY)==='true';
  pending=!learned&&(status==='pending'||!status&&!storage.getItem('shape-shift-profile-v1')&&!storage.getItem('shape-shift-adventure-v1'));
  storage.setItem(FIRST_ENDLESS_KEY,pending?'pending':'done');
 }catch{}
 return {pending,complete(){pending=false;this.pending=false;try{storage.setItem(FIRST_ENDLESS_KEY,'done');}catch{}}};
}
