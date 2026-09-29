import type { Point } from './model';

export const layoutLimits = { separation: 1600, centralClearance: 1780 } as const;
export interface LayoutWorld extends Point {
  id: string;
}
interface Neighbourhood {
  members: readonly string[];
  center: Point;
  span: Point;
  tilt: number;
}

/** La distribución espacial sigue las relaciones entre proyectos. */
const neighbourhoods: readonly Neighbourhood[] = [
  {
    members: ['everett', 'components', 'autogen'],
    center: { x: 4000, y: -900 },
    span: { x: 2100, y: 1250 },
    tilt: -0.4,
  },
  {
    members: ['scout', 'capture', 'local'],
    center: { x: 3000, y: -5200 },
    span: { x: 1750, y: 1600 },
    tilt: 0.7,
  },
  {
    members: ['relay', 'protocols', 'web'],
    center: { x: 8550, y: -2550 },
    span: { x: 2500, y: 1150 },
    tilt: 1.1,
  },
  {
    members: ['island', 'intent', 'motion', 'gestures'],
    center: { x: -3300, y: 950 },
    span: { x: 2500, y: 1250 },
    tilt: -0.7,
  },
  {
    members: ['memory', 'attention', 'systems', 'maps'],
    center: { x: -3100, y: -4600 },
    span: { x: 1900, y: 2700 },
    tilt: 0.8,
  },
  {
    members: ['lab', 'observatory'],
    center: { x: -8550, y: -3000 },
    span: { x: 1200, y: 1850 },
    tilt: -0.5,
  },
  { members: ['reading'], center: { x: -7600, y: 850 }, span: { x: 600, y: 800 }, tilt: 0 },
  {
    members: ['paper', 'type', 'color', 'sketches'],
    center: { x: -6000, y: 5050 },
    span: { x: 2600, y: 1700 },
    tilt: 0.4,
  },
  {
    members: ['token', 'watch', 'voice', 'sound'],
    center: { x: -350, y: 6500 },
    span: { x: 2600, y: 1400 },
    tilt: -0.3,
  },
  {
    members: ['seeds', 'materials'],
    center: { x: 4300, y: 3100 },
    span: { x: 1500, y: 1150 },
    tilt: 0.9,
  },
  {
    members: ['notebook', 'archive'],
    center: { x: 7600, y: 7000 },
    span: { x: 1850, y: 1250 },
    tilt: 0.25,
  },
];

function randomFrom(id: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < id.length; i++) {
    state ^= id.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let n = state;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
function available(p: Point, worlds: readonly LayoutWorld[]): boolean {
  return (
    Math.hypot(p.x, p.y) >= layoutLimits.centralClearance &&
    worlds.every((w) => Math.hypot(w.x - p.x, w.y - p.y) >= layoutLimits.separation)
  );
}

export function nextWorldPosition(id: string, worlds: readonly LayoutWorld[]): Point {
  const random = randomFrom('new:' + id);
  const origin = worlds.length ? worlds[Math.floor(random() * worlds.length)]! : { x: 0, y: 0 };
  for (let attempt = 0; attempt < 2000; attempt++) {
    const angle = random() * Math.PI * 2,
      radius = 1800 + random() * 1300 + Math.floor(attempt / 50) * 450;
    const p = {
      x: Math.round(origin.x + Math.cos(angle) * radius),
      y: Math.round(origin.y + Math.sin(angle) * radius),
    };
    if (available(p, worlds)) return p;
  }
  // La posición alternativa fuera del área ocupada conserva las distancias mínimas.
  return { x: Math.max(0, ...worlds.map((w) => w.x)) + 2300, y: origin.y };
}

export function layoutWorlds(ids: readonly string[]): ReadonlyMap<string, Point> {
  const placed: LayoutWorld[] = [];
  for (const id of ids) {
    const area = neighbourhoods.find((n) => n.members.includes(id));
    const random = randomFrom('layout-071:' + id);
    let point: Point | null = null;
    if (id === 'everett') point = { x: 1840, y: -480 };
    if (id === 'island') point = { x: -2240, y: 970 };
    if (!point && area) {
      for (let attempt = 0; attempt < 1600; attempt++) {
        const angle = random() * Math.PI * 2,
          radius = Math.sqrt(random());
        const expansion = 1 + Math.floor(attempt / 160) * 0.17;
        const x = Math.cos(angle) * radius * area.span.x * expansion,
          y = Math.sin(angle) * radius * area.span.y * expansion;
        const candidate = {
          x: Math.round(area.center.x + x * Math.cos(area.tilt) - y * Math.sin(area.tilt)),
          y: Math.round(area.center.y + x * Math.sin(area.tilt) + y * Math.cos(area.tilt)),
        };
        if (available(candidate, placed)) {
          point = candidate;
          break;
        }
      }
    }
    if (!point || !available(point, placed)) point = nextWorldPosition(id, placed);
    placed.push({ id, ...point });
  }
  return new Map(placed.map((w) => [w.id, { x: w.x, y: w.y }]));
}
