// Right panel (Figma Panel / Insight 117:5670, 432 wide): Panel/Tabs Insight | Record Details | History.
// Insight copy and type come from 117:5670. Record Details follows figma-system.md's description
// (entity tile, name, ID chip, Details | Related Insights, accordions General / Listings / Notes / Record;
// a Link shows A → label → B). That frame wasn't read in Figma yet, so treat it as a first pass.
// Ticket 09 adds the Version row, the Draft Insight (S7), History as a tab (ticket 02) and the Update's
// Listings row and Related Insights (S9).

import { useState, type ReactNode } from 'react';
import { caseData, entityById, linkById } from '../data/case';
import type { Entity, Link } from '../data/types';
import {
  acceptedCount, dayMonthYear, draftInsight, proposalById, sentence, stamp, story, suryInsight, tagLabel, versionMeta, type VersionId,
} from '../data/story';
import { linkLabel } from '../graph/geometry';
import { hashId } from '../graph/layout';
import { useApp, type PanelTab } from '../state/store';
import { inVersion } from '../state/graphView';
import { OUTLINE_PARA, sourceLine } from '../kharon/script';
import { Confidence } from '../kharon/atoms';
import { SelfCheckList, VersionChip } from '../kharon/Thread';
import domain from '../assets/figma/domain.svg';
import person from '../assets/figma/person.svg';
import anchor from '../assets/figma/anchor.svg';
import description from '../assets/figma/description.svg';
import accountBalance from '../assets/figma/account-balance.svg';

const GLYPH = { domain, person, anchor, description, account_balance: accountBalance } as const;

export function Panel() {
  const { state, dispatch } = useApp();
  const tabs: [PanelTab, string][] = [['insight', 'Insight'], ['record', 'Record details'], ['history', 'History']];
  return (
    <aside className="flex w-[432px] shrink-0 flex-col border-l border-content-border bg-white">
      <div role="tablist" className="flex shrink-0 border-b border-content-border">
        {tabs.map(([id, label]) => {
          const on = state.panelTab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={on}
              onClick={() => dispatch({ type: 'setTab', tab: id })}
              className="relative flex flex-1 flex-col items-center"
            >
              <span className={`px-[18px] py-4 text-[14px] font-semibold leading-[1.5] ${on ? 'text-primary-active' : 'text-text-muted'}`}>{label}</span>
              {on && <span className="absolute inset-x-0 -bottom-px h-px bg-primary" />}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {state.panelTab === 'insight' ? <InsightTab /> : state.panelTab === 'record' ? <RecordDetails /> : <History />}
      </div>
    </aside>
  );
}

// ---------- Insight ----------

function InsightTab() {
  const { state } = useApp();
  if (state.insightShown === 'draft') return <DraftInsight />;
  if (state.insightShown === 'published') return <PublishedInsight />;
  return <InsightView />;
}

const CHIP: Record<VersionId, { tone: 'main' | 'branch' | 'source'; by: string }> = {
  v1: { tone: 'main', by: 'Published · 28 Oct' },
  v2: { tone: 'main', by: 'Kharon · approved by you' },
  b1: { tone: 'branch', by: 'From Version 1 · timeline' },
  v3: { tone: 'source', by: 'Source update · 30 Oct' },
  v4: { tone: 'main', by: 'Kharon · approved by you' },
};

function VersionRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4">
      {children}
    </div>
  );
}

function InsightView() {
  const { state } = useApp();
  const ins = caseData.insights.find((i) => i.id === 'ins-sury') ?? caseData.insights[0];
  const v = state.viewing;
  return (
    <article className="flex flex-col gap-5 pb-8 pt-4">
      <VersionRow>
        <VersionChip label={versionMeta(v).label} tone={CHIP[v].tone} />
        <span className="text-[12px] text-text-muted">{CHIP[v].by}</span>
      </VersionRow>
      <header className="flex flex-col gap-3 px-4 pb-3">
        <h1 className="text-h1 font-medium text-text">{ins.title}</h1>
        <p className="text-dek text-text">{ins.dek}</p>
      </header>
      <MetaRow time={state.day === 3 ? '2d ago' : ins.time} place={ins.place} />
      {(v === 'v3' || v === 'v4') && (
        <Callout title="Source update">XPU added to the US Entity List on 30 Oct. It settled the trust that holds 45% of Tarnwell. The text below was written for Version 1.</Callout>
      )}
      <div className="px-4 pb-3.5 text-body text-text">
        {ins.body.map((p, i) => <p key={i} className="mb-2 last:mb-0">{p}</p>)}
      </div>
    </article>
  );
}

function MetaRow({ time, place }: { time: string; place: string }) {
  return (
    <div className="flex items-center justify-between border-y border-divider px-4 py-3">
      <div className="flex items-center gap-1.5 text-[12px] font-medium leading-[1.5] tracking-[0.02em] text-text-muted">
        <span>{time}</span><span>|</span><span>{place}</span>
      </div>
      <div className="flex gap-2 text-button-text">
        <SmallIconButton icon="pi-share-alt" label="Share" />
        <SmallIconButton icon="pi-bookmark" label="Bookmark" />
      </div>
    </div>
  );
}

function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-4 flex flex-col gap-2 rounded-md border border-content-border bg-highlight px-3 py-2.5">
      <h6 className="font-mono text-[10.5px] font-medium text-text-muted">{title}</h6>
      <div className="text-[12px] leading-[1.4] text-text-muted">{children}</div>
    </div>
  );
}

