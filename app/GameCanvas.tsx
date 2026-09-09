'use client';
import { useEffect, useRef } from 'react';
import type { Simulation } from '../src/game/simulation';
import type { Settings } from '../src/services/save';
interface Props {
  simulation: () => Simulation | null;
  settings: () => Settings;
  advance: (delta: number) => void;
  ready: () => void;
  error: (message: string) => void;
  command: (command: 'up' | 'down' | 'left' | 'right') => void;
}
export default function GameCanvas(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const callbacks = useRef(props);
  callbacks.current = props;
  useEffect(() => {
    let disposed = false;
    let destroy: (() => void) | undefined;
    void import('../src/game/view')
      .then(({ createGameView }) => {
        if (disposed || !container.current) return;
        destroy = createGameView(container.current, {
          simulation: () => callbacks.current.simulation(),
          settings: () => callbacks.current.settings(),
          advance: (d) => callbacks.current.advance(d),
          ready: () => callbacks.current.ready(),
          error: (e) => callbacks.current.error(e),
        });
      })
      .catch(() =>
        callbacks.current.error('The game could not start. Please retry.'),
      );
    return () => {
      disposed = true;
      destroy?.();
    };
  }, []);
  const pointer = useRef<{
    x: number;
    y: number;
    t: number;
    id: number;
  } | null>(null);
  useEffect(() => {
    const cancel = () => {
      pointer.current = null;
    };
    window.addEventListener('blur', cancel);
    window.addEventListener('resize', cancel);
    return () => {
      window.removeEventListener('blur', cancel);
      window.removeEventListener('resize', cancel);
    };
  }, []);
  return (
    <div
      ref={container}
      className="game-canvas"
      role="img"
      aria-label="Pixel street game. Use arrow keys, WASD, swipes, or the labelled controls below."
      onPointerDown={(e) => {
        pointer.current = {
          x: e.clientX,
          y: e.clientY,
          t: performance.now(),
          id: e.pointerId,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerCancel={() => (pointer.current = null)}
      onPointerUp={(e) => {
        const p = pointer.current;
        pointer.current = null;
        if (!p || p.id !== e.pointerId || performance.now() - p.t > 500) return;
        const dx = e.clientX - p.x,
          dy = e.clientY - p.y;
        if (
          Math.max(Math.abs(dx), Math.abs(dy)) <
          callbacks.current.settings().swipe
        )
          return;
        callbacks.current.command(
          Math.abs(dx) > Math.abs(dy)
            ? dx > 0
              ? 'right'
              : 'left'
            : dy > 0
              ? 'down'
              : 'up',
        );
      }}
    />
  );
}
