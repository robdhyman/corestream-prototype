// Kharon in the left column (ticket 02, variant D). The `k` button or Ask Kharon collapses the Feed to a rail and
// opens this 264 column: header, the working strip with Stop, the thread, then the tray, suggested prompts and
// the composer. A Proposal with 2+ Changes takes the whole column for review.

import { useLayoutEffect, useRef, useState } from 'react';
import { linkById } from '../data/case';
import { proposalById, shortName, fullName, versionMeta } from '../data/story';
import { useApp } from '../state/store';
import { Btn, Note } from './atoms';
// The head's mark (Figma hf/Kharon head 2246:13290, Rob 11:03): the charcoal ferryman with mist waves, not the orange badge.
import kHead from './mascot/k-head-charcoal.svg';
import { Bars, TurnView } from './Thread';
import { Review, Tray } from './Review';

export function Kharon() {
  const { state, dispatch } = useApp();
  const multi = state.openProposal && proposalById(state.openProposal).changes.length > 1;
  const single = state.openProposal && !multi ? state.openProposal : null;

  return (
    <section className="flex w-[264px] shrink-0 flex-col border-r border-content-border bg-white" aria-label="Kharon">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-content-border pl-3 pr-1.5">
        <img src={kHead} alt="" aria-hidden width={28} height={28} className="block shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium leading-[1.1]">Kharon Intelligence</div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.03em] text-text-soft">{state.run ? 'Working' : 'Suryadeep Insight'}</div>
        </div>
        <button type="button" aria-label="Close Kharon" onClick={() => dispatch({ type: 'toggleKharon' })} className="flex size-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-100">
          <i className="pi pi-times !text-[13px]" aria-hidden />
        </button>
      </div>
      {multi && state.reviewOpen ? <Review id={state.openProposal!} /> : (
        <>
          <ThreadBody />
          <div className="flex shrink-0 flex-col gap-2 border-t border-content-border bg-white p-2">
            {single && <Tray id={single} />}
            {state.prompts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {state.prompts.map((p) => (
                  <button key={p} type="button" onClick={() => dispatch({ type: 'send', text: p })} className="rounded-[14px] border border-primary bg-white px-2.5 py-1 text-left text-[12px] leading-4 text-primary-active hover:bg-focus-fill">{p}</button>
                ))}
              </div>
            )}
            <Composer />
          </div>
        </>
      )}
    </section>
  );
}

function ThreadBody() {
  const { state, dispatch } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const spacer = useRef<HTMLDivElement>(null);
  const r = state.run;

  // The latest question pins to the top of the scroll and the answer reads down from it. A spacer below the
  // thread makes room when the answer is still shorter than the column. With no question (S9), start at the top.
  useLayoutEffect(() => {
    const el = ref.current, sp = spacer.current; if (!el || !sp) return;
    const qs = el.querySelectorAll<HTMLElement>('[data-question]');
    const q = qs[qs.length - 1];
    if (!q) { sp.style.height = '0px'; el.scrollTop = 0; return; }
    const offset = r ? 88 : 12;
    sp.style.height = '0px';
    const below = el.scrollHeight - (q.offsetTop - el.offsetTop);
    sp.style.height = `${Math.max(0, el.clientHeight - below - offset)}px`;
    el.scrollTop = q.offsetTop - el.offsetTop - offset;
  }, [state.turns, r?.done, r]);

  const step = r ? r.steps[Math.min(r.done, r.steps.length - 1)] : null;
  return (
    <div ref={ref} className="relative flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-3 pb-4 pt-3.5">
      {r && step && (
        <div className="sticky -top-3.5 z-10 -mx-3 -mt-3.5 flex flex-col gap-1.5 border-b border-content-border bg-highlight px-3 py-2.5">
          <div className="flex items-center gap-2 text-[12px] font-medium">
            <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-focus-fill border-t-primary" />
            <span className="min-w-0 flex-1">{step.title}</span>
            <Btn sm onClick={() => dispatch({ type: 'stop' })}><i className="pi pi-stop !text-[11px]" aria-hidden />Stop</Btn>
          </div>
          <Bars total={r.steps.length} done={r.done} now={r.done} />
          <span className="font-mono text-[10.5px] text-text-soft">Step {Math.min(r.done + 1, r.steps.length)} of {r.steps.length} · {step.detail}</span>
        </div>
      )}
      {state.turns.length
        ? state.turns.map((t, i) => <TurnView key={i} turn={t} index={i} />)
        : <Note>Kharon answers from this Insight's sources and proposes Changes you accept or reject. Nothing changes until you do.</Note>}
      <div ref={spacer} aria-hidden className="-mt-3.5 shrink-0" />
    </div>
  );
}

function Composer() {
  const { state, dispatch } = useApp();
  const [text, setText] = useState('');
  const send = () => { if (text.trim()) dispatch({ type: 'send', text }); setText(''); };
  const focus = state.focus
    ? state.focus.kind === 'entity' ? (fullName(state.focus.id).length <= 26 ? fullName(state.focus.id) : shortName(state.focus.id)) : (() => { const l = linkById.get(state.focus.id)!; return `${shortName(l.source)} → ${shortName(l.target)}`; })()
    : null;
  const version = state.insightShown === 'version' ? versionMeta(state.viewing).label : 'Version 2';
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); send(); }}
      className="flex flex-col gap-1 rounded-md border border-form-border bg-white px-2 py-1.5 focus-within:border-primary"
    >
      <div className="flex flex-wrap gap-1">
        {[focus, `Suryadeep Insight · ${version}`].filter(Boolean).map((c) => (
          <span key={c} className="rounded-xs bg-focus-fill px-[5px] py-1 font-mono text-[10px] font-medium uppercase leading-none tracking-[0.03em] text-primary-active">{c}</span>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        placeholder="Ask about this Insight"
        aria-label="Message for Kharon"
        className="h-9 resize-none bg-transparent p-0 text-[13px] leading-[1.35] text-text outline-none placeholder:text-placeholder"
      />
      <div className="flex items-center gap-1.5">
        <span className="flex-1 font-mono text-[10px] text-text-soft">Scripted · try a prompt above</span>
        <button type="submit" aria-label="Send" className="flex size-[26px] items-center justify-center rounded-md bg-primary text-white hover:bg-primary-hover">
          <i className="pi pi-arrow-right !text-[12px]" aria-hidden />
        </button>
      </div>
    </form>
  );
}
