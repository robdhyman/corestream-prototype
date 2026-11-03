// The golden flow as a reducer. It replaces the throwaway prototype's scene builders (SB) and prompt() routing:
// every click and typed prompt is an Action, and timed work (Kharon's steps, the draft) advances through
// runStep / runFinish / genTick actions that state/store.tsx schedules. Scenes for the dry run are replays of
// the same Actions (./scenes.ts), so jumping to S5 lands exactly where clicking through would.

import { caseData } from '../data/case';
import {
  acceptedCount, allAccepted, proposalById, shortName, story, versionContent, versionMeta,
  type ArrangementId, type Decisions, type ProposalId, type VersionId,
} from '../data/story';
import {
  BVI_STEPS, NOTES, PROPOSE_QUESTION, PROPOSE_STEPS, TRACE_QUESTION, TRACE_STEPS,
  askEntityPrompt, ASK_LINK_PROMPT, linksSteps, route, sourcesSteps, type Intent, type Step,
} from '../kharon/script';

export type PanelTab = 'insight' | 'record' | 'history';
export type Focus = { kind: 'entity' | 'link'; id: string };

/** What a run does when its last step finishes. */
export type Then =
  | { kind: 'exposure' }
  | { kind: 'cantBvi' }
  | { kind: 'propose'; preset: Decisions }
  | { kind: 'links'; entityId: string }
  | { kind: 'linkSources'; linkId: string };

export type Turn =
  | { kind: 'question'; text: string; at: string }
  | { kind: 'work'; steps: Step[]; done: number; status: 'running' | 'done' | 'stopped'; trace: boolean }
  | { kind: 'exposure'; compact: boolean }
  | { kind: 'links'; entityId: string; linkIds: string[] }
  | { kind: 'linkSources'; linkId: string }
  | { kind: 'cant'; reason: 'bvi' | 'offScript' }
  | { kind: 'note'; text: string; at?: string }
  | { kind: 'proposal'; id: ProposalId; status: 'open' | 'applied' | 'rejected' | 'setAside'; applied?: number }
  | { kind: 'saved'; version: VersionId; applied: number; of: number }
  | { kind: 'generate' }
  | { kind: 'changed'; at: string };

export interface Run { steps: Step[]; done: number; pace: number; then: Then; prompt: string; turn: number }

export type GenStage = 'outline' | 'draft' | 'check' | 'ready' | 'published';

export interface FlowState {
  feedId: string;
  panelTab: PanelTab;
  selectedEntity: string | null;
  selectedLink: string | null;
  hoverCard: (Focus & { pinned: boolean }) | null;
  /** The Entity whose name is hovered in Kharon, lit on the graph (ticket 18). */
  peek: string | null;

  kharonOpen: boolean;
  focus: Focus | null;
  turns: Turn[];
  prompts: string[];
  run: Run | null;
  reviewOpen: boolean;
  zhou: 'open' | 'checked' | 'shown';
  answerGhost: boolean;

  openProposal: ProposalId | null;
  decisions: Partial<Record<ProposalId, Decisions>>;
  appliedP1?: Decisions;
  versions: VersionId[];
  viewing: VersionId;
  highlight: string | null;
  /** Ticket 14: an Arrangement the user is viewing instead of the Version's saved one. View-only, never in History. */
  viewArrangement: ArrangementId | null;

  gen: { stage: GenStage; checks: number; outline: string[] } | null;
  insightShown: 'version' | 'draft' | 'published';
  published: boolean;

  day: 1 | 3;
  updateOpened: boolean;
  bell: number;
  noticeOpen: boolean;
  toast: string | null;
}

