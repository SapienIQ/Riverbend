'use client';

import {
  Archive,
  Brush,
  CheckCircle2,
  ClipboardCheck,
  CircleDashed,
  Compass,
  Eye,
  Hammer,
  Hand,
  Layers3,
  Lightbulb,
  Map,
  Menu,
  Rotate3D,
  Save,
  Search,
  ShieldCheck,
  Volume2,
  VolumeX,
  Sparkles,
  SunMedium,
} from 'lucide-react';
import Image from 'next/image';
import type { ElementType, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Phase = 'I' | 'II' | 'III' | 'Later' | 'Mixed';
type Screen =
  | 'survey'
  | 'excavation'
  | 'examination'
  | 'joins'
  | 'reconstruction'
  | 'interpretation'
  | 'fieldwork';
type Tool = 'brush' | 'pick' | 'stabilize' | 'lift' | 'light' | 'join';
type SoundCue = 'brush' | 'pick' | 'stabilize' | 'lift' | 'join' | 'place' | 'blocked' | 'clean';
type ExcavationFocus = 'hearth' | 'bench' | 'threshold' | 'pit' | 'collapse' | 'north';
type TutorialStep = 'firstBrush' | 'firstLift' | 'firstLook' | 'firstMatch' | 'firstBuild' | 'freePlay';
type Confidence =
  | 'Confirmed'
  | 'Strongly supported'
  | 'Plausible'
  | 'Speculative'
  | 'Contradicted';

type Find = {
  id: string;
  name: string;
  material: string;
  use: string;
  location: string;
  locationId: string;
  phase: Phase;
  condition: string;
  joins: string[];
  group: string[];
  relationships: string;
  positions: Record<'expedition' | 'fieldwork', { x: number; y: number }>;
  clue: string;
  supports: Record<'A' | 'B' | 'C', 'Supports' | 'Weakens' | 'Complicates' | 'Neutral'>;
  closeup?: 'cooking' | 'pigment' | 'bead' | 'spindle' | 'peg';
  requiredTool?: Tool;
  fragile?: boolean;
};

type FindState = {
  exposed: number;
  recovered: boolean;
  stabilized: boolean;
  cleaned: number;
  observations: string[];
  joinedWith: string[];
  groups: string[];
  contextQuality: number;
};

type Interpretation = {
  id: 'A' | 'B' | 'C';
  label: string;
  claim: string;
  evidence: string[];
  uncertainty: string;
};

type FieldworkHistory = {
  id: 'threshold' | 'intrusion' | 'collapse';
  name: string;
  objective: string;
  detail: string;
  scenarioLabel: string;
  startingFinds: string[];
};

type JoinPair = {
  id: string;
  label: string;
  ids: [string, string];
  group: string;
};

type FragmentTransform = {
  x: number;
  y: number;
  rotation: number;
};

const tools: {
  id: Tool;
  label: string;
  icon: ElementType;
  hint: string;
  bestUse: string;
}[] = [
  { id: 'brush', label: 'Brush', icon: Brush, hint: 'Gentle and safe. Clears dirt slowly.', bestUse: 'Best when something is just peeking out.' },
  { id: 'pick', label: 'Pick', icon: Hammer, hint: 'Fast on packed dirt. Risky on delicate clues.', bestUse: 'Best for hard edges and packed debris.' },
  { id: 'stabilize', label: 'Protect', icon: ShieldCheck, hint: 'Keeps delicate clues from crumbling.', bestUse: 'Best when the selected clue warns you it is fragile.' },
  { id: 'lift', label: 'Pick Up', icon: Hand, hint: 'Adds a cleared clue to your tray.', bestUse: 'Best when the clue says ready.' },
  { id: 'light', label: 'Lamp', icon: SunMedium, hint: 'Shows hidden marks, colors, and edges.', bestUse: 'Best after a clue is in your tray.' },
  { id: 'join', label: 'Match', icon: Rotate3D, hint: 'Opens the table for fitting pieces together.', bestUse: 'Best when two pieces look related.' },
];

const finds: Find[] = [
  {
    id: '1',
    name: 'Cooking pot rim A',
    material: 'Local ceramic',
    use: 'Cooking',
    location: 'Hearth edge',
    locationId: 'hearth',
    phase: 'I',
    condition: 'Sooted, broken',
    joins: ['2', '3'],
    group: ['cooking'],
    relationships: 'Heat use, food preparation, physical vessel join.',
    positions: { expedition: { x: 34, y: 57 }, fieldwork: { x: 31, y: 54 } },
    clue: 'Soot wraps over the break, showing reuse after the first crack.',
    supports: { A: 'Supports', B: 'Neutral', C: 'Complicates' },
    closeup: 'cooking',
  },
  {
    id: '2',
    name: 'Cooking pot body B',
    material: 'Local ceramic',
    use: 'Cooking',
    location: 'Hearth ash',
    locationId: 'hearth',
    phase: 'I',
    condition: 'Sooted',
    joins: ['1', '3'],
    group: ['cooking'],
    relationships: 'Physical vessel join and continued heat use.',
    positions: { expedition: { x: 38, y: 61 }, fieldwork: { x: 36, y: 58 } },
    clue: 'The soot line continues across the rim fragment.',
    supports: { A: 'Supports', B: 'Neutral', C: 'Complicates' },
    closeup: 'cooking',
  },
  {
    id: '3',
    name: 'Cooking pot base C',
    material: 'Local ceramic',
    use: 'Cooking',
    location: 'Near bench fill',
    locationId: 'bench',
    phase: 'Mixed',
    condition: 'Sooted, displaced',
    joins: ['1', '2'],
    group: ['cooking', 'disturbance'],
    relationships: 'Displaced pot base complicates the cooking area.',
    positions: { expedition: { x: 54, y: 37 }, fieldwork: { x: 61, y: 46 } },
    clue: 'Its break fits the hearth pot, but its context is later mixed fill.',
    supports: { A: 'Weakens', B: 'Neutral', C: 'Supports' },
    closeup: 'cooking',
  },
  {
    id: '4',
    name: 'Charred grain cluster',
    material: 'Botanical',
    use: 'Food residue',
    location: 'Hearth ash',
    locationId: 'hearth',
    phase: 'I',
    condition: 'Fragile',
    joins: [],
    group: ['cooking'],
    relationships: 'Cooking activity and preserved food residue.',
    positions: { expedition: { x: 40, y: 55 }, fieldwork: { x: 42, y: 59 } },
    clue: 'A compact charred cluster remained inside the hearth ash.',
    supports: { A: 'Supports', B: 'Neutral', C: 'Weakens' },
    requiredTool: 'stabilize',
    fragile: true,
  },
  {
    id: '5',
    name: 'Animal bone fragments',
    material: 'Bone',
    use: 'Meal waste',
    location: 'Swept corner',
    locationId: 'north',
    phase: 'I',
    condition: 'Cut marks',
    joins: [],
    group: ['cooking'],
    relationships: 'Food preparation and sweeping pattern.',
    positions: { expedition: { x: 21, y: 41 }, fieldwork: { x: 24, y: 43 } },
    clue: 'Cut marks and a corner concentration point to routine cleanup.',
    supports: { A: 'Supports', B: 'Neutral', C: 'Complicates' },
  },
  {
    id: '6',
    name: 'Hearth clay patch',
    material: 'Fired clay',
    use: 'Repair',
    location: 'Hearth surface',
    locationId: 'hearth',
    phase: 'I',
    condition: 'Heat cracked',
    joins: [],
    group: ['cooking', 'repair'],
    relationships: 'Repeated hearth repair and long use.',
    positions: { expedition: { x: 35, y: 51 }, fieldwork: { x: 37, y: 52 } },
    clue: 'The patch is heat-cracked differently from the surrounding floor.',
    supports: { A: 'Supports', B: 'Neutral', C: 'Neutral' },
  },
  {
    id: '7',
    name: 'Storage jar shoulder',
    material: 'Local ceramic',
    use: 'Storage',
    location: 'North wall',
    locationId: 'north',
    phase: 'III',
    condition: 'Crushed',
    joins: ['8'],
    group: ['storage', 'collapse'],
    relationships: 'Storage continuity and roof-collapse crushing.',
    positions: { expedition: { x: 76, y: 25 }, fieldwork: { x: 79, y: 29 } },
    clue: 'The curve matches the crushed base found under collapsed roofing.',
    supports: { A: 'Supports', B: 'Supports', C: 'Neutral' },
  },
  {
    id: '8',
    name: 'Storage jar base',
    material: 'Local ceramic',
    use: 'Storage',
    location: 'Roof collapse',
    locationId: 'collapse',
    phase: 'III',
    condition: 'Crushed',
    joins: ['7'],
    group: ['storage', 'collapse'],
    relationships: 'Crushed in place during collapse.',
    positions: { expedition: { x: 84, y: 55 }, fieldwork: { x: 82, y: 49 } },
    clue: 'Crush angles match roofing debris, not a clean discard.',
    supports: { A: 'Supports', B: 'Supports', C: 'Complicates' },
  },
  {
    id: '9',
    name: 'Spindle weight A',
    material: 'Fired clay',
    use: 'Textile work',
    location: 'Bench area',
    locationId: 'bench',
    phase: 'II',
    condition: 'Complete',
    joins: ['10'],
    group: ['textile'],
    relationships: 'Textile activity cluster.',
    positions: { expedition: { x: 57, y: 29 }, fieldwork: { x: 55, y: 31 } },
    clue: 'Polished wear around the perforation suggests repeated suspension.',
    supports: { A: 'Neutral', B: 'Supports', C: 'Neutral' },
    closeup: 'spindle',
  },
  {
    id: '10',
    name: 'Spindle weight B',
    material: 'Fired clay',
    use: 'Textile work',
    location: 'Bench area',
    locationId: 'bench',
    phase: 'II',
    condition: 'Chipped',
    joins: ['9'],
    group: ['textile'],
    relationships: 'Textile activity cluster.',
    positions: { expedition: { x: 62, y: 30 }, fieldwork: { x: 59, y: 34 } },
    clue: 'The chip exposes the same clay fabric as the first weight.',
    supports: { A: 'Neutral', B: 'Supports', C: 'Neutral' },
    closeup: 'spindle',
  },
  {
    id: '11',
    name: 'Fiber residue',
    material: 'Plant fiber',
    use: 'Textile production',
    location: 'Bench crack',
    locationId: 'bench',
    phase: 'II',
    condition: 'Trace',
    joins: ['9', '10'],
    group: ['textile'],
    relationships: 'Textile work and possible finishing area.',
    positions: { expedition: { x: 66, y: 33 }, fieldwork: { x: 63, y: 35 } },
    clue: 'Fibers sit in a floor crack sealed before the later pit.',
    supports: { A: 'Neutral', B: 'Supports', C: 'Weakens' },
    requiredTool: 'stabilize',
    fragile: true,
  },
  {
    id: '12',
    name: 'Worn bench plaster',
    material: 'Plaster',
    use: 'Seating/work surface',
    location: 'West wall',
    locationId: 'bench',
    phase: 'II',
    condition: 'Polished wear',
    joins: [],
    group: ['textile', 'repair'],
    relationships: 'Repeated seated labor beside the bench.',
    positions: { expedition: { x: 70, y: 31 }, fieldwork: { x: 68, y: 28 } },
    clue: 'The worn band aligns with a seated working height.',
    supports: { A: 'Neutral', B: 'Supports', C: 'Neutral' },
  },
  {
    id: '13',
    name: 'Imported pigment cup rim',
    material: 'Fine ceramic',
    use: 'Dye or pigment prep',
    location: 'Bench area',
    locationId: 'bench',
    phase: 'II',
    condition: 'Blue stained',
    joins: ['14'],
    group: ['textile', 'trade'],
    relationships: 'Trade and specialist finishing.',
    positions: { expedition: { x: 74, y: 34 }, fieldwork: { x: 70, y: 36 } },
    clue: 'Blue pigment sits inside a fine fabric unlike local pottery.',
    supports: { A: 'Neutral', B: 'Supports', C: 'Complicates' },
    closeup: 'pigment',
  },
  {
    id: '14',
    name: 'Imported pigment cup base',
    material: 'Fine ceramic',
    use: 'Dye or pigment prep',
    location: 'Pit fill',
    locationId: 'pit',
    phase: 'Mixed',
    condition: 'Stained, displaced',
    joins: ['13'],
    group: ['textile', 'disturbance', 'trade'],
    relationships: 'A physical join crossing disturbed contexts.',
    positions: { expedition: { x: 77, y: 48 }, fieldwork: { x: 74, y: 56 } },
    clue: 'It joins the rim, but came from the later pit fill.',
    supports: { A: 'Weakens', B: 'Supports', C: 'Supports' },
    closeup: 'pigment',
  },
  {
    id: '15',
    name: 'Blue pigment flecks',
    material: 'Mineral pigment',
    use: 'Coloring',
    location: 'Bench floor',
    locationId: 'bench',
    phase: 'II',
    condition: 'Scattered',
    joins: ['13', '14'],
    group: ['textile', 'trade'],
    relationships: 'Specialist finishing activity.',
    positions: { expedition: { x: 69, y: 37 }, fieldwork: { x: 66, y: 39 } },
    clue: 'The flecks concentrate near the bench, not the hearth.',
    supports: { A: 'Neutral', B: 'Supports', C: 'Complicates' },
  },
  {
    id: '16',
    name: 'Bent bronze fastener',
    material: 'Metal',
    use: 'Door or chest fitting',
    location: 'Threshold',
    locationId: 'threshold',
    phase: 'III',
    condition: 'Bent',
    joins: ['17'],
    group: ['closure', 'storage'],
    relationships: 'Storage or closure action.',
    positions: { expedition: { x: 48, y: 85 }, fieldwork: { x: 52, y: 82 } },
    clue: 'The bend matches a pulled fitting rather than corrosion alone.',
    supports: { A: 'Supports', B: 'Supports', C: 'Neutral' },
  },
  {
    id: '17',
    name: 'Wooden stain patch',
    material: 'Organic trace',
    use: 'Chest or door timber',
    location: 'Threshold',
    locationId: 'threshold',
    phase: 'III',
    condition: 'Partial',
    joins: ['16'],
    group: ['closure', 'storage'],
    relationships: 'Possible chest, door timber, or closure deposit.',
    positions: { expedition: { x: 52, y: 81 }, fieldwork: { x: 48, y: 79 } },
    clue: 'A rectangular stain survives beside the bronze fastener.',
    supports: { A: 'Supports', B: 'Supports', C: 'Neutral' },
  },
  {
    id: '18',
    name: 'Reused stone block',
    material: 'Stone',
    use: 'Threshold repair',
    location: 'Doorway',
    locationId: 'threshold',
    phase: 'II',
    condition: 'Worn older surface',
    joins: [],
    group: ['repair', 'closure'],
    relationships: 'Architectural repair and reuse.',
    positions: { expedition: { x: 46, y: 89 }, fieldwork: { x: 44, y: 86 } },
    clue: 'One worn face is upside down, reused as packing.',
    supports: { A: 'Neutral', B: 'Supports', C: 'Neutral' },
  },
  {
    id: '19',
    name: 'Ceramic packing fragment',
    material: 'Local ceramic',
    use: 'Threshold packing',
    location: 'Doorway',
    locationId: 'threshold',
    phase: 'II',
    condition: 'Reused',
    joins: [],
    group: ['repair', 'closure'],
    relationships: 'Building repair with discarded ceramic.',
    positions: { expedition: { x: 55, y: 87 }, fieldwork: { x: 58, y: 85 } },
    clue: 'Its edges are rounded from earlier use before being wedged under the threshold.',
    supports: { A: 'Neutral', B: 'Supports', C: 'Neutral' },
  },
  {
    id: '20',
    name: 'Child-sized bead',
    material: 'Blue glass-like paste',
    use: 'Personal ornament',
    location: 'Under threshold edge',
    locationId: 'threshold',
    phase: 'III',
    condition: 'Complete',
    joins: [],
    group: ['closure', 'trade'],
    relationships: 'Deliberate deposit, loss, or curated keepsake.',
    positions: { expedition: { x: 50, y: 77 }, fieldwork: { x: 47, y: 75 } },
    clue: 'The bead is complete and tucked at the repaired threshold edge.',
    supports: { A: 'Complicates', B: 'Supports', C: 'Neutral' },
    closeup: 'bead',
  },
  {
    id: '21',
    name: 'Roof peg fragment A',
    material: 'Wood and metal trace',
    use: 'Roof fixture',
    location: 'Central collapse',
    locationId: 'collapse',
    phase: 'III',
    condition: 'Broken',
    joins: ['22'],
    group: ['collapse'],
    relationships: 'Collapse event.',
    positions: { expedition: { x: 58, y: 53 }, fieldwork: { x: 56, y: 50 } },
    clue: 'The broken grain aligns with another peg fragment.',
    supports: { A: 'Supports', B: 'Neutral', C: 'Neutral' },
    closeup: 'peg',
  },
  {
    id: '22',
    name: 'Roof peg fragment B',
    material: 'Wood and metal trace',
    use: 'Roof fixture',
    location: 'Central collapse',
    locationId: 'collapse',
    phase: 'III',
    condition: 'Broken',
    joins: ['21'],
    group: ['collapse'],
    relationships: 'Physical join from roof collapse.',
    positions: { expedition: { x: 63, y: 57 }, fieldwork: { x: 60, y: 54 } },
    clue: 'It joins the first peg and follows the debris scatter.',
    supports: { A: 'Supports', B: 'Neutral', C: 'Neutral' },
    closeup: 'peg',
  },
  {
    id: '23',
    name: 'Shallow pit edge',
    material: 'Cut feature',
    use: 'Later intrusion',
    location: 'Southeast floor',
    locationId: 'pit',
    phase: 'Later',
    condition: 'Cuts layers',
    joins: [],
    group: ['disturbance'],
    relationships: 'Later disturbance and layer mixing.',
    positions: { expedition: { x: 76, y: 44 }, fieldwork: { x: 71, y: 51 } },
    clue: 'The pit edge slices through the textile floor surface.',
    supports: { A: 'Weakens', B: 'Weakens', C: 'Supports' },
  },
  {
    id: '24',
    name: 'Intrusive glazed fragment',
    material: 'Ceramic',
    use: 'Later vessel',
    location: 'Pit fill',
    locationId: 'pit',
    phase: 'Later',
    condition: 'Clean break',
    joins: [],
    group: ['disturbance'],
    relationships: 'Later occupation material.',
    positions: { expedition: { x: 82, y: 47 }, fieldwork: { x: 78, y: 58 } },
    clue: 'The fabric and glaze are unlike all earlier Riverbend ceramics.',
    supports: { A: 'Weakens', B: 'Weakens', C: 'Supports' },
  },
  {
    id: '25',
    name: 'Reed mat impression',
    material: 'Plaster',
    use: 'Floor covering',
    location: 'Under collapse',
    locationId: 'collapse',
    phase: 'III',
    condition: 'Preserved imprint',
    joins: [],
    group: ['textile', 'closure'],
    relationships: 'Room furnishing and preserved final surface.',
    positions: { expedition: { x: 66, y: 70 }, fieldwork: { x: 63, y: 69 } },
    clue: 'Reed lines are preserved beneath collapsed roofing debris.',
    supports: { A: 'Neutral', B: 'Supports', C: 'Neutral' },
  },
  {
    id: '26',
    name: 'Grinding stone chip',
    material: 'Stone',
    use: 'Food prep or tool maintenance',
    location: 'North wall sweep',
    locationId: 'north',
    phase: 'Mixed',
    condition: 'Worn',
    joins: [],
    group: ['cooking', 'repair'],
    relationships: 'Mixed domestic work and routine maintenance.',
    positions: { expedition: { x: 18, y: 76 }, fieldwork: { x: 21, y: 72 } },
    clue: 'Wear polish is older than the final floor surface.',
    supports: { A: 'Supports', B: 'Neutral', C: 'Complicates' },
  },
];

const interpretations: Interpretation[] = [
  {
    id: 'A',
    label: 'Sudden abandonment after damage',
    claim: 'The room was still in active use when damage or threat caused occupants to leave quickly.',
    evidence: ['Crushed storage jar', 'Roof peg join', 'Objects left near work areas', 'Bent fastener'],
    uncertainty: 'Threshold repair and the bead suggest some deliberate action before closure.',
  },
  {
    id: 'B',
    label: 'Planned closure of a reused workshop',
    claim: 'Occupants intentionally closed or transformed the room after textile work declined.',
    evidence: ['Threshold repair', 'Bead placement', 'Textile cluster', 'Storage near doorway'],
    uncertainty: 'Collapse evidence may reflect later damage, not the closure decision itself.',
  },
  {
    id: 'C',
    label: 'Later disturbance created a false pattern',
    claim: 'The apparent closure pattern is partly misleading because later intrusion mixed earlier materials.',
    evidence: ['Pit cut', 'Intrusive glazed fragment', 'Displaced pigment cup base', 'Moved pot base'],
    uncertainty: 'Many relationships remain spatially coherent outside the disturbed area.',
  },
];

const reconstructionZones = [
  { id: 'hearth', label: 'Hearth use', x: 35, y: 58, groups: ['cooking'], required: 2 },
  { id: 'bench', label: 'Textile bench', x: 66, y: 31, groups: ['textile', 'trade'], required: 3 },
  { id: 'threshold', label: 'Repaired threshold', x: 51, y: 83, groups: ['closure', 'repair'], required: 2 },
  { id: 'pit', label: 'Later pit', x: 78, y: 49, groups: ['disturbance'], required: 1 },
  { id: 'collapse', label: 'Roof collapse', x: 63, y: 61, groups: ['collapse', 'storage'], required: 2 },
];

const fieldworkHistories: FieldworkHistory[] = [
  {
    id: 'threshold',
    name: 'Doorway Ending',
    objective: 'Check whether the repaired doorway, small bead, and bent fitting were one goodbye.',
    detail: 'Delicate doorway clues appear early, while storage pieces are scattered under the fallen roof.',
    scenarioLabel: 'Doorway ending',
    startingFinds: ['16', '17', '18', '19', '20', '21', '22', '7', '8', '23', '24'],
  },
  {
    id: 'intrusion',
    name: 'Messy Corner',
    objective: 'Work out what the messy corner dragged out of place.',
    detail: 'The messy corner is easier to spot, while moved pieces are less certain.',
    scenarioLabel: 'Messy corner',
    startingFinds: ['3', '13', '14', '15', '23', '24', '1', '2', '9', '10', '11'],
  },
  {
    id: 'collapse',
    name: 'Fallen Roof',
    objective: 'Fit the fallen roof clues before deciding if people left in a hurry.',
    detail: 'Fallen fixtures and crushed storage become prominent, but the bead remains ambiguous.',
    scenarioLabel: 'Fallen roof',
    startingFinds: ['7', '8', '21', '22', '25', '16', '17', '1', '2', '4', '20'],
  },
];

const closeupPositions = {
  cooking: '0% 50%',
  pigment: '25% 50%',
  bead: '50% 50%',
  spindle: '75% 50%',
  peg: '100% 50%',
} as const;

const joinPairs: JoinPair[] = [
  { id: 'pot', label: 'Cooking vessel', ids: ['1', '2'], group: 'cooking' },
  { id: 'pigment', label: 'Pigment cup', ids: ['13', '14'], group: 'textile' },
  { id: 'storage', label: 'Storage jar', ids: ['7', '8'], group: 'storage' },
  { id: 'peg', label: 'Roof peg', ids: ['21', '22'], group: 'collapse' },
  { id: 'spindle', label: 'Spindle weight set', ids: ['9', '10'], group: 'textile' },
];

const initialFindState = Object.fromEntries(
  finds.map((find) => [
    find.id,
    {
      exposed: find.id === '1' ? 35 : 0,
      recovered: false,
      stabilized: false,
      cleaned: 0,
      observations: [],
      joinedWith: [],
      groups: [],
      contextQuality: 100,
    },
  ]),
) as Record<string, FindState>;

const STORAGE_KEY = 'riverbend-workshop-state-v1';

type ModelContextTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: unknown) => unknown;
};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }

  interface Document {
    modelContext?: {
      registerTool: (
        tool: ModelContextTool,
        options?: { signal?: AbortSignal },
      ) => void | Promise<void>;
    };
  }
}

