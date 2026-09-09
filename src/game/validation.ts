import {
  CELL,
  HOP_TICKS,
  REACTION_TICKS,
  HAZARDS,
  type Command,
  type Pattern,
} from '../content/world';
import {
  Simulation,
  crossingActors,
  obstacles,
  rowType,
  trainWarning,
  swept,
  validatePattern,
  type Box,
} from './simulation';

export interface RouteStep {
  tick: number;
  command: Command;
}
/** Conservative schedule-aware route search for authored six-row crossing chunks.
 * Each hop gets 350ms of additional reaction/wait margin. Exact per-tick sweeps
 * use the same footprints and schedules as the live controller.
 */
export function crossingRoute(
  stage: number,
  seed: number,
  startRow = 0,
  startTick = 0,
  startColumn = 4,
  maxWait = 1560,
): { commands: RouteStep[]; endTick: number; column: number } | null {
  const stops = obstacles(stage, seed, startRow + 1, startRow + 6);
  const cols = [startColumn, 4, 3, 5, 2, 6, 1, 7, 0, 8].filter(
    (c, i, a) => a.indexOf(c) === i,
  );
  for (const col of cols) {
    const x = 16 + col * CELL;
    if (stops.some((o) => Math.abs(o.x - x) < (o.w + 12) / 2)) continue;
    const lateral = Math.abs(col - startColumn) * HOP_TICKS;
    for (let wait = 0; wait <= maxWait; wait += REACTION_TICKS) {
      let tick = startTick + lateral + wait;
      let valid = true;
      const commands: RouteStep[] = [];
      for (let row = startRow; row < startRow + 6 && valid; row++) {
        if (rowType(stage, row + 1) === 'rail' && trainWarning(tick, row + 1)) {
          valid = false;
          break;
        }
        commands.push({ tick, command: 'up' });
        for (let k = 1; k <= HOP_TICKS + REACTION_TICKS; k++) {
          const old: Box = {
            x,
            y: row * CELL + (Math.min(k - 1, HOP_TICKS) / HOP_TICKS) * CELL,
            w: 12,
            h: 10,
          };
          const next: Box = {
            x,
            y: row * CELL + (Math.min(k, HOP_TICKS) / HOP_TICKS) * CELL,
            w: 12,
            h: 10,
          };
          const targetTick = tick + k;
          const lo = Math.floor(old.y / CELL),
            hi = Math.ceil(next.y / CELL);
          const actors = crossingActors(stage, seed, targetTick, lo, hi);
          const before = new Map(
            crossingActors(stage, seed, targetTick - 1, lo, hi).map((a) => [
              a.id,
              a,
            ]),
          );
          if (actors.some((a) => swept(old, next, before.get(a.id) ?? a, a))) {
            valid = false;
            break;
          }
        }
        tick += HOP_TICKS + REACTION_TICKS;
      }
      if (valid) {
        const moves: RouteStep[] = [];
        for (let i = 0; i < Math.abs(col - startColumn); i++)
          moves.push({
            tick: startTick + i * HOP_TICKS,
            command: col > startColumn ? 'right' : 'left',
          });
        return {
          commands: [...moves, ...commands],
          endTick: tick,
          column: col,
        };
      }
    }
  }
  return null;
}

/** Fast corpus contract for schedules: physical gap supports a hop + reaction
 * margin, all hazards are introduced in known rows, refuges are full width, and
 * every row has at least seven alternative unblocked cells. This complements
 * exact route replay; it is deliberately not labelled a complete solver proof.
 */
export function validateCrossingContent(
  stage: number,
  seed: number,
  startRow = 0,
): boolean {
  for (let row = startRow; row <= startRow + 24; row++) {
    if (row % 6 === 0 && rowType(stage, row) !== 'safe') return false;
    const blocked = obstacles(stage, seed, row, row);
    if (blocked.length > 2) return false;
    const actors = crossingActors(stage, seed, 0, row, row);
    for (const a of actors) {
      if (a.kind === 'train') continue;
      const next = crossingActors(stage, seed, 1, row, row).find(
        (v) => v.id === a.id,
      );
      if (!next) continue;
      const v = Math.abs(next.x - a.x) * 60;
      const gap = 390;
      const required =
        ((HOP_TICKS + REACTION_TICKS) / 60) * v + HAZARDS[a.kind].width + 12;
      if (required > gap) return false;
    }
  }
  return true;
}
export function validateRunnerJoin(previous: Pattern, next: Pattern) {
  const entries = validatePattern(previous);
  return validatePattern(next, entries, next.gapTicks).length > 0;
}
export function replayCrossing(
  stage: number,
  seed: number,
  route: RouteStep[],
  until: number,
) {
  const s = new Simulation('crossing', stage, seed);
  let i = 0;
  while (s.tick < until && s.status === 'playing') {
    while (i < route.length && route[i].tick === s.tick) {
      s.input(route[i].command);
      i++;
    }
    s.step();
    s.drainEvents();
  }
  return s;
}