export type Action =
  | { type: 'selectEntity'; id: string }
  | { type: 'selectLink'; id: string }
  | { type: 'clearSelection' }
  | { type: 'setTab'; tab: PanelTab }
  | { type: 'selectFeed'; id: string }
  | { type: 'hover'; card: FlowState['hoverCard'] }
  | { type: 'peek'; id: string | null }
  | { type: 'ask'; focus: Focus; text?: string }
  | { type: 'toggleKharon' }
  | { type: 'send'; text: string }
  | { type: 'runStep' }
  | { type: 'runFinish' }
  | { type: 'stop' }
  | { type: 'expandAnswer'; turn: number }
  | { type: 'review'; open: boolean }
  | { type: 'decide'; proposal: ProposalId; change: string; accept: boolean }
  | { type: 'accept'; proposal: ProposalId }
  | { type: 'rejectAll'; proposal: ProposalId }
  | { type: 'highlight'; change: string | null }
  | { type: 'openVersion'; version: VersionId }
  | { type: 'viewArrangement'; arrangement: ArrangementId }
  | { type: 'outlineUp'; index: number }
  | { type: 'writeDraft' }
  | { type: 'genTick' }
  | { type: 'publish' }
  | { type: 'skipAhead' }
  | { type: 'toggleNotice' }
  | { type: 'openUpdate' }
  | { type: 'dismissToast' }
  | { type: 'load'; state: FlowState };

export const PUBLISHED_FEED_ID = 'published';
const SURY_FEED_ID = caseData.feed.find((f) => f.insightId === 'ins-sury')!.id;

export const initialState: FlowState = {
  feedId: SURY_FEED_ID,
  panelTab: 'insight',
  selectedEntity: null,
  selectedLink: null,
  hoverCard: null,
  peek: null,
  kharonOpen: false,
  focus: null,
  turns: [],
  prompts: [],
  run: null,
  reviewOpen: false,
  zhou: 'open',
  answerGhost: false,
  openProposal: null,
  decisions: {},
  versions: ['v1'],
  viewing: 'v1',
  highlight: null,
  viewArrangement: null,
  gen: null,
  insightShown: 'version',
  published: false,
  day: 1,
  updateOpened: false,
  bell: 0,
  noticeOpen: false,
  toast: null,
};

const K1_PACE = 1500; // long enough to press Stop (F1)
const PACE = 650;

/** The latest main-line Version: what "Back to" returns to. */
export const headVersion = (s: FlowState): VersionId => [...s.versions].reverse().find((v) => versionMeta(v).line === 'main')!;
const answered = (s: FlowState) => s.turns.some((t) => t.kind === 'exposure');
const uniq = (xs: string[]) => [...new Set(xs)];

/** The next in-scope step, offered after an off-script message. */
function nextPrompt(s: FlowState): string {
  if (s.updateOpened) return 'Open the Insight you published';
  if (!s.versions.includes('v2')) return answered(s) ? 'Add this path to the Insight' : TRACE_QUESTION;
  if (!s.versions.includes('b1')) return 'Show the original';
  if (!s.published) return 'Generate new Insight';
  return TRACE_QUESTION;
}

/** Ticket 17: the story clock a new exchange is stamped with. A step the script places in a scene takes that scene's
 *  clock (K1 10:03, S4 10:10, S6 10:20, S7 10:35, S9 15:02), so the thread agrees with History. Anything else, and
 *  anything that would run backwards, comes a minute after the last exchange. Day 3 starts at S8's clock. */
function askedAt(s: FlowState, scene?: 'K1' | 'S4' | 'S6' | 'S7' | 'S9'): string {
  const clock = (id: string) => Date.parse(story.screens.find((x) => x.id === id)!.clock);
  const last = [...s.turns].reverse().find((t) => 'at' in t && t.at);
  const after = Math.max(last && 'at' in last && last.at ? Date.parse(last.at) + 60_000 : 0, clock(s.day === 3 ? 'S8' : 'K1'));
  return new Date(scene ? Math.max(clock(scene), after) : after).toISOString().replace('.000Z', 'Z');
}

const question = (s: FlowState, text: string, scene?: Parameters<typeof askedAt>[1]): Turn => ({ kind: 'question', text, at: askedAt(s, scene) });

