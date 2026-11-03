// On-canvas Arrangement toggle (ticket 14), bottom-left of the canvas, mirroring the zoom control at bottom-right.
// A view-only choice: it re-lays out the viewed Version on the spot (the 520 ms ease, the camera framing the whole
// graph) and puts nothing into History. The Version's saved Arrangement carries the Saved dot; a Kharon Proposal is
// still the only way to change it. The rules live in the state layer (flow.ts `viewArrangement`, graphView.ts
// `arrangementToggle`); this file only draws them.

import { versionMeta, type ArrangementId } from '../data/story';
import { arrangementToggle } from '../state/graphView';
import { useApp } from '../state/store';

const OPTIONS: { id: ArrangementId; label: string }[] = [
  { id: 'radial', label: 'Radial' },
  { id: 'ownership', label: 'Ownership' },
  { id: 'timeline', label: 'Timeline' },
];

const WHY = {
  working: 'Kharon is working · the Arrangement is held until it finishes',
  proposal: 'A Proposal is on the graph · accept or reject it to change the view',
} as const;

export function ArrangementToggle() {
  const { state, dispatch, view } = useApp();
  const t = arrangementToggle(state, view);
  const version = versionMeta(state.viewing).label;
  // Sit above the ghost-diff legend and the prototype's story-clock pill (Canvas.tsx StoryClock) when they show.
  const clock = (state.published && state.day === 1 && !state.toast) || state.versions.includes('v4');
  const bottom = 16 + (view.legend ? 38 : 0) + (clock ? 46 : 0);

  return (
    <div
      role="group"
      aria-label="Arrangement"
      title={t.disabled ? WHY[t.disabled] : undefined}
      style={{ bottom }}
      className={`absolute left-4 z-10 flex h-[33px] overflow-hidden rounded-md border border-button-border bg-button-bg text-[13px] font-medium text-button-text transition-[bottom] duration-200 ${t.disabled ? 'opacity-55' : ''}`}
    >
      {OPTIONS.map((o) => {
        const on = t.shown === o.id, saved = t.saved === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            disabled={!!t.disabled}
            onClick={() => dispatch({ type: 'viewArrangement', arrangement: o.id })}
            className={`flex items-center gap-1.5 border-l border-button-border px-3 first:border-l-0 disabled:cursor-not-allowed ${on ? 'bg-focus-fill text-primary-active' : 'enabled:hover:bg-white'}`}
          >
            {o.label}
            {saved && (
              <>
                <span aria-hidden title={`Saved with ${version}`} data-saved className="size-1.5 rounded-full bg-primary" />
                <span className="sr-only">, saved with {version}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
