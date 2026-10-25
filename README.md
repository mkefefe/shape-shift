# Shape Shift browser edition

Play at https://mkefefe.github.io/shape-shift/.

## 4.94.79 progressive loading

Startup waits for 12 shared first-play assets and the player's current shape skin. Hidden menu artwork, map art, cosmetic variants, music, narration, and mini-game assets no longer block entry. Remaining media warms the browser cache one low-priority request at a time after startup; that work pauses when the page is hidden. Opening a map or mini-game prepares its required assets with a local loading/retry screen and a Back option. Optional music or artwork failures cannot block the core game's startup.

The build still verifies the complete media inventory. The smaller startup plan changes download priority, not which assets ship. Save keys and gameplay progression remain unchanged.

## 4.94.39 browser update

Brings the mobile gameplay through 4.94.39 to the browser: ten Piano Flow themes and mistake flashes, earlier difficulty growth and stronger backing music, new menu/Drop/Slice tracks, louder synchronized victory piano, authored Adventure boards and optional frame/boost star goals, first-launch Endless tutorial and centered Endless selection, fixed quest panels, personal rankings and reset-on-open scrolling, Blossom double points/XP, repeatable Cosmic Crown rounds, and independent stacking Time Crystals.

The browser retains its portrait frame, high-resolution artwork, A/S/D/F piano controls, variable hold arrangements (with repeating phrases), desktop drag scrolling, lighter Slice effects, preloaded game audio, Beacon charges and locked-charge feedback, shared result hints, platform saves/audio/pause integration, and browser leaderboard transport. Existing saves keep the same keys and schema. Ads and analytics retain the browser edition's behavior.

Startup now attempts music automatically when browser policy permits it, with click and keyboard fallback. Result screens accept Space, Enter or Esc and show a steady desktop keyboard hint; existing save and rewarded-continue guards remain in effect.

Shape Drop supports continuous A/D aiming and S to drop, with held inputs cleared on pause or focus loss. The home carousel accepts one A/D mode change per press. Desktop hints explain both controls; touch and mouse input remain available.

The original full-media startup gate has been replaced by the progressive loading plan above. Tutorial art continues to reuse decoded images.

Shield-protected mistakes now use a brief blue flash with the approved low impact and two-note chime. Activating Shield uses the same sound. Feedback stays in the existing HUD without a popup; reduced-motion and sound settings are respected.

Endless and Adventure accept WASD to select a visible board tile and Space to pick it. Games accepts W/S and Space. Z follows Back/Pause and opens Settings from home; 1/2/3 activate Shield/Double Time/×5 rewards; H/F/B remain alternate shortcuts. Touch and mouse remain available.

Desktop browsers use a golden arrow cursor and matching hand pointer on clickable controls. Text editing and drag cursors remain native, and touch devices keep their existing controls.

Held WASD directions repeat after 140 ms and then every 75 ms, independently of operating-system key-repeat settings. Boost prices round to the nearest five coins for both display and purchase.

Board navigation wraps at edges, preserves held input through round locks, and restores selection focus after board replacement. Game keys reaching the outer page return focus to the game without intercepting browser modifier shortcuts.

Pause menus accept W/S selection and Space/Enter confirmation, including all three mini-game Resume/End panels. Z retains its existing back/resume behavior; nested Settings controls keep their normal keyboard behavior.

## Verify and build

Run `npm test` for the gameplay and loading regression checks. Run `python scripts/build-site.py` to reconstruct `_site` from the checksum-verified original bundle and the current deployment overlay. Serve `_site` with a local HTTP server. GitHub Pages runs both checks and deployment on pushes to main.

The base archive remains split across three files. `web-fix.sha256` lists every deployed overlay file, including current music assets. Android signing material and APK/AAB files are not part of this repository.
