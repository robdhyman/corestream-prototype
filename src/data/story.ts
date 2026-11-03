// The golden flow's story from ticket 03's case.json: Versions, Proposals and their Changes, the Exposure
// paths, the Update and the Draft Insight. ./case.ts stays the swap point for what the graph draws;
// this module is what Kharon's script, History and the flow reducer read.

import raw from './case-03/case.json';
import type { SuryadeepCase, Version, Proposal, Change } from './case-03/case.types';
import type { Confidence, Listing } from './types';
import { entityById } from './case';

export const story = raw as unknown as SuryadeepCase;

export type VersionId = Version['id'];
export type ProposalId = Proposal['id'];
export type { Change, Proposal };
/** Change id → accepted. Every Change starts accepted (ticket 02). */
export type Decisions = Record<string, boolean>;
export type ArrangementId = Version['arrangement'];

/** Ticket 02, decided by Rob: labels only. A hop takes the label of its weakest source. */
export const CONFIDENCE_LABEL: Record<Confidence, 'Confirmed' | 'Reported' | 'Unconfirmed'> = {
  high: 'Confirmed', medium: 'Reported', low: 'Unconfirmed',
};

export const versionMeta = (id: VersionId) => story.versions.find((v) => v.id === id)!;
export const proposalById = (id: ProposalId) => story.proposals.find((p) => p.id === id)!;
export const suryInsight = story.insights.find((i) => i.id === 'ins-sury')!;
export const draftInsight = story.insights.find((i) => i.id === 'ins-draft')!;
export const update = story.update;

export const shortName = (id: string) => { const e = entityById.get(id); return e ? e.shortName ?? e.name : id; };
export const fullName = (id: string) => entityById.get(id)?.name ?? id;

export function allAccepted(id: ProposalId): Decisions {
  return Object.fromEntries(proposalById(id).changes.map((c) => [c.id, true]));
}
export const acceptedCount = (d: Decisions) => Object.values(d).filter(Boolean).length;

/** What a Version draws: its Entities and Links, its Arrangement, and the marks that belong to it. */
export interface VersionContent {
  id: VersionId;
  arrangement: ArrangementId;
  entityIds: Set<string>;
  linkIds: Set<string>;
  /** Accepted Unconfirmed items stay dotted orange (ticket 02). */
  unconfirmed: Set<string>;
  /** Entities a Source update touched: UPDATED tag. */
  changed: Set<string>;
  riskHigh: Set<string>;
  /** Listings added after Version 1 (the Update). */
  listed: Map<string, Listing>;
}

function fromMeta(id: VersionId): VersionContent {
  const v = versionMeta(id);
  return {
    id, arrangement: v.arrangement, entityIds: new Set(v.entityIds), linkIds: new Set(v.linkIds),
    unconfirmed: new Set(), changed: new Set(), riskHigh: new Set(), listed: new Map(),
  };
}

function clone(v: VersionContent, id: VersionId): VersionContent {
  return {
    id, arrangement: v.arrangement, entityIds: new Set(v.entityIds), linkIds: new Set(v.linkIds),
    unconfirmed: new Set(v.unconfirmed), changed: new Set(v.changed), riskHigh: new Set(v.riskHigh), listed: new Map(v.listed),
  };
}

export function applyChange(v: VersionContent, c: Change): void {
  const ents = c.entityIds ?? [], links = c.linkIds ?? [];
  if (c.kind === 'add') {
    ents.forEach((id) => v.entityIds.add(id));
    links.forEach((id) => v.linkIds.add(id));
    if (c.confidence === 'low') [...ents, ...links].forEach((id) => v.unconfirmed.add(id));
  } else if (c.kind === 'hide') {
    ents.forEach((id) => v.entityIds.delete(id));
    links.forEach((id) => v.linkIds.delete(id));
  } else if (c.kind === 'arrangement' && c.arrangement) {
    v.arrangement = c.arrangement;
  } else if (c.kind === 'risk' && c.risk === 'high') {
    ents.forEach((id) => v.riskHigh.add(id));
  }
}

function withChanges(base: VersionContent, id: VersionId, p: ProposalId, d: Decisions): VersionContent {
  const v = clone(base, id);
  proposalById(p).changes.filter((c) => d[c.id]).forEach((c) => applyChange(v, c));
  return v;
}

/**
 * Version content is derived, not read from case.json's lists, because Version 2 holds whichever Changes the
 * user accepted. The Source update lands on the main line only (ticket 01). If the user left XPU out of
 * Version 2, the Update brings it in with the Link that ties it to the Insight, so the listing has somewhere to sit.
 */
export function versionContent(id: VersionId, appliedP1?: Decisions): VersionContent {
  switch (id) {
    case 'v1': return fromMeta('v1');
    case 'v2': {
      const scripted = Object.fromEntries(proposalById('P1').changes.map((c) => [c.id, c.scriptedDecision === 'accept']));
      return withChanges(versionContent('v1'), 'v2', 'P1', appliedP1 ?? scripted);
    }
    case 'b1': return withChanges(versionContent('v1'), 'b1', 'P2', allAccepted('P2'));
    case 'v3': {
      const v = clone(versionContent('v2', appliedP1), 'v3');
      v.entityIds.add(update.entityId);
      v.entityIds.add('hct');
      v.linkIds.add('L04');
      v.changed.add(update.entityId);
      v.listed.set(update.entityId, { name: update.listing.name, authority: update.listing.authority, listingDate: update.listing.listingDate });
      return v;
    }
    case 'v4': return withChanges(versionContent('v3', appliedP1), 'v4', 'P3', allAccepted('P3'));
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** '2024-06-14' → 'Jun 2024' */
export const monthYear = (iso: string) => `${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
/** '2021-04-21' → '21 Apr 2021' */
export const dayMonthYear = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
/** '2026-10-28T10:12:00Z' → '28 Oct · 10:12' (story clock, UTC) */
export const stamp = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS[+iso.slice(5, 7) - 1]} · ${iso.slice(11, 16)}`;
