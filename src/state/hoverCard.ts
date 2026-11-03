// Ticket 16: what the Entity hover card shows for the Version on screen. Risks are what is recorded against the
// Entity itself (its listings and its signal); Exposure is the paths that run through it, shown only once all of a
// path's Links are in the Version. Kharon traces Exposure; the hover card only reports what the Version holds.

import type { Confidence, Entity } from '../data/types';
import { entityById, linkById } from '../data/case';
import { monthYear, story } from '../data/story';
import { askEntityPrompt } from '../kharon/script';
import { inVersion, type GraphView } from './graphView';

export interface RiskBlock {
  kind: 'listing' | 'signal';
  title: string;
  rows: string[];
}

export interface ExposureBlock {
  title: string;
  confidence: Confidence;
  /** One stop per Entity, Subject first. */
  rows: string[];
}

export interface EntityCard {
  entity: Entity;
  /** The Version's Links that touch the Entity (not Kharon's previewed ones). */
  linkCount: number;
  risks: RiskBlock[];
  exposure: ExposureBlock[];
  /** On a path the graph doesn't show at all yet: the card points to the question box instead. */
  exposureNotTraced: boolean;
  /** Only questions the script answers (Rob, 11:45). */
  questions: string[];
}

const touches = (linkId: string, id: string) => { const l = linkById.get(linkId); return !!l && (l.source === id || l.target === id); };

const EXPOSURE_PATHS = story.exposure.paths.map((p) => ({
  ...p,
  entityIds: new Set(p.linkIds.flatMap((id) => { const l = linkById.get(id); return l ? [l.source, l.target] : []; })),
}));

export function entityCard(view: GraphView, id: string): EntityCard {
  const entity = view.entities.find((e) => e.id === id) ?? entityById.get(id)!;
  const listings = [...(entity.listings ?? []), ...(view.content.listed.has(id) ? [view.content.listed.get(id)!] : [])];

  const risks: RiskBlock[] = listings.map((l) => ({ kind: 'listing', title: l.name, rows: [l.authority, `Listed ${monthYear(l.listingDate)}`] }));
  if (entity.flag) {
    const [title, ...rows] = entity.flag.split(' · ');
    // Tianshan's and XPZDC's flags are their listing's short form ('OFAC SDN · Dec 2020'), so they aren't repeated.
    if (!listings.some((l) => l.name.startsWith(title))) risks.push({ kind: 'signal', title, rows });
  }

  const onPaths = EXPOSURE_PATHS.filter((p) => p.entityIds.has(id));
  const exposure = onPaths
    .filter((p) => p.linkIds.every((l) => view.content.linkIds.has(l)))
    .map((p) => ({ title: p.label, confidence: p.confidence, rows: p.summary.replace(/\.$/, '').split(/\s[←→]\s/) }));
  const drawn = onPaths.some((p) => p.linkIds.every((l) => view.linkIds.has(l)));

  return {
    entity,
    linkCount: [...view.content.linkIds].filter((l) => touches(l, id)).length,
    risks,
    exposure,
    exposureNotTraced: onPaths.length > 0 && !exposure.length && !drawn && inVersion(view, id),
    questions: [askEntityPrompt(id)],
  };
}
