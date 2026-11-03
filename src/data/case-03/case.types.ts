// Types for case.json: the Suryadeep case the golden flow runs on (ticket 03).
// Shape follows r3/r3-data.types.ts where it fits, renamed to the glossary: node → Entity, edge → Link,
// posture 'anchor' → isSubject. See case-data.md for the story and every name and date call.
// Import in the app as: `import raw from './case.json'; export const CASE = raw as SuryadeepCase;`

export type ISODate = string;     // 'YYYY-MM-DD'
export type ISODateTime = string; // 'YYYY-MM-DDTHH:mm:ssZ', story clock in UTC

export type Confidence = 'high' | 'medium' | 'low';

/** The tier the canvas paints. graph-data.js 'medium' is drawn as high, so it maps to 'high' here. */
export type Risk = 'high' | 'watch' | 'none';

export type EntityKind =
  | 'company' | 'person' | 'trust' | 'bank' | 'university'
  | 'authority' | 'port' | 'vessel' | 'agreement';

export const KIND_LABEL: Record<EntityKind, string> = {
  company: 'Company', person: 'Individual', trust: 'Trust', bank: 'Bank', university: 'University',
  authority: 'Government body', port: 'Port', vessel: 'Vessel', agreement: 'Contract',
};

/** A list entry on an Entity. Field names follow R3's `Violation`. */
export interface Listing {
  instrument: 'bis_entity_list' | 'ofac_sdn';
  name: string;                 // 'US Entity List' | 'OFAC SDN List', as Record Details shows it
  authority: string;
  action: string;
  listingDate: ISODate;
  status: 'Listed';
  citation?: string;
  licenseReviewPolicy?: string;
  federalRegister?: string;
}

export interface Entity {
  id: string;                   // same ids as graph-data.js and the Figma layers ('Node · merid'), even where the name changed
  name: string;
  shortName?: string;           // for Kharon copy and tight labels
  kind: EntityKind;
  jurisdiction: string;         // ISO 3166 alpha-2
  place: string;                // second line under the name
  risk: Risk;                   // as of Version 1; Version.riskOverrides changes it later
  isSubject?: true;             // exactly one: drawn as the square
  flag?: string;                // the risk reason, shown on hover and in Record Details
  note?: string;                // the role line
  listings?: Listing[];         // as of Version 1; the Update adds XPU's
  identity?: {                  // only on Zhou Ming: why Kharon can't confirm who he is
    status: 'unconfirmed';
    basis: string;
    missing: string;
  };
  realWorld?: true;             // a real place or authority in a neutral role (ports, DGFT); everything else is fictional
}

export type LinkType =
  | 'ownership' | 'control' | 'finance' | 'supply' | 'logistics'
  | 'contract' | 'regulatory' | 'affiliation' | 'research';

export interface Source {
  title: string;
  publisher: string;
  date: ISODate;
  confidence: Confidence;
  note?: string;
}

/**
 * Direction: source is the owner, controller, provider or person; target is the owned or served party.
 * So walking upstream from the Subject means following Links backwards, target → source.
 */
export interface Link {
  id: string;                   // 'L01'..'L23'
  source: string;               // Entity id
  target: string;               // Entity id
  type: LinkType;
  label: string;                // edge label text, e.g. 'Owns 62%'
  percent?: number;             // ownership only; R3's ownership.directPct
  startDate: ISODate;
  endDate?: ISODate;            // lapsed Links only
  status: 'active' | 'lapsed' | 'inferred'; // R3's render.currency: solid / dotted 'Frmr' / unconfirmed
  confidence: Confidence;       // the hop's confidence in Kharon's answer; defaults to its weakest source
  sources: Source[];
}

export type Arrangement = 'radial' | 'ownership' | 'timeline';

export interface Version {
  id: 'v1' | 'v2' | 'b1' | 'v3' | 'v4';
  label: string;                // 'Version 1' | 'Branch B' ...
  line: 'main' | 'B';           // Source updates land on the main line only
  parent?: Version['id'];
  madeBy: 'published' | 'kharon' | 'source_update';
  byline: string;               // History row text
  createdAt: ISODateTime;
  arrangement: Arrangement;
  entityIds: string[];          // what is on the canvas in this Version
  linkIds: string[];
  proposal?: Proposal['id'];
  changesApplied?: string[];
  changesRejected?: string[];
  update?: Update['id'];
  changedEntityIds?: string[];  // drawn with the 'changed' marker
  riskOverrides?: Record<string, Risk>;
}

export interface Change {
  id: string;                   // 'C1'..'C6'
  kind: 'add' | 'hide' | 'arrangement' | 'risk';
  label: string;
  entityIds?: string[];         // add: ghosted in dashed; hide: faded
  linkIds?: string[];
  arrangement?: Arrangement;
  risk?: Risk;
  confidence: Confidence;
  scriptedDecision: 'accept' | 'reject'; // what the user does in the golden flow
  why?: string;
}

