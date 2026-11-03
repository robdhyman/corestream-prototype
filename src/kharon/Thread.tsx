// The Kharon thread (ticket 02, variant D; ticket 17). Turns group into exchanges: your question in a filled
// bubble on the right, then Kharon's reply under its mark, each headed with who and when, with a rule between
// exchanges. One renderer per Turn kind from state/flow.ts.

import { caseData, linkById } from '../data/case';
import { draftInsight, proposalById, shortName, stamp, story, versionMeta } from '../data/story';
import type { Turn } from '../state/flow';
import { useApp } from '../state/store';
import { CANT, EXPOSURE_LEAD, PATHS, SELF_CHECKS, STOPPED_HAD, UPDATE_PATH, ZHOU_DOUBT } from './script';
import { Box, Btn, Confidence, Lead, Meta, Note, SourceLine, Src } from './atoms';
import { KMark } from './KMark';
import { HopEvidence, PathView, Stop, Tag } from './Path';

function TurnView({ turn, index }: { turn: Turn; index: number }) {
  switch (turn.kind) {
    case 'question': return <Question text={turn.text} />;
    case 'work': return <Work turn={turn} />;
    case 'exposure': return <Exposure compact={turn.compact} index={index} />;
    case 'links': return <LinksAnswer entityId={turn.entityId} linkIds={turn.linkIds} />;
    case 'linkSources': return <LinkSources linkId={turn.linkId} />;
    case 'cant': return <Cant reason={turn.reason} />;
    case 'note': return <Note>{turn.text}</Note>;
    case 'proposal': return <ProposalLine turn={turn} />;
    case 'saved': return <Saved turn={turn} />;
    case 'generate': return <Generate />;
    case 'changed': return <Changed />;
  }
}

function Question({ text }: { text: string }) {
  return (
    <p className="max-w-[88%] self-end rounded-[12px] rounded-br-[3px] bg-primary-active px-3 py-2 text-[13px] font-medium leading-[1.4] text-white">
      {text}
    </p>
  );
}

/** One exchange: an optional question and the turns Kharon answered it with, stamped with the story clock.
 *  A stamped turn with no question before it (the Branch offer, S9's Source update) opens an exchange of
 *  Kharon's alone. */
export interface Exchange { question?: string; at?: string; replies: { turn: Turn; index: number }[] }

export function exchanges(turns: Turn[]): Exchange[] {
  const out: Exchange[] = [];
  turns.forEach((turn, index) => {
    if (turn.kind === 'question') { out.push({ question: turn.text, at: turn.at, replies: [] }); return; }
    if (!out.length || ('at' in turn && turn.at)) out.push({ at: 'at' in turn ? turn.at : undefined, replies: [] });
    out[out.length - 1].replies.push({ turn, index });
  });
  return out;
}

/** '10:03', or '30 Oct · 15:02' when the day changed since the exchange before. */
export function bylineTime(at: string | undefined, before: string | undefined) {
  if (!at) return '';
  return before && before.slice(0, 10) !== at.slice(0, 10) ? stamp(at) : at.slice(11, 16);
}

