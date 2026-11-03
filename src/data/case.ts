// THE SWAP POINT for case data. Everything in the app reads the case through this module.
// Default: ticket 03's case JSON through ./from-case-03.ts (Tarnwell / Larchmere names, Version 1).
// ?case=figma loads the seed built from Figma 117:5653 + graph-data.js, which reproduces the frame exactly
// (it still carries the pre-rename names Meridian Crest and Harbour Crescent, so use it only for comparison).

import type { CaseData, Entity, Link } from './types';
import { seed } from './seed-figma-117-5653';
import { fromCase03 } from './from-case-03';

const choice = new URLSearchParams(window.location.search).get('case');
export const caseData: CaseData = choice === 'figma' ? seed : fromCase03();

export const entityById = new Map<string, Entity>(caseData.entities.map((e) => [e.id, e]));
export const linkById = new Map<string, Link>(caseData.links.map((l) => [l.id, l]));
export const subject = caseData.entities.find((e) => e.isSubject)!;
