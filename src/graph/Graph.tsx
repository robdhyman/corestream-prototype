// The Insight graph: R3's hand-built SVG engine (research/r3/graph-engine.js) ported to React.
// One <svg>, a world <g> carrying the pan/zoom transform, the dot grid, Links, then Entities.
// Positions come from the current Arrangement (Figma coordinates) and ease between Arrangements; hover and
// selection behave as in R3. Ticket 02's ghost diff arrives as `marks` (dashed added, faded hidden, dotted orange
// unconfirmed, UPDATED, pulsing progress).

import { memo, useMemo, useState } from 'react';
import type { Arrangement, Entity, EntityMark, GraphMarks, Link, LinkMark, Point } from '../data/types';
import { NODE_SIZE, LABEL_GAP, LABEL_LINE, arrowPath, linkGeometry, linkLabel, trimFor, wrapLabel } from './geometry';
import type { View } from './usePanZoom';
import { useTween } from './useTween';
import domain from '../assets/figma/domain.svg';
import domainSubject from '../assets/figma/domain-subject.svg';
import person from '../assets/figma/person.svg';
import anchor from '../assets/figma/anchor.svg';
import description from '../assets/figma/description.svg';
import accountBalance from '../assets/figma/account-balance.svg';
import gppMaybe from '../assets/figma/gpp-maybe.svg';
import showChart from '../assets/figma/show-chart.svg';
import './graph.css';

const GLYPH = { domain, person, anchor, description, account_balance: accountBalance } as const;
const BADGE = { listed: { icon: gppMaybe, fill: 'var(--color-badge-listed)' }, public: { icon: showChart, fill: 'var(--color-badge-public)' } } as const;
const BADGE_D = 9.846 + 2 * 2.462; // Figma badge: 9.846 icon, 2.462 padding
const NODE_TAG = { changed: 'Updated', unconfirmed: 'Unconfirmed' } as const;
const R = NODE_SIZE / 2;
const NO_MARKS: never[] = [];

export interface GraphProps {
  entities: Entity[];
  links: Link[];
  arrangement: Arrangement;
  view: View;
  /** True while the camera eases to a new frame. */
  easing: boolean;
  selectedEntity: string | null;
  selectedLink: string | null;
  marks: GraphMarks;
  onSelectEntity: (id: string) => void;
  onSelectLink: (id: string) => void;
  onHoverEntity: (id: string | null) => void;
  onHoverLink: (id: string | null) => void;
  /** An Entity hovered outside the graph (a name in Kharon): ringed and its Links lit, as on hover. */
  peek?: string | null;
}

