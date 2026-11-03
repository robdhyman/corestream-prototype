// Path-first answers (ticket 02, variant B in D): one stop per Entity, dotted like its graph node, and a segment
// per hop carrying the Link phrase, its confidence label and its source. Unconfirmed hops are dotted orange,
// the same mark as on the graph. Ticket 17: a numbered path is its own card, and each kind of data has its own
// mark: an Entity is a dotted link with its node, a Link has the link glyph, a source the document glyph.

import type { ReactNode } from 'react';
import { entityById, linkById } from '../data/case';
import type { Confidence as Level, Listing, Source } from '../data/types';
import { monthYear } from '../data/story';
import { HOP_PHRASE, sourceLine } from './script';
import { Confidence, EntityLink, LinkPhrase, SourceLine } from './atoms';

export const listingTag = (l: Listing) => `${l.name === 'OFAC SDN List' ? 'OFAC SDN' : l.name} · ${monthYear(l.listingDate)}`;

export function Tag({ tone, children }: { tone: 'danger' | 'new' | 'info' | 'neutral'; children: ReactNode }) {
  const cls = {
    danger: 'border-[#fca5a5] bg-tag-danger-bg text-tag-danger',
    new: 'border-tag-danger bg-tag-danger text-white',
    info: 'border-[#7dd3fc] bg-tag-info-bg text-tag-info',
    neutral: 'border-form-border bg-surface-100 text-text-muted',
  }[tone];
  return <span className={`inline-flex items-center whitespace-nowrap rounded-xs border px-1.5 py-[3px] font-mono text-[10px] font-medium leading-none ${cls}`}>{children}</span>;
}

export function Stop({ id, doubtful, tags }: { id: string; doubtful?: boolean; tags?: ReactNode }) {
  const e = entityById.get(id)!;
  const dot = doubtful
    ? 'border-[1.5px] border-dotted border-tag-warn bg-white'
    : `${e.tier === 'risk' ? 'bg-risk ring-risk-stroke' : 'bg-entity ring-entity-stroke'} ring-1 ring-offset-2`;
  return (
    <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
      <span className={`size-3.5 shrink-0 ${e.isSubject ? 'rounded-[3px]' : 'rounded-full'} ${dot}`} />
      <EntityLink id={id} />
      <span className="flex flex-wrap gap-1">
        {e.listings?.map((l) => <Tag key={l.name} tone="danger">{listingTag(l)}</Tag>)}
        {tags}
      </span>
    </div>
  );
}

export function Segment({ linkId }: { linkId: string }) {
  const l = linkById.get(linkId)!;
  const c = l.confidence ?? 'high';
  const src = l.sources?.[0];
  return (
    <div className={`ml-1.5 flex flex-col gap-[3px] py-1.5 pl-3.5 ${c === 'low' ? 'border-l-2 border-dotted border-tag-warn' : 'border-l-2 border-entity-stroke'}`}>
      <HopEvidence phrase={HOP_PHRASE[linkId] ?? l.detail} confidence={c} source={src} />
    </div>
  );
}

/** What a hop rests on: the Link's phrase and confidence label, then its first source. */
export function HopEvidence({ phrase, confidence, source }: { phrase: string; confidence?: Level; source?: Source }) {
  return (
    <>
      <span className="flex flex-wrap items-center gap-1.5"><LinkPhrase>{phrase}</LinkPhrase>{confidence && <Confidence c={confidence} />}</span>
      {source && <SourceLine>{sourceLine(source)}</SourceLine>}
    </>
  );
}

/** Walks a path from `from` along `hops`, each hop landing on the Link's other end. */
export function PathView({ card, from, hops, tags }: { card?: { n: number; name: string }; from: string; hops: readonly string[]; tags?: Record<string, ReactNode> }) {
  const stops: ReactNode[] = [<Stop key={from} id={from} tags={tags?.[from]} />];
  let at = from;
  for (const h of hops) {
    const l = linkById.get(h)!;
    at = l.target === at ? l.source : l.target;
    stops.push(<Segment key={h} linkId={h} />, <Stop key={`${h}-${at}`} id={at} doubtful={l.confidence === 'low'} tags={tags?.[at]} />);
  }
  if (!card) return <div className="flex flex-col">{stops}</div>;
  // A numbered chip, the path's name and its hop count, heading a card of its own.
  return (
    <section className="mt-1 flex flex-col rounded-md border border-content-border bg-white" aria-label={`Path ${card.n} · ${card.name}`}>
      <header className="flex items-center gap-1.5 rounded-t-md border-b border-content-border bg-surface-50 px-2.5 py-1.5">
        <span className="rounded-xs bg-text px-1.5 py-[3px] font-mono text-[10px] font-semibold leading-none text-white">Path {card.n}</span>
        <span className="flex-1 text-[12.5px] font-semibold text-text">{card.name}</span>
        <span className="font-mono text-[10.5px] text-text-soft">{hops.length} hop{hops.length === 1 ? '' : 's'}</span>
      </header>
      <div className="flex flex-col px-2.5 py-2">{stops}</div>
    </section>
  );
}
