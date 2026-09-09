# Credits and asset provenance

**Created for:** pranavharan02. **Original game:** Bas Ek Chai.

## Third-party art and typography

- **Kenney, Roguelike Modern City v2.0.** Source: <https://kenney.nl/assets/roguelike-modern-city>. CC0-1.0; the embedded licence is retained at `licenses/Kenney-City.txt`. The runtime uses its packed 16-pixel tile atlas. No creator logo or endorsement is implied.
- **The Pixelify Sans Project Authors.** Package `@fontsource/pixelify-sans` 5.3.0. SIL Open Font License 1.1, retained at `licenses/Pixelify-Sans-OFL.txt`. Fonts are bundled locally, not fetched from a font service during play.

## Original production

- The office worker, clothing variants, auto, bus/taxi treatments, cows, handcarts, scooters, bikes, pedestrian, drain, crate, overhead frame, cups and clock-out sequence are source-editable native-pixel exports. The deterministic source is `assets-source/export_sprites.py`.
- The office neighbourhood and chai-stall illustrations were generated with OpenAI's built-in image-generation tool for this project. The original images and prompt records are in `assets-source/scenes/`; the game uses lossless WebP conversions.
- “The Long Way to a Small Joy” is an original composition. Its melody, bass and chord data are in `assets-source/music-score.json`. Oscillators and deterministic noise create the music, movement sounds, pickup, failure, railway bell and ambience; no film audio, sampled speech or stock music is used.

## Software

Phaser 4.2.1 (MIT), React, Vinext, Vite and the installed UI/build packages retain their upstream licences. The exact dependency graph is locked in `package-lock.json`.

The manifest at `docs/asset-manifest.json` records the bytes actually shipped. Generated illustrations and original project assets are distinguished from CC0 resources; a CC0 licence is not claimed for material that did not come from that source.
