'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import GameCanvas from './GameCanvas';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Simulation } from '../src/game/simulation';
import { STAGES, HAZARDS, type Command, type Mode } from '../src/content/world';
import {
  defaults,
  loadSave,
  persist,
  bankStage,
  recordBest,
  type SaveData,
  type Settings,
} from '../src/services/save';
import { ChaiAudio } from '../src/services/audio';
import { FrameClock } from '../src/game/clock';

type Screen =
  | 'home'
  | 'settings'
  | 'credits'
  | 'playing'
  | 'tutorial'
  | 'paused'
  | 'countdown'
  | 'failed'
  | 'clear'
  | 'finale'
  | 'error';
const CROSS_LESSONS = [
  {
    key: 'up',
    title: 'One step toward chai.',
    text: 'Press ↑ or W, swipe up, or tap Forward. One press is one hop.',
  },
  {
    key: 'left',
    title: 'There is more than one way.',
    text: 'Step left. Sideways moves help you line up with a gap.',
  },
  {
    key: 'down',
    title: 'You can always step back.',
    text: 'Step backward. Waiting and retreating are part of the game.',
  },
  {
    key: 'right',
    title: 'Take your time.',
    text: 'Step right. Safe pavements have no timer. Let the traffic go first.',
  },
];
const RUSH_LESSONS = [
  {
    key: 'left',
    title: 'Find your lane.',
    text: 'Press ← or A, swipe left, or tap Left. You move one lane at a time.',
  },
  {
    key: 'right',
    title: 'Keep a little room.',
    text: 'Move right. Cars, buses and cows must be avoided.',
  },
  {
    key: 'up',
    title: 'A small leap.',
    text: 'Press ↑ or W to jump. Low wooden crates can be jumped; cars cannot.',
  },
  {
    key: 'down',
    title: 'Duck under the noise.',
    text: 'When you land, press ↓ or S to slide. Striped overhead frames have room underneath.',
  },
  {
    key: 'up',
    title: 'Now put them together.',
    text: 'Jump once more. You can change lanes during a jump or a slide.',
  },
  {
    key: 'right',
    title: 'Smooth landing.',
    text: 'Move right during or after your jump. You are ready for the street.',
  },
];