function push(s: FlowState, ...turns: Turn[]): FlowState {
  return { ...s, turns: [...s.turns, ...turns] };
}

/** Close any open Proposal without a decision (the user moved on). */
function setAside(s: FlowState): FlowState {
  if (!s.openProposal) return s;
  const turns = s.turns.map((t) => (t.kind === 'proposal' && t.status === 'open' ? { ...t, status: 'setAside' as const } : t));
  return { ...s, turns, openProposal: null, reviewOpen: false, highlight: null };
}

function startRun(s: FlowState, prompt: string, steps: Step[], then: Then, opts: { trace?: boolean; question?: string; scene?: Parameters<typeof askedAt>[1] } = {}): FlowState {
  const base = setAside(stopRun(s, false));
  const turns: Turn[] = [...base.turns, question(base, opts.question ?? prompt, opts.scene), { kind: 'work', steps, done: 0, status: 'running', trace: !!opts.trace }];
  return {
    ...base, kharonOpen: true, turns, prompts: [], reviewOpen: false,
    run: { steps, done: 0, pace: opts.trace ? K1_PACE : PACE, then, prompt, turn: turns.length - 1 },
  };
}

/** Stop the active run. With `note`, Stop in any run other than the first trace adds "Stopped. Nothing changed." */
function stopRun(s: FlowState, note: boolean): FlowState {
  const r = s.run; if (!r) return s;
  const turns = s.turns.map((t, i) => (i === r.turn && t.kind === 'work' ? { ...t, status: 'stopped' as const, done: r.done } : t));
  const w = turns[r.turn];
  const trace = w.kind === 'work' && w.trace;
  let next: FlowState = { ...s, turns, run: null };
  if (trace) next = { ...next, prompts: ['Continue tracing', 'Start over'] };
  else if (note) next = { ...push(next, { kind: 'note', text: NOTES.stopped }), prompts: [r.prompt] };
  return next;
}

function finishRun(s: FlowState): FlowState {
  const r = s.run; if (!r) return s;
  const turns = s.turns.map((t, i) => (i === r.turn && t.kind === 'work' ? { ...t, status: 'done' as const, done: r.steps.length } : t));
  const base: FlowState = { ...s, turns, run: null };
  switch (r.then.kind) {
    case 'exposure':
      return {
        ...push(base, { kind: 'exposure', compact: false }),
        answerGhost: true, zhou: 'open', selectedEntity: 'merid', selectedLink: null, panelTab: 'record',
        prompts: ['Add this path to the Insight', 'Lay it out by ownership'],
      };
    case 'cantBvi':
      return { ...push(base, { kind: 'cant', reason: 'bvi' }), zhou: 'checked', selectedEntity: 'zhou', selectedLink: null, panelTab: 'record', prompts: ['Show as unconfirmed', 'Add this path to the Insight'] };
    case 'propose': {
      // Kharon's answer folds to its lead sentence once a Proposal follows it.
      const folded = base.turns.map((t) => (t.kind === 'exposure' ? { ...t, compact: true } : t));
      return {
        ...base, turns: [...folded, { kind: 'proposal', id: 'P1', status: 'open' }],
        openProposal: 'P1', decisions: { ...base.decisions, P1: r.then.preset }, reviewOpen: true,
        answerGhost: false, selectedEntity: null, selectedLink: null, focus: null, panelTab: 'insight', insightShown: 'version', prompts: [],
      };
    }
    case 'links': {
      const content = versionContent(base.viewing, base.appliedP1);
      const id = r.then.entityId;
      const linkIds = caseData.links.filter((l) => content.linkIds.has(l.id) && (l.source === id || l.target === id)).map((l) => l.id);
      return { ...push(base, { kind: 'links', entityId: id, linkIds }), prompts: uniq([nextPrompt(base)]) };
    }
    case 'linkSources':
      return { ...push(base, { kind: 'linkSources', linkId: r.then.linkId }), prompts: uniq([nextPrompt(base)]) };
  }
}

