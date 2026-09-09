export const CONTENT_VERSION = '1.0.0';
export const TICK_RATE = 60;
export const CELL = 32;
export const HOP_TICKS = 12;
export const REACTION_TICKS = 21;
export type Mode = 'crossing' | 'rush' | 'endless';
export type Command = 'up' | 'down' | 'left' | 'right';
export type HazardKind =
  | 'scooter'
  | 'bike'
  | 'auto'
  | 'car'
  | 'taxi'
  | 'bus'
  | 'bicycle'
  | 'cow'
  | 'pedestrian'
  | 'cart'
  | 'parked'
  | 'drain'
  | 'crate'
  | 'banner'
  | 'train';
export type ResponseClass = 'avoid' | 'jump' | 'slide';
export const HAZARDS: Record<
  HazardKind,
  {
    label: string;
    width: number;
    height: number;
    response: ResponseClass;
    tip: string;
  }
> = {
  scooter: {
    label: 'Scooter',
    width: 22,
    height: 12,
    response: 'avoid',
    tip: 'Wait on the pavement, then follow the gap.',
  },
  bike: {
    label: 'Motorbike',
    width: 23,
    height: 12,
    response: 'avoid',
    tip: 'Watch the headlight. Bikes move a little faster.',
  },
  auto: {
    label: 'Auto-rickshaw',
    width: 34,
    height: 18,
    response: 'avoid',
    tip: 'Let the whole auto pass before you hop.',
  },
  car: {
    label: 'Car',
    width: 44,
    height: 18,
    response: 'avoid',
    tip: 'There is no hurry. A safe gap will come.',
  },
  taxi: {
    label: 'Taxi',
    width: 44,
    height: 18,
    response: 'avoid',
    tip: 'Keep your feet clear of the whole car.',
  },
  bus: {
    label: 'City bus',
    width: 76,
    height: 20,
    response: 'avoid',
    tip: 'Buses are long. Wait until the back has passed.',
  },
  bicycle: {
    label: 'Bicycle',
    width: 25,
    height: 12,
    response: 'avoid',
    tip: 'A cyclist needs space too. Take the next gap.',
  },
  cow: {
    label: 'Cow',
    width: 28,
    height: 19,
    response: 'avoid',
    tip: 'Give her some room. Go around.',
  },
  pedestrian: {
    label: 'Pedestrian',
    width: 12,
    height: 10,
    response: 'avoid',
    tip: 'Take another lane and leave room for everyone.',
  },
  cart: {
    label: 'Handcart',
    width: 30,
    height: 22,
    response: 'avoid',
    tip: 'The cart blocks the way. Take the other side.',
  },
  parked: {
    label: 'Parked scooter',
    width: 23,
    height: 16,
    response: 'avoid',
    tip: 'Find a path around the parked scooter.',
  },
  drain: {
    label: 'Open drain',
    width: 26,
    height: 24,
    response: 'avoid',
    tip: 'Striped edges mark an open drain. Go around it.',
  },
  crate: {
    label: 'Low crate',
    width: 26,
    height: 20,
    response: 'jump',
    tip: 'Jump as the low crate reaches you, or change lanes.',
  },
  banner: {
    label: 'Overhead frame',
    width: 40,
    height: 18,
    response: 'slide',
    tip: 'Slide under the striped beam, or take another lane.',
  },
  train: {
    label: 'Train',
    width: 350,
    height: 22,
    response: 'avoid',
    tip: 'Stop before the barrier. Cross only when the lights are off.',
  },
};
export interface StageDefinition {
  id: number;
  name: string;
  subtitle: string;
  time: string;
  rows: number;
  safeRows: number[];
  speed: number;
  palette: { road: string; ground: string; accent: string; sky: string };
  hazards: HazardKind[];
  lesson: string;
}
export const STAGES: StageDefinition[] = [
  {
    id: 0,
    name: 'Office Gully',
    subtitle: 'THE DAY CAN WAIT.',
    time: '18:30',
    rows: 24,
    safeRows: [0, 6, 12, 18, 24],
    speed: 40,
    palette: {
      road: '#41454d',
      ground: '#74806c',
      accent: '#edb95e',
      sky: '#c98262',
    },
    hazards: ['scooter', 'car', 'bicycle'],
    lesson: 'Look both ways. Wait for a gap. You have all evening.',
  },
  {
    id: 1,
    name: 'Bazaar Road',
    subtitle: 'EVERYONE HAS SOMEWHERE TO BE.',
    time: '18:42',
    rows: 24,
    safeRows: [0, 6, 12, 18, 24],
    speed: 52,
    palette: {
      road: '#3b4650',
      ground: '#878674',
      accent: '#e89965',
      sky: '#ac717c',
    },
    hazards: ['auto', 'taxi', 'bike', 'bicycle'],
    lesson:
      'Autos need a wider gap. Cows and carts are happy to let you go around.',
  },
  {
    id: 2,
    name: 'Monsoon Junction',
    subtitle: 'A LITTLE RAIN NEVER HURT CHAI.',
    time: '18:55',
    rows: 24,
    safeRows: [0, 6, 12, 18, 24],
    speed: 61,
    palette: {
      road: '#304552',
      ground: '#536e70',
      accent: '#a7d4d1',
      sky: '#586b91',
    },
    hazards: ['bus', 'auto', 'scooter', 'car'],
    lesson:
      'Blue puddles are safe. Striped open drains are not. Give buses time.',
  },
  {
    id: 3,
    name: 'Railway Approach',
    subtitle: 'LET THIS ONE GO.',
    time: '19:08',
    rows: 24,
    safeRows: [0, 6, 12, 18, 24],
    speed: 67,
    palette: {
      road: '#3c414e',
      ground: '#68736e',
      accent: '#e7a562',
      sky: '#534765',
    },
    hazards: ['bike', 'auto', 'taxi'],
    lesson:
      'Flashing lights mean stop. There is a safe refuge on both sides of the tracks.',
  },
  {
    id: 4,
    name: 'Chai Chowk',
    subtitle: 'YOU CAN ALMOST SMELL IT.',
    time: '19:20',
    rows: 24,
    safeRows: [0, 6, 12, 18, 24],
    speed: 73,
    palette: {
      road: '#353b48',
      ground: '#64716b',
      accent: '#f5c361',
      sky: '#34334e',
    },
    hazards: ['bus', 'auto', 'taxi', 'scooter', 'bike'],
    lesson:
      'One last crossing. Signals pause the traffic; wait for your moment.',
  },
];
export interface Pattern {
  id: string;
  obstacles: { lane: number; kind: HazardKind }[];
  minBand: number;
  gapTicks: number;
}
export const PATTERNS: Pattern[] = [
  {
    id: 'left-auto',
    obstacles: [{ lane: 0, kind: 'auto' }],
    minBand: 0,
    gapTicks: 168,
  },
  {
    id: 'middle-taxi',
    obstacles: [{ lane: 1, kind: 'taxi' }],
    minBand: 0,
    gapTicks: 168,
  },
  {
    id: 'right-scooter',
    obstacles: [{ lane: 2, kind: 'scooter' }],
    minBand: 0,
    gapTicks: 168,
  },
  {
    id: 'market-pair',
    obstacles: [
      { lane: 0, kind: 'cow' },
      { lane: 2, kind: 'cart' },
    ],
    minBand: 0,
    gapTicks: 180,
  },
  {
    id: 'jump-left',
    obstacles: [{ lane: 0, kind: 'crate' }],
    minBand: 1,
    gapTicks: 180,
  },
  {
    id: 'jump-middle',
    obstacles: [
      { lane: 1, kind: 'crate' },
      { lane: 2, kind: 'bus' },
    ],
    minBand: 1,
    gapTicks: 180,
  },
  {
    id: 'jump-right',
    obstacles: [
      { lane: 2, kind: 'crate' },
      { lane: 0, kind: 'pedestrian' },
    ],
    minBand: 1,
    gapTicks: 180,
  },
  {
    id: 'slide-left',
    obstacles: [
      { lane: 0, kind: 'banner' },
      { lane: 2, kind: 'parked' },
    ],
    minBand: 1,
    gapTicks: 180,
  },
  {
    id: 'slide-middle',
    obstacles: [{ lane: 1, kind: 'banner' }],
    minBand: 1,
    gapTicks: 180,
  },
  {
    id: 'slide-right',
    obstacles: [
      { lane: 2, kind: 'banner' },
      { lane: 1, kind: 'bike' },
    ],
    minBand: 1,
    gapTicks: 180,
  },
  { id: 'take-a-breath', obstacles: [], minBand: 0, gapTicks: 150 },
  {
    id: 'wide-open',
    obstacles: [{ lane: 0, kind: 'bicycle' }],
    minBand: 0,
    gapTicks: 210,
  },
];
export const LANE_X = [80, 144, 208];
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(seed: number, n: number) {
  let v = Math.imul(seed ^ n, 0x45d9f3b);
  v = Math.imul(v ^ (v >>> 16), 0x45d9f3b);
  return (v ^ (v >>> 16)) >>> 0;
}
