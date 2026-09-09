# Release acceptance — first playable build

9 September 2026. This report separates implementation, automated evidence, focused integration evidence and checks that have not happened.

## Recorded evidence

- `npm run typecheck` passes.
- Gameplay regression suite covers movement, swept collision, token/death priority, rail barriers, atomic checkpoints, ending parity, jump/slide restrictions, frozen clocks, save corruption/denial and assisted score separation.
- `docs/evidence/generation-corpus.json`: **50,000 exact endless-crossing route replays**, **200 full campaign route replays**, **50,000 crossing-content cases**, **50,000 runner cases**, all **144 runner pattern joins**, and two deliberately impossible/unreachable pattern rejections. Routes retain a 350 ms reaction allowance. This is finite coverage.
- A 20-minute **simulated** runner run verifies bounded actor and pickup-ID collections. It is not a browser/device memory profile.
- `npm run build` completed with exit code zero under the pinned Node 22 runtime. Static output contains `dist/client/index.html` and local assets. Windows Node 24's upstream shutdown failure was resolved by pinning Node 22, not by ignoring the exit code.
- `npm audit`: zero known vulnerabilities after targeted scaffold updates and a patched image-decoder override.
- SHA-256 equality confirms the recovered PRD copy matches the original: `7524390f1a9dd07a7c5fe6dfe5e018c78c0163f92b4815eae86478a4fe25f567`.
- Focused WebMCP checks verified registration, schemas and valid/invalid calls for `read_game_status`, `start_game`, `pause_game` and `return_home`. Both Rush Hour and Crossing reached `rendererReady: true`. Invalid input was rejected without changing the mode. This is not a visual playtest.
- Source scene illustrations and the sprite contact sheet were inspected as images. This does not certify integrated phone-scale scene quality.
- `assets-source/music-analysis.json`: original 10-second lossless master, no clipped samples, peak about 0.232, boundary delta zero. These are numerical checks, not listening evidence.

## PRD acceptance ledger

**Automated** means the stated rule has executable evidence. **Partial** means implementation and some evidence exist, but the full PRD case has not been observed. **Pending** is not a pass.

| IDs | Status | Evidence or remaining check |
|---|---|---|
| H01 | Partial | Both modes available and both renderers load through structured controls. Full clean-profile audio/visual observation pending. |
| H02 | Partial | Timed/skippable opening and persisted `introSeen` implemented; integrated animation observation pending. |
| H03 | Partial | Semantic keyboard/touch controls implemented. Complete keyboard-only and touch-only journeys pending. |
| H04 | Partial | Gameplay only receives filtered keys/swipes/explicit control commands. Browser click-through test pending. |
| H05 | Partial | Separate run state and view teardown implemented; focused mode transitions succeeded. Fifty browser retries pending. |
| H06 | Partial | Essential-image recovery state and silent audio fallback implemented. Browser resource-denial injection pending. |
| H07 | Partial | Gesture cancellation, blur/visibility/resize pause implemented. Real rotation/background tests pending. |
| C01–C04 | Automated | Discrete/expiring input, wait safety, blocking/retreat, no duplicate score and relative swept contacts tested. |
| C05 | Partial | All five stages complete in exact simulation routes. Visual identity and readability need integrated review. |
| C06–C08 | Automated | Stable retry seed, atomic/idempotent stage banking, token/death event priority tested. |
| C09 | Partial | Persistent finale unlock, cosmetics and best score tested; full new-campaign UI/reload journey pending. |
| C10 | Partial | Safe retreat boundary blocks movement in simulation; visual marker inspection pending. |
| R01 | Partial | Rush Hour starts before campaign completion and renderer loads. Tutorial playthrough pending. |
| R02–R05 | Automated | Travel-path collision, jump window, full-height avoidance, slide restrictions and action recovery tested. |
| R06 | Automated | Speed is capped and spawn-to-contact warning distance exceeds 1.5 seconds. Phone input latency remains unmeasured. |
| R07 | Automated | Impossible/unreachable patterns reject; bounded selector and recovery pattern exist; 144 joins checked. |
| R08 | Automated | Paused/countdown frames freeze ticks, distance and action timers; a long frame advances zero unseen ticks. |
| R09–R10 | Partial | Cow/pedestrian contact ends the player's run; separate scores and clean retries tested. Stumble animation review pending. |
| V01–V04 | Pending | Integrated office/crossing/runner, phone-scale art, atlas bleed, rain/night contrast and action animation clips have not been visually certified. |
| A01 | Partial | Gesture-gated audio and blocked-playback recovery implemented. Browser/device listening pending. |
| A02–A03 | Pending | Ten seam auditions, warning mix, headphones/phone speakers and repeated browser audio lifecycle tests pending. |
| E01–E02 | Partial | Both endings have identical progression/score; original cup/sutta frames and finale scene exist. Integrated ending clips pending. |
| Q01–Q02 | Automated | Seed replay deterministic; game logic does not consume cosmetic randomness. |
| Q03 | Automated | Corpus and adversarial evidence described above. Finite coverage is not universal proof or a fun/balance claim. |
| Q04 | Automated | Invalid schema/ranges/IDs and unavailable local storage recover to playable defaults. |
| Q05–Q06 | Automated | Interruption/frozen-clock and standard/assisted categories tested. |
| Q07 | Partial | Simulated 20-minute collection bounds pass. Physical-device performance, browser memory/audio counts and 50 retries pending. |
| Q08 | Partial | Local type-check/tests/export pass; both renderers load in development. Cross-browser production playthrough and clean CI receipt are separate checks. |
| Q09 | Automated | Local asset hash/source/licence inventory produced; no runtime marketplace/audio hotlinks. |
| Q10 | Partial | Full required feature set implemented and deviations documented. Unperformed human/device/visual/listening gates remain explicit. |

## Browser testing boundary

Broad browser playtesting was offered while work continued. It has not been marked complete. The Sites workflow requires an explicit user request before screenshots, DOM-driven playtests, resizing or visual QA. Only the separately required, focused WebMCP contract check was performed. Physical Android and iPhone access and five first-time human playtesters are also unavailable in this run.

## Release interpretation

This is a playable first release with both complete modes, all five campaign stages, original art/audio, local progression and a chai finale. It is not a claim that the PRD's entire experiential quality gate has passed. Do not relabel pending evidence as passed in release notes.
