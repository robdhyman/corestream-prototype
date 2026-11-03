// Graph canvas (Figma "Canvas 1:1", 117:5669): the graph stage plus its chrome:
// the Kharon `k` button (agent 2210:21961) top-left, Open In ClearView top-right, zoom bottom-right.
// Ticket 09 adds the hover cards with Ask Kharon, the Version banner, the ghost-diff legend, the toast and
// the prototype's story-clock pill (the one control that isn't product UI: it moves the story two days on).

import { useMemo, useRef } from 'react';
import { Graph } from '../graph/Graph';
import { Timeline } from '../graph/Timeline';
import { usePanZoom, type CameraTarget } from '../graph/usePanZoom';
import { ArrangementToggle } from './ArrangementToggle';
import { caseData, entityById, linkById } from '../data/case';
import { CONFIDENCE_LABEL, shortName, versionMeta } from '../data/story';
import { linkLabel } from '../graph/geometry';
import { headVersion, initialState } from '../state/flow';
import { inVersion, type LegendKey } from '../state/graphView';
import { useApp } from '../state/store';
import { KGlyph, KMark } from '../kharon/KMark';
import { Confidence } from '../kharon/atoms';

export function Canvas() {
  const { state, dispatch, view } = useApp();
  const stageRef = useRef<HTMLDivElement>(null);
  const arrangement = caseData.arrangements.find((a) => a.id === view.arrangement) ?? caseData.arrangements[0];
  const timeline = view.arrangement === 'timeline';

  const target = useMemo<CameraTarget>(() => {
    if (!view.focus) return { key: `${arrangement.id}|home`, bounds: null };
    const pts = view.focus.map((id) => arrangement.positions[id]).filter(Boolean);
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    return {
      key: `${arrangement.id}|${[...view.focus].sort().join(',')}`,
      bounds: { x0: Math.min(...xs) - 120, x1: Math.max(...xs) + 120, y0: Math.min(...ys) - 70, y1: Math.max(...ys) + 90 },
    };
  }, [arrangement, view.focus]);
  const pz = usePanZoom(stageRef, arrangement.size, target);

  const links = useMemo(() => caseData.links.filter((l) => view.linkIds.has(l.id)), [view.linkIds]);

  // Hover cards stay while the pointer travels from the mark into the card.
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hoverTo = (kind: 'entity' | 'link', id: string | null) => {
    clearTimeout(closing.current);
    if (id) {
      if (pz.dragging) return;
      dispatch({ type: 'hover', card: { kind, id, pinned: false } });
    } else {
      closing.current = setTimeout(() => dispatch({ type: 'hover', card: null }), 220);
    }
  };
  const card = state.hoverCard && !timeline ? placeCard(state.hoverCard.kind, state.hoverCard.id, arrangement.positions, pz.view, stageRef.current) : null;

  const head = headVersion(state);
  const banner = state.viewing === head ? null
    : state.viewing === 'b1' ? 'Viewing Branch B · from Version 1'
    : `Viewing ${versionMeta(state.viewing).label} · Changes here start a Branch`;

  return (
    <main className="relative min-w-0 flex-1 overflow-hidden bg-graph-bg">
      {/* The stage stays mounted so pan/zoom keeps its listeners; the timeline covers it. */}
      <div
        ref={stageRef}
        className={`absolute inset-0 ${pz.dragging ? 'cursor-grabbing' : 'cursor-grab'} ${timeline ? 'invisible' : ''}`}
        {...pz.handlers}
        onClick={() => { if (!pz.wasDrag()) dispatch({ type: 'clearSelection' }); }}
      >
        {!timeline && (
          <Graph
            entities={view.entities}
            links={links}
            arrangement={arrangement}
            view={pz.view}
            easing={pz.easing}
            selectedEntity={state.selectedEntity}
            selectedLink={state.selectedLink}
            marks={view.marks}
            onSelectEntity={(id) => dispatch({ type: 'selectEntity', id })}
            onSelectLink={(id) => dispatch({ type: 'selectLink', id })}
            onHoverEntity={(id) => hoverTo('entity', id)}
            onHoverLink={(id) => hoverTo('link', id)}
          />
        )}
      </div>
      {timeline && (
        <div className="absolute inset-0 px-6 pb-16 pt-16">
          <Timeline linkIds={view.linkIds} heading={view.timelineHeading} selectedEntity={state.selectedEntity} onSelectEntity={(id) => dispatch({ type: 'selectEntity', id })} />
        </div>
      )}

      <KButton open={state.kharonOpen} working={!!state.run} onClick={() => dispatch({ type: 'toggleKharon' })} />

      <button
        type="button"
        className="absolute right-4 top-4 flex items-center gap-[7px] rounded-md border border-button-border bg-button-bg px-[10.5px] py-[7px] text-[14px] font-medium leading-[17px] text-button-text hover:bg-white"
      >
        Open In ClearView
        <i className="pi pi-arrow-up-right" aria-hidden />
      </button>

      {banner && (
        <div className="absolute left-16 top-4 z-10 flex items-center gap-2.5 whitespace-nowrap rounded-md bg-tag-info py-[7px] pl-3 pr-2 text-[12.5px] text-white shadow-float">
          <i className="pi pi-sitemap !text-[13px]" aria-hidden />
          {banner}
          <button type="button" onClick={() => dispatch({ type: 'openVersion', version: head })} className="rounded bg-white/20 px-2 py-[3px] text-[12px] font-medium hover:bg-white/30">
            Back to {versionMeta(head).label}
          </button>
        </div>
      )}

      {!timeline && (
        <div className="absolute bottom-4 right-4 flex w-[35px] flex-col text-button-text">
          <button type="button" aria-label="Zoom in" onClick={() => pz.zoomBy(1.25)} className="flex h-[33px] items-center justify-center rounded-t-md border border-button-border bg-button-bg hover:bg-white">
            <i className="pi pi-plus" aria-hidden />
          </button>
          <button type="button" aria-label="Reset zoom" title="Reset the view" onClick={pz.reset} className="flex h-[31px] items-center justify-center border-x border-button-border bg-button-bg font-mono text-[13px] font-medium hover:bg-white">
            {Math.round(pz.view.zoom * 100)}
          </button>
          <button type="button" aria-label="Zoom out" onClick={() => pz.zoomBy(1 / 1.25)} className="flex h-[33px] items-center justify-center rounded-b-md border border-button-border bg-button-bg hover:bg-white">
            <i className="pi pi-minus" aria-hidden />
          </button>
        </div>
      )}

      <ArrangementToggle />

      {view.legend && <Legend title={view.legend.title} keys={view.legend.keys} />}

      {card && state.hoverCard && (
        <div
          className="absolute z-20 flex w-[240px] flex-col gap-1.5 rounded-lg border border-content-border bg-white px-3 py-2.5 shadow-float"
          style={{ left: card.x, top: card.y }}
          onPointerEnter={() => clearTimeout(closing.current)}
          onPointerLeave={() => hoverTo(state.hoverCard!.kind, null)}
        >
          {state.hoverCard.kind === 'entity'
            ? <EntityCardBody id={state.hoverCard.id} found={!inVersion(view, state.hoverCard.id)} />
            : <LinkCardBody id={state.hoverCard.id} />}
          <button
            type="button"
            onClick={() => dispatch({ type: 'ask', focus: { kind: state.hoverCard!.kind, id: state.hoverCard!.id } })}
            className="mt-0.5 flex items-center gap-2 rounded-md border border-agent px-2.5 py-1.5 text-[12.5px] font-medium text-[#a64a0c] hover:bg-[#fff4ec]"
          >
            <KMark size={18} />Ask Kharon
          </button>
        </div>
      )}

      {state.toast && (
        <div className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-md bg-text px-3.5 py-2 text-[13px] text-white shadow-float">{state.toast}</div>
      )}
      <StoryClock />
    </main>
  );
}

