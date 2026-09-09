/** The only frame-to-simulation clock. Paused and countdown frames are inert. */
export class FrameClock {
  accumulator = 0;
  reset() {
    this.accumulator = 0;
  }
  advance(
    delta: number,
    enabled: boolean,
    assisted: boolean,
    step: () => boolean | void,
  ): 'ok' | 'interrupted' {
    if (!enabled) {
      this.reset();
      return 'ok';
    }
    if (!Number.isFinite(delta) || delta > 250) {
      this.reset();
      return 'interrupted';
    }
    this.accumulator += Math.max(0, delta) * (assisted ? 0.75 : 1);
    let ticks = 0;
    while (this.accumulator >= 1000 / 60 && ticks < 5) {
      this.accumulator -= 1000 / 60;
      ticks++;
      if (step() === false) {
        this.reset();
        break;
      }
    }
    if (ticks === 5) this.accumulator = Math.min(this.accumulator, 1000 / 60);
    return 'ok';
  }
}