function offerBranch(s: FlowState): FlowState {
  return {
    ...push(s, { kind: 'note', text: NOTES.branchOffer, at: askedAt(s, 'S6') }, { kind: 'proposal', id: 'P2', status: 'open' }),
    kharonOpen: true, openProposal: 'P2', decisions: { ...s.decisions, P2: allAccepted('P2') }, reviewOpen: false, prompts: ['Back to Version 2'],
  };
}

function openVersion(s0: FlowState, v: VersionId): FlowState {
  if (!s0.versions.includes(v)) return s0;
  const s = setAside(stopRun(s0, false));
  const base: FlowState = { ...s, viewing: v, insightShown: 'version', answerGhost: false, feedId: SURY_FEED_ID };
  // S6: the first time Version 1 is opened after Version 2 exists, Kharon offers the timeline as a Branch.
  if (v === 'v1' && s.versions.includes('v2') && !s.versions.includes('b1')) return offerBranch({ ...base, panelTab: 'insight' });
  const prompts = s.prompts.includes('Back to Version 2') && v === 'v2' ? ['Generate new Insight'] : s.prompts;
  return { ...base, prompts };
}

/** The Arrangement the viewed Version was saved with. Only a Proposal's Arrangement Change alters it. */
export const savedArrangement = (s: FlowState): ArrangementId => versionContent(s.viewing, s.appliedP1).arrangement;

/**
 * Why the Arrangement toggle is unavailable, or null (ticket 14). While Kharon works, and while a Proposal's ghost
 * diff is on the graph, the flow owns the Arrangement so the work and the diff stay legible.
 */
export function arrangementLocked(s: FlowState): 'working' | 'proposal' | null {
  if (s.run || s.gen?.stage === 'draft' || s.gen?.stage === 'check') return 'working';
  if (s.openProposal) return 'proposal';
  return null;
}

/** Ticket 14: view another Arrangement without touching the Version. Choosing the saved one ends the choice. */
function viewArrangement(s: FlowState, a: ArrangementId): FlowState {
  if (arrangementLocked(s)) return s;
  return { ...s, viewArrangement: a === savedArrangement(s) ? null : a };
}

