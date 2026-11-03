// Seed case data, until ticket 03's typed case JSON lands.
// Entities and Links: the Suryadeep case in `Kharon 2026/RegTech Supply Chain Risk Graph/graph-data.js`
// (20 Entities, 23 Links; all names fictional). Tier, glyph, badges, positions and Link label placement:
// Figma frame 117:5653 "Insight View" (get_design_context, 2026-11-02). Feed and Insight copy: the same frame.
// Swap point: src/data/case.ts.

import type { CaseData, Entity, Link } from './types';

const entities: Entity[] = [
  { id: 'sury', name: 'Suryadeep Photovoltaics Pvt. Ltd.', kind: 'company', jurisdiction: 'IN', place: 'Ahmedabad, Gujarat', tier: 'entity', glyph: 'domain', badges: ['listed'], isSubject: true, note: 'Subject of review · solar module manufacturer', labelLines: ['Suryadeep', 'Photovoltaics', 'Pvt. Ltd.'] },
  { id: 'merid', name: 'Meridian Crest Holdings Ltd.', kind: 'company', jurisdiction: 'VG', place: 'Road Town, BVI', tier: 'risk', glyph: 'domain', badges: ['listed'], flag: 'Opaque ownership · nominee directors' },
  { id: 'coro', name: 'Coromandel Coast Shipping Lines Ltd.', kind: 'company', jurisdiction: 'IN', place: 'Chennai, Tamil Nadu', tier: 'entity', glyph: 'domain', badges: ['listed'], note: 'Freight forwarder' },
  { id: 'gvb', name: 'Ganga Vikas Commercial Bank Ltd.', kind: 'bank', jurisdiction: 'IN', place: 'Mumbai, Maharashtra', tier: 'risk', glyph: 'domain', badges: ['public', 'listed'], note: 'Primary banker' },
  { id: 'mundra', name: 'Port of Mundra', kind: 'port', jurisdiction: 'IN', place: 'Kutch, Gujarat', tier: 'entity', glyph: 'anchor', badges: ['listed'], note: 'Export gateway' },
  { id: 'menon', name: 'Rajiv Menon', kind: 'person', jurisdiction: 'IN', place: 'Ahmedabad, Gujarat', tier: 'entity', glyph: 'domain', badges: [], note: 'Managing director · 18% holder' },
  { id: 'contract', name: 'Supply agreement GEM-2024-117', kind: 'event', jurisdiction: 'GB', place: 'Signed 14 Mar 2024', tier: 'event', glyph: 'description', badges: [], note: 'Solar modules · five-year term' },
  { id: 'kalinga', name: 'Kalinga Solar Glass Works Pvt. Ltd.', kind: 'company', jurisdiction: 'IN', place: 'Bhubaneswar, Odisha', tier: 'risk', glyph: 'domain', badges: ['public', 'listed'], note: 'Joint venture · 40% held' },
  { id: 'sipt', name: 'Sino-Indo Polysilicon Trading FZE', kind: 'company', jurisdiction: 'AE', place: 'Dubai, UAE', tier: 'entity', glyph: 'domain', badges: ['public', 'listed'], flag: 'Adverse media · polysilicon origin' },
  { id: 'dgft', name: 'Directorate General of Foreign Trade', kind: 'government', jurisdiction: 'IN', place: 'New Delhi', tier: 'entity', glyph: 'account_balance', badges: ['listed'], note: 'Export licence authority' },
  { id: 'cheung', name: 'Wei-Lun Cheung', kind: 'person', jurisdiction: 'HK', place: 'Hong Kong SAR', tier: 'entity', glyph: 'person', badges: ['public', 'listed'], flag: 'PEP association · former SIPT director' },
  { id: 'hct', name: 'Harbour Crescent Trust', kind: 'company', jurisdiction: 'KY', place: 'George Town, Cayman Islands', tier: 'risk', glyph: 'domain', badges: ['listed'], flag: 'Trust · settlor is a PRC university' },
  { id: 'smb', name: 'Standard Meridian Bank (Hong Kong) Ltd.', kind: 'bank', jurisdiction: 'HK', place: 'Hong Kong SAR', tier: 'entity', glyph: 'domain', badges: ['public'], flag: 'AML enforcement action · 2023' },
  { id: 'zhou', name: 'Prof. Zhou Ming', kind: 'person', jurisdiction: 'CN', place: 'Ürümqi, Xinjiang', tier: 'risk', glyph: 'person', badges: ['listed'], flag: 'Dean at XPU · director of Meridian Crest' },
  { id: 'grantham', name: 'Grantham Electrical Manufacturing plc', kind: 'company', jurisdiction: 'GB', place: 'Leeds, United Kingdom', tier: 'entity', glyph: 'domain', badges: ['listed'], note: 'Customer · end buyer' },
  { id: 'kaveri', name: 'MV Kaveri Pride', kind: 'vessel', jurisdiction: 'PA', place: 'Panama flag · IMO 9745120', tier: 'entity', glyph: 'domain', badges: [], note: 'Operated by Coromandel Coast' },
  // Not drawn in 117:5653: the hidden hops the golden flow reveals (S3) and the discharge port.
  { id: 'felix', name: 'Port of Felixstowe', kind: 'port', jurisdiction: 'GB', place: 'Suffolk, United Kingdom', tier: 'entity', glyph: 'anchor', badges: [], note: 'Discharge port' },
  { id: 'xpu', name: 'Xinjiang Polytechnic University of Materials Science and Engineering', kind: 'university', jurisdiction: 'CN', place: 'Ürümqi, Xinjiang', tier: 'risk', glyph: 'domain', badges: [], flag: 'Military-civil fusion designation' },
  { id: 'tianshan', name: 'Tianshan Aerospace & Defence Electronics Co., Ltd.', kind: 'company', jurisdiction: 'CN', place: 'Ürümqi, Xinjiang', tier: 'risk', glyph: 'domain', badges: ['listed'], flag: 'US Entity List · Apr 2021' },
  { id: 'xpzdc', name: 'Xinjiang Production Zone Development Corp.', kind: 'government', jurisdiction: 'CN', place: 'Ürümqi, Xinjiang', tier: 'risk', glyph: 'account_balance', badges: ['listed'], flag: 'OFAC SDN · Jul 2020' },
];