export function Graph(p: GraphProps) {
  const { arrangement, view } = p;
  const [hover, setHover] = useState<string | null>(null);
  const hot = hover ?? p.peek ?? null;
  const { pos, settled } = useTween(arrangement.positions);

  // Only Entities the Arrangement places are drawn; Links need both ends drawn.
  const entities = useMemo(() => p.entities.filter((e) => pos[e.id]), [p.entities, pos]);
  const byId = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);
  const links = useMemo(() => p.links.filter((l) => byId.has(l.source) && byId.has(l.target)), [p.links, byId]);

  // Neighbourhood of the selection, for dimming and highlighting.
  const focus = p.selectedEntity ?? null;
  const selLink = p.selectedLink ? links.find((l) => l.id === p.selectedLink) : undefined;
  const near = useMemo(() => {
    const ents = new Set<string>(), lks = new Set<string>();
    if (focus) {
      ents.add(focus);
      for (const l of links) if (l.source === focus || l.target === focus) { lks.add(l.id); ents.add(l.source); ents.add(l.target); }
    } else if (selLink) { lks.add(selLink.id); ents.add(selLink.source); ents.add(selLink.target); }
    return { ents, lks };
  }, [focus, selLink, links]);
  const focused = !!(focus || selLink) && byId.has(focus ?? selLink?.source ?? '');

  const lod = view.zoom < 0.3 ? 'lo lo2' : view.zoom < 0.45 ? 'lo' : '';
  // Figma's hand-placed Link labels only fit Figma's radial positions at rest.
  const labelAt = settled ? arrangement.labelAt : undefined;

  return (
    <svg className={`g-svg block h-full w-full touch-none select-none ${lod}`} role="img" aria-label="Insight graph">
      <defs>
        {/* Dot grid tile (Figma 51:378): dots at the tile corners and centre, 56 px lattice. */}
        <pattern id="dot-grid" width="56" height="56" patternUnits="userSpaceOnUse">
          {[[0, 0], [56, 0], [0, 56], [56, 56], [28, 28]].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" fill="var(--color-graph-dot)" />
          ))}
        </pattern>
        <NodeShadow id="shadow-entity" tint="var(--color-entity-shadow)" />
        <NodeShadow id="shadow-risk" tint="var(--color-risk-shadow)" />
      </defs>
      <g
        className={`g-world ${focused ? 'focus' : ''} ${p.easing ? 'easing' : ''}`}
        style={{ transform: `translate(${view.pan.x}px, ${view.pan.y}px) scale(${view.zoom})` }}
      >
        <rect x={-20000} y={-20000} width={40000} height={40000} fill="url(#dot-grid)" />
        <g>
          {links.map((l) => (
            <GraphLink
              key={l.id}
              link={l}
              a={pos[l.source]} b={pos[l.target]}
              ea={byId.get(l.source)!} eb={byId.get(l.target)!}
              labelAt={labelAt?.[l.id]}
              marks={p.marks.links[l.id] ?? NO_MARKS}
              cls={[
                l.former && 'former',
                (hot && (l.source === hot || l.target === hot)) || near.lks.has(l.id) ? 'hl' : '',
                p.selectedLink === l.id && 'sel',
                near.lks.has(l.id) && 'near',
              ].filter(Boolean).join(' ')}
              onSelect={p.onSelectLink}
              onHover={p.onHoverLink}
            />
          ))}
        </g>
        <g>
          {entities.map((e) => (
            <GraphNode
              key={e.id}
              entity={e}
              at={pos[e.id]}
              marks={p.marks.entities[e.id] ?? NO_MARKS}
              cls={[
                e.tier,
                p.selectedEntity === e.id && 'sel',
                p.peek === e.id && 'peek',
                selLink && (selLink.source === e.id || selLink.target === e.id) && 'end',
                near.ents.has(e.id) && 'near',
              ].filter(Boolean).join(' ')}
              onSelect={p.onSelectEntity}
              onHover={(id) => { setHover(id); p.onHoverEntity(id); }}
            />
          ))}
        </g>
      </g>
    </svg>
  );
}