function intent(s: FlowState, text: string, i: Intent): FlowState {
  const say = (note: string, prompts: string[]) => ({ ...push(s, question(s, text), { kind: 'note', text: note }), kharonOpen: true, prompts });
  switch (i.kind) {
    case 'trace':
      return startRun({ ...s, focus: { kind: 'entity', id: 'merid' }, selectedEntity: 'merid', panelTab: 'record' }, TRACE_QUESTION, TRACE_STEPS, { kind: 'exposure' }, { trace: true, question: text, scene: 'K1' });
    case 'continueTrace': {
      const last = [...s.turns].reverse().find((t) => t.kind === 'work');
      if (!last || last.kind !== 'work' || last.status !== 'stopped' || !last.trace) return intent(s, text, { kind: 'trace' });
      return startRun(s, text, last.steps.slice(last.done), { kind: 'exposure' });
    }
    case 'startOver':
      return startRun({ ...s, turns: [], answerGhost: false, focus: { kind: 'entity', id: 'merid' }, selectedEntity: 'merid', panelTab: 'record' }, TRACE_QUESTION, TRACE_STEPS, { kind: 'exposure' }, { trace: true, scene: 'K1' });
    case 'showUnconfirmed':
      if (!answered(s)) return offScript(s, text);
      return { ...push(s, question(s, text), { kind: 'note', text: NOTES.shownUnconfirmed }), zhou: 'shown', answerGhost: true, prompts: ['Add this path to the Insight'] };
    case 'checkBvi':
      return startRun(s, text, BVI_STEPS, { kind: 'cantBvi' });
    case 'propose': {
      if (s.versions.includes('v2')) return say(NOTES.pathAlreadyIn, ['Generate new Insight']);
      const preset = allAccepted('P1');
      if (i.sourcedOnly) proposalById('P1').changes.forEach((c) => { if (c.confidence === 'low') preset[c.id] = false; });
      return startRun({ ...s, viewing: 'v1' }, text, PROPOSE_STEPS, { kind: 'propose', preset }, { question: i.sourcedOnly ? text : PROPOSE_QUESTION, scene: 'S4' });
    }
    case 'openVersion':
      if (!s.versions.includes(i.version)) return offScript(s, text);
      return openVersion(s, i.version);
    case 'timeline':
      if (s.versions.includes('b1')) return openVersion(s, 'b1');
      if (!s.versions.includes('v2')) return say(NOTES.needVersion2Timeline, [answered(s) ? 'Add this path to the Insight' : TRACE_QUESTION]);
      return openVersion(s, 'v1');
    case 'generate':
      if (s.published) return say(NOTES.alreadyPublished, ['Open the Insight you published']);
      if (s.gen) return say(NOTES.alreadyDrafting, []);
      if (!s.versions.includes('v2')) return say(NOTES.needVersion2, [answered(s) ? 'Add this path to the Insight' : TRACE_QUESTION]);
      return {
        ...push(setAside(stopRun(s, false)), question(s, 'Generate new Insight', 'S7'), { kind: 'generate' }),
        kharonOpen: true, viewing: 'v2', insightShown: 'draft', panelTab: 'insight', prompts: [],
        gen: { stage: 'outline', checks: 0, outline: ['o1', 'o2', 'o3'] },
      };
    case 'openPublished':
      if (!s.published) return offScript(s, text);
      return { ...s, feedId: PUBLISHED_FEED_ID, insightShown: 'published', panelTab: 'insight' };
    case 'links':
      return startRun({ ...s, focus: { kind: 'entity', id: i.entityId } }, text, linksSteps(shortName(i.entityId)), { kind: 'links', entityId: i.entityId });
    case 'linkSources':
      return startRun(s, text, sourcesSteps, { kind: 'linkSources', linkId: i.linkId });
    case 'offScript':
      return offScript(s, text);
  }
}

function offScript(s: FlowState, text: string): FlowState {
  return { ...push(s, question(s, text), { kind: 'cant', reason: 'offScript' }), kharonOpen: true, prompts: uniq([nextPrompt(s), ...s.prompts]).slice(0, 3) };
}

function accept(s: FlowState, p: ProposalId): FlowState {
  if (s.openProposal !== p) return s;
  const d = s.decisions[p] ?? allAccepted(p);
  const n = acceptedCount(d);
  if (!n) return s;
  const of = proposalById(p).changes.length;
  const version = proposalById(p).resultVersion;
  const turns = s.turns.map((t) => (t.kind === 'proposal' && t.status === 'open' ? { ...t, status: 'applied' as const, applied: n } : t));
  const base: FlowState = {
    ...s, turns: [...turns, { kind: 'saved', version, applied: n, of }], openProposal: null, reviewOpen: false, highlight: null,
    versions: s.versions.includes(version) ? s.versions : [...s.versions, version], viewing: version, answerGhost: false, insightShown: 'version',
  };
  if (p === 'P1') return { ...base, appliedP1: d, panelTab: 'history', selectedEntity: null, prompts: ['Generate new Insight', 'Show the original'] };
  if (p === 'P2') return { ...base, prompts: ['Back to Version 2', 'Generate new Insight'] };
  return { ...base, prompts: ['Open the Insight you published'] };
}

