import {STARTUP_ASSETS} from './startup-assets.js?v=494115';
// Prioritize the opening screen, then finish the entire verified media inventory.
export const CORE_STARTUP_ASSETS=[
 'assets/Nunito.ttf','assets/shapes-v2.webp','assets/logo-v2-cut.webp',
 'assets/menu-panel-v240.webp','assets/action-v45.webp','assets/close-v45.webp',
 'assets/specials-v13.webp','assets/health-boost-v5.webp','assets/abilities-v4.webp',
 'assets/coin-v10.webp','assets/pause-v30.webp','assets/ability-hand-v169.webp',
 'browser-shield-hd1.png','browser-time-hd1.png','browser-boost-hd1.png',
 'assets/xp-gold-painted-v335.webp'
];
const NEXT_ASSETS=['assets/home-world-v101.webp','assets/mode-cards-v101.webp',
 'assets/avatars-v7.webp','assets/settings-v351.png','assets/quests-v351.png',
 'browser-shop-hd1.png','browser-leaderboard-hd1.png','assets/achievements-v350.png',
 'assets/map-route-v102.webp','assets/map-buttons-v106.webp','assets/stars-v101.webp'];
// Shared menus and previews are prepared once. Mode artwork/audio is deferred.
const sharedExtras=[
 'assets/transition-gate-v115.png','assets/audio/gate-enter-v115.wav','assets/audio/gate-impact-v115.wav','assets/audio/gate-turn-v115.wav','assets/audio/gate-open-v115.wav',
 'assets/achievement-medals-v208.webp','assets/back-v307.webp','assets/copy-v77.webp',
 'assets/hub-drop-v291.webp','assets/hub-slice-v291.webp','assets/hub-piano-v292.webp',
 'assets/reward-video-v41.webp','assets/worlds-v12.webp','assets/frames-v12.webp',
 'assets/adventure-map-v101.webp','assets/music/menu-garden-v49458.ogg',
 'assets/music/menu-moon-v49458.ogg','assets/music/menu-sunset-v49458.ogg'
];
const density=Math.max(1,Math.min(4,Math.ceil(globalThis.devicePixelRatio||1)));
const previews=STARTUP_ASSETS.filter(src=>/assets\/skin-(?!.*wrapped).*\.webp$/.test(src)||src.includes('-'+density+'x-v49462.webp'));
export const FULL_STARTUP_ASSETS=[...new Set([...CORE_STARTUP_ASSETS,...NEXT_ASSETS,...sharedExtras,...previews])];
export const BACKGROUND_ASSETS=STARTUP_ASSETS.filter(src=>!FULL_STARTUP_ASSETS.includes(src));
