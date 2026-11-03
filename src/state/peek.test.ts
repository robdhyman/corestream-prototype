// Ticket 18: an Entity's name in Kharon lights its node on hover and selects it on click. Seam: the flow reducer.
import { describe, expect, it } from 'vitest';
import { reducer, type Action, type FlowState } from './flow';
import { sceneState } from './scenes';

const run = (s: FlowState, ...actions: Action[]) => actions.reduce(reducer, s);

describe('hovering an Entity in Kharon', () => {
  it('peeks it without selecting it or turning the panel', () => {
    const before = sceneState('S3');
    const s = run(before, { type: 'peek', id: 'tianshan' });
    expect(s.peek).toBe('tianshan');
    expect(s.selectedEntity).toBe(before.selectedEntity);
    expect(s.panelTab).toBe(before.panelTab);
  });

  it('lets go when the pointer leaves', () => {
    expect(run(sceneState('S3'), { type: 'peek', id: 'tianshan' }, { type: 'peek', id: null }).peek).toBeNull();
  });

  it('starts with nothing peeked in every scene', () => {
    for (const id of ['S1', 'S3', 'S5', 'S9'] as const) expect(sceneState(id).peek).toBeNull();
  });
});

describe('clicking an Entity in Kharon', () => {
  it('selects it on the graph and opens its Record details', () => {
    const s = run({ ...sceneState('S3'), panelTab: 'insight' }, { type: 'peek', id: 'tianshan' }, { type: 'selectEntity', id: 'tianshan' });
    expect(s.selectedEntity).toBe('tianshan');
    expect(s.selectedLink).toBeNull();
    expect(s.panelTab).toBe('record');
  });
});