/** Screen position for a hover card: right of the Entity (or the Link's midpoint), flipped left near the edge. */
function placeCard(kind: 'entity' | 'link', id: string, positions: Record<string, { x: number; y: number }>, v: { zoom: number; pan: { x: number; y: number } }, stage: HTMLDivElement | null) {
  let p: { x: number; y: number } | undefined;
  if (kind === 'entity') p = positions[id];
  else {
    const l = linkById.get(id);
    const a = l && positions[l.source], b = l && positions[l.target];
    if (a && b) p = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  if (!p) return null;
  const sx = v.pan.x + p.x * v.zoom, sy = v.pan.y + p.y * v.zoom;
  const w = stage?.clientWidth ?? 800, h = stage?.clientHeight ?? 1000;
  const off = kind === 'entity' ? 24 * v.zoom + 10 : 14;
  let x = sx + off, y = sy - 22;
  if (x + 240 > w - 8) x = sx - (kind === 'entity' ? 84 * v.zoom + 8 : off) - 240; // clear the centred node label
  y = Math.min(Math.max(64, y), h - 190);
  return { x, y };
}

function EntityCardBody({ id, found }: { id: string; found: boolean }) {
  const e = entityById.get(id)!;
  return (
    <>
      <div className="font-mono text-[12px] font-semibold leading-[1.3] text-graph-text">{e.name}</div>
      <div className="text-[11.5px] text-text-muted">{cap(e.kind)} · {e.place}</div>
      {e.flag && <span className={`self-start rounded-xs border px-1.5 py-[3px] font-mono text-tag font-medium uppercase tracking-[0.05em] ${e.tier === 'risk' ? 'border-[#fdba74] bg-tag-warn-bg text-tag-warn' : 'border-form-border bg-surface-100 text-text-muted'}`}>{e.flag}</span>}
      {found && <span className="text-[11.5px] text-primary-active">Found by Kharon · not yet in this Insight</span>}
    </>
  );
}

function LinkCardBody({ id }: { id: string }) {
  const l = linkById.get(id)!;
  return (
    <>
      <div className="font-mono text-[12px] font-semibold leading-[1.3] text-graph-text">{linkLabel(l)}</div>
      <div className="text-[11.5px] text-text-muted">{shortName(l.source)} → {shortName(l.target)} · {l.detail}</div>
      {l.confidence && <span className="self-start"><Confidence c={l.confidence} /> <span className="text-[11.5px] text-text-muted">{l.sources?.length ?? 0} source{l.sources?.length === 1 ? '' : 's'}</span></span>}
    </>
  );
}

const LEGEND_KEY: Record<LegendKey, { label: string; cls: string }> = {
  added: { label: 'Added', cls: 'border-t-2 border-dashed border-primary' },
  found: { label: 'Found', cls: 'border-t-2 border-dashed border-primary' },
  hidden: { label: 'Hidden', cls: 'border-t-2 border-link opacity-40' },
  unconfirmed: { label: CONFIDENCE_LABEL.low, cls: 'border-t-2 border-dotted border-tag-warn' },
};

function Legend({ title, keys }: { title: string; keys: LegendKey[] }) {
  return (
    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 rounded-md border border-content-border bg-white px-2.5 py-[7px] font-mono text-[10.5px] uppercase text-text-muted">
      <b className="font-semibold text-text">{title}</b>
      {keys.map((k) => (
        <span key={k} className="flex items-center gap-1.5"><i className={`inline-block w-5 ${LEGEND_KEY[k].cls}`} />{LEGEND_KEY[k].label}</span>
      ))}
    </div>
  );
}

/** k button (hf/k). One disc that stays put (ticket 13, variant A): at rest a light disc with a teal ring; with
 *  Kharon open it is pressed, an orange/100 fill, a 2 px agent ring and an inset, the way a toolbar toggle is on.
 *  Working spins the arc inside whichever disc is showing. */
function KButton({ open, working, onClick }: { open: boolean; working: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title="Kharon"
      aria-label={open ? 'Close Kharon' : 'Open Kharon'}
      aria-pressed={open}
      onClick={onClick}
      className={`absolute left-4 top-4 z-10 flex size-8 items-center justify-center rounded-full ${open
        ? 'border-2 border-agent bg-[#ffedd5] shadow-[inset_0_1.5px_3px_rgb(166_74_12/0.35)] hover:bg-[#fee2c4]'
        : 'border border-[#2c5e6a] bg-[#fafafa] hover:bg-white'}`}
    >
      <KGlyph size={open ? 28 : 30} working={working} />
    </button>
  );
}

/** Prototype control, styled apart from the product: moves the story clock to the Update, or back to S1. */
function StoryClock() {
  const { state, dispatch } = useApp();
  const restart = state.versions.includes('v4');
  if (!(state.published && state.day === 1 && !state.toast) && !restart) return null;
  return (
    <button
      type="button"
      onClick={() => dispatch(restart ? { type: 'load', state: initialState } : { type: 'skipAhead' })}
      className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#16181b] px-3.5 py-2 font-mono text-[11px] text-[#f1f2f3] shadow-float hover:bg-[#24272c]"
    >
      <span className="text-[#7fd3dc]">PROTOTYPE</span>
      {restart ? 'Walk it again from S1' : 'Two days later: 30 Oct, 15:00'}
      <i className="pi pi-arrow-right !text-[11px]" aria-hidden />
    </button>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