const L = (id: string, source: string, target: string, kind: Link['kind'], detail: string, x: Partial<Link> = {}): Link =>
  ({ id, source, target, kind, detail, directed: kind === 'ownership', ...x });

const links: Link[] = [
  L('L01', 'merid', 'sury', 'ownership', 'owns 62%', { pct: 62 }),
  L('L02', 'hct', 'merid', 'ownership', 'holds 45%', { pct: 45 }),
  L('L03', 'cheung', 'merid', 'ownership', 'UBO · 55%', { pct: 55 }),
  L('L04', 'xpu', 'hct', 'control', 'settlor'),
  L('L05', 'zhou', 'merid', 'control', 'director'),
  L('L06', 'zhou', 'xpu', 'affiliation', 'dean of engineering'),
  L('L07', 'tianshan', 'xpu', 'research', 'joint laboratory · 2019–'),
  L('L08', 'xpzdc', 'tianshan', 'ownership', 'state owner · 100%', { pct: 100 }),
  L('L09', 'smb', 'merid', 'finance', 'correspondent bank'),
  L('L10', 'gvb', 'sury', 'finance', 'primary banker'),
  L('L11', 'sury', 'kalinga', 'ownership', 'owns 40% · JV', { pct: 40 }),
  L('L12', 'sipt', 'sury', 'supply', 'polysilicon supplier · ended 2023', { former: true }),
  L('L13', 'coro', 'sury', 'logistics', 'freight forwarder'),
  L('L14', 'coro', 'kaveri', 'logistics', 'operates'),
  L('L15', 'kaveri', 'mundra', 'logistics', 'loads at'),
  L('L16', 'kaveri', 'felix', 'logistics', 'discharges at'),
  L('L17', 'sury', 'mundra', 'logistics', 'exports via'),
  L('L18', 'sury', 'contract', 'contract', 'party to'),
  L('L19', 'grantham', 'contract', 'contract', 'party to'),
  L('L20', 'menon', 'sury', 'ownership', 'managing director · 18%', { pct: 18 }),
  L('L21', 'dgft', 'sury', 'regulatory', 'export licence'),
  L('L22', 'tianshan', 'zhou', 'affiliation', 'advisory board'),
  L('L23', 'cheung', 'sipt', 'control', 'director · resigned 2022', { former: true }),
];

