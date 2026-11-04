# Shape Shift requirements

## Piano Flow — user correction, November 4, 2026

- A visible note is playable immediately with its matching A/S/D/F key or strip tap, anywhere on the visible board. Do not require it to reach a bottom line or a narrow rhythm window.
- Select the earliest visible unplayed note in the pressed lane. A visible note in another lane must remain playable even if an earlier note or an optional sustain exists elsewhere.
- Award the point and sound the note on the press. Long-note holds are optional expression; releasing must not remove the point or impose a required hold.
- One fresh physical press collects one note. A held key must not collect later notes automatically. Different keys/fingers can work independently.
- Gameplay and help text must describe these rules. Rhythm backing must accommodate the player's immediate performance without delayed or duplicated melody/support attacks.

## Readiness and audio presentation

- Complete local mode, menu, artwork, music and effect preparation before enabling play. Never start a gameplay clock while required assets are still loading.
- Keep preparation deduplicated, concurrency bounded and failures retryable. A failed preparation cannot be marked ready.
- Preserve saved music/SFX preferences. Match recorded-track loudness before those controls; preserve stereo and pitch. Ordinary correct taps must not repeatedly halve the music.
- Verify actual runtime audio routes, not just the presence of a recording in a package. Browser, native and portal builds must derive from the same verified source manifest.

## Reserved music reference

- Recorded October 31, 2026: “the indie song” / “indie background pack” for Shift Shift refers to `indie-game-soundtrack-251864.mp3`.
- Original: `C:/Users/kmoee/Downloads/Shift Shift - Indie Background Music/indie-game-soundtrack-251864.mp3`. Provenance and checksum are in `READ_ME.txt` and `asset-manifest.json` beside it.
- Reserve it for Shift Shift and exclude it from Chess Defense. Retain its existing use here; this note alone does not authorize adding it to another product or context.
