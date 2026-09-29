import type { Link, World } from './model';

export function restoreMaterialLinks(world: World, links: readonly Link[]): void {
  for (const link of links) {
    if (world.links.some((existing) => existing.id === link.id)) continue;
    const from = world.nodes.find((node) => node.id === link.from);
    const to = world.nodes.find((node) => node.id === link.to);
    if (!from || !to) continue;
    if (!from.owner && !to.owner) {
      world.links.push(link);
      continue;
    }
    // La asignación del extremo todavía ocupado conserva el enlace hasta su devolución.
    const pending = world.assignments.find(
      (assignment) => assignment.node === (from.owner ? from.id : to.id),
    );
    if (pending && !pending.links.some((existing) => existing.id === link.id))
      pending.links.push(link);
  }
}
