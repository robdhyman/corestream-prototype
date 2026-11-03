// Drawing geometry for Entities and Links (from R3's renderGraph, retuned to the Figma Node and Arrowhead components).

import type { Entity, Link, Point } from '../data/types';

export const NODE_SIZE = 40;          // Entity circle and Subject square, 117:5653
export const LABEL_GAP = 7;           // Node label sits 7 px below the node
export const LABEL_LINE = 13.75;      // Plex Mono 11 at 125%
export const LABEL_MAX_CHARS = 21;    // matches Figma's breaks in the 152 px label box

/** Distance from the node centre to where a Link stops (Figma trims under the node; arrows stop clear of it). */
export function trimFor(e: Entity, arrow: boolean): number {
  if (!arrow) return 22;
  return e.isSubject ? 30 : 23;
}

export function linkGeometry(a: Point, b: Point, trimA: number, trimB: number) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  const x1 = a.x + ux * trimA, y1 = a.y + uy * trimA, x2 = b.x - ux * trimB, y2 = b.y - uy * trimB;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle > 90) angle -= 180; else if (angle < -90) angle += 180; // keep labels upright
  if (angle === 90) angle = -90; // vertical labels read bottom-to-top (Edge label: −90…90°)
  return { x1, y1, x2, y2, ux, uy, angle, mid: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 } };
}

/** Open chevron M1 1L9 5L1 9 (10.5 px), tip on the Link end, pointing along it. */
export function arrowPath(x2: number, y2: number, ux: number, uy: number): string {
  const back = 8.4, half = 4.2, nx = -uy, ny = ux;
  const p = (s: number, t: number) => `${(x2 - ux * s + nx * t).toFixed(1)} ${(y2 - uy * s + ny * t).toFixed(1)}`;
  return `M${p(back, -half)}L${x2.toFixed(1)} ${y2.toFixed(1)}L${p(back, half)}`;
}

const TITLE: Record<Link['kind'], string> = {
  ownership: 'Ownership', control: 'Control', finance: 'Finance', supply: 'Supply', logistics: 'Logistics',
  contract: 'Contract', regulatory: 'Regulatory', affiliation: 'Affiliation', research: 'Research',
};

/** Link label as Figma writes it: "Ownership · 62%", "Frmr Supply". */
export function linkLabel(l: Link): string {
  const kind = TITLE[l.kind];
  if (l.former) return `Frmr ${kind}`;
  return l.pct != null ? `${kind} · ${l.pct}%` : kind;
}

/** Greedy wrap at 21 characters, breaking after hyphens too (Figma: "Supply agreement GEM-" / "2024-117"). */
export function wrapLabel(e: Entity): string[] {
  if (e.labelLines) return e.labelLines;
  const tokens = e.name.split(' ').flatMap((w, i) => {
    const parts = w.split(/(?<=-)/);
    return parts.map((p, j) => ({ text: p, space: i > 0 && j === 0 }));
  });
  const lines: string[] = []; let cur = '';
  for (const t of tokens) {
    const next = cur + (cur && t.space ? ' ' : '') + t.text;
    if (cur && next.length > LABEL_MAX_CHARS) { lines.push(cur); cur = t.text; } else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length > 3) { lines.length = 3; lines[2] = lines[2].slice(0, LABEL_MAX_CHARS - 1) + '…'; }
  return lines;
}
