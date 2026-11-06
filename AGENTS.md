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

- Updated November 4: load only core artwork and the main menu at startup. Prepare other modes, music and scenery on demand before their gameplay clocks begin. Do not preload all destinations or recordings on launch.
- Keep preparation deduplicated, concurrency bounded and failures retryable. A failed preparation cannot be marked ready.
- Preserve saved music/SFX preferences. Match recorded-track loudness before those controls; preserve stereo and pitch. Ordinary correct taps must not repeatedly halve the music.
- Verify actual runtime audio routes, not just the presence of a recording in a package. Browser, native and portal builds must derive from the same verified source manifest.

## Reserved music reference

- Recorded October 31, 2026: “the indie song” / “indie background pack” for Shift Shift refers to `indie-game-soundtrack-251864.mp3`.
- Original: `C:/Users/kmoee/Downloads/Shift Shift - Indie Background Music/indie-game-soundtrack-251864.mp3`. Provenance and checksum are in `READ_ME.txt` and `asset-manifest.json` beside it.
- Reserve it for Shift Shift and exclude it from Chess Defense. Retain its existing use here; this note alone does not authorize adding it to another product or context.

## Adventure presentation and retained assets - November 4, 2026
- Entry and pause missions share framed cards and filled gold stars; pause uses Resume. Collection requirements are centered shape/count icons in one tray.
- Show the entire result panel, including coins, player level, XP and Next level, throughout task-to-star animation.
- Keep successfully prepared images and map sections across navigation/scrolling. Only first use or an actual failure needs preparation; do not expose fallback scenery before Adventure art is drawable.

## Adventure classic presentation — November 5, 2026
- User explicitly confirmed the original 4.40 / 4.50 / 4.60 series, not 4.94.40 / 50 / 60. Restore pause tasks and the victory/reward sequence using archived 4.60.0. This supersedes the November 4 panel and always-visible reward layout requests.
- Keep the restored presentation separate from current music, authored stages, scores, loading and retained assets. Preserve accessible scrolling where the original fixed panel clipped controls.

- November 5 clarification: retain the full energy-to-center transformation, explosion, fireworks and all celebration sound cues. Dock the logo at the top, show the level title and resolve three missions sequentially (earned star or red failure), then tally rewards and offer Next level. Place the return-to-map instruction outside the panel. The 4.60 reference is not authorization to remove this celebration.

- Reward polish: resolve the task/star phase 2.5× faster while preserving the fireworks timing. Slide/fade totals and Next level upward within the result frame. Entry/pause collection goals use a taller shared tray with separate shape tiles and small bottom-right counts matching the gameplay HUD.

## Pause menus and online availability — November 5, 2026
- Practice hands, trails and teaching text must hide behind every pause, tasks and other modal menu, then resume without resetting the practice. Apply this to all modes.
- Paused Adventure missions match the compact level-entry layout: three framed cards, filled gold star icons, the shared goal tray and gold Resume button. Do not add a fourth finishing-instruction row or oversized progress rows. This supersedes the restored 4.60 pause-task layout; keep the victory sequence.
- A leaderboard connection failure must not block Endless play or put a connection-error paragraph over the home controls. Only server-verified runs can enter the online ranking.

## Results and single-tap input — November 5, 2026
- Endless results use the label Continue. Keep the existing completed-run exit destination.
- Speed up the mission-to-star phase by a further 2.5x; the user clarified this does not mean the gameplay countdown.
- Refill the visible Adventure choice artwork before it transforms into energy. This is presentation only: do not advance the engine, grant another turn, or alter score/XP.
- Each physical press activates one action and one tap cue. Consume compatibility clicks across screen changes; shared result controls must preserve each mode's handler.
- Shape Drop's entry and paused requirements share an illustrated numeric goal using existing game artwork.

## Tutorial and victory corrections — November 5, 2026
- Keep Adventure points goals and existing gameplay board sizes. Remove the new Shape Drop goal icons.
- Slow the current star-animation playback rate by 30%. Use the prompt “Tap anywhere to continue”; tapping the result background returns to the map.
- First five Adventure levels focus on matching, without inventory abilities or random pickup tutorials, including replays with later unlocks. Later ability help is requested by tapping an ability, never by interrupting play or requiring a charge to be spent.
- Tutorials use a finger and brief yellow HUD text (one or two lines), with no pop-up, Continue button or explanatory card. Apply to abilities and pickups as well as level mechanics.
- Before victory, generate and display a fully fresh board, as at a normal new round; do not just restore the old picked tile. Keep this presentation separate from score, XP, inventory and saved gameplay state.

## Adventure matching only — November 5, 2026
- Remove Shape Drop, Shape Slice and Piano Flow stages from the Adventure map. All Adventure levels use the normal matching game, its collection/memory goals and missions. Preserve map numbering, earned stars and saved completion. The separate Games modes remain available. This supersedes the earlier Adventure special-stage requirements.
- Slow the mission-to-star animation by another 30% relative to ui250; keep the countdown and energy/fireworks timing.

