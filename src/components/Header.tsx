// Header (Figma App/Header 28:387 as used in 117:5653): menu, KHARON | CoreStream, centred search,
// then download, History, bookmark and the bell, then the account avatar. The frame has no bell, and
// Header 3.0 (2214:24837) has no History; the golden flow needs both (S5 History, S8 Update), so both show.
// History switches the panel to its History tab; the bell's badge opens the Update notice (S8).

import logoSvg from '../assets/kharon-logo.svg?raw';
import divider from '../assets/figma/header-divider.svg';
import { draftInsight, story, suryInsight } from '../data/story';
import { useApp } from '../state/store';

function IconButton({ icon, label, on, count, onClick }: { icon: string; label: string; on?: boolean; count?: number; onClick?: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={on} onClick={onClick} className={`relative flex h-[31px] w-[35px] items-center justify-center rounded-md text-white hover:bg-white/10 ${on ? 'bg-white/20' : ''}`}>
      <i className={`pi ${icon}`} aria-hidden />
      {!!count && <span className="absolute -right-0.5 top-0 min-w-4 rounded-full bg-unread px-1 font-mono text-[10px] font-semibold leading-4 text-white">{count}</span>}
    </button>
  );
}

export function Header() {
  const { state, dispatch } = useApp();
  return (
    <header className="relative z-30 flex h-[52px] shrink-0 items-center gap-4 bg-brand pl-1.5 pr-2.5 text-white">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <IconButton icon="pi-bars" label="Menu" />
        <div className="flex items-center gap-1.5">
          <span className="block h-[15px] w-[91.154px] text-white [&>svg]:block [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: logoSvg }} />
          <img src={divider} alt="" width={3.5} height={20} />
          <span className="text-header-title">CoreStream</span>
        </div>
      </div>

      <label className="flex w-[320px] items-center gap-[10.5px] rounded-md border border-input-border bg-white px-[10.5px] py-[7px] shadow-input">
        <i className="pi pi-search text-field-icon" aria-hidden />
        <input
          type="search"
          placeholder="Search by risk or Entity"
          className="min-w-0 flex-1 bg-transparent text-[14px] leading-[17px] text-text outline-none placeholder:text-placeholder"
        />
      </label>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <IconButton icon="pi-download" label="Download" />
          <IconButton icon="pi-history" label="History" on={state.panelTab === 'history'} onClick={() => dispatch({ type: 'setTab', tab: state.panelTab === 'history' ? 'insight' : 'history' })} />
          <IconButton icon="pi-bookmark" label="Bookmarks" />
          <IconButton icon="pi-bell" label="Updates" on={state.noticeOpen} count={state.bell} onClick={() => dispatch({ type: 'toggleNotice' })} />
        </div>
        <button type="button" aria-label="Account" className="flex size-[35px] items-center justify-center rounded-full bg-avatar text-white">
          <i className="pi pi-user" aria-hidden />
        </button>
      </div>

      {state.noticeOpen && <Notice />}
    </header>
  );
}

/** S8: the Update notice, listing both affected Insights. */
function Notice() {
  const { state, dispatch } = useApp();
  const u = story.update;
  return (
    <div className="absolute right-14 top-[50px] w-[340px] rounded-lg border border-content-border bg-white text-text shadow-[0_10px_30px_rgb(0_30_40/0.18)]">
      <h5 className="flex items-center gap-2 px-3.5 pb-2 pt-3 text-[14px] font-medium">
        Updates <small className="font-mono text-[10.5px] text-text-soft">{state.day === 3 && !state.updateOpened ? '1 new' : state.day === 3 ? '1 read' : 'None'}</small>
      </h5>
      {state.day === 3 ? (
        <div className="flex flex-col gap-1.5 border-t border-content-border px-3.5 pb-3 pt-2.5">
          <span className="self-start rounded-xs border border-[#fca5a5] bg-tag-danger-bg px-1.5 py-[3px] font-mono text-[10px] font-medium text-tag-danger">{u.listing.name} · 30 Oct</span>
          <p className="text-[13px] leading-[1.4]">{u.notice}</p>
          <ul className="flex list-disc flex-col gap-0.5 pl-4 text-[12px] text-text-muted">
            <li>{suryInsight.title}</li>
            <li>{draftInsight.title}</li>
          </ul>
          <button type="button" onClick={() => dispatch({ type: 'openUpdate' })} className="mt-1 self-start rounded-md border border-primary bg-primary px-2 py-[3px] text-[12px] font-medium text-white hover:bg-primary-hover">
            Open what changed
          </button>
        </div>
      ) : (
        <p className="border-t border-content-border px-3.5 py-3 text-[12.5px] text-text-muted">Nothing new on the Insights you've read.</p>
      )}
    </div>
  );
}
