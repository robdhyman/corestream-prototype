// The Kharon mark: Rob's chibi ferryman (kharon-chibi-ferryman-icons/), replacing the k (ticket 08).
// The Kharon head and Ask Kharon use the small solid badge (hf/Kharon mark). The canvas k (hf/k) keeps the
// teal ferryman in its disc in every state (ticket 13, variant A): KButton changes the disc, and while Kharon
// works the orange arc spins over the ferryman on its own layer.

import kGlyph from './mascot/k-glyph.svg';
import kMark from './mascot/k-mark.svg';
import kWorkingArc from './mascot/k-working-arc.svg';

export function KMark({ size }: { size: number }) {
  return (
    <span aria-hidden className="relative block shrink-0" style={{ width: size, height: size }}>
      <img src={kMark} alt="" width={size} height={size} className="block" />
    </span>
  );
}

export function KGlyph({ size, working }: { size: number; working: boolean }) {
  return (
    <span aria-hidden className="relative block shrink-0" style={{ width: size, height: size }}>
      <img src={kGlyph} alt="" width={size} height={size} className="block" />
      {working && <img src={kWorkingArc} alt="" width={size} height={size} className="absolute inset-0 animate-spin" />}
    </span>
  );
}