## Open map and world access — November 5, 2026
- Endless is available without Adventure progress. Unlock all 100 Adventure levels and all three background worlds for both new and existing saves. Keep earned stars, completed levels, wallet, XP, inventory and restoration achievements factual; access is not completion.
- Slow the mission-to-star animation by another 20% relative to ui251.

## Shop and achievement layout - November 5, 2026
- Shop tabs share the same bounded outer frame and header. Scroll only their contents; avoid tall empty panels and viewport overflow.
- Achievement scrolling ends after the currently visible rewards. Reserve extra clearance only while a real Collect all button is visible; future tiers do not reserve blank rows.
- Piano Flow long notes say HOLD, not TAP / HOLD. Retain required sustained input for full note credit.

## Shape skin selection - November 5, 2026
- Remove Starlight from the selectable skins. Keep exactly Classic, Candy Swirl, Cartoon Pop and Tiny Bots. Existing removed-skin selections fall back to Classic.

## Cloud Beacon celebration - November 5, 2026
- A single matching pair merges into one shape, fills the beacon completely, then the beacon sends four sequential beams that restore the island districts. Do not repeat the shape intake for each district.
- Lanterns keep rising during the camera pullback and the outgoing island slide, until that old island leaves the screen. Do not fade them with the camera or freeze them into a snapshot.
- Play synchronized effects for the merge, energy travel, beacon fill, beam launches and arrivals, honoring SFX settings independently of music.

- Beacon opening revision: show all four shape types and wait for one explicit tap, with large centered pulsing white TAP text and a hand. Merge those shapes into the single charge only after that tap. Keep lanterns moving for one second after docking before sliding to the next island.

- Beacon revision ui256: use a smaller left-hand tap pointer. Four shapes visibly gather, shine and become a gold star before entering the beacon. All four colored beams now launch simultaneously to their respective districts and spread color together; this supersedes sequential beams. Keep the tap gate and one-second lantern pause.

- Beacon correction ui257: rotate the original pointing hand upright without mirroring. Restore the original two-shape merge timing, curved glowing line and arrival particles, adapted to four starting shapes; remove the gold-star transformation. Retain simultaneous outward beams and the lantern pause.

## Final beacon release - November 5, 2026
- Supersedes older beacon presentation notes: start automatically with four offscreen shapes spiraling into the original merged energy trail. No TAP gate or hand. Use airy spiral SFX, a merge burst and chained fireworks: four waves of six large irregular bursts spread across the full viewport, without increasing the count. Four outbound beams launch in a quick overlapping stagger. Preserve rising lanterns through docking, the one-second hold and the slide.

## Gameplay viewport correction - November 5, 2026
- Adventure and Endless must fit the full HUD, square board, round timer and available ability controls inside the visible game viewport. User correction: positions must stay fixed across rounds. Reserve stable screen areas for the header, collection goals, board, timer, streaks and abilities, even when optional rows are hidden. Only tiles resize inside the board; changing row counts must not move the timer or controls. Retain bottom safe-area clearance.
- Await Adventure blocker artwork before revealing gameplay; retain loaded assets between visits. This is destination preparation, not permission to preload every mode at startup.
- Preserve the existing early-Adventure ability/tutorial unlock rules. Cache-version both the HTML entry and its bootstrap import when changing the runtime.
- Further user correction: the three ability buttons must remain visible in the first Adventure tutorial and early levels too. Show their locked state in the fixed footer; disable unavailable actions rather than hiding the buttons or their row. Preserve the no-forced-ability-tutorial rule.

## Winning-round refresh and personal preview — November 6, 2026
- The winning choice uses the ordinary round-transition delay. Do not wait for coin flights or collection-counter fade-outs before refreshing the complete board. A full-board preview may precede energy conversion only after that refresh.
- User explicitly wants all unlocks and unlimited coins for their personal preview only. Build it separately with scripts/build-personal-preview.py; keep its save slot isolated, restrict it to localhost, and exclude it from public release packages. Do not grant server administrator permissions or submit its scores to rankings.

## Piano order, late Adventure and retained menus — November 6, 2026
- Piano Flow shows NEXT on the earliest visible required note, or NEXT · HOLD for a long note. Play notes in chart order; later visible lanes do not score ahead of NEXT. The required note remains immediately playable anywhere visible. Active holds can sustain independently; unfinished released holds must be resumed in order. This supersedes the earlier any-visible-lane order rule. Wrong presses use the existing life penalty and deduct one available score point, without repeated charges for the same mistake.
- Level 100 uses Endless run inside the shared requirement frame. Entry, paused tasks and gameplay use the same centered memory-card face.
- Late Adventure levels should vary memory counts, collection targets and rule combinations while preserving earlier introductory levels.
- Retain painted map sections; do not recreate expensive terrain filters on scrolling. Cached menu artwork may need new DOM nodes decoded, but that alone must not reopen the loading screen.
- Use the regenerated transparent ability-shield/time/boost-ui268.webp assets for the Shield, double-time and five-times-reward controls.

