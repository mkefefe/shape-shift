export const AUDIENCE_KEY='';export const classifyAge=()=>null;
export const audience=()=>'protected';export const onlineAllowed=()=>false;
export const leaderboardAllowed=()=>!window.ShapeShiftPlatform.live&&window.ShapeShiftPlatform.storage.getItem('shape-shift-online-disabled')!=='1';
export const ensureAudience=async()=>'protected';
