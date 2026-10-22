# Shape Shift browser edition

Play at https://mkefefe.github.io/shape-shift/.

## 4.94.39 browser update

Brings the mobile gameplay through 4.94.39 to the browser: ten Piano Flow themes and mistake flashes, earlier difficulty growth and stronger backing music, new menu/Drop/Slice tracks, louder synchronized victory piano, authored Adventure boards and optional frame/boost star goals, first-launch Endless tutorial and centered Endless selection, fixed quest panels, personal rankings and reset-on-open scrolling, Blossom double points/XP, repeatable Cosmic Crown rounds, and independent stacking Time Crystals.

The browser retains its portrait frame, high-resolution artwork, A/S/D/F piano controls, variable hold arrangements (with repeating phrases), desktop drag scrolling, lighter Slice effects, preloaded game audio, Beacon charges and locked-charge feedback, shared result hints, platform saves/audio/pause integration, and browser leaderboard transport. Existing saves keep the same keys and schema. Ads and analytics retain the browser edition's behavior.

Startup now attempts music automatically when browser policy permits it, with click and keyboard fallback. Result screens accept Space, Enter or Esc and show a steady desktop keyboard hint; existing save and rewarded-continue guards remain in effect.

## Verify and build

Run `npm test` for the 114 gameplay regression checks. Run `python scripts/build-site.py` to reconstruct `_site` from the checksum-verified original bundle and the current deployment overlay. Serve `_site` with a local HTTP server. GitHub Pages runs both checks and deployment on pushes to main.

The base archive remains split across three files. `web-fix.sha256` lists every deployed overlay file, including current music assets. Android signing material and APK/AAB files are not part of this repository.
