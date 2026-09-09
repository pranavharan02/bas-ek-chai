import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root = process.cwd();
const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const records = readdirSync('public/assets')
  .sort()
  .map((file) => {
    const runtime = `public/assets/${file}`;
    let creator = 'Bas Ek Chai original production',
      source = 'assets-source/export_sprites.py',
      license = 'Original project asset; no third-party pack content',
      url = null,
      edits =
        'Deterministic source-pixel export with transparent frame padding';
    if (file === 'city.png') {
      creator = 'Kenney';
      source = 'Kenney Roguelike Modern City v2.0 / Tilemap/tilemap_packed.png';
      license = 'CC0-1.0';
      url = 'https://kenney.nl/assets/roguelike-modern-city';
      edits =
        'Original packed atlas; selected tiles composed at runtime; no repainting';
    }
    if (file.endsWith('.webp')) {
      creator = 'OpenAI image generation, commissioned for Bas Ek Chai';
      source = `assets-source/scenes/${file.replace('.webp', '-original.png')}`;
      license = 'Generated for this project; applicable OpenAI service terms';
      edits = 'Lossless WebP conversion; original PNG and prompt retained';
    }
    return {
      id: file,
      creator,
      source,
      sourceUrl: url,
      license,
      licenseFile: file === 'city.png' ? 'licenses/Kenney-City.txt' : null,
      acquisitionDate: '2026-09-09',
      runtimePath: runtime,
      bytes: statSync(runtime).size,
      sha256: hash(runtime),
      sourceSha256: existsSync(source) ? hash(source) : null,
      edits,
    };
  });
records.push({
  id: 'favicon.svg',
  creator: 'Bas Ek Chai original production',
  source: 'public/favicon.svg',
  sourceUrl: null,
  license: 'Original project icon',
  licenseFile: null,
  acquisitionDate: '2026-09-09',
  runtimePath: 'public/favicon.svg',
  bytes: statSync('public/favicon.svg').size,
  sha256: hash('public/favicon.svg'),
  sourceSha256: hash('public/favicon.svg'),
  edits: 'Original source-editable SVG cup icon',
});
const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  records,
  fonts: {
    name: 'Pixelify Sans',
    creator: 'The Pixelify Sans Project Authors',
    package: '@fontsource/pixelify-sans',
    version: '5.3.0',
    license: 'OFL-1.1',
    licenseFile: 'licenses/Pixelify-Sans-OFL.txt',
  },
  music: {
    title: 'The Long Way to a Small Joy',
    creator: 'Original Bas Ek Chai composition',
    source: 'assets-source/music-score.json',
    sourceSha256: hash('assets-source/music-score.json'),
    master: 'assets-source/the-long-way-master.wav',
    masterSha256: hash('assets-source/the-long-way-master.wav'),
    runtime: 'src/services/audio.ts',
    method:
      'Web Audio oscillators and deterministic noise; no third-party samples',
  },
};
writeFileSync(
  'docs/asset-manifest.json',
  JSON.stringify(manifest, null, 2) + '\n',
);
for (const r of records) {
  if (hash(path.join(root, r.runtimePath)) !== r.sha256)
    throw Error('Asset hash mismatch');
}
console.log(
  `${records.length} runtime assets verified; ${(records.reduce((s, r) => s + r.bytes, 0) / 1048576).toFixed(2)} MiB before HTTP compression.`,
);
