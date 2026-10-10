'use client';

import {
  Archive,
  BookOpen,
  Brush,
  CheckCircle2,
  ClipboardCheck,
  CircleDashed,
  Compass,
  Eye,
  Hammer,
  Hand,
  Menu,
  RotateCcw,
  RotateCw,
  Rotate3D,
  Save,
  ShieldCheck,
  Volume2,
  VolumeX,
  Sparkles,
  SunMedium,
} from 'lucide-react';
import Image from 'next/image';
import type { ElementType, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
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
type ChapterId = 'hearth_memory' | 'threshold_memory' | 'bench_memory';
type ChapterStep = 'discover' | 'restore' | 'place' | 'memory' | 'decide' | 'complete';
type GameVerb = 'reveal' | 'collect' | 'restore' | 'place' | 'decide';
type MemoryUnlock = 'hearth_memory' | 'threshold_memory' | 'bench_memory';
type KnownMark = 'warm_meal' | 'kept_close' | 'work_rhythm';
type StoryChoice = 'daily' | 'sudden' | 'mixed' | 'supplies' | 'making';
type ThresholdChoice = 'kept' | 'dropped' | 'shifted';
type BenchChoice = 'steady' | 'special' | 'unfinished';
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

type RestoreFragmentId = 'rim' | 'body';
type RestorePuzzleState = Record<RestoreFragmentId, FragmentTransform>;
type PatternPieceId = 'spindleA' | 'spindleB' | 'pigment';
type PatternPuzzleState = Record<PatternPieceId, FragmentTransform>;
type PlacePuzzleId = 'hearth' | 'threshold' | 'bench';
type PlacePuzzleState = Record<PlacePuzzleId, FragmentTransform>;

const initialRestorePuzzle: RestorePuzzleState = {
  rim: { x: 24, y: 50, rotation: -18 },
  body: { x: 76, y: 50, rotation: 20 },
};

const restoreTargets: RestorePuzzleState = {
  rim: { x: 35, y: 50, rotation: 0 },
  body: { x: 65, y: 50, rotation: 0 },
};

const initialPlacePuzzle: PlacePuzzleState = {
  hearth: { x: 78, y: 72, rotation: 0 },
  threshold: { x: 28, y: 74, rotation: 0 },
  bench: { x: 76, y: 72, rotation: 0 },
};

const placeTargets: PlacePuzzleState = {
  hearth: { x: 36, y: 42, rotation: 0 },
  threshold: { x: 50, y: 87, rotation: 0 },
  bench: { x: 66, y: 19, rotation: 0 },
};

const initialPatternPuzzle: PatternPuzzleState = {
  spindleA: { x: 25, y: 58, rotation: -12 },
  spindleB: { x: 75, y: 58, rotation: 16 },
  pigment: { x: 50, y: 28, rotation: 0 },
};

const patternTargets: PatternPuzzleState = {
  spindleA: { x: 38, y: 58, rotation: 0 },
  spindleB: { x: 62, y: 58, rotation: 0 },
  pigment: { x: 50, y: 38, rotation: 0 },
};

const chapterTheme: Record<ChapterId, { title: string; shortName: string; glow: string; mark: string }> = {
  hearth_memory: {
    title: 'Riverbend Workshop',
    shortName: 'Hearth',
    glow: 'amber',
    mark: 'Warm meal',
  },
  threshold_memory: {
    title: 'Riverbend Workshop',
    shortName: 'Doorway',
    glow: 'sky',
    mark: 'Kept close',
  },
  bench_memory: {
    title: 'Riverbend Workshop',
    shortName: 'Bench',
    glow: 'teal',
    mark: 'Work rhythm',
  },
};

const chapterCopy = {
  hearth_memory: {
    discover: {
      prompt: 'A pot edge is showing by the hearth. Reveal it.',
      ready: 'A curved pot piece. Collect it.',
      revealFirst: 'A curved edge appears in the ash.',
      revealSecond: 'A second curve answers the first.',
      collectFirst: 'One piece found. Reveal the other beside it.',
      collectSecond: 'Two pieces of the same pot. Bring them together.',
    },
    restore: {
      far: 'Bring the edges together.',
      near: 'Almost fits.',
      ready: 'Ready to join.',
      helper: 'Move and turn the pieces to fit the pot outline.',
      nearHelper: 'Follow the curve of the pot.',
      readyHelper: 'A dark line runs across both pieces.',
      action: 'Join pieces',
      readyAction: 'Join pieces',
      success: 'The soot line continues across the repaired pot.',
    },
    place: {
      far: 'Carry the pot to the hearth.',
      near: 'Almost home.',
      ready: 'Ready. Set the pot by the fire.',
      success: 'The hearth warms around the restored pot.',
      action: 'Place by hearth',
    },
    memory: {
      prompt: 'Picture this hearth when it was in use.',
      action: 'Imagine the room',
      success: 'A repaired pot and a well-used hearth suggest everyday meals.',
      echo: 'A repaired pot. A well-used hearth. Meals made here again and again.',
    },
    decide: {
      prompt: 'What happened around this hearth?',
      question: 'What happened around this hearth?',
      action: 'Choose a meaning',
      complete: 'This room changed. Follow the doorway.',
      nextAction: 'Follow the doorway',
    },
  },
  threshold_memory: {
    discover: {
      prompt: 'A tiny blue bead waits near the doorway.',
      ready: 'Ready to collect.',
      revealFirst: 'A small blue gleam catches the light.',
      revealSecond: 'A small blue gleam catches the light.',
      collectFirst: 'The bead feels kept, not thrown away.',
      collectSecond: 'The bead feels kept, not thrown away.',
    },
    restore: {
      far: '',
      near: '',
      ready: '',
      helper: '',
      nearHelper: '',
      readyHelper: '',
      action: '',
      readyAction: '',
      success: '',
    },
    place: {
      far: 'Carry the bead to the doorway.',
      near: 'Almost home.',
      ready: 'The bead knows the doorway.',
      success: 'The doorway holds it.',
      action: 'Place by doorway',
    },
    memory: {
      prompt: 'Picture the doorway when it was in use.',
      action: 'Imagine the doorway',
      success: 'A kept-close mark wakes beside the door.',
      echo: 'A bead beneath the threshold. Kept there, or lost during a repair?',
    },
    decide: {
      prompt: 'Why was the bead tucked here?',
      question: 'Why was the bead tucked by the doorway?',
      action: 'Choose a meaning',
      complete: 'The doorway memory is awake.',
      nextAction: 'Follow the bench',
    },
  },
  bench_memory: {
    discover: {
      prompt: 'Something near the bench kept a rhythm.',
      ready: 'Ready to collect.',
      revealFirst: 'A little weight waits by the bench.',
      revealSecond: 'Another weight answers nearby.',
      collectFirst: 'One small weight joins the pattern.',
      collectSecond: 'The bench is holding one more color clue.',
    },
    restore: {
      far: 'Make the pattern.',
      near: 'Almost a rhythm.',
      ready: 'The pattern holds.',
      helper: 'Move the small pieces into a quiet rhythm.',
      nearHelper: 'The pieces are starting to answer each other.',
      readyHelper: 'A touch of blue between the weights.',
      action: 'Bind pattern',
      readyAction: 'Bind pattern',
      success: 'The pattern keeps its beat.',
    },
    place: {
      far: 'Carry the pattern to the bench.',
      near: 'Almost home.',
      ready: 'The bench knows the pattern.',
      success: 'The bench warms with quiet work.',
      action: 'Place by bench',
    },
    memory: {
      prompt: 'Picture a day at the bench.',
      action: 'Imagine the workshop',
      success: 'A work rhythm mark wakes by the bench.',
      echo: 'Weights, thread, and a touch of blue. Work repeated here.',
    },
    decide: {
      prompt: 'What did the bench remember?',
      question: 'What did the bench remember?',
      action: 'Choose a meaning',
      complete: 'The bench memory is awake.',
      nextAction: "See the room's story",
    },
  },
} satisfies Record<ChapterId, {
  discover: {
    prompt: string;
    ready: string;
    revealFirst: string;
    revealSecond: string;
    collectFirst: string;
    collectSecond: string;
  };
  restore: {
    far: string;
    near: string;
    ready: string;
    helper: string;
    nearHelper: string;
    readyHelper: string;
    action: string;
    readyAction: string;
    success: string;
  };
  place: {
    far: string;
    near: string;
    ready: string;
    success: string;
    action: string;
  };
  memory: {
    prompt: string;
    action: string;
    success: string;
    echo: string;
  };
  decide: {
    prompt: string;
    question: string;
    action: string;
    complete: string;
    nextAction: string;
  };
}>;

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

function normalizeRotation(rotation: number) {
  const normalized = ((rotation + 180) % 360 + 360) % 360 - 180;
  return Math.abs(normalized) === 180 ? 180 : normalized;
}

function rotationDistance(rotation: number, target: number) {
  return Math.abs(normalizeRotation(rotation - target));
}

function fragmentDistance(fragment: FragmentTransform, target: FragmentTransform) {
  return Math.hypot(fragment.x - target.x, fragment.y - target.y);
}

function restoreFitScore(puzzle: RestorePuzzleState) {
  const rimDistance = fragmentDistance(puzzle.rim, restoreTargets.rim);
  const bodyDistance = fragmentDistance(puzzle.body, restoreTargets.body);
  const rimRotation = rotationDistance(puzzle.rim.rotation, restoreTargets.rim.rotation);
  const bodyRotation = rotationDistance(puzzle.body.rotation, restoreTargets.body.rotation);
  return rimDistance + bodyDistance + rimRotation / 5 + bodyRotation / 5;
}

function patternFitScore(puzzle: PatternPuzzleState) {
  return (Object.keys(patternTargets) as PatternPieceId[]).reduce(
    (score, id) => score + fragmentDistance(puzzle[id], patternTargets[id]) + rotationDistance(puzzle[id].rotation, patternTargets[id].rotation) / 7,
    0,
  );
}

function moveToward(current: FragmentTransform, target: FragmentTransform, amount: number): FragmentTransform {
  return {
    x: current.x + (target.x - current.x) * amount,
    y: current.y + (target.y - current.y) * amount,
    rotation: normalizeRotation(current.rotation + normalizeRotation(target.rotation - current.rotation) * amount),
  };
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

function WarmMealMark({ className = '' }: { className?: string }) {
  return (
    <span
      aria-label="warm meal mark"
      className={`relative inline-flex size-10 items-center justify-center ${className}`}
    >
      <span className="absolute bottom-[25%] h-[50%] w-[80%] rounded-[50%] border-b-2 border-current" />
      <span className="absolute bottom-[40%] h-[40%] w-[65%] rounded-[50%] border-b-2 border-current" />
    </span>
  );
}

function KeptCloseMark({ className = '' }: { className?: string }) {
  return (
    <span
      aria-label="kept close mark"
      className={`relative inline-flex size-10 items-center justify-center rounded-full border-2 border-current ${className}`}
    >
      <span className="absolute size-5 rounded-full border-2 border-current" />
      <span className="absolute -bottom-0.5 h-4 w-0.5 rounded-full bg-current" />
      <span className="absolute bottom-1.5 h-0.5 w-5 rounded-full bg-current" />
      <span className="absolute size-2 rounded-full bg-current" />
    </span>
  );
}

function WorkRhythmMark({ className = '' }: { className?: string }) {
  return (
    <span
      aria-label="work rhythm mark"
      className={`relative inline-flex size-10 items-center justify-center rounded-full border-2 border-current ${className}`}
    >
      <span className="absolute left-2 h-5 w-0.5 rounded-full bg-current" />
      <span className="absolute right-2 h-5 w-0.5 rounded-full bg-current" />
      <span className="absolute h-0.5 w-6 rotate-[-18deg] rounded-full bg-current" />
      <span className="absolute h-0.5 w-6 rotate-[18deg] rounded-full bg-current" />
      <span className="absolute size-2 rounded-full bg-current" />
    </span>
  );
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
  const [guidance, setGuidance] = useState(chapterCopy.hearth_memory.discover.prompt);
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [fieldworkHistoryId, setFieldworkHistoryId] = useState<FieldworkHistory['id']>('threshold');
  const [hasCompletedMainLoop, setHasCompletedMainLoop] = useState(false);
  const [chapterId, setChapterId] = useState<ChapterId>('hearth_memory');
  const [_chapterStep, setChapterStep] = useState<ChapterStep>('discover');
  const [memoryUnlocks, setMemoryUnlocks] = useState<MemoryUnlock[]>([]);
  const [knownMarks, setKnownMarks] = useState<KnownMark[]>([]);
  const [storyChoice, setStoryChoice] = useState<StoryChoice | null>(null);
  const [thresholdChoice, setThresholdChoice] = useState<ThresholdChoice | null>(null);
  const [benchChoice, setBenchChoice] = useState<BenchChoice | null>(null);
  const [roomStoryOpen, setRoomStoryOpen] = useState(false);
  const [showPresentRoom, setShowPresentRoom] = useState(false);
  const [restorePuzzle, setRestorePuzzle] = useState<RestorePuzzleState>(initialRestorePuzzle);
  const [draggingFragment, setDraggingFragment] = useState<RestoreFragmentId | null>(null);
  const [patternPuzzle, setPatternPuzzle] = useState<PatternPuzzleState>(initialPatternPuzzle);
  const [draggingPattern, setDraggingPattern] = useState<PatternPieceId | null>(null);
  const [patternBound, setPatternBound] = useState(false);
  const [placePuzzle, setPlacePuzzle] = useState<PlacePuzzleState>(initialPlacePuzzle);
  const [draggingPlace, setDraggingPlace] = useState<PlacePuzzleId | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const restoreBoardRef = useRef<HTMLDivElement | null>(null);
  const patternBoardRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const roomStoryRef = useRef<HTMLElement | null>(null);
  const chapterActionRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (roomStoryOpen) roomStoryRef.current?.focus();
  }, [roomStoryOpen]);
  const [hearthReconstructionAcknowledged, setHearthReconstructionAcknowledged] = useState(false);
  const [hearthEchoPlaying, setHearthEchoPlaying] = useState(false);

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
          chapterId?: ChapterId;
          chapterStep?: ChapterStep;
          memoryUnlocks?: MemoryUnlock[];
          knownMarks?: KnownMark[];
          storyChoice?: StoryChoice | null;
          thresholdChoice?: ThresholdChoice | null;
          benchChoice?: BenchChoice | null;
          roomStoryOpen?: boolean;
          restorePuzzle?: RestorePuzzleState;
          patternPuzzle?: PatternPuzzleState;
          patternBound?: boolean;
          placePuzzle?: PlacePuzzleState;
          hearthReconstructionAcknowledged?: boolean;
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
        setGuidance(parsed.guidance ?? chapterCopy.hearth_memory.discover.prompt);
        setSoundEnabled(parsed.soundEnabled ?? true);
        setFieldworkHistoryId(parsed.fieldworkHistoryId ?? 'threshold');
        setHasCompletedMainLoop(restoredComplete);
        setChapterId(parsed.chapterId ?? 'hearth_memory');
        setChapterStep(parsed.chapterStep ?? 'discover');
        setMemoryUnlocks(parsed.memoryUnlocks ?? []);
        setKnownMarks(parsed.knownMarks ?? []);
        setStoryChoice(parsed.storyChoice ?? null);
        setThresholdChoice(parsed.thresholdChoice ?? null);
        setBenchChoice(parsed.benchChoice ?? null);
        setRoomStoryOpen(Boolean(parsed.roomStoryOpen && parsed.benchChoice && parsed.chapterId === 'bench_memory'));
        setRestorePuzzle(parsed.restorePuzzle ?? initialRestorePuzzle);
        setPatternPuzzle(parsed.patternPuzzle ?? initialPatternPuzzle);
        setPatternBound(parsed.patternBound ?? false);
        setPlacePuzzle(parsed.placePuzzle ?? initialPlacePuzzle);
        setHearthReconstructionAcknowledged(parsed.hearthReconstructionAcknowledged ?? Boolean(parsed.memoryUnlocks?.includes('hearth_memory')));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  const selectedFind = finds.find((find) => find.id === selectedFindId) ?? finds[0];
  const _selectedState = findState[selectedFind.id];
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

  const _recommendedTool: Tool = activeDigFind.fragile && !activeDigState.stabilized ? 'stabilize' : activeDigState.exposed < 70 ? 'brush' : activeDigState.recovered ? 'light' : 'lift';
  const availableTools = useMemo<Tool[]>(() => {
    if (screen !== 'excavation' || !hasDigTarget) return [];
    const toolSet = new Set<Tool>(['brush']);
    if (activeDigState.exposed > 35 || tutorialStep === 'freePlay') toolSet.add('pick');
    if (activeDigFind.fragile && !activeDigState.stabilized) toolSet.add('stabilize');
    if (activeDigState.exposed >= 70 && !activeDigState.recovered) toolSet.add('lift');
    return tools.map((tool) => tool.id).filter((tool) => toolSet.has(tool));
  }, [activeDigFind.fragile, activeDigState.exposed, activeDigState.recovered, activeDigState.stabilized, hasDigTarget, screen, tutorialStep]);
  const currentTool = availableTools.includes(activeTool) ? activeTool : availableTools[0] ?? activeTool;
  const _visibleScreens = useMemo(
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
  const _nextActionLabel =
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
  const _headerGuidance =
    screen === 'excavation' && !hasDigTarget
      ? tutorialStep === 'firstBuild'
        ? 'This patch is clear. Build the room from what you found.'
        : tutorialStep === 'firstMatch'
          ? 'This patch is clear. Match the pieces you found.'
          : recoveredFinds.length
            ? 'This patch is clear. Look at your clues or choose another spot.'
            : guidance
      : guidance;
  const _excavationDescription = hasDigTarget
    ? `${toolById(currentTool).label} selected. Only this spot is active for now.`
    : 'This patch is clear. No tool needed here right now.';
  const hearthFinds = [finds.find((find) => find.id === '1')!, finds.find((find) => find.id === '2')!];
  const beadFind = finds.find((find) => find.id === '20')!;
  const benchFinds = [finds.find((find) => find.id === '9')!, finds.find((find) => find.id === '10')!, finds.find((find) => find.id === '15')!];
  const firstPotState = findState['1'];
  const beadState = findState['20'];
  const collectedBenchFinds = benchFinds.filter((find) => findState[find.id]?.recovered);
  const collectedPotPieces = hearthFinds.filter((find) => findState[find.id]?.recovered);
  const activeChapterFinds = chapterId === 'hearth_memory' ? hearthFinds : chapterId === 'bench_memory' ? benchFinds : [beadFind];
  const potRestored = hasConfirmedJoin(findState, ['1', '2']);
  const hearthPlaced = Boolean(placements.hearth);
  const beadCollected = beadState.recovered;
  const thresholdPlaced = Boolean(placements.threshold);
  const benchPlaced = Boolean(placements.bench);
  const hearthMemoryAwake = memoryUnlocks.includes('hearth_memory');
  const thresholdMemoryAwake = memoryUnlocks.includes('threshold_memory');
  const benchMemoryAwake = memoryUnlocks.includes('bench_memory');
  const warmMealMarkKnown = knownMarks.includes('warm_meal');
  const keptCloseMarkKnown = knownMarks.includes('kept_close');
  const workRhythmMarkKnown = knownMarks.includes('work_rhythm');
  const activeCopy = chapterCopy[chapterId];
  const activeTheme = chapterTheme[chapterId];
  const restoreScore = restoreFitScore(restorePuzzle);
  const restoreReady = restoreScore <= 8;
  const restoreNear = restoreReady || restoreScore <= 20;
  const patternScore = patternFitScore(patternPuzzle);
  const patternReady = patternScore <= 10;
  const patternNear = patternReady || patternScore <= 26;
  const restorePrompt = restoreReady
    ? activeCopy.restore.ready
    : restoreNear
      ? activeCopy.restore.near
      : activeCopy.restore.far;
  const patternPrompt = patternReady
    ? activeCopy.restore.ready
    : patternNear
      ? activeCopy.restore.near
      : activeCopy.restore.far;
  const activeRestorePrompt = chapterId === 'bench_memory' ? patternPrompt : restorePrompt;
  const activeRestoreReady = chapterId === 'bench_memory' ? patternReady : restoreReady;
  const activePlaceId: PlacePuzzleId = chapterId === 'threshold_memory' ? 'threshold' : chapterId === 'bench_memory' ? 'bench' : 'hearth';
  const placeScore = fragmentDistance(placePuzzle[activePlaceId], placeTargets[activePlaceId]);
  const placeReady = placeScore <= 9;
  const placeNear = placeReady || placeScore <= 20;
  const placePrompt = placeReady
    ? activeCopy.place.ready
    : placeNear
      ? activeCopy.place.near
      : activeCopy.place.far;
  const activeChapterStep: ChapterStep =
    chapterId === 'bench_memory'
      ? benchChoice
        ? 'complete'
        : benchMemoryAwake
          ? 'decide'
          : benchPlaced
            ? 'memory'
            : patternBound
              ? 'place'
              : collectedBenchFinds.length >= benchFinds.length
                ? 'restore'
                : 'discover'
      : chapterId === 'threshold_memory'
      ? thresholdChoice
        ? 'complete'
        : thresholdMemoryAwake
          ? 'decide'
          : thresholdPlaced
            ? 'memory'
            : beadCollected
              ? 'place'
              : 'discover'
      : storyChoice
        ? 'complete'
        : hearthMemoryAwake
          ? 'decide'
          : hearthPlaced
            ? 'memory'
            : potRestored
              ? 'place'
              : collectedPotPieces.length >= 2
                ? 'restore'
                : 'discover';
  const nextDiscoverFind = firstPotState.recovered ? hearthFinds[1] : hearthFinds[0];
  const nextBenchFind = benchFinds.find((find) => !findState[find.id]?.recovered) ?? benchFinds[benchFinds.length - 1];
  const activeDiscoverFind = chapterId === 'threshold_memory' ? beadFind : chapterId === 'bench_memory' ? nextBenchFind : nextDiscoverFind;
  const nextDiscoverState = findState[activeDiscoverFind.id];
  const activeGameVerb: GameVerb =
    activeChapterStep === 'restore'
      ? 'restore'
      : activeChapterStep === 'place' || activeChapterStep === 'memory'
        ? 'place'
        : activeChapterStep === 'decide' || activeChapterStep === 'complete'
          ? 'decide'
          : nextDiscoverState.exposed >= 70
            ? 'collect'
            : 'reveal';
  const activeChapterPrompt =
    activeChapterStep === 'discover'
      ? guidance
      : activeChapterStep === 'restore'
        ? activeRestorePrompt
        : activeChapterStep === 'place'
          ? placePrompt
          : activeChapterStep === 'memory'
            ? activeCopy.memory.prompt
            : activeChapterStep === 'decide'
              ? activeCopy.decide.prompt
              : activeCopy.decide.complete;
  const primaryGameAction =
    activeChapterStep === 'complete' && chapterId === 'hearth_memory'
      ? activeCopy.decide.nextAction
      : activeChapterStep === 'complete'
      ? activeCopy.decide.nextAction
      : activeGameVerb === 'reveal'
      ? 'Reveal'
      : activeGameVerb === 'collect'
        ? 'Collect'
        : activeGameVerb === 'restore'
          ? activeRestoreReady
            ? activeCopy.restore.readyAction
            : activeCopy.restore.action
          : activeChapterStep === 'memory'
            ? activeCopy.memory.action
            : activeGameVerb === 'place'
              ? placeReady
                ? 'Set it down'
                : activeCopy.place.action
              : activeCopy.decide.action;
  function _followNextAction() {
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

  function setChapterProgress(step: ChapterStep) {
    setChapterStep(step);
    setScreen(
      step === 'restore'
        ? 'joins'
        : step === 'place' || step === 'memory'
          ? 'reconstruction'
          : step === 'decide' || step === 'complete'
            ? 'interpretation'
            : 'excavation',
    );
  }

  function playChapterAction() {
    if (activeChapterStep === 'discover') {
      const target = activeDiscoverFind;
      const state = nextDiscoverState;
      setSelectedFindId(target.id);
      setExcavationFocus(chapterId === 'threshold_memory' ? 'threshold' : chapterId === 'bench_memory' ? 'bench' : 'hearth');
      if (state.exposed < 70) {
        const nextExposure = chapterId === 'hearth_memory' ? 100 : clamp(state.exposed + 38);
        updateFind(target.id, {
          exposed: nextExposure,
          observations: [...new Set([...state.observations, target.clue])],
        });
        setGuidance(
          nextExposure >= 70
            ? activeCopy.discover.ready
            : chapterId === 'threshold_memory'
              ? activeCopy.discover.revealFirst
            : chapterId === 'bench_memory'
              ? target.id === '9'
                ? activeCopy.discover.revealFirst
                : activeCopy.discover.revealSecond
            : target.id === '1'
              ? activeCopy.discover.revealFirst
              : activeCopy.discover.revealSecond,
        );
        playCue('brush');
        return;
      }
      updateFind(target.id, {
        exposed: 100,
        recovered: true,
        cleaned: Math.max(state.cleaned, 50),
        observations: [...new Set([...state.observations, target.clue])],
      });
      setGuidance(
        chapterId === 'threshold_memory'
          ? activeCopy.discover.collectFirst
          : chapterId === 'bench_memory'
            ? target.id === '15'
              ? 'A bright speck completes the rhythm.'
              : activeCopy.discover.collectFirst
          : target.id === '1'
            ? activeCopy.discover.collectFirst
            : activeCopy.discover.collectSecond,
      );
      playCue('lift');
      if (chapterId === 'threshold_memory') setChapterProgress('place');
      else if (chapterId === 'bench_memory' && collectedBenchFinds.length + 1 >= benchFinds.length) setChapterProgress('restore');
      else if (target.id === '2') setChapterProgress('restore');
      return;
    }
    if (activeChapterStep === 'restore') {
      if (chapterId === 'bench_memory') {
        if (!patternReady) {
          setGuidance(patternNear ? activeCopy.restore.near : activeCopy.restore.far);
          playCue('blocked');
          return;
        }
        ['9', '10', '15'].forEach((id) => {
          updateFind(id, {
            groups: [...new Set([...findState[id].groups, 'textile'])],
            observations: [...new Set([...findState[id].observations, 'The pieces hold one work pattern.'])],
          });
        });
        setPatternBound(true);
        setGuidance(activeCopy.restore.success);
        setChapterProgress('place');
        playCue('join');
        return;
      }
      if (!restoreReady) {
        setGuidance(restoreNear ? activeCopy.restore.near : activeCopy.restore.far);
        playCue('blocked');
        return;
      }
      updateFind('1', {
        joinedWith: [...new Set([...findState['1'].joinedWith, '2'])],
        groups: [...new Set([...findState['1'].groups, 'cooking'])],
        observations: [...new Set([...findState['1'].observations, 'The two pieces fit into one cooking pot.'])],
      });
      updateFind('2', {
        joinedWith: [...new Set([...findState['2'].joinedWith, '1'])],
        groups: [...new Set([...findState['2'].groups, 'cooking'])],
        observations: [...new Set([...findState['2'].observations, 'The soot line carries across the join.'])],
      });
      setGuidance(activeCopy.restore.success);
      setChapterProgress('place');
      playCue('join');
      return;
    }
    if (activeChapterStep === 'place') {
      if (!placeReady) {
        setGuidance(placeNear ? activeCopy.place.near : activeCopy.place.far);
        playCue('blocked');
        return;
      }
      setPlacements((current) =>
        chapterId === 'threshold_memory'
          ? { ...current, threshold: '20' }
          : chapterId === 'bench_memory'
            ? { ...current, bench: '9' }
            : { ...current, hearth: '1' },
      );
      setGuidance(activeCopy.place.success);
      setChapterProgress('memory');
      playCue('place');
      return;
    }
    if (activeChapterStep === 'memory') {
      if (chapterId === 'bench_memory') {
        setMemoryUnlocks((current) => current.includes('bench_memory') ? current : [...current, 'bench_memory']);
        setKnownMarks((current) => current.includes('work_rhythm') ? current : [...current, 'work_rhythm']);
        setGuidance(activeCopy.memory.success);
      } else if (chapterId === 'threshold_memory') {
        setMemoryUnlocks((current) => current.includes('threshold_memory') ? current : [...current, 'threshold_memory']);
        setKnownMarks((current) => current.includes('kept_close') ? current : [...current, 'kept_close']);
        setGuidance(activeCopy.memory.success);
      } else {
        setMemoryUnlocks((current) => current.includes('hearth_memory') ? current : [...current, 'hearth_memory']);
        setKnownMarks((current) => current.includes('warm_meal') ? current : [...current, 'warm_meal']);
        setGuidance(activeCopy.memory.success);
        setHearthEchoPlaying(true);
        playHearthFire();
      }
      setChapterProgress('decide');
      playCue('clean');
      return;
    }
    if (activeChapterStep === 'decide') {
      setGuidance('Choose the meaning that feels strongest.');
      playCue('blocked');
      return;
    }
    if (chapterId === 'hearth_memory' && storyChoice) {
      startThresholdChapter();
      return;
    }
    if (chapterId === 'threshold_memory' && thresholdChoice) {
      startBenchChapter();
      return;
    }
    setRoomStoryOpen((current) => !current);
    playCue('clean');
  }

  function chooseStory(choice: StoryChoice) {
    setHearthReconstructionAcknowledged(true);
    setStoryChoice(choice);
    setChosenInterpretation(choice === 'mixed' ? 'C' : choice === 'sudden' ? 'A' : 'B');
    setHasCompletedMainLoop(true);
    setChapterProgress('complete');
    setGuidance(
      choice === 'daily'
        ? 'Soot and repairs suggest meals made here again and again.'
        : choice === 'supplies'
          ? 'Pots can store supplies, but this one carries soot from cooking.'
          : choice === 'making'
            ? 'Making came later. This pot and hearth suggest cooking first.'
            : 'This repaired, soot-dark pot suggests repeated cooking.',
    );
    playCue('place');
  }

  function startThresholdChapter() {
    setChapterId('threshold_memory');
    setChapterStep('discover');
    setSelectedFindId('20');
    setExcavationFocus('threshold');
    if (!thresholdMemoryAwake) setPlacePuzzle((current) => ({ ...current, threshold: initialPlacePuzzle.threshold }));
    setDraggingPlace(null);
    setGuidance(chapterCopy.threshold_memory.discover.prompt);
    playCue('clean');
  }

  function chooseThresholdStory(choice: ThresholdChoice) {
    setThresholdChoice(choice);
    setChosenInterpretation(choice === 'shifted' ? 'C' : 'B');
    setHasCompletedMainLoop(true);
    setChapterProgress('complete');
    setGuidance(
      choice === 'kept'
        ? 'Yes. Someone seems to have kept this close before the room changed.'
        : choice === 'dropped'
          ? 'Possible, but the bead feels too carefully tucked away.'
          : 'Possible later, but the doorway still remembers care.',
    );
    playCue('place');
  }

  function startBenchChapter() {
    setChapterId('bench_memory');
    setChapterStep('discover');
    setSelectedFindId('9');
    setExcavationFocus('bench');
    if (!benchMemoryAwake) {
      setPatternPuzzle(initialPatternPuzzle);
      setPatternBound(false);
      setPlacePuzzle((current) => ({ ...current, bench: initialPlacePuzzle.bench }));
    }
    setDraggingPattern(null);
    setDraggingPlace(null);
    setGuidance(chapterCopy.bench_memory.discover.prompt);
    playCue('clean');
  }

  function chooseBenchStory(choice: BenchChoice) {
    setBenchChoice(choice);
    setChosenInterpretation('B');
    setHasCompletedMainLoop(true);
    setChapterProgress('complete');
    setGuidance(
      choice === 'steady'
        ? 'Yes. The bench remembers steady hands and repeated work.'
        : choice === 'special'
          ? 'Maybe. The color feels special, but the rhythm feels practiced.'
          : 'Possible, though the pattern feels more kept than abandoned.',
    );
    playCue('place');
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
        chapterId,
        chapterStep: activeChapterStep,
        memoryUnlocks,
        knownMarks,
        storyChoice,
        thresholdChoice,
        benchChoice,
        roomStoryOpen,
        restorePuzzle,
        patternPuzzle,
        patternBound,
        placePuzzle,
        hearthReconstructionAcknowledged,
      }),
    );
  }, [activeChapterStep, benchChoice, chapterId, chosenInterpretation, currentTool, excavationFocus, fieldworkHistoryId, findState, guidance, hasCompletedMainLoopNow, hydrated, knownMarks, memoryUnlocks, mode, patternBound, patternPuzzle, placePuzzle, placements, restorePuzzle, roomStoryOpen, screen, selectedFindId, soundEnabled, storyChoice, thresholdChoice, tutorialStep, unlockedScreens, hearthReconstructionAcknowledged]);

  useEffect(() => {
    if (!hearthEchoPlaying) return;
    const timer = window.setTimeout(() => setHearthEchoPlaying(false), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2000);
    return () => window.clearTimeout(timer);
  }, [hearthEchoPlaying]);

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      const disclosure = document.activeElement?.closest('details[open]') ?? document.querySelector('.riverbend-game details[open]');
      if (!disclosure) return;
      disclosure.removeAttribute('open');
      disclosure.querySelector('summary')?.focus();
    }
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  function playHearthFire() {
    if (!soundEnabled) return;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = audioContextRef.current ?? new AudioContextCtor();
    audioContextRef.current = context;
    void context.resume();
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = buffer.getChannelData(0);
    let noiseSeed = 17;
    for (let i = 0; i < samples.length; i++) {
      noiseSeed = (noiseSeed * 16807) % 2147483647;
      samples[i] = (noiseSeed / 2147483647 * 2 - 1) * 0.1;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.12, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 2);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
    source.stop(context.currentTime + 2);
  }

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

  function _groupFind(find: Find, group: string) {
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

  function setRestoreFragmentPosition(id: RestoreFragmentId, event: ReactPointerEvent<HTMLElement>) {
    const board = restoreBoardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 16, 84);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 30, 52);
    setRestorePuzzle((current) => ({
      ...current,
      [id]: { ...current[id], x, y },
    }));
  }

  function handleRestorePointerDown(id: RestoreFragmentId, event: ReactPointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingFragment(id);
    setRestoreFragmentPosition(id, event);
  }

  function handleRestorePointerMove(id: RestoreFragmentId, event: ReactPointerEvent<HTMLButtonElement>) {
    if (draggingFragment !== id) return;
    setRestoreFragmentPosition(id, event);
  }

  function handleRestorePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingFragment(null);
  }

  function rotateRestoreFragment(id: RestoreFragmentId, amount: number) {
    setRestorePuzzle((current) => ({
      ...current,
      [id]: {
        ...current[id],
        rotation: normalizeRotation(current[id].rotation + amount),
      },
    }));
    playCue('stabilize');
  }

  function nudgeRestorePuzzle() {
    setRestorePuzzle((current) => ({
      rim: moveToward(current.rim, restoreTargets.rim, 0.55),
      body: moveToward(current.body, restoreTargets.body, 0.55),
    }));
    setGuidance('The pieces slide closer.');
    playCue('clean');
  }

  function setPatternPiecePosition(id: PatternPieceId, event: ReactPointerEvent<HTMLElement>) {
    const board = patternBoardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 16, 84);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 20, 80);
    setPatternPuzzle((current) => ({
      ...current,
      [id]: { ...current[id], x, y },
    }));
  }

  function handlePatternPointerDown(id: PatternPieceId, event: ReactPointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingPattern(id);
    setPatternPiecePosition(id, event);
  }

  function handlePatternPointerMove(id: PatternPieceId, event: ReactPointerEvent<HTMLButtonElement>) {
    if (draggingPattern !== id) return;
    setPatternPiecePosition(id, event);
  }

  function handlePatternPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingPattern(null);
  }

  function nudgePatternPuzzle() {
    setPatternPuzzle((current) => ({
      spindleA: moveToward(current.spindleA, patternTargets.spindleA, 0.6),
      spindleB: moveToward(current.spindleB, patternTargets.spindleB, 0.6),
      pigment: moveToward(current.pigment, patternTargets.pigment, 0.6),
    }));
    setGuidance(patternNear ? activeCopy.restore.near : activeCopy.restore.far);
    playCue('clean');
  }

  function setPlaceTokenPosition(id: PlacePuzzleId, event: ReactPointerEvent<HTMLElement>) {
    const scene = sceneRef.current;
    if (!scene) return;
    const rect = scene.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 10, 90);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 14, 86);
    setPlacePuzzle((current) => ({
      ...current,
      [id]: { ...current[id], x, y },
    }));
  }

  function handlePlacePointerDown(id: PlacePuzzleId, event: ReactPointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingPlace(id);
    setPlaceTokenPosition(id, event);
  }

  function handlePlacePointerMove(id: PlacePuzzleId, event: ReactPointerEvent<HTMLButtonElement>) {
    if (draggingPlace !== id) return;
    setPlaceTokenPosition(id, event);
  }

  function handlePlacePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingPlace(null);
  }

  function nudgePlacePuzzle() {
    setPlacePuzzle((current) => ({
      ...current,
      [activePlaceId]: moveToward(current[activePlaceId], placeTargets[activePlaceId], 0.65),
    }));
    setGuidance(placeNear ? activeCopy.place.near : placePrompt);
    playCue('clean');
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
        chapterId,
        chapterStep: activeChapterStep,
        memoryUnlocks,
        knownMarks,
        storyChoice,
        thresholdChoice,
        benchChoice,
        roomStoryOpen,
        restorePuzzle,
        patternPuzzle,
        patternBound,
        placePuzzle,
        hearthReconstructionAcknowledged,
      }),
    );
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  function closeContainingMenu(element: HTMLElement) {
    element.closest('details')?.removeAttribute('open');
  }

  function revisitMemory(chapter: ChapterId, element: HTMLElement) {
    setRoomStoryOpen(false);
    setShowPresentRoom(false);
    setChapterId(chapter);
    setGuidance(chapterCopy[chapter].decide.complete);
    closeContainingMenu(element);
    window.requestAnimationFrame(() => chapterActionRef.current?.focus());
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
    setGuidance(chapterCopy.hearth_memory.discover.prompt);
    setFieldworkHistoryId('threshold');
    setHasCompletedMainLoop(false);
    setChapterId('hearth_memory');
    setChapterStep('discover');
    setMemoryUnlocks([]);
    setKnownMarks([]);
    setStoryChoice(null);
    setHearthReconstructionAcknowledged(false);
    setHearthEchoPlaying(false);
    setThresholdChoice(null);
    setBenchChoice(null);
    setRoomStoryOpen(false);
    setShowPresentRoom(false);
    setRestorePuzzle(initialRestorePuzzle);
    setDraggingFragment(null);
    setPatternPuzzle(initialPatternPuzzle);
    setDraggingPattern(null);
    setPatternBound(false);
    setPlacePuzzle(initialPlacePuzzle);
    setDraggingPlace(null);
    playCue('place');
  }

  function _startFieldworkVariation(historyId = fieldworkHistoryId) {
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

  function _returnToExpedition() {
    setMode('expedition');
    setFindState(initialFindState);
    setPlacements({});
    setChosenInterpretation('B');
    setScreen('excavation');
    setGuidance(chapterCopy.hearth_memory.discover.prompt);
    playCue('place');
  }

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: ModelContextTool) => {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {
          // Tool registration is optional in preview surfaces and may reject on cleanup.
        });
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

    return () => {
      try {
        lifecycle.abort();
      } catch {
        // Some preview browsers surface abort cleanup as an unhandled rejection.
      }
    };
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
    <main className="riverbend-game fixed inset-0 overflow-hidden text-stone-950">
      <div className="relative flex h-full flex-col">
        <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-3 sm:p-5">
          <div className="riverbend-prompt pointer-events-auto max-w-[min(620px,calc(100vw-88px))] px-3 py-2 text-white sm:px-4">
            <div className="flex items-center gap-2 text-amber-100/90">
              <Compass className="size-4" aria-hidden="true" />
              <p className="riverbend-title">{chapterId === 'hearth_memory' && activeChapterStep === 'discover' && collectedPotPieces.length === 0 ? 'Who made a home here?' : activeTheme.title}</p>
            </div>
            <p className="riverbend-scene-prompt mt-1" aria-live="polite">{roomStoryOpen ? 'A home, a workshop, a doorway.' : hearthEchoPlaying ? activeCopy.memory.echo : activeChapterPrompt}</p>
          </div>
          <details className="group/menu pointer-events-auto relative">
            <summary aria-label="Menu" className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-amber-100/70 bg-black/42 text-white shadow-lg backdrop-blur-sm transition hover:scale-105 hover:bg-black/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-100 [&::-webkit-details-marker]:hidden">
              <Menu className="size-4" aria-hidden="true" />
              <span className="sr-only">Menu</span>
            </summary>
            <div className="riverbend-surface riverbend-notebook-body absolute right-0 top-12 z-50 w-56 p-1 shadow-2xl backdrop-blur">
              <p className="riverbend-helper px-2 py-1 text-amber-100">Menu</p>
              <button
                type="button"
                onClick={(event) => {
                  saveNow();
                  closeContainingMenu(event.currentTarget);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-100"
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
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-100"
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
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-100"
              >
                <Rotate3D aria-hidden="true" />
                Start over
              </button>
              <div className="my-1 h-px bg-white/15" />
              <button
                type="button"
                onClick={(event) => {
                  recoverStarterSet();
                  closeContainingMenu(event.currentTarget);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-100"
              >
                <Sparkles aria-hidden="true" />
                Skip to test set
              </button>
            </div>
          </details>
        </header>

        <section className="riverbend-stage relative min-h-0 flex-1 overflow-hidden">
          <div ref={sceneRef} className="riverbend-scene-frame">
          <Image
            className="absolute inset-0 size-full object-fill saturate-[0.85]"
            src="/assets/riverbend-workshop.png"
            alt="Illustrated top-down workshop excavation with hearth, bench, threshold, and room floor."
            fill
            priority
            sizes="100vw"
          />
          <Image
            className={`riverbend-memory-art absolute inset-0 size-full object-fill ${hearthMemoryAwake && chapterId === 'hearth_memory' && !showPresentRoom ? 'opacity-100' : 'opacity-0'}`}
            src="/assets/riverbend-hearth-memory.png"
            alt="Imagined hearth in use: a repaired cooking pot, small fire, and everyday cooking bowls."
            fill
            sizes="100vw"
            aria-hidden={!hearthMemoryAwake || chapterId !== 'hearth_memory' || showPresentRoom}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_56%,transparent_0%,rgb(74_47_26/0.18)_42%,rgb(30_19_12/0.42)_100%)]" />

          {activeChapterStep === 'discover' ? <button
            type="button"
            onClick={activeChapterStep === 'discover' ? playChapterAction : undefined}
            disabled={activeChapterStep !== 'discover'}
            aria-label={chapterId === 'threshold_memory' ? 'Doorway clue' : chapterId === 'bench_memory' ? 'Bench clue' : 'Hearth clue'}
            className={`riverbend-discovery absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center text-sm font-bold text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-100 ${
              activeChapterStep === 'discover'
                ? 'size-20 hover:scale-110 active:scale-95'
                : 'size-14 bg-emerald-700/72'
            }`}
            style={{
              left: `${placeTargets[activePlaceId].x}%`,
              top: `${placeTargets[activePlaceId].y}%`,
            }}
          >
            {chapterId === 'bench_memory' ? (
              collectedBenchFinds.length >= benchFinds.length ? <CheckCircle2 className="size-7" aria-hidden="true" /> : <WorkRhythmMark className="size-8 border text-white" />
            ) : chapterId === 'threshold_memory' ? (
              beadCollected ? <CheckCircle2 className="size-7" aria-hidden="true" /> : <KeptCloseMark className="size-8 border text-white" />
            ) : <span key={activeDiscoverFind.id} className={`riverbend-find-piece ${nextDiscoverState.exposed >= 70 ? 'is-revealed' : ''}`} style={{ backgroundPosition: activeDiscoverFind.id === '1' ? 'left center' : 'right center' }} />}
            {activeChapterStep === 'discover' ? (
              <span className="riverbend-helper absolute left-1/2 top-full mt-2 min-w-32 -translate-x-1/2 rounded-md bg-black/65 px-2 py-1 text-white shadow-lg">
                {primaryGameAction}
              </span>
            ) : null}
          </button> : null}

          {hearthPlaced && !hearthMemoryAwake ? (
            <div className="riverbend-placed-pot pointer-events-none absolute left-[36%] top-[42%] z-[6] -translate-x-1/2 -translate-y-1/2" aria-label="Restored pot placed at the hearth" />
          ) : null}

          {thresholdPlaced && !thresholdMemoryAwake ? (
            <div className="pointer-events-none absolute left-[50%] top-[87%] z-[6] h-[14%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-100/70 bg-sky-400/16 shadow-[0_0_70px_rgb(125_211_252/0.45)] backdrop-blur-[1px]">
              <div className="absolute inset-[34%] rounded-full border-[8px] border-sky-100/55 bg-black/20" />
            </div>
          ) : null}

          {benchPlaced && !benchMemoryAwake ? (
            <div className="pointer-events-none absolute left-[66%] top-[19%] z-[6] h-[16%] w-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-teal-100/70 bg-teal-400/16 shadow-[0_0_70px_rgb(94_234_212/0.42)] backdrop-blur-[1px]">
              <div className="absolute inset-[32%] rounded-full border-[8px] border-teal-100/55 bg-black/20" />
            </div>
          ) : null}


          {thresholdMemoryAwake && chapterId === 'threshold_memory' ? (
            <div className="pointer-events-none absolute inset-0 z-[8] bg-[radial-gradient(circle_at_50%_87%,rgb(125_211_252/0.2)_0%,transparent_42%)]" />
          ) : null}

          {benchMemoryAwake && chapterId === 'bench_memory' ? (
            <div className="pointer-events-none absolute inset-0 z-[8] bg-[radial-gradient(circle_at_66%_19%,rgb(94_234_212/0.2)_0%,transparent_44%)]" />
          ) : null}

          {activeChapterStep === 'place' ? (
            <>
              <div
                className={`pointer-events-none absolute z-[9] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-2xl transition ${
                  placeReady
                    ? 'size-32 border-amber-100/80 bg-amber-300/24 shadow-[0_0_80px_rgb(254_243_199/0.6)]'
                    : placeNear
                      ? 'size-28 border-amber-100/65 bg-amber-300/18 shadow-[0_0_58px_rgb(254_243_199/0.38)]'
                      : 'size-24 border-white/40 bg-white/8'
                }`}
                style={{
                  left: `${placeTargets[activePlaceId].x}%`,
                  top: `${placeTargets[activePlaceId].y}%`,
                }}
              />
              <div className="riverbend-helper absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-100/50 bg-stone-950/58 px-3 py-2 text-white shadow-xl backdrop-blur-md">
                <button
                  type="button"
                  onClick={nudgePlacePuzzle}
                  className="riverbend-secondary whitespace-nowrap rounded-md px-3 py-1 transition"
                >
                  Move closer
                </button>
              </div>
              <button
                type="button"
                aria-label={chapterId === 'threshold_memory' ? 'Bead. Drag to doorway.' : chapterId === 'bench_memory' ? 'Pattern. Drag to bench.' : 'Pot. Drag to hearth.'}
                onPointerDown={(event) => handlePlacePointerDown(activePlaceId, event)}
                onPointerMove={(event) => handlePlacePointerMove(activePlaceId, event)}
                onPointerUp={handlePlacePointerUp}
                onPointerCancel={handlePlacePointerUp}
                className={`absolute z-20 flex touch-none select-none items-center justify-center rounded-full border-2 text-white shadow-2xl transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-100 active:scale-95 ${
                  draggingPlace === activePlaceId
                    ? 'border-amber-100 bg-amber-500/80 shadow-[0_0_44px_rgb(253_230_138/0.6)]'
                    : chapterId === 'threshold_memory'
                      ? 'size-20 border-sky-100/80 bg-sky-600/76'
                      : chapterId === 'bench_memory'
                        ? 'size-20 border-teal-100/80 bg-teal-700/76'
                      : 'riverbend-carried-pot size-24 border-transparent bg-transparent'
                }`}
                style={{
                  left: `${placePuzzle[activePlaceId].x}%`,
                  top: `${placePuzzle[activePlaceId].y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {chapterId === 'threshold_memory' ? (
                  <KeptCloseMark className="size-10 text-sky-100" />
                ) : chapterId === 'bench_memory' ? (
                  <WorkRhythmMark className="size-12 text-teal-100" />
                ) : (
                  <span className="riverbend-pot-art size-full" />
                )}
              </button>
            </>
          ) : null}

          </div>

          {hearthMemoryAwake && chapterId === 'hearth_memory' && !hearthEchoPlaying ? (
            <fieldset className="riverbend-compare absolute right-4 top-4 z-20 flex gap-1 rounded-md bg-[#1e2823] p-1 sm:right-5 sm:top-28" aria-label="Compare the hearth">
              <button type="button" aria-pressed={!showPresentRoom} onClick={() => setShowPresentRoom(false)} className="riverbend-helper rounded px-3">Then</button>
              <button type="button" aria-pressed={showPresentRoom} onClick={() => setShowPresentRoom(true)} className="riverbend-helper rounded px-3">Now</button>
              <span className="sr-only" aria-live="polite">{showPresentRoom ? 'Showing what remains today.' : 'Showing an imagined past, based on the pot and hearth.'}</span>
            </fieldset>
          ) : null}

          {!roomStoryOpen && ((chapterId === 'threshold_memory' && thresholdMemoryAwake) || (chapterId === 'bench_memory' && benchMemoryAwake)) ? (
            <div className="riverbend-memory-caption riverbend-surface riverbend-notebook-body pointer-events-none absolute right-4 top-4 z-10 flex w-[min(320px,calc(100%-32px))] items-center gap-3 px-3 py-2 sm:right-5 sm:top-28">
              {chapterId === 'threshold_memory' ? <KeptCloseMark className="size-9 shrink-0 text-sky-100" /> : <WorkRhythmMark className="size-9 shrink-0 text-teal-100" />}
              <span>{activeCopy.memory.echo}</span>
            </div>
          ) : null}

          {activeChapterStep === 'restore' && chapterId === 'hearth_memory' ? (
            <div className="riverbend-puzzle riverbend-surface absolute inset-x-3 bottom-5 z-20 mx-auto max-w-lg p-3 shadow-2xl backdrop-blur-md sm:bottom-12 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="riverbend-action-label text-amber-100">Fit the pot</p>
                </div>
                <Button
                  className="riverbend-secondary riverbend-helper h-11 px-3"
                  onClick={nudgeRestorePuzzle}
                  variant="outline"
                >
                  Move closer
                </Button>
              </div>
              <div
                ref={restoreBoardRef}
                className="riverbend-board relative mx-auto mt-3 h-64 w-full max-w-sm overflow-hidden rounded-md border border-white/15 bg-stone-950/60"
                aria-label="Pot fitting space"
              >
                <div
                  className={`riverbend-pot-art pointer-events-none absolute left-1/2 top-1/2 h-36 w-[60%] -translate-x-1/2 -translate-y-1/2 transition ${
                    restoreNear ? 'opacity-45' : 'opacity-15'
                  }`}
                />
                {(['rim', 'body'] as const).map((fragmentId) => {
                  const fragment = restorePuzzle[fragmentId];
                  const isRim = fragmentId === 'rim';
                  return (
                    <div
                      key={fragmentId}
                      className="riverbend-pot-piece absolute z-10 h-36 w-[30%]"
                      style={{
                        left: `${fragment.x}%`,
                        top: `${fragment.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <button
                        type="button"
                        aria-label={`${isRim ? 'Rim' : 'Body'} piece. Drag to move.`}
                        onPointerDown={(event) => handleRestorePointerDown(fragmentId, event)}
                        onPointerMove={(event) => handleRestorePointerMove(fragmentId, event)}
                        onPointerUp={handleRestorePointerUp}
                        onPointerCancel={handleRestorePointerUp}
                        className={`riverbend-fragment group relative flex h-36 w-full touch-none select-none items-center justify-center overflow-hidden transition hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-100 active:brightness-125 ${
                          draggingFragment === fragmentId ? 'border-amber-100 shadow-[0_0_34px_rgb(253_230_138/0.45)]' : 'border-white/25'
                        }`}
                        style={{
                          transform: `rotate(${fragment.rotation}deg)`,
                        }}
                      >
                        <span className="riverbend-fragment-art" style={{ backgroundPosition: isRim ? 'left center' : 'right center' }} />
                        <span className="riverbend-token-label absolute bottom-2 rounded-full bg-black/45 px-2 py-0.5 text-white">
                          {isRim ? 'Rim' : 'Body'}
                        </span>
                      </button>
                      <div className="absolute inset-x-0 top-full mt-1 flex justify-center gap-1">
                        <button
                          type="button"
                          aria-label={`Rotate ${isRim ? 'rim' : 'body'} left`}
                          title={`Turn ${isRim ? 'rim' : 'body'} left`}
                          onClick={() => rotateRestoreFragment(fragmentId, -15)}
                          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-100"
                        >
                          <RotateCcw className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Rotate ${isRim ? 'rim' : 'body'} right`}
                          title={`Turn ${isRim ? 'rim' : 'body'} right`}
                          onClick={() => rotateRestoreFragment(fragmentId, 15)}
                          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-100"
                        >
                          <RotateCw className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="riverbend-helper mt-3 text-stone-200">
                {restoreReady ? activeCopy.restore.readyHelper : restoreNear ? activeCopy.restore.nearHelper : activeCopy.restore.helper}
              </p>
            </div>
          ) : null}

          {activeChapterStep === 'restore' && chapterId === 'bench_memory' ? (
            <div className="riverbend-puzzle riverbend-surface absolute inset-x-3 bottom-5 z-20 mx-auto max-w-lg p-3 shadow-2xl backdrop-blur-md sm:bottom-12 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <Button
                  className="riverbend-secondary riverbend-helper h-11 px-3"
                  onClick={nudgePatternPuzzle}
                  variant="outline"
                >
                  Move closer
                </Button>
              </div>
              <div
                ref={patternBoardRef}
                className="riverbend-board relative mx-auto mt-3 h-64 w-full max-w-sm overflow-hidden rounded-md border border-white/15 bg-stone-950/60"
                aria-label="Bench pattern space"
              >
                <div
                  className={`pointer-events-none absolute left-1/2 top-1/2 h-28 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border-[10px] transition ${
                    patternNear ? 'border-teal-100/45 shadow-[0_0_42px_rgb(153_246_228/0.42)]' : 'border-white/10'
                  }`}
                />
                {(['spindleA', 'spindleB', 'pigment'] as const).map((pieceId) => {
                  const piece = patternPuzzle[pieceId];
                  const isPigment = pieceId === 'pigment';
                  const label = pieceId === 'spindleA' ? 'Weight A' : pieceId === 'spindleB' ? 'Weight B' : 'Color';
                  return (
                    <button
                      key={pieceId}
                      type="button"
                      aria-label={`${label}. Drag to move.`}
                      onPointerDown={(event) => handlePatternPointerDown(pieceId, event)}
                      onPointerMove={(event) => handlePatternPointerMove(pieceId, event)}
                      onPointerUp={handlePatternPointerUp}
                      onPointerCancel={handlePatternPointerUp}
                      className={`absolute z-10 flex touch-none select-none items-center justify-center border-2 text-white shadow-xl transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-100 active:scale-95 ${
                        draggingPattern === pieceId
                          ? 'border-teal-100 bg-teal-500/80 shadow-[0_0_34px_rgb(153_246_228/0.45)]'
                          : isPigment
                            ? 'size-16 rounded-full border-sky-100/70 bg-sky-500/75'
                            : 'h-20 w-20 rounded-full border-teal-100/60 bg-stone-700/85'
                      }`}
                      style={{
                        left: `${piece.x}%`,
                        top: `${piece.y}%`,
                        transform: `translate(-50%, -50%) rotate(${piece.rotation}deg)`,
                      }}
                    >
                      {isPigment ? <span className="size-7 rounded-full bg-sky-200/90 shadow-[0_0_22px_rgb(125_211_252/0.65)]" /> : <WorkRhythmMark className="size-10 text-teal-100" />}
                      <span className="riverbend-token-label absolute bottom-1 rounded-full bg-black/45 px-2 py-0.5 text-white">
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="riverbend-helper mt-3 text-stone-200">
                {patternReady ? activeCopy.restore.readyHelper : patternNear ? activeCopy.restore.nearHelper : activeCopy.restore.helper}
              </p>
            </div>
          ) : null}

          {roomStoryOpen ? (
            <section ref={roomStoryRef} className="riverbend-room-story riverbend-surface absolute inset-x-4 bottom-5 z-20 mx-auto max-w-lg overflow-y-auto p-5 sm:bottom-12" aria-labelledby="room-story-heading" tabIndex={-1}>
              <p className="riverbend-helper text-[#78a9b2]">Three discoveries, one changing room</p>
              <h2 id="room-story-heading" className="riverbend-scene-prompt mt-2">A room, remade.</h2>
              <ol className="mt-4 space-y-4 riverbend-notebook-body">
                <li className="flex gap-3"><WarmMealMark className="size-9 shrink-0 text-amber-100" /><div><h3 className="riverbend-action-label">Meals by the fire</h3><p className="mt-1">{storyChoice === 'supplies' ? 'You pictured stored supplies. The soot still suggests cooking here.' : storyChoice === 'making' ? 'You pictured making. Cooking seems to have come first.' : 'You pictured everyday meals. Soot and repairs support that story.'}</p></div></li>
                <li className="flex gap-3"><WorkRhythmMark className="size-9 shrink-0 text-teal-100" /><div><h3 className="riverbend-action-label">Hands at the bench</h3><p className="mt-1">{benchChoice === 'special' ? 'You imagined a special order. The blue color leaves that possibility open.' : benchChoice === 'unfinished' ? 'You imagined unfinished work. We know it happened, not why it stopped.' : 'You imagined steady making. Weights and color suggest repeated thread work.'}</p></div></li>
                <li className="flex gap-3"><KeptCloseMark className="size-9 shrink-0 text-sky-100" /><div><h3 className="riverbend-action-label">A bead by the door</h3><p className="mt-1">{thresholdChoice === 'dropped' ? 'You pictured an accidental loss during a repair.' : thresholdChoice === 'shifted' ? 'You pictured a bead moved by disturbed ground.' : 'You pictured something kept close, tucked beneath the threshold.'}</p></div></li>
              </ol>
              <p className="riverbend-notebook-body mt-5 border-t border-white/20 pt-4">Meals, then making, then a changed doorway. One room held many lives.</p>
              <p className="riverbend-helper mt-3 text-stone-300">Who left the bead, and why? That part of the story is still yours to wonder about.</p>
            </section>
          ) : null}

          {(activeChapterStep === 'decide' || activeChapterStep === 'complete') && !hearthEchoPlaying && !roomStoryOpen ? (
            <div className="riverbend-decisions riverbend-surface absolute inset-x-4 bottom-5 z-20 mx-auto max-w-2xl p-3 shadow-2xl backdrop-blur-md sm:bottom-12 sm:p-4">
              <p className={`riverbend-action-label text-amber-100 ${activeChapterStep === 'decide' ? 'sr-only' : ''}`}>
                {activeCopy.decide.question}
              </p>
              <div className={`${activeChapterStep === 'complete' ? 'mt-3' : ''} grid gap-2 sm:grid-cols-3`}>
                {(chapterId === 'bench_memory'
                  ? [
                      { id: 'steady' as const, label: 'Steady making', response: 'The pieces feel practiced, like repeated work.' },
                      { id: 'special' as const, label: 'A special order', response: 'Maybe. The color feels special, but not alone.' },
                      { id: 'unfinished' as const, label: 'Left unfinished', response: 'Possible. The weights show work, not why it stopped.' },
                    ]
                  : chapterId === 'threshold_memory'
                  ? [
                      { id: 'kept' as const, label: 'Kept close', response: 'Its sheltered position suggests care. We cannot know for sure.' },
                      { id: 'dropped' as const, label: 'Dropped by accident', response: 'Possible. A small bead could be lost during a repair.' },
                      { id: 'shifted' as const, label: 'Moved later', response: 'Possible. Disturbed ground can move small clues.' },
                    ]
                  : [
                      { id: 'daily' as const, label: 'Everyday cooking', response: 'Soot and repairs suggest meals made here again and again.' },
                      { id: 'supplies' as const, label: 'Keeping supplies', response: 'Pots can store supplies, but this one carries soot from cooking.' },
                      { id: 'making' as const, label: 'Making things', response: 'Making came later. This pot and hearth suggest cooking first.' },
                    ]
                ).map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    aria-pressed={(chapterId === 'bench_memory' ? benchChoice : chapterId === 'threshold_memory' ? thresholdChoice : storyChoice) === choice.id}
                    onClick={() => {
                      if (chapterId === 'bench_memory') chooseBenchStory(choice.id as BenchChoice);
                      else if (chapterId === 'threshold_memory') chooseThresholdStory(choice.id as ThresholdChoice);
                      else chooseStory(choice.id as StoryChoice);
                    }}
                    className={`riverbend-choice rounded-md border p-3 text-left transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-100 ${
                      (chapterId === 'bench_memory' ? benchChoice : chapterId === 'threshold_memory' ? thresholdChoice : storyChoice) === choice.id
                        ? 'border-emerald-100 bg-[#55735b] text-white'
                        : 'border-white/25 bg-white/10 hover:bg-white/18'
                    }`}
                  >
                    <span className="riverbend-action-label block">{choice.label}</span>
                    {(chapterId === 'hearth_memory' ? storyChoice : chapterId === 'bench_memory' ? benchChoice : thresholdChoice) === choice.id ? <span className="riverbend-helper mt-1 block opacity-80" aria-live="polite">{choice.response}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <footer className="riverbend-footer z-30 px-3 py-2 text-white sm:px-5">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="hidden min-w-0 items-center gap-1.5 overflow-x-auto sm:flex">
              {activeChapterFinds.filter((find) => findState[find.id].recovered && !(chapterId === 'hearth_memory' ? potRestored : chapterId === 'bench_memory' ? patternBound : thresholdPlaced)).map((find) => {
                const state = findState[find.id];
                const tokenName =
                  chapterId === 'threshold_memory'
                    ? 'bead'
                    : chapterId === 'bench_memory'
                      ? find.id === '9'
                        ? 'weight A'
                        : find.id === '10'
                          ? 'weight B'
                          : 'color'
                      : find.id === '1'
                        ? 'rim'
                        : 'body';
                return (
                  <span
                    key={find.id}
                    className={`riverbend-clue riverbend-token-label shrink-0 rounded-full border px-2.5 py-1 ${
                      state.recovered ? 'border-amber-100/80 bg-amber-100/90 text-stone-950' : 'border-white/15 bg-white/5 text-stone-300'
                    }`}
                  >
                    {state.recovered ? tokenName : `${tokenName} hidden`}
                  </span>
                );
              })}
              {keptCloseMarkKnown && chapterId === 'threshold_memory' ? (
                <span className="riverbend-clue riverbend-token-label flex shrink-0 items-center gap-1 px-2.5 py-1">
                  <KeptCloseMark className="size-4 border text-stone-950" />
                  kept close
                </span>
              ) : null}
              {workRhythmMarkKnown && chapterId === 'bench_memory' ? (
                <span className="riverbend-clue riverbend-token-label flex shrink-0 items-center gap-1 px-2.5 py-1">
                  <WorkRhythmMark className="size-4 border text-stone-950" />
                  work rhythm
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <details className="relative">
                <summary aria-label="Notebook" className="riverbend-secondary riverbend-action-label flex h-11 cursor-pointer list-none items-center gap-2 rounded-md px-3 transition [&::-webkit-details-marker]:hidden">
                  <BookOpen className="size-4" aria-hidden="true" />
                  Notebook
                </summary>
                <div className="riverbend-surface riverbend-notebook-body fixed bottom-[72px] right-3 z-50 w-[min(360px,calc(100vw-24px))] p-4 shadow-2xl sm:right-5">
                  <p className="riverbend-action-label text-amber-100">Notebook</p>
                  <ul className="mt-3 space-y-2 text-stone-200">
                    {collectedPotPieces.length > 0 ? <li>A soot-dark curve appears on the pot fragments.</li> : <li>Find something in the room to begin a note.</li>}
                    {potRestored ? <li>The two fragments fit as one cooking pot.</li> : null}
                    {hearthMemoryAwake ? <li>This first memory points to everyday use before the room changed.</li> : null}
                    {thresholdMemoryAwake ? <li>The bead was tucked where people stepped in and out.</li> : null}
                    {benchMemoryAwake ? <li>The bench pattern points to steady making with a flash of color.</li> : null}
                  </ul>
                  <div className="mt-4 border-t border-white/15 pt-4">
                    <p className="riverbend-action-label text-amber-100">Marks I know</p>
                    {warmMealMarkKnown || keptCloseMarkKnown || workRhythmMarkKnown ? (
                      <div className="mt-3 space-y-2">
                        {warmMealMarkKnown ? (
                          <div className="riverbend-mark-row flex items-center gap-3 text-stone-100">
                            <WarmMealMark className="size-9 shrink-0 text-amber-100" />
                            <div>
                              <p className="riverbend-action-label">Warm meal</p>
                              <p className="riverbend-helper text-stone-300">A motif on the cooking pot. Warm meal is our working name, not a translation. The scene imagines one possible use of the evidence.</p>
                            </div>
                            <button type="button" title="Revisit hearth" aria-label="Revisit hearth" onClick={(event) => revisitMemory('hearth_memory', event.currentTarget)} className="riverbend-secondary flex size-11 shrink-0 items-center justify-center rounded-md"><Eye className="size-4" aria-hidden="true" /></button>
                          </div>
                        ) : null}
                        {keptCloseMarkKnown ? (
                          <div className="riverbend-mark-row flex items-center gap-3 text-stone-100">
                            <KeptCloseMark className="size-9 shrink-0 text-sky-100" />
                            <div>
                              <p className="riverbend-action-label">Kept close</p>
                              <p className="riverbend-helper text-stone-300">Found with a bead tucked by the doorway.</p>
                            </div>
                            <button type="button" title="Revisit doorway" aria-label="Revisit doorway" onClick={(event) => revisitMemory('threshold_memory', event.currentTarget)} className="riverbend-secondary flex size-11 shrink-0 items-center justify-center rounded-md"><Eye className="size-4" aria-hidden="true" /></button>
                          </div>
                        ) : null}
                        {workRhythmMarkKnown ? (
                          <div className="riverbend-mark-row flex items-center gap-3 text-stone-100">
                            <WorkRhythmMark className="size-9 shrink-0 text-teal-100" />
                            <div>
                              <p className="riverbend-action-label">Work rhythm</p>
                              <p className="riverbend-helper text-stone-300">Found with weights and color by the bench.</p>
                            </div>
                            <button type="button" title="Revisit bench" aria-label="Revisit bench" onClick={(event) => revisitMemory('bench_memory', event.currentTarget)} className="riverbend-secondary flex size-11 shrink-0 items-center justify-center rounded-md"><Eye className="size-4" aria-hidden="true" /></button>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-3 text-stone-300">No marks learned yet.</p>
                    )}
                  </div>
                </div>
              </details>
              {activeChapterStep !== 'decide' ? <Button
                ref={chapterActionRef}
                className="riverbend-primary riverbend-action-label h-11 min-w-36 disabled:cursor-not-allowed disabled:opacity-55"
                disabled={hearthEchoPlaying || (activeChapterStep === 'restore' && !activeRestoreReady) || (activeChapterStep === 'place' && !placeReady)}
                onClick={playChapterAction}
              >
                {roomStoryOpen ? 'Back to my choice' : primaryGameAction}
              </Button> : null}
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

function _ToolTray({
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

function _BoardFrame({
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

function _SurveyOverlay({ onChoose }: { onChoose: (target: { label: string; locationId: ExcavationFocus }) => void }) {
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

function _FindHotspots({
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
  const dragging = false;
  const setDragging = (_value: boolean) => undefined;
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

function _ExaminationTable({
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

function _JoinWorkspace({
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
  const activePairId = pairOptions[0]?.id ?? joinPairs[0].id;
  const setActivePairId = (_id: string) => undefined;
  const groupingFindId = recoveredFinds[0]?.id ?? '1';
  const setGroupingFindId = (_id: string) => undefined;
  const activePair = pairOptions.find((pair) => pair.id === activePairId) ?? pairOptions[0] ?? joinPairs[0];
  const pairFinds = activePair.ids.map((id) => finds.find((find) => find.id === id) ?? finds[0]) as [Find, Find];
  const groupingFind = recoveredFinds.find((find) => find.id === groupingFindId) ?? recoveredFinds[0];
  const transforms: Record<string, FragmentTransform> = {
    [activePair.ids[0]]: { x: 28, y: 50, rotation: -16 },
    [activePair.ids[1]]: { x: 68, y: 50, rotation: 18 },
  };
  const setTransforms = (_next: Record<string, FragmentTransform> | ((current: Record<string, FragmentTransform>) => Record<string, FragmentTransform>)) => undefined;
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

function _ReconstructionOverlay({
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

function _InterpretationReview({
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

function _FieldworkPanel({
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

function _EvidencePanel({
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
        <_ContextContent
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

function _MobileContextDrawer({
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
            <_ContextContent
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

function _ContextContent({
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
