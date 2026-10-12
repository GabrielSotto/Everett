import type { World, Rect } from './model';

/** Las propuestas no desplazan contenido del usuario; buscan espacio libre debajo. */
export function arrangeProposals(world: World): void {
  const occupied: Rect[] = [...world.nodes.filter((node) => !node.owner), ...world.zones];
  for (const job of world.assignments) {
    const card = { ...job.position, width: 320, height: 440 };
    let obstruction: Rect | undefined;
    while (
      (obstruction = occupied.find(
        (rect) =>
          card.x < rect.x + rect.width + 16 &&
          card.x + card.width + 16 > rect.x &&
          card.y < rect.y + rect.height + 16 &&
          card.y + card.height + 16 > rect.y,
      ))
    )
      card.y = obstruction.y + obstruction.height + 24;
    job.position = { x: card.x, y: card.y };
    occupied.push(card);
  }
}
