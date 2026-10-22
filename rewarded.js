export async function requestReward(host,timeout=120000,placement='default'){
if(placement==='continue'){if(host.document.getElementById('shape-drop')?.open)placement='continue-drop';else if(host.document.getElementById('shape-slice')?.open)placement='continue-slice';else if(host.document.getElementById('piano-flow')?.open)placement='continue-piano';}
return host.ShapeShiftPlatform.requestReward(placement);
}