// Feed column (Figma 117:5656): feed-head, a list of Feed/Card (28:386), and the synthetic-data footer.
// Ticket 09: the published Draft Insight joins the top of the Main Feed (S7), and the Update (S8) tags the two
// affected cards "Updated" (the published one keeps "New", ticket 20) and lifts them to the top. Clicking an updated card opens what changed (S9).

import { caseData } from '../data/case';
import { age } from '../data/from-case-03';
import { draftInsight, story, tagLabel } from '../data/story';
import type { FeedItem } from '../data/types';
import { PUBLISHED_FEED_ID } from '../state/flow';
import { useApp } from '../state/store';

export type FeedCardView = FeedItem & { updated?: boolean; isNew?: boolean };

const CLOCK = { 1: story.screens.find((s) => s.id === 'S1')!.clock, 3: story.screens.find((s) => s.id === 'S8')!.clock };

export function useFeedCards(): FeedCardView[] {
  const { state } = useApp();
  const clock = CLOCK[state.day];
  let cards: FeedCardView[] = caseData.feed.map((f) => {
    const src = story.feed.find((x) => x.title === f.title);
    return { ...f, time: src ? age(src.publishedAt, clock) : f.time };
  });
  if (state.published) {
    cards = [{
      id: PUBLISHED_FEED_ID, tag: draftInsight.tag, severity: 'danger', title: draftInsight.cardTitle, place: draftInsight.place,
      time: state.day === 1 ? 'Just now' : age(draftInsight.publishedAt, clock), insightId: draftInsight.id, isNew: true,
    }, ...cards];
  }
  if (state.day === 3) {
    const affected = new Set<string>(story.update.affectedInsightIds);
    // The Insight published at S7 keeps "New" rather than "Updated" (ticket 20).
    const hit = cards.filter((c) => c.insightId && affected.has(c.insightId)).map((c) => ({ ...c, updated: !c.isNew, time: 'Today' }));
    const order = (c: FeedCardView) => (c.insightId === 'ins-sury' ? 0 : 1);
    cards = [...hit.sort((a, b) => order(a) - order(b)), ...cards.filter((c) => !c.insightId || !affected.has(c.insightId))];
  }
  return cards;
}

export function Feed() {
  const { state, dispatch } = useApp();
  const cards = useFeedCards();
  return (
    <aside className="flex w-[264px] shrink-0 flex-col border-r border-content-border bg-white">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-content-border px-4 py-2">
        <h2 className="text-[14px] font-medium leading-[1.5] text-feed-head">Main Feed</h2>
        <div className="flex gap-1 text-feed-head">
          <button type="button" aria-label="Filter" className="flex h-[31px] w-[35px] items-center justify-center rounded-md hover:bg-surface-50"><i className="pi pi-filter" aria-hidden /></button>
          <button type="button" aria-label="Sort" className="flex h-[31px] w-[35px] items-center justify-center rounded-md hover:bg-surface-50"><i className="pi pi-sort-amount-down" aria-hidden /></button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 [scrollbar-width:none]">
        {cards.map((f) => (
          <FeedCard key={f.id} item={f} active={state.feedId === f.id} onSelect={() => dispatch({ type: 'selectFeed', id: f.id })} />
        ))}
      </div>
      <p className="h-[46px] shrink-0 border-t border-content-border px-2 py-1.5 font-mono text-[11px] leading-[1.5] text-text-muted">
        Prototype · all entities, identifiers and events are synthetic.
      </p>
    </aside>
  );
}

const TAG_TONE = {
  warn: { fill: 'bg-tag-warn-bg text-tag-warn', line: 'border-tag-warn-border text-tag-warn' },
  danger: { fill: 'bg-tag-danger-bg text-tag-danger', line: 'border-tag-danger text-tag-danger' },
  info: { fill: 'bg-tag-info-bg text-tag-info', line: 'border-tag-info text-tag-info' },
} as const;

/** Feed/Card states: active = 2 px primary border; unread = filled tag, red-orange dot, semibold title. */
function FeedCard({ item, active, onSelect }: { item: FeedCardView; active: boolean; onSelect: () => void }) {
  const unread = item.unread && !active;
  const tone = TAG_TONE[item.severity];
  return (
    <article
      onClick={onSelect}
      className={`group flex min-h-[116px] w-[248px] shrink-0 cursor-pointer flex-col gap-2 rounded-md bg-white ${
        // Figma strokes sit inside the 248 box, so the padding gives back the border width.
        active ? 'border-2 border-primary px-2.5 py-[9px] shadow-card-active' : 'border border-content-border px-[11px] py-2.5 shadow-card hover:border-form-border'
      }`}
    >
      <div className="flex min-h-[22px] items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`rounded-xs px-1.5 font-mono text-tag ${unread ? `${tone.fill} py-1 font-semibold` : `border ${tone.line} py-[3px] font-medium`}`}>
            {tagLabel(item.tag)}
          </span>
          {(item.updated || item.isNew) && <span className="rounded-xs bg-tag-info-bg px-1.5 py-1 font-mono text-tag font-semibold text-tag-info">{item.updated ? 'Updated' : 'New'}</span>}
          {unread && <span className="size-2 rounded-full bg-unread" aria-label="Unread" />}
        </div>
        <button type="button" aria-label="Bookmark" onClick={(e) => e.stopPropagation()} className="flex size-[22px] items-center justify-center rounded-[11px] text-text-muted opacity-0 hover:bg-surface-50 focus-visible:opacity-100 group-hover:opacity-100">
          <i className="pi pi-bookmark" aria-hidden />
        </button>
      </div>
      <h3 className={`min-h-[45px] text-card-title text-pretty text-feed-ink ${unread ? 'font-semibold' : 'font-medium'}`}>{item.title}</h3>
      <div className="flex items-center justify-between font-mono text-meta font-medium text-feed-ink">
        <span>{item.place}</span>
        <span>{item.time}</span>
      </div>
    </article>
  );
}