/** Node shadow · Entity / · Risk: three tinted drop shadows (0,1,r1 18%), (0,3,r6 14%), (0,10,r18 10%). σ = r/2. */
function NodeShadow({ id, tint }: { id: string; tint: string }) {
  const layers = [[1, 0.5, 0.18], [3, 3, 0.14], [10, 9, 0.1]] as const;
  return (
    <filter id={id} x="-60%" y="-60%" width="220%" height="260%" colorInterpolationFilters="sRGB">
      {layers.map(([dy, sd, op], i) => (
        <g key={i}>
          <feGaussianBlur in="SourceAlpha" stdDeviation={sd} result={`b${i}`} />
          <feOffset in={`b${i}`} dy={dy} result={`o${i}`} />
          <feFlood floodColor={tint} floodOpacity={op} />
          <feComposite in2={`o${i}`} operator="in" result={`s${i}`} />
        </g>
      ))}
      <feMerge>
        <feMergeNode in="s2" /><feMergeNode in="s1" /><feMergeNode in="s0" /><feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}

const markClasses = (marks: readonly (EntityMark | LinkMark)[]) => marks.map((m) => `m-${m}`).join(' ');

const GraphLink = memo(function GraphLink(props: {
  link: Link; a: Point; b: Point; ea: Entity; eb: Entity; labelAt?: Point; cls: string; marks: LinkMark[];
  onSelect: (id: string) => void; onHover: (id: string | null) => void;
}) {
  const { link: l, a, b, ea, eb } = props;
  const arrow = !!l.directed;
  const g = linkGeometry(a, b, trimFor(ea, false), trimFor(eb, arrow));
  const d = `M${g.x1.toFixed(1)} ${g.y1.toFixed(1)}L${g.x2.toFixed(1)} ${g.y2.toFixed(1)}`;
  // Vertical Links (the ownership hierarchy's spine) carry an upright label beside the line, in the gap below
  // the upper Entity's label, so it never runs through a node label.
  const vertical = !props.labelAt && Math.abs(a.x - b.x) < 1;
  const top = a.y < b.y ? a : b, bottom = a.y < b.y ? b : a;
  const at = props.labelAt ?? (vertical ? { x: a.x + 8, y: top.y + (bottom.y - top.y) * 0.7 } : { x: g.mid.x - g.uy * 9, y: g.mid.y + g.ux * 9 });
  return (
    <g
      className={`g-link ${props.cls} ${markClasses(props.marks)}`}
      data-link={l.id}
      data-nopan
      onClick={(ev) => { ev.stopPropagation(); props.onSelect(l.id); }}
      onPointerEnter={() => props.onHover(l.id)}
      onPointerLeave={() => props.onHover(null)}
    >
      <path className="hit" d={d} />
      <path className="line" d={d} />
      {arrow && <path className="arrow" d={arrowPath(g.x2, g.y2, g.ux, g.uy)} />}
      <text className={`label ${vertical ? 'side' : ''}`} transform={`translate(${at.x.toFixed(1)} ${at.y.toFixed(1)}) rotate(${vertical ? 0 : g.angle.toFixed(1)})`}>{linkLabel(l)}</text>
    </g>
  );
});

const GraphNode = memo(function GraphNode(props: {
  entity: Entity; at: Point; cls: string; marks: EntityMark[]; onSelect: (id: string) => void; onHover: (id: string | null) => void;
}) {
  const { entity: e, at, marks } = props;
  const lines = wrapLabel(e);
  const glyph = e.isSubject && e.glyph === 'domain' ? domainSubject : GLYPH[e.glyph];
  const gs = e.isSubject ? 21 : 18;
  const ghost = marks.includes('added') || marks.includes('unconfirmed');
  const shadow = ghost ? undefined : e.tier === 'risk' ? 'url(#shadow-risk)' : 'url(#shadow-entity)';
  const labelTop = e.isSubject ? R + LABEL_GAP + 2.5 : R + LABEL_GAP; // Subject label sits at 49.5 in Figma
  const tag = marks.includes('changed') ? 'changed' : marks.includes('unconfirmed') ? 'unconfirmed' : null;
  return (
    <g
      className={`g-node ${props.cls} ${markClasses(marks)}`}
      data-nopan
      transform={`translate(${at.x} ${at.y})`}
      tabIndex={0}
      role="button"
      aria-label={e.name}
      onClick={(ev) => { ev.stopPropagation(); props.onSelect(e.id); }}
      onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); props.onSelect(e.id); } }}
      onPointerEnter={() => props.onHover(e.id)}
      onPointerLeave={() => props.onHover(null)}
    >
      <g className="mark">
        <g filter={shadow}>
          {e.isSubject
            ? <rect className="body" x={-R + 0.75} y={-R + 0.75} width={NODE_SIZE - 1.5} height={NODE_SIZE - 1.5} rx={3.25} />
            : <circle className="body" r={R - 0.75} />}
        </g>
        {e.isSubject
          ? <rect className="ring" x={-R - 5} y={-R - 5} width={NODE_SIZE + 10} height={NODE_SIZE + 10} rx={7} />
          : <circle className="ring" r={R + 5} />}
        <image className="glyph" href={glyph} x={-gs / 2} y={-gs / 2} width={gs} height={gs} />
        <Badges badges={e.badges} y={e.isSubject ? -16 : -13} />
      </g>
      {tag && (
        // "Updated" sits up and left, clear of a vertical Link's label on the right; "Unconfirmed" sits above.
        <g className={`tag ${tag === 'changed' ? 'upd' : 'unc'}`} transform={tag === 'changed' ? `translate(${-R - 30} ${-R + 2})` : `translate(0 ${-R - 16})`}>
          {tag === 'changed' && <rect x={-31} y={-8} width={62} height={15} rx={2} />}
          <text y={3.5}>{NODE_TAG[tag]}</text>
        </g>
      )}
      <text className="label" y={labelTop + 11}>
        {lines.map((t, i) => <tspan key={i} x={0} dy={i ? LABEL_LINE : 0}>{t}</tspan>)}
      </text>
    </g>
  );
});

/** Badge group centred at (+19, y); two badges overlap by 9 px with Listed on top (Figma 2032:77732). */
function Badges({ badges, y }: { badges: Entity['badges']; y: number }) {
  if (!badges.length) return null;
  const order = badges.includes('public') ? (['public', ...badges.filter((b) => b !== 'public')] as Entity['badges']) : badges;
  const w = order.length * BADGE_D - (order.length - 1) * 9;
  return (
    <g>
      {order.map((b, i) => {
        const cx = 19 - w / 2 + BADGE_D / 2 + i * (BADGE_D - 9);
        return (
          <g key={b} transform={`translate(${cx} ${y})`}>
            <circle r={BADGE_D / 2} fill={BADGE[b].fill} stroke="#fff" strokeWidth={1} />
            <image href={BADGE[b].icon} x={-4.923} y={-4.923} width={9.846} height={9.846} />
          </g>
        );
      })}
    </g>
  );
}
