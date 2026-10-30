import {STARTUP_ASSETS} from './startup-assets.js?v=494198';
// Prioritize the opening screen, then finish the entire verified media inventory.
export const OPENING_ASSETS=['assets/Nunito.ttf','assets/delivery-v144/logo-v2-cut.webp','assets/delivery-v144/menu-panel-v240.webp','assets/delivery-v144/action-v45.webp','assets/close-v45.webp'];
export const CORE_STARTUP_ASSETS=[
 'assets/Nunito.ttf','assets/delivery-v144/shapes-v2.webp','assets/delivery-v144/logo-v2-cut.webp',
 'assets/delivery-v144/menu-panel-v240.webp','assets/delivery-v144/action-v45.webp','assets/close-v45.webp',
 'assets/delivery-v144/specials-v13.webp','assets/delivery-v144/health-boost-v5.webp','assets/delivery-v144/abilities-v4.webp',
 'assets/coin-v10.webp','assets/pause-v30.webp','assets/delivery-v144/ability-hand-v169.webp',
 'assets/delivery-v144/browser-shield-hd1.webp','assets/delivery-v144/browser-time-hd1.webp','assets/delivery-v144/browser-boost-hd1.webp',
 'assets/delivery-v144/xp-gold-painted-v335.webp'
];
const NEXT_ASSETS=['assets/delivery-v144/home-world-v101.webp','assets/mode-cards-v101.webp',
 'assets/avatars-v7.webp','assets/delivery-v144/settings-v351.webp','assets/delivery-v144/quests-v351.webp',
 'assets/delivery-v144/browser-shop-hd1.webp','assets/delivery-v144/browser-leaderboard-hd1.webp','assets/delivery-v144/achievements-v350.webp',
 'assets/map-route-v102.webp','assets/map-buttons-v106.webp','assets/stars-v101.webp'];
// Shared menus and previews are prepared once. Mode artwork/audio is deferred.
const sharedExtras=[
 'assets/achievement-medals-v208.webp','assets/back-v307.webp','assets/copy-v77.webp',
 'assets/hub-drop-v291.webp','assets/hub-slice-v291.webp','assets/hub-piano-v292.webp',
 'assets/reward-video-v41.webp','assets/worlds-v12.webp','assets/frames-v12.webp',
 'assets/adventure-map-v101.webp','assets/music/menu-garden-sync-v184.ogg',
 'assets/music/menu-moon-sync-v184.ogg','assets/music/menu-sunset-sync-v184.ogg'
];
const density=Math.max(1,Math.min(4,Math.ceil(globalThis.devicePixelRatio||1)));
const previews=STARTUP_ASSETS.filter(src=>/assets\/skin-(?!.*wrapped).*\.webp$/.test(src)||src.includes('-'+density+'x-v49462.webp'));
// First play needs its controls, not every shop preview or every music track.
export const FULL_STARTUP_ASSETS=[...new Set([...CORE_STARTUP_ASSETS,
 'assets/delivery-v144/settings-v351.webp','assets/delivery-v144/quests-v351.webp'
])];
export const HOME_STARTUP_ASSETS=[...new Set([...NEXT_ASSETS,...sharedExtras.filter(src=>!src.includes('/music/'))])].filter(src=>!FULL_STARTUP_ASSETS.includes(src));
export const BACKGROUND_ASSETS=STARTUP_ASSETS.filter(src=>!FULL_STARTUP_ASSETS.includes(src));
