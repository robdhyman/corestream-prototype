// Kharon's script. There is no model behind Kharon in the prototype: typed prompts are matched here, and anything
// off the script gets a polite, in-scope reply (ticket 09). Copy follows ticket 02's variant D and ticket 03's case.json.

import type { Source } from '../data/types';
import { caseData, entityById } from '../data/case';
import { monthYear, story, type VersionId } from '../data/story';

export interface Step { title: string; detail: string }

const k1 = story.screens.find((s) => s.id === 'K1')!.kharon!;
const s3 = story.screens.find((s) => s.id === 'S3')!.kharon!;

export const TRACE_QUESTION = k1.question!;
const TRACE_DETAIL = ['3 Links in this Insight', 'OFAC SDN · US Entity List · UK · EU', 'BVI and Cayman filings · HK court exhibits'];
export const TRACE_STEPS: Step[] = k1.steps!.map((title, i) => ({ title, detail: TRACE_DETAIL[i] }));
export const PROPOSE_QUESTION = story.proposals.find((p) => p.id === 'P1')!.headline;
export const PROPOSE_STEPS: Step[] = [
  { title: "Reading the answer's paths", detail: '2 paths · 6 hops' },
  { title: 'Drafting Changes', detail: 'Entities · Links · Arrangement' },
];
export const BVI_STEPS: Step[] = [{ title: 'Reading the BVI register of directors', detail: 'Tarnwell · filed 2024' }];
export const linksSteps = (name: string): Step[] => [{ title: `Reading ${name}'s Links`, detail: 'Links and sources in this Insight' }];
export const sourcesSteps: Step[] = [{ title: 'Reading the sources for this Link', detail: 'Filings, registers and press' }];

/** S3's lead sentence and the two paths, from the Subject's owner upstream. */
export const EXPOSURE_LEAD = s3.answer!;
export const ZHOU_DOUBT = s3.lowConfidence!.text;
export const PATHS = [
  { n: 1, name: 'Ownership', from: 'merid', hops: ['L02', 'L04', 'L07', 'L08'] },
  { n: 2, name: 'One person', from: 'merid', hops: ['L05', 'L06'] },
] as const;
/** S9's short path from the Subject up to XPU. */
export const UPDATE_PATH = { from: 'sury', hops: ['L01', 'L02', 'L04'] } as const;

/** How each hop reads when walking upstream from the lower Entity to the upper one. */
export const HOP_PHRASE: Record<string, string> = {
  L01: '62% owned by',
  L02: 'Held 45% by',
  L04: 'Settled by',
  L07: 'Joint lab with · 2019–',
  L08: '100% owned by',
  L05: 'Director: same person? Name and city match',
  L06: 'Dean of engineering at',
};

/** F1: what Kharon had when it was stopped, by steps finished. */
export const STOPPED_HAD = [
  "I hadn't read anything yet.",
  "Tarnwell has 3 owner and bank Links in this Insight.",
  'Tarnwell has 3 owner and bank Links in this Insight. None of them is on a list.',
];

export const CANT = {
  bvi: {
    lead: "I couldn't confirm it.",
    body: "The BVI register lists Tarnwell's directors by name and a service address only, with no ID or date of birth. That doesn't settle whether this Zhou Ming is the XPU dean, so the Link stays Unconfirmed.",
    checked: 'Checked: BVI register of directors, filed 2024',
  },
  offScript: {
    lead: "I can't answer that from this Insight.",
    body: 'I work from its sources: ownership, listings, supply, contracts and logistics. I can trace a path, check a listing or propose Changes to the graph.',
  },
};

export const NOTES = {
  rejectedP1: 'No Changes applied. The Insight stays at Version 1, and History has no new entry.',
  rejectedP2: 'Nothing changed. No Branch was started, and Version 1 is as it was.',
  rejectedP3: "Nothing changed. XPU's rating stays as it was in Version 3.",
  branchOffer: 'Viewing Version 1. Changes here start a Branch, and Version 2 stays as it is.',
  shownUnconfirmed: 'Prof. Zhou Ming shows on the graph as Unconfirmed, dotted orange. Nothing is saved until you accept a Proposal.',
  stopped: 'Stopped. Nothing changed.',
  setAside: 'Left without a decision. Nothing was applied.',
  pathAlreadyIn: 'This path is already in Version 2. Changes now would start from there.',
  needVersion2: 'I write a new Insight from a saved Version with the traced path in it. Add the path first, then I can draft from Version 2.',
  needVersion2Timeline: 'A timeline of Version 1 would start a Branch once there is a newer Version. Add the traced path first.',
  alreadyPublished: "You've published it: it's at the top of the Main Feed.",
  alreadyDrafting: "I'm already drafting it. The outline is in the block above.",
};

