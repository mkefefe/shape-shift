import {STARTUP_ASSETS} from './startup-assets.js?v=49496';
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
export const FULL_STARTUP_ASSETS=[...new Set([...CORE_STARTUP_ASSETS,...NEXT_ASSETS,...STARTUP_ASSETS])];
export const BACKGROUND_ASSETS=[];
