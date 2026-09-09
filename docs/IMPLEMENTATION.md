# Bas Ek Chai implementation notes

The canonical design brief is [Bas-Ek-Chai-PRD.md](Bas-Ek-Chai-PRD.md), recovered from the earlier **Design Indian pixel road game** conversation on 9 September 2026. The PRD is retained unchanged.

## Architecture

- Phaser 4.2.1 renders a 288 × 384 logical playfield. A dynamically loaded view keeps the game engine out of the opening menu bundle.
- `src/game/simulation.ts` owns the 60 Hz state, movement, collisions, scores and event order. Phaser physics does not independently move actors.
- Crossing uses 24 rows per stage, full-width refuges every six rows, deterministic lane schedules, static sidewalk obstacles, timed rail barriers and signal-held traffic. A seed belongs to the campaign; stage retries retain it.
- Rush Hour uses independent lane/action state, bounded speed, twelve authored patterns, validated joins and recovery space. The initial 150 metres use avoidance only. All ordinary obstacles are visible for more than 1.5 seconds at maximum speed.
- One frame clock freezes play during pause, countdown, backgrounding or an interruption over 250 ms. Assistance is captured at run start.
- One validated localStorage snapshot contains checkpoint scores, next stage, preferences, cosmetic unlocks and separate standard/assisted best scores.
- Original audio is synthesized after an intentional interaction. One controller owns the music scheduler and ambience, with distinct music/effects/ambience buses.

## Production decisions and PRD deviations

1. The Sites scaffold adds a thin React/Vinext menu and static export around Phaser. React renders menus and a throttled HUD, never individual gameplay pixels or simulation ticks. This preserves the Phaser/TypeScript/Vite game baseline while using the available publishing pipeline.
2. All Indian identity sprites are native-pixel editable production code in `assets-source/export_sprites.py`. This is the deterministic source format rather than a proprietary Pixelorama/Aseprite project. Exported sheets include 324 stored frames across three colour variants; some poses intentionally reuse pixel data. Stored frame count is not a claim of 324 distinct drawings.
3. The office and finale use original generated pixel illustrations with separate live character animation. Prompts and lossless originals are retained. A separate six-frame clock-out vignette closes the laptop and collects the bag; the illustrated backdrop remains static.
4. Original chiptune synthesis replaces the un-auditioned stock music shortlist. The composition, lossless audition master and numerical audio analysis are retained. Numerical checks do not replace listening tests.
5. Conservative runner generation always retains a reachable empty lane. Jump and slide are taught and usable shortcuts; it does not force every player to take those actions on every pattern.
6. The corpus now includes 10,000 exact endless-crossing route replays per difficulty band (50,000 total), plus 200 full campaign route replays, 50,000 crossing-content checks and 50,000 runner cases. Crossing routes use the actual schedules and swept collision model with an added 350 ms reaction margin. This is finite evidence, not proof that every possible seed is fun or universally solvable.
7. The release is a complete playable first build, not a claim that five-person playtests, physical phone performance, ten-loop listening, or full browser certification have happened. See the acceptance report for evidence boundaries.

## Security and delivery

The production output is static: no accounts, server endpoints, credentials, database or uploads. Patched scaffold versions are pinned in `package-lock.json`. The `sharp` override resolves a transitive image-decoder advisory in development tooling; the game does not decode uploaded images. Source credentials are never written to the repository. CI rebuilds the game and retains its deployable static artifact.

Node 22 is pinned as a local development tool because the current Vinext CLI's forced shutdown after static export triggers a libuv assertion on Windows Node 24.14.1 and 24.19.0. Node 22 completed the same export with exit code zero. No build error is ignored or rewritten as success.
