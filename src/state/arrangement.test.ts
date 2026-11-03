// Ticket 14: the on-canvas Arrangement toggle is a view-only choice. Seams: the flow reducer (Actions in, state out),
// graphView (what the canvas draws) and arrangementToggle (what the control shows).
import { describe, expect, it } from 'vitest';
import { reducer, type Action, type FlowState } from './flow';
import { arrangementToggle, graphView } from './graphView';
import { sceneState } from './scenes';

const run = (s: FlowState, ...actions: Action[]) => actions.reduce(reducer, s);
const view = (arrangement: 'radial' | 'ownership' | 'timeline'): Action => ({ type: 'viewArrangement', arrangement });

describe('viewing another Arrangement', () => {
  it('re-lays out the Version on the spot', () => {
    const s = run(sceneState('S2'), view('ownership'));
    expect(graphView(s).arrangement).toBe('ownership');
  });

  it('puts nothing into History and leaves the saved Arrangement alone', () => {
    const before = sceneState('S5');
    const s = run(before, view('radial'), view('timeline'));
    expect(s.versions).toEqual(['v1', 'v2']);
    expect(s.viewing).toBe('v2');
    expect(s.turns).toEqual(before.turns);
    expect(graphView(s).content.arrangement).toBe('ownership');
    expect(arrangementToggle(s).saved).toBe('ownership');
    expect(arrangementToggle(s).shown).toBe('timeline');
  });

  it('frames the whole graph', () => {
    const s = run(sceneState('S2'), view('ownership'));
    expect(new Set(graphView(s).focus)).toEqual(new Set(graphView(s).entities.map((e) => e.id)));
    const b = run(sceneState('S6B'), view('radial'));
    expect(new Set(graphView(b).focus)).toEqual(new Set(graphView(b).entities.map((e) => e.id)));
  });

  it('heads a view-only timeline with the Version, not as a Proposal preview', () => {
    expect(graphView(run(sceneState('S5'), view('timeline'))).timelineHeading).toBe('VERSION 2 · TIMELINE ARRANGEMENT · VIEW ONLY');
    expect(graphView(sceneState('S6')).timelineHeading).toBe('PREVIEW · TIMELINE ARRANGEMENT · NOT SAVED');
    expect(graphView(sceneState('S6B')).timelineHeading).toBe('BRANCH B · TIMELINE ARRANGEMENT');
  });

  it('choosing the saved Arrangement again ends the view-only choice', () => {
    const s = run(sceneState('S5'), view('radial'), view('ownership'));
    expect(s.viewArrangement).toBeNull();
    expect(graphView(s).focus).toEqual(graphView(sceneState('S5')).focus);
  });
});

describe('disabled while Kharon is working or a Proposal is on the graph', () => {
  it('is disabled while Kharon works (K1), and the graph stays radial', () => {
    const s = run(sceneState('K1'), view('ownership'));
    expect(arrangementToggle(s).disabled).toBe('working');
    expect(graphView(s).arrangement).toBe('radial');
  });

  it("is disabled while Kharon writes a Draft Insight", () => {
    const s = run(sceneState('S7'), { type: 'writeDraft' });
    expect(arrangementToggle(s).disabled).toBe('working');
  });

  it("is disabled while a Proposal's ghost diff is on the graph, and shows the Arrangement the Proposal previews", () => {
    const s = run(sceneState('S4'), view('timeline'));
    expect(arrangementToggle(s)).toEqual({ shown: 'ownership', saved: 'radial', disabled: 'proposal' });
    expect(graphView(s).arrangement).toBe('ownership');
    expect(arrangementToggle(sceneState('S9')).disabled).toBe('proposal');
  });

  it("stays enabled under Kharon's answer (S3), which is not a Proposal", () => {
    const s = run(sceneState('S3'), view('ownership'));
    expect(arrangementToggle(s)).toEqual({ shown: 'ownership', saved: 'radial', disabled: null });
    expect(graphView(s).arrangement).toBe('ownership');
  });

  it("keeps Kharon's found Entities in Ownership, but the timeline (which has no ghost diff) shows only the Version", () => {
    const own = graphView(run(sceneState('S3'), view('ownership')));
    expect(own.entities.map((e) => e.id)).toEqual(expect.arrayContaining(['xpu', 'tianshan', 'xpzdc', 'zhou']));
    const tl = graphView(run(sceneState('S3'), view('timeline')));
    expect(tl.linkIds).toEqual(tl.content.linkIds);
    expect(tl.legend).toBeNull();
  });

  it('ends the choice when Kharon starts working, so the work shows in the saved Arrangement', () => {
    const s = run(sceneState('S3'), view('ownership'), { type: 'send', text: 'Check the BVI registry filing' });
    expect(s.viewArrangement).toBeNull();
    expect(graphView(s).arrangement).toBe('radial');
  });
});

describe('the flow wins', () => {
  it('a Version change resets the choice (Back to Version 2 from Branch B)', () => {
    const s = run(sceneState('S6B'), view('ownership'), { type: 'openVersion', version: 'v2' });
    expect(s.viewArrangement).toBeNull();
    expect(graphView(s).arrangement).toBe('ownership');
    expect(arrangementToggle(s)).toMatchObject({ shown: 'ownership', saved: 'ownership' });
  });

  it("S6's timeline: opening Version 1 shows the Branch offer's timeline, whatever was being viewed", () => {
    const s = run(sceneState('S5'), view('radial'), { type: 'openVersion', version: 'v1' });
    expect(s.viewArrangement).toBeNull();
    expect(graphView(s).arrangement).toBe('timeline');
    expect(graphView(s).timelineHeading).toBe('PREVIEW · TIMELINE ARRANGEMENT · NOT SAVED');
  });

  it('accepting a Proposal lands on the new Version in its saved Arrangement', () => {
    const s = run(sceneState('S3'), view('timeline'), { type: 'send', text: 'Add this path to the Insight' }, { type: 'runFinish' });
    const accepted = run(s, { type: 'decide', proposal: 'P1', change: 'C2', accept: false }, { type: 'accept', proposal: 'P1' });
    expect(accepted.viewArrangement).toBeNull();
    expect(arrangementToggle(accepted)).toMatchObject({ shown: 'ownership', saved: 'ownership' });
  });

  it('a scene jump starts from the saved Arrangement', () => {
    const s = run(sceneState('S5'), view('radial'), { type: 'load', state: sceneState('S5') });
    expect(graphView(s).arrangement).toBe('ownership');
  });
});
