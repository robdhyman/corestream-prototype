// Ticket 16: the Entity hover card's Details · Risks tabs and its question box. Seams: entityCard (what the card
// shows for the Version on screen) and the flow reducer's ask Action (a typed question reaches the Kharon column).
import { describe, expect, it } from 'vitest';
import { reducer, type Action, type FlowState } from './flow';
import { graphView } from './graphView';
import { entityCard } from './hoverCard';
import { sceneState } from './scenes';
import { TRACE_QUESTION } from '../kharon/script';

const run = (s: FlowState, ...actions: Action[]) => actions.reduce(reducer, s);
const card = (scene: string, id: string) => entityCard(graphView(sceneState(scene)), id);

describe('Risks: what is recorded against the Entity itself', () => {
  it("shows Tarnwell's signal, its first part the title", () => {
    expect(card('S2', 'merid').risks).toEqual([{ kind: 'signal', title: 'Opaque ownership', rows: ['nominee directors'] }]);
  });

  it('shows a listing with its authority and date, without repeating the signal that abbreviates it', () => {
    expect(card('S5', 'xpzdc').risks).toEqual([{ kind: 'listing', title: 'OFAC SDN List', rows: [expect.stringContaining('Treasury'), 'Listed Dec 2020'] }]);
    expect(card('S5', 'tianshan').risks.map((r) => r.kind)).toEqual(['listing']);
  });

  it("adds the Update's listing once the Version carries it, and keeps XPU's own signal", () => {
    expect(card('S5', 'xpu').risks.map((r) => r.title)).toEqual(['Military-civil fusion designation']);
    expect(card('S9', 'xpu').risks.map((r) => r.title)).toEqual(['US Entity List', 'Military-civil fusion designation']);
  });

  it('is empty for an Entity with no listing, no signal and no path, so the tab is greyed', () => {
    const c = card('S2', 'smb');
    expect(c.risks).toEqual([]);
    expect(c.exposure).toEqual([]);
    expect(c.exposureNotTraced).toBe(false);
  });
});

describe('Risks: Exposure follows the Version on screen', () => {
  it('is not traced yet on S2 (Version 1) for Entities on a path', () => {
    for (const id of ['sury', 'merid', 'hct']) {
      expect(card('S2', id).exposureNotTraced).toBe(true);
      expect(card('S2', id).exposure).toEqual([]);
    }
  });

  it("isn't in the Version while Kharon's answer (S3) or its Proposal (S4) is only previewed on the graph", () => {
    for (const scene of ['S3', 'S4']) {
      for (const id of ['sury', 'merid', 'hct', 'xpu', 'tianshan']) {
        expect(card(scene, id).exposure).toEqual([]);
        expect(card(scene, id).exposureNotTraced).toBe(false); // Kharon has traced it: the graph shows it
      }
    }
  });

  it('shows the ownership chain from Version 2 on, on every Entity it runs through', () => {
    for (const id of ['sury', 'merid', 'hct', 'xpu', 'tianshan', 'xpzdc']) {
      expect(card('S5', id).exposure.map((r) => r.title)).toEqual(['Ownership chain']);
      expect(card('S5', id).exposureNotTraced).toBe(false);
    }
  });

  it('labels the path with its Confidence and lists one stop per Entity', () => {
    const [chain] = card('S5', 'merid').exposure;
    expect(chain.confidence).toBe('medium');
    expect(chain.rows[0]).toBe('Suryadeep');
    expect(chain.rows).toHaveLength(6);
    expect(chain.rows.at(-1)).toContain('XPZDC');
  });

  it('never shows the Zhou path, which S4 rejects', () => {
    for (const scene of ['S5', 'S9']) expect(card(scene, 'merid').exposure.some((r) => r.title === 'Shared person')).toBe(false);
  });

  it("doesn't call a ghost Entity Kharon found untraced", () => {
    expect(card('S3', 'tianshan').exposureNotTraced).toBe(false);
  });
});

describe('Details', () => {
  it("counts the Version's Links that touch the Entity, not Kharon's previewed ones", () => {
    expect(card('S2', 'merid').linkCount).toBe(4);
    expect(card('S3', 'merid').linkCount).toBe(4);
    expect(card('S3', 'hct').linkCount).toBe(card('S2', 'hct').linkCount);
    expect(card('S5', 'xpzdc').linkCount).toBe(1);
  });
});

describe('suggested questions: only ones the script answers', () => {
  it("offers S2's question on Tarnwell", () => {
    expect(card('S2', 'merid').questions).toEqual([TRACE_QUESTION]);
  });

  it("offers 'Who is X linked to?' on any other Entity", () => {
    expect(card('S2', 'hct').questions).toEqual(['Who is Larchmere linked to?']);
  });
});

describe('asking from the card', () => {
  const tarnwell = { kind: 'entity' as const, id: 'merid' };

  it("sending S2's question lands exactly where the old Ask Kharon button did (K1)", () => {
    expect(run(sceneState('S2'), { type: 'ask', focus: tarnwell, text: TRACE_QUESTION })).toEqual(sceneState('K1'));
  });

  it('sends a typed question as written, closes the card and opens the Kharon column', () => {
    const s = run(sceneState('S2'), { type: 'ask', focus: { kind: 'entity', id: 'hct' }, text: 'Who settled the trust?' });
    expect(s.kharonOpen).toBe(true);
    expect(s.hoverCard).toBeNull();
    expect(s.selectedEntity).toBe('hct');
    expect(s.turns[0]).toEqual({ kind: 'question', text: 'Who settled the trust?' });
  });

  it('ignores an empty question', () => {
    const s = sceneState('S2');
    expect(run(s, { type: 'ask', focus: tarnwell, text: '   ' })).toBe(s);
  });
});
