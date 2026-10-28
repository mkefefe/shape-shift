# Android updates

Android build 1116 introduces two startup paths:

* Google Play in-app updates use Google's own consent, download, installation and restart flow. Cancellation, failure or a 4.5-second availability timeout lets the existing game start. Resuming an interrupted Play update is supported. This requires a Play-installed app and a higher eligible version on the player's track; a locally signed APK cannot prove a real Play upgrade.
* Automatic media packs are checked before the WebView starts. A native loading screen displays progress and allows playing without updating. HTTPS downloads use an exact build-specific manifest, file size limits and SHA-256 verification. Only existing raster-image, audio and font paths may be replaced. Executable code, HTML, JavaScript, SVG, new permissions and SDK updates must ship in the app release.

The APK contains all baseline assets, so first launch and offline play still work. A pack is downloaded into a staging directory and moved only after all files verify. The active pointer changes only before starting the game. Download failure/cancellation preserves the active pack. At startup a corrupt active pack falls back to the previously verified pack, then to bundled assets. Save data is separate and never deleted by the updater.

## Publish a compatible media patch

The initial `android-assets/1116/manifest.json` is intentionally empty: build 1116 already includes the current artwork/audio. Do not force a redundant download to demonstrate the progress bar.

The baseline checksum file is immutable for each shipped Android version. Generate a complete patch against it:

```powershell
python scripts/android-content-pack.py --source <folder-with-updated-assets> --output android-assets --code 1116
python scripts/test_android_content_pack.py
npm run build
```

Review and commit the manifest and newly generated content-addressed blobs; push to GitHub to deploy them with Pages. The app fetches `https://mkefefe.github.io/shape-shift/android-assets/1116/manifest.json`. Never put credentials, player data, or executable code in this directory. New assets not present in the APK require an app release to reference them.

For a new Android build, create a baseline from the exact staged APK assets using `--baseline` once. A different build code uses a different directory and cannot load an incompatible older pack. To roll back content, republish the earlier complete manifest; leave its blobs available.

## Verification

Run `testDebugUnitTest` in the Android Gradle project with ANDROID_HOME configured. ContentUpdatesTest uses a local HTTP fixture and temporary files to verify activation, network/checksum failure, cancellation, corrupt-cache fallback, and rejection of incompatible/executable paths. The production updater uses the fixed HTTPS origin; the local origin is injected only by JVM tests.

Before a store rollout, test the actual Google Play flow with a lower Play-installed version and a higher version on the same test track. Verify accept, cancel, interrupted update, and return-to-app. Test the native download screen on a phone with a compatible media patch, airplane mode and a dropped connection.
