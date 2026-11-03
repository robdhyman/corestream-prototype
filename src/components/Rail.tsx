// Feed rail (ticket 02): while Kharon is open the Feed collapses to 48 px of card stubs (risk-tag colour, unread dot,
// Updated tint, selected outline), so S8's Updated state shows even when collapsed. Clicking brings the Feed back.

import { useApp } from '../state/store';
import { useFeedCards } from './Feed';

export function Rail() {
  const { state, dispatch } = useApp();
  const cards = useFeedCards();
  const back = () => dispatch({ type: 'toggleKharon' });
  return (
    <nav className="flex w-12 shrink-0 flex-col items-center gap-1.5 border-r border-content-border bg-surface-50 py-2.5" aria-label="Main Feed, collapsed">
      <button type="button" title="Show Main Feed" aria-label="Show Main Feed" onClick={back} className="flex size-[34px] items-center justify-center rounded-md text-text-muted hover:bg-surface-100">
        <i className="pi pi-list" aria-hidden />
      </button>
      <div className="mt-1 flex flex-col gap-[5px]">
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            title={c.title}
            onClick={back}
            className={`relative flex h-[26px] w-8 flex-col justify-center gap-[3px] rounded bg-white ${state.feedId === c.id ? 'border-2 border-primary px-1' : 'border border-content-border px-[5px]'}`}
          >
            <i className={`block h-[3px] w-3.5 rounded-[1px] ${c.updated ? 'bg-tag-info' : c.severity === 'danger' ? 'bg-tag-danger' : 'bg-tag-warn'}`} />
            <i className="block h-[3px] w-5 rounded-[1px] bg-form-border" />
            {c.unread && state.feedId !== c.id && <b className="absolute right-[3px] top-[3px] size-[5px] rounded-full bg-unread" />}
          </button>
        ))}
      </div>
    </nav>
  );
}
