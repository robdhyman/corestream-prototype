// Proposals (ticket 02): 2+ Changes open a full-column review (variant C's), one Change docks as a tray above the
// composer (variant B's). Every Change starts accepted; the primary tracks "Accept all", then "Accept N of M",
// and is disabled at 0. Hovering a row highlights its items on the graph.

import { linkById } from '../data/case';
import { acceptedCount, allAccepted, proposalById, shortName, versionMeta, type Change, type ProposalId } from '../data/story';
import { useApp } from '../state/store';
import { Btn, Confidence } from './atoms';

const ICON: Record<Change['kind'], { icon: string; cls: string }> = {
  add: { icon: 'pi-plus', cls: 'bg-focus-fill text-primary-active' },
  hide: { icon: 'pi-eye-slash', cls: 'bg-surface-100 text-text-muted' },
  arrangement: { icon: 'pi-sitemap', cls: 'bg-tag-info-bg text-tag-info' },
  risk: { icon: 'pi-shield', cls: 'bg-tag-danger-bg text-tag-danger' },
};

const ARRANGEMENT_NAME = { radial: 'radial', ownership: 'ownership hierarchy', timeline: 'timeline' } as const;

const plural = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;

function counts(c: Change, from: keyof typeof ARRANGEMENT_NAME): string {
  if (c.kind === 'arrangement') return `Arrangement · ${ARRANGEMENT_NAME[from]} to ${ARRANGEMENT_NAME[c.arrangement!]}`;
  if (c.kind === 'risk') return 'Risk · high';
  const e = c.entityIds?.length ?? 0, l = c.linkIds?.length ?? 0;
  const parts: string[] = [];
  if (c.kind === 'hide') {
    if (l) parts.push(plural(l, 'Link', 'Links'));
    if (e) parts.push(`${plural(e, 'Entity', 'Entities')} with no other Link`);
  } else {
    if (e) parts.push(plural(e, 'Entity', 'Entities'));
    if (l) parts.push(plural(l, 'Link', 'Links'));
  }
  return parts.join(' · ');
}

function items(c: Change): string[] {
  if (c.kind === 'arrangement') return c.arrangement === 'ownership' ? ['Top-down from XPZDC to Grantham'] : ['Links placed by date', 'Starts Branch B from Version 1'];
  return [...(c.entityIds ?? []).map(shortName), ...(c.linkIds ?? []).map((id) => linkById.get(id)!.detail)];
}

function useProposal(id: ProposalId) {
  const { state, dispatch } = useApp();
  const p = proposalById(id);
  const d = state.decisions[id] ?? allAccepted(id);
  const n = acceptedCount(d), m = p.changes.length;
  const label = m === 1 ? 'Accept' : n === m ? 'Accept all' : `Accept ${n} of ${m}`;
  return { p, d, n, m, label, dispatch, base: versionMeta(p.basedOn) };
}

export function Review({ id }: { id: ProposalId }) {
  const { p, d, n, m, label, dispatch, base } = useProposal(id);
  return (
    <div className="flex min-h-0 flex-1 flex-col" onPointerLeave={() => dispatch({ type: 'highlight', change: null })}>
      <div className="flex flex-col gap-1 border-b border-content-border bg-highlight px-3 py-2.5">
        <button type="button" onClick={() => dispatch({ type: 'review', open: false })} className="self-start text-[12px] font-medium text-primary-active hover:underline">← Back to thread</button>
        <b className="text-[14px]">Review {m} Changes</b>
        <span className="text-[11.5px] text-text-muted">{m} Changes to {base.label}. Each one previews on the graph; hover to find it.</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {p.changes.map((c) => {
          const on = !!d[c.id];
          return (
            <div key={c.id} onPointerEnter={() => dispatch({ type: 'highlight', change: c.id })} className="flex flex-col gap-2 border-b border-content-border px-3 py-2.5 hover:bg-highlight">
              <div className="flex items-start gap-2">
                <span className={`flex size-[22px] shrink-0 items-center justify-center rounded ${ICON[c.kind].cls}`}><i className={`pi ${ICON[c.kind].icon} !text-[11px]`} aria-hidden /></span>
                <div className="min-w-0">
                  <div className={`text-[12.5px] font-medium leading-[1.3] ${on ? '' : 'text-text-soft line-through'}`}>{c.label}</div>
                  <div className="mt-[3px] flex flex-wrap items-center gap-1.5 font-mono text-[10.5px] leading-[1.5] text-text-soft">
                    {counts(c, base.arrangement)}<Confidence c={c.confidence} />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 pl-[30px]">
                {items(c).map((x) => <span key={x} className="rounded-xs bg-surface-100 px-[5px] py-0.5 font-mono text-[10.5px] text-text-muted">{x}</span>)}
              </div>
              {c.why && <p className="pl-[30px] text-[11.5px] leading-[1.35] text-text-muted">{c.why}</p>}
              <div className="flex gap-1.5 pl-[30px]">
                <Btn sm kind={on ? 'on' : 'plain'} aria-pressed={on} onClick={() => dispatch({ type: 'decide', proposal: id, change: c.id, accept: true })}><i className="pi pi-check !text-[11px]" aria-hidden />Accept</Btn>
                <Btn sm kind={on ? 'plain' : 'onx'} aria-pressed={!on} onClick={() => dispatch({ type: 'decide', proposal: id, change: c.id, accept: false })}><i className="pi pi-times !text-[11px]" aria-hidden />Reject</Btn>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between gap-1.5 border-t border-content-border bg-white px-3 py-2.5">
        <Btn kind="ghost" onClick={() => dispatch({ type: 'rejectAll', proposal: id })}>Reject all</Btn>
        <Btn kind="primary" disabled={!n} onClick={() => dispatch({ type: 'accept', proposal: id })}>{label}</Btn>
      </div>
    </div>
  );
}

export function Tray({ id }: { id: ProposalId }) {
  const { p, label, dispatch, base } = useProposal(id);
  const c = p.changes[0];
  const sub = id === 'P2' ? `1 Change to ${base.label} · starts a Branch` : `1 Change to ${base.label}`;
  return (
    <div className="flex flex-col rounded-lg border border-form-border bg-white shadow-[0_-6px_16px_rgb(0_30_40/0.06)]">
      <div className="flex items-baseline gap-1.5 px-2.5 pb-1.5 pt-2">
        <b className="text-[12.5px]">Proposal</b>
        <span className="font-mono text-[10.5px] uppercase text-text-soft">{sub}</span>
      </div>
      <div className="flex items-start gap-2 border-t border-surface-100 px-2.5 py-1.5">
        <span className={`flex size-[22px] shrink-0 items-center justify-center rounded ${ICON[c.kind].cls}`}><i className={`pi ${ICON[c.kind].icon} !text-[11px]`} aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-medium leading-[1.3]">{c.label}</span>
          <span className="mt-[3px] flex flex-wrap items-center gap-1.5 font-mono text-[10.5px] leading-[1.5] text-text-soft">{c.why ?? counts(c, base.arrangement)}{c.kind !== 'arrangement' && <Confidence c={c.confidence} />}</span>
        </span>
      </div>
      <div className="flex justify-between gap-1.5 border-t border-content-border px-2.5 py-2">
        <Btn kind="ghost" onClick={() => dispatch({ type: 'rejectAll', proposal: id })}>Reject</Btn>
        <Btn kind="primary" onClick={() => dispatch({ type: 'accept', proposal: id })}>{label}</Btn>
      </div>
    </div>
  );
}
