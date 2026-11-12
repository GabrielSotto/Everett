import { type BarChart, type BarDatum } from './bar-chart';
import type { Material, WorldSnapshot } from './model';
import { selectionBounds } from './alignment';
import { clearOrigin } from './visual-placement';
import { visualBounds } from './rotation';

/** La plantilla histórica creaba catorce IDs consecutivos en este orden. Sin
 * procedencia persistida solo ofrecemos una copia cuando se reconoce la serie. */
export function legacyBars(world: WorldSnapshot, member: string) {
  const match = /^e-(\d+)$/.exec(member);
  if (!match) return null;
  const byId = new Map(world.nodes.map((n) => [n.id, n]));
  const serial = Number(match[1]);
  for (let first = serial; first >= Math.max(1, serial - 13); first--) {
    const at = (offset: number) => byId.get('e-' + (first + offset));
    const heading = at(0)?.data,
      unit = at(1)?.data;
    if (
      heading?.kind !== 'text' ||
      unit?.kind !== 'text' ||
      (heading.text !== 'Cómo llega el público' && unit.text !== 'Personas encuestadas')
    )
      continue;
    const rows: BarDatum[] = [];
    for (let i = 0; i < 4; i++) {
      const label = at(2 + 3 * i)?.data,
        bar = at(3 + 3 * i)?.data,
        number = at(4 + 3 * i)?.data;
      if (
        label?.kind !== 'text' ||
        !label.text.trim() ||
        bar?.kind !== 'shape' ||
        bar.shape !== 'rectangle' ||
        number?.kind !== 'text'
      )
        break;
      const raw = number.text.trim();
      if (raw && !/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(raw)) break;
      const value = raw ? Number(raw.replace(',', '.')) : null;
      if (value !== null && !Number.isFinite(value)) break;
      rows.push({ label: label.text.trim(), value });
    }
    if (rows.length !== 4) continue;
    const data: BarChart = { kind: 'bars', title: unit.text, rows };
    const source = selectionBounds(Array.from({ length: 14 }, (_, i) => at(i)!));
    return { data, source };
  }
  return null;
}
export function linkedBarCopy(world: WorldSnapshot, member: string, id: string): Material | null {
  const legacy = legacyBars(world, member);
  if (!legacy) return null;
  const size = { width: 650, height: 252 };
  const position = clearOrigin(
    { x: legacy.source.x + legacy.source.width + 48, y: legacy.source.y },
    size,
    [...world.nodes.filter((n) => !n.owner).map(visualBounds), ...world.zones],
    48,
  );
  return { id, ...position, ...size, owner: null, data: legacy.data };
}
