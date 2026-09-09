import Phaser from 'phaser';
import { CELL, STAGES, HAZARDS, hash, type HazardKind } from '../content/world';
import {
  Simulation,
  crossingActors,
  obstacles,
  rowType,
  trainWarning,
  trainPhase,
  type Actor,
} from './simulation';
import type { Settings } from '../services/save';

export interface GameViewOptions {
  simulation: () => Simulation | null;
  settings: () => Settings;
  advance: (delta: number) => void;
  ready: () => void;
  error: (message: string) => void;
}
type Source = HTMLImageElement | HTMLCanvasElement;
const SMALL: HazardKind[] = [
  'scooter',
  'bike',
  'bicycle',
  'cow',
  'pedestrian',
  'cart',
  'parked',
  'drain',
  'crate',
  'banner',
];
export function createGameView(parent: HTMLElement, options: GameViewOptions) {
  class Commute extends Phaser.Scene {
    surface!: Phaser.Textures.CanvasTexture;
    ctx!: CanvasRenderingContext2D;
    images: Record<string, Source> = {};
    loaded = false;
    constructor() {
      super('commute');
    }
    preload() {
      this.load.image('city', '/assets/city.png');
      this.load.image('hero', '/assets/hero.png');
      this.load.image('cup', '/assets/cup.png');
      for (const k of Object.keys(HAZARDS))
        this.load.image(k, `/assets/${k}.png`);
      this.load.on('loaderror', (file: Phaser.Loader.File) =>
        options.error(
          `Could not load ${file.key}. Please retry to restore the scene.`,
        ),
      );
    }
    create() {
      for (const k of ['city', 'hero', 'cup', ...Object.keys(HAZARDS)]) {
        if (!this.textures.exists(k)) {
          options.error('A street image is missing. Retry to reload the game.');
          return;
        }
        this.images[k] = this.textures.get(k).getSourceImage() as Source;
      }
      this.surface = this.textures.createCanvas('scene-canvas', 288, 384)!;
      this.ctx = this.surface.getContext();
      this.ctx.imageSmoothingEnabled = false;
      this.add.image(0, 0, 'scene-canvas').setOrigin(0);
      this.loaded = true;
      options.ready();
      this.game.canvas.addEventListener('webglcontextlost', () =>
        options.error(
          'The display was interrupted. Retry to restore the game.',
        ),
      );
    }
    update(_time: number, delta: number) {
      if (!this.loaded) return;
      options.advance(delta);
      const sim = options.simulation();
      if (!sim) return;
      this.draw(sim, options.settings());
      this.surface.refresh();
    }
    tile(sx: number, sy: number, x: number, y: number, w = 16, h = 16) {
      this.ctx.drawImage(
        this.images.city,
        sx,
        sy,
        w,
        h,
        Math.round(x),
        Math.round(y),
        w,
        h,
      );
    }
    cup(x: number, y: number, tick: number) {
      this.ctx.drawImage(
        this.images.cup,
        (Math.floor(tick / 12) % 4) * 16,
        0,
        16,
        20,
        Math.round(x - 8),
        Math.round(y - 18),
        16,
        20,
      );
    }
    actor(a: Actor, x: number, y: number, tick: number, runner = false) {
      const ctx = this.ctx,
        img = this.images[a.kind];
      if (!img) return;
      const small = SMALL.includes(a.kind);
      const sw = small ? 40 : img.width,
        sh = 40;
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      if (!runner && a.dir < 0) ctx.scale(-1, 1);
      ctx.fillStyle = '#16252b55';
      ctx.fillRect(-a.w / 2, -1, a.w, 5);
      if (a.kind === 'train') {
        for (let n = -2; n <= 1; n++)
          ctx.drawImage(img, 0, 0, 92, 40, n * 86, -31, 92, 40);
      } else if (runner && !small) {
        // Cars share their oblique perspective in both modes; no arbitrary raster rotation.
        const w = a.kind === 'bus' ? 60 : 44;
        ctx.drawImage(img, 0, 0, sw, sh, -w / 2, -31, w, 36);
      } else {
        const f =
          small && ['cow', 'pedestrian', 'bicycle'].includes(a.kind)
            ? Math.floor(tick / 18) % 2
            : 0;
        ctx.drawImage(img, f * sw, 0, sw, sh, -sw / 2, -31, sw, sh);
      }
      ctx.restore();
    }
    player(sim: Simulation, x: number, y: number, settings: Settings) {
      const p = sim.player;
      let row = 0,
        frame = 0,
        offset = 0;
      const dir = ['up', 'down', 'left', 'right'].indexOf(p.direction);
      const base = settings.shirt * 108;
      if (sim.status === 'failed') {
        row = base + 90;
        frame = Math.min(5, Math.floor(sim.tick / 4) % 6);
      } else if (sim.mode === 'rush') {
        if (p.action === 'jump') {
          row = base + 78;
          frame = Math.min(5, Math.floor(p.actionTick / 7));
          offset = Math.sin((p.actionTick / 42) * Math.PI) * 21;
        } else if (p.action === 'slide') {
          row = base + 84;
          frame = Math.floor(p.actionTick / 6) % 6;
        } else {
          row = base + 72;
          frame = Math.floor(sim.tick / 5) % 6;
        }
      } else if (p.hop) {
        row = base + 48 + dir * 6;
        frame = Math.min(5, Math.floor(p.hop.elapsed / 2));
        offset =
          Math.sin((p.hop.elapsed / 12) * Math.PI) *
          (settings.lowMotion ? 2 : 6);
      } else {
        row = base + dir * 6;
        frame = Math.floor(sim.tick / 30) % 2;
      }
      const i = row + frame;
      const ctx = this.ctx;
      ctx.fillStyle = '#17222b66';
      ctx.beginPath();
      ctx.ellipse(Math.round(x), Math.round(y + 1), 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      if (settings.contrast) {
        ctx.strokeStyle = '#fff3b0';
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(x - 12), Math.round(y - 28 - offset), 24, 31);
      }
      ctx.drawImage(
        this.images.hero,
        (i % 6) * 24,
        Math.floor(i / 6) * 32,
        24,
        32,
        Math.round(x - 12),
        Math.round(y - 28 - offset),
        24,
        32,
      );
    }
    pavement(
      x: number,
      y: number,
      width: number,
      height: number,
      stage: number,
    ) {
      const ctx = this.ctx;
      ctx.fillStyle = STAGES[stage].palette.ground;
      ctx.fillRect(x, y, width, height);
      for (let yy = 0; yy < height; yy += 16)
        for (let xx = 0; xx < width; xx += 16) {
          this.tile(
            stage === 2 ? 96 : stage === 4 ? 48 : 0,
            320,
            x + xx,
            y + yy,
          );
        }
      ctx.fillStyle = stage >= 3 ? '#182a3a33' : '#b0915718';
      ctx.fillRect(x, y, width, height);
    }
    roadside(y: number, stage: number, seed: number) {
      // Decorative street furniture lives at the margins of safe stops, behind the player.
      const ctx = this.ctx;
      const h = hash(seed, Math.floor(y));
      this.tile(496 + (h % 4) * 16, 160, 0, y - 3, 16, 32);
      this.tile(496 + ((h + 2) % 4) * 16, 160, 272, y - 3, 16, 32);
      if (stage === 1 || stage === 4) {
        this.tile(352, 160, 32, y + 2, 32, 16);
        this.tile(416, 160, 224, y + 2, 32, 16);
      }
      ctx.fillStyle = '#f4cd8733';
      ctx.fillRect(17, y + 8, 2, 6);
      ctx.fillRect(269, y + 8, 2, 6);
    }
    drawCross(sim: Simulation, settings: Settings) {
      const ctx = this.ctx,
        stage = sim.renderStage,
        palette = STAGES[stage].palette;
      const scheduleStage = sim.mode === 'endless' ? -1 : stage;
      const camera = sim.player.y;
      const screenY = (y: number) => 318 - (y - camera);
      const min = Math.max(sim.boundary, Math.floor((camera - 90) / CELL)),
        max = Math.ceil((camera + 340) / CELL);
      ctx.fillStyle = palette.ground;
      ctx.fillRect(0, 0, 288, 384);
      for (let row = max; row >= min; row--) {
        const y = Math.round(screenY(row * CELL) - 16);
        const type = rowType(scheduleStage, row);
        if (type === 'safe') {
          this.pavement(0, y, 288, 32, stage);
          ctx.fillStyle = '#b5b5a066';
          ctx.fillRect(0, y, 288, 2);
          ctx.fillStyle = '#25394355';
          ctx.fillRect(0, y + 30, 288, 2);
          if (row % 6 === 0) {
            for (let x = 24; x < 270; x += 32) {
              ctx.fillStyle = '#829d832d';
              ctx.fillRect(x, y + 8, 16, 14);
            }
            if (row > 0) this.roadside(y, stage, sim.seed + row);
          }
        } else if (type === 'road') {
          ctx.fillStyle = palette.road;
          ctx.fillRect(0, y, 288, 32);
          ctx.fillStyle = '#d2cdb04d';
          for (let x = 12; x < 288; x += 48) ctx.fillRect(x, y + 30, 24, 1);
          ctx.fillStyle = '#172e381f';
          for (let x = 0; x < 288; x += 13)
            ctx.fillRect(x + (row % 3), y + 8 + (x % 15), 2, 1);
          if (stage === 2) {
            ctx.fillStyle = '#70afb329';
            for (let x = 0; x < 288; x += 63) ctx.fillRect(x, y + 22, 25, 3);
          }
          ctx.fillStyle = '#e8d7ac55';
          ctx.font = '9px monospace';
          ctx.fillText(
            row % 2 === 0 ? '›' : '‹',
            row % 2 === 0 ? 3 : 279,
            y + 20,
          );
        } else {
          ctx.fillStyle = '#4b4b50';
          ctx.fillRect(0, y, 288, 32);
          ctx.fillStyle = '#7a6e5f';
          for (let x = 0; x < 288; x += 12) ctx.fillRect(x, y + 3, 4, 26);
          ctx.fillStyle = '#b4b9ad';
          ctx.fillRect(0, y + 7, 288, 2);
          ctx.fillRect(0, y + 23, 288, 2);
          const warn = trainWarning(sim.tick, row);
          ctx.fillStyle = warn ? '#f2ba61' : '#b5c8a2';
          ctx.fillRect(2, y - 4, 7, 6);
          ctx.fillRect(279, y - 4, 7, 6);
          if (warn) {
            ctx.fillStyle = '#e5b759';
            ctx.fillRect(0, y + 31, 288, 2);
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff1c7';
            ctx.fillText(
              trainPhase(sim.tick, row) < 420
                ? 'STOP · TRAIN APPROACHING'
                : 'STOP · TRAIN PASSING',
              144,
              y + 20,
            );
            ctx.textAlign = 'left';
          }
        }
        if (
          row === sim.boundary &&
          sim.mode === 'endless' &&
          sim.boundary > 0
        ) {
          ctx.fillStyle = '#c6b67b';
          ctx.fillRect(0, y + 30, 288, 4);
          for (let x = 0; x < 288; x += 12) {
            ctx.fillStyle = '#39454b';
            ctx.fillRect(x, y + 30, 6, 4);
          }
        }
        if (row === 24 && sim.mode === 'crossing') {
          ctx.fillStyle = '#304b42';
          ctx.fillRect(0, y, 288, 32);
          ctx.fillStyle = '#e5c57f';
          for (let x = 0; x < 288; x += 16) ctx.fillRect(x, y + 27, 8, 4);
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(
            stage === 4 ? 'CHAI IS READY' : 'SAFE & SOUND',
            144,
            y + 17,
          );
          ctx.textAlign = 'left';
        }
        if (row > 0 && row % 8 === 4 && !sim.collected.has(`chai-${row}`)) {
          this.cup(
            ((hash(sim.seed, row + 99) % 7) + 1) * 32 + 16,
            y + 16,
            sim.tick,
          );
        }
      }
      const actors = sim.practice
        ? []
        : [
            ...crossingActors(scheduleStage, sim.seed, sim.tick, min, max),
            ...obstacles(scheduleStage, sim.seed, min, max),
          ];
      const sorted = actors
        .map((a) => ({ a, y: screenY(a.y) }))
        .sort((a, b) => a.y - b.y);
      let drawn = false;
      for (const { a, y } of sorted) {
        if (!drawn && y > 318) {
          this.player(sim, sim.player.x, 318, settings);
          drawn = true;
        }
        this.actor(a, a.x, y, sim.tick);
      }
      if (!drawn) this.player(sim, sim.player.x, 318, settings);
      // A noninteractive location marker anchored to the start pavement.
      if (sim.player.y < 96) {
        ctx.fillStyle = '#192d34d9';
        ctx.fillRect(79, screenY(0) + 25, 130, 17);
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e9d7ae';
        ctx.fillText('↑  THE CHAI IS THIS WAY', 144, screenY(0) + 37);
        ctx.textAlign = 'left';
      }
      if (stage === 4) {
        ctx.fillStyle = sim.tick % 600 > 450 ? '#f3d88a' : '#c4846e';
        ctx.fillRect(2, 2, 5, 5);
        ctx.font = '8px monospace';
        ctx.fillText(
          sim.tick % 600 > 450 ? 'TRAFFIC STOPPED' : 'TRAFFIC MOVING',
          12,
          8,
        );
      }
    }
    drawRush(sim: Simulation, settings: Settings) {
      const ctx = this.ctx,
        stage = sim.renderStage,
        palette = STAGES[stage].palette;
      const scroll = Math.round(sim.distance * 16) % 32;
      ctx.fillStyle = palette.road;
      ctx.fillRect(0, 0, 288, 384);
      this.pavement(0, 0, 48, 384, stage);
      this.pavement(240, 0, 48, 384, stage);
      ctx.fillStyle = '#b6b8a499';
      ctx.fillRect(46, 0, 2, 384);
      ctx.fillRect(240, 0, 2, 384);
      for (let y = -32 + scroll; y < 384; y += 32) {
        ctx.fillStyle = '#d3c7a077';
        ctx.fillRect(110, y, 2, 16);
        ctx.fillRect(174, y, 2, 16);
        ctx.fillStyle = '#141e2920';
        for (let x = 50; x < 240; x += 11) ctx.fillRect(x, y + (x % 28), 1, 1);
      }
      for (
        let y = -128 + (Math.round(sim.distance * 16) % 128);
        y < 450;
        y += 128
      ) {
        this.tile(stage === 1 ? 0 : 64, 96, 0, y, 32, 64);
        this.tile(192, 96, 256, y + 24, 32, 64);
        this.tile(352 + (stage % 3) * 32, 160, 0, y + 64, 32, 16);
        this.tile(496 + (stage % 4) * 16, 160, 257, y + 89, 16, 32);
        ctx.fillStyle = '#e2b86a';
        ctx.fillRect(3, y + 17, 6, 2);
        ctx.fillRect(277, y + 50, 6, 2);
      }
      const sorted = [...sim.actors].sort((a, b) => a.y - b.y);
      let drawn = false;
      for (const a of sorted) {
        if (!drawn && a.y > 318) {
          this.player(sim, sim.player.x, 318, settings);
          drawn = true;
        }
        if (a.dir === 0) this.cup(a.x, a.y, sim.tick);
        else {
          this.actor(a, a.x, a.y, sim.tick, true);
          if (a.kind === 'crate' || a.kind === 'banner') {
            ctx.fillStyle = '#ffedb5';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(a.kind === 'crate' ? '↑' : '↓', a.x, a.y - 38);
            ctx.textAlign = 'left';
          }
        }
      }
      if (!drawn) this.player(sim, sim.player.x, 318, settings);
    }
    draw(sim: Simulation, settings: Settings) {
      const ctx = this.ctx;
      ctx.imageSmoothingEnabled = false;
      if (sim.mode === 'rush') this.drawRush(sim, settings);
      else this.drawCross(sim, settings);
      if (sim.renderStage === 2 && !settings.lowEffects) {
        ctx.fillStyle = '#b9dbdb66';
        for (let i = 0; i < 35; i++) {
          const x = hash(69, i) % 288,
            y = (hash(97, i) + sim.tick * 3) % 410;
          ctx.fillRect(x, y, 1, 4);
        }
      }
      // Vignette frames the scene without obscuring hazard edges.
      ctx.fillStyle = '#17253522';
      ctx.fillRect(0, 0, 288, 3);
      ctx.fillRect(0, 381, 288, 3);
    }
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 288,
    height: 384,
    backgroundColor: '#34434b',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [Commute],
    banner: false,
    fps: { target: 60, smoothStep: false },
  });
  return () => game.destroy(true);
}
