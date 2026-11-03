// Path-first answers (ticket 02, variant B in D): one stop per Entity, dotted like its graph node, and a segment
// per hop carrying the Link phrase, its confidence label and its source. Unconfirmed hops are dotted orange,
// the same mark as on the graph.

import type { ReactNode } from 'react';
import { entityById, linkById } from '../data/case';
import type { Listing } from '../data/types';
import { monthYear } from '../data/story';
import { HOP_PHRASE, sourceLine } from './script';
import { Confidence, EntityLink } from './atoms';

export const listingTag = (l: Listing) => `${l.name === 'OFAC SDN List' ? 'OFAC SDN' : l.name} · ${monthYear(l.listingDate)}`;

export function Tag({ tone, children }: { tone: 'danger' | 'new' | 'info' | 'neutral'; children: ReactNode }) {
  const cls = {
    danger: 'border-[#fca5a5] bg-tag-danger-bg text-tag-danger',
    new: 'border-tag-danger bg-tag-danger text-white',
    info: 'border-[#7dd3fc] bg-tag-info-bg text-tag-info',
    neutral: 'border-form-border bg-surface-100 text-text-muted',
  }[tone];
  return <span className={`inline-flex items-center whitespace-nowrap rounded-xs border px-1.5 py-[3px] font-mono text-[10px] font-medium uppercase leading-none tracking-[0.05em] ${cls}`}>{children}</span>;
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
      <span className="font-mono text-[11px] font-medium text-text-muted">{HOP_PHRASE[linkId] ?? l.detail}</span>
      <span className="flex flex-wrap items-baseline gap-1.5">
        <Confidence c={c} />
        {src && <span className="text-[11.5px] leading-[1.35] text-text-muted">{sourceLine(src)}</span>}
      </span>
    </div>
  );
}

/** Walks a path from `from` along `hops`, each hop landing on the Link's other end. */
export function PathView({ title, from, hops, tags }: { title?: string; from: string; hops: readonly string[]; tags?: Record<string, ReactNode> }) {
  const stops: ReactNode[] = [<Stop key={from} id={from} tags={tags?.[from]} />];
  let at = from;
  for (const h of hops) {
    const l = linkById.get(h)!;
    at = l.target === at ? l.source : l.target;
    stops.push(<Segment key={h} linkId={h} />, <Stop key={`${h}-${at}`} id={at} doubtful={l.confidence === 'low'} tags={tags?.[at]} />);
  }
  return (
    <div className="flex flex-col">
      {title && <div className="mb-1.5 mt-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.05em] text-text-muted">{title}</div>}
      {stops}
    </div>
  );
}
