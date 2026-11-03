// Case data the app renders. Words follow GLOSSARY.md: Entity, Link, Subject, Insight, Arrangement.
// Shape borrowed from the R3 prototype (research/r3/r3-data.types.ts): glyph, link currency (former),
// ownership %, and a typed absence instead of blanks. Ticket 03's case JSON must satisfy CaseData.

export type EntityKind =
  | 'company' | 'person' | 'vessel' | 'university' | 'government' | 'bank' | 'port' | 'event'
  | 'trust' | 'authority' | 'agreement'; // ticket 03's kinds

/** Fill tier on the graph: navy Entity, red risk, grey event (Node component, Figma 46:385). */
export type Tier = 'entity' | 'risk' | 'event';

/** Glyph assets from the Figma Node instances (Material icons, white). */
export type Glyph = 'domain' | 'person' | 'anchor' | 'description' | 'account_balance';

/** Status badges at the node's top-right: Listed = red shield, Public = green chart. */
export type Badge = 'listed' | 'public';

/** How firmly the sources support a Link (ticket 03's case.json). Shown as a label, never a number. */
export type Confidence = 'high' | 'medium' | 'low';

export interface Listing {
  name: string;          // 'US Entity List' | 'OFAC SDN List'
  authority: string;
  listingDate: string;   // ISO date
}

export interface Source {
  title: string;
  publisher: string;
  date: string;          // ISO date
  confidence: Confidence;
  note?: string;
}

export interface Entity {
  id: string;
  name: string;
  /** For Kharon copy and tight labels ('Tarnwell'). */
  shortName?: string;
  kind: EntityKind;
  jurisdiction: string;  // ISO 3166 alpha-2
  place: string;
  tier: Tier;
  glyph: Glyph;
  badges: Badge[];
  isSubject?: boolean;
  /** Short context line (graph-data.js note / flag). */
  note?: string;
  flag?: string;
  /** Explicit label lines where Figma breaks differently from the 21-character wrap. */
  labelLines?: string[];
  listings?: Listing[];
}

export type LinkKind = 'ownership' | 'control' | 'finance' | 'supply' | 'logistics' | 'contract' | 'regulatory' | 'affiliation' | 'research';

export interface Link {
  id: string;
  source: string;
  target: string;
  kind: LinkKind;
  /** Detail from the case data, e.g. "owns 62%", "director · resigned 2022". */
  detail: string;
  pct?: number;
  former?: boolean;
  /** Draw an arrowhead at the target (ownership edges in Figma). */
  directed?: boolean;
  startDate?: string;
  endDate?: string;
  confidence?: Confidence;
  sources?: Source[];
}

export interface Point { x: number; y: number }

/** One way of laying out the graph. Coordinates are in the Figma Graph frame's space (1737 × 1036). */
export interface Arrangement {
  id: string;
  name: string;
  size: { width: number; height: number };
  positions: Record<string, Point>;
  /** Link label centres where Figma hand-placed them; others sit at the midpoint. */
  labelAt?: Record<string, Point>;
}

export interface FeedItem {
  id: string;
  tag: string;
  severity: 'warn' | 'danger' | 'info';
  title: string;
  place: string;
  time: string;
  unread?: boolean;
  insightId?: string;
}

export interface Insight {
  id: string;
  title: string;
  dek: string;
  time: string;
  place: string;
  body: string[];
  subjectId: string;
}

export interface CaseData {
  feed: FeedItem[];
  insights: Insight[];
  entities: Entity[];
  links: Link[];
  arrangements: Arrangement[];
}

/**
 * Marks the graph draws on top of a Version (ticket 02's ghost diff):
 * added = dashed teal (a Proposal's or Kharon's answer's new items), hidden = faded to 20%,
 * unconfirmed = dotted orange with an UNCONFIRMED tag, changed = UPDATED tag (a Source update),
 * riskPreview = a pending risk Change, progress = Links Kharon is reading, highlight = hovered Change.
 */
export type EntityMark = 'added' | 'hidden' | 'unconfirmed' | 'changed' | 'riskPreview' | 'highlight';
export type LinkMark = 'added' | 'hidden' | 'unconfirmed' | 'progress' | 'highlight';
export interface GraphMarks {
  entities: Record<string, EntityMark[]>;
  links: Record<string, LinkMark[]>;
}
