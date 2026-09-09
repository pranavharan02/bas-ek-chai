# Bas Ek Chai

**Five streets. A little chaos. One very good reason to get home.**

An original browser pixel game set during an Indian office worker's evening commute. Built from the recovered [product requirements document](docs/Bas-Ek-Chai-PRD.md).

![The evening neighbourhood](assets-source/scenes/office-original.png)

## Play

- **Cross the Road:** a five-stage campaign through Office Gully, Bazaar Road, Monsoon Junction, Railway Approach and Chai Chowk. Observe, wait, hop, collect optional chai, and bank each completed street.
- **Rush Hour:** an independently available three-lane endless runner. Change lanes, jump low crates and slide under overhead frames.
- **Endless Crossing:** unlock it by finishing the campaign.
- Reach the warm-lit chai stall. The optional chai-and-sutta variant changes only the ending animation.

The hosted Sites build uses owner-only access by default. A verified release link is recorded in the GitHub release notes after deployment. The source and downloadable static build are public in this repository.

## Run locally

```sh
npm ci
npm run dev
```

Open the local URL printed by the server. The package pins a local Node **22.23.2** runtime for reproducible commands; Node 22 is also used in CI. Node 24 on Windows currently triggers an upstream Vinext/libuv shutdown assertion after static export.

```sh
npm run typecheck
npm test
npm run test:corpus
npm run build
npm start
```

The production build is **`dist/client`**. `npm start` serves it at `http://localhost:4173`. Deploy that directory to a static host at the domain root. This release does not advertise offline reload or app-store packaging.

## Controls

| Action | Crossing | Rush Hour |
|---|---|---|
| ↑ / W / swipe up | Hop forward | Jump |
| ↓ / S / swipe down | Hop backward | Slide |
| ← / A, → / D | Hop sideways | Change one lane |
| P / Esc | Pause | Pause |

Labelled touch buttons mirror those controls. Settings include key remapping, swipe sensitivity, three volume buses, mute, low motion, reduced effects, a high-contrast player and assisted pace. Standard and assisted best scores are separate. Progress stays in local browser storage; there are no accounts, ads, purchases or paid revives.

## Art and music sources

- [Original sprite exporter](assets-source/export_sprites.py): hero directions, hops, running, jumping, sliding, stumbling, arrival, optional ending, office sequence and Indian street objects. `npm run assets:export` requires Python and Pillow.
- [Original scene illustrations and prompts](assets-source/scenes/prompts.json): built-in OpenAI image generation, with lossless PNG originals and lossless WebP runtime exports.
- [Original music score](assets-source/music-score.json), [audition master](assets-source/the-long-way-master.wav), and [synthesis source](src/services/audio.ts). The optional master exporter requires Python and NumPy.
- [Asset manifest](docs/asset-manifest.json): actual runtime SHA-256 hashes, provenance, sources and licence records.
- [Credits](CREDITS.md): Kenney city tiles, Pixelify Sans, Phaser, and original production work.

## Verification and limits

See [acceptance and evidence](docs/ACCEPTANCE.md), [generation corpus results](docs/evidence/generation-corpus.json), and [implementation decisions](docs/IMPLEMENTATION.md).

This is a complete playable first build. Automated simulation checks and finite generation coverage are not a substitute for first-time player observations, physical Android/iPhone performance or headphone/phone-speaker listening. Those checks are explicitly marked pending rather than implied by a successful build.

## Project structure

```text
app/                 accessible menus, HUD, input and lifecycle adapter
src/game/            fixed clock, simulation, collision, validation, Phaser view
src/content/         stages, hazards, authored runner patterns and tuning
src/services/        versioned local saves and original audio
assets-source/       editable art, original illustrations and music masters
public/assets/       selected local runtime assets
tests/               gameplay and persistence regression tests
docs/                original PRD, decisions, provenance and evidence
```

Original project content is published for review without granting a blanket third-party asset licence. Third-party components retain their own licences; see `licenses/` and their package notices.
