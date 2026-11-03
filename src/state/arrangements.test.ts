// Ticket 14: the toggle can show any Version in any Arrangement, so every Version must have all three.
// Seams: caseData.arrangements (where the Graph draws each Entity; an Entity with no position is not drawn) and
// timelineRows (what the timeline draws). Versions 2–4 are checked for every set of Changes the user can accept in S4.
import { describe, expect, it } from 'vitest';
import { caseData, entityById, linkById } from '../data/case';
import { proposalById, versionContent, type Decisions, type VersionContent } from '../data/story';
import { LABEL_GAP, LABEL_LINE, NODE_SIZE, wrapLabel } from '../graph/geometry';
import { timelineRows } from '../graph/Timeline';
import type { Point } from '../data/types';

const R = NODE_SIZE / 2;
const CHAR = 6.6; // IBM Plex Mono 11 px advances 0.6 em
const P1 = proposalById('P1').changes.map((c) => c.id);

/** Every non-empty set of P1 Changes the user can accept. */
const decisionSets: Decisions[] = Array.from({ length: (1 << P1.length) - 1 }, (_, n) =>
  Object.fromEntries(P1.map((id, i) => [id, !!((n + 1) & (1 << i))])));

const versions: { name: string; content: VersionContent }[] = [
  { name: 'v1', content: versionContent('v1') },
  { name: 'b1', content: versionContent('b1') },
  ...decisionSets.flatMap((d) => (['v2', 'v3', 'v4'] as const).map((id) => ({
    name: `${id} (${P1.filter((c) => d[c]).join('+')})`, content: versionContent(id, d),
  }))),
];

type Box = { x0: number; y0: number; x1: number; y1: number };
/** An Entity's footprint: its node and its label block. */
function footprint(id: string, p: Point): Box[] {
  const e = entityById.get(id)!;
  const lines = wrapLabel(e);
  const w = Math.max(...lines.map((l) => l.length)) * CHAR;
  const top = p.y + R + LABEL_GAP + (e.isSubject ? 2.5 : 0);
  return [
    { x0: p.x - R, y0: p.y - R, x1: p.x + R, y1: p.y + R },
    { x0: p.x - w / 2, y0: top, x1: p.x + w / 2, y1: top + lines.length * LABEL_LINE },
  ];
}
const hit = (a: Box, b: Box, gap = 4) => a.x0 < b.x1 + gap && b.x0 < a.x1 + gap && a.y0 < b.y1 + gap && b.y0 < a.y1 + gap;

/** Distance from p to the segment ab. */
function toSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
/** Does the segment ab cross the box? Sampled every 2 px, which is finer than any gap that would read. */
function crosses(box: Box, a: Point, b: Point): boolean {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2);
  for (let i = 0; i <= n; i++) {
    const x = a.x + ((b.x - a.x) * i) / n, y = a.y + ((b.y - a.y) * i) / n;
    if (x > box.x0 && x < box.x1 && y > box.y0 && y < box.y1) return true;
  }
  return false;
}

describe.each(['radial', 'ownership'])('the %s Arrangement', (id) => {
  const arrangement = caseData.arrangements.find((a) => a.id === id)!;
  const at = (e: string) => arrangement.positions[e];

  it.each(versions)('places every Entity of $name', ({ content }) => {
    expect([...content.entityIds].filter((e) => !at(e))).toEqual([]);
  });

  it.each(versions)('draws no two Entities of $name on top of each other', ({ content }) => {
    const ids = [...content.entityIds];
    const clashes: string[] = [];
    ids.forEach((a, i) => ids.slice(i + 1).forEach((b) => {
      if (footprint(a, at(a)).some((fa) => footprint(b, at(b)).some((fb) => hit(fa, fb)))) clashes.push(`${a}/${b}`);
    }));
    expect(clashes).toEqual([]);
  });

  // A Link drawn through a node reads as a Link to it. (Grazing a label is tolerated: Figma's radial does it once,
  // L17 past Kalinga's label, and Version 2's ownership does it once, L12 past Ganga Vikas's.)
  it.each(versions)('runs no Link of $name through an Entity it does not join', ({ content }) => {
    const through: string[] = [];
    for (const lid of content.linkIds) {
      const l = linkById.get(lid)!;
      for (const e of content.entityIds) {
        if (e === l.source || e === l.target) continue;
        if (toSegment(at(e), at(l.source), at(l.target)) < R + 6) through.push(`${lid}×${e}`);
      }
    }
    expect(through).toEqual([]);
  });
});

describe('the ownership Arrangement, placed for ticket 14', () => {
  const at = (e: string) => caseData.arrangements.find((a) => a.id === 'ownership')!.positions[e];
  // The logistics chain that Version 1 and Branch B hold was never drawn this way before; it clears labels too.
  it.each(versions)('runs no logistics Link of $name across a label', ({ content }) => {
    const through: string[] = [];
    for (const lid of content.linkIds) {
      const l = linkById.get(lid)!;
      if (l.kind !== 'logistics') continue;
      for (const e of content.entityIds) {
        if (e === l.source || e === l.target) continue;
        if (crosses(footprint(e, at(e))[1], at(l.source), at(l.target))) through.push(`${lid}×${e}`);
      }
    }
    expect(through).toEqual([]);
  });
});

describe('the timeline Arrangement', () => {
  it.each(versions)('gives every Link of $name a row, so every Entity appears', ({ content }) => {
    const rows = timelineRows(content.linkIds);
    expect(rows.map((l) => l.id).sort()).toEqual([...content.linkIds].sort());
    const shown = new Set(rows.flatMap((l) => [l.source, l.target]));
    expect([...content.entityIds].filter((e) => !shown.has(e))).toEqual([]);
  });
});
