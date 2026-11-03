// What the canvas draws for the current state: a Version's content plus the ghost diff of an open Proposal or of
// Kharon's answer (ticket 02). Replaces the prototype's model(). Pure; memoise on the state slices it reads.

import { caseData, linkById } from '../data/case';
import type { Entity, EntityMark, GraphMarks, LinkMark } from '../data/types';
import { proposalById, story, versionContent, versionMeta, type ArrangementId, type VersionContent } from '../data/story';
import { arrangementLocked, savedArrangement, type FlowState } from './flow';

export type LegendKey = 'added' | 'found' | 'hidden' | 'unconfirmed';

export interface GraphView {
  arrangement: ArrangementId;
  /** Drawn Entities with this Version's risk tier and badges applied. */
  entities: Entity[];
  linkIds: Set<string>;
  marks: GraphMarks;
  legend: { title: string; keys: LegendKey[] } | null;
  /** The timeline's heading: a pending Change's preview, the saved timeline, or a view-only look (ticket 14). */
  timelineHeading: string;
  /** What the camera frames; null keeps Figma's 100% home view. */
  focus: string[] | null;
  content: VersionContent;
}

const pathHidden = (id: 'path-ownership' | 'path-zhou') => story.exposure.paths.find((p) => p.id === id)!.hiddenLinkIds;
const PATH_ENTITIES = ['sury', 'merid', 'hct', 'xpu', 'tianshan', 'xpzdc', 'zhou'];

export function graphView(s: FlowState): GraphView {
  const content = versionContent(s.viewing, s.appliedP1);
  const ents = new Set(content.entityIds), links = new Set(content.linkIds);
  const em: Record<string, EntityMark[]> = {}, lm: Record<string, LinkMark[]> = {};
  const markE = (id: string, m: EntityMark) => { (em[id] ??= []).includes(m) || em[id].push(m); };
  const markL = (id: string, m: LinkMark) => { (lm[id] ??= []).includes(m) || lm[id].push(m); };
  let arrangement = s.viewArrangement ?? content.arrangement;
  let legend: GraphView['legend'] = null;
  let focus: string[] | null = null;

  content.unconfirmed.forEach((id) => (linkById.has(id) ? markL(id, 'unconfirmed') : markE(id, 'unconfirmed')));
  content.changed.forEach((id) => markE(id, 'changed'));

  if (s.openProposal) {
    const p = proposalById(s.openProposal);
    const d = s.decisions[s.openProposal] ?? {};
    for (const c of p.changes) {
      if (!d[c.id]) continue;
      if (c.kind === 'add') {
        const m = c.confidence === 'low' ? 'unconfirmed' : 'added';
        c.entityIds?.forEach((id) => { if (!ents.has(id)) { ents.add(id); markE(id, m); } });
        c.linkIds?.forEach((id) => { if (!links.has(id)) { links.add(id); markL(id, m); } });
      } else if (c.kind === 'hide') {
        c.entityIds?.forEach((id) => markE(id, 'hidden'));
        c.linkIds?.forEach((id) => markL(id, 'hidden'));
      } else if (c.kind === 'arrangement' && c.arrangement) {
        arrangement = c.arrangement;
      } else if (c.kind === 'risk') {
        c.entityIds?.forEach((id) => markE(id, 'riskPreview'));
      }
    }
    if (s.highlight) {
      const c = p.changes.find((x) => x.id === s.highlight);
      c?.entityIds?.forEach((id) => markE(id, 'highlight'));
      c?.linkIds?.forEach((id) => markL(id, 'highlight'));
    }
    legend = { title: 'Preview · not saved', keys: s.openProposal === 'P1' ? ['added', 'hidden', 'unconfirmed'] : [] };
    if (s.openProposal === 'P1' && arrangement === 'radial') focus = PATH_ENTITIES;
  } else if (s.answerGhost && arrangement !== 'timeline') {
    // The timeline has no ghost diff, so a view-only timeline under Kharon's answer shows the Version alone (ticket 14).
    const reveal = (linkIds: string[], m: 'added' | 'unconfirmed') => linkIds.forEach((lid) => {
      const l = caseData.links.find((x) => x.id === lid)!;
      for (const id of [l.source, l.target]) if (!ents.has(id)) { ents.add(id); markE(id, m); }
      if (!links.has(lid)) { links.add(lid); markL(lid, m); }
    });
    reveal(pathHidden('path-ownership'), 'added');
    reveal(pathHidden('path-zhou'), 'unconfirmed');
    legend = { title: "From Kharon's answer · not in the Insight", keys: ['found', 'unconfirmed'] };
    if (arrangement === 'radial') focus = PATH_ENTITIES;
  }

  // K1: Tarnwell's upstream Links pulse while Kharon reads them.
  if (s.run?.then.kind === 'exposure') caseData.links.forEach((l) => { if (l.target === 'merid' && links.has(l.id)) markL(l.id, 'progress'); });

  // The camera frames the whole graph for any Arrangement but Version 1's designed radial (ticket 14 included).
  if (arrangement !== 'radial' && arrangement !== 'timeline') focus = [...ents];
  if (s.viewing !== 'v1' && arrangement === 'radial' && !focus) focus = [...ents];

  const entities = caseData.entities.filter((e) => ents.has(e.id)).map((e) => {
    const listed = content.listed.has(e.id);
    const risk = content.riskHigh.has(e.id);
    if (!listed && !risk) return e;
    return { ...e, tier: risk ? 'risk' as const : e.tier, badges: listed && !e.badges.includes('listed') ? [...e.badges, 'listed' as const] : e.badges };
  });

  return {
    arrangement, entities, linkIds: links, marks: { entities: em, links: lm }, legend,
    timelineHeading: s.openProposal && arrangement !== content.arrangement ? 'PREVIEW · TIMELINE ARRANGEMENT · NOT SAVED'
      : `${versionMeta(s.viewing).label.toUpperCase()} · TIMELINE ARRANGEMENT${s.viewArrangement ? ' · VIEW ONLY' : ''}`,
    focus, content,
  };
}

/** What the on-canvas Arrangement toggle shows (ticket 14). */
export interface ArrangementToggleView {
  /** The Arrangement on the canvas now, including one a Proposal previews. */
  shown: ArrangementId;
  /** The viewed Version's saved Arrangement: it carries the Saved dot. */
  saved: ArrangementId;
  /** Why the toggle is unavailable: Kharon is working, or a Proposal's ghost diff is on the graph. */
  disabled: 'working' | 'proposal' | null;
}

export function arrangementToggle(s: FlowState, v: GraphView = graphView(s)): ArrangementToggleView {
  return { shown: v.arrangement, saved: savedArrangement(s), disabled: arrangementLocked(s) };
}

/** Is this Entity in the Version being viewed (as opposed to a ghost Kharon found)? */
export const inVersion = (v: GraphView, id: string) => v.content.entityIds.has(id);