## Result prompts and mode piano accompaniment — November 6, 2026
- Every result screen uses bold uppercase TAP ANYWHERE TO CONTINUE, centered horizontally and halfway between the actual outer frame bottom and the game viewport bottom. Recalculate after resize and reward-panel height changes; keep it outside the frame. Preserve save-failure guidance when continuing is unavailable.
- Adventure, Endless, Shape Drop, Shape Slice and Battle use the 271 masters with repeating acoustic-piano accompaniment fitted to the existing chord chart and tempo. Preserve Piano Flow and menu tracks. Renderer and score provenance: scripts/music271/piano-chords.py.

## Clear piano melody correction — November 6, 2026
- Supersedes the 271 chord accompaniment: use 272 masters built directly from the original 239 backing tracks plus clear, dry, single-note piano melodies. No new sustained chord bed or reverb. Each mode has a distinct authored hook that repeats exactly before an answering phrase and return. Source: scripts/music272/piano-melodies.py. Piano Flow and menu music stay unchanged.
- Endless begins at 108 BPM and smoothly increases toward 170 BPM with run intensity. Keep the piano and original backing synchronized and preserve pitch; retain pause/resume and rewind recovery.

## Piano tone clarity — November 6, 2026
- The 272 melody was still unclear to the user. Current local candidate 273 uses lossless Salamander Grand Piano V3 FLAC samples, source SFZ retuning and onset offsets, velocity layers 8/9, bandlimited resampling limited to one semitone, short natural releases and narrowed stereo. No added piano reverb.
- Preserve the written 272 hooks and original 239 bass/drum/harmony events. Lower the competing original melody bus 10 dB so the new piano is foreground. Piano Flow/menu tracks and Endless tempo behavior are unchanged. Renderer/provenance: scripts/music273/clear-piano.py and instrument-manifest.json.
- This is a local listening candidate; user has been offered a piano-only audition to distinguish tone from composition. Technical tests do not establish subjective musical quality. No piano plugin was found connected or installed; do not claim one was used.

## Soundtrack family — November 6, 2026
- User approved 273's clear piano tone. The next concern is the stylistic jump from the indie menu recording into gameplay. They explicitly chose distinct mode tracks with the indie track's musical style, rather than using the menu recording as every mode's foundation.
- Local candidate 274 retains that piano voice, each mode's written hook/key/tempo and the existing bass/drum event patterns. Use a lighter low end, short plucked backing chords and quieter competing lead; omit the old sustained pad. Source: scripts/music274/indie-family.py. Menu recordings and Piano Flow remain unchanged. Subjective musical cohesion still needs the user's listening judgment.
- Endless music follows gameplay intensity, retains pitch and playback position, and responds to both time abilities as well as rewind. Each active time ability reduces the target by 12 BPM; rewind reduces it by 18 BPM with the existing recovery. Smoothly return to retained run pressure as effects end. This is music-only; do not change gameplay speed or ability duration.

## Late-level progression — November 6, 2026
- Replace the repeating late-level requirement-count cycle with bounded, nondecreasing steps from levels 70 through 99. Retain shape/color variety and earlier introductory requirements.
- Level 98 requires 10 flip cards, 10 red squares and 9 blue stars. Level 99 requires 10 flip cards, 10 red stars and 10 blue circles; it retains the color-only matching intervals and increases hidden cards from four to five. Level 100 remains the Endless run.

## Release 247 presentation — November 6, 2026
- Level 100's requirement and gameplay label is FINAL RUN, exactly in uppercase. Its existing endless gameplay remains.
- Show the four Shop skins compactly in one tray: remove descriptive subtitles, retain skin names and purchase/equip/locked actions, and preserve square preview artwork. Use two rows in portrait and one row of four in landscape.
- User explicitly authorized publishing this updated build to Playgama, GitHub and the existing Google Play track, with the current music and fixes. Publish the public build; personal preview unlocks/unlimited coins remain excluded.

## Release 248 Shop and Google achievements - November 6, 2026
- Skin actions (Buy, Equip, Equipped and locked level labels) use the same full-width 48px gold button. Define the skin card grid column explicitly so text never changes its footprint. Put the coin icon before the price. Preserve four compact skins and all prices/unlock rules.
- Android Google achievements use the published Shape Shift Play Games project 223390978532 and the public mappings in platforms/android-native/play-games.properties. The native overlay must be copied by build-editions.py. Initialize the SDK in the Application; save pending awards and acknowledge successful sync per Google account. Sign-in is optional and must not gate gameplay. Keep localhost personal-preview progress excluded from Google and leaderboard uploads.
- The user specifically requested public Google Play production release and approved the Google terms and sign-in configuration.
