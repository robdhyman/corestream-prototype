// Pan and zoom for the graph stage, ported from R3 (research/r3/graph-engine.js: drag, wheel, pinch, zoomAt).
// The view starts at 100% with the Arrangement frame centred in the stage, as in Figma 117:5653.
// Ticket 09 adds camera targets: when the flow changes what matters (Kharon's ghosts, a new Arrangement), the
// camera eases to frame it. The user's own pan or zoom wins until the next target.

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export interface View { zoom: number; pan: { x: number; y: number } }
export interface Bounds { x0: number; y0: number; x1: number; y1: number }
/** `bounds: null` is the home view: 100%, frame centred. */
export interface CameraTarget { key: string; bounds: Bounds | null }

const MIN = 0.15, MAX = 3;
const FIT_MIN = 0.5; // below this, labels stop reading at 1520 × 1088

export function usePanZoom(stageRef: RefObject<HTMLDivElement | null>, frame: { width: number; height: number }, target: CameraTarget) {
  const [view, setView] = useState<View>({ zoom: 1, pan: { x: 0, y: 0 } });
  const [easing, setEasing] = useState(false);
  const touched = useRef(false);
  const viewRef = useRef(view);
  viewRef.current = view;

  const framed = useCallback((t: CameraTarget): View => {
    const el = stageRef.current;
    if (!el) return { zoom: 1, pan: { x: 0, y: 0 } };
    const w = el.clientWidth, h = el.clientHeight;
    if (!t.bounds) return { zoom: 1, pan: { x: w / 2 - 0.5 - frame.width / 2, y: h / 2 - frame.height / 2 } };
    const { x0, y0, x1, y1 } = t.bounds;
    const zoom = Math.min(1, Math.max(FIT_MIN, Math.min(w / (x1 - x0), h / (y1 - y0))));
    return { zoom, pan: { x: w / 2 - ((x0 + x1) / 2) * zoom, y: h / 2 - ((y0 + y1) / 2) * zoom } };
  }, [stageRef, frame.width, frame.height]);

  const targetRef = useRef(target);
  targetRef.current = target;

  // A new target re-frames, easing (not on first paint); the user's pan/zoom is forgotten.
  const first = useRef(true);
  useEffect(() => {
    touched.current = false;
    setView(framed(targetRef.current));
    if (first.current) { first.current = false; return; }
    setEasing(true);
    const t = setTimeout(() => setEasing(false), 560);
    return () => clearTimeout(t);
  }, [target.key, framed]);

  // Keep the target framed as the stage resizes (Feed ↔ Kharon), until the user pans or zooms.
  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const ro = new ResizeObserver(() => { if (!touched.current) setView(framed(targetRef.current)); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [stageRef, framed]);

  const zoomAt = useCallback((f: number, cx: number, cy: number) => {
    touched.current = true;
    setEasing(false);
    setView(({ zoom, pan }) => {
      const z = Math.min(MAX, Math.max(MIN, zoom * f));
      return { zoom: z, pan: { x: cx - ((cx - pan.x) * z) / zoom, y: cy - ((cy - pan.y) * z) / zoom } };
    });
  }, []);

  const zoomBy = useCallback((f: number) => {
    const el = stageRef.current; if (!el) return;
    zoomAt(f, el.clientWidth / 2, el.clientHeight / 2);
  }, [stageRef, zoomAt]);

  const reset = useCallback(() => { touched.current = false; setEasing(true); setView(framed(targetRef.current)); setTimeout(() => setEasing(false), 560); }, [framed]);

  // Drag to pan; a press that moves under 3 px is still a click.
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const wasDrag = useRef(false);
  const onPointerDown = (ev: React.PointerEvent) => {
    if ((ev.target as Element).closest('[data-nopan]')) return;
    const { pan } = viewRef.current;
    drag.current = { x: ev.clientX, y: ev.clientY, px: pan.x, py: pan.y, moved: false };
    wasDrag.current = false;
    (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
  };
  const onPointerMove = (ev: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) <= 3) return;
    d.moved = true; touched.current = true;
    setEasing(false);
    setView((v) => ({ ...v, pan: { x: d.px + dx, y: d.py + dy } }));
  };
  const onPointerUp = () => { wasDrag.current = !!drag.current?.moved; drag.current = null; };

  // Wheel zooms about the cursor (non-passive so the page doesn't scroll).
  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(ev.deltaY < 0 ? 1.12 : 1 / 1.12, ev.clientX - r.left, ev.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [stageRef, zoomAt]);

  return {
    view, easing, zoomBy, reset, dragging: !!drag.current?.moved,
    /** True if the last press was a drag, so the click that follows shouldn't clear the selection. */
    wasDrag: () => wasDrag.current,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