export interface Proposal {
  id: 'P1' | 'P2' | 'P3';
  screen: string;
  basedOn: Version['id'];
  headline: string;
  changes: Change[];
  resultVersion: Version['id'];
  userCopy?: string;
}

export interface ExposurePath {
  id: 'path-ownership' | 'path-zhou';
  label: string;
  confidence: Confidence;       // the path is as strong as its weakest hop
  linkIds: string[];            // in order, from the Subject upstream
  hiddenLinkIds: string[];      // the hops past the Version 1 graph
  terminalEntityIds: string[];
  summary: string;
}

export interface Exposure {
  lookThrough: { entityId: string; pct: number; via: string[]; note: string }[];
  nearestListed: { asOf: Version['id']; entityId: string; hops: number; note: string }[];
  paths: ExposurePath[];
}

export interface Insight {
  id: 'ins-sury' | 'ins-draft';
  status: 'published' | 'draft'; // ins-draft is a Draft Insight until S7's Publish
  tag: 'Forced Labor' | 'Sanctions';
  sev: 'danger' | 'warn' | 'info';
  place: string;                // meta line, e.g. 'Ahmedabad, IN'
  jurisdiction: string;
  publishedAt: ISODateTime;
  author: string;
  sourceCount: number;
  subjectId: string;
  cardTitle: string;            // Feed/Card text, sentence case
  title: string;                // panel headline, title case
  dek: string;
  paras: string[];              // the last one starts 'Analyst view:'
  versions?: Version['id'][];
  generatedFrom?: Version['id'];
  outline?: { id: string; text: string; order: number; movedByUser?: true }[];
  selfCheck?: { claims: number; sourced: number; summary: string; leftOut: { linkId: string; reason: string }[] };
}

export interface Update {
  id: 'U1';
  kind: 'listing';
  date: ISODate;                // the listing's effective date
  detectedAt: ISODateTime;
  entityId: string;
  listing: Listing;
  rule: {                       // a BIS Federal Register final rule, synthetic
    agency: string;
    cfr: string;
    title: string;
    action: 'Final rule';
    summary: string;
    effective: ISODate;
    frPublication: ISODate;
    decidedBy: string;
    basis: string;
    entry: {                    // the Supplement No. 4 row
      country: string;
      entity: string;
      licenseRequirement: string;
      licenseReviewPolicy: string;
      federalRegisterCitation: string;
    };
  };
  notice: string;               // the S8 notification copy
  affectedInsightIds: Insight['id'][];
  resultVersion: Version['id'];
}

export interface FeedCard {
  insightId?: Insight['id'];    // only the Suryadeep card opens; the rest are Feed filler from 117:5653
  tag: string;
  title: string;
  place: string;
  publishedAt: ISODateTime;
  unread?: true;
  inDemo: boolean;
}

/** One row per screen of the golden flow script (ticket 01): what the data drives on each. */
export interface Screen {
  id: 'S1' | 'S2' | 'K1' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9';
  title: string;
  flow?: 1 | 2 | 3 | 4 | 5;
  clock: ISODateTime;           // story clock; Feed ages ('2h ago') count back from it
  version: Version['id'];
  viewing?: Version['id'];
  left: 'feed' | 'kharon';
  panel: 'insight' | 'record' | 'draft';
  selectedFeedInsight?: Insight['id'];
  selectedEntity?: string;
  hoverEntity?: string;
  hoverCard?: { flag: string; action: string };
  inProgressLinkIds?: string[];
  ghost?: { dashedEntityIds: string[]; dashedLinkIds: string[]; dottedEntityIds: string[]; dottedLinkIds: string[] };
  kharon?: {
    question?: string;
    steps?: string[];
    stop?: boolean;
    answer?: string;
    followUp?: string;
    paths?: ExposurePath['id'][];
    lowConfidence?: { pathId: ExposurePath['id']; text: string; offers: string[] };
    prompts?: string[];
    selfCheck?: string;
  };
  proposal?: Proposal['id'];
  userPrompt?: string;
  hierarchy?: string[];         // S5's top-down reading order
  banner?: string;
  draftInsight?: Insight['id'];
  update?: Update['id'];
  bellBadge?: number;
  updatedFeedInsightIds?: Insight['id'][];
  changedEntityIds?: string[];
  recordRow?: string;
  relatedLine?: string;
  copy?: string;
}

export interface SuryadeepCase {
  banner: string;
  synthetic: true;
  caseId: 'suryadeep';
  asOf: ISODate;
  subjectId: string;
  entities: Entity[];
  links: Link[];
  exposure: Exposure;
  versions: Version[];
  proposals: Proposal[];
  insights: Insight[];
  update: Update;
  feed: FeedCard[];
  screens: Screen[];
}