function relationScore(value: Find['supports'][keyof Find['supports']]) {
  if (value === 'Supports') return 2;
  if (value === 'Weakens') return -2;
  if (value === 'Complicates') return -1;
  return 0;
}

function confidenceLabel(score: number): Confidence {
  if (score >= 14) return 'Strongly supported';
  if (score >= 8) return 'Plausible';
  if (score >= 2) return 'Speculative';
  if (score <= -4) return 'Contradicted';
  return 'Speculative';
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function toolById(id: Tool) {
  return tools.find((tool) => tool.id === id) ?? tools[0];
}

function groupLabel(group: string) {
  const labels: Record<string, string> = {
    cooking: 'Cooking',
    textile: 'Textile',
    closure: 'Closure',
    disturbance: 'Disturbance',
    collapse: 'Collapse',
    repair: 'Repair',
    storage: 'Storage',
    trade: 'Trade',
  };
  return labels[group] ?? group;
}

function primaryGroups(find: Find) {
  const playableGroups = ['cooking', 'textile', 'closure', 'disturbance', 'collapse'];
  const primary = find.group.filter((group) => playableGroups.includes(group));
  return primary.length ? primary : find.group.slice(0, 1);
}

function visibleClues(find: Find, state: FindState) {
  const unlocked = state.observations.filter(
    (observation) => !observation.startsWith('Grouped as '),
  );
  const base = unlocked.length ? unlocked : [find.clue];
  const status =
    state.contextQuality < 82
      ? ['Too much pressure blurred part of the story.']
      : state.stabilized && find.fragile
        ? ['Fragile trace protected.']
        : [];
  return [...status, ...base].slice(0, 3);
}

function meaningForFind(find: Find) {
  const shortLabels: Record<Interpretation['id'], string> = {
    A: 'sudden leave',
    B: 'planned closure',
    C: 'later disturbance',
  };
  const supported = interpretations
    .filter((interpretation) => find.supports[interpretation.id] === 'Supports')
    .map((interpretation) => shortLabels[interpretation.id])
    .slice(0, 2);
  const complicated = interpretations
    .filter((interpretation) => find.supports[interpretation.id] === 'Weakens' || find.supports[interpretation.id] === 'Complicates')
    .map((interpretation) => shortLabels[interpretation.id])
    .slice(0, 1);
  if (supported.length && complicated.length) {
    return `Helps ${supported.join(' and ')}, but complicates ${complicated[0]}.`;
  }
  if (supported.length) return `Helps ${supported.join(' and ')}.`;
  if (complicated.length) return `This clue is out of place for ${complicated[0]}.`;
  return 'Useful when grouped with nearby clues.';
}

function joinHint(find: Find, findState: Record<string, FindState>) {
  if (!find.joins.length) return 'No matching edge. Use it as a story clue.';
  const recovered = find.joins
    .map((id) => finds.find((item) => item.id === id))
    .filter((item): item is Find => item !== undefined && findState[item.id]?.recovered);
  if (recovered.length) return `Try matching it with ${recovered.map((item) => `#${item.id}`).join(', ')}.`;
  return `The matching piece is still in the dirt.`;
}

function joinHintFromRecovered(find: Find, recoveredFinds: Find[]) {
  if (!find.joins.length) return 'No broken edge to match. Use it as a story clue.';
  const recoveredIds = new Set(recoveredFinds.map((item) => item.id));
  const recovered = find.joins.filter((id) => recoveredIds.has(id));
  if (recovered.length) return `Try matching it with #${recovered[0]}.`;
  return 'The matching piece is still buried.';
}

function reconstructionPrompt(zone: (typeof reconstructionZones)[number], groupedMatches: number, physicallyAnchored: boolean) {
  if (!physicallyAnchored) return 'Fit two pieces first';
  const missing = Math.max(0, zone.required - groupedMatches);
  if (!missing) return 'Ready';
  return `Find ${missing === 1 ? 'one more' : `${missing} more`} ${groupLabel(zone.groups[0]).toLowerCase()} clue${missing === 1 ? '' : 's'}`;
}

function hasGroupedEvidence(findState: Record<string, FindState>, find: Find, group: string) {
  return findState[find.id]?.groups.includes(group);
}

function hasConfirmedJoin(findState: Record<string, FindState>, ids: string[]) {
  return ids.some((id) =>
    findState[id]?.joinedWith.some((other) => ids.includes(other)),
  );
}

function unlockedScreensForState(findState: Record<string, FindState>, placements: Record<string, string>, hasCompletedMainLoop: boolean) {
  const recoveredFinds = finds.filter((find) => findState[find.id]?.recovered);
  const unlocked: Screen[] = ['excavation'];
  if (recoveredFinds.length > 0) unlocked.push('examination');
  if (joinPairs.some((pair) => pair.ids.every((id) => findState[id]?.recovered))) unlocked.push('joins');
  if (finds.some((find) => findState[find.id]?.groups.length)) unlocked.push('reconstruction');
  if (Object.keys(placements).length > 0) unlocked.push('interpretation');
  if (hasCompletedMainLoop) unlocked.push('survey', 'fieldwork');
  return unlocked;
}

function tutorialStepForState(
  findState: Record<string, FindState>,
  placements: Record<string, string>,
  hasCompletedMainLoop: boolean,
): TutorialStep {
  if (hasCompletedMainLoop) return 'freePlay';
  if (Object.keys(placements).length > 0) return 'freePlay';
  if (finds.some((find) => findState[find.id]?.groups.length)) return 'firstBuild';
  if (joinPairs.some((pair) => pair.ids.every((id) => findState[id]?.recovered))) return 'firstMatch';
  if (finds.some((find) => findState[find.id]?.recovered)) return 'firstLook';
  if (findState['1']?.exposed >= 70) return 'firstLift';
  return 'firstBrush';
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>('excavation');
  const [mode, setMode] = useState<'expedition' | 'fieldwork'>('expedition');
  const [activeTool, setActiveTool] = useState<Tool>('brush');
  const [selectedFindId, setSelectedFindId] = useState('1');
  const [excavationFocus, setExcavationFocus] = useState<ExcavationFocus>('hearth');
  const [findState, setFindState] = useState<Record<string, FindState>>(initialFindState);
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [chosenInterpretation, setChosenInterpretation] = useState<'A' | 'B' | 'C'>('B');
  const [guidance, setGuidance] = useState('Something is peeking through by the hearth. Brush it gently.');
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [fieldworkHistoryId, setFieldworkHistoryId] = useState<FieldworkHistory['id']>('threshold');
  const [hasCompletedMainLoop, setHasCompletedMainLoop] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }
      try {
        const parsed = JSON.parse(raw) as {
          screen?: Screen;
          mode?: 'expedition' | 'fieldwork';
          activeTool?: Tool;
          selectedFindId?: string;
          excavationFocus?: ExcavationFocus;
          guidance?: string;
          findState?: Record<string, FindState>;
          placements?: Record<string, string>;
          chosenInterpretation?: 'A' | 'B' | 'C';
          soundEnabled?: boolean;
          fieldworkHistoryId?: FieldworkHistory['id'];
          unlockedScreens?: Screen[];
          tutorialStep?: TutorialStep;
          hasCompletedMainLoop?: boolean;
        };
        const restoredFindState = parsed.findState ?? initialFindState;
        const restoredPlacements = parsed.placements ?? {};
        const restoredComplete = parsed.hasCompletedMainLoop ?? false;
        const restoredUnlocked = parsed.unlockedScreens ?? unlockedScreensForState(restoredFindState, restoredPlacements, restoredComplete);
        setScreen(restoredUnlocked.includes(parsed.screen ?? 'excavation') ? parsed.screen ?? 'excavation' : restoredUnlocked[0]);
        setMode(parsed.mode ?? 'expedition');
        setActiveTool(parsed.activeTool ?? 'brush');
        setSelectedFindId(parsed.selectedFindId ?? '1');
        setExcavationFocus(parsed.excavationFocus ?? 'hearth');
        setFindState(restoredFindState);
        setPlacements(restoredPlacements);
        setChosenInterpretation(parsed.chosenInterpretation ?? 'B');
        setGuidance(parsed.guidance ?? 'Something is peeking through by the hearth. Brush it gently.');
        setSoundEnabled(parsed.soundEnabled ?? true);
        setFieldworkHistoryId(parsed.fieldworkHistoryId ?? 'threshold');
        setHasCompletedMainLoop(restoredComplete);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  const selectedFind = finds.find((find) => find.id === selectedFindId) ?? finds[0];
  const selectedState = findState[selectedFind.id];
  const recoveredFinds = finds.filter((find) => findState[find.id]?.recovered);
  const joinedPairs = useMemo(() => {
    const pairs = new Set<string>();
    finds.forEach((find) => {
      findState[find.id]?.joinedWith.forEach((other) => {
        pairs.add([find.id, other].sort().join('-'));
      });
    });
    return pairs;
  }, [findState]);
  const groupedCount = finds.filter((find) => findState[find.id]?.groups.length).length;
  const placedCount = Object.keys(placements).length;
  const sliceProgress = Math.round(
    (recoveredFinds.length / finds.length) * 35 +
      (joinedPairs.size / 4) * 25 +
      (groupedCount / finds.length) * 20 +
      (placedCount / 5) * 20,
  );

  const interpretationScores = interpretations.map((interpretation) => {
    const score = recoveredFinds.reduce(
      (sum, find) => {
        const contextMultiplier = (findState[find.id]?.contextQuality ?? 100) < 75 ? 0.65 : 1;
        return sum + relationScore(find.supports[interpretation.id]) * contextMultiplier;
      },
      0,
    );
    return {
      ...interpretation,
      score,
      confidence: confidenceLabel(score),
      support: recoveredFinds.filter((find) => find.supports[interpretation.id] === 'Supports'),
      contradictions: recoveredFinds.filter(
        (find) =>
          find.supports[interpretation.id] === 'Weakens' ||
          find.supports[interpretation.id] === 'Complicates',
      ),
    };
  });

  const chosenScore =
    interpretationScores.find((interpretation) => interpretation.id === chosenInterpretation) ??
    interpretationScores[1];
  const activeFieldworkHistory =
    fieldworkHistories.find((history) => history.id === fieldworkHistoryId) ?? fieldworkHistories[0];
  const selectedDigTarget = finds.find(
    (find) => find.id === selectedFindId && find.locationId === excavationFocus && !findState[find.id]?.recovered,
  );
  const nextDigTarget = finds.find((find) => find.locationId === excavationFocus && !findState[find.id]?.recovered);
  const hasDigTarget = Boolean(selectedDigTarget ?? nextDigTarget);
  const activeDigFind = selectedDigTarget ?? nextDigTarget ?? selectedFind;
  const activeDigState = findState[activeDigFind.id];
  const coreComplete =
    recoveredFinds.length >= 11 &&
    joinedPairs.size >= 2 &&
    groupedCount >= 8 &&
    placedCount >= 4;
  const hasCompletedMainLoopNow = hasCompletedMainLoop || coreComplete;
  const unlockedScreens = useMemo(
    () => unlockedScreensForState(findState, placements, hasCompletedMainLoopNow),
    [findState, hasCompletedMainLoopNow, placements],
  );
  const tutorialStep = useMemo(
    () => tutorialStepForState(findState, placements, hasCompletedMainLoopNow),
    [findState, hasCompletedMainLoopNow, placements],
  );

  const recommendedTool: Tool = activeDigFind.fragile && !activeDigState.stabilized ? 'stabilize' : activeDigState.exposed < 70 ? 'brush' : activeDigState.recovered ? 'light' : 'lift';
  const availableTools = useMemo<Tool[]>(() => {
    if (screen !== 'excavation' || !hasDigTarget) return [];
    const toolSet = new Set<Tool>(['brush']);
    if (activeDigState.exposed > 35 || tutorialStep === 'freePlay') toolSet.add('pick');
    if (activeDigFind.fragile && !activeDigState.stabilized) toolSet.add('stabilize');
    if (activeDigState.exposed >= 70 && !activeDigState.recovered) toolSet.add('lift');
    return tools.map((tool) => tool.id).filter((tool) => toolSet.has(tool));
  }, [activeDigFind.fragile, activeDigState.exposed, activeDigState.recovered, activeDigState.stabilized, hasDigTarget, screen, tutorialStep]);
  const currentTool = availableTools.includes(activeTool) ? activeTool : availableTools[0] ?? activeTool;
  const visibleScreens = useMemo(
    () => [
      ...unlockedScreens.filter((item) => item !== 'survey' && item !== 'fieldwork'),
      ...unlockedScreens.filter((item) => item === 'survey' || item === 'fieldwork'),
    ],
    [unlockedScreens],
  );
  const hasLookedAtFirstClue = findState['1']?.cleaned > 0;
  const hasFirstJoin = findState['1']?.joinedWith.includes('2') || findState['2']?.joinedWith.includes('1');
  const hasFirstGroup = findState['1']?.groups.includes('cooking') || findState['2']?.groups.includes('cooking');
  const nextScreen =
    tutorialStep === 'firstLook' && !hasLookedAtFirstClue
      ? 'examination'
      : tutorialStep === 'firstLook'
        ? 'excavation'
      : tutorialStep === 'firstMatch'
        ? 'joins'
        : tutorialStep === 'firstBuild'
          ? 'reconstruction'
          : tutorialStep === 'freePlay'
            ? 'interpretation'
            : 'excavation';
  const nextActionLabel =
    tutorialStep === 'firstBrush'
      ? 'Brush the clue'
      : tutorialStep === 'firstLift'
        ? 'Pick it up'
      : tutorialStep === 'firstLook' && !hasLookedAtFirstClue
        ? 'Look closer'
      : tutorialStep === 'firstLook'
        ? activeDigState.exposed >= 70
          ? 'Pick it up'
          : activeDigState.exposed > 0
            ? 'Brush a little more'
            : 'Brush the next piece'
          : tutorialStep === 'firstMatch'
            ? hasFirstJoin
              ? 'Mark as cooking'
              : 'Match pieces'
            : tutorialStep === 'firstBuild'
              ? 'Build the room'
              : 'Choose the story';
  const headerGuidance =
    screen === 'excavation' && !hasDigTarget
      ? tutorialStep === 'firstBuild'
        ? 'This patch is clear. Build the room from what you found.'
        : tutorialStep === 'firstMatch'
          ? 'This patch is clear. Match the pieces you found.'
          : recoveredFinds.length
            ? 'This patch is clear. Look at your clues or choose another spot.'
            : guidance
      : guidance;
  const excavationDescription = hasDigTarget
    ? `${toolById(currentTool).label} selected. Only this spot is active for now.`
    : 'This patch is clear. No tool needed here right now.';

  function followNextAction() {
    if (tutorialStep === 'firstBrush') {
      if (screen === 'excavation') {
        actOnFind(activeDigFind, 'brush');
      } else {
        setActiveTool('brush');
        setScreen('excavation');
      }
      return;
    }
    if (tutorialStep === 'firstLift') {
      if (screen === 'excavation') {
        actOnFind(activeDigFind, 'lift');
      } else {
        setActiveTool('lift');
        setScreen('excavation');
      }
      return;
    }
    if (tutorialStep === 'firstLook' && !hasLookedAtFirstClue) {
      if (screen === 'examination') {
        inspectFind(selectedFind);
      } else {
        setScreen('examination');
      }
      return;
    }
    if (tutorialStep === 'firstLook') {
      if (screen === 'excavation' && hasDigTarget) {
        actOnFind(activeDigFind, activeDigState.exposed >= 70 ? 'lift' : 'brush');
      } else {
        setScreen('examination');
      }
      return;
    }
    if (tutorialStep === 'firstMatch') {
      if (screen !== 'joins') {
        setScreen('joins');
        return;
      }
      if (!hasFirstJoin) {
        const firstFind = finds.find((find) => find.id === '1') ?? finds[0];
        joinFinds(firstFind);
        return;
      }
      if (!hasFirstGroup) {
        groupFirstCookingPair();
      }
      return;
    }
    if (tutorialStep === 'firstBuild') {
      if (screen !== 'reconstruction') {
        setScreen('reconstruction');
        return;
      }
      placeGroup('hearth');
      return;
    }
    if (tutorialStep === 'freePlay' && screen === 'interpretation') {
      setChosenInterpretation('B');
      if (placedCount > 0) setHasCompletedMainLoop(true);
      setGuidance('Planned closure fits best, but the bead still keeps a little mystery.');
      playCue('place');
      return;
    }
    setScreen(nextScreen);
  }

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        screen: unlockedScreens.includes(screen) ? screen : unlockedScreens[0] ?? 'excavation',
        mode,
        activeTool: currentTool,
        selectedFindId,
        excavationFocus,
        guidance,
        findState,
        placements,
        chosenInterpretation,
        soundEnabled,
        fieldworkHistoryId,
        unlockedScreens,
        tutorialStep,
        hasCompletedMainLoop: hasCompletedMainLoopNow,
      }),
    );
  }, [chosenInterpretation, currentTool, excavationFocus, fieldworkHistoryId, findState, guidance, hasCompletedMainLoopNow, hydrated, mode, placements, screen, selectedFindId, soundEnabled, tutorialStep, unlockedScreens]);

  function updateFind(id: string, patch: Partial<FindState>) {
    setFindState((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  function playCue(cue: SoundCue) {
    if (!soundEnabled) return;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = audioContextRef.current ?? new AudioContextCtor();
    audioContextRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const profiles: Record<SoundCue, { frequency: number; end: number; type: OscillatorType; gain: number }> = {
      brush: { frequency: 180, end: 0.08, type: 'triangle', gain: 0.035 },
      pick: { frequency: 440, end: 0.055, type: 'square', gain: 0.03 },
      stabilize: { frequency: 260, end: 0.12, type: 'sine', gain: 0.025 },
      lift: { frequency: 330, end: 0.11, type: 'sine', gain: 0.035 },
      join: { frequency: 620, end: 0.16, type: 'triangle', gain: 0.04 },
      place: { frequency: 390, end: 0.18, type: 'sine', gain: 0.035 },
      blocked: { frequency: 120, end: 0.08, type: 'sawtooth', gain: 0.025 },
      clean: { frequency: 520, end: 0.09, type: 'triangle', gain: 0.028 },
    };
    const profile = profiles[cue];
    oscillator.type = profile.type;
    oscillator.frequency.setValueAtTime(profile.frequency, context.currentTime);
    gain.gain.setValueAtTime(profile.gain, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + profile.end);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + profile.end);
  }

  function inspectFind(find: Find) {
    const state = findState[find.id];
    updateFind(find.id, {
      cleaned: clamp(state.cleaned + 25),
      observations: [...new Set([...state.observations, find.clue])],
    });
    playCue('clean');
    setGuidance(find.id === '1' ? 'A dark line continues. Find another piece by the hearth.' : find.clue);
    if (find.id === '1') {
      const nextFind = finds.find((item) => item.id === '2');
      if (nextFind) setSelectedFindId(nextFind.id);
      setScreen('excavation');
    }
  }

  function actOnFind(find: Find, toolOverride?: Tool) {
    const state = findState[find.id];
    const tool = toolOverride ?? currentTool;
    const compactContext =
      find.locationId === 'pit' ||
      find.locationId === 'threshold' ||
      find.locationId === 'collapse';
    setSelectedFindId(find.id);
    if (tool === 'brush' || tool === 'pick') {
      const amount = tool === 'brush' ? 20 : compactContext ? 34 : 26;
      const riskPenalty =
        tool === 'pick' && find.fragile && !state.stabilized
          ? 18
          : tool === 'pick' && !compactContext && state.exposed > 45
            ? 8
            : 0;
      const observations = riskPenalty
        ? [...new Set([...state.observations, 'Tool marks reduced contextual certainty'])]
        : state.observations;
      updateFind(find.id, {
        exposed: clamp(state.exposed + amount),
        contextQuality: clamp(state.contextQuality - riskPenalty),
        observations,
      });
      playCue(tool);
      setGuidance(
        state.exposed + amount >= 70
          ? 'Ready. Pick it up.'
          : tool === 'brush'
            ? tutorialStep === 'firstBrush'
              ? 'Edge revealed. Brush a little more.'
              : 'Gentle pass. The edge is clearer.'
            : compactContext
              ? 'Clean tap. Packed soil gives way.'
              : riskPenalty
                ? 'Too much pressure. The clue is still useful, but less sure.'
                : 'Fast scrape. Watch the pressure.',
      );
      return;
    }
    if (tool === 'stabilize') {
      updateFind(find.id, {
        stabilized: true,
        contextQuality: Math.max(state.contextQuality, 92),
        observations: [...new Set([...state.observations, 'Protected before pickup'])],
      });
      playCue('stabilize');
      setGuidance(`${find.name}: fragile trace protected.`);
      return;
    }
    if (tool === 'lift') {
      if (state.exposed < 70) {
        playCue('blocked');
        setGuidance('Not yet. Brush until the edge is ready.');
        return;
      }
      if (find.fragile && !state.stabilized) {
        updateFind(find.id, {
          recovered: true,
          contextQuality: clamp(state.contextQuality - 25),
          observations: [...new Set([...state.observations, 'Recovered with reduced contextual certainty'])],
        });
        playCue('blocked');
        setGuidance(`${find.name} was picked up, but the fragile edge lost clarity.`);
        return;
      }
      updateFind(find.id, { recovered: true, observations: [...new Set([...state.observations, find.clue])] });
      playCue('lift');
      setGuidance(find.id === '1' ? "Nice. Let's look at it." : `${find.name} is in your tray.`);
      return;
    }
    if (tool === 'light') {
      inspectFind(find);
      return;
    }
    if (tool === 'join') {
      if (!state.recovered) {
        playCue('blocked');
        setGuidance('Pick it up first, then try matching it.');
        return;
      }
      setGuidance(joinHint(find, findState));
      setScreen('joins');
    }
  }

  function recoverStarterSet() {
    const starterIds =
      mode === 'fieldwork'
        ? activeFieldworkHistory.startingFinds
        : ['1', '2', '4', '9', '10', '13', '16', '18', '20', '23', '24'];
    setFindState((current) => {
      const next = { ...current };
      starterIds.forEach((id) => {
        const find = finds.find((item) => item.id === id);
        if (!find) return;
        next[id] = {
          ...next[id],
          exposed: 100,
          recovered: true,
          stabilized: find.fragile ? true : next[id].stabilized,
          cleaned: Math.max(next[id].cleaned, 45),
          observations: [...new Set([...next[id].observations, find.clue])],
        };
      });
      return next;
    });
    setGuidance(
      mode === 'fieldwork'
        ? `${activeFieldworkHistory.name} tray is ready. ${activeFieldworkHistory.objective}`
        : 'A practice tray is ready. Try matching two pieces.',
    );
    playCue('lift');
  }

  function joinFinds(find: Find) {
    if (!find.joins.length) {
      setGuidance('No broken edge to match. Use it as an activity clue.');
      playCue('blocked');
      return;
    }
    const availableJoin = find.joins.find((id) => findState[id]?.recovered);
    if (!availableJoin) {
      setGuidance('Another piece is still missing. Keep digging.');
      playCue('blocked');
      return;
    }
    updateFind(find.id, {
      joinedWith: [...new Set([...findState[find.id].joinedWith, availableJoin])],
      observations: [...new Set([...findState[find.id].observations, 'Physical join confirmed'])],
    });
    updateFind(availableJoin, {
      joinedWith: [...new Set([...findState[availableJoin].joinedWith, find.id])],
      observations: [...new Set([...findState[availableJoin].observations, 'Physical join confirmed'])],
    });
    setGuidance(`Click. ${find.name} fits with ${finds.find((item) => item.id === availableJoin)?.name}.`);
    playCue('join');
  }

  function groupFind(find: Find, group: string) {
    updateFind(find.id, {
      groups: [...new Set([...findState[find.id].groups, group])],
    });
    setGuidance(`${find.name} now counts toward ${groupLabel(group)}.`);
    playCue('stabilize');
  }

  function groupFirstCookingPair() {
    ['1', '2'].forEach((id) => {
      updateFind(id, {
        groups: [...new Set([...findState[id].groups, 'cooking'])],
      });
    });
    setGuidance('The joined pot pieces now count toward Cooking.');
    playCue('stabilize');
  }

  function placeGroup(zoneId: string) {
    const zone = reconstructionZones.find((item) => item.id === zoneId);
    if (!zone) return;
    const candidateEvidence = recoveredFinds.filter((find) =>
      zone.groups.some((group) => hasGroupedEvidence(findState, find, group)),
    );
    const physicallyAnchored =
      zone.id === 'hearth'
        ? hasConfirmedJoin(findState, ['1', '2', '3'])
        : zone.id === 'collapse'
          ? hasConfirmedJoin(findState, ['21', '22']) || hasConfirmedJoin(findState, ['7', '8'])
          : true;
    if (candidateEvidence.length < zone.required || !physicallyAnchored) {
      setGuidance(
        reconstructionPrompt(zone, candidateEvidence.length, physicallyAnchored),
      );
      playCue('blocked');
      return;
    }
    setPlacements((current) => ({ ...current, [zoneId]: candidateEvidence[0].id }));
    setGuidance(`${zone.label} takes shape.`);
    playCue('place');
  }

  function saveNow() {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        screen,
        mode,
        activeTool,
        selectedFindId,
        excavationFocus,
        guidance,
        findState,
        placements,
        chosenInterpretation,
        soundEnabled,
        fieldworkHistoryId,
        unlockedScreens,
        tutorialStep,
        hasCompletedMainLoop: hasCompletedMainLoopNow,
      }),
    );
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  function closeContainingMenu(element: HTMLElement) {
    element.closest('details')?.removeAttribute('open');
  }

  function startOver() {
    window.localStorage.removeItem(STORAGE_KEY);
    setMode('expedition');
    setActiveTool('brush');
    setSelectedFindId('1');
    setExcavationFocus('hearth');
    setFindState(initialFindState);
    setPlacements({});
    setChosenInterpretation('B');
    setScreen('excavation');
    setGuidance('Something is peeking through by the hearth. Brush it gently.');
    setFieldworkHistoryId('threshold');
    setHasCompletedMainLoop(false);
    playCue('place');
  }

  function startFieldworkVariation(historyId = fieldworkHistoryId) {
    const history = fieldworkHistories.find((item) => item.id === historyId) ?? fieldworkHistories[0];
    setFieldworkHistoryId(history.id);
    setMode('fieldwork');
    setFindState(initialFindState);
    setPlacements({});
    setChosenInterpretation('B');
    setScreen('excavation');
    setGuidance(`${history.name}: ${history.objective}`);
    playCue('place');
  }

  function returnToExpedition() {
    setMode('expedition');
    setFindState(initialFindState);
    setPlacements({});
    setChosenInterpretation('B');
    setScreen('excavation');
    setGuidance('Something is peeking through by the hearth. Brush it gently.');
    playCue('place');
  }

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: ModelContextTool) => {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal }));
      } catch {
        // WebMCP is optional in unsupported preview surfaces.
      }
    };

    register({
      name: 'read_riverbend_state',
      title: 'Read Riverbend state',
      description: 'Return current progress, mode, selected find, and active interpretation.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => ({
        mode,
        screen,
        activeTool,
        selectedFind: selectedFind.name,
        recovered: recoveredFinds.length,
        progress: sliceProgress,
        interpretation: chosenScore.label,
        confidence: chosenScore.confidence,
      }),
    });

    register({
      name: 'practice_evidence_tray',
      title: 'Skip to test set',
      description: 'Recover a starter set for testing matching, grouping, and building.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => {
        const starterIds =
          mode === 'fieldwork'
            ? activeFieldworkHistory.startingFinds
            : ['1', '2', '4', '9', '10', '13', '16', '18', '20', '23', '24'];
        setFindState((current) => {
          const next = { ...current };
          starterIds.forEach((id) => {
            const find = finds.find((item) => item.id === id);
            if (!find) return;
            next[id] = {
              ...next[id],
              exposed: 100,
              recovered: true,
              stabilized: find.fragile ? true : next[id].stabilized,
              cleaned: Math.max(next[id].cleaned, 45),
              observations: [...new Set([...next[id].observations, find.clue])],
            };
          });
          return next;
        });
        setGuidance(
          mode === 'fieldwork'
            ? `${activeFieldworkHistory.name} tray is ready. ${activeFieldworkHistory.objective}`
            : 'A practice tray is ready. Try matching two pieces.',
        );
        return { recovered: starterIds.length, next: 'Try matching, grouping, building, or choosing a story.' };
      },
    });

    register({
      name: 'choose_site_interpretation',
      title: 'Choose site interpretation',
      description: 'Advance one of the three supported site interpretations.',
      inputSchema: {
        type: 'object',
        properties: {
          interpretationId: { type: 'string', enum: ['A', 'B', 'C'] },
        },
        required: ['interpretationId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => {
        const value =
          input && typeof input === 'object' && 'interpretationId' in input
            ? (input as { interpretationId?: string }).interpretationId
            : undefined;
        if (value !== 'A' && value !== 'B' && value !== 'C') {
          throw new Error('interpretationId must be A, B, or C.');
        }
        setChosenInterpretation(value);
        if (placedCount > 0) setHasCompletedMainLoop(true);
        setScreen('interpretation');
        return { chosen: value };
      },
    });

    register({
      name: 'start_fieldwork_variation',
      title: 'Start practice variation',
      description: 'Switch to an authored practice variation and reset progress.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => {
        setMode('fieldwork');
        setFindState(initialFindState);
        setPlacements({});
        setChosenInterpretation('B');
        setScreen('excavation');
        setGuidance(`${activeFieldworkHistory.name}: ${activeFieldworkHistory.objective}`);
        return { mode: 'fieldwork', history: activeFieldworkHistory.name, next: activeFieldworkHistory.objective };
      },
    });

    return () => lifecycle.abort();
  }, [
    activeTool,
    chosenScore.confidence,
    chosenScore.label,
    mode,
    recoveredFinds.length,
    placedCount,
    screen,
    selectedFind.name,
    sliceProgress,
    fieldworkHistoryId,
    activeFieldworkHistory.name,
    activeFieldworkHistory.objective,
    activeFieldworkHistory.startingFinds,
  ]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-background text-foreground">
      <div className="flex h-full flex-col">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-border bg-card/95 px-3 py-2 shadow-sm sm:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Compass className="size-5 text-primary" aria-hidden="true" />
              <h1 className="truncate text-base font-semibold sm:text-xl">Riverbend Workshop</h1>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Leth River Basin
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              {headerGuidance}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden w-40 sm:block">
              <Progress value={clamp(sliceProgress)} aria-label="Site progress" />
            </div>
            <details className="group/menu relative">
              <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-lg border border-border bg-background transition hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                <Menu className="size-4" aria-hidden="true" />
                <span className="sr-only">Menu</span>
              </summary>
              <div className="absolute right-0 top-10 z-50 w-56 rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Game Menu</p>
                <button
                  type="button"
                  onClick={(event) => {
                    saveNow();
                    closeContainingMenu(event.currentTarget);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Save aria-hidden="true" />
                  {saved ? 'Saved' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    setSoundEnabled((current) => !current);
                    closeContainingMenu(event.currentTarget);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {soundEnabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
                  {soundEnabled ? 'Sound on' : 'Sound off'}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    startOver();
                    closeContainingMenu(event.currentTarget);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Rotate3D aria-hidden="true" />
                  Start over
                </button>
                <div className="my-1 h-px bg-border" />
                <button
                  type="button"
                  onClick={(event) => {
                    recoverStarterSet();
                    closeContainingMenu(event.currentTarget);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Sparkles aria-hidden="true" />
                  Skip to test set
                </button>
              </div>
            </details>
          </div>
        </header>

        <section className={`grid min-h-0 flex-1 grid-cols-1 ${availableTools.length ? 'grid-rows-[1fr_auto] lg:grid-cols-[76px_minmax(0,1fr)_330px]' : 'grid-rows-[1fr] lg:grid-cols-[minmax(0,1fr)_330px]'} lg:grid-rows-1`}>
          <ToolTray
            activeTool={currentTool}
            recommendedTool={recommendedTool}
            availableTools={availableTools}
            onSelect={setActiveTool}
          />

          <div className="min-h-0 overflow-hidden p-2 sm:p-3">
            <Tabs value={screen} onValueChange={(value) => setScreen(value as Screen)} className="h-full">
              <TabsList className="mb-2 flex h-auto w-full gap-1 overflow-x-auto bg-muted/70 p-1">
                {[
                  { value: 'survey', label: 'Map', Icon: Map },
                  { value: 'excavation', label: 'Dig', Icon: Brush },
                  { value: 'examination', label: 'Look', Icon: Search },
                  { value: 'joins', label: 'Match', Icon: Rotate3D },
                  { value: 'reconstruction', label: 'Build', Icon: Layers3 },
                  { value: 'interpretation', label: 'Story', Icon: Lightbulb },
                  { value: 'fieldwork', label: 'Practice', Icon: Archive },
                ].filter(({ value }) => visibleScreens.includes(value as Screen)).map(({ value, label, Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    aria-label={label}
                    className="h-9 min-w-20 gap-1 px-2 text-xs sm:text-sm"
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    <span>{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="survey" className="h-[calc(100%-48px)]">
                <BoardFrame
                  mode={mode}
                  fieldworkLabel={activeFieldworkHistory.scenarioLabel}
                  title="Choose a spot"
                  description="Pick one area to search. The game will show only that area first."
                >
                  <SurveyOverlay onChoose={(target) => {
                    setExcavationFocus(target.locationId);
                    const nextFind =
                      finds.find((find) => find.locationId === target.locationId && !findState[find.id]?.recovered) ??
                      finds.find((find) => find.locationId === target.locationId);
                    if (nextFind) setSelectedFindId(nextFind.id);
                    setScreen('excavation');
                    setGuidance(`${target.label}: brush first. Pick up anything that says ready.`);
                  }} />
                </BoardFrame>
              </TabsContent>

              <TabsContent value="excavation" className="h-[calc(100%-48px)]">
                <BoardFrame
                  mode={mode}
                  fieldworkLabel={activeFieldworkHistory.scenarioLabel}
                  title="Dig here"
                  description={excavationDescription}
                >
                  <FindHotspots
                    mode={mode}
                    activeTool={currentTool}
                    excavationFocus={excavationFocus}
                    tutorialStep={tutorialStep}
                    findState={findState}
                    selectedFindId={selectedFindId}
                    onAct={actOnFind}
                    onSelect={setSelectedFindId}
                  />
                </BoardFrame>
              </TabsContent>

              <TabsContent value="examination" className="h-[calc(100%-48px)]">
                <ExaminationTable
                  find={selectedFind}
                  state={selectedState}
                  findState={findState}
                  onClean={() => inspectFind(selectedFind)}
                  onGroup={groupFind}
                  onJoin={() => {
                    setGuidance(joinHint(selectedFind, findState));
                    setScreen('joins');
                  }}
                />
              </TabsContent>

              <TabsContent value="joins" className="h-[calc(100%-48px)]">
                <JoinWorkspace
                  recoveredFinds={recoveredFinds}
                  findState={findState}
                  onJoin={joinFinds}
                  onGroup={groupFind}
                />
              </TabsContent>

              <TabsContent value="reconstruction" className="h-[calc(100%-48px)]">
                <BoardFrame
                  mode={mode}
                  fieldworkLabel={activeFieldworkHistory.scenarioLabel}
                  title="Build the room"
                  description="Place only the parts your clues can support."
                >
                  <ReconstructionOverlay
                    placements={placements}
                    recoveredFinds={recoveredFinds}
                    findState={findState}
                    onPlace={placeGroup}
                  />
                </BoardFrame>
              </TabsContent>

              <TabsContent value="interpretation" className="h-[calc(100%-48px)]">
                <InterpretationReview
                  scores={interpretationScores}
                  chosen={chosenInterpretation}
                  coreComplete={coreComplete}
                  onChoose={(id) => {
                    setChosenInterpretation(id);
                    if (placedCount > 0) setHasCompletedMainLoop(true);
                  }}
                />
              </TabsContent>

              <TabsContent value="fieldwork" className="h-[calc(100%-48px)]">
                <FieldworkPanel
                  mode={mode}
                  progress={sliceProgress}
                  chosenScore={chosenScore}
                  activeHistory={activeFieldworkHistory}
                  onStart={startFieldworkVariation}
                  onReturn={returnToExpedition}
                />
              </TabsContent>
            </Tabs>
          </div>

          <EvidencePanel
            selectedFind={selectedFind}
            selectedState={selectedState}
            recoveredFinds={recoveredFinds}
            chosenScore={chosenScore}
            coreComplete={coreComplete}
            showCurrentStory={unlockedScreens.includes('interpretation')}
            nextActionLabel={nextActionLabel}
            onNextAction={followNextAction}
            setSelectedFindId={setSelectedFindId}
          />
          <MobileContextDrawer
            selectedFind={selectedFind}
            selectedState={selectedState}
            recoveredFinds={recoveredFinds}
            chosenScore={chosenScore}
            coreComplete={coreComplete}
            showCurrentStory={unlockedScreens.includes('interpretation')}
            nextActionLabel={nextActionLabel}
            onNextAction={followNextAction}
            setSelectedFindId={setSelectedFindId}
          />
        </section>
      </div>
    </main>
  );
}

function ToolTray({
  activeTool,
  recommendedTool,
  availableTools,
  onSelect,
}: {
  activeTool: Tool;
  recommendedTool: Tool;
  availableTools: Tool[];
  onSelect: (tool: Tool) => void;
}) {
  const active = toolById(activeTool);
  const recommended = toolById(recommendedTool);
  const visibleTools = tools.filter((tool) => availableTools.includes(tool.id));
  if (!visibleTools.length) return null;
  return (
    <aside className="order-2 flex min-h-[96px] items-center gap-2 overflow-x-auto border-t border-border bg-card px-2 py-2 lg:order-none lg:min-h-0 lg:flex-col lg:justify-start lg:border-r lg:border-t-0 lg:px-2 lg:pt-3">
      {visibleTools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        const isRecommended = recommendedTool === tool.id && !isActive;
        return (
          <div key={tool.id} className="group relative lg:w-full">
            <button
              type="button"
              aria-pressed={isActive}
              aria-label={`${tool.label}. ${tool.hint}${isRecommended ? ' Recommended now.' : ''}`}
              title={`${tool.label}: ${tool.hint}`}
              onClick={() => onSelect(tool.id)}
              className={`relative flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-md border px-2 text-[11px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:w-full ${
                isActive
                  ? 'translate-y-[-2px] border-primary bg-primary text-primary-foreground shadow-md'
                  : isRecommended
                    ? 'border-sky-600 bg-sky-50 text-sky-950 ring-2 ring-sky-300'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span>{tool.label}</span>
              {isRecommended ? <span className="absolute -right-1 -top-1 size-3 rounded-full bg-sky-500" /> : null}
            </button>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-56 -translate-x-1/2 rounded-md bg-foreground px-3 py-2 text-xs text-background shadow-lg group-focus-within:block group-hover:block lg:bottom-auto lg:left-full lg:top-1/2 lg:ml-2 lg:-translate-x-0 lg:-translate-y-1/2">
              <span className="font-semibold">{tool.label}:</span> {tool.hint}
            </span>
          </div>
        );
      })}
      <div className="min-w-[220px] rounded-md border border-border bg-background px-3 py-2 text-xs lg:min-w-0">
        <p className="font-semibold">{active.label}</p>
        <p className="mt-0.5 text-muted-foreground">{active.bestUse}</p>
        {availableTools.includes(recommendedTool) && activeTool !== recommendedTool ? (
          <p className="mt-1 text-sky-800">Try {recommended.label}: {recommended.hint}</p>
        ) : null}
      </div>
    </aside>
  );
}

function BoardFrame({
  children,
  mode,
  fieldworkLabel,
  title,
  description,
}: {
  children: ReactNode;
  mode: 'expedition' | 'fieldwork';
  fieldworkLabel?: string;
  title: string;
  description: string;
}) {
  return (
    <section className="relative h-full overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="absolute left-3 top-3 z-20 max-w-[min(520px,calc(100%-24px))] rounded-md border border-white/60 bg-black/45 px-3 py-2 text-white backdrop-blur-sm">
        <h2 className="text-sm font-semibold sm:text-base">{title}</h2>
        <p className="mt-0.5 text-xs text-white/82 sm:text-sm">{description}</p>
      </div>
      <Image
        className="absolute inset-0 size-full object-cover"
        src="/assets/riverbend-workshop.png"
        alt="Illustrated top-down workshop excavation with hearth, bench, threshold, and disturbance pit."
        fill
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_20%,rgb(26_22_17/0.16)_100%)]" />
      {mode === 'fieldwork' ? (
        <div className="absolute right-3 top-3 z-20 rounded-md border border-amber-100 bg-amber-50/95 px-3 py-1.5 text-xs font-semibold text-amber-950">
          {fieldworkLabel ?? 'Practice setup'}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function SurveyOverlay({ onChoose }: { onChoose: (target: { label: string; locationId: ExcavationFocus }) => void }) {
  const areas = [
    { label: 'Hearth', locationId: 'hearth' as const, x: 36, y: 56 },
    { label: 'Work bench', locationId: 'bench' as const, x: 66, y: 31 },
    { label: 'Doorway', locationId: 'threshold' as const, x: 51, y: 84 },
    { label: 'Messy corner', locationId: 'pit' as const, x: 78, y: 48 },
  ];
  return (
    <div className="absolute inset-0">
      {areas.map((area) => (
        <button
          key={area.label}
          type="button"
          onClick={() => onChoose(area)}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-white/80 bg-emerald-900/50 px-3 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-[2px] transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          style={{ left: `${area.x}%`, top: `${area.y}%` }}
        >
          {area.label}
        </button>
      ))}
    </div>
  );
}

function FindHotspots({
  mode,
  activeTool,
  excavationFocus,
  tutorialStep,
  findState,
  selectedFindId,
  onAct,
  onSelect,
}: {
  mode: 'expedition' | 'fieldwork';
  activeTool: Tool;
  excavationFocus: ExcavationFocus;
  tutorialStep: TutorialStep;
  findState: Record<string, FindState>;
  selectedFindId: string;
  onAct: (find: Find) => void;
  onSelect: (id: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const dragTool = activeTool === 'brush' || activeTool === 'pick';
  const selectedFocus = finds.find((find) => {
    const state = findState[find.id];
    return find.id === selectedFindId && find.locationId === excavationFocus && !state.recovered;
  });
  const nextFocus =
    selectedFocus ??
    finds.find((find) => {
      const state = findState[find.id];
      return find.locationId === excavationFocus && !state.recovered;
    });
  return (
    <div
      className={`absolute inset-0 ${dragTool ? 'touch-none cursor-crosshair' : ''}`}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onPointerLeave={() => setDragging(false)}
    >
      {finds.map((find) => {
        const state = findState[find.id];
        const pos = find.positions[mode];
        const visible =
          find.id === nextFocus?.id ||
          selectedFindId === find.id ||
          (find.locationId === excavationFocus && (state.exposed > 0 || state.recovered));
        const certaintyRisk = state.contextQuality < 82;
        const clearingScale = 1.35 - state.exposed / 120;
        const tutorialTarget = tutorialStep !== 'freePlay' && find.id === '1' && !state.recovered;
        if (!visible) return null;
        return (
          <button
            key={find.id}
            type="button"
            onPointerDown={(event) => {
              if (!dragTool || state.recovered) return;
              event.preventDefault();
              setDragging(true);
              onAct(find);
            }}
            onPointerEnter={() => {
              if (dragging && dragTool && !state.recovered) onAct(find);
            }}
            onClick={() => {
              if (state.recovered) {
                onSelect(find.id);
                return;
              }
              if (!dragTool) onAct(find);
            }}
            aria-label={`${find.name}, ${state.exposed}% clear, ${state.recovered ? 'found' : 'in soil'}`}
            disabled={false}
            className={`group/hotspot absolute z-10 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 text-xs font-bold shadow-lg transition duration-150 hover:z-20 hover:scale-110 hover:border-cyan-100 hover:shadow-xl active:scale-95 focus-visible:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              tutorialTarget ? 'size-14 animate-pulse sm:size-16' : 'size-9 sm:size-10'
            } ${
              state.recovered
                ? 'border-emerald-100 bg-emerald-700 text-white opacity-85 hover:opacity-100'
                : selectedFindId === find.id
                  ? 'border-white bg-sky-700 text-white ring-4 ring-sky-300'
                  : 'border-white/90 bg-stone-900/65 text-white'
            }`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
            }}
          >
            {!state.recovered ? (
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute -inset-5 rounded-full border shadow-inner transition-all duration-300 ${
                  certaintyRisk
                    ? 'border-rose-200/90 bg-rose-900/25 shadow-rose-950/50'
                    : state.stabilized
                      ? 'border-emerald-100/80 bg-emerald-200/20 shadow-emerald-950/30'
                      : 'border-amber-100/70 bg-stone-900/38 shadow-stone-950/60'
                }`}
                style={{
                  transform: `scale(${Math.max(0.45, clearingScale)})`,
                  opacity: clamp(100 - state.exposed, 8, 82) / 100,
                }}
              />
            ) : null}
            {state.recovered ? <CheckCircle2 className="size-5" aria-hidden="true" /> : find.id}
            {tutorialTarget ? (
              <span className="absolute left-1/2 top-full mt-2 min-w-28 -translate-x-1/2 rounded-md border border-white/75 bg-black/65 px-2 py-1 text-center text-xs text-white">
                {state.exposed >= 70 ? 'Pick it up' : 'Brush here'}
              </span>
            ) : null}
            {!tutorialTarget ? (
              <span className="pointer-events-none absolute left-1/2 top-full mt-2 min-w-24 -translate-x-1/2 rounded-md border border-white/70 bg-black/70 px-2 py-1 text-center text-[11px] text-white opacity-0 shadow-lg transition group-hover/hotspot:opacity-100 group-focus-visible/hotspot:opacity-100">
                {state.recovered ? 'Found' : state.exposed >= 70 ? 'Pick up' : 'Brush'}
              </span>
            ) : null}
            <span
              className="absolute -bottom-1 left-1/2 h-1 -translate-x-1/2 rounded-full bg-white/90"
              style={{ width: `${Math.max(8, state.exposed / 2)}%` }}
            />
            {!state.recovered && (state.stabilized || certaintyRisk) ? (
              <span className={`absolute -right-2 -top-2 rounded px-1 text-[10px] ${certaintyRisk ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
                {certaintyRisk ? 'risk' : 'safe'}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function ExaminationTable({
  find,
  state,
  findState,
  onClean,
  onGroup,
  onJoin,
}: {
  find: Find;
  state: FindState;
  findState: Record<string, FindState>;
  onClean: () => void;
  onGroup: (find: Find, group: string) => void;
  onJoin: () => void;
}) {
  const clues = visibleClues(find, state);
  const groups = primaryGroups(find);
  return (
    <section className="grid h-full gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_280px]">
      <div className="relative min-h-0 overflow-hidden rounded-lg border border-border bg-[radial-gradient(circle_at_45%_35%,#efe0be,#9c7850_58%,#33291f)]">
        <div className="absolute left-4 top-4 rounded-md bg-black/45 px-3 py-2 text-white">
          <h2 className="text-base font-semibold">{find.name}</h2>
          <p className="text-xs text-white/80">{find.location} · Phase {find.phase}</p>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative flex aspect-square w-[min(58vh,70vw)] max-w-[440px] items-end justify-center overflow-hidden rounded-lg border border-black/25 bg-stone-900 bg-[length:500%_100%] bg-no-repeat shadow-2xl transition-transform duration-500"
            style={{ transform: `rotate(${state.cleaned * 1.2}deg)` }}
          >
            <div
              className="absolute inset-0 bg-[url('/assets/riverbend-artifact-closeups.png')] bg-[length:500%_100%] bg-no-repeat transition-[filter] duration-300"
              style={{
                backgroundPosition: find.closeup ? closeupPositions[find.closeup] : '0% 50%',
                filter: `contrast(${0.85 + state.cleaned / 350}) saturate(${0.75 + state.cleaned / 320}) brightness(${0.65 + state.cleaned / 240})`,
              }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(145deg,rgb(255_244_214/0.22),transparent_35%,rgb(0_0_0/0.35))]" />
            <div className="z-10 mb-4 rounded-md border border-white/40 bg-black/48 px-3 py-2 text-center text-sm font-semibold text-white backdrop-blur-sm">
              {find.material}
              <br />
              <span className="text-xs font-normal">{state.cleaned}% readable</span>
            </div>
          </div>
        </div>
      </div>
      <aside className="min-h-0 overflow-auto rounded-lg border border-border bg-background p-3">
        <h3 className="font-semibold">Inspect The Clue</h3>
        <div className="mt-3 grid gap-2">
          <section className="rounded-md border border-border bg-card p-3">
            <h4 className="text-sm font-semibold">What you can see</h4>
            <div className="mt-2 space-y-1">
              {clues.map((clue) => (
                <p key={clue} className="rounded bg-muted px-2 py-1.5 text-sm">
                  {clue}
                </p>
              ))}
            </div>
          </section>
          <section className="rounded-md border border-border bg-card p-3">
            <h4 className="text-sm font-semibold">What it fits</h4>
            <p className="mt-2 text-sm text-muted-foreground">{joinHint(find, findState)}</p>
            <Button className="mt-3 w-full" size="sm" variant="outline" onClick={onJoin}>
              <Rotate3D aria-hidden="true" />
              Try the bench
            </Button>
          </section>
          <section className="rounded-md border border-border bg-card p-3">
            <h4 className="text-sm font-semibold">What it might mean</h4>
            <p className="mt-2 text-sm text-muted-foreground">{meaningForFind(find)}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {groups.map((group) => (
                <Button key={group} size="xs" variant="secondary" onClick={() => onGroup(find, group)}>
                  {groupLabel(group)}
                </Button>
              ))}
            </div>
          </section>
        </div>
        <Button className="mt-4 w-full" onClick={onClean}>
          <Eye aria-hidden="true" />
          Shine lamp
        </Button>
        <details className="mt-4 rounded-md border border-border bg-muted p-3 text-sm">
          <summary className="cursor-pointer font-semibold">Field notes</summary>
          <dl className="mt-3 grid grid-cols-[76px_1fr] gap-2 text-xs">
            <dt className="text-muted-foreground">Use</dt>
            <dd>{find.use}</dd>
            <dt className="text-muted-foreground">Material</dt>
            <dd>{find.material}</dd>
            <dt className="text-muted-foreground">Context</dt>
            <dd>{find.location}</dd>
            <dt className="text-muted-foreground">Phase</dt>
            <dd>{find.phase}</dd>
            <dt className="text-muted-foreground">Detail</dt>
            <dd>{find.relationships}</dd>
          </dl>
        </details>
      </aside>
    </section>
  );
}

function JoinWorkspace({
  recoveredFinds,
  findState,
  onJoin,
  onGroup,
}: {
  recoveredFinds: Find[];
  findState: Record<string, FindState>;
  onJoin: (find: Find) => void;
  onGroup: (find: Find, group: string) => void;
}) {
  const recoveredIds = new Set(recoveredFinds.map((find) => find.id));
  const pairOptions = joinPairs.filter((pair) => pair.ids.every((id) => recoveredIds.has(id)));
  const [activePairId, setActivePairId] = useState(pairOptions[0]?.id ?? joinPairs[0].id);
  const [groupingFindId, setGroupingFindId] = useState(recoveredFinds[0]?.id ?? '1');
  const activePair = pairOptions.find((pair) => pair.id === activePairId) ?? pairOptions[0] ?? joinPairs[0];
  const pairFinds = activePair.ids.map((id) => finds.find((find) => find.id === id) ?? finds[0]) as [Find, Find];
  const groupingFind = recoveredFinds.find((find) => find.id === groupingFindId) ?? recoveredFinds[0];
  const [transforms, setTransforms] = useState<Record<string, FragmentTransform>>({
    [activePair.ids[0]]: { x: 28, y: 50, rotation: -16 },
    [activePair.ids[1]]: { x: 68, y: 50, rotation: 18 },
  });
  const firstTransform = transforms[activePair.ids[0]] ?? { x: 28, y: 50, rotation: -16 };
  const secondTransform = transforms[activePair.ids[1]] ?? { x: 68, y: 50, rotation: 18 };
  const distance = Math.hypot(firstTransform.x - 46, firstTransform.y - 50) + Math.hypot(secondTransform.x - 54, secondTransform.y - 50);
  const rotationGap = Math.abs(firstTransform.rotation + secondTransform.rotation);
  const snapReady = distance < 18 && rotationGap < 22;
  const alreadyJoined = findState[activePair.ids[0]]?.joinedWith.includes(activePair.ids[1]);

  function moveFragment(id: string, patch: Partial<FragmentTransform>) {
    setTransforms((current) => {
      const existing = current[id] ?? { x: id === activePair.ids[0] ? 28 : 68, y: 50, rotation: 0 };
      return {
        ...current,
        [id]: {
          ...existing,
          ...patch,
          x: clamp(patch.x ?? existing.x, 12, 88),
          y: clamp(patch.y ?? existing.y, 20, 82),
        },
      };
    });
  }

  function snapPair() {
    if (!pairOptions.length) return;
    if (!snapReady && !alreadyJoined) {
      moveFragment(activePair.ids[0], { x: 42, y: 50, rotation: -8 });
      moveFragment(activePair.ids[1], { x: 58, y: 50, rotation: 8 });
      return;
    }
    onJoin(pairFinds[0]);
    activePair.ids.forEach((id) => moveFragment(id, { x: id === activePair.ids[0] ? 46 : 54, y: 50, rotation: 0 }));
  }

  return (
    <section className="grid h-full gap-3 overflow-hidden rounded-lg border border-border bg-card p-3 md:grid-cols-[minmax(0,1fr)_310px]">
      <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-lg border border-border bg-background p-3">
        <h2 className="text-base font-semibold">Piece-Matching Table</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag and turn two pieces toward the pale outline. When the edges touch, lock them together.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {joinPairs.map((pair) => {
            const available = pair.ids.every((id) => recoveredIds.has(id));
            const joined = findState[pair.ids[0]]?.joinedWith.includes(pair.ids[1]);
            return (
              <Button
                key={pair.id}
                size="sm"
                variant={activePair.id === pair.id ? 'default' : 'outline'}
                disabled={!available}
                onClick={() => setActivePairId(pair.id)}
              >
                {joined ? <CheckCircle2 aria-hidden="true" /> : <Rotate3D aria-hidden="true" />}
                {pair.label}
                <span className="sr-only">{groupLabel(pair.group)}</span>
              </Button>
            );
          })}
        </div>
        <div className="relative mt-3 min-h-0 overflow-hidden rounded-md border border-border bg-[radial-gradient(circle_at_50%_50%,#433427,#171411)]">
          <div className="absolute left-1/2 top-1/2 h-28 w-48 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed border-cyan-100/70 bg-cyan-100/10" />
          <div className="absolute left-1/2 top-[calc(50%+68px)] -translate-x-1/2 rounded bg-black/45 px-2 py-1 text-xs text-white">
            {alreadyJoined ? 'Pieces fit' : snapReady ? 'Edges line up' : 'Move both pieces into the outline'}
          </div>
          {pairFinds.map((find, index) => {
            const transform = index === 0 ? firstTransform : secondTransform;
            return (
              <FragmentPiece
                key={find.id}
                find={find}
                transform={transform}
                onMove={(next) => moveFragment(find.id, next)}
              />
            );
          })}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="grid grid-cols-4 gap-1">
            {pairFinds.map((find) => (
              <div key={find.id} className="rounded-md bg-muted p-2 text-xs">
                <span className="font-semibold">#{find.id}</span> {find.name}
              </div>
            ))}
          </div>
          <Button onClick={snapPair} disabled={!pairOptions.length}>
            <Rotate3D aria-hidden="true" />
            {snapReady || alreadyJoined ? 'Lock pieces' : 'Move into outline'}
          </Button>
        </div>
        <div className="mt-3 rounded-md border border-border bg-card p-2">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">Story clue</h3>
          {groupingFind ? (
            <>
              <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                {recoveredFinds.map((find) => (
                  <Button
                    key={find.id}
                    size="xs"
                    variant={groupingFind.id === find.id ? 'default' : 'outline'}
                    onClick={() => setGroupingFindId(find.id)}
                  >
                    #{find.id}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-sm font-medium">{groupingFind.name}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {primaryGroups(groupingFind).map((group) => (
                  <Button key={group} size="xs" variant="secondary" onClick={() => onGroup(groupingFind, group)}>
                    {groupLabel(group)}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Pick up a clue before grouping it.</p>
          )}
          </div>
      </div>
      <aside className="min-h-0 overflow-auto rounded-lg border border-border bg-background p-3">
        <h3 className="font-semibold">Pieces That Fit</h3>
        <div className="mt-3 space-y-3 text-sm">
          <Relationship label="Cooking vessel" ids={['1', '2', '3']} findState={findState} />
          <Relationship label="Pigment cup" ids={['13', '14']} findState={findState} />
          <Relationship label="Roof peg" ids={['21', '22']} findState={findState} />
          <Relationship label="Textile activity" ids={['9', '10', '11', '12', '15']} findState={findState} />
          <Relationship label="Threshold closure" ids={['16', '17', '18', '19', '20']} findState={findState} />
        </div>
      </aside>
    </section>
  );
}

function FragmentPiece({
  find,
  transform,
  onMove,
}: {
  find: Find;
  transform: FragmentTransform;
  onMove: (transform: Partial<FragmentTransform>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${find.name} movable fragment`}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 8 : 4;
        if (event.key === 'ArrowLeft') onMove({ x: transform.x - step });
        if (event.key === 'ArrowRight') onMove({ x: transform.x + step });
        if (event.key === 'ArrowUp') onMove({ y: transform.y - step });
        if (event.key === 'ArrowDown') onMove({ y: transform.y + step });
        if (event.key === '[') onMove({ rotation: transform.rotation - 8 });
        if (event.key === ']') onMove({ rotation: transform.rotation + 8 });
      }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const rect = event.currentTarget.parentElement?.getBoundingClientRect();
        if (!rect) return;
        onMove({
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        });
      }}
      className="absolute z-10 flex aspect-[1.25/1] w-[min(27vw,190px)] -translate-x-1/2 -translate-y-1/2 touch-none items-end justify-center overflow-hidden rounded-[42%_58%_48%_52%] border border-white/45 bg-stone-900 bg-[url('/assets/riverbend-artifact-closeups.png')] bg-[length:500%_100%] bg-no-repeat p-2 shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      style={{
        left: `${transform.x}%`,
        top: `${transform.y}%`,
        transform: `translate(-50%, -50%) rotate(${transform.rotation}deg)`,
        backgroundPosition: find.closeup ? closeupPositions[find.closeup] : '0% 50%',
      }}
    >
      <span className="rounded bg-black/55 px-2 py-1 text-xs font-semibold text-white">#{find.id}</span>
      <span className="absolute right-1 top-1 rounded bg-black/55 px-1 text-[10px] text-white">
        arrows move, [ ] rotate
      </span>
    </button>
  );
}

function Relationship({
  label,
  ids,
  findState,
}: {
  label: string;
  ids: string[];
  findState: Record<string, FindState>;
}) {
  const recovered = ids.filter((id) => findState[id]?.recovered).length;
  const grouped = ids.filter((id) => findState[id]?.groups.length || findState[id]?.joinedWith.length).length;
  return (
    <div className="rounded-md bg-muted p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{grouped}/{ids.length}</span>
      </div>
      <Progress value={(grouped / ids.length) * 100} aria-label={`${label} relationship progress`} className="mt-2" />
      <p className="mt-2 text-xs text-muted-foreground">{recovered} pieces recovered</p>
    </div>
  );
}

function ReconstructionOverlay({
  placements,
  recoveredFinds,
  findState,
  onPlace,
}: {
  placements: Record<string, string>;
  recoveredFinds: Find[];
  findState: Record<string, FindState>;
  onPlace: (zoneId: string) => void;
}) {
  return (
    <div className="absolute inset-0">
      <ReconstructionStage zoneId="hearth" placed={Boolean(placements.hearth)} />
      <ReconstructionStage zoneId="bench" placed={Boolean(placements.bench)} />
      <ReconstructionStage zoneId="threshold" placed={Boolean(placements.threshold)} />
      <ReconstructionStage zoneId="pit" placed={Boolean(placements.pit)} />
      <ReconstructionStage zoneId="collapse" placed={Boolean(placements.collapse)} />
      {reconstructionZones.map((zone) => {
        const placed = Boolean(placements[zone.id]);
        const groupedMatches = recoveredFinds.filter((find) =>
          zone.groups.some((group) => hasGroupedEvidence(findState, find, group)),
        ).length;
        const physicallyAnchored =
          zone.id === 'hearth'
            ? hasConfirmedJoin(findState, ['1', '2', '3'])
            : zone.id === 'collapse'
              ? hasConfirmedJoin(findState, ['21', '22']) || hasConfirmedJoin(findState, ['7', '8'])
              : true;
        const ready = groupedMatches >= zone.required && physicallyAnchored;
        const prompt = reconstructionPrompt(zone, groupedMatches, physicallyAnchored);
        return (
          <button
            key={zone.id}
            type="button"
            onClick={() => onPlace(zone.id)}
            className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 px-3 py-2 text-sm font-semibold shadow-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              placed
                ? 'border-cyan-100 bg-cyan-500/35 text-white ring-4 ring-cyan-200/60'
                : ready
                  ? 'border-emerald-100 bg-emerald-700/55 text-white backdrop-blur-[2px] hover:bg-emerald-800/65'
                : 'border-white/80 bg-black/45 text-white backdrop-blur-[2px] hover:bg-black/60'
            }`}
            style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
          >
            {placed ? 'Echo: ' : 'Place: '}
            {zone.label}
            <span className="ml-2 rounded bg-black/25 px-1.5 py-0.5 text-xs normal-case">
              {prompt}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ReconstructionStage({ zoneId, placed }: { zoneId: string; placed: boolean }) {
  if (!placed) return null;
  const stageClass =
    zoneId === 'hearth'
      ? 'left-[23%] top-[45%] h-[24%] w-[24%] rounded-full border-orange-100/70 bg-orange-500/22 shadow-[0_0_70px_rgb(251_146_60/0.55)]'
      : zoneId === 'bench'
        ? 'left-[54%] top-[19%] h-[18%] w-[30%] rounded-md border-sky-100/70 bg-sky-500/20 shadow-[0_0_55px_rgb(56_189_248/0.45)]'
        : zoneId === 'threshold'
          ? 'left-[42%] top-[76%] h-[12%] w-[23%] rounded-md border-emerald-100/80 bg-emerald-500/24 shadow-[0_0_50px_rgb(16_185_129/0.5)]'
          : zoneId === 'pit'
            ? 'left-[69%] top-[38%] h-[21%] w-[18%] rounded-[48%] border-rose-100/80 bg-rose-600/22 shadow-[0_0_50px_rgb(244_63_94/0.45)]'
            : 'left-[49%] top-[45%] h-[30%] w-[30%] -rotate-12 rounded-md border-stone-100/80 bg-stone-700/30 shadow-[0_0_60px_rgb(214_211_209/0.35)]';
  const labels: Record<string, string> = {
    hearth: 'Phase I hearth use',
    bench: 'Phase II textile bench',
    threshold: 'Phase III threshold closure',
    pit: 'Later cut through floor',
    collapse: 'Roof collapse layer',
  };
  return (
    <div
      className={`pointer-events-none absolute z-[5] border-2 backdrop-blur-[1px] transition-opacity ${stageClass}`}
      aria-hidden="true"
    >
      <span className="absolute left-2 top-2 rounded bg-black/52 px-2 py-1 text-xs font-semibold text-white">
        {labels[zoneId]}
      </span>
      {zoneId === 'collapse' ? (
        <div className="absolute inset-5 grid rotate-12 grid-cols-3 gap-2 opacity-75">
          <span className="rounded bg-stone-200/60" />
          <span className="rounded bg-stone-200/45" />
          <span className="rounded bg-stone-200/55" />
        </div>
      ) : null}
      {zoneId === 'bench' ? (
        <div className="absolute inset-x-5 bottom-4 h-4 rounded bg-cyan-100/55" />
      ) : null}
      {zoneId === 'hearth' ? (
        <div className="absolute inset-[28%] rounded-full border-[10px] border-orange-100/50 bg-black/25" />
      ) : null}
    </div>
  );
}

function InterpretationReview({
  scores,
  chosen,
  coreComplete,
  onChoose,
}: {
  scores: (Interpretation & {
    score: number;
    confidence: Confidence;
    support: Find[];
    contradictions: Find[];
  })[];
  chosen: 'A' | 'B' | 'C';
  coreComplete: boolean;
  onChoose: (id: 'A' | 'B' | 'C') => void;
}) {
  return (
    <section className="grid h-full gap-3 overflow-hidden rounded-lg border border-border bg-card p-3 lg:grid-cols-3">
      {coreComplete ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 lg:col-span-3">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Site assessment ready</h2>
              <p className="mt-1 text-sm">
                You have enough clues to make a call. Pick the story that fits, then keep one doubt alive.
              </p>
            </div>
          </div>
        </div>
      ) : null}
      {scores.map((interpretation) => (
        <article
          key={interpretation.id}
          className={`min-h-0 overflow-auto rounded-lg border p-4 ${
            chosen === interpretation.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold">{interpretation.label}</h2>
            <Badge variant={chosen === interpretation.id ? 'default' : 'outline'}>
              {interpretation.confidence}
            </Badge>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{interpretation.claim}</p>
          <Button className="mt-4 w-full" variant={chosen === interpretation.id ? 'default' : 'outline'} onClick={() => onChoose(interpretation.id)}>
            Advance this reading
          </Button>
          <h3 className="mt-4 text-sm font-semibold">Why it works</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {interpretation.support.slice(0, 3).map((find) => (
              <li key={find.id}>#{find.id} {find.name}</li>
            ))}
            {!interpretation.support.length ? <li className="text-muted-foreground">Recover more evidence.</li> : null}
          </ul>
          <h3 className="mt-4 text-sm font-semibold">What nags at it</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {interpretation.contradictions.slice(0, 2).map((find) => (
              <li key={find.id}>#{find.id} {find.name}</li>
            ))}
            {!interpretation.contradictions.length ? <li className="text-muted-foreground">Nothing recovered yet pushes back.</li> : null}
          </ul>
          <p className="mt-4 rounded-md bg-muted p-3 text-sm">{interpretation.uncertainty}</p>
        </article>
      ))}
    </section>
  );
}

function FieldworkPanel({
  mode,
  progress,
  chosenScore,
  activeHistory,
  onStart,
  onReturn,
}: {
  mode: 'expedition' | 'fieldwork';
  progress: number;
  chosenScore: Interpretation & { confidence: Confidence; score: number };
  activeHistory: FieldworkHistory;
  onStart: (historyId: FieldworkHistory['id']) => void;
  onReturn: () => void;
}) {
  return (
    <section className="grid h-full gap-3 overflow-hidden rounded-lg border border-border bg-card p-3 md:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-lg border border-border bg-background p-5">
        <h2 className="text-xl font-semibold">Practice Digs</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Try the same room with a different first clue. Each setup changes what feels important.
        </p>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {fieldworkHistories.map((history) => (
            <article
              key={history.id}
              className={`rounded-md border p-3 text-sm ${
                mode === 'fieldwork' && activeHistory.id === history.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-muted'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{history.name}</h3>
                <Badge variant={activeHistory.id === history.id ? 'default' : 'outline'}>{history.scenarioLabel}</Badge>
              </div>
              <p className="mt-2 text-muted-foreground">{history.objective}</p>
              <p className="mt-2">{history.detail}</p>
              <Button className="mt-3 w-full" size="sm" onClick={() => onStart(history.id)}>
                <CircleDashed aria-hidden="true" />
                Start
              </Button>
            </article>
          ))}
        </div>
        <Button className="mt-5" variant="outline" onClick={mode === 'fieldwork' ? onReturn : () => onStart(activeHistory.id)}>
          <CircleDashed aria-hidden="true" />
          {mode === 'fieldwork' ? 'Return to main dig' : 'Start selected practice'}
        </Button>
      </div>
      <aside className="rounded-lg border border-border bg-background p-5">
        <h3 className="font-semibold">Current Site Reading</h3>
        <p className="mt-2 text-sm text-muted-foreground">{chosenScore.label}</p>
        <Badge className="mt-3">{chosenScore.confidence}</Badge>
        <Progress value={progress} aria-label="Overall site progress" className="mt-4" />
        <p className="mt-3 text-sm">
          Planned closure can become strongly supported, but the bead remains a meaningful uncertainty rather than a solved prize.
        </p>
      </aside>
    </section>
  );
}

function EvidencePanel({
  selectedFind,
  selectedState,
  recoveredFinds,
  chosenScore,
  coreComplete,
  showCurrentStory,
  nextActionLabel,
  onNextAction,
  setSelectedFindId,
}: {
  selectedFind: Find;
  selectedState: FindState;
  recoveredFinds: Find[];
  chosenScore: Interpretation & { confidence: Confidence; score: number };
  coreComplete: boolean;
  showCurrentStory: boolean;
  nextActionLabel: string;
  onNextAction: () => void;
  setSelectedFindId: (id: string) => void;
}) {
  return (
    <aside className="hidden min-h-0 border-l border-border bg-card lg:block">
      <div className="flex h-full flex-col">
        <ContextContent
          selectedFind={selectedFind}
          selectedState={selectedState}
          recoveredFinds={recoveredFinds}
          chosenScore={chosenScore}
          coreComplete={coreComplete}
          showCurrentStory={showCurrentStory}
          nextActionLabel={nextActionLabel}
          onNextAction={onNextAction}
          setSelectedFindId={setSelectedFindId}
        />
      </div>
    </aside>
  );
}

function MobileContextDrawer({
  selectedFind,
  selectedState,
  recoveredFinds,
  chosenScore,
  coreComplete,
  showCurrentStory,
  nextActionLabel,
  onNextAction,
  setSelectedFindId,
}: {
  selectedFind: Find;
  selectedState: FindState;
  recoveredFinds: Find[];
  chosenScore: Interpretation & { confidence: Confidence; score: number };
  coreComplete: boolean;
  showCurrentStory: boolean;
  nextActionLabel: string;
  onNextAction: () => void;
  setSelectedFindId: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[88px] z-40 lg:hidden">
      <Drawer swipeDirection="down" showSwipeHandle>
        <DrawerTrigger
          render={
            <Button className="pointer-events-auto w-full shadow-lg" variant="default" />
          }
        >
          <Archive aria-hidden="true" />
          Next move and finds
        </DrawerTrigger>
        <DrawerContent className="[--drawer-height:min(78dvh,680px)]">
          <DrawerHeader>
            <DrawerTitle>Next Move</DrawerTitle>
            <DrawerDescription>
              Current clue, useful action, and your tray.
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-auto">
            <ContextContent
              selectedFind={selectedFind}
              selectedState={selectedState}
              recoveredFinds={recoveredFinds}
              chosenScore={chosenScore}
              coreComplete={coreComplete}
              showCurrentStory={showCurrentStory}
              nextActionLabel={nextActionLabel}
              onNextAction={onNextAction}
              setSelectedFindId={setSelectedFindId}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function ContextContent({
  selectedFind,
  selectedState,
  recoveredFinds,
  chosenScore,
  coreComplete,
  showCurrentStory,
  nextActionLabel,
  onNextAction,
  setSelectedFindId,
}: {
  selectedFind: Find;
  selectedState: FindState;
  recoveredFinds: Find[];
  chosenScore: Interpretation & { confidence: Confidence; score: number };
  coreComplete: boolean;
  showCurrentStory: boolean;
  nextActionLabel: string;
  onNextAction: () => void;
  setSelectedFindId: (id: string) => void;
}) {
  return (
    <>
      <section className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Next Move</h2>
          <Badge variant="secondary">{recoveredFinds.length}/26 found</Badge>
        </div>
        <article className="mt-3 rounded-md border border-border bg-background p-3">
          <h3 className="text-sm font-semibold">{selectedFind.name}</h3>
          <Progress value={selectedState.exposed} aria-label={`${selectedFind.name} clear progress`} className="mt-3" />
          <p className="mt-2 text-sm text-muted-foreground">
            {selectedState.recovered
              ? joinHintFromRecovered(selectedFind, recoveredFinds)
              : selectedState.exposed >= 70
                ? 'Ready to pick up.'
                : selectedFind.fragile && !selectedState.stabilized
                  ? 'Protect it before picking it up.'
                  : 'Brush until the edge is clear.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-1">
            {primaryGroups(selectedFind).map((group) => (
              <Badge key={group} variant={selectedState.groups.includes(group) ? 'default' : 'outline'}>
                {groupLabel(group)}
              </Badge>
            ))}
          </div>
        </article>
        {showCurrentStory ? (
          <div className="mt-3 rounded-md bg-muted p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Current Story</p>
            <p className="mt-1 text-sm font-medium">{chosenScore.label}</p>
            <p className="text-xs text-muted-foreground">{chosenScore.confidence}</p>
          </div>
        ) : null}
        {coreComplete ? (
          <div className="mt-3 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950">
            Site assessment ready. Confidence is supported, but the bead remains unresolved.
          </div>
        ) : null}
        <Button className="mt-3 w-full" onClick={onNextAction}>
          {nextActionLabel}
        </Button>
      </section>
      <section className="min-h-0 flex-1 overflow-auto p-4">
        <h3 className="text-sm font-semibold">Your Tray</h3>
        <div className="mt-3 space-y-2">
          {recoveredFinds.length < 3 ? (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              {recoveredFinds.length
                ? `${recoveredFinds.length} clue${recoveredFinds.length === 1 ? '' : 's'} found. The tray opens after three.`
                : 'Pick up cleared clues to begin your tray.'}
            </p>
          ) : recoveredFinds.map((find) => (
            <button
              key={find.id}
              type="button"
              onClick={() => setSelectedFindId(find.id)}
              className="w-full rounded-md border border-border bg-background p-3 text-left transition hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="block text-sm font-medium">#{find.id} {find.name}</span>
              <span className="text-xs text-muted-foreground">{primaryGroups(find).map(groupLabel).join(', ')}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
