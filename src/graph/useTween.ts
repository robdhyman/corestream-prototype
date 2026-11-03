// Re-lay the graph live when the Arrangement changes (ticket 02: "An Arrangement Change re-lays the graph live
// in the preview"). Eases each Entity from where it is drawn to its new position over 520 ms, as the prototype did.

import { useEffect, useRef, useState } from 'react';
import type { Point } from '../data/types';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

export function useTween(target: Record<string, Point>, ms = 520): { pos: Record<string, Point>; settled: boolean } {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    const moved = Object.keys(target).some((id) => from[id] && (from[id].x !== target[id].x || from[id].y !== target[id].y));
    if (!moved || reduced()) { shownRef.current = target; setShown(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const e = ease(Math.min(1, (now - t0) / ms));
      const next: Record<string, Point> = {};
      for (const id of Object.keys(target)) {
        const a = from[id] ?? target[id], b = target[id];
        next[id] = e >= 1 ? b : { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
      }
      shownRef.current = e >= 1 ? target : next;
      setShown(shownRef.current);
      if (e < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return { pos: { ...target, ...pick(shown, target) }, settled: shown === target };
}

/** Positions still in flight, for ids the target also has. */
function pick(shown: Record<string, Point>, target: Record<string, Point>) {
  const out: Record<string, Point> = {};
  for (const id of Object.keys(target)) if (shown[id]) out[id] = shown[id];
  return out;
}
