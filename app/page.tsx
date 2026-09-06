'use client';

import {
  Archive,
  Brush,
  CheckCircle2,
  CircleDashed,
  Compass,
  Eye,
  Hammer,
  Hand,
  Layers3,
  Lightbulb,
  Map,
  Rotate3D,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  SunMedium,
} from 'lucide-react';
import Image from 'next/image';
import type { ElementType, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
};

type Interpretation = {
  id: 'A' | 'B' | 'C';
  label: string;
  claim: string;
  evidence: string[];
  uncertainty: string;
};

const tools: {
  id: Tool;
  label: string;
  icon: ElementType;
  hint: string;
}[] = [
  { id: 'brush', label: 'Brush', icon: Brush, hint: 'Clears loose soil without damage.' },
  { id: 'pick', label: 'Fine pick', icon: Hammer, hint: 'Works compact fill near hard edges.' },
  { id: 'stabilize', label: 'Stabilize', icon: ShieldCheck, hint: 'Secures fragile traces before lifting.' },
  { id: 'lift', label: 'Lift', icon: Hand, hint: 'Recovers exposed and stable finds.' },
  { id: 'light', label: 'Raking light', icon: SunMedium, hint: 'Reveals marks, soot, wear, and residues.' },
  { id: 'join', label: 'Join', icon: Rotate3D, hint: 'Compares breaks and snaps matching fragments.' },
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
  },
  {
    id: '4',
    name: 'Charred seed cluster',
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
    name: 'Ceramic packing sherd',
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
    name: 'Intrusive glazed sherd',
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
    evidence: ['Pit cut', 'Intrusive glazed sherd', 'Displaced pigment cup base', 'Moved pot base'],
    uncertainty: 'Many relationships remain spatially coherent outside the disturbed area.',
  },
];

