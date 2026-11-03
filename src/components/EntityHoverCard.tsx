// Ticket 16: the Entity hover card (Rob's "Hover States" wireframe). Details · Risks tabs, and the k mark at the
// top right opens a question box for Kharon. Sending goes to the Kharon column, as the old Ask Kharon button did,
// so S2 → K1 is unchanged. The card pins while the box has focus or text; Esc or a click on the canvas dismisses it.

import { useEffect, useState, type ReactNode } from 'react';
import { KMark } from '../kharon/KMark';
import { Confidence } from '../kharon/atoms';
import { entityCard, type ExposureBlock, type RiskBlock } from '../state/hoverCard';
import { useApp } from '../state/store';

type Tab = 'details' | 'risks' | 'ask';

export function EntityHoverCard({ id, found }: { id: string; found: boolean }) {
  const { state, dispatch, view } = useApp();
  const c = entityCard(view, id);
  const e = c.entity;
  const name = e.shortName ?? e.name;
  const [tab, setTab] = useState<Tab>('details');
  const [text, setText] = useState('');
  const shown = c.risks.length + c.exposure.length;
  const hasRisks = shown > 0 || c.exposureNotTraced;
  const pinned = !!state.hoverCard?.pinned;

  // Esc works with or without focus in the card (S2's replay pins it with nothing focused).
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') dispatch({ type: 'hover', card: null }); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [dispatch]);

  const pin = (on: boolean) => { if (pinned !== on) dispatch({ type: 'hover', card: { kind: 'entity', id, pinned: on } }); };
  const ask = (q: string) => dispatch({ type: 'ask', focus: { kind: 'entity', id }, text: q });
  const seeMore = (
    <button
      type="button"
      onClick={() => dispatch({ type: 'selectEntity', id })}
      className="self-start rounded-md border border-button-border bg-button-bg px-2.5 py-[5px] text-[12px] font-medium text-button-text hover:bg-white"
    >
      See More
    </button>
  );

  return (
    <div className="flex flex-col gap-2.5">
      <div className="-ml-1.5 flex items-center gap-1">
        <ToggleButton active={tab === 'details'} onClick={() => setTab('details')}>Details</ToggleButton>
        <ToggleButton active={tab === 'risks'} disabled={!hasRisks} onClick={() => setTab('risks')}>
          Risks{shown > 0 && <span className="ml-1.5 font-mono text-[10.5px] opacity-80">{shown}</span>}
        </ToggleButton>
        <button
          type="button"
          aria-label="Ask Kharon"
          aria-pressed={tab === 'ask'}
          title="Ask Kharon"
          onClick={() => setTab(tab === 'ask' ? 'details' : 'ask')}
          className={`ml-auto flex size-8 items-center justify-center rounded-full border ${tab === 'ask' ? 'border-agent bg-tag-warn-bg ring-2 ring-agent' : 'border-content-border bg-white hover:bg-[#fff4ec]'}`}
        >
          <KMark size={22} />
        </button>
      </div>

      {tab === 'details' && (
        <>
          <div>
            <div className="font-mono text-[12px] font-semibold leading-[1.3] text-graph-text">{e.name}</div>
            <div className="mt-0.5 text-[11.5px] text-text-muted">{cap(e.kind)}</div>
          </div>
          <ul className="flex flex-col gap-1 text-[11.5px] text-text">
            <Fact icon="pi-map-marker">{e.place}</Fact>
            {!found && <Fact icon="pi-share-alt">{count(c.linkCount, 'Link')} in this Insight</Fact>}
            {hasRisks && (
              <Fact icon="pi-exclamation-triangle" warn>
                <button type="button" onClick={() => setTab('risks')} className="text-left hover:underline">
                  {[c.risks.length && count(c.risks.length, 'risk'), c.exposure.length && count(c.exposure.length, 'Exposure path')].filter(Boolean).join(' · ') || NOT_TRACED}
                </button>
              </Fact>
            )}
          </ul>
          {found && <span className="text-[11.5px] text-primary-active">Found by Kharon · not yet in this Insight</span>}
          {seeMore}
        </>
      )}

      {tab === 'risks' && (
        <>
          <div className="flex max-h-[300px] flex-col gap-2 overflow-y-auto">
            {c.risks.map((r, i) => <RiskCard key={`r${i}`} r={r} strong={e.tier === 'risk' || r.kind === 'listing'} />)}
            {c.exposure.map((x, i) => <ExposureCard key={`x${i}`} x={x} name={name} />)}
            {c.exposureNotTraced && (
              <div className="rounded-md border border-dashed border-form-border px-2.5 py-2 text-[11.5px] text-text-muted">
                {NOT_TRACED}.{' '}
                <button type="button" onClick={() => setTab('ask')} className="font-medium text-[#a64a0c] hover:underline">Ask Kharon to trace it</button>
              </div>
            )}
          </div>
          {seeMore}
        </>
      )}

      {tab === 'ask' && (
        <>
          <div className="rounded-lg border border-content-border px-3 pb-2 pt-2.5 focus-within:border-agent">
            <div className="flex items-center gap-1.5 text-[11.5px] text-text-soft">
              <KMark size={14} />
              <span className="truncate">{e.name} · {cap(e.kind)}</span>
            </div>
            <textarea
              autoFocus
              rows={2}
              value={text}
              onFocus={() => pin(true)}
              onBlur={() => { if (!text.trim()) pin(false); }}
              onChange={(ev) => setText(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); if (text.trim()) ask(text); }
              }}
              placeholder={`Ask Kharon about ${name}…`}
              className="mt-1.5 w-full resize-none bg-transparent p-0 text-[13px] leading-[1.35] text-text outline-none placeholder:text-placeholder"
            />
            <div className="flex items-center justify-end gap-2">
              <span className="text-[11px] text-text-soft">↵ send · esc dismiss</span>
              <button
                type="button"
                aria-label="Send to Kharon"
                disabled={!text.trim()}
                onClick={() => ask(text)}
                className="flex size-7 items-center justify-center rounded-full bg-agent text-white hover:brightness-95 disabled:opacity-40"
              >
                <i className="pi pi-send !text-[12px]" aria-hidden />
              </button>
            </div>
          </div>
          <div className="flex flex-col items-start gap-1.5">
            {c.questions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                className="rounded-full border border-agent/60 bg-white px-2.5 py-1 text-left text-[12px] italic text-[#a64a0c] hover:bg-[#fff4ec]"
              >
                “{q}”
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const NOT_TRACED = 'Exposure not traced yet';

/** Text-only toggle with the Panel tabs' states (Insight | Record Details): rest muted, selected primary-active, no underline or stroke. */
function ToggleButton({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center px-1.5 py-1 text-[13px] font-semibold leading-[1.5] ${
        active ? 'text-primary-active' : disabled ? 'cursor-not-allowed text-text-soft' : 'text-text-muted'}`}
    >
      {children}
    </button>
  );
}

function Fact({ icon, warn, children }: { icon: string; warn?: boolean; children: ReactNode }) {
  return (
    <li className={`flex items-start gap-2 ${warn ? 'text-tag-warn' : ''}`}>
      <i className={`pi ${icon} mt-[2px] !text-[11px] ${warn ? '' : 'text-text-soft'}`} aria-hidden />
      {children}
    </li>
  );
}

/** A listing, or a signal on an Entity the graph draws as a risk, is orange; other signals stay muted, as the old card's flag tag did. */
function RiskCard({ r, strong }: { r: RiskBlock; strong: boolean }) {
  return (
    <div className={`rounded-md border px-2.5 py-2 ${strong ? 'border-[#fdba74] bg-tag-warn-bg' : 'border-form-border bg-surface-50'}`}>
      <div className={`text-[12px] font-semibold leading-[1.3] ${strong ? 'text-tag-warn' : 'text-text'}`}>{r.title}</div>
      <Rows rows={r.rows} dot={strong ? 'bg-tag-warn' : 'bg-text-soft'} />
    </div>
  );
}

function ExposureCard({ x, name }: { x: ExposureBlock; name: string }) {
  return (
    <div className="rounded-md border border-[#fdba74] bg-tag-warn-bg px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold leading-[1.3] text-tag-warn">Exposure · {x.title}</span>
        <Confidence c={x.confidence} />
      </div>
      <Rows rows={x.rows} dot="bg-tag-warn" bold={(row) => row.includes(name)} />
    </div>
  );
}

function Rows({ rows, dot, bold }: { rows: string[]; dot: string; bold?: (row: string) => boolean }) {
  return (
    <ul className="mt-1 flex flex-col gap-0.5">
      {rows.map((row, i) => (
        <li key={i} className={`flex items-start gap-1.5 text-[11.5px] leading-[1.35] text-text ${bold?.(row) ? 'font-semibold' : ''}`}>
          <i className={`mt-[5px] size-1.5 shrink-0 rounded-[1px] ${dot}`} aria-hidden />
          {row}
        </li>
      ))}
    </ul>
  );
}

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
