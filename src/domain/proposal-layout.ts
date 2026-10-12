import type { World, Rect } from './model';

const gap = 24;
// Reservar también el pedido de cambios expandido, sin agrandar la tarjeta en reposo.
export const proposalSize = { width: 320, height: 560 } as const;
export function proposalOverlaps(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width + 16 &&
    a.x + a.width + 16 > b.x &&
    a.y < b.y + b.height + 16 &&
    a.y + a.height + 16 > b.y
  );
}
/** Buscar el espacio libre más cercano a la zona, sin desplazar contenido del usuario. */
export function arrangeProposals(world: World): void {
  const occupied: Rect[] = [...world.nodes.filter((node) => !node.owner), ...world.zones];
  for (const job of world.assignments) {
    const zone = world.zones.find((zone) => zone.agent === job.agent);
    const origin = zone ?? { ...job.position, width: 0, height: 0 };
    const xs = new Set([origin.x + origin.width + gap, origin.x - 320 - gap, origin.x]);
    const ys = new Set([
      origin.y,
      origin.y + origin.height + gap,
      origin.y - proposalSize.height - gap,
    ]);
    for (const rect of occupied) {
      xs.add(rect.x + rect.width + gap);
      xs.add(rect.x - 320 - gap);
      ys.add(rect.y + rect.height + gap);
      ys.add(rect.y - proposalSize.height - gap);
    }
    const score = (rect: Rect): number => {
      const dx = Math.max(0, origin.x - rect.x - rect.width, rect.x - origin.x - origin.width);
      const dy = Math.max(0, origin.y - rect.y - rect.height, rect.y - origin.y - origin.height);
      return Math.hypot(dx, dy) + Math.hypot(rect.x - origin.x, rect.y - origin.y) / 100;
    };
    const candidates = [...xs].flatMap((x) => [...ys].map((y) => ({ x, y, ...proposalSize })));
    candidates.sort((a, b) => score(a) - score(b));
    const card = candidates.find((card) =>
      occupied.every((rect) => !proposalOverlaps(card, rect)),
    )!;
    job.position = { x: card.x, y: card.y };
    occupied.push(card);
  }
}
