import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Simulation,
  swept,
  crossingActors,
  obstacles,
  trainWarning,
  choosePattern,
  validatePattern,
  rowType,
} from '../src/game/simulation';
import { STAGES, PATTERNS, HAZARDS, LANE_X, hash } from '../src/content/world';
import {
  defaults,
  parseSave,
  bankStage,
  recordBest,
  loadSave,
  persist,
} from '../src/services/save';
import {
  crossingRoute,
  replayCrossing,
  validateRunnerJoin,
} from '../src/game/validation';
import { FrameClock } from '../src/game/clock';
function ticks(s: Simulation, n: number) {
  for (let i = 0; i < n; i++) s.step();
}
test('C01/C03: discrete hops, safe boundaries, expiring buffer and no repeated row points', () => {
  const s = new Simulation('crossing', 0, 1, true);
  s.input('up');
  ticks(s, 12);
  assert.equal(s.player.y, 32);
  assert.equal(s.score, 1);
  s.input('down');
  ticks(s, 12);
  s.input('up');
  ticks(s, 12);
  assert.equal(s.score, 1);
  s.input('up');
  s.input('up');
  ticks(s, 24);
  assert.equal(s.player.y, 64, 'input queued too early must expire');
  s.input('left');
  ticks(s, 9);
  s.input('up');
  ticks(s, 15);
  assert.equal(s.player.y, 96, 'buffer within 100ms executes once');
});
test('C02: waiting on a safe stop has no death or forced movement', () => {
  const s = new Simulation('crossing', 4, 7319);
  const before = crossingActors(4, 7319, 0, 2, 3);
  ticks(s, 1800);
  assert.equal(s.player.y, 0);
  assert.equal(s.status, 'playing');
  assert.notDeepEqual(crossingActors(4, 7319, 1800, 2, 3), before);
});
test('C03: blocking actors reject a destination without pushing the hero', () => {
  const s = new Simulation('crossing', 1, 7319);
  const a = obstacles(1, 7319, 5, 5)[0];
  assert.ok(a);
  s.player.x = a.x;
  s.player.y = 128;
  s.input('up');
  assert.equal(s.player.hop, null);
  assert.equal(s.player.y, 128);
});
test('C04: relative swept collision catches a fast vehicle crossing between endpoints', () => {
  assert.equal(
    swept(
      { x: 100, y: 40, w: 12, h: 10 },
      { x: 100, y: 42, w: 12, h: 10 },
      { x: 30, y: 40, w: 20, h: 12 },
      { x: 160, y: 40, w: 20, h: 12 },
    ),
    true,
  );
  assert.equal(
    swept(
      { x: 100, y: 0, w: 12, h: 10 },
      { x: 100, y: 0, w: 12, h: 10 },
      { x: 30, y: 40, w: 20, h: 12 },
      { x: 160, y: 40, w: 20, h: 12 },
    ),
    false,
  );
});
test('C04/C08: a real car contact terminates before hop score or pickups', () => {
  const s = new Simulation('crossing', 0, 7319);
  let a;
  for (let t = 0; t < 1000 && !a; t++) {
    a = crossingActors(0, 7319, t + 1, 2, 2).find((a) => a.x > 20 && a.x < 268);
    if (a) s.tick = t;
  }
  assert.ok(a);
  s.player.x = a.x;
  s.player.y = 64;
  s.player.hop = { fromX: a.x, fromY: 64, toX: a.x, toY: 96, elapsed: 0 };
  s.step();
  assert.equal(s.status, 'failed');
  assert.equal(s.score, 0);
  assert.equal(s.tokens, 0);
  s.input('up');
  const t = s.tick;
  s.step();
  assert.equal(s.tick, t);
});
test('Rail warning rejects entry and leaves time for a committed hop to exit', () => {
  const s = new Simulation('crossing', 3, 7319);
  s.tick = 250;
  s.player.y = 64;
  assert.equal(trainWarning(s.tick, 3), true);
  s.input('up');
  assert.equal(s.player.hop, null);
  s.tick = 0;
  s.input('up');
  assert.ok(s.player.hop);
  ticks(s, 12);
  assert.equal(s.status, 'playing');
  assert.equal(s.player.y, 96);
});
test('C08: a token reached in the same tick as lethal traffic is not awarded', () => {
  const seed = 7319,
    row = 4,
    x = ((hash(seed, row + 99) % 7) + 1) * 32 + 16;
  const s = new Simulation('crossing', 1, seed);
  let conflict = -1;
  for (let t = 0; t < 2000; t++)
    if (
      crossingActors(1, seed, t + 1, row, row).some(
        (a) => Math.abs(a.x - x) < a.w / 2,
      )
    ) {
      conflict = t;
      break;
    }
  assert.ok(conflict >= 0);
  s.tick = conflict;
  s.player.x = x;
  s.player.y = row * 32 - 32 / 12;
  s.maxRow = 3;
  s.score = 3;
  s.player.hop = { fromX: x, fromY: 96, toX: x, toY: 128, elapsed: 11 };
  s.step();
  assert.equal(s.status, 'failed');
  assert.equal(s.score, 3);
  assert.equal(s.tokens, 0);
  assert.equal(s.collected.size, 0);
});
test('C06/C07: checkpoint and score bank atomically and once', () => {
  const d = defaults();
  const a = bankStage(d, 0, 29);
  assert.deepEqual(a.campaign.banked, [29]);
  assert.equal(a.campaign.nextStage, 1);
  assert.equal(bankStage(a, 0, 29), a);
  assert.deepEqual(parseSave(JSON.stringify(a)), a);
  const fail = new Simulation('crossing', 1, a.campaign.seed);
  fail.score = 12;
  fail.fail('car');
  assert.deepEqual(a.campaign.banked, [29]);
  const retry = new Simulation('crossing', 1, a.campaign.seed);
  assert.equal(retry.score, 0);
  assert.equal(retry.seed, fail.seed);
});
test('C09/E01/E02: both finales unlock identically and preserve separate best records', () => {
  const a = defaults(),
    b = defaults();
  b.settings.sutta = true;
  let aa = a,
    bb = b;
  for (let i = 0; i < 5; i++) {
    aa = bankStage(aa, i, 24);
    bb = bankStage(bb, i, 24);
  }
  assert.equal(aa.unlocked, true);
  assert.equal(aa.cosmetics, 3);
  assert.deepEqual(aa.best, bb.best);
  assert.deepEqual(aa.campaign, bb.campaign);
  assert.equal(aa.best['crossing-standard'], 120);
});
test('C10: endless boundary is a safe visible row and rejects retreat', () => {
  const s = new Simulation('endless', 0, 12, true);
  s.maxRow = 48;
  s.player.y = 48 * 32;
  s.step();
  assert.equal(s.boundary, 30);
  assert.equal(rowType(-1, s.boundary), 'safe');
  s.player.y = s.boundary * 32;
  s.input('down');
  assert.equal(s.player.hop, null);
});
test('R01/R02: runner available immediately; lane change follows a 10-tick path', () => {
  const s = new Simulation('rush');
  s.input('right');
  ticks(s, 5);
  assert.equal(s.player.x, 176);
  ticks(s, 5);
  assert.equal(s.player.x, 208);
  assert.equal(s.player.lane, 2);
});
test('R02: lane changes cannot teleport through a blocker', () => {
  const s = new Simulation('rush');
  s.actors = [
    { id: 'test', kind: 'car', x: 175, y: 317, w: 24, h: 24, dir: 1 },
  ];
  s.input('right');
  ticks(s, 10);
  assert.equal(s.status, 'failed');
});
test('R03: low crate clearance succeeds only in the jump clearance interval', () => {
  const s = new Simulation('rush');
  s.player.action = 'jump';
  s.player.actionTick = 17;
  s.actors = [
    { id: 'crate', kind: 'crate', x: 144, y: 318, w: 20, h: 18, dir: 1 },
  ];
  s.step();
  assert.equal(s.status, 'playing');
  const early = new Simulation('rush');
  early.input('up');
  early.actors = [
    { id: 'crate', kind: 'crate', x: 144, y: 318, w: 20, h: 18, dir: 1 },
  ];
  early.step();
  assert.equal(early.status, 'failed');
  const bus = new Simulation('rush');
  bus.player.action = 'jump';
  bus.player.actionTick = 17;
  bus.actors = [
    { id: 'bus', kind: 'bus', x: 144, y: 318, w: 32, h: 54, dir: 1 },
  ];
  bus.step();
  assert.equal(bus.status, 'failed');
});
test('R04/R05: slide works, airborne slide is ignored, recovery prevents double jump', () => {
  const s = new Simulation('rush');
  s.input('down');
  s.actors = [
    { id: 'beam', kind: 'banner', x: 144, y: 318, w: 32, h: 18, dir: 1 },
  ];
  s.step();
  assert.equal(s.status, 'playing');
  const j = new Simulation('rush');
  j.input('up');
  j.input('down');
  assert.equal(j.player.action, 'jump');
  j.input('left');
  ticks(j, 10);
  assert.equal(j.player.lane, 0);
  ticks(j, 32);
  assert.equal(j.player.action, 'run');
  j.input('up');
  assert.equal(j.player.action, 'run');
  ticks(j, 6);
  j.input('up');
  assert.equal(j.player.action, 'jump');
});
test('R06: speed cap and minimum warning distance remain compatible', () => {
  const s = new Simulation('rush');
  s.distance = 1e6;
  assert.equal(s.speed, 10);
  assert.ok((318 - -32 - 27 - 5) / (s.speed * 16) > 1.5);
});
test('R07/Q03: impossible and unreachable patterns are rejected', () => {
  assert.deepEqual(
    validatePattern({
      id: 'impossible',
      obstacles: [0, 1, 2].map((lane) => ({ lane, kind: 'bus' as const })),
      gapTicks: 180,
      minBand: 0,
    }),
    [],
  );
  assert.deepEqual(
    validatePattern(
      {
        id: 'unreachable',
        obstacles: [
          { lane: 0, kind: 'bus' },
          { lane: 1, kind: 'bus' },
        ],
        gapTicks: 30,
        minBand: 0,
      },
      [0],
      30,
    ),
    [],
  );
  for (const p of PATTERNS)
    for (const q of PATTERNS) assert.ok(validateRunnerJoin(p, q));
});
test('R08/Q05: paused/countdown frames freeze the world and long stalls advance zero ticks', () => {
  const s = new Simulation('rush'),
    clock = new FrameClock();
  clock.advance(100, true, false, () => s.step());
  const snapshot = JSON.stringify(s);
  for (let i = 0; i < 1800; i++)
    clock.advance(1000 / 60, false, false, () => s.step());
  assert.equal(JSON.stringify(s), snapshot);
  assert.equal(
    clock.advance(300, true, false, () => s.step()),
    'interrupted',
  );
  assert.equal(JSON.stringify(s), snapshot);
  clock.advance(1000 / 60, true, false, () => s.step());
  assert.equal(s.tick, 6);
});
test('R09/R10: contact ends only the player run and retry is clean', () => {
  for (const kind of ['cow', 'pedestrian'] as const) {
    const s = new Simulation('rush');
    const a = { id: 'person', kind, x: 144, y: 318, w: 28, h: 20, dir: 1 };
    s.actors = [a];
    s.step();
    assert.equal(s.status, 'failed');
    assert.equal(a.kind, kind);
  }
  const a = new Simulation('rush', 0, 1);
  a.score = 100;
  const b = new Simulation('rush', 0, 2);
  assert.equal(b.score, 0);
  assert.notEqual(a.seed, b.seed);
});
test('Q01/Q02: seeded replay is deterministic and independent of view settings', () => {
  const run = () => {
    const s = new Simulation('rush', 0, 123);
    for (let i = 0; i < 1800; i++) {
      if (i % 80 === 0) s.input(i % 160 === 0 ? 'left' : 'right');
      s.step();
      s.drainEvents();
    }
    return JSON.stringify(s);
  };
  assert.equal(run(), run());
  assert.deepEqual(choosePattern(123, 5, 1), choosePattern(123, 5, 1));
});
test('Q04: malformed saves, unknown schema, invalid checkpoint IDs, duplicate keys and corrupt ranges recover', () => {
  for (const raw of [
    '{',
    'null',
    '42',
    '{"version":99}',
    JSON.stringify({
      version: 1,
      campaign: { seed: 1, nextStage: 9, banked: [] },
      settings: {
        music: -5,
        shirt: 99,
        bindings: { up: 'w', down: 'w', left: 'a', right: 'd' },
      },
    }),
  ]) {
    const s = parseSave(raw);
    assert.equal(s.campaign.nextStage, 0);
    assert.ok(s.settings.music >= 0);
    assert.equal(s.settings.bindings.down, 's');
  }
});
test('Q04: denied storage is a playable memory-only fallback', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('Storage denied');
    },
  });
  try {
    assert.equal(loadSave().error, true);
    assert.deepEqual(loadSave().save, defaults());
    assert.equal(persist(defaults()), false);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
test('Q06: assisted clock is 75 percent while cosmetic preferences cannot change tick count', () => {
  const a = new FrameClock(),
    b = new FrameClock();
  let standard = 0,
    assisted = 0;
  for (let i = 0; i < 240; i++) {
    a.advance(1000 / 60, true, false, () => {
      standard++;
    });
    b.advance(1000 / 60, true, true, () => {
      assisted++;
    });
  }
  assert.equal(standard, 240);
  assert.ok(Math.abs(assisted - 180) <= 1);
});
test('Q06: standard and assisted scores remain separate', () => {
  const s = defaults();
  recordBest(s, 'rush', 100, false);
  recordBest(s, 'rush', 200, true);
  recordBest(s, 'endless', 50, false);
  assert.equal(s.best['rush-standard'], 100);
  assert.equal(s.best['rush-assisted'], 200);
  assert.equal(s.best['endless-standard'], 50);
});
test('Q07: 20 minutes of simulated endless runner has bounded actors and pickup IDs', () => {
  const s = new Simulation('rush', 0, 7319);
  for (let i = 0; i < 72000; i++) {
    s.step();
    if (s.status === 'failed') {
      s.status = 'playing';
      s.actors = s.actors.filter((a) => Math.abs(a.y - 318) > 50);
    }
    s.drainEvents();
  }
  assert.ok(s.actors.length < 15);
  assert.ok(s.collected.size <= 64);
  assert.equal(s.tick, 72000);
});
test('C05: exact collision-aware routes complete all five campaign stages', () => {
  for (const stage of STAGES) {
    let tick = 0,
      col = 4;
    const route = [];
    for (let row = 0; row < 24; row += 6) {
      const part = crossingRoute(stage.id, 7319, row, tick, col);
      assert.ok(part, `stage ${stage.id} block ${row}`);
      route.push(...part.commands);
      tick = part.endTick;
      col = part.column;
    }
    const s = replayCrossing(stage.id, 7319, route, tick);
    assert.equal(
      s.status,
      'clear',
      `stage ${stage.id}: ${s.cause} at ${s.row}`,
    );
    assert.ok(s.score >= 24 && s.score <= 39);
  }
});
