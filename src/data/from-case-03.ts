// Adapter from ticket 03's case JSON (copied into ./case-03/ so the app builds on its own for GitHub Pages, ticket 12)
// to the app's CaseData. This is the app's default case (see ./case.ts).
// Arrangements:
// - radial: Figma 117:5653's coordinates for every Entity the frame has, R3's damped layout for Port of Felixstowe,
//   and hand-placed spots for the hops Kharon reveals, lower right next to Larchmere (ticket 02's call).
// - ownership: the hierarchy Version 2 switches to, hand-placed on 125 px rows, reading top-down from XPZDC to Grantham.
// The timeline Arrangement has no coordinates: graph/Timeline.tsx lays out Links by date.

import raw from './case-03/case.json';
import type { SuryadeepCase, Entity as CaseEntity } from './case-03/case.types';
import type { Arrangement, CaseData, Entity, FeedItem, Glyph, Insight, Link, Point } from './types';
import { seed } from './seed-figma-117-5653';
import { layout, seedPositions } from '../graph/layout';

const GLYPH: Partial<Record<CaseEntity['kind'], Glyph>> = { person: 'person', port: 'anchor', authority: 'account_balance', agreement: 'description' };

/** Revealed hops (S3), lower right of the radial, chained from Larchmere at (1208, 870). */
const REVEALED: Record<string, Point> = {
  xpu: { x: 1376, y: 982 }, tianshan: { x: 1572, y: 926 }, xpzdc: { x: 1600, y: 1094 },
};

/**
 * Ownership hierarchy (Version 2). Ticket 14: the toggle shows every Version this way, so the logistics chain that
 * only Version 1 and Branch B hold (or a Version 2 that kept it) hangs below the contract rows: Coromandel, MV Kaveri
 * Pride and the Port of Mundra on one row, Felixstowe below Mundra at the right, clear of the bottom-left toggle and
 * legend. Their Links clear every node and label (state/arrangements.test.ts).
 */
const OWNERSHIP: Record<string, Point> = {
  xpzdc: { x: 868, y: 90 },
  tianshan: { x: 868, y: 215 },
  xpu: { x: 868, y: 340 },
  zhou: { x: 668, y: 465 }, hct: { x: 868, y: 465 }, cheung: { x: 1108, y: 465 },
  menon: { x: 668, y: 590 }, merid: { x: 868, y: 590 }, smb: { x: 1048, y: 590 },
  dgft: { x: 668, y: 715 }, sury: { x: 868, y: 715 }, gvb: { x: 1048, y: 715 },
  kalinga: { x: 668, y: 840 }, contract: { x: 868, y: 840 }, sipt: { x: 1188, y: 840 },
  grantham: { x: 868, y: 965 },
  coro: { x: 628, y: 1090 }, kaveri: { x: 868, y: 1090 }, mundra: { x: 1108, y: 1090 }, felix: { x: 1108, y: 1215 },
};

/** '2h ago', '3d ago': Feed ages count back from the screen's story clock. */
export function age(iso: string, clock: string): string {
  const h = Math.max(0, Math.round((Date.parse(clock) - Date.parse(iso)) / 3_600_000));
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

export function fromCase03(): CaseData {
  const c = raw as unknown as SuryadeepCase;
  const s1 = c.screens.find((s) => s.id === 'S1')!;
  const v1 = c.versions.find((v) => v.id === s1.version)!;

  const entities: Entity[] = c.entities.map((e) => ({
    id: e.id,
    name: e.name,
    shortName: e.shortName,
    kind: e.kind,
    jurisdiction: e.jurisdiction,
    place: e.place,
    tier: e.risk === 'high' ? 'risk' : e.kind === 'agreement' ? 'event' : 'entity',
    glyph: GLYPH[e.kind] ?? 'domain',
    badges: e.listings?.length ? ['listed'] : [],
    isSubject: e.isSubject,
    note: e.note,
    flag: e.flag,
    labelLines: e.isSubject ? ['Suryadeep', 'Photovoltaics', 'Pvt. Ltd.'] : undefined,
    listings: e.listings?.map((l) => ({ name: l.name, authority: l.authority, listingDate: l.listingDate })),
  }));

  const links: Link[] = c.links.map((l) => ({
    id: l.id, source: l.source, target: l.target, kind: l.type, detail: l.label,
    pct: l.percent, former: l.status === 'lapsed', directed: l.type === 'ownership',
    startDate: l.startDate, endDate: l.endDate, confidence: l.confidence, sources: l.sources,
  }));

  // Version 1 positions: Figma's where it has them, the damped layout for the rest.
  const figma = seed.arrangements[0];
  const pos = new Map<string, Point>();
  for (const id of v1.entityIds) if (figma.positions[id]) pos.set(id, figma.positions[id]);
  const v1Links = links.filter((l) => v1.linkIds.includes(l.id));
  const neighbour = (id: string) => v1Links.map((l) => (l.source === id ? l.target : l.target === id ? l.source : '')).find((n) => n && pos.has(n));
  const placed = new Set(pos.keys());
  seedPositions(v1.entityIds, pos, neighbour);
  layout(v1.entityIds, v1Links, pos, { iterations: 220, pinned: placed, centre: { x: figma.size.width / 2, y: figma.size.height / 2 } });

  const radial: Arrangement = {
    id: 'radial', name: 'Radial', size: figma.size,
    positions: {
      ...Object.fromEntries(v1.entityIds.map((id) => [id, pos.get(id)!])),
      zhou: figma.positions.zhou, // 117:5653 draws Zhou Ming; the case hides him until Kharon's answer
      ...REVEALED,
    },
    labelAt: Object.fromEntries(Object.entries(figma.labelAt ?? {}).filter(([id]) => v1.linkIds.includes(id))),
  };
  const ownership: Arrangement = { id: 'ownership', name: 'Ownership hierarchy', size: figma.size, positions: OWNERSHIP };

  const feed: FeedItem[] = c.feed.map((f, i) => ({
    id: `f${i + 1}`, tag: f.tag, severity: 'warn', title: f.title, place: f.place,
    time: age(f.publishedAt, s1.clock), unread: f.unread, insightId: f.insightId,
  }));

  const insights: Insight[] = c.insights.filter((i) => i.status === 'published').map((i) => ({
    id: i.id, title: i.title, dek: i.dek, place: i.place, body: i.paras, subjectId: i.subjectId,
    time: age(i.publishedAt, s1.clock),
  }));

  return { entities, links, arrangements: [radial, ownership], feed, insights };
}