function rejectAll(s: FlowState, p: ProposalId): FlowState {
  if (s.openProposal !== p) return s;
  const turns = s.turns.map((t) => (t.kind === 'proposal' && t.status === 'open' ? { ...t, status: 'rejected' as const } : t));
  const base: FlowState = { ...s, turns, openProposal: null, reviewOpen: false, highlight: null, answerGhost: false };
  if (p === 'P1') return { ...push(base, { kind: 'note', text: NOTES.rejectedP1 }), prompts: ['Propose only the sourced path', 'Lay it out by ownership'] };
  if (p === 'P2') return { ...push(base, { kind: 'note', text: NOTES.rejectedP2 }), prompts: ['Back to Version 2'] };
  return { ...push(base, { kind: 'note', text: NOTES.rejectedP3 }), prompts: ['Open the Insight you published'] };
}

/**
 * Ticket 14: the flow wins. Any Arrangement change the flow drives (accepting a Proposal, S6's timeline, any Version
 * change) ends a view-only choice, and so does Kharon starting work or a Proposal opening, so the graph lands in the
 * Arrangement the flow means. A scene jump loads a replayed state, which never carries one.
 */
export function reducer(s: FlowState, a: Action): FlowState {
  const next = step(s, a);
  if (!next.viewArrangement) return next;
  const flowMoved = next.viewing !== s.viewing || savedArrangement(next) !== savedArrangement(s) || !!arrangementLocked(next);
  return flowMoved ? { ...next, viewArrangement: null } : next;
}

