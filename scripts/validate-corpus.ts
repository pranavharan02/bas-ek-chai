import { writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  choosePattern,
  validatePattern,
  Simulation,
} from '../src/game/simulation';
import {
  validateCrossingContent,
  crossingRoute,
  replayCrossing,
} from '../src/game/validation';
import { PATTERNS } from '../src/content/world';
const started = performance.now();
let runnerCases = 0,
  crossingCases = 0,
  routeCases = 0,
  endlessRouteCases = 0;
for (let band = 0; band < 5; band++)
  for (let seed = 0; seed < 10000; seed++) {
    let entries = [0, 1, 2];
    for (let i = 0; i < 6; i++) {
      const p = choosePattern(seed, i, band > 0 ? 1 : 0, entries);
      entries = validatePattern(p, entries);
      assert.ok(entries.length, `runner seed ${seed} band ${band} join ${i}`);
    }
    runnerCases++;
    assert.ok(
      validateCrossingContent(band, seed, 0),
      `crossing seed ${seed} band ${band}`,
    );
    crossingCases++;
  }
// 10,000 seeds per endless crossing difficulty band, replaying actual schedules,
// swept collisions, hop/reaction margins, and all four internal chunk joins.
for (let band = 0; band < 5; band++) {
  for (let seed = 0; seed < 10000; seed++) {
    const startRow = band * 24;
    let tick = 0,
      col = 4;
    const route = [];
    for (let row = startRow; row < startRow + 24; row += 6) {
      const part = crossingRoute(-1, seed, row, tick, col);
      assert.ok(part, `endless route band ${band} seed ${seed} row ${row}`);
      route.push(...part.commands);
      tick = part.endTick;
      col = part.column;
    }
    const s = new Simulation('endless', 0, seed);
    s.player.y = startRow * 32;
    s.maxRow = startRow;
    s.boundary = Math.max(0, startRow - 18);
    let i = 0;
    while (s.tick < tick && s.status === 'playing') {
      while (i < route.length && route[i].tick === s.tick) {
        s.input(route[i].command);
        i++;
      }
      s.step();
      s.drainEvents();
    }
    assert.equal(
      s.status,
      'playing',
      `endless replay band ${band} seed ${seed}: ${s.cause}`,
    );
    assert.ok(s.maxRow >= startRow + 24);
    endlessRouteCases++;
  }
  console.log(
    `Exact endless crossing band ${band + 1}/5 complete (${endlessRouteCases} routes).`,
  );
}
// Exact live-simulation route corpus supplements the structural/schedule corpus.
for (let stage = 0; stage < 5; stage++)
  for (let seed = 0; seed < 40; seed++) {
    let tick = 0,
      col = 4;
    const route = [];
    for (let row = 0; row < 24; row += 6) {
      const part = crossingRoute(stage, seed, row, tick, col);
      assert.ok(part, `route stage ${stage} seed ${seed} row ${row}`);
      route.push(...part.commands);
      tick = part.endTick;
      col = part.column;
    }
    const s = replayCrossing(stage, seed, route, tick);
    assert.equal(
      s.status,
      'clear',
      `route stage ${stage} seed ${seed}: ${s.cause}`,
    );
    routeCases++;
  }
const impossible = {
  id: 'bad',
  obstacles: [0, 1, 2].map((lane) => ({ lane, kind: 'bus' as const })),
  minBand: 0,
  gapTicks: 180,
};
assert.equal(validatePattern(impossible).length, 0);
assert.equal(
  validatePattern(
    {
      ...impossible,
      obstacles: impossible.obstacles.slice(0, 2),
      gapTicks: 25,
    },
    [0],
  ).length,
  0,
);
for (const p of PATTERNS)
  for (const q of PATTERNS)
    assert.ok(validatePattern(q, validatePattern(p)).length);
const report = {
  date: new Date().toISOString(),
  runnerCases,
  crossingCases,
  exactCampaignRoutes: routeCases,
  exactEndlessCrossingRoutes: endlessRouteCases,
  runnerPatternJoins: 144,
  adversarialRejections: 2,
  seconds: Math.round((performance.now() - started) / 1000),
  limitation:
    'Finite corpus and conservative routes establish tested reachability, not universal procedural correctness or human playtest results. Runner routes retain empty lanes and validate time-to-reach plus reaction margin.',
};
mkdirSync('docs/evidence', { recursive: true });
writeFileSync(
  'docs/evidence/generation-corpus.json',
  JSON.stringify(report, null, 2),
);
console.log(report);
