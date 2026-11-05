# Shape Shift requirements

## Adventure special stages — user correction, November 4, 2026

- Adventure Piano Flow, Shape Drop and Shape Slice levels use fixed, finite authored content. Every replay gets the same notes, waves and incoming piece order; a seeded random generator is not a substitute for written content.
- Reaching the target is not an instruction to end. Evaluate success after the authored ending, with remaining notes, waves, sound tails, physics and match effects resolved. Do not abruptly cut a successful level off at a score or timer threshold.
- A tutorial is separate from the authored stage: reset tutorial-only score and begin the real stage from its first item after practice.
- Show the fixed stage's progress and finishing requirement. Piano goals count actual notes, independent of cosmetic score multipliers.
- Scope this correction to Adventure first. The user explicitly chose to leave the separate Battle campaign for later.

## Piano Flow — user correction, November 4, 2026

- A visible note is playable immediately with its matching A/S/D/F key or strip tap, anywhere on the visible board. Do not require it to reach a bottom line or a narrow rhythm window.
- Select the earliest visible unplayed note in the pressed lane. A visible note in another lane must remain playable even if an earlier note or an optional sustain exists elsewhere.
- Updated November 4 after live testing: short notes score on press; long notes require completing the hold for full note credit. Their heads remain playable immediately anywhere visible. Sound begins on press, and the trail must visibly remain through the hold. This supersedes the earlier optional-hold requirement.
- One fresh physical press collects one note. A held key must not collect later notes automatically. Different keys/fingers can work independently.
- Gameplay and help text must describe these rules. Rhythm backing must accommodate the player's immediate performance without delayed or duplicated melody/support attacks.
- Build recognizable musical phrases: repeat a two-bar melody/chord hook two or three times before a deliberate variation or turnaround. Bass, arpeggio voicing and percussion must reinforce the repeated phrase.
- Stage the first notes at the top entry edge during the countdown and let them descend from there. Do not start with an empty board and make notes appear halfway down the lanes.
- A brief foreground frame stall must not pause the game, jump chart beats, burst queued drum hits or penalize the player. Preserve intentional pauses and real background/visibility pauses.

## Leaderboard and bug reports — user correction, November 4, 2026

- Let players view the leaderboard without a leaderboard-specific terms acceptance screen. Keep player participation and server validation working.
- Submit bug reports directly to the server from Settings; do not require the player to open or configure email. Preserve the draft when delivery fails and acknowledge only a persisted report.
- The report inbox is private to a server-verified owner. Client flags or enabling a local admin UI must never grant report access. Retry the same accepted report without duplicating it.

## Readiness and audio presentation

- Complete local mode, menu, artwork, music and effect preparation before enabling play. Never start a gameplay clock while required assets are still loading.
- Keep preparation deduplicated, concurrency bounded and failures retryable. A failed preparation cannot be marked ready.
- Preserve saved music/SFX preferences. Match recorded-track loudness before those controls; preserve stereo and pitch. Ordinary correct taps must not repeatedly halve the music.
- Verify actual runtime audio routes, not just the presence of a recording in a package. Browser, native and portal builds must derive from the same verified source manifest.

## Reserved music reference

- Recorded October 31, 2026: “the indie song” / “indie background pack” for Shift Shift refers to `indie-game-soundtrack-251864.mp3`.
- Original: `C:/Users/kmoee/Downloads/Shift Shift - Indie Background Music/indie-game-soundtrack-251864.mp3`. Provenance and checksum are in `READ_ME.txt` and `asset-manifest.json` beside it.
- Reserve it for Shift Shift and exclude it from Chess Defense. Retain its existing use here; this note alone does not authorize adding it to another product or context.