function Skeleton({ w = '100%', h = 12 }: { w?: string; h?: number }) {
  return <div className="animate-pulse rounded-[3px] bg-surface-100" style={{ width: w, height: h }} />;
}

/** S7: the Draft Insight fills in as Kharon writes: skeleton, draft, self-check, then Publish. */
function DraftInsight() {
  const { state, dispatch } = useApp();
  const g = state.gen; if (!g) return null;
  const head = (
    <VersionRow>
      <span className="rounded-xs border border-[#7dd3fc] bg-tag-info-bg px-1.5 py-[3px] font-mono text-tag font-medium text-tag-info">Draft</span>
      <span className="text-[12px] text-text-muted">Kharon · from Version 2 · not published</span>
    </VersionRow>
  );
  if (g.stage === 'outline') {
    return (
      <article className="flex flex-col gap-4 pb-8 pt-4">
        {head}
        <Callout title="Waiting for the outline">The draft fills in here once you approve the outline in Kharon.</Callout>
        <div className="flex flex-col gap-3 px-4"><Skeleton w="90%" h={30} /><Skeleton w="70%" h={30} /><Skeleton /><Skeleton w="80%" /></div>
      </article>
    );
  }
  return (
    <article className="flex flex-col gap-5 pb-8 pt-4">
      {head}
      <header className="flex flex-col gap-3 px-4">
        <h1 className="text-[34px] font-medium leading-[1.12] tracking-[-0.01em] text-text">{draftInsight.title}</h1>
        {g.stage === 'draft'
          ? <div className="flex flex-col gap-2"><Skeleton /><Skeleton w="85%" /><Skeleton w="60%" /></div>
          : <p className="text-dek text-text">{draftInsight.dek}</p>}
      </header>
      {g.stage === 'check' && <Callout title="Self-check running">{g.checks} of 4 checks</Callout>}
      {g.stage === 'ready' && (
        <>
          <Callout title="Self-check"><SelfCheckList done={4} /></Callout>
          <div className="flex items-center gap-2 px-4">
            <button type="button" onClick={() => dispatch({ type: 'publish' })} className="rounded-md border border-primary bg-primary px-3 py-1.5 text-[13px] font-medium text-white hover:bg-primary-hover">Publish</button>
            <button type="button" className="rounded-md border border-form-border bg-white px-3 py-1.5 text-[13px] font-medium hover:bg-surface-50">Edit draft</button>
            <span className="text-[11.5px] text-text-muted">Goes to the top of the Main Feed</span>
          </div>
        </>
      )}
      {g.stage !== 'draft' && <DraftBody outline={g.outline} />}
    </article>
  );
}

function DraftBody({ outline }: { outline: string[] }) {
  const paras = [...outline.map((o) => draftInsight.paras[OUTLINE_PARA[o]]), draftInsight.paras[draftInsight.paras.length - 1]];
  return (
    <>
      <MetaRow time="Draft" place={draftInsight.place} />
      <div className="px-4 pb-3.5 text-body text-text">{paras.map((p, i) => <p key={i} className="mb-2 last:mb-0">{p}</p>)}</div>
    </>
  );
}