export const seed: CaseData = {
  entities,
  links,
  arrangements: [
    {
      // V1, radial: node centres and Link label centres read off 117:5653's Graph frame (1737 × 1036).
      id: 'radial',
      name: 'Radial',
      size: { width: 1737, height: 1036 },
      positions: {
        sury: { x: 816, y: 534 }, merid: { x: 1068, y: 730 }, coro: { x: 564, y: 674 }, gvb: { x: 984, y: 366 },
        mundra: { x: 368, y: 366 }, menon: { x: 732, y: 282 }, contract: { x: 956, y: 170 }, kalinga: { x: 592, y: 422 },
        sipt: { x: 1040, y: 534 }, dgft: { x: 816, y: 757 }, cheung: { x: 1292, y: 618 }, hct: { x: 1208, y: 870 },
        smb: { x: 984, y: 926 }, zhou: { x: 1432, y: 814 }, grantham: { x: 872, y: 30 }, kaveri: { x: 340, y: 562 },
      },
      labelAt: {
        L01: { x: 942.4, y: 641.7 }, L02: { x: 1132.3, y: 805.1 }, L03: { x: 1184.9, y: 679.6 }, L05: { x: 1250.0, y: 779.0 },
        L09: { x: 1018.3, y: 823.4 }, L10: { x: 913.0, y: 447.7 }, L11: { x: 719.2, y: 493.7 }, L12: { x: 932.0, y: 541.0 },
        L13: { x: 680.5, y: 597.0 }, L14: { x: 448.9, y: 624.5 }, L15: { x: 345.0, y: 461.7 }, L17: { x: 496.5, y: 421.8 },
        L18: { x: 878.7, y: 344.0 }, L19: { x: 905.8, y: 101.8 }, L20: { x: 781.1, y: 398.7 }, L21: { x: 807.0, y: 660.0 },
        L23: { x: 1164.1, y: 582.9 },
      },
    },
  ],
  feed: [
    { id: 'f1', tag: 'Forced Labor', severity: 'warn', title: 'Port authority shifts inspection contract to new vendor, signaling shift in attitude on forced labor compliance', place: 'Rotterdam, NL', time: '2H AGO', insightId: 'ins-port-authority' },
    { id: 'f2', tag: 'Forced Labor', severity: 'warn', unread: true, title: 'Bulk carrier renamed and reflagged twice in 90 days after listing of its former manager', place: 'Piraeus, GR', time: '5H AGO' },
    { id: 'f3', tag: 'Forced Labor', severity: 'warn', unread: true, title: 'Textile exporter’s largest customer added to UFLPA Entity List; three tier-2 suppliers share directors', place: 'Ho Chi Minh City, VN', time: '9H AGO' },
    { id: 'f4', tag: 'Forced Labor', severity: 'warn', title: 'Minority stake in freight forwarder traced to a designated entity through two holding companies', place: 'Dubai, AE', time: '3D AGO' },
    { id: 'f5', tag: 'Forced Labor', severity: 'warn', title: 'Customs broker fined after screening lapse; contract with regional port operator under review', place: 'Antwerp, BE', time: '2D AGO' },
    { id: 'f6', tag: 'Forced Labor', severity: 'warn', title: 'Aluminium smelter’s new offtake partner shares an address with a listed trading house', place: 'Istanbul, TR', time: '2D AGO' },
    { id: 'f7', tag: 'Forced Labor', severity: 'warn', title: 'Recruitment agency named in audit supplied workers to two electronics plants in the watch set', place: 'Penang, MY', time: '3D AGO' },
    { id: 'f8', tag: 'Forced Labor', severity: 'warn', title: 'Dual-use machine-tool shipment rerouted via third-country distributor after licence denial', place: 'Hamburg, DE', time: '4D AGO' },
  ],
  insights: [
    {
      id: 'ins-port-authority',
      subjectId: 'sury',
      title: 'Port Authority Shifts Inspection Contract to New Vendor, Signaling Shift in Attitude on Forced Labor Compliance',
      dek: 'Rotterdam’s port authority has reassigned its container-inspection contract to a new vendor after an audit found gaps in screening throughput under the incumbent. The three-year deal marks a tightening posture on forced-labor compliance, an area regulators and shippers have pushed harder on this year.',
      time: '2H Ago',
      place: 'Rotterdam, NL',
      body: [
        'The port authority awarded a three-year container-inspection contract to Havenwacht Inspectie B.V., ending a nine-year relationship with the incumbent after an internal audit found screening throughput below the authority’s own threshold for two consecutive quarters.',
        'Tender documents add a new clause requiring the vendor to screen inbound cargo against forced-labor watch sets, including the UFLPA Entity List and the EU forced-labour regulation’s enforcement database, and to retain screening evidence for five years.',
        'Havenwacht’s controlling shareholder, Nordkai Holding, also holds a 12% stake in Gulf Meridian Logistics, a freight forwarder that appeared in a prior CoreStream insight on a minority stake traced to a designated entity. The stake does not confer control and is not itself a listing trigger.',
        'Analyst view: the clause shifts compliance risk to the vendor and is the first explicit forced-labor screening requirement seen in a North Sea port tender. Downstream terminal operators are likely to inherit the requirement at renewal.',
      ],
    },
  ],
};