function step(s: FlowState, a: Action): FlowState {
  switch (a.type) {
    // S2: clicking the hovered Entity keeps its card, so its question box stays within reach.
    case 'selectEntity': return { ...s, selectedEntity: a.id, selectedLink: null, panelTab: 'record', hoverCard: s.hoverCard?.id === a.id ? s.hoverCard : null };
    case 'selectLink': return { ...s, selectedLink: a.id, selectedEntity: null, panelTab: 'record', hoverCard: s.hoverCard?.id === a.id ? s.hoverCard : null };
    case 'clearSelection': return { ...s, selectedEntity: null, selectedLink: null, hoverCard: null };
    case 'setTab': return { ...s, panelTab: a.tab };
    case 'hover': return { ...s, hoverCard: a.card };
    case 'peek': return { ...s, peek: a.id };
    case 'selectFeed': {
      if (s.updateOpened === false && s.day === 3 && (a.id === SURY_FEED_ID || a.id === PUBLISHED_FEED_ID)) return reducer(s, { type: 'openUpdate' });
      if (a.id === PUBLISHED_FEED_ID) return { ...s, feedId: a.id, insightShown: 'published', panelTab: 'insight' };
      if (a.id === SURY_FEED_ID) return { ...s, feedId: a.id, insightShown: 'version', panelTab: 'insight' };
      return { ...s, feedId: a.id }; // filler cards only take the active state
    }

    // Ticket 16: the hover card's question box sends what was typed; the Link card's button sends the scripted prompt.
    case 'ask': {
      if (a.text !== undefined && !a.text.trim()) return s;
      const opened: FlowState = { ...s, hoverCard: null, kharonOpen: true, focus: a.focus };
      const text = a.text ?? (a.focus.kind === 'link' ? ASK_LINK_PROMPT : askEntityPrompt(a.focus.id));
      if (a.focus.kind === 'link') return reducer({ ...opened, selectedLink: a.focus.id, selectedEntity: null, panelTab: 'record' }, { type: 'send', text });
      return reducer({ ...opened, selectedEntity: a.focus.id, selectedLink: null, panelTab: 'record' }, { type: 'send', text });
    }
    case 'toggleKharon': {
      if (s.kharonOpen) return { ...stopRun(s, true), kharonOpen: false, reviewOpen: false };
      const prompts = !s.turns.length && !s.prompts.length ? [TRACE_QUESTION] : s.prompts;
      return { ...s, kharonOpen: true, prompts, hoverCard: null };
    }
    case 'send': {
      const text = a.text.trim();
      if (!text) return s;
      return intent(s, text, route(text, s.focus?.kind === 'link' ? s.focus.id : null));
    }
    case 'runStep': {
      const r = s.run; if (!r || r.done >= r.steps.length) return s;
      const done = r.done + 1;
      const turns = s.turns.map((t, i) => (i === r.turn && t.kind === 'work' ? { ...t, done } : t));
      return { ...s, turns, run: { ...r, done } };
    }
    case 'runFinish': return finishRun(s);
    case 'stop': return stopRun(s, true);
    case 'expandAnswer': return { ...s, turns: s.turns.map((t, i) => (i === a.turn && t.kind === 'exposure' ? { ...t, compact: false } : t)) };

    case 'review': return { ...s, reviewOpen: a.open, highlight: null };
    case 'decide': {
      const d = { ...(s.decisions[a.proposal] ?? allAccepted(a.proposal)), [a.change]: a.accept };
      return { ...s, decisions: { ...s.decisions, [a.proposal]: d } };
    }
    case 'accept': return accept(s, a.proposal);
    case 'rejectAll': return rejectAll(s, a.proposal);
    case 'highlight': return s.highlight === a.change ? s : { ...s, highlight: a.change };
    case 'openVersion': return openVersion(s, a.version);
    case 'viewArrangement': return viewArrangement(s, a.arrangement);

    case 'outlineUp': {
      if (!s.gen || s.gen.stage !== 'outline' || a.index <= 0) return s;
      const o = [...s.gen.outline]; [o[a.index - 1], o[a.index]] = [o[a.index], o[a.index - 1]];
      return { ...s, gen: { ...s.gen, outline: o } };
    }
    case 'writeDraft': return s.gen?.stage === 'outline' ? { ...s, gen: { ...s.gen, stage: 'draft' } } : s;
    case 'genTick': {
      const g = s.gen; if (!g) return s;
      if (g.stage === 'draft') return { ...s, gen: { ...g, stage: 'check', checks: 0 } };
      if (g.stage === 'check') return g.checks < 4 ? { ...s, gen: { ...g, checks: g.checks + 1 } } : { ...s, gen: { ...g, stage: 'ready' } };
      return s;
    }
    case 'publish': {
      if (s.gen?.stage !== 'ready') return s;
      return {
        ...s, gen: { ...s.gen, stage: 'published' }, published: true, kharonOpen: false, reviewOpen: false,
        feedId: PUBLISHED_FEED_ID, insightShown: 'published', panelTab: 'insight', toast: 'Published to Main Feed',
      };
    }

    case 'skipAhead': {
      if (!s.published || s.day === 3) return s;
      const settled = setAside(stopRun(s, false));
      return { ...settled, day: 3, bell: 1, kharonOpen: false, feedId: SURY_FEED_ID, viewing: headVersion(settled), insightShown: 'version', panelTab: 'insight', selectedEntity: null, selectedLink: null, toast: null };
    }
    case 'toggleNotice': return { ...s, noticeOpen: !s.noticeOpen };
    case 'openUpdate': {
      if (s.day !== 3) return s;
      if (s.updateOpened) return { ...s, noticeOpen: false, feedId: SURY_FEED_ID, viewing: headVersion(s), insightShown: 'version' };
      const settled = setAside(stopRun(s, false));
      return {
        ...settled, noticeOpen: false, bell: 0, updateOpened: true,
        versions: settled.versions.includes('v3') ? settled.versions : [...settled.versions, 'v3'], viewing: 'v3',
        feedId: SURY_FEED_ID, insightShown: 'version', kharonOpen: true, focus: { kind: 'entity', id: 'xpu' },
        turns: [{ kind: 'changed', at: askedAt({ ...settled, turns: [] }, 'S9') }, { kind: 'proposal', id: 'P3', status: 'open' }],
        openProposal: 'P3', decisions: { ...settled.decisions, P3: allAccepted('P3') }, reviewOpen: false,
        selectedEntity: 'xpu', selectedLink: null, panelTab: 'record', prompts: ['Open the Insight you published'], answerGhost: false,
      };
    }
    case 'dismissToast': return { ...s, toast: null };
    case 'load': return a.state;
  }
}
