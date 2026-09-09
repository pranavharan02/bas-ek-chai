import {
  CELL,
  HOP_TICKS,
  HAZARDS,
  LANE_X,
  PATTERNS,
  STAGES,
  hash,
  seeded,
  type Command,
  type HazardKind,
  type Mode,
  type Pattern,
} from '../content/world';
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Actor extends Box {
  id: string;
  kind: HazardKind;
  dir: number;
  row?: number;
}
export interface Hop {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  elapsed: number;
}
export interface Player {
  x: number;
  y: number;
  direction: Command;
  hop: Hop | null;
  lane: number;
  laneFrom: number;
  laneTo: number;
  laneTick: number;
  action: 'run' | 'jump' | 'slide';
  actionTick: number;
  recovery: number;
}
export interface GameEvent {
  type:
    | 'hop'
    | 'bump'
    | 'pickup'
    | 'fail'
    | 'clear'
    | 'warning'
    | 'jump'
    | 'slide';
  detail?: string;
}
export type RowType = 'safe' | 'road' | 'rail';
export function rowType(stage: number, row: number): RowType {
  if (stage < 0) stage = Math.min(4, Math.floor(row / 24));
  if (row <= 1 || row % 6 === 0) return 'safe';
  if (stage === 3) {
    if (row % 6 === 3) return 'rail';
    if (row % 6 === 2 || row % 6 === 4) return 'safe';
    return 'road';
  }
  const n = row % 6;
  return n <= Math.min(5, stage + 3) && n >= 2 ? 'road' : 'safe';
}
export function trainPhase(tick: number, row: number) {
  return (((tick + Math.floor(row / 6) * 37) % 780) + 780) % 780;
}
export function trainWarning(tick: number, row: number) {
  const phase = trainPhase(tick, row);
  return phase >= 240 && phase < 540;
}
export function trafficClock(tick: number, stage: number) {
  if (stage !== 4) return tick;
  const n = Math.floor(tick / 600),
    p = tick % 600;
  return n * 450 + Math.min(p, 450);
}
export function crossingActors(
  stage: number,
  seed: number,
  tick: number,
  minRow: number,
  maxRow: number,
): Actor[] {
  const result: Actor[] = [];
  for (let row = Math.max(2, minRow); row <= maxRow; row++) {
    const rowStage = stage < 0 ? Math.min(4, Math.floor(row / 24)) : stage;
    const s = STAGES[rowStage];
    const type = rowType(stage, row);
    if (type === 'safe') continue;
    if (type === 'rail') {
      const phase = trainPhase(tick, row);
      if (phase >= 420 && phase < 540) {
        const x = -380 + (phase - 420) * 9;
        result.push({
          id: `train-${row}-${Math.floor((tick + Math.floor(row / 6) * 37) / 780)}`,
          kind: 'train',
          row,
          x,
          y: row * CELL,
          w: 350,
          h: 22,
          dir: 1,
        });
      }
      continue;
    }
    const h = hash(seed, row);
    const kind = s.hazards[h % s.hazards.length];
    const def = HAZARDS[kind];
    const dir = row % 2 === 0 ? 1 : -1;
    const speed =
      (s.speed + (h % 9)) *
      (kind === 'bicycle' ? 0.75 : kind === 'bike' ? 1.1 : 1);
    const spacing = 390 + (h % 80) + def.width;
    const offset =
      (h % spacing) + ((trafficClock(tick, rowStage) * speed) / 60) * dir;
    const n0 = Math.floor((-100 - offset) / spacing),
      n1 = Math.ceil((390 - offset) / spacing);
    for (let n = n0; n <= n1; n++) {
      const x = offset + n * spacing;
      if (x > -120 && x < 420)
        result.push({
          id: `v-${row}-${n}`,
          kind,
          row,
          x,
          y: row * CELL,
          w: def.width,
          h: def.height,
          dir,
        });
    }
  }
  return result;
}
export function obstacles(
  stage: number,
  seed: number,
  minRow: number,
  maxRow: number,
): Actor[] {
  const result: Actor[] = [];
  if (stage === 0) return result;
  for (let row = Math.max(2, minRow); row <= maxRow; row++) {
    const rowStage = stage < 0 ? Math.min(4, Math.floor(row / 24)) : stage;
    if (rowStage === 0) continue;
    if (row % 6 === 0 || rowType(stage, row) !== 'safe') continue;
    const h = hash(seed, row + 800);
    const col = 1 + (h % 7);
    const list: HazardKind[] =
      rowStage === 1
        ? ['cow', 'cart', 'pedestrian', 'parked']
        : rowStage === 2
          ? ['drain', 'parked', 'crate']
          : ['cow', 'cart', 'pedestrian'];
    const kind = list[h % list.length];
    result.push({
      id: `o-${row}`,
      kind,
      x: col * CELL + 16,
      y: row * CELL,
      w: HAZARDS[kind].width,
      h: HAZARDS[kind].height,
      row,
      dir: 1,
    });
  }
  return result;
}
export function swept(a: Box, an: Box, b: Box, bn: Box): boolean {
  const x = a.x - b.x,
    y = a.y - b.y,
    dx = an.x - a.x - (bn.x - b.x),
    dy = an.y - a.y - (bn.y - b.y);
  const hx = (a.w + b.w) / 2,
    hy = (a.h + b.h) / 2;
  let enter = 0,
    exit = 1;
  for (const [pos, vel, half] of [
    [x, dx, hx],
    [y, dy, hy],
  ]) {
    if (Math.abs(vel) < 1e-9) {
      if (Math.abs(pos) >= half) return false;
    } else {
      let t1 = (-half - pos) / vel,
        t2 = (half - pos) / vel;
      if (t1 > t2) [t1, t2] = [t2, t1];
      enter = Math.max(enter, t1);
      exit = Math.min(exit, t2);
      if (enter > exit) return false;
    }
  }
  return exit >= 0 && enter <= 1;
}
export function validatePattern(
  pattern: Pattern,
  entryLanes = [0, 1, 2],
  availableTicks = pattern.gapTicks,
): number[] {
  if (
    !Number.isFinite(availableTicks) ||
    availableTicks < 21 ||
    pattern.obstacles.some((o) => o.lane < 0 || o.lane > 2 || !HAZARDS[o.kind])
  )
    return [];
  const exits: number[] = [];
  for (let lane = 0; lane < 3; lane++) {
    if (pattern.obstacles.some((o) => o.lane === lane)) continue; // conservative: never relies on perfect jump timing
    if (
      entryLanes.some(
        (from) => Math.abs(from - lane) * 10 + 21 <= availableTicks,
      )
    )
      exits.push(lane);
  }
  return exits;
}
export function choosePattern(
  seed: number,
  index: number,
  band: number,
  entryLanes = [0, 1, 2],
): Pattern {
  const candidates = PATTERNS.filter((p) => p.minBand <= band);
  const rng = seeded(hash(seed, index));
  for (let attempt = 0; attempt < 8; attempt++) {
    const p = candidates[Math.floor(rng() * candidates.length)];
    if (validatePattern(p, entryLanes).length) return p;
  }
  return PATTERNS[10];
}
export class Simulation {
  mode: Mode;
  stage: number;
  seed: number;
  tick = 0;
  status: 'playing' | 'failed' | 'clear' = 'playing';
  cause = '';
  events: GameEvent[] = [];
  player: Player = {
    x: 144,
    y: 0,
    direction: 'up',
    hop: null,
    lane: 1,
    laneFrom: 144,
    laneTo: 144,
    laneTick: 10,
    action: 'run',
    actionTick: 0,
    recovery: 0,
  };
  maxRow = 0;
  boundary = 0;
  distance = 0;
  score = 0;
  tokens = 0;
  collected = new Set<string>();
  actors: Actor[] = [];
  patternIndex = 0;
  nextSpawn = 110;
  assisted = false;
  buffered: { command: Command; expires: number } | null = null;
  previous: Box = { x: 144, y: 0, w: 12, h: 10 };
  practice = false;
  lastWarning = -999;
  constructor(mode: Mode, stage = 0, seed = 7319, practice = false) {
    this.mode = mode;
    this.stage = stage;
    this.seed = seed;
    this.practice = practice;
    if (mode === 'rush') this.player.y = 318;
  }
  get speed() {
    return this.practice
      ? 6
      : Math.min(10, 6 + 0.5 * Math.floor(this.distance / 250));
  }
  get row() {
    return Math.round(this.player.y / CELL);
  }
  get band() {
    return Math.min(4, Math.floor(this.distance / 250));
  }
  get renderStage() {
    return this.mode === 'rush'
      ? this.band
      : this.mode === 'endless'
        ? Math.min(4, Math.floor(this.maxRow / 24))
        : this.stage;
  }
  input(command: Command) {
    if (this.status !== 'playing') return;
    if (this.mode === 'rush') {
      if (command === 'left' || command === 'right') {
        if (this.player.laneTick < 10) {
          this.buffered = { command, expires: this.tick + 6 };
          return;
        }
        const lane = Math.max(
          0,
          Math.min(2, this.player.lane + (command === 'left' ? -1 : 1)),
        );
        if (lane === this.player.lane) return;
        this.player.lane = lane;
        this.player.laneFrom = this.player.x;
        this.player.laneTo = LANE_X[lane];
        this.player.laneTick = 0;
        this.events.push({ type: 'hop' });
      } else if (this.player.action === 'run' && this.player.recovery === 0) {
        this.player.action = command === 'up' ? 'jump' : 'slide';
        this.player.actionTick = 0;
        this.events.push({ type: command === 'up' ? 'jump' : 'slide' });
      }
      return;
    }
    if (this.player.hop) {
      this.buffered = { command, expires: this.tick + 6 };
      return;
    }
    const dx = command === 'left' ? -CELL : command === 'right' ? CELL : 0,
      dy = command === 'up' ? CELL : command === 'down' ? -CELL : 0;
    const x = this.player.x + dx,
      y = this.player.y + dy;
    const row = Math.round(y / CELL);
    this.player.direction = command;
    if (
      x < 16 ||
      x > 272 ||
      row < this.boundary ||
      (this.mode === 'crossing' && row > 24)
    ) {
      this.events.push({ type: 'bump' });
      return;
    }
    const stage = this.mode === 'endless' ? -1 : this.stage;
    if (
      !this.practice &&
      obstacles(stage, this.seed, row, row).some(
        (o) => o.kind !== 'drain' && Math.abs(o.x - x) < (o.w + 12) / 2,
      )
    ) {
      this.events.push({ type: 'bump' });
      return;
    }
    if (
      !this.practice &&
      rowType(stage, row) === 'rail' &&
      trainWarning(this.tick, row)
    ) {
      this.events.push({
        type: 'bump',
        detail: 'Wait for the railway lights to turn off.',
      });
      return;
    }
    this.player.hop = {
      fromX: this.player.x,
      fromY: this.player.y,
      toX: x,
      toY: y,
      elapsed: 0,
    };
    this.events.push({ type: 'hop' });
  }
  clearInput() {
    this.buffered = null;
  }
  fail(kind: HazardKind) {
    if (this.status !== 'playing') return;
    this.status = 'failed';
    this.cause = kind;
    this.clearInput();
    this.events.push({ type: 'fail', detail: kind });
  }
  step() {
    if (this.status !== 'playing') return;
    this.tick++;
    this.previous = { x: this.player.x, y: this.player.y, w: 12, h: 10 };
    if (this.mode === 'rush') this.stepRush();
    else this.stepCross();
    if (this.status !== 'playing') {
      this.clearInput();
      return;
    }
    if (this.buffered) {
      const { command, expires } = this.buffered;
      if (this.tick > expires) this.buffered = null;
      else if (
        (this.mode === 'rush' && this.player.laneTick >= 10) ||
        (this.mode !== 'rush' && !this.player.hop)
      ) {
        this.buffered = null;
        this.input(command);
      }
    }
  }
  stepCross() {
    const p = this.player;
    if (p.hop) {
      p.hop.elapsed++;
      const t = Math.min(1, p.hop.elapsed / HOP_TICKS);
      p.x = p.hop.fromX + (p.hop.toX - p.hop.fromX) * t;
      p.y = p.hop.fromY + (p.hop.toY - p.hop.fromY) * t;
      if (t === 1) p.hop = null;
    }
    const next = { x: p.x, y: p.y, w: 12, h: 10 };
    const stage = this.mode === 'endless' ? -1 : this.stage;
    const lo = Math.max(
        this.boundary,
        Math.floor(Math.min(this.previous.y, p.y) / CELL) - 1,
      ),
      hi = Math.ceil(Math.max(this.previous.y, p.y) / CELL) + 1;
    const actors = this.practice
      ? []
      : crossingActors(stage, this.seed, this.tick, lo, hi);
    const old = new Map(
      crossingActors(stage, this.seed, this.tick - 1, lo, hi).map((a) => [
        a.id,
        a,
      ]),
    );
    for (const a of actors) {
      const prior = old.get(a.id) ?? a;
      if (swept(this.previous, next, prior, a)) {
        this.fail(a.kind);
        return;
      }
    }
    for (const a of this.practice ? [] : obstacles(stage, this.seed, lo, hi)) {
      if (a.kind === 'drain' && swept(this.previous, next, a, a)) {
        this.fail(a.kind);
        return;
      }
    }
    if (!p.hop) {
      const row = this.row;
      if (row > this.maxRow) {
        this.score += row - this.maxRow;
        this.maxRow = row;
      }
      if (
        row > 0 &&
        row % 8 === 4 &&
        Math.round((p.x - 16) / 32) === (hash(this.seed, row + 99) % 7) + 1
      ) {
        const id = `chai-${row}`;
        if (!this.collected.has(id)) {
          this.collected.add(id);
          this.tokens++;
          this.score += 5;
          this.events.push({ type: 'pickup' });
        }
      }
      if (this.mode === 'crossing' && row === 24 && !this.practice) {
        this.status = 'clear';
        this.events.push({ type: 'clear' });
        return;
      }
    }
    if (this.mode === 'endless') {
      this.boundary = Math.max(0, Math.floor((this.maxRow - 18) / 6) * 6);
      if (this.collected.size > 16)
        this.collected = new Set(
          [...this.collected].filter(
            (id) => Number(id.split('-')[1]) >= this.boundary,
          ),
        );
    }
    if ((stage === 3 || stage < 0) && !this.practice) {
      for (let r = lo; r <= hi + 4; r++) {
        if (rowType(stage, r) === 'rail' && trainPhase(this.tick, r) === 240) {
          this.events.push({ type: 'warning' });
          this.lastWarning = this.tick;
        }
      }
    }
  }
  stepRush() {
    const p = this.player;
    if (p.laneTick < 10) {
      p.laneTick++;
      p.x = p.laneFrom + ((p.laneTo - p.laneFrom) * p.laneTick) / 10;
    }
    if (p.recovery > 0) p.recovery--;
    if (p.action !== 'run') {
      p.actionTick++;
      if (p.actionTick >= (p.action === 'jump' ? 42 : 36)) {
        p.action = 'run';
        p.actionTick = 0;
        p.recovery = 6;
      }
    }
    const move = (this.speed * 16) / 60;
    this.distance += this.speed / 60;
    if (!this.practice && this.tick >= this.nextSpawn) {
      const pattern = choosePattern(
        this.seed,
        this.patternIndex++,
        this.distance < 150 ? 0 : 1,
      );
      this.nextSpawn = this.tick + pattern.gapTicks;
      for (const [i, o] of pattern.obstacles.entries())
        this.actors.push({
          id: `rush-${this.patternIndex}-${i}`,
          kind: o.kind,
          x: LANE_X[o.lane],
          y: -32,
          w: o.kind === 'banner' ? 42 : 32,
          h: o.kind === 'bus' ? 54 : 24,
          dir: 1,
        });
      const free =
        [0, 1, 2].find((l) => !pattern.obstacles.some((o) => o.lane === l)) ??
        1;
      this.actors.push({
        id: `token-${this.patternIndex}`,
        kind: 'crate',
        x: LANE_X[free],
        y: -100,
        w: 12,
        h: 12,
        dir: 0,
      });
    }
    const next = { x: p.x, y: p.y, w: 12, h: 10 };
    const pickups: Actor[] = [];
    for (const a of this.actors) {
      const old = { ...a };
      a.y += move;
      if (swept(this.previous, next, old, a)) {
        if (a.dir === 0) {
          pickups.push(a);
          continue;
        }
        const response = HAZARDS[a.kind].response;
        const clear =
          (response === 'jump' &&
            p.action === 'jump' &&
            p.actionTick >= 12 &&
            p.actionTick <= 30) ||
          (response === 'slide' && p.action === 'slide');
        if (!clear) {
          this.fail(a.kind);
          return;
        }
      }
    }
    for (const a of pickups) {
      if (!this.collected.has(a.id)) {
        this.collected.add(a.id);
        this.tokens++;
        this.events.push({ type: 'pickup' });
      }
    }
    this.actors = this.actors.filter(
      (a) => a.y < 440 && !this.collected.has(a.id),
    );
    // Only active IDs are needed; old token IDs cannot be reused by the monotonic pattern index.
    if (this.collected.size > 64)
      this.collected = new Set([...this.collected].slice(-32));
    this.score = Math.floor(this.distance) + this.tokens * 5;
  }
  drainEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }
}