function PublishedInsight() {
  const { state } = useApp();
  return (
    <article className="flex flex-col gap-5 pb-8 pt-4">
      <VersionRow>
        <span className="rounded-xs border border-[#fca5a5] bg-tag-danger-bg px-1.5 py-[3px] font-mono text-tag font-medium text-tag-danger">{draftInsight.tag}</span>
        <span className="text-[12px] text-text-muted">Published · from Version 2 · Kharon · approved by you</span>
      </VersionRow>
      <header className="flex flex-col gap-3 px-4">
        <h1 className="text-[34px] font-medium leading-[1.12] tracking-[-0.01em] text-text">{draftInsight.title}</h1>
        <p className="text-dek text-text">{draftInsight.dek}</p>
      </header>
      {state.day === 3 && <Callout title="Source update">XPU added to the US Entity List on 30 Oct. This Insight names XPU as Larchmere's settlor.</Callout>}
      <DraftBody outline={state.gen?.outline ?? ['o3', 'o1', 'o2']} />
    </article>
  );
}

function SmallIconButton({ icon, label }: { icon: string; label: string }) {
  return (
    <button type="button" aria-label={label} className="flex h-[25.5px] w-[27.5px] items-center justify-center rounded-md hover:bg-surface-50">
      <i className={`pi ${icon} !text-[12.25px]`} aria-hidden />
    </button>
  );
}

// ---------- History ----------

function historyRow(v: VersionId, appliedP1?: Record<string, boolean>) {
  const meta = versionMeta(v);
  switch (v) {
    case 'v1': return { by: 'Published', sub: suryInsight.author };
    case 'v2': return { by: 'Kharon · approved by you', sub: `${appliedP1 ? acceptedCount(appliedP1) : 3} of ${proposalById('P1').changes.length} Changes` };
    case 'b1': return { by: 'Kharon · approved by you', sub: 'From Version 1 · timeline Arrangement' };
    case 'v3': return { by: 'Source update', sub: 'XPU added to the US Entity List' };
    case 'v4': return { by: 'Kharon · approved by you', sub: `${meta.changesApplied?.length ?? 1} of 1 Change · XPU marked high risk` };
  }
}

/** History (ticket 02): newest first on a vertical line; Branch B nests under Version 1 with an elbow. */
function History() {
  const { state, dispatch } = useApp();
  const main = state.versions.filter((v) => versionMeta(v).line === 'main').reverse();
  const current = state.insightShown === 'version' ? state.viewing : 'v2';
  const rows: VersionId[] = main.flatMap((v) => (v === 'v1' && state.versions.includes('b1') ? ['b1' as const, v] : [v]));
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-2 px-4 pb-1 pt-4">
        <b className="text-[15px] font-semibold">History</b>
        <span className="text-[12px] text-text-muted">{state.versions.length} Version{state.versions.length > 1 ? 's' : ''} · newest first</span>
      </div>
      <ul className="flex flex-col px-3.5 pb-3 pt-1">
        {rows.map((v, i) => {
          const branch = v === 'b1', cur = current === v, r = historyRow(v, state.appliedP1);
          const last = i === rows.length - 1;
          return (
            <li key={v} className={`relative grid grid-cols-[18px_1fr] gap-2 py-1.5 ${branch ? 'ml-[22px]' : ''}`}>
              {!last && !branch && <span className="absolute bottom-[-6px] left-2 top-[22px] w-0.5 bg-content-border" />}
              {branch && <span className="absolute -left-3.5 -top-1 size-3.5 rounded-bl-md border-b-2 border-l-2 border-form-border" />}
              <span className={`relative z-[1] ml-[3px] mt-[3px] size-3 rounded-full border-2 ${branch ? 'border-tag-info' : 'border-primary-active'} ${cur ? (branch ? 'bg-tag-info' : 'bg-primary-active') : 'bg-white'}`} />
              <button type="button" onClick={() => dispatch({ type: 'openVersion', version: v })} className="-mx-1.5 -my-1 flex w-full flex-col gap-0.5 rounded-md px-1.5 py-1 text-left hover:bg-highlight">
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                  {versionMeta(v).label}
                  {cur && <span className="rounded-xs border border-form-border bg-surface-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-text-muted">Viewing</span>}
                </span>
                <span className="text-[12px] text-text-muted">{r.by} · {r.sub}</span>
                <span className="font-mono text-[10.5px] text-text-soft">{stamp(versionMeta(v).createdAt)}</span>
                {v === 'v2' && state.appliedP1 && (
                  <ul className="mt-1 flex flex-col gap-0.5 pl-3.5 text-[11.5px] text-text-muted">
                    {proposalById('P1').changes.map((c) => <li key={c.id} className={state.appliedP1![c.id] ? '' : 'text-text-soft line-through'}>{c.label}</li>)}
                  </ul>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------- Record Details ----------

function RecordDetails() {
  const { state } = useApp();
  if (state.selectedLink) return <LinkDetails link={linkById.get(state.selectedLink)!} />;
  const e = entityById.get(state.selectedEntity ?? '') ?? caseData.entities.find((x) => x.isSubject)!;
  return <EntityDetails key={e.id} entity={e} />;
}

function EntityTile({ e, size = 40 }: { e: Entity; size?: number }) {
  const bg = e.tier === 'risk' ? 'bg-risk' : e.tier === 'event' ? 'bg-event' : 'bg-entity';
  return (
    <span className={`flex shrink-0 items-center justify-center ${bg} ${e.isSubject ? 'rounded-sm' : 'rounded-full'}`} style={{ width: size, height: size }}>
      <img src={GLYPH[e.glyph]} alt="" width={size * 0.45} height={size * 0.45} />
    </span>
  );
}

const recordId = (id: string) => `KH-${String(10000 + (hashId(id) % 90000))}`;

function EntityDetails({ entity: base }: { entity: Entity }) {
  const { state, view } = useApp();
  const [sub, setSub] = useState<'details' | 'related'>('details');
  const e = view.entities.find((x) => x.id === base.id) ?? base; // this Version's tier and badges
  const content = view.content;
  const found = !inVersion(view, e.id);
  const added = content.listed.get(e.id);
  // S9: after the Update, XPU sits in both Insights you've read ("Because: in 2 of your records").
  const related = state.updateOpened && e.id === story.update.entityId ? [suryInsight, draftInsight] : [suryInsight];
  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-3 px-4 pb-4 pt-5">
        <EntityTile e={e} />
        <div className="min-w-0">
          <h2 className="text-entity-name font-medium text-text">{e.name}</h2>
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-xs bg-surface-100 px-1.5 py-0.5 font-mono text-[11px] text-text-muted">
            {recordId(e.id)}<i className="pi pi-copy !text-[11px]" aria-hidden />
          </span>
        </div>
      </div>
      <div className="flex gap-1 border-b border-content-border px-4">
        {(['details', 'related'] as const).map((t) => (
          <button key={t} onClick={() => setSub(t)} className={`-mb-px border-b px-2 py-2 text-[13px] font-semibold ${sub === t ? 'border-primary text-primary-active' : 'border-transparent text-text-muted'}`}>
            {t === 'details' ? 'Details' : `Related Insights · ${related.length}`}
          </button>
        ))}
      </div>
      {found && <p className="px-4 pt-3 text-[12px] text-primary-active">Found by Kharon · not yet in this Insight</p>}
      {sub === 'details' ? (
        <>
          <Accordion title="General" open>
            <Row k="Type" v={sentence(e.kind)} />
            <Row k="Jurisdiction" v={e.jurisdiction} />
            <Row k="Location" v={e.place} />
            {e.flag && <Row k="Flag" v={e.flag} />}
            {content.riskHigh.has(e.id) && <Row k="Risk" v={`High · ${versionMeta(state.viewing).label}`} />}
          </Accordion>
          <Accordion title="Listings" open>
            {added || e.listings?.length ? (
              <table className="w-full border-collapse text-table">
                <thead><tr className="text-left font-mono text-[10px] text-text-soft"><th className="border-b border-content-border py-1 font-medium">List</th><th className="border-b border-content-border py-1 font-medium">Since</th><th className="border-b border-content-border py-1 font-medium">Source</th></tr></thead>
                <tbody>
                  {added && (
                    <tr className="bg-[#fff5f5]">
                      <td className="border-b border-surface-100 py-1.5">{added.name} <span className="ml-1 rounded-xs bg-tag-danger px-1 py-0.5 font-mono text-[9.5px] font-semibold text-white">New</span></td>
                      <td className="border-b border-surface-100 py-1.5">{dayMonthYear(added.listingDate)}</td>
                      <td className="border-b border-surface-100 py-1.5">BIS</td>
                    </tr>
                  )}
                  {e.listings?.map((l) => (
                    <tr key={l.name}><td className="border-b border-surface-100 py-1.5">{l.name}</td><td className="border-b border-surface-100 py-1.5">{dayMonthYear(l.listingDate)}</td><td className="border-b border-surface-100 py-1.5">{l.name.startsWith('OFAC') ? 'US Treasury' : 'BIS'}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <Row k="Listings" v="None on file" />}
          </Accordion>
          <Accordion title="Notes"><p className="text-table text-text">{e.note ?? 'None on file'}</p></Accordion>
          <Accordion title="Record"><Row k="Record ID" v={recordId(e.id)} /><Row k="Source" v="Synthetic case data" /></Accordion>
        </>
      ) : (
        <div className="flex flex-col gap-2 p-4">
          {related.length > 1 && <p className="text-[12px] text-text-muted">Because: in 2 of your records</p>}
          {related.map((i) => (
            <div key={i.id} className="flex flex-col gap-1.5 rounded-md border border-content-border p-3">
              <span className={`self-start rounded-xs border px-1.5 py-[3px] font-mono text-tag font-medium ${i.sev === 'danger' ? 'border-[#fca5a5] bg-tag-danger-bg text-tag-danger' : 'border-[#fdba74] bg-tag-warn-bg text-tag-warn'}`}>{tagLabel(i.tag)}</span>
              <span className="text-card-title font-medium text-feed-ink">{i.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LinkDetails({ link: l }: { link: Link }) {
  const a = entityById.get(l.source)!, b = entityById.get(l.target)!;
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-4 pb-4 pt-5">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"><EntityTile e={a} size={32} /><span className="font-mono text-[11px] font-semibold text-graph-text">{a.name}</span></div>
        <div className="flex shrink-0 flex-col items-center gap-1 text-link-hl">
          <span className="font-mono text-[11px] font-medium">{linkLabel(l)}</span>
          <i className="pi pi-arrow-right" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"><EntityTile e={b} size={32} /><span className="font-mono text-[11px] font-semibold text-graph-text">{b.name}</span></div>
      </div>
      <Accordion title="General" open>
        <Row k="Kind" v={sentence(l.kind)} />
        <Row k="Detail" v={l.detail} />
        {l.pct != null && <Row k="Ownership" v={`${l.pct}%`} />}
        <Row k="Status" v={l.former ? 'Former' : 'Active'} />
        {l.startDate && <Row k="Since" v={dayMonthYear(l.startDate)} />}
        {l.endDate && <Row k="Ended" v={dayMonthYear(l.endDate)} />}
      </Accordion>
      {l.sources && (
        <Accordion title="Sources" open>
          {l.confidence && <div className="grid grid-cols-[120px_1fr] gap-3 text-table"><span className="text-text-muted">Confidence</span><span><Confidence c={l.confidence} /></span></div>}
          {l.sources.map((s) => (
            <div key={s.title} className="flex flex-col gap-1 border-t border-surface-100 pt-1.5 text-table">
              <span>{sourceLine(s)}</span>
              <span><Confidence c={s.confidence} /></span>
              {s.note && <span className="text-[11.5px] text-text-muted">{s.note}</span>}
            </div>
          ))}
        </Accordion>
      )}
      <Accordion title="Record"><Row k="Link ID" v={l.id} /><Row k="Source" v="Synthetic case data" /></Accordion>
    </div>
  );
}

function Accordion({ title, open: initial = false, children }: { title: string; open?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(initial);
  return (
    <section className="border-b border-divider">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-[14px] font-semibold text-text">
        {title}<i className={`pi ${open ? 'pi-chevron-up' : 'pi-chevron-down'} !text-[12px] text-text-muted`} aria-hidden />
      </button>
      {open && <div className="flex flex-col gap-1.5 px-4 pb-4">{children}</div>}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 text-table">
      <span className="text-text-muted">{k}</span><span className="text-text">{v}</span>
    </div>
  );
}

