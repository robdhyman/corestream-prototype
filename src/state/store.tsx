// App state: the golden flow reducer (./flow.ts) plus the timers that advance Kharon's runs, the draft and toasts.
// Replaces R3's mutable global `S` and the prototype's setTimeout chains: effects key on the state they wait for,
// so Stop, a scene jump or closing Kharon cancels a pending step by changing that state.

import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { initialState, reducer, type Action, type FlowState } from './flow';
import { graphView, type GraphView } from './graphView';
import { SCENES, sceneState } from './scenes';

export type { PanelTab, FlowState } from './flow';

const Ctx = createContext<{ state: FlowState; dispatch: Dispatch<Action>; view: GraphView } | null>(null);

function boot(): FlowState {
  const scene = new URLSearchParams(window.location.search).get('scene');
  return scene ? sceneState(scene) : initialState;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, boot);

  // Kharon's steps: one tick per step, then the outcome.
  useEffect(() => {
    const r = state.run; if (!r) return;
    const more = r.done < r.steps.length;
    const t = setTimeout(() => dispatch({ type: more ? 'runStep' : 'runFinish' }), more ? r.pace : 400);
    return () => clearTimeout(t);
  }, [state.run]);

  // Generate new Insight: draft fills in, then four self-checks tick, then the Draft Insight is ready.
  useEffect(() => {
    const g = state.gen; if (!g || (g.stage !== 'draft' && g.stage !== 'check')) return;
    const ms = g.stage === 'draft' ? 1400 : g.checks < 4 ? 450 : 300;
    const t = setTimeout(() => dispatch({ type: 'genTick' }), ms);
    return () => clearTimeout(t);
  }, [state.gen]);

  useEffect(() => {
    if (!state.toast) return;
    const t = setTimeout(() => dispatch({ type: 'dismissToast' }), 2600);
    return () => clearTimeout(t);
  }, [state.toast]);

  // Dry-run keys (ticket 10): [ and ] step through the scenes, Shift+R restarts at S1. Ignored while typing.
  useEffect(() => {
    let at = Math.max(0, SCENES.findIndex((s) => s.id === new URLSearchParams(window.location.search).get('scene')));
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.target as Element).closest?.('textarea,input,[contenteditable]')) return;
      if (ev.key === ']' || ev.key === '[') {
        at = Math.min(SCENES.length - 1, Math.max(0, at + (ev.key === ']' ? 1 : -1)));
        dispatch({ type: 'load', state: sceneState(SCENES[at].id) });
      } else if (ev.key === 'R' && ev.shiftKey) {
        at = 0;
        dispatch({ type: 'load', state: initialState });
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  const view = useMemo(() => graphView(state), [state]);
  return <Ctx.Provider value={{ state, dispatch, view }}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}