function Byline({ who, time, mine }: { who: string; time: string; mine?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-[11.5px] leading-4 ${mine ? 'self-end' : ''}`}>
      {!mine && <KMark size={16} />}
      <span className="font-semibold text-text">{who}</span>
      {time && <span className="font-mono text-[10.5px] text-text-soft">· {time}</span>}
    </div>
  );
}

/** An exchange under its bylines, ruled off from the one before. */
export function ExchangeView({ ex, time, first }: { ex: Exchange; time: string; first: boolean }) {
  return (
    <div className={`flex flex-col gap-3 ${first ? '' : 'border-t border-content-border pt-3.5'}`}>
      {ex.question !== undefined && (
        <div data-question className="flex flex-col gap-1">
          <Byline who="You" time={time} mine />
          <Question text={ex.question} />
        </div>
      )}
      {ex.replies.length > 0 && (
        <div className="flex flex-col gap-2">
          <Byline who="Kharon" time={time} />
          {ex.replies.map(({ turn, index }) => <TurnView key={index} turn={turn} index={index} />)}
        </div>
      )}
    </div>
  );
}

export function Bars({ total, done, now = -1 }: { total: number; done: number; now?: number }) {
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={`h-1 flex-1 rounded-sm ${i < done ? 'bg-primary' : i === now ? 'animate-pulse bg-[linear-gradient(90deg,var(--color-primary)_0_40%,var(--color-content-border)_40%)]' : 'bg-content-border'}`} />
      ))}
    </div>
  );
}

function Work({ turn }: { turn: Extract<Turn, { kind: 'work' }> }) {
  if (turn.status === 'running') return <Meta>Working · see the strip above</Meta>;
  if (turn.status === 'done') return <Meta>{turn.steps.length} step{turn.steps.length > 1 ? 's' : ''} · done</Meta>;
  if (!turn.trace) return <Meta>Stopped after {turn.done} of {turn.steps.length} step{turn.steps.length > 1 ? 's' : ''}</Meta>;
  // F1: what Kharon had, what it didn't do, and that nothing changed.
  const left = turn.steps.slice(turn.done).map((s) => s.title.charAt(0).toLowerCase() + s.title.slice(1));
  return (
    <Box>
      <Bars total={turn.steps.length} done={turn.done} />
      <Lead>Stopped after {turn.done} of {turn.steps.length} steps.</Lead>
      <Src>{STOPPED_HAD[Math.min(turn.done, STOPPED_HAD.length - 1)]}</Src>
      <Src>Not done: {left.join(', ')}. Nothing on the graph changed.</Src>
    </Box>
  );
}

function Exposure({ compact, index }: { compact: boolean; index: number }) {
  const { state, dispatch } = useApp();
  const hops = PATHS.reduce((n, p) => n + p.hops.length, 0);
  if (compact) {
    return (
      <Box>
        <Lead>{EXPOSURE_LEAD}</Lead>
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10.5px] text-text-soft">
          {PATHS.length} paths · {hops} hops · 1 <Confidence c="low" />
          <button type="button" onClick={() => dispatch({ type: 'expandAnswer', turn: index })} className="ml-auto font-sans text-[12px] font-medium text-primary-active hover:underline">Show path</button>
        </div>
      </Box>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <Lead>{EXPOSURE_LEAD}</Lead>
      {PATHS.map((p) => <PathView key={p.n} card={{ n: p.n, name: p.name }} from={p.from} hops={p.hops} />)}
      <div className="mt-2.5">
        <Box tone="warn">
          <div className="flex items-center gap-1.5"><Confidence c="low" /><Src>Same person?</Src></div>
          <p className="text-[12.5px] leading-[1.4]">{ZHOU_DOUBT}</p>
          {state.zhou === 'open' && (
            <div className="flex flex-col items-start gap-1.5">
              <Btn sm onClick={() => dispatch({ type: 'send', text: 'Check the BVI registry filing' })}>Check the BVI registry filing</Btn>
              <Btn sm kind="ghost" onClick={() => dispatch({ type: 'send', text: 'Show as unconfirmed' })}>Show as unconfirmed</Btn>
            </div>
          )}
        </Box>
      </div>
    </div>
  );
}

/** Ask Kharon on any other Entity: its Links in this Version, each with a label and a source. */
function LinksAnswer({ entityId, linkIds }: { entityId: string; linkIds: string[] }) {
  const listedNear = linkIds.some((id) => { const l = linkById.get(id)!; const o = l.source === entityId ? l.target : l.source; return caseData.entities.find((e) => e.id === o)?.listings?.length; });
  return (
    <div className="flex flex-col gap-2">
      <Lead>
        {shortName(entityId)} has {linkIds.length} Link{linkIds.length === 1 ? '' : 's'} in this Insight{linkIds.length ? (listedNear ? ', one of them to a listed Entity.' : '. None of them is to a listed Entity.') : '.'}
      </Lead>
      {linkIds.map((id) => {
        const l = linkById.get(id)!;
        const other = l.source === entityId ? l.target : l.source;
        return (
          <div key={id} className={`flex flex-col gap-[3px] pl-3 ${l.confidence === 'low' ? 'border-l-2 border-dotted border-tag-warn' : 'border-l-2 border-entity-stroke'}`}>
            <Stop id={other} doubtful={l.confidence === 'low'} />
            <HopEvidence phrase={l.detail} confidence={l.confidence} source={l.sources?.[0]} />
          </div>
        );
      })}
    </div>
  );
}

/** Ask Kharon on a Link: what supports it, source by source. */
function LinkSources({ linkId }: { linkId: string }) {
  const l = linkById.get(linkId)!;
  return (
    <div className="flex flex-col gap-2">
      <Lead>
        {shortName(l.source)} → {shortName(l.target)}, {l.detail.toLowerCase()}: {l.confidence === 'low' ? 'no record ties it.' : l.confidence === 'medium' ? 'the sources support it, but none states it in full.' : 'a record states it directly.'}
      </Lead>
      {l.confidence && <span><Confidence c={l.confidence} /></span>}
      {l.sources?.map((s) => (
        <div key={s.title} className="flex flex-col gap-[3px] border-l-2 border-entity-stroke pl-3">
          <span className="flex items-baseline gap-1 text-[12.5px] font-medium"><i className="pi pi-file relative top-px !text-[10px] text-text-soft" aria-hidden />{s.title}</span>
          <span className="flex flex-wrap items-baseline gap-1.5"><Confidence c={s.confidence} /><Src>{s.publisher}, {s.date.slice(0, 4)}</Src></span>
          {s.note && <Src>{s.note}</Src>}
        </div>
      ))}
    </div>
  );
}

function Cant({ reason }: { reason: 'bvi' | 'offScript' }) {
  const c = reason === 'bvi' ? CANT.bvi : CANT.offScript;
  return (
    <Box tone="muted">
      <p className="text-[12.5px] font-semibold leading-[1.4]">{c.lead}</p>
      <p className="text-[12.5px] leading-[1.4]">{c.body}</p>
      {reason === 'bvi' && <SourceLine>{CANT.bvi.checked}</SourceLine>}
    </Box>
  );
}

function ProposalLine({ turn }: { turn: Extract<Turn, { kind: 'proposal' }> }) {
  const { dispatch } = useApp();
  const p = proposalById(turn.id);
  const n = p.changes.length;
  if (turn.status === 'open' && n > 1) {
    return (
      <Box>
        <Lead>{n} Changes to review</Lead>
        <Src>{n} Changes to {versionMeta(p.basedOn).label}. Previewed on the graph until you decide.</Src>
        <Btn kind="primary" sm className="self-start" onClick={() => dispatch({ type: 'review', open: true })}>Review {n} Changes</Btn>
      </Box>
    );
  }
  if (turn.status === 'open') return <Meta>Proposal · 1 Change · review it below</Meta>;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px] text-text-muted">
      {turn.status === 'applied'
        ? <><Tag tone="info">Applied</Tag>{turn.applied} of {n} Change{n > 1 ? 's' : ''}</>
        : <><Tag tone="neutral">{turn.status === 'rejected' ? 'Rejected' : 'Set aside'}</Tag>Nothing applied</>}
    </div>
  );
}

export function VersionChip({ label, tone = 'main' }: { label: string; tone?: 'main' | 'branch' | 'source' }) {
  const bg = tone === 'branch' ? 'bg-tag-info' : tone === 'source' ? 'bg-text-muted' : 'bg-primary-active';
  return <span className={`inline-flex items-center self-start rounded-xs px-1.5 py-1 font-mono text-[10.5px] font-semibold leading-none text-white ${bg}`}>{label}</span>;
}

function Saved({ turn }: { turn: Extract<Turn, { kind: 'saved' }> }) {
  const branch = turn.version === 'b1';
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px] text-text-muted">
      <VersionChip label={branch ? 'Branch B started from Version 1' : `${versionMeta(turn.version).label} saved`} tone={branch ? 'branch' : 'main'} />
      <span>Kharon · approved by you · {turn.applied} of {turn.of} Change{turn.of > 1 ? 's' : ''}</span>
    </div>
  );
}

const STAGES = ['Outline', 'Draft', 'Self-check', 'Draft Insight'];
const STAGE_INDEX = { outline: 0, draft: 1, check: 2, ready: 3, published: 4 } as const;

function Generate() {
  const { state, dispatch } = useApp();
  const g = state.gen; if (!g) return null;
  const k = STAGE_INDEX[g.stage];
  const text = (id: string) => draftInsight.outline!.find((o) => o.id === id)!.text;
  return (
    <Box>
      <div className="mb-1 mt-0.5 flex gap-0.5">
        {STAGES.map((l, i) => (
          <span key={l} className={`flex-1 border-t-[3px] pt-1 font-mono text-[9.5px] font-medium ${i < k ? 'border-primary text-primary-active' : i === k ? 'border-primary text-text' : 'border-content-border text-text-soft'}`}>{l}</span>
        ))}
      </div>
      {k === 0 && (
        <>
          <Src>Shape the outline before I write. Move a point up to lead with it.</Src>
          <ol className="flex flex-col gap-1">
            {g.outline.map((id, i) => (
              <li key={id} className="flex items-center gap-1.5 rounded border border-content-border bg-white px-1.5 py-[5px] text-[12.5px]">
                <i className="pi pi-bars !text-[11px] text-form-border" aria-hidden />
                <span className="min-w-0 flex-1 leading-[1.3]">{text(id)}</span>
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => dispatch({ type: 'outlineUp', index: i })} className="flex size-[22px] shrink-0 items-center justify-center rounded text-text-muted hover:bg-surface-100 disabled:invisible">
                  <i className="pi pi-arrow-up !text-[11px]" aria-hidden />
                </button>
              </li>
            ))}
          </ol>
          <Btn kind="primary" sm className="self-start" onClick={() => dispatch({ type: 'writeDraft' })}>Write the draft</Btn>
        </>
      )}
      {k === 1 && (
        <div className="flex gap-2 text-[12.5px]">
          <span className="mt-px size-3.5 shrink-0 animate-spin rounded-full border-[1.5px] border-focus-fill border-t-primary" />
          <div>Writing headline, dek and 3 sections<div className="mt-0.5 font-mono text-[10.5px] text-text-soft">The draft fills in on the right</div></div>
        </div>
      )}
      {(k === 2 || k === 3) && <SelfCheckList done={k === 3 ? SELF_CHECKS.length : g.checks} />}
      {k === 3 && <Note>Draft Insight ready on the right.</Note>}
      {k === 4 && <Src>Published to Main Feed</Src>}
    </Box>
  );
}

export function SelfCheckList({ done }: { done: number }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {SELF_CHECKS.map((c, i) => {
        const pending = i >= done;
        return (
          <li key={c.text} className={`flex items-start gap-1.5 text-[12px] leading-[1.35] ${pending ? 'text-text-soft' : ''}`}>
            <i className={`pi ${c.ok ? 'pi-check' : 'pi-exclamation-triangle'} mt-px !text-[12px] ${pending ? 'text-form-border' : c.ok ? 'text-primary' : 'text-tag-warn'}`} aria-hidden />
            <span>{c.text}<small className="block font-mono text-[10.5px] text-text-soft">{c.detail}</small></span>
          </li>
        );
      })}
    </ul>
  );
}

/** S9: what changed since you last looked, with the short path up to the newly listed Entity. */
function Changed() {
  const { dispatch } = useApp();
  const s9 = story.screens.find((s) => s.id === 'S9')!.kharon!;
  const [lead, ...rest] = s9.answer!.split(/(?<=\.) /);
  return (
    <div className="flex flex-col gap-2">
      <VersionChip label="Version 3 · Source update" tone="source" />
      <Lead>{lead}</Lead>
      <PathView from={UPDATE_PATH.from} hops={UPDATE_PATH.hops} tags={{ [story.update.entityId]: <Tag tone="new">New listing</Tag> }} />
      <Src>{rest.join(' ')}</Src>
      <SourceLine>BIS final rule, "{story.update.rule.title}", effective 30 Oct.</SourceLine>
      <Note>
        This also affects{' '}
        <button type="button" onClick={() => dispatch({ type: 'send', text: 'Open the Insight you published' })} className="font-medium text-primary-active hover:underline">the Insight you published</button>.
      </Note>
    </div>
  );
}