const reconstructionZones = [
  { id: 'hearth', label: 'Hearth use', x: 35, y: 58, groups: ['cooking'] },
  { id: 'bench', label: 'Textile bench', x: 66, y: 31, groups: ['textile', 'trade'] },
  { id: 'threshold', label: 'Repaired threshold', x: 51, y: 83, groups: ['closure', 'repair'] },
  { id: 'pit', label: 'Later pit', x: 78, y: 49, groups: ['disturbance'] },
  { id: 'collapse', label: 'Roof collapse', x: 63, y: 61, groups: ['collapse', 'storage'] },
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

export default function Home() {
  const [screen, setScreen] = useState<Screen>('survey');
  const [mode, setMode] = useState<'expedition' | 'fieldwork'>('expedition');
  const [activeTool, setActiveTool] = useState<Tool>('brush');
  const [selectedFindId, setSelectedFindId] = useState('1');
  const [findState, setFindState] = useState<Record<string, FindState>>(initialFindState);
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [chosenInterpretation, setChosenInterpretation] = useState<'A' | 'B' | 'C'>('B');
  const [guidance, setGuidance] = useState('A hard edge is emerging near the hearth.');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as {
          screen?: Screen;
          mode?: 'expedition' | 'fieldwork';
          activeTool?: Tool;
          selectedFindId?: string;
          findState?: Record<string, FindState>;
          placements?: Record<string, string>;
          chosenInterpretation?: 'A' | 'B' | 'C';
        };
        setScreen(parsed.screen ?? 'survey');
        setMode(parsed.mode ?? 'expedition');
        setActiveTool(parsed.activeTool ?? 'brush');
        setSelectedFindId(parsed.selectedFindId ?? '1');
        setFindState(parsed.findState ?? initialFindState);
        setPlacements(parsed.placements ?? {});
        setChosenInterpretation(parsed.chosenInterpretation ?? 'B');
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        screen,
        mode,
        activeTool,
        selectedFindId,
        findState,
        placements,
        chosenInterpretation,
      }),
    );
  }, [screen, mode, activeTool, selectedFindId, findState, placements, chosenInterpretation]);

  const selectedFind = finds.find((find) => find.id === selectedFindId) ?? finds[0];
  const selectedState = findState[selectedFind.id];
  const recoveredFinds = finds.filter((find) => findState[find.id]?.recovered);
  const exposedCount = finds.filter((find) => findState[find.id]?.exposed > 0).length;
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
      (sum, find) => sum + relationScore(find.supports[interpretation.id]),
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

  const recommendedTool: Tool = selectedFind.fragile && !selectedState.stabilized ? 'stabilize' : selectedState.exposed < 70 ? 'brush' : selectedState.recovered ? 'light' : 'lift';

  function updateFind(id: string, patch: Partial<FindState>) {
    setFindState((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  function actOnFind(find: Find) {
    const state = findState[find.id];
    setSelectedFindId(find.id);
    if (activeTool === 'brush' || activeTool === 'pick') {
      const amount = activeTool === 'brush' ? 24 : 16;
      updateFind(find.id, { exposed: clamp(state.exposed + amount) });
      setGuidance(
        state.exposed + amount >= 70
          ? `${find.name} is exposed enough to lift. Its context has been recorded.`
          : activeTool === 'brush'
            ? 'Loose soil clears from the edge without disturbing the object.'
            : 'The compact fill gives way slowly around the hard edge.',
      );
      return;
    }
    if (activeTool === 'stabilize') {
      updateFind(find.id, { stabilized: true, observations: [...state.observations, 'Stabilized before lifting'] });
      setGuidance(`${find.name} is stabilized. Fragile context can be preserved.`);
      return;
    }
    if (activeTool === 'lift') {
      if (state.exposed < 70) {
        setGuidance('Brush around the object before lifting.');
        return;
      }
      if (find.fragile && !state.stabilized) {
        updateFind(find.id, { recovered: true, observations: [...state.observations, 'Recovered with reduced contextual certainty'] });
        setGuidance(`${find.name} lifted, but some certainty was lost because it was fragile.`);
        return;
      }
      updateFind(find.id, { recovered: true, observations: [...state.observations, find.clue] });
      setGuidance(`${find.name} moved to the examination table with its context recorded.`);
      return;
    }
    if (activeTool === 'light') {
      updateFind(find.id, {
        cleaned: clamp(state.cleaned + 34),
        observations: [...new Set([...state.observations, find.clue])],
      });
      setGuidance(find.clue);
      setScreen('examination');
    }
  }

  function recoverStarterSet() {
    const starterIds = ['1', '2', '4', '9', '10', '13', '16', '18', '20', '23', '24'];
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
    setGuidance('A representative tray is ready for joining, grouping, and reconstruction.');
  }

  function joinFinds(find: Find) {
    if (!find.joins.length) {
      setGuidance('This object has no physical join candidate. Try grouping it by activity instead.');
      return;
    }
    const availableJoin = find.joins.find((id) => findState[id]?.recovered);
    if (!availableJoin) {
      setGuidance('A matching break is likely, but the other piece has not been recovered.');
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
    setGuidance(`${find.name} fits with ${finds.find((item) => item.id === availableJoin)?.name}. A physical join is confirmed.`);
  }

  function groupFind(find: Find, group: string) {
    updateFind(find.id, {
      groups: [...new Set([...findState[find.id].groups, group])],
      observations: [...new Set([...findState[find.id].observations, `Grouped as ${group}`])],
    });
    setGuidance(`${find.name} now contributes to the ${group} interpretation.`);
  }

  function placeGroup(zoneId: string) {
    const zone = reconstructionZones.find((item) => item.id === zoneId);
    if (!zone) return;
    const candidate = recoveredFinds.find((find) =>
      find.group.some((group) => zone.groups.includes(group)),
    );
    if (!candidate) {
      setGuidance(`More evidence is needed before placing ${zone.label}.`);
      return;
    }
    setPlacements((current) => ({ ...current, [zoneId]: candidate.id }));
    setGuidance(`${zone.label} appears as an interpretive reconstruction, not certain time travel.`);
  }

  function saveNow() {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        screen,
        mode,
        activeTool,
        selectedFindId,
        findState,
        placements,
        chosenInterpretation,
      }),
    );
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  function resetVariation() {
    setMode((current) => (current === 'expedition' ? 'fieldwork' : 'expedition'));
    setFindState(initialFindState);
    setPlacements({});
    setChosenInterpretation('B');
    setScreen('excavation');
    setGuidance('Fieldwork reshuffles the same authored evidence into a compact variation.');
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
      name: 'seed_representative_evidence_tray',
      title: 'Seed evidence tray',
      description: 'Recover a representative evidence set for joining, grouping, and reconstruction.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => {
        recoverStarterSet();
        return { recovered: 11, next: 'Use joins, grouping, reconstruction, or interpretation review.' };
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
        setScreen('interpretation');
        return { chosen: value };
      },
    });

    register({
      name: 'start_fieldwork_variation',
      title: 'Start Fieldwork variation',
      description: 'Switch to the authored Fieldwork variation and reset progress.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => {
        setMode('fieldwork');
        setFindState(initialFindState);
        setPlacements({});
        setScreen('excavation');
        return { mode: 'fieldwork', next: 'Excavate the reshuffled authored contexts.' };
      },
    });

    return () => lifecycle.abort();
  }, [
    activeTool,
    chosenScore.confidence,
    chosenScore.label,
    mode,
    recoveredFinds.length,
    screen,
    selectedFind.name,
    sliceProgress,
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
              {guidance}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden w-40 sm:block">
              <Progress value={clamp(sliceProgress)} aria-label="Site progress" />
            </div>
            <Button variant="outline" size="sm" onClick={recoverStarterSet}>
              <Sparkles aria-hidden="true" />
              Seed tray
            </Button>
            <Button size="sm" onClick={saveNow}>
              <Save aria-hidden="true" />
              {saved ? 'Saved' : 'Save'}
            </Button>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[1fr_auto] lg:grid-cols-[76px_minmax(0,1fr)_330px] lg:grid-rows-1">
          <ToolTray
            activeTool={activeTool}
            recommendedTool={recommendedTool}
            onSelect={setActiveTool}
          />

          <div className="min-h-0 overflow-hidden p-2 sm:p-3">
            <Tabs value={screen} onValueChange={(value) => setScreen(value as Screen)} className="h-full">
              <TabsList className="mb-2 grid h-auto w-full grid-cols-4 gap-1 bg-muted/70 p-1 sm:grid-cols-7">
                {[
                  ['survey', 'Survey', Map],
                  ['excavation', 'Excavate', Brush],
                  ['examination', 'Examine', Search],
                  ['joins', 'Join', Rotate3D],
                  ['reconstruction', 'Rebuild', Layers3],
                  ['interpretation', 'Interpret', Lightbulb],
                  ['fieldwork', 'Fieldwork', Archive],
                ].map(([value, label, Icon]) => (
                  <TabsTrigger key={value as string} value={value as string} className="h-9 gap-1 px-1 text-xs sm:text-sm">
                    <Icon className="size-4" aria-hidden="true" />
                    <span className="hidden sm:inline">{label as string}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="survey" className="h-[calc(100%-48px)]">
                <BoardFrame
                  mode={mode}
                  title="Exterior survey"
                  description="Read the room before disturbing it. The courtyard, threshold, hearth, bench, and pit can all be chosen as excavation priorities."
                >
                  <SurveyOverlay onChoose={(target) => {
                    setScreen('excavation');
                    setGuidance(`${target} selected. Start with gentle exposure and keep context intact.`);
                  }} />
                </BoardFrame>
              </TabsContent>

              <TabsContent value="excavation" className="h-[calc(100%-48px)]">
                <BoardFrame
                  mode={mode}
                  title="Excavation area"
                  description={`${exposedCount} find contexts visible. Active tool: ${tools.find((tool) => tool.id === activeTool)?.label}.`}
                >
                  <FindHotspots
                    mode={mode}
                    activeTool={activeTool}
                    findState={findState}
                    selectedFindId={selectedFindId}
                    onAct={actOnFind}
                  />
                </BoardFrame>
              </TabsContent>

              <TabsContent value="examination" className="h-[calc(100%-48px)]">
                <ExaminationTable
                  find={selectedFind}
                  state={selectedState}
                  onClean={() => {
                    updateFind(selectedFind.id, {
                      cleaned: clamp(selectedState.cleaned + 25),
                      observations: [...new Set([...selectedState.observations, selectedFind.clue])],
                    });
                    setGuidance(selectedFind.clue);
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
                  title="Reconstruction space"
                  description="Place supported activity zones. Translucent forms show interpretation, while excavated reality remains visible beneath."
                >
                  <ReconstructionOverlay placements={placements} onPlace={placeGroup} />
                </BoardFrame>
              </TabsContent>

              <TabsContent value="interpretation" className="h-[calc(100%-48px)]">
                <InterpretationReview
                  scores={interpretationScores}
                  chosen={chosenInterpretation}
                  onChoose={setChosenInterpretation}
                />
              </TabsContent>

              <TabsContent value="fieldwork" className="h-[calc(100%-48px)]">
                <FieldworkPanel
                  mode={mode}
                  progress={sliceProgress}
                  chosenScore={chosenScore}
                  onReset={resetVariation}
                />
              </TabsContent>
            </Tabs>
          </div>

          <EvidencePanel
            selectedFind={selectedFind}
            selectedState={selectedState}
            recoveredFinds={recoveredFinds}
            chosenScore={chosenScore}
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
  onSelect,
}: {
  activeTool: Tool;
  recommendedTool: Tool;
  onSelect: (tool: Tool) => void;
}) {
  return (
    <aside className="order-2 flex min-h-[76px] items-center gap-2 overflow-x-auto border-t border-border bg-card px-2 py-2 lg:order-none lg:min-h-0 lg:flex-col lg:justify-start lg:border-r lg:border-t-0 lg:px-2 lg:pt-3">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const active = activeTool === tool.id;
        const recommended = recommendedTool === tool.id && !active;
        return (
          <button
            key={tool.id}
            type="button"
            aria-pressed={active}
            aria-label={`${tool.label}. ${tool.hint}${recommended ? ' Recommended now.' : ''}`}
            title={`${tool.label}: ${tool.hint}`}
            onClick={() => onSelect(tool.id)}
            className={`relative flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-md border px-2 text-[11px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:w-full ${
              active
                ? 'translate-y-[-2px] border-primary bg-primary text-primary-foreground shadow-md'
                : recommended
                  ? 'border-sky-600 bg-sky-50 text-sky-950 ring-2 ring-sky-300'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            <Icon className="size-5" aria-hidden="true" />
            <span>{tool.label}</span>
            {recommended ? <span className="absolute -right-1 -top-1 size-3 rounded-full bg-sky-500" /> : null}
          </button>
        );
      })}
    </aside>
  );
}

function BoardFrame({
  children,
  mode,
  title,
  description,
}: {
  children: ReactNode;
  mode: 'expedition' | 'fieldwork';
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
          Fieldwork seed
        </div>
      ) : null}
      {children}
    </section>
  );
}

function SurveyOverlay({ onChoose }: { onChoose: (target: string) => void }) {
  const areas = [
    { label: 'Hearth ash', x: 36, y: 56 },
    { label: 'Bench floor', x: 66, y: 31 },
    { label: 'Threshold repair', x: 51, y: 84 },
    { label: 'Later pit', x: 78, y: 48 },
  ];
  return (
    <div className="absolute inset-0">
      {areas.map((area) => (
        <button
          key={area.label}
          type="button"
          onClick={() => onChoose(area.label)}
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
  findState,
  selectedFindId,
  onAct,
}: {
  mode: 'expedition' | 'fieldwork';
  activeTool: Tool;
  findState: Record<string, FindState>;
  selectedFindId: string;
  onAct: (find: Find) => void;
}) {
  return (
    <div className="absolute inset-0">
      {finds.map((find) => {
        const state = findState[find.id];
        const pos = find.positions[mode];
        const visible = state.exposed > 0 || find.id === '1' || find.id === '23';
        return (
          <button
            key={find.id}
            type="button"
            onClick={() => onAct(find)}
            aria-label={`${find.name}, ${state.exposed}% exposed, ${state.recovered ? 'recovered' : 'in soil'}`}
            className={`absolute z-10 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold shadow-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:size-10 ${
              state.recovered
                ? 'border-emerald-100 bg-emerald-700 text-white opacity-80'
                : selectedFindId === find.id
                  ? 'border-white bg-sky-700 text-white ring-4 ring-sky-300'
                  : visible
                    ? 'border-white/90 bg-stone-900/65 text-white'
                    : 'border-amber-100/40 bg-stone-700/20 text-white/50'
            }`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              opacity: visible || activeTool === 'brush' ? undefined : 0.45,
            }}
          >
            {state.recovered ? <CheckCircle2 className="size-5" aria-hidden="true" /> : find.id}
            <span
              className="absolute -bottom-1 left-1/2 h-1 -translate-x-1/2 rounded-full bg-white/90"
              style={{ width: `${Math.max(8, state.exposed / 2)}%` }}
            />
          </button>
        );
      })}
    </div>
  );
}

function ExaminationTable({
  find,
  state,
  onClean,
}: {
  find: Find;
  state: FindState;
  onClean: () => void;
}) {
  return (
    <section className="grid h-full gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_280px]">
      <div className="relative min-h-0 overflow-hidden rounded-lg border border-border bg-[radial-gradient(circle_at_45%_35%,#efe0be,#9c7850_58%,#33291f)]">
        <div className="absolute left-4 top-4 rounded-md bg-black/45 px-3 py-2 text-white">
          <h2 className="text-base font-semibold">{find.name}</h2>
          <p className="text-xs text-white/80">{find.location} · Phase {find.phase}</p>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative flex aspect-square w-[min(58vh,70vw)] max-w-[440px] items-center justify-center rounded-full border border-black/20 bg-[conic-gradient(from_20deg,#7f4229,#c88955,#9b5b39,#3a3128,#7f4229)] shadow-2xl transition-transform duration-500"
            style={{ transform: `rotate(${state.cleaned * 1.2}deg)` }}
          >
            <div className="absolute inset-[18%] rounded-full border-[18px] border-black/15" />
            <div className="absolute h-[62%] w-3 rotate-45 rounded-full bg-black/25" />
            <div className="z-10 rounded-md border border-white/40 bg-black/45 px-3 py-2 text-center text-sm font-semibold text-white">
              {find.material}
              <br />
              <span className="text-xs font-normal">{state.cleaned}% readable</span>
            </div>
          </div>
        </div>
      </div>
      <aside className="min-h-0 overflow-auto rounded-lg border border-border bg-background p-3">
        <h3 className="font-semibold">Material Evidence</h3>
        <dl className="mt-3 grid grid-cols-[88px_1fr] gap-2 text-sm">
          <dt className="text-muted-foreground">Use</dt>
          <dd>{find.use}</dd>
          <dt className="text-muted-foreground">Condition</dt>
          <dd>{find.condition}</dd>
          <dt className="text-muted-foreground">Context</dt>
          <dd>{find.location}</dd>
          <dt className="text-muted-foreground">Relation</dt>
          <dd>{find.relationships}</dd>
        </dl>
        <Button className="mt-4 w-full" onClick={onClean}>
          <Eye aria-hidden="true" />
          Rotate, light, clean
        </Button>
        <div className="mt-4 space-y-2">
          {state.observations.length ? (
            state.observations.map((observation) => (
              <p key={observation} className="rounded-md bg-muted px-3 py-2 text-sm">
                {observation}
              </p>
            ))
          ) : (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Clean or light the surface to reveal diagnostic marks.
            </p>
          )}
        </div>
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
  return (
    <section className="grid h-full gap-3 overflow-hidden rounded-lg border border-border bg-card p-3 md:grid-cols-[minmax(0,1fr)_310px]">
      <div className="min-h-0 overflow-auto rounded-lg border border-border bg-background p-3">
        <h2 className="text-base font-semibold">Join and Group Finds</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Physical joins are strongest. Activity groups remain interpretive and can be revised.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {recoveredFinds.map((find) => (
            <article key={find.id} className="rounded-md border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{find.name}</h3>
                  <p className="text-xs text-muted-foreground">{find.material}</p>
                </div>
                <Badge variant={findState[find.id].joinedWith.length ? 'default' : 'outline'}>
                  {findState[find.id].joinedWith.length ? 'joined' : `#${find.id}`}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{find.relationships}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                <Button size="xs" variant="outline" onClick={() => onJoin(find)}>
                  <Rotate3D aria-hidden="true" />
                  Test join
                </Button>
                {find.group.slice(0, 2).map((group) => (
                  <Button key={group} size="xs" variant="secondary" onClick={() => onGroup(find, group)}>
                    {group}
                  </Button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
      <aside className="min-h-0 overflow-auto rounded-lg border border-border bg-background p-3">
        <h3 className="font-semibold">Confirmed Relationships</h3>
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
  onPlace,
}: {
  placements: Record<string, string>;
  onPlace: (zoneId: string) => void;
}) {
  return (
    <div className="absolute inset-0">
      {reconstructionZones.map((zone) => {
        const placed = Boolean(placements[zone.id]);
        return (
          <button
            key={zone.id}
            type="button"
            onClick={() => onPlace(zone.id)}
            className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 px-3 py-2 text-sm font-semibold shadow-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              placed
                ? 'border-cyan-100 bg-cyan-500/35 text-white ring-4 ring-cyan-200/60'
                : 'border-white/80 bg-black/45 text-white backdrop-blur-[2px] hover:bg-black/60'
            }`}
            style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
          >
            {placed ? 'Echo: ' : 'Place: '}
            {zone.label}
          </button>
        );
      })}
      {Object.keys(placements).map((zoneId) => {
        const zone = reconstructionZones.find((item) => item.id === zoneId);
        if (!zone) return null;
        return (
          <div
            key={`${zoneId}-echo`}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/70 bg-cyan-200/18 shadow-[0_0_60px_rgb(125_211_252/0.55)]"
            style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: '22%', aspectRatio: '1 / .55' }}
          />
        );
      })}
    </div>
  );
}

function InterpretationReview({
  scores,
  chosen,
  onChoose,
}: {
  scores: (Interpretation & {
    score: number;
    confidence: Confidence;
    support: Find[];
    contradictions: Find[];
  })[];
  chosen: 'A' | 'B' | 'C';
  onChoose: (id: 'A' | 'B' | 'C') => void;
}) {
  return (
    <section className="grid h-full gap-3 overflow-hidden rounded-lg border border-border bg-card p-3 lg:grid-cols-3">
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
          <h3 className="mt-4 text-sm font-semibold">Supporting evidence</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {interpretation.support.slice(0, 6).map((find) => (
              <li key={find.id}>#{find.id} {find.name}</li>
            ))}
            {!interpretation.support.length ? <li className="text-muted-foreground">Recover more evidence.</li> : null}
          </ul>
          <h3 className="mt-4 text-sm font-semibold">Complications</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {interpretation.contradictions.slice(0, 5).map((find) => (
              <li key={find.id}>#{find.id} {find.name}</li>
            ))}
            {!interpretation.contradictions.length ? <li className="text-muted-foreground">No contradictions recovered yet.</li> : null}
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
  onReset,
}: {
  mode: 'expedition' | 'fieldwork';
  progress: number;
  chosenScore: Interpretation & { confidence: Confidence; score: number };
  onReset: () => void;
}) {
  return (
    <section className="grid h-full gap-3 overflow-hidden rounded-lg border border-border bg-card p-3 md:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-lg border border-border bg-background p-5">
        <h2 className="text-xl font-semibold">Fieldwork Mode</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Replay uses authored Riverbend components with varied fragment positions, disturbance emphasis, preservation quality, and tool pressure. It keeps the same archaeology logic without inventing unrelated objects.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            'Fragment positions shift within plausible contexts',
            'The disturbance pit changes which joins cross layers',
            'Fragile traces may require stabilization earlier',
            'One ambiguity is withheld or added per seed',
          ].map((item) => (
            <div key={item} className="rounded-md bg-muted p-3 text-sm">{item}</div>
          ))}
        </div>
        <Button className="mt-5" onClick={onReset}>
          <CircleDashed aria-hidden="true" />
          {mode === 'fieldwork' ? 'Return to expedition layout' : 'Start fieldwork variation'}
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
  setSelectedFindId,
}: {
  selectedFind: Find;
  selectedState: FindState;
  recoveredFinds: Find[];
  chosenScore: Interpretation & { confidence: Confidence; score: number };
  setSelectedFindId: (id: string) => void;
}) {
  return (
    <aside className="hidden min-h-0 border-l border-border bg-card lg:block">
      <div className="flex h-full flex-col">
        <section className="border-b border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Context Tray</h2>
            <Badge variant="secondary">{recoveredFinds.length}/26 recovered</Badge>
          </div>
          <article className="mt-3 rounded-md border border-border bg-background p-3">
            <h3 className="text-sm font-semibold">{selectedFind.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{selectedFind.material} · {selectedFind.location}</p>
            <Progress value={selectedState.exposed} aria-label={`${selectedFind.name} exposure`} className="mt-3" />
            <dl className="mt-3 grid grid-cols-[80px_1fr] gap-1 text-xs">
              <dt className="text-muted-foreground">Phase</dt>
              <dd>{selectedFind.phase}</dd>
              <dt className="text-muted-foreground">State</dt>
              <dd>{selectedState.recovered ? 'Recovered' : 'In context'}</dd>
              <dt className="text-muted-foreground">Cleaned</dt>
              <dd>{selectedState.cleaned}%</dd>
            </dl>
          </article>
          <div className="mt-3 rounded-md bg-muted p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Active interpretation</p>
            <p className="mt-1 text-sm font-medium">{chosenScore.label}</p>
            <p className="text-xs text-muted-foreground">{chosenScore.confidence}</p>
          </div>
        </section>
        <section className="min-h-0 flex-1 overflow-auto p-4">
          <h3 className="text-sm font-semibold">Finds Storage</h3>
          <div className="mt-3 space-y-2">
            {recoveredFinds.length ? recoveredFinds.map((find) => (
              <button
                key={find.id}
                type="button"
                onClick={() => setSelectedFindId(find.id)}
                className="w-full rounded-md border border-border bg-background p-3 text-left transition hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="block text-sm font-medium">#{find.id} {find.name}</span>
                <span className="text-xs text-muted-foreground">{find.location} · {find.material}</span>
              </button>
            )) : (
              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                Lift exposed material to begin the collection.
              </p>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}