export default function CommuteApp() {
  const [screen, setScreen] = useState<Screen>('home');
  const screenRef = useRef<Screen>('home');
  const [save, setSave] = useState<SaveData>(defaults);
  const saveRef = useRef<SaveData>(defaults());
  const [hud, setHud] = useState({
    score: 0,
    tokens: 0,
    row: 0,
    distance: 0,
    stage: 0,
    mode: 'crossing' as Mode,
  });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [tutorial, setTutorial] = useState(0);
  const tutorialRef = useRef(0);
  const [countdown, setCountdown] = useState(3);
  const [intro, setIntro] = useState(0);
  const [ending, setEnding] = useState(false);
  const [remap, setRemap] = useState('');
  const [engineKey, setEngineKey] = useState(0);
  const sim = useRef<Simulation | null>(null);
  const audio = useRef<ChaiAudio | null>(null);
  const clock = useRef(new FrameClock());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hydrated = useRef(false);
  const readyRef = useRef(false);
  readyRef.current = ready;
  const pauseReason = useRef('Take a breath.');
  const settingsReturn = useRef<Screen>('home');
  const go = useCallback((s: Screen) => {
    screenRef.current = s;
    setScreen(s);
    clock.current.reset();
    sim.current?.clearInput();
  }, []);
  const write = useCallback((data: SaveData) => {
    saveRef.current = data;
    setSave(data);
    if (!persist(data)) setStorageError(true);
  }, []);
  const sound = () => {
    if (!audio.current) audio.current = new ChaiAudio();
    return audio.current;
  };
  useEffect(() => {
    const data = loadSave();
    saveRef.current = data.save;
    setSave(data.save);
    setStorageError(data.error);
    hydrated.current = true;
    if (data.save.introSeen) setIntro(5);
    return () => {
      audio.current?.destroy();
      if (timer.current) clearInterval(timer.current);
    };
  }, []);
  useEffect(() => {
    if (intro >= 5 || screen !== 'home') return;
    const id = setTimeout(() => setIntro((i) => i + 1), 850);
    return () => clearTimeout(id);
  }, [intro, screen]);
  const publishHud = () => {
    const s = sim.current;
    if (s)
      setHud({
        score: s.practice ? 0 : s.score,
        tokens: s.practice ? 0 : s.tokens,
        row: s.practice ? 0 : s.maxRow,
        distance: s.practice ? 0 : Math.floor(s.distance),
        stage: s.practice ? 0 : s.renderStage,
        mode: s.mode,
      });
  };
  const start = useCallback(
    (mode: Mode, continuing = false, replayTutorial = false) => {
      if (!hydrated.current) return;
      let d = structuredClone(saveRef.current);
      if (mode === 'endless' && !d.unlocked) return;
      if (mode === 'crossing' && !continuing) {
        d.campaign = {
          seed: Date.now() >>> 0,
          nextStage: 0,
          banked: [],
          assisted: d.settings.assisted,
        };
      }
      if (mode === 'crossing' && d.campaign.nextStage >= 5) {
        go('finale');
        return;
      }
      d.introSeen = true;
      write(d);
      setIntro(5);
      const tutorialMode = mode === 'rush' ? 'rush' : 'crossing';
      const showTutorial =
        replayTutorial || (!d.tutorials[tutorialMode] && mode !== 'endless');
      const seed = mode === 'crossing' ? d.campaign.seed : Date.now() >>> 0;
      sim.current = new Simulation(
        mode,
        mode === 'crossing' ? d.campaign.nextStage : 0,
        seed,
        showTutorial,
      );
      sim.current.assisted =
        mode === 'crossing' ? d.campaign.assisted : d.settings.assisted;
      tutorialRef.current = 0;
      setTutorial(0);
      setError('');
      setEnding(d.settings.sutta);
      publishHud();
      go(showTutorial ? 'tutorial' : 'playing');
      void sound().unlock(d.settings);
      sound().setScene(
        mode === 'rush'
          ? 'rush'
          : sim.current.renderStage === 2
            ? 'rain'
            : 'street',
      );
    },
    [go, write],
  );
  const retry = useCallback(() => {
    const s = sim.current;
    if (!s) return;
    const mode = s.mode;
    sim.current = new Simulation(
      mode,
      s.stage,
      mode === 'rush' ? Date.now() >>> 0 : s.seed,
      s.practice,
    );
    sim.current.assisted = s.assisted;
    publishHud();
    go(s.practice ? 'tutorial' : 'playing');
    void sound().unlock(saveRef.current.settings);
  }, [go]);
  const home = useCallback(() => {
    go('home');
    sim.current = null;
    setReady(false);
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    sound().setScene('office');
    void sound().unlock(saveRef.current.settings);
  }, [go]);
  const finishTutorial = () => {
    const s = sim.current;
    if (!s) return;
    const d = structuredClone(saveRef.current);
    d.tutorials[s.mode === 'rush' ? 'rush' : 'crossing'] = true;
    write(d);
    sim.current = new Simulation(s.mode, s.stage, s.seed);
    sim.current.assisted = s.assisted;
    publishHud();
    go('playing');
  };
  const pause = useCallback(
    (reason = 'Take a breath.') => {
      if (!['playing', 'tutorial', 'countdown'].includes(screenRef.current))
        return;
      pauseReason.current = reason;
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      go('paused');
      audio.current?.pause();
    },
    [go],
  );
  const resume = () => {
    if (screenRef.current !== 'paused') return;
    setCountdown(3);
    go('countdown');
    let n = 3;
    timer.current = setInterval(() => {
      n--;
      if (n === 0) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        go(sim.current?.practice ? 'tutorial' : 'playing');
        void sound().unlock(saveRef.current.settings);
      } else setCountdown(n);
    }, 700);
  };
  const command = useCallback(
    (cmd: Command) => {
      if (
        !['playing', 'tutorial'].includes(screenRef.current) ||
        !sim.current ||
        !ready
      )
        return;
      const s = sim.current;
      const before = {
        hop: s.player.hop,
        lane: s.player.lane,
        action: s.player.action,
      };
      s.input(cmd);
      if (screenRef.current === 'tutorial') {
        const lessons = s.mode === 'rush' ? RUSH_LESSONS : CROSS_LESSONS;
        const i = tutorialRef.current;
        const accepted =
          s.player.hop !== before.hop ||
          s.player.lane !== before.lane ||
          s.player.action !== before.action;
        if (accepted && lessons[i]?.key === cmd) {
          tutorialRef.current = i + 1;
          setTutorial(i + 1);
        }
      }
    },
    [ready],
  );
  const commandRef = useRef(command);
  commandRef.current = command;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.closest(
          'input,textarea,[role="slider"],[role="switch"]',
        )
      )
        return;
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        pause();
        return;
      }
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      const arrows: Record<string, Command> = {
        arrowup: 'up',
        arrowdown: 'down',
        arrowleft: 'left',
        arrowright: 'right',
      };
      const mapped =
        arrows[key] ??
        (Object.entries(saveRef.current.settings.bindings).find(
          ([, v]) => v === key,
        )?.[0] as Command | undefined);
      if (mapped && ['playing', 'tutorial'].includes(screenRef.current)) {
        e.preventDefault();
        commandRef.current(mapped);
      }
    };
    const blur = () => pause('The street paused while you were away.');
    const visibility = () => {
      if (document.hidden) blur();
    };
    const resize = () => pause('The view changed. Ready when you are.');
    window.addEventListener('keydown', key);
    window.addEventListener('blur', blur);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('blur', blur);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [pause]);
  const advance = useCallback(
    (delta: number) => {
      const s = sim.current;
      if (!s || !['playing', 'tutorial'].includes(screenRef.current)) return;
      if (delta > 250) {
        pause('A little interruption. Your progress is safe.');
        return;
      }
      const assisted = s.assisted;
      clock.current.advance(delta, true, assisted, () => {
        s.step();
        for (const e of s.drainEvents()) sound().cue(e.type);
        if (s.status === 'failed') {
          if (s.practice) {
            sim.current = new Simulation(s.mode, s.stage, s.seed, true);
            return false;
          }
          if (s.mode !== 'crossing') {
            const d = structuredClone(saveRef.current);
            recordBest(d, s.mode, s.score, assisted);
            write(d);
          }
          publishHud();
          go('failed');
          return false;
        }
        if (s.status === 'clear') {
          if (s.practice) return false;
          const d = bankStage(saveRef.current, s.stage, s.score);
          write(d);
          publishHud();
          go(s.stage === 4 ? 'finale' : 'clear');
          if (s.stage === 4) {
            setEnding(d.settings.sutta);
            sound().setScene('chai');
          }
          return false;
        }
        if (s.tick % 6 === 0) publishHud();
      });
    },
    [go, pause, write],
  );
  const change = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const d = structuredClone(saveRef.current);
    d.settings[key] = value;
    write(d);
    audio.current?.apply(d.settings);
  };
  const openSettings = (from: Screen) => {
    settingsReturn.current = from;
    go('settings');
  };
  const returnSettings = () => {
    go(settingsReturn.current === 'paused' ? 'paused' : 'home');
  };
  const stage = STAGES[hud.stage];
  const playing = [
    'playing',
    'tutorial',
    'paused',
    'countdown',
    'failed',
    'clear',
    'error',
  ].includes(screen);
  const currentMode = sim.current?.mode ?? hud.mode;
  const lessons = currentMode === 'rush' ? RUSH_LESSONS : CROSS_LESSONS;
  const lesson = lessons[tutorial];
  const assisted = sim.current?.assisted ?? save.settings.assisted;
  const banked = save.campaign.banked.reduce((a, b) => a + b, 0);
  const category = `${currentMode}-${assisted ? 'assisted' : 'standard'}`;
  const showError = (message: string) => {
    setError(message);
    go('error');
    audio.current?.pause();
  };

  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const life = new AbortController();
    const empty = (input: unknown) => {
      if (!input || typeof input !== 'object' || Object.keys(input).length)
        throw Error('Expected an empty object.');
    };
    const settled = () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    const status = () => ({
      screen: screenRef.current,
      mode: sim.current?.mode ?? null,
      score: sim.current?.score ?? 0,
      rendererReady: readyRef.current,
      nextStage: saveRef.current.campaign.nextStage,
      endlessUnlocked: saveRef.current.unlocked,
    });
    const tools = [
      {
        name: 'read_game_status',
        description:
          'Read the current Bas Ek Chai screen, mode, score and local unlocks.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: (input: unknown) => {
          empty(input);
          return status();
        },
      },
      {
        name: 'start_game',
        description:
          'Start a new Bas Ek Chai game from the home screen. Crossing starts a new campaign; Rush Hour is immediately available. Does not skip tutorials or unlock modes.',
        inputSchema: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['crossing', 'rush', 'endless'] },
          },
          required: ['mode'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: async (input: unknown) => {
          const v = input as { mode?: Mode };
          if (
            !v ||
            Object.keys(v).length !== 1 ||
            !['crossing', 'rush', 'endless'].includes(v.mode ?? '')
          )
            throw Error('Choose crossing, rush, or endless.');
          if (screenRef.current !== 'home')
            throw Error('Return home before starting another run.');
          if (v.mode === 'endless' && !saveRef.current.unlocked)
            throw Error('Complete the campaign to unlock Endless Crossing.');
          start(v.mode!);
          await settled();
          return status();
        },
      },
      {
        name: 'return_home',
        description:
          'Return to the office home screen. Discards the current provisional attempt and preserves banked campaign checkpoints and best scores.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: async (input: unknown) => {
          empty(input);
          home();
          await settled();
          return status();
        },
      },
      {
        name: 'pause_game',
        description:
          'Pause the current game without losing progress. Does not advance gameplay.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: (input: unknown) => {
          if (!input || typeof input !== 'object' || Object.keys(input).length)
            throw Error('Expected an empty object.');
          pause('Paused for you.');
          return { screen: screenRef.current };
        },
      },
    ];
    for (const tool of tools) {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: life.signal }),
        ).catch(() => {});
      } catch {}
    }
    return () => life.abort();
  }, [pause, start, home]);

  return (
    <main
      className={`app ${save.settings.lowMotion ? 'low-motion' : ''} ${save.settings.contrast ? 'high-contrast' : ''}`}
    >
      <header className="masthead">
        <button
          className="wordmark plain"
          onClick={home}
          aria-label="Bas Ek Chai home"
        >
          बस एक चाय <span>BAS EK CHAI</span>
        </button>
        <span className="edition">AN EVENING WELL SPENT · VOL. 01</span>
        <div className="header-actions">
          <button
            className="plain sound-button"
            onClick={() => {
              change('mute', !save.settings.mute);
              void sound().unlock({ ...saveRef.current.settings });
            }}
            aria-label={save.settings.mute ? 'Turn sound on' : 'Mute sound'}
          >
            {save.settings.mute ? '♪ OFF' : '♪ ON'}
          </button>
          <span className="time">
            {playing ? stage.time : '18:30'} · CLOCKED OUT
          </span>
        </div>
      </header>
      {storageError && (
        <p className="storage-notice" role="status">
          Progress cannot be saved in this browser. You can still play.
        </p>
      )}
      {screen === 'home' && (
        <section
          className="home-scene"
          style={{ backgroundImage: 'url(/assets/office.webp)' }}
        >
          <div className="home-copy">
            <p className="eyebrow">THE LAPTOP IS CLOSED. THE CITY ISN’T.</p>
            <h1>
              Bas Ek
              <br />
              <em>Chai.</em>
            </h1>
            <p className="intro">
              Five streets. A little chaos.
              <br />
              One very good reason to get home.
            </p>
            <div className="mode-list">
              <button onClick={() => start('crossing')}>
                <b>Cross the Road</b>
                <span>
                  THE EVENING COMMUTE <i>↗</i>
                </span>
              </button>
              <button onClick={() => start('rush')}>
                <b>Rush Hour</b>
                <span>
                  THE ENDLESS RUN <i>↗</i>
                </span>
              </button>
            </div>
            {save.campaign.nextStage > 0 && save.campaign.nextStage < 5 && (
              <button
                className="continue-link"
                onClick={() => start('crossing', true)}
              >
                Continue · {STAGES[save.campaign.nextStage].name} →
              </button>
            )}
            {save.unlocked && (
              <button
                className="continue-link"
                onClick={() => start('endless')}
              >
                Endless Crossing · unlocked →
              </button>
            )}
            <div className="home-options">
              <button onClick={() => openSettings('home')}>Settings</button>
              <button onClick={() => go('credits')}>Credits</button>
            </div>
            <p className="home-note">HEADPHONES ON. SHOULDERS DOWN.</p>
          </div>
          <div className={`office-moment ${intro < 5 ? 'opening' : ''}`}>
            <div className="moment-bubble">
              {
                [
                  '18:30. Finally.',
                  'Laptop closed.',
                  'Just one last email?',
                  'Kal kar lenge.',
                  'Bas ek chai.',
                  'Kal kar lenge.',
                ][intro]
              }
            </div>
            {intro < 5 ? (
              <div
                className="office-sequence"
                style={{ backgroundPosition: `${-intro * 80}px 0` }}
                aria-label="The worker closes his laptop, stretches and picks up his bag."
              />
            ) : (
              <div className="office-worker" aria-hidden="true" />
            )}
            {intro < 5 && (
              <button
                onClick={() => {
                  setIntro(5);
                  const d = structuredClone(saveRef.current);
                  d.introSeen = true;
                  write(d);
                }}
              >
                Skip opening →
              </button>
            )}
          </div>
          <div className="scene-caption">
            <span>01 / OFFICE GULLY</span>
            <span>JUST ONE CUP.</span>
          </div>
        </section>
      )}

      {playing && (
        <section className="play-layout">
          <aside className="journey-panel">
            <p className="eyebrow">
              {currentMode === 'rush'
                ? 'THE ENDLESS RUN'
                : currentMode === 'endless'
                  ? 'ONE MORE STREET'
                  : 'THE EVENING COMMUTE'}
            </p>
            <h2>{currentMode === 'rush' ? 'Rush Hour' : stage.name}</h2>
            <p className="stage-subtitle">{stage.subtitle}</p>
            <ol className="journey-map">
              {STAGES.map((s, i) => (
                <li
                  key={s.id}
                  className={
                    i === hud.stage ? 'current' : i < hud.stage ? 'visited' : ''
                  }
                >
                  <span>
                    {i < hud.stage ? '✓' : String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    {s.name}
                    <small>{s.time}</small>
                  </div>
                </li>
              ))}
            </ol>
            <p className="street-tip">
              {currentMode === 'rush'
                ? 'Keep moving. Jump low crates, slide under frames, and give everyone else some room.'
                : stage.lesson}
            </p>
            <button className="text-button" onClick={() => pause()}>
              P / ESC · Take a break
            </button>
          </aside>
          <div className="cabinet">
            <div className="game-hud">
              <div>
                <small>
                  {currentMode === 'rush'
                    ? 'DISTANCE'
                    : currentMode === 'endless'
                      ? 'ROWS'
                      : 'PROGRESS'}
                </small>
                <b>
                  {currentMode === 'rush'
                    ? `${hud.distance} m`
                    : currentMode === 'endless'
                      ? hud.row
                      : `${Math.min(24, hud.row)} / 24`}
                </b>
              </div>
              <div>
                <small>CHAI</small>
                <b>♨ {hud.tokens}</b>
              </div>
              <div>
                <small>SCORE</small>
                <b>{hud.score.toString().padStart(3, '0')}</b>
              </div>
              <button onClick={() => pause()} aria-label="Pause game">
                Ⅱ
              </button>
            </div>
            <div className="canvas-shell">
              <GameCanvas
                key={engineKey}
                simulation={() => sim.current}
                settings={() => saveRef.current.settings}
                advance={advance}
                ready={() => setReady(true)}
                error={showError}
                command={command}
              />
              {!ready && screen !== 'error' && (
                <div className="game-overlay">
                  <p>Opening the office door…</p>
                </div>
              )}
              {screen === 'tutorial' && ready && (
                <div className="tutorial-card" role="status">
                  <div className="tutorial-top">
                    <span>
                      STREET SCHOOL · {Math.min(tutorial + 1, lessons.length)} /{' '}
                      {lessons.length}
                    </span>
                    <button onClick={finishTutorial}>Skip →</button>
                  </div>
                  <h3>{lesson?.title ?? 'You’ve got this.'}</h3>
                  <p>
                    {lesson?.text ?? 'Take the long way. The chai will wait.'}
                  </p>
                  {!lesson && (
                    <button className="primary" onClick={finishTutorial}>
                      Into the street →
                    </button>
                  )}
                </div>
              )}
              {screen === 'paused' && (
                <div className="game-overlay">
                  <p className="eyebrow">NO HURRY.</p>
                  <h2>Chai can wait.</h2>
                  <p>{pauseReason.current}</p>
                  <button className="primary" onClick={resume}>
                    Back to the street
                  </button>
                  <button className="secondary" onClick={retry}>
                    Restart this {currentMode === 'crossing' ? 'stage' : 'run'}
                  </button>
                  <button
                    className="text-button"
                    onClick={() => openSettings('paused')}
                  >
                    Sound & settings
                  </button>
                  <button className="text-button" onClick={home}>
                    Save & go home
                  </button>
                </div>
              )}
              {screen === 'countdown' && (
                <div className="game-overlay">
                  <p className="eyebrow">READY WHEN YOU ARE</p>
                  <strong className="countdown">{countdown}</strong>
                  <p>The street is still paused.</p>
                </div>
              )}
              {screen === 'failed' && (
                <div className="game-overlay">
                  <p className="eyebrow">
                    {['cow', 'pedestrian'].includes(sim.current?.cause ?? '')
                      ? 'OOPS. EXCUSE ME.'
                      : 'A LITTLE TOO SOON.'}
                  </p>
                  <h2>
                    {['cow', 'pedestrian'].includes(sim.current?.cause ?? '')
                      ? 'Mind your step.'
                      : 'Missed the gap.'}
                  </h2>
                  <p className="failure-cause">
                    {HAZARDS[sim.current?.cause as keyof typeof HAZARDS]
                      ?.label ?? 'Street obstacle'}
                  </p>
                  <p>
                    {HAZARDS[sim.current?.cause as keyof typeof HAZARDS]?.tip ??
                      'Take another look and try again.'}
                  </p>
                  <div className="result-numbers">
                    <span>
                      <small>THIS ATTEMPT</small>
                      <b>{hud.score}</b>
                    </span>
                    <span>
                      <small>
                        {currentMode === 'crossing' ? 'BANKED' : 'BEST'}
                      </small>
                      <b>
                        {currentMode === 'crossing'
                          ? banked
                          : (save.best[category] ?? 0)}
                      </b>
                    </span>
                  </div>
                  <button className="primary" onClick={retry}>
                    One more try →
                  </button>
                  <button className="text-button" onClick={home}>
                    Back to the office
                  </button>
                </div>
              )}
              {screen === 'clear' && (
                <div className="game-overlay">
                  <p className="eyebrow">ONE STREET CLOSER.</p>
                  <h2>Made it.</h2>
                  <p>
                    {stage.name} is behind you.
                    <br />
                    {STAGES[Math.min(4, hud.stage + 1)].name} is up next.
                  </p>
                  <div className="result-numbers">
                    <span>
                      <small>STAGE BANKED</small>
                      <b>{hud.score}</b>
                    </span>
                    <span>
                      <small>COMMUTE TOTAL</small>
                      <b>{banked}</b>
                    </span>
                  </div>
                  <button
                    className="primary"
                    onClick={() => start('crossing', true)}
                  >
                    Next street →
                  </button>
                  <button className="text-button" onClick={home}>
                    Save & go home
                  </button>
                </div>
              )}
              {screen === 'error' && (
                <div className="game-overlay">
                  <h2>A small detour.</h2>
                  <p role="alert">{error}</p>
                  <button
                    className="primary"
                    onClick={() => {
                      setReady(false);
                      setEngineKey((n) => n + 1);
                      go('paused');
                    }}
                  >
                    Reload the scene
                  </button>
                  <button className="text-button" onClick={home}>
                    Home
                  </button>
                </div>
              )}
            </div>
            <div
              className="touch-controls"
              aria-label={
                currentMode === 'rush' ? 'Runner controls' : 'Crossing controls'
              }
            >
              {(['left', 'up', 'down', 'right'] as Command[]).map((c, i) => (
                <button
                  key={c}
                  onClick={() => command(c)}
                  aria-label={
                    currentMode === 'rush'
                      ? ['Move left', 'Jump', 'Slide', 'Move right'][i]
                      : [
                          'Move left',
                          'Move forward',
                          'Move backward',
                          'Move right',
                        ][i]
                  }
                  disabled={!ready || !['playing', 'tutorial'].includes(screen)}
                >
                  <b>{['←', '↑', '↓', '→'][i]}</b>
                  <span>
                    {currentMode === 'rush'
                      ? ['LEFT', 'JUMP', 'SLIDE', 'RIGHT'][i]
                      : ['LEFT', 'FORWARD', 'BACK', 'RIGHT'][i]}
                  </span>
                </button>
              ))}
            </div>
            <div className="cabinet-footer">
              <span>{assisted ? 'ASSISTED · 75% SPEED' : 'STANDARD PACE'}</span>
              <span>
                {currentMode === 'crossing'
                  ? 'CHECKPOINTS AT EACH STREET'
                  : 'ONE RUN. ONE CHANCE.'}
              </span>
            </div>
          </div>
          <aside
            className="postcard"
            style={{ backgroundImage: 'url(/assets/chai.webp)' }}
          >
            <div>
              <p className="eyebrow">YOUR DESTINATION</p>
              <h3>
                Just
                <br />
                one cup.
              </h3>
              <p>
                Not every journey
                <br />
                needs a grand ending.
              </p>
            </div>
            <span className="postcard-stamp">
              CHAI CHOWK
              <br />
              OPEN TILL LATE
            </span>
          </aside>
        </section>
      )}

      {screen === 'finale' && (
        <section
          className="finale-scene"
          style={{ backgroundImage: 'url(/assets/chai.webp)' }}
        >
          <div className="finale-copy">
            <p className="eyebrow">19:20 · CHAI CHOWK</p>
            <h1>
              You
              <br />
              <em>made it.</em>
            </h1>
            <p>
              The bag goes down. The chai comes up.
              <br />
              For a moment, nothing is urgent.
            </p>
            <div className="finale-score">
              <b>{banked}</b>
              <span>
                POINTS BANKED
                <br />
                {save.campaign.assisted
                  ? 'ASSISTED COMMUTE'
                  : 'FIVE STREETS. ONE GOOD EVENING.'}
              </span>
            </div>
            <p className="unlock-note">
              ✦ Endless Crossing unlocked · New shirt unlocked
            </p>
            <button className="primary" onClick={() => start('endless')}>
              Take the endless way →
            </button>
            <button className="secondary" onClick={() => start('rush')}>
              Try Rush Hour
            </button>
            <div className="ending-choice">
              <Switch
                checked={ending}
                onCheckedChange={(v) => {
                  setEnding(v);
                  change('sutta', v);
                }}
                aria-label="Chai and sutta ending"
              />
              <span>
                Chai & sutta break{' '}
                <small>Just a different ending. Same result.</small>
              </span>
            </div>
            <button className="text-button" onClick={home}>
              Back to the office
            </button>
          </div>
          <div
            className={`arrival-worker ${ending ? 'with-sutta' : ''}`}
            aria-label={
              ending
                ? 'The office worker takes a chai and cigarette break.'
                : 'The office worker enjoys his chai.'
            }
          />
        </section>
      )}

      {screen === 'settings' && (
        <section className="settings-page">
          <div className="section-heading">
            <p className="eyebrow">MAKE YOURSELF COMFORTABLE</p>
            <h2>Your kind of evening.</h2>
            <button className="text-button" onClick={returnSettings}>
              ← Back
            </button>
          </div>
          <div className="settings-grid">
            <section>
              <h3>Listen</h3>
              <SettingToggle
                label="Mute all sound"
                checked={save.settings.mute}
                onChange={(v) => change('mute', v)}
              />
              {(['music', 'effects', 'ambience'] as const).map((k) => (
                <div className="volume-setting" key={k}>
                  <label id={`volume-${k}`}>
                    {k[0].toUpperCase() + k.slice(1)}{' '}
                    <span>{Math.round(save.settings[k] * 100)}%</span>
                  </label>
                  <Slider
                    min={0}
                    max={100}
                    value={[Math.round(save.settings[k] * 100)]}
                    aria-labelledby={`volume-${k}`}
                    onValueChange={(v) =>
                      change(k, (Array.isArray(v) ? v[0] : v) / 100)
                    }
                  />
                </div>
              ))}
              <button
                className="text-button"
                onClick={() => {
                  void sound().unlock(saveRef.current.settings);
                  sound().cue('pickup');
                }}
              >
                Test sound ♪
              </button>
              <h3>Look</h3>
              <SettingToggle
                label="Low motion"
                note="Less bobbing; the same collision timing."
                checked={save.settings.lowMotion}
                onChange={(v) => change('lowMotion', v)}
              />
              <SettingToggle
                label="Low effects"
                note="Reduce rain and decorative effects."
                checked={save.settings.lowEffects}
                onChange={(v) => change('lowEffects', v)}
              />
              <SettingToggle
                label="High contrast player"
                checked={save.settings.contrast}
                onChange={(v) => change('contrast', v)}
              />
            </section>
            <section>
              <h3>Play your way</h3>
              <SettingToggle
                label="Assisted pace"
                note="75% speed. Separate best scores. Applies to new campaigns and the next endless run."
                checked={save.settings.assisted}
                onChange={(v) => change('assisted', v)}
              />
              <SettingToggle
                label="Chai & sutta ending"
                note="Cosmetic only. No bonus, boost or unlock."
                checked={save.settings.sutta}
                onChange={(v) => change('sutta', v)}
              />
              <div className="shirt-choice">
                <p>Office shirt</p>
                {['Saffron', 'Sea green', 'Rose'].map((name, i) => (
                  <button
                    key={name}
                    aria-pressed={save.settings.shirt === i}
                    disabled={i >= save.cosmetics}
                    onClick={() => change('shirt', i)}
                  >
                    <span
                      style={{
                        background: ['#f0c266', '#71bcb1', '#d78c98'][i],
                      }}
                    />
                    {name}
                    {i >= save.cosmetics ? ' · locked' : ''}
                  </button>
                ))}
              </div>
              <h3>Controls</h3>
              <p className="muted">
                Arrow keys always work. Choose four different letters or numbers
                below. P and Esc pause.
              </p>
              <div className="key-bindings">
                {(['up', 'down', 'left', 'right'] as const).map((k) => (
                  <label key={k}>
                    {k}
                    <input
                      value={save.settings.bindings[k]}
                      maxLength={1}
                      aria-label={`Remap ${k}`}
                      onChange={(e) => {
                        const key = e.target.value.toLowerCase();
                        if (
                          !/^[a-z0-9]$/.test(key) ||
                          key === 'p' ||
                          Object.entries(save.settings.bindings).some(
                            ([other, v]) => other !== k && v === key,
                          )
                        ) {
                          setRemap(
                            'Use a different letter or number (except P).',
                          );
                          return;
                        }
                        setRemap('');
                        change('bindings', {
                          ...save.settings.bindings,
                          [k]: key,
                        });
                      }}
                    />
                  </label>
                ))}
              </div>
              {remap && <p role="status">{remap}</p>}
              <div className="volume-setting">
                <label id="swipe-label">
                  Swipe distance <span>{save.settings.swipe}px</span>
                </label>
                <Slider
                  min={12}
                  max={80}
                  value={[save.settings.swipe]}
                  aria-labelledby="swipe-label"
                  onValueChange={(v) =>
                    change('swipe', Array.isArray(v) ? v[0] : v)
                  }
                />
              </div>
              <div className="tutorial-links">
                <button
                  className="secondary"
                  onClick={() =>
                    start('crossing', save.campaign.nextStage < 5, true)
                  }
                >
                  Crossing tutorial
                </button>
                <button
                  className="secondary"
                  onClick={() => start('rush', false, true)}
                >
                  Runner tutorial
                </button>
              </div>
            </section>
          </div>
        </section>
      )}

      {screen === 'credits' && (
        <section className="credits-page">
          <p className="eyebrow">MADE WITH A LITTLE PATIENCE</p>
          <h2>The people behind the pixels.</h2>
          <p>
            Bas Ek Chai is an original game about the small joy at the end of an
            ordinary workday.
          </p>
          <dl>
            <dt>Created for</dt>
            <dd>pranavharan02</dd>
            <dt>Game design</dt>
            <dd>Bas Ek Chai · original product brief and commute world</dd>
            <dt>City tiles</dt>
            <dd>Kenney · Roguelike Modern City · CC0</dd>
            <dt>Characters & street objects</dt>
            <dd>Original editable pixel sprites and animation sources</dd>
            <dt>Office & chai-stall illustrations</dt>
            <dd>
              Original AI-generated artwork, created with OpenAI image
              generation
            </dd>
            <dt>Music & sound</dt>
            <dd>
              “The Long Way to a Small Joy” · original melody, synthesis and
              sound effects
            </dd>
            <dt>Engine</dt>
            <dd>Phaser 4.2.1 · MIT</dd>
          </dl>
          <p className="muted">
            Progress stays in this browser. No account, ads, purchases or paid
            revives.
          </p>
          <a
            className="secondary"
            href="https://github.com/pranavharan02/bas-ek-chai"
            target="_blank"
            rel="noreferrer"
          >
            Source, credits & production notes ↗
          </a>
          <button className="text-button" onClick={home}>
            ← Back to the office
          </button>
        </section>
      )}
      <footer>
        <span>A SMALL GAME ABOUT THE LONG WAY TO A SMALL JOY.</span>
        <span>ARROWS / WASD · TOUCH FRIENDLY</span>
      </footer>
    </main>
  );
}
function SettingToggle({
  label,
  note,
  checked,
  onChange,
}: {
  label: string;
  note?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="setting-toggle">
      <span>
        {label}
        {note && <small>{note}</small>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}
