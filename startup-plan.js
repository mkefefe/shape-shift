import {STARTUP_ASSETS} from './startup-assets.js?v=494209';
// Prioritize the opening screen and first board; destinations own their media.
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
 'assets/delivery-v144/battle-icon-v133.webp'];
// First play needs its controls, not every shop preview or every music track.
export const FULL_STARTUP_ASSETS=[...new Set([...CORE_STARTUP_ASSETS,
 'assets/delivery-v144/settings-v351.webp','assets/delivery-v144/quests-v351.webp'
])];
// Warm only what is visible on return to Home. Maps, shop catalogs, achievement
// sheets and minigame covers otherwise compete with the first run (~11 MB).
// The lock is conditional; Home readiness requests it only for locked Battle.
export const HOME_STARTUP_ASSETS=[...new Set(NEXT_ASSETS)].filter(src=>!FULL_STARTUP_ASSETS.includes(src));
export const BACKGROUND_ASSETS=STARTUP_ASSETS.filter(src=>!FULL_STARTUP_ASSETS.includes(src));
