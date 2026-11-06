import {STARTUP_ASSETS} from './startup-assets.js?ui274';
// Show the welcome artwork first; the session barrier prepares every playable
// destination before any game controls become available.
export const OPENING_ASSETS=['assets/Nunito.ttf','assets/delivery-v144/logo-v2-cut.webp','assets/delivery-v144/menu-panel-v240.webp','assets/delivery-v144/action-v45.webp','assets/close-v45.webp'];
export const CORE_STARTUP_ASSETS=[
 'assets/Nunito.ttf','assets/delivery-v144/shapes-v2.webp','assets/delivery-v144/logo-v2-cut.webp',
 'assets/delivery-v144/menu-panel-v240.webp','assets/delivery-v144/action-v45.webp','assets/close-v45.webp',
 'assets/delivery-v144/specials-v13.webp','assets/delivery-v144/health-boost-v5.webp','assets/delivery-v144/abilities-v4.webp',
 'assets/coin-v10.webp','assets/pause-v30.webp','assets/delivery-v144/ability-hand-v169.webp',
 'assets/ability-shield-ui268.webp','assets/ability-time-ui268.webp','assets/ability-boost-ui268.webp',
 'assets/delivery-v144/xp-gold-painted-v335.webp'
];
const NEXT_ASSETS=['assets/delivery-v144/home-world-v101.webp','assets/mode-cards-v101.webp',
 'assets/avatars-v7.webp','assets/delivery-v144/settings-v351.webp','assets/delivery-v144/quests-v351.webp',
 'assets/delivery-v144/browser-shop-hd1.webp','assets/delivery-v144/browser-leaderboard-hd1.webp','assets/delivery-v144/achievements-v350.webp',
 'assets/delivery-v144/battle-icon-v133.webp'];
export const MODE_STARTUP_ASSETS=[
 'assets/adventure-garden-v209.webp','assets/back-v307.webp',
 'assets/hub-drop-v291.webp','assets/hub-slice-v291.webp','assets/hub-piano-v292.webp',
 'assets/drop-circle-hd-v250.webp','assets/drop-square-hd-v250.webp','assets/drop-star-hd-v250.webp','assets/drop-triangle-hd-v250.webp',
 'assets/drop-container-v241.webp','assets/drop-garden-v491.webp','assets/shape-lock-chains-v202.webp',
 'assets/slice-bomb-v239.webp','assets/slice-galaxy-v49476.webp','assets/piano-sky-v281.webp'
];
export const WORLD_STARTUP_ASSETS=[
 'assets/map-meadow-v212.webp','assets/map-buttons-v106.webp','assets/stars-v101.webp',
 'assets/worlds-v12.webp','assets/garden-v2.webp','assets/achievement-medals-v208.webp',
 'assets/battle-lock-v175.png','assets/reward-video-v41.webp','assets/reward-pointer-v226.webp',
 'assets/stone-states-v140.webp','assets/dash-portal-v221.webp','assets/copy-v77.webp',
 ...Array.from({length:9},(_,i)=>`assets/restoration-islands/island-${i+1}-v218.webp`),
 'assets/story-beacon/island.webp','assets/story-beacon/lanterns.webp','assets/story-beacon/sky.webp'
];
const SKIN_ASSETS=STARTUP_ASSETS.filter(src=>src.startsWith('assets/skin-'));
const scale=Math.min(4,Math.max(1,Math.ceil(globalThis.devicePixelRatio||1)));
const FRAME_ASSETS=['gold','ice','blossom','cosmic'].map(name=>`assets/avatar-frame-${name}-${scale}x-v49462.webp`);
// This is the live art set. Old exported recordings and superseded source-size
// atlases remain in the archive manifest, but must not fill decoded memory.
export const FULL_STARTUP_ASSETS=[...new Set([...CORE_STARTUP_ASSETS,...NEXT_ASSETS,...MODE_STARTUP_ASSETS,...WORLD_STARTUP_ASSETS,...SKIN_ASSETS,...FRAME_ASSETS])];
export const HOME_STARTUP_ASSETS=[...new Set(NEXT_ASSETS)];
export const BACKGROUND_ASSETS=STARTUP_ASSETS.filter(src=>!FULL_STARTUP_ASSETS.includes(src));