/** Draft Insight self-check (ticket 02: 4 checks, 3 pass, 1 note). */
export const SELF_CHECKS: { ok: boolean; text: string; detail: string }[] = [
  { ok: true, text: 'Every claim has a source', detail: '12 of 12' },
  { ok: true, text: 'Unconfirmed Links left out', detail: 'Prof. Zhou Ming, director of Tarnwell' },
  { ok: true, text: 'Listings dated', detail: 'OFAC SDN Dec 2020 · US Entity List Apr 2021' },
  { ok: false, text: 'One claim rests on a Reported source', detail: 'XPU as settlor · redacted deed' },
];
/** Which Draft Insight paragraph each outline point writes (case.json ins-draft.paras); the analyst view closes. */
export const OUTLINE_PARA: Record<string, number> = { o3: 0, o1: 1, o2: 2 };

const PUBLISHER: Record<string, string> = {
  'High Court of the Hong Kong SAR, Court of First Instance (exhibit bundle)': 'HK High Court exhibit',
  'BVI Registry of Corporate Affairs, via High Court of the Hong Kong SAR, Court of First Instance (exhibit bundle)': 'BVI registry, via HK High Court exhibit',
  'National Enterprise Credit Information Publicity System (PRC)': 'PRC enterprise credit record',
  'Ministry of Corporate Affairs, India (MCA21)': 'MCA21',
};
/** One line per source for a 264 column: title · publisher, Mon YYYY. */
export const sourceLine = (s: Source) => `${s.title} · ${PUBLISHER[s.publisher] ?? s.publisher}, ${monthYear(s.date)}`;

// ---------- routing ----------

export type Intent =
  | { kind: 'trace' }
  | { kind: 'continueTrace' }
  | { kind: 'startOver' }
  | { kind: 'showUnconfirmed' }
  | { kind: 'checkBvi' }
  | { kind: 'propose'; sourcedOnly: boolean }
  | { kind: 'openVersion'; version: VersionId }
  | { kind: 'generate' }
  | { kind: 'timeline' }
  | { kind: 'openPublished' }
  | { kind: 'links'; entityId: string }
  | { kind: 'linkSources'; linkId: string }
  | { kind: 'offScript' };

/** Ask Kharon from a hover card: the prompt it sends. */
export const askEntityPrompt = (id: string) => (id === 'merid' ? TRACE_QUESTION : `Who is ${entityById.get(id)!.shortName ?? entityById.get(id)!.name} linked to?`);
export const ASK_LINK_PROMPT = 'What supports this Link?';

const norm = (t: string) => t.toLowerCase().replace(/[’']/g, "'").replace(/[?.!]+$/g, '').replace(/\s+/g, ' ').trim();

export function route(text: string, focusLink: string | null): Intent {
  const p = norm(text);
  if (p === 'continue tracing') return { kind: 'continueTrace' };
  if (p.startsWith('start over')) return { kind: 'startOver' };
  if (p.includes('show as unconfirmed')) return { kind: 'showUnconfirmed' };
  if (p.includes('bvi') || p.includes('registry filing')) return { kind: 'checkBvi' };
  if (p.includes('sourced path')) return { kind: 'propose', sourcedOnly: true };
  if (p.includes('add this path') || p.includes('add the path') || p.includes('by ownership') || p.includes('ownership hierarchy')) return { kind: 'propose', sourcedOnly: false };
  if (p.includes('show the original') || /\bversion 1\b/.test(p)) return { kind: 'openVersion', version: 'v1' };
  if (/\bversion 2\b/.test(p)) return { kind: 'openVersion', version: 'v2' };
  if (p.includes('generate') || p.includes('new insight')) return { kind: 'generate' };
  if (p.includes('timeline')) return { kind: 'timeline' };
  if (p.includes('insight you published')) return { kind: 'openPublished' };
  if (p.includes('who controls tarnwell') || p.includes('behind tarnwell') || p === 'who controls tarnwell holdings') return { kind: 'trace' };
  if (p === norm(ASK_LINK_PROMPT) && focusLink) return { kind: 'linkSources', linkId: focusLink };
  const linked = p.match(/^who is (.+) linked to$/);
  if (linked) {
    const e = caseData.entities.find((x) => norm(x.shortName ?? x.name) === linked[1] || norm(x.name) === linked[1]);
    if (e) return e.id === 'merid' ? { kind: 'trace' } : { kind: 'links', entityId: e.id };
  }
  return { kind: 'offScript' };
}
