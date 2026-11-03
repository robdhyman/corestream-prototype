// Seeded Fruchterman–Reingold layout, ported from the R3 prototype's graph engine
// (research/r3/graph-engine.js: rng, hashId, seedPositions, layout). Pure functions; no DOM.
// Arrangements carry designed coordinates, so this only places Entities that have none yet,
// e.g. the ones a Proposal adds. `damp` slows the Entities already on screen to 15% speed.

import type { Point } from '../data/types';

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Place each unplaced id 90–160 px from an already-placed neighbour, at a hash-seeded angle. */
export function seedPositions(ids: string[], pos: Map<string, Point>, neighbourOf: (id: string) => string | undefined): void {
  for (const id of ids) {
    if (pos.has(id)) continue;
    const r = rng(hashId(id));
    const n = neighbourOf(id);
    const p = (n && pos.get(n)) || { x: 0, y: 0 };
    const ang = r() * Math.PI * 2, rad = 90 + r() * 70;
    pos.set(id, { x: p.x + Math.cos(ang) * rad, y: p.y + Math.sin(ang) * rad });
  }
}

export function layout(
  ids: string[],
  edges: { source: string; target: string }[],
  pos: Map<string, Point>,
  opts: { iterations: number; pinned?: Set<string>; damp?: Set<string>; centre?: Point },
): void {
  const n = ids.length; if (!n) return;
  const idx = new Map(ids.map((id, i) => [id, i]));
  const px = ids.map((id) => pos.get(id)!.x), py = ids.map((id) => pos.get(id)!.y);
  const c = opts.centre ?? { x: 0, y: 0 };
  const k = 96; let t = 80;
  const el = edges.filter((e) => idx.has(e.source) && idx.has(e.target)).map((e) => [idx.get(e.source)!, idx.get(e.target)!] as const);
  for (let it = 0; it < opts.iterations; it++) {
    const dx = new Float64Array(n), dy = new Float64Array(n);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      let ex = px[i] - px[j], ey = py[i] - py[j]; let d = Math.hypot(ex, ey);
      if (d < 1) { ex = (i - j) * 0.37; ey = 0.61; d = 1; }
      const f = (k * k) / d / d; dx[i] += ex * f; dy[i] += ey * f; dx[j] -= ex * f; dy[j] -= ey * f;
    }
    for (const [a, b] of el) {
      const ex = px[a] - px[b], ey = py[a] - py[b]; const d = Math.hypot(ex, ey) || 1; const f = d / k;
      dx[a] -= ex * f; dy[a] -= ey * f; dx[b] += ex * f; dy[b] += ey * f;
    }
    for (let i = 0; i < n; i++) { dx[i] -= (px[i] - c.x) * 0.1; dy[i] -= (py[i] - c.y) * 0.1; }
    for (let i = 0; i < n; i++) {
      if (opts.pinned?.has(ids[i])) continue;
      const m = opts.damp?.has(ids[i]) ? 0.15 : 1; const l = Math.hypot(dx[i], dy[i]) || 1; const step = Math.min(l, t) * m;
      px[i] += (dx[i] / l) * step; py[i] += (dy[i] / l) * step;
    }
    t = Math.max(t * 0.985, 2);
  }
  ids.forEach((id, i) => pos.set(id, { x: px[i], y: py[i] }));
}
