// Ticket 17: every exchange in the Kharon thread is stamped with the story clock, so it never contradicts History.
// Seams: the flow reducer (scenes are replays of its Actions) and the thread's grouping into exchanges.
import { describe, expect, it } from 'vitest';
import { exchanges } from '../kharon/Thread';
import { sceneState } from './scenes';

const times = (id: Parameters<typeof sceneState>[0]) => exchanges(sceneState(id).turns).map((e) => `${e.question ? 'You' : 'Kharon'} ${e.at?.slice(11, 16)}`);

describe('the thread on the story clock', () => {
  it("asks the trace at K1's clock", () => {
    expect(times('S3')).toEqual(['You 10:03']);
  });

  it('proposes at S4, before Version 2 is saved at 10:12', () => {
    expect(times('S5')).toEqual(['You 10:03', 'You 10:10']);
  });

  it("opens Kharon's Branch offer as its own exchange at S6's clock", () => {
    expect(times('S6')).toEqual(['You 10:03', 'You 10:10', 'Kharon 10:20']);
  });

  it("generates at S7's clock", () => {
    expect(times('S7').at(-1)).toBe('You 10:35');
  });

  it("opens the Update day with Kharon's Source update at S9's clock", () => {
    expect(times('S9')).toEqual(['Kharon 15:02']);
  });

  it('never runs backwards', () => {
    for (const id of ['S3', 'S5', 'S6', 'S7', 'S9'] as const) {
      const at = exchanges(sceneState(id).turns).map((e) => Date.parse(e.at!));
      expect(at).toEqual([...at].sort((a, b) => a - b));
    }
  });
});
