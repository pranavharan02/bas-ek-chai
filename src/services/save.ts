import type { Mode } from '../content/world';
export interface Settings {
  mute: boolean;
  music: number;
  effects: number;
  ambience: number;
  lowMotion: boolean;
  lowEffects: boolean;
  contrast: boolean;
  assisted: boolean;
  sutta: boolean;
  shirt: number;
  swipe: number;
  bindings: Record<string, string>;
}
export interface Campaign {
  seed: number;
  nextStage: number;
  banked: number[];
  assisted: boolean;
}
export interface SaveData {
  version: 1;
  settings: Settings;
  tutorials: { crossing: boolean; rush: boolean };
  campaign: Campaign;
  unlocked: boolean;
  cosmetics: number;
  best: Record<string, number>;
  introSeen: boolean;
}
export const SAVE_KEY = 'bas-ek-chai-v1';
export function defaults(): SaveData {
  return {
    version: 1,
    settings: {
      mute: false,
      music: 0.35,
      effects: 0.55,
      ambience: 0.2,
      lowMotion: false,
      lowEffects: false,
      contrast: false,
      assisted: false,
      sutta: false,
      shirt: 0,
      swipe: 24,
      bindings: { up: 'w', down: 's', left: 'a', right: 'd' },
    },
    tutorials: { crossing: false, rush: false },
    campaign: { seed: 7319, nextStage: 0, banked: [], assisted: false },
    unlocked: false,
    cosmetics: 1,
    best: {},
    introSeen: false,
  };
}
function validNum(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}
export function parseSave(raw: string | null): SaveData {
  if (!raw) return defaults();
  try {
    const x = JSON.parse(raw);
    const d = defaults();
    if (x.version !== 1) return d;
    if (x.settings && typeof x.settings === 'object') {
      for (const key of [
        'mute',
        'lowMotion',
        'lowEffects',
        'contrast',
        'assisted',
        'sutta',
      ] as const)
        if (typeof x.settings[key] === 'boolean')
          d.settings[key] = x.settings[key];
      for (const key of ['music', 'effects', 'ambience'] as const)
        if (validNum(x.settings[key], 0, 1)) d.settings[key] = x.settings[key];
      if (
        validNum(x.settings.shirt, 0, 2) &&
        Number.isInteger(x.settings.shirt)
      )
        d.settings.shirt = x.settings.shirt;
      if (validNum(x.settings.swipe, 12, 80))
        d.settings.swipe = x.settings.swipe;
      const bindings = x.settings.bindings;
      if (
        bindings &&
        ['up', 'down', 'left', 'right'].every(
          (k) =>
            typeof bindings[k] === 'string' &&
            /^[a-z0-9]$/.test(bindings[k]) &&
            !['p'].includes(bindings[k]),
        ) &&
        new Set(Object.values(bindings)).size === 4
      )
        d.settings.bindings = bindings;
    }
    if (x.tutorials) {
      d.tutorials.crossing = x.tutorials.crossing === true;
      d.tutorials.rush = x.tutorials.rush === true;
    }
    const c = x.campaign;
    if (
      c &&
      validNum(c.seed, 0, 4294967295) &&
      Number.isInteger(c.seed) &&
      validNum(c.nextStage, 0, 5) &&
      Number.isInteger(c.nextStage) &&
      Array.isArray(c.banked) &&
      c.banked.length === c.nextStage &&
      c.banked.every(
        (n: unknown) => validNum(n, 24, 39) && Number.isInteger(n),
      ) &&
      typeof c.assisted === 'boolean'
    )
      d.campaign = c;
    d.unlocked = x.unlocked === true;
    d.cosmetics =
      validNum(x.cosmetics, 1, 3) && Number.isInteger(x.cosmetics)
        ? x.cosmetics
        : 1;
    d.introSeen = x.introSeen === true;
    d.settings.shirt = Math.min(d.settings.shirt, d.cosmetics - 1);
    if (x.best && typeof x.best === 'object')
      for (const m of ['crossing', 'rush', 'endless'])
        for (const a of ['standard', 'assisted']) {
          const key = `${m}-${a}`;
          if (validNum(x.best[key], 0, 1e9))
            d.best[key] = Math.floor(x.best[key]);
        }
    return d;
  } catch {
    return defaults();
  }
}
export function bankStage(
  save: SaveData,
  stage: number,
  score: number,
): SaveData {
  if (
    stage !== save.campaign.nextStage ||
    stage < 0 ||
    stage > 4 ||
    score < 24 ||
    score > 39
  )
    return save;
  const d = structuredClone(save);
  d.campaign.banked.push(score);
  d.campaign.nextStage++;
  if (stage >= 2) d.cosmetics = Math.max(d.cosmetics, 2);
  if (stage === 4) {
    d.cosmetics = 3;
    d.unlocked = true;
    recordBest(
      d,
      'crossing',
      d.campaign.banked.reduce((a, b) => a + b, 0),
      d.campaign.assisted,
    );
  }
  return d;
}
export function recordBest(
  save: SaveData,
  mode: Mode,
  score: number,
  assisted: boolean,
) {
  const key = `${mode}-${assisted ? 'assisted' : 'standard'}`;
  save.best[key] = Math.max(save.best[key] ?? 0, score);
}
export function loadSave(): { save: SaveData; error: boolean } {
  try {
    return { save: parseSave(localStorage.getItem(SAVE_KEY)), error: false };
  } catch {
    return { save: defaults(), error: true };
  }
}
export function persist(save: SaveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
