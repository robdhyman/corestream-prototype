// Small pieces the Kharon column shares: confidence labels, Entity links, notes and buttons.

import { useEffect, useRef, type ReactNode } from 'react';
import type { Confidence as Level } from '../data/types';
import { CONFIDENCE_LABEL, sentence, shortName } from '../data/story';
import { useApp } from '../state/store';

const CONF_CLS: Record<Level, string> = {
  high: 'bg-focus-fill text-primary-active',
  medium: 'bg-surface-100 text-text-muted',
  low: 'bg-tag-warn-bg text-tag-warn',
};

/** Confirmed / Reported / Unconfirmed, words only (Rob, 2026-11-02). */
export function Confidence({ c }: { c: Level }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-xs px-[5px] py-[3px] font-mono text-[10px] font-medium leading-none ${CONF_CLS[c]}`}>{CONFIDENCE_LABEL[c]}</span>;
}

/** Clicking an Entity's name selects it on the graph and opens its Record Details, ghosts included. Hovering or
 *  focusing it lights its node on the graph (ticket 18); a name that unmounts mid-hover lets go. */
export function EntityLink({ id }: { id: string }) {
  const { dispatch } = useApp();
  const peeking = useRef(false);
  const peek = (on: boolean) => { peeking.current = on; dispatch({ type: 'peek', id: on ? id : null }); };
  useEffect(() => () => { if (peeking.current) dispatch({ type: 'peek', id: null }); }, [dispatch]);
  return (
    <button
      type="button"
      onClick={() => dispatch({ type: 'selectEntity', id })}
      onPointerEnter={() => peek(true)}
      onPointerLeave={() => peek(false)}
      onFocus={() => peek(true)}
      onBlur={() => peek(false)}
      className="border-b border-dotted border-primary text-left font-medium text-primary-active hover:bg-focus-fill"
    >
      {shortName(id)}
    </button>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-1.5 text-[12px] leading-[1.4] text-text-muted">
      <i className="pi pi-info-circle mt-px !text-[13px] text-text-soft" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

/** A Link, as Kharon names it: the link glyph and the phrase in body ink, so it never reads as an Entity or a source. */
export function LinkPhrase({ children }: { children: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 text-[12px] font-medium leading-[1.35] text-text">
      <i className="pi pi-link relative top-px !text-[10px] text-text-soft" aria-hidden />
      {sentence(children)}
    </span>
  );
}

/** A source behind a hop: the document glyph and the citation in muted ink. */
export function SourceLine({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-baseline gap-1 text-[11.5px] leading-[1.35] text-text-muted">
      <i className="pi pi-file relative top-px !text-[10px] text-text-soft" aria-hidden />
      <span>{children}</span>
    </span>
  );
}

export function Src({ children }: { children: ReactNode }) {
  return <span className="text-[11.5px] leading-[1.35] text-text-muted">{children}</span>;
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="text-pretty text-[14px] font-medium leading-[1.4] text-text">{children}</p>;
}

export function Box({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'muted' | 'warn' }) {
  const cls = tone === 'warn' ? 'border-[#fdba74] bg-[#fffaf5]' : tone === 'muted' ? 'border-content-border bg-surface-50' : 'border-content-border';
  return <div className={`flex flex-col gap-2 rounded-md border p-2.5 ${cls}`}>{children}</div>;
}

type BtnKind = 'primary' | 'plain' | 'ghost' | 'on' | 'onx';
const BTN: Record<BtnKind, string> = {
  primary: 'border-primary bg-primary text-white hover:bg-primary-hover disabled:cursor-default disabled:opacity-60',
  plain: 'border-form-border bg-white text-text hover:bg-surface-50',
  ghost: 'border-transparent px-1.5 text-primary-active hover:bg-focus-fill',
  on: 'border-primary bg-primary text-white',
  onx: 'border-text-muted bg-text-muted text-white',
};

export function Btn({ kind = 'plain', sm, children, ...rest }: { kind?: BtnKind; sm?: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...rest} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border font-medium leading-4 ${sm ? 'px-2 py-[3px] text-[12px]' : 'px-2.5 py-1.5 text-[12.5px]'} ${BTN[kind]} ${rest.className ?? ''}`}>
      {children}
    </button>
  );
}

/** Mono meta line in sentence case ("2 steps · done", tray subtitles). */
export function Meta({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[10.5px] text-text-soft">{children}</span>;
}
