// Scenes for the dry run (ticket 10): each is a replay of the Actions a click-through would send from S1,
// so a jump lands in the same state as clicking. Keys [ and ] step through them; ?scene=S5 opens one.

import { reducer, initialState, type Action, type FlowState } from './flow';
import { PROPOSE_QUESTION } from '../kharon/script';

const S2: Action[] = [{ type: 'selectEntity', id: 'merid' }, { type: 'hover', card: { kind: 'entity', id: 'merid', pinned: true } }];
const K1: Action[] = [...S2, { type: 'ask', focus: { kind: 'entity', id: 'merid' } }];
const S3: Action[] = [...K1, { type: 'runFinish' }];
const S4: Action[] = [...S3, { type: 'send', text: PROPOSE_QUESTION }, { type: 'runFinish' }];
const S5: Action[] = [...S4, { type: 'decide', proposal: 'P1', change: 'C2', accept: false }, { type: 'accept', proposal: 'P1' }];
const S6: Action[] = [...S5, { type: 'openVersion', version: 'v1' }];
const S6B: Action[] = [...S6, { type: 'accept', proposal: 'P2' }];
const S7: Action[] = [...S6B, { type: 'send', text: 'Generate new Insight' }];
const S7R: Action[] = [...S7, { type: 'outlineUp', index: 2 }, { type: 'outlineUp', index: 1 }, { type: 'writeDraft' }, { type: 'genTick' }, { type: 'genTick' }, { type: 'genTick' }, { type: 'genTick' }, { type: 'genTick' }, { type: 'genTick' }];
const S8: Action[] = [...S7R, { type: 'publish' }, { type: 'dismissToast' }, { type: 'skipAhead' }];
const S9: Action[] = [...S8, { type: 'openUpdate' }];

export const SCENES: { id: string; label: string; actions: Action[] }[] = [
  { id: 'S1', label: 'S1 Main Feed', actions: [] },
  { id: 'S2', label: 'S2 Hover Tarnwell', actions: S2 },
  { id: 'K1', label: 'K1 Working', actions: K1 },
  { id: 'F1', label: 'F1 Stop', actions: [...K1, { type: 'runStep' }, { type: 'runStep' }, { type: 'stop' }] },
  { id: 'S3', label: 'S3 Exposure', actions: S3 },
  { id: 'F3', label: "F3 Can't answer", actions: [...S3, { type: 'send', text: 'Check the BVI registry filing' }, { type: 'runFinish' }] },
  { id: 'S4', label: 'S4 Proposal', actions: S4 },
  { id: 'F2', label: 'F2 Reject all', actions: [...S4, { type: 'rejectAll', proposal: 'P1' }] },
  { id: 'S5', label: 'S5 Version 2', actions: S5 },
  { id: 'S6', label: 'S6 Version 1', actions: S6 },
  { id: 'S6B', label: 'S6 Branch B', actions: S6B },
  { id: 'S7', label: 'S7 Generate', actions: S7 },
  { id: 'S7R', label: 'S7 Draft Insight', actions: S7R },
  { id: 'S8', label: 'S8 Update', actions: S8 },
  { id: 'S9', label: 'S9 Deep dive', actions: S9 },
];

export function sceneState(id: string): FlowState {
  const scene = SCENES.find((s) => s.id === id) ?? SCENES[0];
  return scene.actions.reduce(reducer, initialState);
}

