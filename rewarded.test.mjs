import test from 'node:test';
import assert from 'node:assert/strict';
import {requestReward} from './rewarded.js';

function nativeHost(){
 const host=new EventTarget(),requests=[];
 host.ShapeShiftAds={showRewarded:id=>requests.push(id)};
 const dispatch=(id,status)=>{const event=new Event('rewardedad');event.detail={id,status};host.dispatchEvent(event);};
 return {host,requests,dispatch};
}
test('ordinary browser cannot request ads or receive a reward',async()=>{
 assert.equal(await requestReward(new EventTarget()),'unsupported');
 assert.equal(await requestReward(undefined),'unsupported');
});
test('native reward waits for the matching earned-reward result',async()=>{
 const {host,requests,dispatch}=nativeHost();
 const result=requestReward(host,1000);let resolved=false;result.then(()=>resolved=true);
 assert.match(requests[0],/^reward-[a-zA-Z0-9.-]{1,90}$/);
 dispatch('different-request','rewarded');dispatch(requests[0],'loaded');
 await Promise.resolve();assert.equal(resolved,false);
 dispatch(requests[0],'rewarded');assert.equal(await result,'rewarded');
});
test('dismissed, failed and unavailable ads never become rewards',async()=>{
 for(const status of ['dismissed','failed','unavailable']){
  const {host,requests,dispatch}=nativeHost();const result=requestReward(host,1000);
  dispatch(requests[0],status);dispatch(requests[0],'rewarded');assert.equal(await result,status);
 }
});
test('bonus uses its native ad unit routing prefix; continue uses regular unit',async()=>{
 for(const placement of ['run-bonus','continue','default']){
  const {host,requests,dispatch}=nativeHost();const result=requestReward(host,1000,placement);
  assert.equal(requests[0].startsWith('reward-bonus-'),placement==='run-bonus');
  dispatch(requests[0],'dismissed');await result;
 }
});
test('timeout and bridge exceptions settle safely and remove their listeners',async()=>{
 for(const throws of [false,true]){
  const {host}=nativeHost();let removed=0;
  const remove=host.removeEventListener.bind(host);
  host.removeEventListener=(...args)=>{removed++;return remove(...args);};
  if(throws)host.ShapeShiftAds.showRewarded=()=>{throw Error('native bridge unavailable');};
  assert.equal(await requestReward(host,5),throws?'failed':'unavailable');assert.equal(removed,1);
 }
});
test('concurrent requests cannot receive each other\'s reward',async()=>{
 const {host,requests,dispatch}=nativeHost();
 const first=requestReward(host,1000),second=requestReward(host,1000);
 assert.notEqual(requests[0],requests[1]);
 dispatch(requests[1],'unavailable');dispatch(requests[0],'rewarded');
 assert.deepEqual(await Promise.all([first,second]),['rewarded','unavailable']);
});
test('a late earned callback cannot change a timed-out request',async()=>{
 const {host,requests,dispatch}=nativeHost();
 const result=requestReward(host,5);let settlements=0;result.then(()=>settlements++);
 assert.equal(await result,'unavailable');
 dispatch(requests[0],'rewarded');await Promise.resolve();
 assert.equal(await result,'unavailable');assert.equal(settlements,1);
});
