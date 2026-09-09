import score from '../../assets-source/music-score.json';
import type { Settings } from './save';
export class ChaiAudio {
  context: AudioContext | null = null;
  master: GainNode | null = null;
  music: GainNode | null = null;
  effects: GainNode | null = null;
  ambience: GainNode | null = null;
  timer: ReturnType<typeof setInterval> | null = null;
  step = 0;
  next = 0;
  scene = 'office';
  settings: Settings | null = null;
  noise: AudioBuffer | null = null;
  sources = new Set<AudioScheduledSourceNode>();
  ambientSource: AudioBufferSourceNode | null = null;
  async unlock(settings: Settings) {
    this.settings = settings;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        const c = this.context;
        this.master = c.createGain();
        const compressor = c.createDynamicsCompressor();
        compressor.threshold.value = -12;
        compressor.ratio.value = 5;
        this.master.connect(compressor);
        compressor.connect(c.destination);
        this.music = c.createGain();
        this.effects = c.createGain();
        this.ambience = c.createGain();
        for (const bus of [this.music, this.effects, this.ambience])
          bus.connect(this.master);
        this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
        const data = this.noise.getChannelData(0);
        let last = 0;
        let seed = 7319;
        for (let i = 0; i < data.length; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          last = (last + ((seed / 4294967296) * 2 - 1) * 0.03) / 1.03;
          data[i] = last * 3;
        }
      }
      await this.context.resume();
      this.apply(settings);
      this.start();
    } catch {
      /* Silent play is complete. Another explicit sound interaction may retry. */
    }
  }
  apply(settings: Settings) {
    this.settings = settings;
    if (!this.context || !this.master) return;
    const t = this.context.currentTime;
    this.master.gain.setTargetAtTime(settings.mute ? 0 : 0.65, t, 0.025);
    this.music!.gain.setTargetAtTime(settings.music, t, 0.05);
    this.effects!.gain.setTargetAtTime(settings.effects, t, 0.025);
    this.ambience!.gain.setTargetAtTime(settings.ambience * 0.32, t, 0.08);
  }
  tone(
    freq: number,
    duration: number,
    volume: number,
    bus: GainNode | null,
    when?: number,
    type: OscillatorType = 'triangle',
  ) {
    const c = this.context;
    if (!c || !bus || c.state !== 'running') return;
    const t = when ?? c.currentTime;
    const oscillator = c.createOscillator(),
      gain = c.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    oscillator.connect(gain);
    gain.connect(bus);
    oscillator.start(t);
    oscillator.stop(t + duration + 0.01);
    this.sources.add(oscillator);
    oscillator.onended = () => {
      this.sources.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  start() {
    if (!this.context || this.timer) return;
    this.next = this.context.currentTime + 0.04;
    this.timer = setInterval(() => this.schedule(), 25);
    this.ambient();
  }
  schedule() {
    const c = this.context;
    if (!c || c.state !== 'running') return;
    const beat = 60 / (this.scene === 'rush' ? 112 : score.bpm) / 4;
    while (this.next < c.currentTime + 0.12) {
      const i = this.step % score.melody.length;
      const note = score.melody[i];
      const midi = (n: number) => 440 * 2 ** ((score.tonicMidi + n - 69) / 12);
      const soft = this.scene === 'chai' ? 0.6 : 1;
      if (note !== null)
        this.tone(
          midi(note),
          beat * 2.4,
          0.13 * soft,
          this.music,
          this.next,
          'triangle',
        );
      if (i % 4 === 0)
        this.tone(
          midi(score.bass[Math.floor(i / 8)] - 12),
          beat * 3.7,
          0.23 * soft,
          this.music,
          this.next,
          'sine',
        );
      if (i % 16 === 0)
        for (const n of score.chords[Math.floor(i / 16)])
          this.tone(
            midi(n),
            beat * 13,
            0.025 * soft,
            this.music,
            this.next,
            'sine',
          );
      if (this.scene !== 'chai' && i % 4 === 0)
        this.tone(70, 0.13, 0.13, this.music, this.next, 'sine');
      if (this.scene !== 'chai' && i % 4 === 2)
        this.tone(3600, 0.025, 0.016, this.music, this.next, 'triangle');
      this.step++;
      this.next += beat;
    }
  }
  ambient() {
    const c = this.context;
    if (!c || !this.noise || this.ambientSource) return;
    const source = c.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = this.scene === 'rain' ? 2600 : 260;
    source.connect(filter);
    filter.connect(this.ambience!);
    source.start();
    this.ambientSource = source;
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
    };
  }
  setScene(scene: string) {
    if (scene === this.scene) return;
    this.scene = scene;
    this.ambientSource?.stop();
    this.ambientSource = null;
    this.ambient();
  }
  cue(event: string) {
    if (!this.context) return;
    const t = this.context.currentTime;
    if (event === 'hop') this.tone(260, 0.065, 0.12, this.effects);
    if (event === 'jump') {
      this.tone(330, 0.12, 0.16, this.effects);
      this.tone(495, 0.14, 0.1, this.effects, t + 0.05);
    }
    if (event === 'slide') this.tone(135, 0.16, 0.13, this.effects);
    if (event === 'pickup') {
      this.tone(660, 0.15, 0.15, this.effects);
      this.tone(990, 0.2, 0.12, this.effects, t + 0.08);
    }
    if (event === 'bump') this.tone(110, 0.09, 0.12, this.effects);
    if (event === 'fail') {
      for (let i = 0; i < 3; i++)
        this.tone(260 - i * 65, 0.16, 0.14, this.effects, t + i * 0.11);
    }
    if (event === 'clear') {
      [0, 4, 7, 12].forEach((n, i) =>
        this.tone(330 * 2 ** (n / 12), 0.55, 0.13, this.effects, t + i * 0.16),
      );
    }
    if (event === 'warning') {
      this.tone(740, 0.25, 0.24, this.effects);
      this.tone(740, 0.25, 0.24, this.effects, t + 0.4);
      if (this.music && this.settings) {
        this.music.gain.setTargetAtTime(this.settings.music * 0.4, t, 0.03);
        this.music.gain.setTargetAtTime(this.settings.music, t + 0.7, 0.12);
      }
    }
  }
  pause() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {}
    }
    this.ambientSource?.stop();
    this.ambientSource = null;
    void this.context?.suspend();
  }
  destroy() {
    this.pause();
    void this.context?.close();
    this.context = null;
  }
}
