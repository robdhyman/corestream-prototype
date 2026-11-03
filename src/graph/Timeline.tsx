// The timeline Arrangement (Branch B, S6): one row per Link, a bar from its start date to its end date (or to the
// story's today), and markers where the polysilicon supplier leaves and the Grantham contract starts (ticket 02).
// Laid out by date, so it has no coordinates in the case data; it fits its own viewBox instead of panning.

import { entityById, linkById } from '../data/case';
import type { Link } from '../data/types';
import { shortName } from '../data/story';

const NOW = 2026 + (300 / 365); // 28 Oct 2026, the story clock for S1–S7
const W = 800, LEFT = 262, RIGHT = 40, TOP = 92, ROW = 44;
const year = (iso: string) => +iso.slice(0, 4) + (+iso.slice(5, 7) - 1) / 12 + (+iso.slice(8, 10) - 1) / 365;

/** One row per dated Link, oldest first. */
export const timelineRows = (linkIds: Set<string>): Link[] => [...linkIds].map((id) => linkById.get(id)!).filter((l) => l.startDate)
  .sort((a, b) => a.startDate!.localeCompare(b.startDate!) || a.id.localeCompare(b.id));

export function Timeline({ linkIds, heading, selectedEntity, peek, onSelectEntity }: {
  linkIds: Set<string>; heading: string; selectedEntity: string | null; peek: string | null; onSelectEntity: (id: string) => void;
}) {
  const rows = timelineRows(linkIds);
  const y0 = Math.floor(Math.min(...rows.map((l) => year(l.startDate!))));
  const X = (y: number) => LEFT + ((y - y0) / (NOW + 0.4 - y0)) * (W - LEFT - RIGHT);
  const H = TOP + rows.length * ROW + 44;
  const supplierLeaves = linkById.get('L12')?.endDate, contract = linkById.get('L18')?.startDate;
  const years = Array.from({ length: Math.ceil(NOW) - y0 + 1 }, (_, i) => y0 + i);

  return (
    <svg className="tl-svg block h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Timeline of the Insight's Links">
      <text className="tl-pv" x={16} y={34}>{heading}</text>
      {years.map((y) => (
        <g key={y}>
          <line className="tl-ax" x1={X(y)} y1={TOP - 18} x2={X(y)} y2={H - 28} />
          {y % 2 === 1 ? null : <text className="tl-yr" x={X(y)} y={TOP - 26}>{y}</text>}
        </g>
      ))}
      {supplierLeaves && <Marker x={X(year(supplierLeaves))} top={TOP} bottom={H} label="Supplier leaves · May 2023" anchor="end" />}
      {contract && <Marker x={X(year(contract))} top={TOP} bottom={H} label="Grantham · Mar 2024" anchor="start" />}
      {rows.map((l, i) => <Row key={l.id} l={l} y={TOP + i * ROW + 14} X={X} sel={selectedEntity === l.source} peek={!!peek && (peek === l.source || peek === l.target)} onSelect={onSelectEntity} />)}
    </svg>
  );
}

function Marker({ x, top, bottom, label, anchor }: { x: number; top: number; bottom: number; label: string; anchor: 'start' | 'end' }) {
  return (
    <g>
      <line className="tl-mk" x1={x} y1={top - 14} x2={x} y2={bottom - 28} />
      <text className="tl-mkt" x={anchor === 'end' ? x - 5 : x + 5} y={bottom - 12} textAnchor={anchor}>{label}</text>
    </g>
  );
}

function Row({ l, y, X, sel, peek, onSelect }: { l: Link; y: number; X: (y: number) => number; sel: boolean; peek: boolean; onSelect: (id: string) => void }) {
  const start = year(l.startDate!), end = l.endDate ? year(l.endDate) : NOW;
  const story = l.id === 'L12' || l.id === 'L18' || l.id === 'L19';
  const risky = entityById.get(l.source)?.tier === 'risk';
  return (
    <g className={`tl-row ${story ? 'hl' : ''} ${sel ? 'sel' : ''} ${peek ? 'peek' : ''}`} onClick={() => onSelect(l.source)}>
      <rect className="tl-hit" x={4} y={y - 16} width={W - 8} height={ROW - 4} rx={4} />
      <text className="tl-a" x={14} y={y - 1}>{shortName(l.source)} → {shortName(l.target)}</text>
      <text className="tl-r" x={14} y={y + 13}>{l.detail}</text>
      <line className={`tl-bar k-${l.kind} ${l.former ? 'former' : ''}`} x1={X(start)} y1={y + 4} x2={X(end)} y2={y + 4} />
      <circle className={`tl-dot ${risky ? 'risk' : ''}`} cx={X(start)} cy={y + 4} r={6} />
      {l.endDate && <text className="tl-end" x={X(end) + 9} y={y + 7.5}>Ended {l.endDate.slice(0, 4)}</text>}
    </g>
  );
}
