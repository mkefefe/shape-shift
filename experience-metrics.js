// Closed, non-identifying counters. Timing is kept in memory until statistics are enabled.
export const MILESTONES=['opening_ready','welcome_complete','assets_ready','playable','first_pick','tutorial_complete'];
export const EVENTS=['startup_error','startup_retry','first_loss','retry','battle_block','battle_block_early','battle_enemy_hit','battle_wrong_pick','battle_match','battle_retry','battle_bomb','battle_starburst','battle_shield',...Array.from({length:30},(_,i)=>['start','win','loss'].map(k=>`fight_${i+1}_${k}`)).flat()];
const timings={};let sink=null;
export function markStartup(name){if(!MILESTONES.includes(name)||name in timings)return;const ms=Math.min(3600000,Math.round(globalThis.performance?.now()||0));timings[name]=ms;sink?.(name,ms);}
export function attachStartupMetrics(report){sink=report;for(const [name,ms] of Object.entries(timings))report(name,ms);}
export function startupSnapshot(){return {...timings};}
